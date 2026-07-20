import re
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.neo4j import run_write_query, apply_schema
from app.repositories.graph_repository import GraphRepository
from app.models.incident import IncidentEvent

logger = logging.getLogger(__name__)


class GraphService:

    @staticmethod
    def initialize():
        return apply_schema()

    @staticmethod
    def ingest_all_incidents(db: Session):
        incidents = db.query(IncidentEvent).all()
        count = 0
        for incident in incidents:
            GraphService._ingest_one(incident)
            count += 1
        logger.info(f"Ingested {count} incidents into Neo4j")
        return {"ingested": count}

    @staticmethod
    def ingest_incident(incident):
        GraphService._ingest_one(incident)
        return {"ingested": 1}

    @staticmethod
    def _ingest_one(incident):
        transcript = incident.transcript or ""
        transcript_preview = transcript[:200] if len(transcript) > 200 else transcript
        phone = getattr(incident, "phone_number", None) or ""
        city = getattr(incident, "location", None) or ""
        risk_label = getattr(incident, "risk_level", "UNKNOWN")
        fraud_type = getattr(incident, "fraud_type", "")
        status = getattr(incident, "status", "")
        created_at = (
            incident.created_at.isoformat()
            if hasattr(incident, "created_at") and incident.created_at
            else datetime.utcnow().isoformat()
        )

        claimed_agency = GraphService._extract_agency(transcript, fraud_type)
        upi_ids = GraphService._extract_upi(transcript)
        bank_accounts = GraphService._extract_bank_accounts(transcript)
        amount = GraphService._extract_amount(transcript)

        query = """
        MERGE (r:Report {report_id: $report_id})
        SET r.transcript_preview = $transcript_preview,
            r.risk_label = $risk_label,
            r.claimed_agency = $claimed_agency,
            r.city = $city,
            r.status = $status,
            r.fraud_type = $fraud_type,
            r.created_at = $created_at,
            r.amount_requested = $amount

        WITH r

        OPTIONAL MATCH (r)-[us1:USED_NUMBER]->(old_pn:PhoneNumber)
        DELETE us1

        WITH r

        FOREACH (pn_val IN CASE WHEN $phone <> '' THEN [$phone] ELSE [] END |
            MERGE (pn:PhoneNumber {value: pn_val})
            MERGE (r)-[:USED_NUMBER]->(pn)
        )

        WITH r

        OPTIONAL MATCH (r)-[up1:REQUESTED_PAYMENT_TO]->(old_upi:UPI_ID)
        DELETE up1

        WITH r

        FOREACH (upi_val IN $upi_ids |
            MERGE (u:UPI_ID {value: upi_val})
            MERGE (r)-[:REQUESTED_PAYMENT_TO]->(u)
        )

        WITH r

        OPTIONAL MATCH (r)-[ba1:REQUESTED_PAYMENT_TO]->(old_ba:BankAccount)
        DELETE ba1

        WITH r

        FOREACH (ba_val IN $bank_accounts |
            MERGE (b:BankAccount {value: ba_val})
            MERGE (r)-[:REQUESTED_PAYMENT_TO]->(b)
        )

        WITH r

        OPTIONAL MATCH (r)-[ca1:CLAIMED_TO_BE]->(old_ca:ClaimedAgency)
        DELETE ca1

        WITH r

        FOREACH (agency_val IN CASE WHEN $claimed_agency <> '' THEN [$claimed_agency] ELSE [] END |
            MERGE (a:ClaimedAgency {name: agency_val})
            MERGE (r)-[:CLAIMED_TO_BE]->(a)
        )
        """
        run_write_query(query, {
            "report_id": incident.incident_id,
            "transcript_preview": transcript_preview,
            "risk_label": risk_label,
            "claimed_agency": claimed_agency,
            "city": city,
            "status": status,
            "fraud_type": fraud_type,
            "created_at": created_at,
            "amount": amount,
            "phone": phone,
            "upi_ids": upi_ids,
            "bank_accounts": bank_accounts,
        })

    @staticmethod
    def _extract_agency(transcript: str, fraud_type: str) -> str:
        agencies = {
            "CBI": r"\bCBI\b",
            "ED": r"\bED\b|\bEnforcement Directorate\b",
            "Customs": r"\bCustoms\b|\bcustom\s+department\b",
            "RBI": r"\bRBI\b|\bReserve Bank\b",
            "TRAI": r"\bTRAI\b",
            "Police": r"\bPolice\b|\bCyber Cell\b|\bCyber Crime\b",
            "Interpol": r"\bInterpol\b",
            "Narcotics": r"\bNarcotics\b|\bNCB\b",
            "Court": r"\bCourt\b|\bJudge\b|\bMagistrate\b",
        }
        for name, pattern in agencies.items():
            if re.search(pattern, transcript, re.IGNORECASE):
                return name

        for word in ["CBI", "ED", "RBI", "TRAI", "NCB"]:
            if word in fraud_type.upper():
                return word

        return ""

    @staticmethod
    def _extract_upi(transcript: str) -> list:
        pattern = r'\b[\w.\-_]{3,}@[\w.\-_]{2,}\b'
        return list(set(re.findall(pattern, transcript)))

    @staticmethod
    def _extract_bank_accounts(transcript: str) -> list:
        pattern = r'\b\d{9,18}\b'
        return list(set(re.findall(pattern, transcript)))

    @staticmethod
    def _extract_amount(transcript: str) -> int:
        pattern = r'(?:Rs\.?\s*|₹\s*|INR\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees|rs\.?)?'
        match = re.search(pattern, transcript, re.IGNORECASE)
        if match:
            return int(match.group(1).replace(",", ""))
        number_pattern = r'(?:transfer|pay|send|deposit|pay\s+(?:an\s+)?amount\s+of)\s*(?:Rs\.?\s*|₹\s*|INR\s*)?(\d{3,})'
        match2 = re.search(number_pattern, transcript, re.IGNORECASE)
        if match2:
            return int(match2.group(1).replace(",", ""))
        return 0

    @staticmethod
    def get_all_rings():
        return GraphRepository.get_all_rings()

    @staticmethod
    def get_ring_detail(ring_id: str):
        return GraphRepository.get_ring_detail(ring_id)

    @staticmethod
    def get_ring_hubs(ring_id: str):
        return GraphRepository.get_hub_identifiers(ring_id)

    @staticmethod
    def get_evidence_package(ring_id: str):
        return GraphRepository.get_evidence_package(ring_id)

    @staticmethod
    def get_graph_json(ring_id: str):
        return GraphRepository.get_graph_json(ring_id)

    @staticmethod
    def get_rings_summary():
        return GraphRepository.get_rings_summary()

    @staticmethod
    def clear_graph():
        return GraphRepository.clear_graph()
