"""
PRAHARI Graph Ingest Pipeline

Reads all IncidentEvent rows from PostgreSQL and creates/merges
corresponding nodes and relationships in Neo4j.

Usage:
    python graph/ingest.py

Requires:
    - Postgres running with seeded incidents
    - Neo4j running at NEO4J_URI (default: bolt://localhost:7687)
    - Environment variables set (or .env file in backend/)
"""
import os
import sys
import re
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from neo4j import GraphDatabase, basic_auth

from app.models.incident import IncidentEvent


def get_postgres_session():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/prahari")
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    return Session()


def get_neo4j_driver():
    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    user = os.getenv("NEO4J_USER", "neo4j")
    password = os.getenv("NEO4J_PASSWORD", "prahari123")
    return GraphDatabase.driver(uri, auth=basic_auth(user, password))


def ensure_schema(driver):
    constraints = [
        "CREATE CONSTRAINT report_id IF NOT EXISTS FOR (r:Report) REQUIRE r.report_id IS UNIQUE",
        "CREATE CONSTRAINT phone_number IF NOT EXISTS FOR (p:PhoneNumber) REQUIRE p.value IS UNIQUE",
        "CREATE CONSTRAINT upi_id IF NOT EXISTS FOR (u:UPI_ID) REQUIRE u.value IS UNIQUE",
        "CREATE CONSTRAINT bank_account IF NOT EXISTS FOR (b:BankAccount) REQUIRE b.value IS UNIQUE",
        "CREATE CONSTRAINT agency_name IF NOT EXISTS FOR (a:ClaimedAgency) REQUIRE a.name IS UNIQUE",
    ]
    with driver.session() as session:
        for cql in constraints:
            session.run(cql)
    logger.info("Schema constraints applied.")


def extract_agency(transcript: str, fraud_type: str) -> str:
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


def extract_upi(transcript: str) -> list:
    return list(set(re.findall(r'\b[\w.\-_]{3,}@[\w.\-_]{2,}\b', transcript)))


def extract_bank_accounts(transcript: str) -> list:
    return list(set(re.findall(r'\b\d{9,18}\b', transcript)))


def extract_amount(transcript: str) -> int:
    m = re.search(r'(?:Rs\.?\s*|₹\s*|INR\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:rupees|rs\.?)?', transcript, re.IGNORECASE)
    if m:
        return int(m.group(1).replace(",", ""))
    m2 = re.search(r'(?:transfer|pay|send|deposit)\s*(?:Rs\.?\s*|₹\s*|INR\s*)?(\d{3,})', transcript, re.IGNORECASE)
    if m2:
        return int(m2.group(1).replace(",", ""))
    return 0


def ingest_incident(driver, incident):
    transcript = incident.transcript or ""
    transcript_preview = transcript[:200] if len(transcript) > 200 else transcript
    phone = getattr(incident, "phone_number", None) or ""
    city = getattr(incident, "location", None) or ""
    risk_label = getattr(incident, "risk_level", "UNKNOWN")
    fraud_type = getattr(incident, "fraud_type", "")
    status = getattr(incident, "status", "")
    created_at = str(incident.created_at) if incident.created_at else ""

    claimed_agency = extract_agency(transcript, fraud_type)
    upi_ids = extract_upi(transcript)
    bank_accounts = extract_bank_accounts(transcript)
    amount = extract_amount(transcript)

    with driver.session() as session:
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
        session.run(query, {
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

    logger.info(f"  Ingested report {incident.incident_id} [{phone}] agency={claimed_agency} upis={upi_ids}")


def main():
    logger.info("Connecting to PostgreSQL...")
    pg_session = get_postgres_session()
    incidents = pg_session.query(IncidentEvent).all()
    logger.info(f"Found {len(incidents)} incidents in PostgreSQL.")

    logger.info("Connecting to Neo4j...")
    driver = get_neo4j_driver()
    ensure_schema(driver)

    count = 0
    for incident in incidents:
        try:
            ingest_incident(driver, incident)
            count += 1
        except Exception as e:
            logger.error(f"  Failed to ingest {incident.incident_id}: {e}")

    driver.close()
    pg_session.close()
    logger.info(f"\nDone. Ingested {count}/{len(incidents)} incidents into Neo4j.")


if __name__ == "__main__":
    main()
