#!/usr/bin/env python3
"""
PRAHARI Incremental Session Tests

Tests progressive chunk-based analysis at the function level.
All tests run with DISABLE_LLM=true (no Anthropic key required).

Run from backend/ directory:
    DISABLE_LLM=true python tests/test_live_sessions.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rules_engine import check_rules_delta
from app.rules_fusion import fuse_results
from app.scam_phases import CANONICAL_PHASES


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _highest_phase(phases: list) -> int:
    result = 0
    for p in phases:
        if p in CANONICAL_PHASES:
            idx = CANONICAL_PHASES.index(p) + 1
            if idx > result:
                result = idx
    return result


def _phases_from_rules(rules_fired: list) -> list:
    return [p for p in CANONICAL_PHASES if p in rules_fired]


def simulate_session(chunks: list) -> list:
    """Run a sequence of chunks through check_rules_delta + fuse_results.

    Each element of *chunks* is {"text": str, "is_final": bool}.

    Returns a list of per-step result dicts.
    """
    accumulated = ""
    previous_result = None
    steps = []

    for chunk in chunks:
        accumulated += chunk["text"]
        delta = check_rules_delta(previous_result, accumulated)
        previous_result = delta["rule_result"]
        fused = fuse_results(delta["rule_result"], llm_result=None)

        rules_fired = delta["rule_result"].get("rules_fired", [])
        phases = _phases_from_rules(rules_fired)

        steps.append({
            "accumulated_length": len(accumulated),
            "rule_result": delta["rule_result"],
            "has_new_signal": delta["has_new_signal"],
            "phases_detected": phases,
            "highest_phase": _highest_phase(phases),
            "rules_fired": rules_fired,
            "risk_label": fused["risk_label"],
            "risk_score": fused["risk_score"],
            "risk_level": fused["db_risk_level"],
            "mode": fused["mode"],
            "is_final": chunk.get("is_final", False),
        })

    return steps


def check(condition: bool, label: str):
    if condition:
        print(f"  PASS: {label}")
    else:
        print(f"  FAIL: {label}")


# ---------------------------------------------------------------------------
# test data
# ---------------------------------------------------------------------------

SCAM_3_CHUNKS = [
    {
        "id": "chunk_1_opener",
        "text": "Hello? This is an urgent call from the cyber cell police department.",
    },
    {
        "id": "chunk_2_authority_legal",
        "text": "An FIR has been registered against your Aadhaar, case number CBI-FIR-2026-8844. You need to cooperate for the verification process.",
    },
    {
        "id": "chunk_3_drain_isolation",
        "text": "Transfer 50,000 rupees to this safe account immediately or you will be arrested. Do not tell anyone. Stay on the video call. This is a non-bailable warrant.",
        "is_final": True,
    },
]

BENIGN_3_CHUNKS = [
    {
        "id": "benign_chunk_1",
        "text": "Good morning. This is SBI calling regarding your home loan application.",
    },
    {
        "id": "benign_chunk_2",
        "text": "We need some additional documents. Could you please visit the branch tomorrow?",
    },
    {
        "id": "benign_chunk_3",
        "text": "Your application number is HL-2024-3342. Please bring your ID proof.",
        "is_final": True,
    },
]

HARDNEG_3_CHUNKS = [
    {
        "id": "hardneg_chunk_1",
        "text": "The RBI has issued new guidelines on digital payments and UPI transactions.",
    },
    {
        "id": "hardneg_chunk_2",
        "text": "Please update your banking app to the latest version for compliance and safety.",
    },
    {
        "id": "hardneg_chunk_3",
        "text": "For full details visit the official RBI website at rbi.org.in.",
        "is_final": True,
    },
]

# ---------------------------------------------------------------------------
# scenarios
# ---------------------------------------------------------------------------

def test_scam_escalation_3_chunks():
    print(f"\n{'='*70}")
    print("  SCENARIO 1: Escalating Digital-Arrest Scam (3 chunks)")
    print(f"{'='*70}\n")

    steps = simulate_session(SCAM_3_CHUNKS)

    for i, s in enumerate(steps):
        print(f"  Chunk {i+1} ({len(SCAM_3_CHUNKS[i]['text'])} chars): "
              f"risk={s['risk_label']:12s}  score={s['risk_score']:3d}  "
              f"phases={s['phases_detected']}  "
              f"new_signal={s['has_new_signal']}  "
              f"mode={s['mode']}")

    # Step 1 – opener with authority mention only
    check(steps[0]["risk_label"] == "SAFE", "Chunk 1 risk_label is SAFE")
    check("Authority" in steps[0]["rules_fired"], "Chunk 1 fires Authority")
    check(len(steps[0]["phases_detected"]) == 1, "Chunk 1 detects 1 phase")
    check(steps[0]["highest_phase"] == 2, "Chunk 1 highest_phase is 2 (Authority)")
    check(steps[0]["mode"] == "offline_safety_analysis", "Chunk 1 mode is offline_safety_analysis")
    check(steps[0]["has_new_signal"], "Chunk 1 has_new_signal (first chunk)")
    check(steps[0]["risk_score"] == 15, "Chunk 1 score is 15 (authority)")

    # Step 2 – authority + fabricated evidence
    check(steps[1]["risk_label"] == "SUSPICIOUS", "Chunk 2 risk_label escalates to SUSPICIOUS")
    check("Authority" in steps[1]["phases_detected"], "Chunk 2 detects Authority")
    check("Fabricated Evidence" in steps[1]["phases_detected"], "Chunk 2 detects Fabricated Evidence")
    check(steps[1]["highest_phase"] == 3, "Chunk 2 highest_phase is 3 (Fabricated Evidence)")
    check(steps[1]["mode"] == "offline_safety_analysis", "Chunk 2 mode is offline_safety_analysis")
    check(steps[1]["has_new_signal"], "Chunk 2 has_new_signal (new phases fired)")
    check(steps[1]["risk_score"] > steps[0]["risk_score"], "Chunk 2 score > Chunk 1 score (escalation)")

    # Step 3 – final: all phases + persist
    check(steps[2]["risk_label"] == "CRITICAL", "Chunk 3 risk_label escalates to CRITICAL")
    check(steps[2]["highest_phase"] == 5, "Chunk 3 highest_phase is 5 (Drain)")
    check(len(steps[2]["phases_detected"]) >= 4, "Chunk 3 detects >= 4 phases")
    check("Hook" in steps[2]["phases_detected"], "Chunk 3 detects Hook")
    check("Authority" in steps[2]["phases_detected"], "Chunk 3 detects Authority")
    check("Fabricated Evidence" in steps[2]["phases_detected"], "Chunk 3 detects Fabricated Evidence")
    check("Isolation" in steps[2]["phases_detected"], "Chunk 3 detects Isolation")
    check("Drain" in steps[2]["phases_detected"], "Chunk 3 detects Drain")
    check(steps[2]["risk_score"] >= steps[1]["risk_score"], "Chunk 3 score >= Chunk 2 score (non-decreasing)")
    check(steps[2]["mode"] == "offline_safety_analysis", "Chunk 3 mode is offline_safety_analysis")
    check(steps[2]["is_final"], "Chunk 3 is_final")
    check(steps[2]["has_new_signal"], "Chunk 3 has_new_signal (new Hook, Isolation, Drain)")

    print(f"\n{'='*70}\n")


def test_benign_3_chunks():
    print(f"{'='*70}")
    print("  SCENARIO 2: Benign Bank Support Call (3 chunks)")
    print(f"{'='*70}\n")

    steps = simulate_session(BENIGN_3_CHUNKS)

    for i, s in enumerate(steps):
        print(f"  Chunk {i+1} ({len(BENIGN_3_CHUNKS[i]['text'])} chars): "
              f"risk={s['risk_label']:12s}  score={s['risk_score']:3d}  "
              f"phases={s['phases_detected']}  "
              f"new_signal={s['has_new_signal']}  "
              f"mode={s['mode']}")

    for i, s in enumerate(steps):
        check(s["risk_label"] == "SAFE", f"Chunk {i+1} risk_label is SAFE")
        check(len(s["rules_fired"]) == 0, f"Chunk {i+1} fires no rules")
        check(len(s["phases_detected"]) == 0, f"Chunk {i+1} detects no phases")
        check(s["highest_phase"] == 0, f"Chunk {i+1} highest_phase is 0")
        check(s["risk_score"] == 0, f"Chunk {i+1} score is 0")
        check(s["mode"] == "offline_safety_analysis", f"Chunk {i+1} mode is offline_safety_analysis")
        if i == 0:
            check(s["has_new_signal"], "Chunk 1 has_new_signal (first chunk)")
        else:
            check(not s["has_new_signal"], f"Chunk {i+1} has_new_signal is False (no change)")

    print(f"\n{'='*70}\n")


def test_hard_negative_3_chunks():
    print(f"{'='*70}")
    print("  SCENARIO 3: Hard-Negative RBI Guideline Call (3 chunks)")
    print(f"{'='*70}\n")

    steps = simulate_session(HARDNEG_3_CHUNKS)

    for i, s in enumerate(steps):
        print(f"  Chunk {i+1} ({len(HARDNEG_3_CHUNKS[i]['text'])} chars): "
              f"risk={s['risk_label']:12s}  score={s['risk_score']:3d}  "
              f"rules={s['rules_fired']}  "
              f"new_signal={s['has_new_signal']}  "
              f"mode={s['mode']}")

    for i, s in enumerate(steps):
        check(s["risk_label"] == "SAFE", f"Chunk {i+1} risk_label is SAFE (not a false positive)")
        check(s["mode"] == "offline_safety_analysis", f"Chunk {i+1} mode is offline_safety_analysis")

    # Hard negatives may fire Authority + Drain (RBI + UPI), but must stay SAFE
    check("Authority" in steps[0]["rules_fired"], "Chunk 1 fires Authority (RBI mention)")
    check("Drain" in steps[0]["rules_fired"], "Chunk 1 fires Drain (UPI mention)")
    check(steps[0]["risk_score"] == 35, "Chunk 1 score is 35 (authority+drain+2cat bonus)")
    check(not any(s["risk_label"] in ("SUSPICIOUS", "CRITICAL") for s in steps),
          "No chunk ever becomes SUSPICIOUS or CRITICAL")

    print(f"\n{'='*70}\n")


def test_delta_detection():
    print(f"{'='*70}")
    print("  SCENARIO 4: Delta Detection (has_new_signal correctness)")
    print(f"{'='*70}\n")

    # First call with no previous → always True
    d1 = check_rules_delta(None, "Hello from CBI.")
    check(d1["has_new_signal"], "First call with None previous → has_new_signal=True")
    check(d1["rule_result"]["score"] == 15, "Score 15 (Authority)")

    # Same text again → no change → False
    d2 = check_rules_delta(d1["rule_result"], "Hello from CBI.")
    check(not d2["has_new_signal"], "Same text again → has_new_signal=False")
    check(d2["rule_result"]["score"] == 15, "Score still 15")

    # New text with additional rule → True
    d3 = check_rules_delta(d2["rule_result"], "Hello from CBI. Transfer money to safe account.")
    check(d3["has_new_signal"], "New text with Drain → has_new_signal=True")
    check("Drain" in d3["rule_result"]["rules_fired"], "Drain rule fires")
    check(d3["rule_result"]["score"] == 35, "Score 35 (Authority + Drain + 2cat bonus)")

    # Same text again → no change → False
    d4 = check_rules_delta(d3["rule_result"], "Hello from CBI. Transfer money to safe account.")
    check(not d4["has_new_signal"], "Same expanded text → has_new_signal=False")
    check(d4["rule_result"]["score"] == 35, "Score still 35")

    # Degrading text: fewer rules fired → still has_new_signal (different rules_fired)
    d5 = check_rules_delta(d4["rule_result"], "Hello, this is a normal call.")
    check(d5["has_new_signal"], "Fewer rules → has_new_signal=True (rules_fired changed)")
    check(d5["rule_result"]["score"] == 0, "Score 0 (no rules)")
    check(len(d5["rule_result"]["rules_fired"]) == 0, "No rules fired")

    print(f"\n{'='*70}\n")


def test_risk_score_non_decreasing():
    print(f"{'='*70}")
    print("  SCENARIO 5: Risk Score Non-Decreasing in Progressive Session")
    print(f"{'='*70}\n")

    steps = simulate_session(SCAM_3_CHUNKS)
    scores = [s["risk_score"] for s in steps]
    non_decreasing = all(scores[i] <= scores[i + 1] for i in range(len(scores) - 1))
    check(non_decreasing, "Risk score never decreases across scam chunks")
    check(scores == [15, 55, 100], f"Expected scores [15, 55, 100], got {scores}")

    print(f"\n{'='*70}\n")


def test_session_not_found_equivalent():
    print(f"{'='*70}")
    print("  SCENARIO 6: Session-Not-Found / Expired Equivalent")
    print(f"{'='*70}\n")

    # When session expires, the store is cleared → next chunk starts fresh.
    # Simulate this by calling check_rules_delta with None after a session.
    chunks = [{"text": "This is CBI.", "is_final": False}]
    steps = simulate_session(chunks)
    check(steps[0]["has_new_signal"], "Normal session: first chunk has_new_signal=True")
    check(steps[0]["risk_label"] == "SAFE", "Normal session: SAFE")

    # Simulate expiry → start over with None
    fresh = check_rules_delta(None, "This is CBI.")
    check(fresh["has_new_signal"], "Expired session equivalent: fresh call has_new_signal=True")
    check(fresh["rule_result"]["score"] == 15, "Expired session equivalent: score 15")

    print(f"\n{'='*70}\n")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    os.environ["DISABLE_LLM"] = "true"

    import importlib
    import app.llm_classifier as llm_mod
    llm_mod.DISABLE_LLM = True

    test_scam_escalation_3_chunks()
    test_benign_3_chunks()
    test_hard_negative_3_chunks()
    test_delta_detection()
    test_risk_score_non_decreasing()
    test_session_not_found_equivalent()

    print("  All incremental session tests complete.\n")
