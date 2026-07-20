import logging
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.neo4j import run_query
from app.llm_classifier import analyze_with_llm
from app.models.audit import AuditLog
from app.models.incident import IncidentEvent
from app.rules_engine import check_rules
from app.rules_fusion import fuse_results
from app.schemas.analyze import AnalyzeRequest, AnalyzeResponse
from app.services.graph_service import GraphService
from app.services.incident_service import IncidentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _evidence_from_matches(matches: dict) -> list[str]:
    evidence = []
    for values in matches.values():
        for value in values:
            text = str(value).strip()
            if text and text.lower() not in {item.lower() for item in evidence}:
                evidence.append(text)
    return evidence[:8]


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_consented_evidence(data: AnalyzeRequest, db: Session = Depends(get_db)):
    """Analyze and persist only evidence the citizen explicitly approved sharing."""
    IncidentService.purge_expired(db)
    rule_result = check_rules(data.transcript)
    raw_llm_result = analyze_with_llm(data.transcript)
    llm_unavailable = raw_llm_result.get("plain_language_reason", "").startswith(
        "LLM analysis unavailable"
    )
    llm_result = None if llm_unavailable else raw_llm_result
    fused = fuse_results(rule_result, llm_result)

    entities = raw_llm_result.get("entities", {})
    evidence_spans = (
        raw_llm_result.get("evidence_spans", [])
        if llm_result is not None
        else _evidence_from_matches(rule_result.get("matches", {}))
    )
    phases = raw_llm_result.get("phases_detected", []) if llm_result else []
    reason = raw_llm_result.get("plain_language_reason", "")
    if llm_result is None:
        reason = (
            "The private safety rules found a combination of authority, isolation, "
            "payment, legal-pressure, or urgency signals in the evidence you shared."
        )

    # A locally risky result may become SAFE after the citizen shares only a small
    # excerpt. Do not create a server-side report for evidence the server cannot verify.
    if fused["risk_label"] == "SAFE":
        return AnalyzeResponse(
            persisted=False,
            graph_synced=False,
            risk_label=fused["risk_label"],
            risk_level=fused["db_risk_level"],
            risk_score=fused["risk_score"],
            recommended_action=fused["recommended_action"],
            mode=fused["mode"],
            rules_fired=rule_result.get("rules_fired", []),
            matches=rule_result.get("matches", {}),
            phases_detected=phases,
            evidence_spans=evidence_spans,
            entities=entities,
            plain_language_reason=reason,
            consent_scope=data.consent_scope,
        )

    incident_id = str(uuid.uuid4())[:8]
    extracted_phones = entities.get("phone_numbers", []) or []
    incident = IncidentEvent(
        incident_id=incident_id,
        citizen_name=data.citizen_name or "Anonymous Citizen",
        phone_number=data.phone_number or (extracted_phones[0] if extracted_phones else ""),
        transcript=data.transcript,
        location=data.location or "Consent-based citizen report",
        fraud_type="Digital Arrest Scam" if fused["risk_label"] == "CRITICAL" else "Suspicious Communication",
        risk_level=fused["risk_label"],
        status="OPEN",
        consent_status=data.consent_status,
        consent_scope=data.consent_scope,
        local_only=False,
        redaction_summary=data.redaction_summary,
        retention_days=data.retention_days,
        expires_at=datetime.utcnow() + timedelta(days=data.retention_days),
    )
    db.add(incident)
    db.flush()

    audit = AuditLog(
        incident_id=incident_id,
        action="CONSENTED_ANALYSIS_COMPLETED",
        rule_hits={
            "rules_fired": rule_result.get("rules_fired", []),
            "matches": rule_result.get("matches", {}),
            "evidence_spans": evidence_spans,
            "entities": entities,
        },
        model_version="mit-hybrid-v1",
        prompt_version="mit-prompt2-v1",
        score_components={
            "rule_score": rule_result.get("score", 0),
            "llm_confidence": llm_result.get("confidence") if llm_result else None,
            "risk_score": fused["risk_score"],
            "mode": fused["mode"],
            "phases_detected": phases,
            "privacy_mode": "local_first_consent_gate",
            "consent_scope": data.consent_scope,
            "retention_days": data.retention_days,
        },
        threshold_version="mit-fusion-v1",
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    graph_synced = False
    ring_id = None
    try:
        GraphService.ingest_incident(incident)
        GraphService.link_incident_to_existing_ring(incident_id)
        ring_rows = run_query(
            "MATCH (r:Report {report_id: $report_id}) RETURN r.ring_id AS ring_id",
            {"report_id": incident_id},
        )
        ring_id = ring_rows[0].get("ring_id") if ring_rows else None
        graph_synced = True
    except Exception as exc:
        logger.warning("Incident %s persisted but graph sync failed: %s", incident_id, exc)

    return AnalyzeResponse(
        incident_id=incident_id,
        persisted=True,
        graph_synced=graph_synced,
        ring_id=ring_id,
        risk_label=fused["risk_label"],
        risk_level=fused["db_risk_level"],
        risk_score=fused["risk_score"],
        recommended_action=fused["recommended_action"],
        mode=fused["mode"],
        rules_fired=rule_result.get("rules_fired", []),
        matches=rule_result.get("matches", {}),
        phases_detected=phases,
        evidence_spans=evidence_spans,
        entities=entities,
        plain_language_reason=reason,
        consent_scope=data.consent_scope,
        retention_days=data.retention_days,
        expires_at=incident.expires_at.isoformat() + "Z",
    )
