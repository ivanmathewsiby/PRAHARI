# PRAHARI

Stop the scam before the money moves.

PRAHARI is a hackathon prototype for digital-arrest scam interception and fraud-network intelligence. It has a citizen check flow, an officer command dashboard, PostgreSQL-backed incident/audit storage, and Neo4j graph clustering for planted fraud rings.

## What Works In This Repo

- FastAPI backend with health, incident, audit, dashboard, and ring APIs.
- PostgreSQL schema and Alembic migration for incidents and audit logs.
- Neo4j schema, ingestion pipeline, ring detection, hub ranking, and evidence-package JSON.
- Next.js citizen UI at `/check` with private local-first scan, consent review, redaction, and live mic transcript mode.
- Officer command UI at `/command` with incident queue and fraud-ring panel.
- Demo seed script that plants three reusable fraud rings.
- Offline frontend demo fallback if the backend is not running.

Mit's AI/ML detection engine is intentionally outside this pass. The current citizen UI uses a local mock analyzer, keeps SAFE results on-device, and stores a risky incident/audit record only after the user approves sharing.

## Architecture

```text
Citizen /check
     |
     v
On-device text/live-mic scan  ---- Mit AI/ML /api/analyze slot
     |
     | SAFE: keep local and send nothing
     |
     | SUSPICIOUS/CRITICAL: show review and consent
     |
     v
User-approved minimal evidence
     |
     v
FastAPI backend
     |--------------------|
     v                    v
PostgreSQL incidents   Audit logs
     |
     v
Neo4j graph ingestion
     |
     v
Ring detection + hub ranking
     |
     v
Officer /command dashboard + evidence package
```

## Privacy Model

PRAHARI is device-first by default:

- Paste, upload placeholder text, and live mic transcripts are scanned locally in the browser demo.
- SAFE results are not sent to the backend.
- SUSPICIOUS and CRITICAL results show a review screen before sharing.
- The recommended share option sends selected evidence spans, not the full transcript.
- Local redaction masks Aadhaar-like numbers, PAN-like IDs, OTP/PIN phrases, and long account-like numbers before redacted transcript sharing.
- Every shared incident records `consent_status`, `consent_scope`, `local_only`, and `redaction_summary`.

## Quick Start

1. Copy `backend/.env.example` to `backend/.env` if needed.
2. Start services:

```bash
docker compose up -d
```

3. Seed the demo:

```bash
./scripts/demo_seed.sh
```

4. Open:

- Citizen check: `http://localhost:3000/check`
- Officer command: `http://localhost:3000/command`
- Backend docs: `http://localhost:8000/docs`
- Neo4j browser: `http://localhost:7474` (`neo4j` / `prahari123`)

## Useful Checks

```bash
python -m compileall backend graph scripts
python graph/ingest.py
python graph/detect_rings.py
python scripts/loadtest.py --url http://localhost:8000 --requests 100 --concurrency 20
python scripts/generate_pdf.py --ring-id RING-demo
```

## Known Limits

- The full 160-example dataset and hidden-test evaluation harness are not present.
- `/api/analyze` is reserved for Mit's AI/ML module and is not implemented here.
- Family Shield notifications are simulated.
- Evidence-package PDF generation is a lightweight local helper; the canonical evidence package is the JSON API response.
