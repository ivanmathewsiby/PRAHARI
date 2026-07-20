# PRAHARI Demo Script

## 0:00 - Business Impact

"PRAHARI focuses on the highest-value moment in a digital-arrest scam: before payment. The citizen sees one clear instruction, while every report becomes graph intelligence for officers."

## 0:25 - Citizen Check

Open `http://localhost:3000/check`.

Point out the three privacy promises above the input: private device scan, safe results never uploaded, and risky evidence shared only after consent.

Paste:

```text
This is CBI officer Sharma. A parcel containing narcotics was booked under your Aadhaar at Mumbai customs. You are under digital arrest. Do not tell your family. Transfer Rs.85,000 to cbi.verify@upi immediately or we will arrest you.
```

Click `Check Now`. Show that the risk result appears as a private local result first. Then use `Share selected evidence` to create the backend incident for complaint generation and graph intelligence.

Optional: open the `Live` tab and use `Start live scan` to fill the transcript through the browser speech recognizer. Explain that the demo uses browser-side speech recognition and still does not upload audio.

## 1:15 - Offline Safety Story

Explain that this repo leaves Mit's AI/ML endpoint untouched. The current citizen UI still works as an offline safety demo using deterministic local mock analysis and stores records only after a risky result plus user consent.

## 1:40 - Officer Command

Open `http://localhost:3000/command`.

Show:

- Incident queue and KPI panel.
- Graph ring list.
- Selected ring graph.
- Top suspected mule infrastructure.

## 2:20 - Ring Evidence

Open the backend docs or call:

```text
GET http://localhost:8000/api/rings
GET http://localhost:8000/api/rings/{ring_id}/evidence-package
```

Point out that the evidence package says it is for law-enforcement review, not a legal determination.

## 2:45 - Close

"The prototype closes the loop: citizen warning, structured report, graph clustering, and officer prioritization. Synthetic and simulated pieces are clearly labelled, and the system can run without an LLM key for the demo."

## Simulated vs Real

- Real: FastAPI routes, PostgreSQL persistence, Alembic migration, Neo4j ingestion, ring clustering, dashboard reads.
- Simulated: AI/ML classifier, Family Shield notification, hidden-test metrics.
- Privacy behavior: local-first scan and consent gate are implemented in the frontend demo; production mobile builds should use OS/on-device ASR and local models for the same policy.
- Synthetic: Seeded fraud rings and demo transcripts.
