# PRAHARI

Stop the scam before the money moves.

PRAHARI is a hackathon prototype for digital-arrest scam interception and fraud-network intelligence. It has a citizen check flow, an officer command dashboard, PostgreSQL-backed incident/audit storage, and Neo4j graph clustering for planted fraud rings.

## What Works In This Repo

- FastAPI backend with health, incident, audit, dashboard, and ring APIs.
- PostgreSQL schema and Alembic migration for incidents and audit logs.
- Neo4j schema, ingestion pipeline, ring detection, hub ranking, and evidence-package JSON.
- Next.js citizen UI at `/check` with Mit's deterministic engine, instant English browser speech, offline multilingual Whisper, consent review, redaction, and visible privacy telemetry.
- Officer command UI at `/command` with incident queue and fraud-ring panel.
- Demo seed script that plants three reusable fraud rings.
- Offline frontend demo fallback if the backend is not running.

Mit's AI/ML module is integrated. The browser uses a matching deterministic pass for the private first verdict. After a risky result and explicit consent, `/api/analyze` runs Mit's Python rules, optional structured LLM classifier, calibrated fusion, audit logging, and automatic graph ingestion on only the approved evidence.

## Architecture

```text
Citizen /check
     |
     v
On-device deterministic scan
     |
     | SAFE: keep local and send nothing
     |
     | SUSPICIOUS/CRITICAL: show review and consent
     |
     v
User-approved minimal evidence -> Mit `/api/analyze`
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

- Pasted text and text-file contents are scanned locally in the browser.
- Instant English mode uses the browser's speech-recognition service. It requires no PRAHARI model download, but the browser vendor may process microphone audio online; the privacy bar states this explicitly.
- Strict-private Hindi, Hinglish, and English mode transcribes in a Web Worker with Whisper using WebGPU when available and WebAssembly otherwise. The model may download once, but microphone audio is not sent to a transcription server.
- The NCRP handoff copies a locally extracted suspect identifier and opens the official suspect-repository search. Identifiers are never placed in the destination URL.
- Speech capture lists all 22 scheduled Indian languages plus English. Browser mode requests each language's Indian BCP 47 locale. Offline Whisper uses explicit language tokens where the stock model provides them and clearly marks the remaining low-resource languages as best-effort auto-detection.
- SAFE results are not sent to the backend.
- SUSPICIOUS and CRITICAL results show a review screen before sharing.
- The recommended share option sends selected evidence spans, not the full transcript.
- Local redaction masks Aadhaar-like numbers, PAN-like IDs, OTP/PIN phrases, and long account-like numbers before redacted transcript sharing.
- Every shared incident records `consent_status`, `consent_scope`, `local_only`, and `redaction_summary`.
- Citizens can withdraw consent from the result screen; the incident, audit payload, and Neo4j report are deleted.
- Citizens choose a 1, 7, or 30 day retention period. The expiry is stored, displayed in a downloadable consent receipt, and expired records are purged from SQL, audit, and graph storage.

## Quick Start

1. Copy `backend/.env.example` to `backend/.env` if needed.
2. From Git Bash, WSL, Linux, or macOS, run the seeded demo setup:

```bash
bash scripts/demo_seed.sh
```

This starts the services, applies migrations, seeds three planted fraud rings, ingests the graph, and runs ring detection. If Bash is unavailable, run the equivalent Docker steps:

```powershell
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python seed.py
```

3. Open:

- Citizen check: `http://localhost:3000/check`
- Officer command: `http://localhost:3000/command`
- Backend docs: `http://localhost:8000/docs`
- Neo4j browser: `http://localhost:7474` (`neo4j` / `prahari123`)

For the fastest judge walkthrough, open `/check`, select **Protect me during a call**, and click **Run live demo**. PRAHARI shows progressive scam phases and interrupts before the synthetic caller reaches the payment demand.

## Useful Checks

```bash
python -m compileall backend graph scripts
python graph/ingest.py
python graph/detect_rings.py
python scripts/loadtest.py --url http://localhost:8000 --requests 100 --concurrency 20
python scripts/generate_pdf.py --ring-id RING-demo
```

## Project Report

- Editable report: [`docs/PRAHARI_Project_Report.docx`](docs/PRAHARI_Project_Report.docx)
- Submission PDF: [`output/pdf/PRAHARI_Project_Report.pdf`](output/pdf/PRAHARI_Project_Report.pdf)

## Known Limits

- Mit's original evaluation harness contains 19 focused examples. PRAHARI also includes a reproducible 120-case English/Hindi/Hinglish synthetic benchmark with hard negatives and pre-payment timing; it remains a prototype benchmark, not field validation.
- Image, PDF, and audio-file upload extraction are not claimed as complete; paste, text-file, and browser-local microphone transcription are the supported web-demo paths.
- Family Shield notifications are simulated.
- Evidence-package PDF generation is a lightweight local helper; the canonical evidence package is the JSON API response.
