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

---

## Trend-Informed Rule Weights

The deterministic engine supports a lightweight configuration layer for adjusting
rule-family base scores based on general awareness of publicly reported cybercrime
trends (NCRB/NCRP, not a live data feed).

**How it works:**

1. Base scores remain unchanged as defaults (15 / 10 per category).
2. `app/trend_weights.py` defines a `TREND_MULTIPLIERS` dict mapping each
   rule family to a small multiplier (range 1.00–1.20).
3. `get_effective_weight(base, category)` applies the multiplier and rounds:
   `effective = round(base × multiplier)`.
4. `check_rules()` uses `get_effective_weight` for each category's score
   contribution. Combo bonuses and category-count bonuses are unaffected.

**Current multipliers (conservative, not exact statistics):**

| Rule Family | Base | Multiplier | Effective |
|-------------|------|------------|-----------|
| Authority impersonation | 15 | 1.08 | 16 |
| Fabricated legal language | 15 | 1.10 | 16 |
| Payment request / Drain | 15 | 1.12 | 17 |
| Isolation language | 15 | 1.04 | 16 |
| Urgency / Hook | 10 | 1.06 | 11 |

**Design constraints:**

- Multipliers are **optional** and fully transparent — the mapping is a plain dict.
- The `check_rules` result includes `trend_weighting_applied` and
  `applied_multipliers` fields for observability.
- No real-time adaptation, no external API dependency, no scraping.
- The existing scoring structure (combo bonuses, category count bonuses,
  risk thresholds) is preserved exactly.

**To disable trend weighting,** set all multipliers to 1.00 in
`app/trend_weights.py`. Tests expect specific effective scores; see
`tests/test_trend_weights.py` for before/after examples.

Future work: Calibrate multipliers against larger evaluation datasets. The
current values are a safe starting point for hackathon demonstration.
