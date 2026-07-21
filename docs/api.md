# PRAHARI API

## Existing Endpoints

### `POST /api/analyze`

Full-transcript analysis. Accepts the entire transcript in a single request, runs rules + optional LLM, persists incident/audit for non-SAFE results.

**Request:**
```json
{
  "transcript": "This is CBI officer... transfer money to safe account...",
  "citizen_name": "Ravi Sharma",
  "phone_number": "+919876543210",
  "consent_status": "GRANTED",
  "consent_scope": "full_transcript",
  "retention_days": 7
}
```

**Response (CRITICAL):**
```json
{
  "incident_id": "a1b2c3d4",
  "persisted": true,
  "graph_synced": true,
  "ring_id": "RING-0",
  "risk_label": "CRITICAL",
  "risk_level": "HIGH",
  "risk_score": 100,
  "recommended_action": "IMMEDIATE Escalation: ...",
  "mode": "offline_safety_analysis",
  "rules_fired": ["Authority", "Drain"],
  "matches": { "Authority": ["CBI"], "Drain": ["safe account"] },
  "phases_detected": ["Authority", "Drain"],
  "evidence_spans": ["CBI", "safe account"],
  "entities": { "phone_numbers": [], "upi_ids": [], "bank_accounts": [], "amount_inr": null },
  "plain_language_reason": "...",
  "consent_scope": "full_transcript",
  "retention_days": 7,
  "expires_at": "2026-07-28T13:57:27Z"
}
```

---

## Live Session Endpoints

### `POST /api/analyze/session/start`

Create a new analysis session for incremental (chunked) transcript ingestion.

**Request:**
```json
{
  "citizen_name": "Ravi Sharma",
  "phone_number": "+919876543210",
  "caller_phone_number": "+919000000001",
  "source_channel": "telephony_sip",
  "consent_status": "GRANTED",
  "consent_scope": "full_transcript",
  "retention_days": 7
}
```

**Response:**
```json
{
  "session_id": "bb768caf-a9d8-41aa-bdfc-ec83d481ba68",
  "expires_at": "2026-07-21T14:25:43Z"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `session_id` | string | UUIDv4, used as path param in subsequent chunk calls |
| `expires_at` | datetime | ISO-8601. Session is evicted after 30 minutes of inactivity |

---

### `POST /api/analyze/session/{session_id}/chunk`

Send a transcript chunk for progressive analysis.

**Request:**
```json
{
  "transcript_chunk": "I am Senior Inspector Gupta from CBI.",
  "is_final": false
}
```

| Field | Type | Notes |
|-------|------|-------|
| `transcript_chunk` | string | Appended to the session's accumulated transcript |
| `is_final` | bool | `false` = intermediate, `true` = last chunk (triggers LLM + persistence) |

**Intermediate response (`is_final=false`):**
```json
{
  "session_id": "bb768caf-...",
  "mode": "offline_safety_analysis",
  "phases_detected": ["Authority"],
  "highest_phase": 2,
  "risk_label": "SAFE",
  "risk_score": 15,
  "rules_fired": ["Authority"],
  "evidence_spans": ["CBI"],
  "entities": { "phone_numbers": [], "upi_ids": [], "bank_accounts": [], "amount_inr": null },
  "has_new_signal": true,
  "accumulated_length": 40,
  "is_complete": false
}
```

**Final response (`is_final=true`, CRITICAL):**
```json
{
  "session_id": "bb768caf-...",
  "mode": "offline_safety_analysis",
  "phases_detected": ["Hook", "Authority", "Fabricated Evidence", "Isolation", "Drain"],
  "highest_phase": 5,
  "risk_label": "CRITICAL",
  "risk_score": 100,
  "rules_fired": ["Authority", "Isolation", "Drain", "Fabricated Evidence", "Hook"],
  "evidence_spans": ["CBI", "FIR", "safe account"],
  "entities": { "phone_numbers": [], "upi_ids": [], "bank_accounts": [], "amount_inr": null },
  "has_new_signal": true,
  "accumulated_length": 361,
  "is_complete": true,
  "incident_id": "72e1d6ab",
  "persisted": true,
  "graph_synced": true,
  "ring_id": "RING-0",
  "recommended_action": "IMMEDIATE Escalation: ...",
  "matches": { "Authority": ["CBI"], "Drain": ["safe account"] },
  "plain_language_reason": "...",
  "consent_scope": "full_transcript",
  "retention_days": 7,
  "expires_at": "2026-07-28T13:57:17Z",
  "risk_level": "HIGH"
}
```

---

## Modes

| Mode | Meaning |
|------|---------|
| `offline_safety_analysis` | Only rules engine used. LLM was unavailable, skipped (`DISABLE_LLM=true`, no key, or non-final chunk). Fusion uses rules-only scoring. |
| `full_analysis` | Rules + LLM both ran. Fusion applies LLM confidence boost and phase bonuses. Occurs only on `POST /api/analyze` or final chunk with LLM available. |

---

## Error: Missing / Expired Session

```
POST /api/analyze/session/nonexistent-session-id/chunk
```

**Response:**
```json
{
  "detail": {
    "error": "session_not_found_or_expired"
  }
}
```

Status: **404 Not Found**

Sessions are evicted:
- After 30 minutes of inactivity (idle TTL).
- Immediately after a successful final chunk.
- On server restart (in-memory store).

No implicit session creation — clients must call `POST /api/analyze/session/start` first.

---

## Graph Integration

For a non-SAFE final chunk, the consented incident and audit record are persisted and the report is ingested into Neo4j. The response returns:

- `graph_synced`: whether Neo4j ingestion completed successfully.
- `ring_id`: the existing seeded or discovered ring joined through a reused caller number, UPI ID, or bank account; otherwise `null`.

For telephony sessions, `caller_phone_number` is the suspicious graph identifier. The citizen's own `phone_number` is never used to connect fraud reports.

---

## Source Channels

| Value | Use Case |
|-------|----------|
| `citizen_web` | Browser-based voluntary report |
| `telephony_sip` | Live SIP call monitoring |
| `telephony_pstn` | PSTN call recording ingestion |
