import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.neo4j import run_query
from app.llm_classifier import _extract_entities_fallback, analyze_with_llm
from app.models.audit import AuditLog
from app.models.incident import IncidentEvent
from app.rules_engine import check_rules, check_rules_delta
from app.rules_fusion import fuse_results
from app.scam_phases import CANONICAL_PHASES
from app.schemas.analyze import (
    AnalyzeChunkRequest,
    AnalyzeChunkResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    AnalyzeStartRequest,
    AnalyzeStartResponse,
)
from app.services.graph_service import GraphService
from app.services.incident_service import IncidentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Analysis"])

SESSION_IDLE_TIMEOUT = timedelta(minutes=30)

# NOTE: Session state lives in a process-local dict. Only one backend worker is
# supported; sticky-session load balancing is required in multi-replica
# deployments. Sessions are lost on restart or TTL expiry. This is intentional
# — no external cache or queue was introduced.
_session_store: Dict[str, dict] = {}


def _session_cleanup():
    now = datetime.utcnow()
    expired = [
        sid
        for sid, state in list(_session_store.items())
        if now - state["last_chunk_at"] > SESSION_IDLE_TIMEOUT
    ]
    for sid in expired:
        del _session_store[sid]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sync_incident_to_graph(incident: IncidentEvent) -> tuple[bool, Optional[str]]:
    """Ingest a consented incident and return its existing fraud-ring match."""
    try:
        GraphService.ingest_incident(incident)
        GraphService.link_incident_to_existing_ring(incident.incident_id)
        ring_rows = run_query(
            "MATCH (r:Report {report_id: $report_id}) RETURN r.ring_id AS ring_id",
            {"report_id": incident.incident_id},
        )
        ring_id = ring_rows[0].get("ring_id") if ring_rows else None
        return True, ring_id
    except Exception as exc:
        logger.warning(
            "Incident %s persisted but graph sync failed: %s",
            incident.incident_id,
            exc,
        )
        return False, None


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
    phases = (
        raw_llm_result.get("phases_detected", [])
        if llm_result
        else [
            phase
            for phase in CANONICAL_PHASES
            if phase in rule_result.get("rules_fired", [])
        ]
    )
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

    graph_synced, ring_id = _sync_incident_to_graph(incident)

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


def _derive_highest_phase(phases: list) -> int:
    result = 0
    for p in phases:
        if p in CANONICAL_PHASES:
            idx = CANONICAL_PHASES.index(p) + 1
            if idx > result:
                result = idx
    return result


@router.post("/analyze/session/start", response_model=AnalyzeStartResponse)
def start_analysis_session(data: AnalyzeStartRequest):
    """Create a new live analysis session."""
    _session_cleanup()
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    _session_store[session_id] = {
        "accumulated_transcript": "",
        "start_request": data,
        "previous_result": None,
        "previous_fusion_result": None,
        "created_at": now,
        "last_chunk_at": now,
    }
    return AnalyzeStartResponse(
        session_id=session_id,
        expires_at=now + SESSION_IDLE_TIMEOUT,
    )


@router.post("/analyze/session/{session_id}/chunk", response_model=AnalyzeChunkResponse)
def process_analysis_chunk(
    session_id: str,
    data: AnalyzeChunkRequest,
    db: Session = Depends(get_db),
):
    """Process a transcript chunk for a live analysis session."""
    _session_cleanup()

    if session_id not in _session_store:
        raise HTTPException(status_code=404, detail={"error": "session_not_found_or_expired"})

    session = _session_store[session_id]
    now = datetime.utcnow()

    if now - session["last_chunk_at"] > SESSION_IDLE_TIMEOUT:
        del _session_store[session_id]
        raise HTTPException(status_code=404, detail={"error": "session_not_found_or_expired"})

    session["accumulated_transcript"] += data.transcript_chunk
    full_text = session["accumulated_transcript"]

    delta = check_rules_delta(session["previous_result"], full_text)
    rule_result = delta["rule_result"]
    has_new_signal = delta["has_new_signal"]
    session["previous_result"] = rule_result

    rules_fired = rule_result.get("rules_fired", [])
    phases_from_rules = [p for p in CANONICAL_PHASES if p in rules_fired]
    highest_phase = _derive_highest_phase(phases_from_rules)
    evidence_spans = _evidence_from_matches(rule_result.get("matches", {}))
    entities = _extract_entities_fallback(full_text)

    if not data.is_final:
        fused = fuse_results(rule_result, llm_result=None)
        session["previous_fusion_result"] = fused
        session["last_chunk_at"] = now

        return AnalyzeChunkResponse(
            session_id=session_id,
            mode=fused["mode"],
            phases_detected=phases_from_rules,
            highest_phase=highest_phase,
            risk_label=fused["risk_label"],
            risk_score=fused["risk_score"],
            rules_fired=rules_fired,
            evidence_spans=evidence_spans,
            entities=entities,
            has_new_signal=has_new_signal,
            accumulated_length=len(full_text),
            is_complete=False,
        )

    # --- final chunk ---
    IncidentService.purge_expired(db)

    raw_llm_result = analyze_with_llm(full_text)
    llm_unavailable = raw_llm_result.get("plain_language_reason", "").startswith(
        "LLM analysis unavailable"
    )
    llm_result = None if llm_unavailable else raw_llm_result
    fused = fuse_results(rule_result, llm_result)

    llm_phases = (
        raw_llm_result.get("phases_detected", [])
        if llm_result
        else phases_from_rules
    )
    llm_entities = raw_llm_result.get("entities", entities)
    llm_evidence = (
        raw_llm_result.get("evidence_spans", [])
        if llm_result is not None
        else evidence_spans
    )
    llm_highest = (
        raw_llm_result.get("highest_phase", highest_phase)
        if llm_result
        else highest_phase
    )

    reason = raw_llm_result.get("plain_language_reason", "")
    if llm_result is None:
        reason = (
            "The private safety rules found a combination of authority, isolation, "
            "payment, legal-pressure, or urgency signals in the evidence you shared."
        )

    resp = AnalyzeChunkResponse(
        session_id=session_id,
        is_complete=True,
        mode=fused["mode"],
        phases_detected=llm_phases,
        highest_phase=llm_highest,
        risk_label=fused["risk_label"],
        risk_score=fused["risk_score"],
        rules_fired=rules_fired,
        evidence_spans=llm_evidence,
        entities=llm_entities,
        has_new_signal=has_new_signal,
        accumulated_length=len(full_text),
        recommended_action=fused["recommended_action"],
        matches=rule_result.get("matches", {}),
        plain_language_reason=reason,
        consent_scope=session["start_request"].consent_scope,
        retention_days=session["start_request"].retention_days,
        risk_level=fused["db_risk_level"],
        graph_synced=False,
        ring_id=None,
    )

    if fused["risk_label"] == "SAFE":
        resp.persisted = False
        del _session_store[session_id]
        return resp

    start = session["start_request"]
    incident_id = str(uuid.uuid4())[:8]
    extracted_phones = llm_entities.get("phone_numbers", []) or []
    incident = IncidentEvent(
        incident_id=incident_id,
        citizen_name=start.citizen_name or "Anonymous Citizen",
        phone_number=start.caller_phone_number or (extracted_phones[0] if extracted_phones else ""),
        transcript=full_text,
        location=(
            "Live telephony report"
            if start.source_channel in {"telephony_sip", "telephony_pstn"}
            else "Consent-based citizen report"
        ),
        fraud_type="Digital Arrest Scam" if fused["risk_label"] == "CRITICAL" else "Suspicious Communication",
        risk_level=fused["risk_label"],
        status="OPEN",
        consent_status=start.consent_status,
        consent_scope=start.consent_scope,
        local_only=False,
        redaction_summary=start.redaction_summary,
        retention_days=start.retention_days,
        expires_at=datetime.utcnow() + timedelta(days=start.retention_days),
    )
    db.add(incident)
    db.flush()

    audit = AuditLog(
        incident_id=incident_id,
        action="CONSENTED_ANALYSIS_COMPLETED",
        rule_hits={
            "rules_fired": rule_result.get("rules_fired", []),
            "matches": rule_result.get("matches", {}),
            "evidence_spans": llm_evidence,
            "entities": llm_entities,
        },
        model_version="mit-hybrid-v1",
        prompt_version="mit-prompt2-v1",
        score_components={
            "rule_score": rule_result.get("score", 0),
            "llm_confidence": llm_result.get("confidence") if llm_result else None,
            "risk_score": fused["risk_score"],
            "mode": fused["mode"],
            "phases_detected": llm_phases,
            "privacy_mode": "local_first_consent_gate",
            "consent_scope": start.consent_scope,
            "retention_days": start.retention_days,
        },
        threshold_version="mit-fusion-v1",
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    graph_synced, ring_id = _sync_incident_to_graph(incident)

    resp.incident_id = incident_id
    resp.persisted = True
    resp.expires_at = incident.expires_at.isoformat() + "Z"
    resp.graph_synced = graph_synced
    resp.ring_id = ring_id

    del _session_store[session_id]
    return resp
