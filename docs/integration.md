# PRAHARI Integration Guide

## Session Limitation

Session state lives in a process-local dict. Only one backend worker is supported; sticky-session load balancing is required in multi-replica deployments. Sessions are lost on restart or TTL expiry. This is intentional — no external cache or queue was introduced.

---

## Requirements

- Python 3.9+
- PostgreSQL (SQLite supported for development with `DATABASE_URL=sqlite:///test.db`)
- Neo4j (optional — graph sync failures are non-blocking, logged as warnings)
- Anthropic API key (optional — set `ANTHROPIC_API_KEY` or `DISABLE_LLM=true`)

---

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | No | `postgresql://postgres:postgres@localhost:5432/prahari` | |
| `NEO4J_URI` | No | `bolt://localhost:7687` | |
| `NEO4J_USER` | No | `neo4j` | |
| `NEO4J_PASSWORD` | No | `prahari123` | |
| `ANTHROPIC_API_KEY` | No (LLM optional) | — | Missing = offline fallback |
| `DISABLE_LLM` | No | `false` | Set `true` to force offline mode |
| `ADMIN_API_KEY` | No | `change-me-for-demo` | Used for graph admin endpoints |

---

## Running

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Without LLM:
```bash
DISABLE_LLM=true uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Running Tests

```bash
cd backend
DISABLE_LLM=true python tests/evaluate.py
DISABLE_LLM=true python tests/test_live_sessions.py
python tests/benchmark_120.py
```

---

## Session Lifecycle

1. **Start** — `POST /api/analyze/session/start` allocates an in-memory session, returns `session_id`.
2. **Accumulate** — Send chunks with `is_final=false`. Each chunk runs rules on the full transcript so far. LLM is **not** called on intermediates.
3. **Finalise** — Send last chunk with `is_final=true`. Runs rules + optional LLM + fusion, persists incident/audit to PostgreSQL if not SAFE, then evicts the session.
4. **Recover** — If the session expires (30 min idle) or the server restarts, the client gets a `404` and must call `/start` again.

## Client Integration Checklist

- [ ] Call `POST /api/analyze/session/start` to begin a live analysis session.
- [ ] Send transcript chunks via `POST /api/analyze/session/{session_id}/chunk` with `is_final=false`.
- [ ] Monitor intermediate responses for `has_new_signal` to detect risk changes.
- [ ] Send final chunk with `is_final=true` to trigger LLM (if available) and persistence.
- [ ] Handle `404 {"error": "session_not_found_or_expired"}` by restarting a new session.
- [ ] For single-transcript analysis, use the existing `POST /api/analyze` (no session needed).
