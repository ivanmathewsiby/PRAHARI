# PRAHARI Architecture

## Analysis Pipeline

```
transcript
    │
    ▼
┌─────────────────┐
│  rules_engine    │  ← regex 5-category match, score (0-100), risk label
│  check_rules()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  llm_classifier  │  ← optional Anthropic Claude; safely falls back offline
│  analyze_with_llm│     when DISABLE_LLM=true or ANTHROPIC_API_KEY absent
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  rules_fusion    │  ← combines rules + optional LLM into final verdict
│  fuse_results()  │     CRITICAL / SUSPICIOUS / SAFE
└────────┬────────┘
         │
         ▼
   persist (only if CRITICAL or SUSPICIOUS):
   ┌──────────────┐    ┌──────────────┐
   │ IncidentEvent│    │  AuditLog    │  ← PostgreSQL
   └──────────────┘    └──────────────┘
```

Source files: `app/rules_engine.py`, `app/llm_classifier.py`, `app/rules_fusion.py`, `app/api/analyze.py`.

---

## Canonical Phase Taxonomy

All phases use these labels consistently across rules engine, LLM classifier, fusion, and API responses.

| Phase | Rules Trigger | LLM Detectable | Description |
|-------|---------------|----------------|-------------|
| **Hook** | urgency/threat language | yes | "arrest", "jail", "immediate", "within 2 hours" |
| **Authority** | agency impersonation | yes | "CBI", "ED", "RBI", "police", "cyber cell" |
| **Fabricated Evidence** | fake legal threats | yes | "FIR", "warrant", "court order", "case number", "narcotics parcel" |
| **Isolation** | isolation/secrecy demands | yes | "don't tell anyone", "stay on call", "don't hang up" |
| **Drain** | payment/credential demands | yes | "transfer money", "safe account", "UPI", "OTP", "card details" |

Defined in `app/scam_phases.py` — the single source of truth. `LEGACY_LLM_PHASE_MAP` normalizes old LLM labels for backward compatibility.

---

## Live / Incremental Flow

```
Client                    Backend
  │                         │
  ├── POST /session/start ──┤  allocate session_id, in-memory state
  │ ◄── { session_id }      │
  │                         │
  ├── POST /session/{id}/chunk (is_final=false) ──►  rules on accumulated transcript
  │ ◄── intermediate result  │  NO LLM call, mode=offline_safety_analysis
  │                         │
  ├── POST /session/{id}/chunk (is_final=false) ──►  rules, delta check
  │ ◄── intermediate result  │
  │                         │
  ├── POST /session/{id}/chunk (is_final=true) ───►  rules + optional LLM + fusion
  │ ◄── final result         │  persist incident + audit if not SAFE
  │    + incident_id         │  session removed from store
```

- Accumulated transcript grows across chunks.
- `check_rules_delta()` compares current vs previous rules output to set `has_new_signal`.
- LLM runs only on the final chunk (not on intermediates).
- Intermediate responses use `fuse_results(rule_result, llm_result=None)`.

---

## Single-Process Session Limitation

Session state lives in a process-local dict. Only one backend worker is supported; sticky-session load balancing is required in multi-replica deployments. Sessions are lost on restart or TTL expiry. This is intentional — no external cache or queue was introduced.

---

## Scoring Constants

| Factor | Value |
|--------|-------|
| Per-phase base score (authority, isolation, drain, legal) | 15 |
| Hook base score | 10 |
| Combo bonus (each qualifying pair/triple) | +20 |
| Category count bonus (2/3/4+ categories) | +5 / +10 / +15 |
| LLM confidence weight (when available) | ×40 added to combined score |
| Phase bonus (LLM highest_phase × 8, cap 30) | +8 per level |

All thresholds live in `app/rules_engine.py` and `app/rules_fusion.py`.
