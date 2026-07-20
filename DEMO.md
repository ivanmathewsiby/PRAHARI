# PRAHARI Demo Script

## 0:00 - Business Impact

"PRAHARI focuses on the highest-value moment in a digital-arrest scam: before payment. The citizen sees one clear instruction, while every report becomes graph intelligence for officers."

## 0:25 - Citizen Check

Open `http://localhost:3000/check`.

Point out the live privacy meter: on-device analysis, `0 B` evidence uploaded, and no stored audio.

Paste:

```text
This is CBI officer Sharma. A parcel containing narcotics was booked under your Aadhaar at Mumbai customs. You are under digital arrest. Do not tell your family. Transfer Rs.85,000 to cbi.verify@upi immediately or we will arrest you.
```

Click `Check Now`. Show that Mit's deterministic pass produces a private local result first. Then use `Share selected evidence`. The consented backend analysis reuses `cbi.verify@upi`, creates one incident and audit record, ingests it automatically, and attaches it to the seeded ring.

Open the `Live` tab, prepare the cached Whisper model, then record a short speakerphone segment. Explain that WebGPU is used when available and WebAssembly is the fallback; the model download is separate from evidence upload and microphone audio stays in browser memory.

Before sharing, select the 24-hour retention option. After consent, show the byte counter and download the consent receipt.

## 1:15 - Offline Safety Story

Disconnect the network before the first scan. The private deterministic result still works and SAFE content creates no backend request. Reconnect only for the consented share; the backend can still use Mit's deterministic fallback when the optional LLM is disabled.

## 1:40 - Officer Command

Open `http://localhost:3000/command`.

Show:

- Incident queue and KPI panel.
- Graph ring list.
- Selected ring graph.
- Top suspected mule infrastructure.
- The live ring-join banner, pulsing ring row, and newly highlighted report node.

Show the benchmark strip: 120 reproducible synthetic English/Hindi/Hinglish cases. Say explicitly that it is a prototype benchmark, not field validation.

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
- Real: Mit's deterministic rules, fusion, offline fallback, consent gate, deletion lifecycle, and `/api/analyze` integration.
- Simulated: Family Shield notification and any hidden-test metrics not produced from a separately held dataset.
- Privacy behavior: local-first text analysis, browser-local Whisper transcription, consent scope, automatic expiry, consent receipt, and deletion lifecycle are implemented.
- Synthetic: Seeded fraud rings and demo transcripts.
