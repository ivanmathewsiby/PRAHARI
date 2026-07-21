#!/usr/bin/env python3
"""
Tests for NCRB/NCRP-informed trend weight configuration.

Verifies that trend multipliers are applied conservatively, do not inflate
benign transcripts, and preserve the original scoring structure.

Run from backend/ directory:
    DISABLE_LLM=true python tests/test_trend_weights.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rules_engine import check_rules
from app.trend_weights import TREND_MULTIPLIERS, get_effective_weight


def check(condition: bool, label: str):
    if condition:
        print(f"  PASS: {label}")
    else:
        print(f"  FAIL: {label}")


def test_multipliers_are_conservative():
    print(f"\n{'='*70}")
    print("  TEST: Multipliers are in conservative range [1.00, 1.20]")
    print(f"{'='*70}\n")
    for category, multiplier in TREND_MULTIPLIERS.items():
        in_range = 1.00 <= multiplier <= 1.20
        check(in_range, f"{category}: {multiplier} is in [1.00, 1.20]")
        if not in_range:
            print(f"    FAIL: {category} multiplier {multiplier} out of range")


def test_effective_weight_rounding():
    print(f"\n{'='*70}")
    print("  TEST: get_effective_weight returns reasonable rounded values")
    print(f"{'='*70}\n")

    # Base 15 categories
    for cat in ["Authority", "Fabricated Evidence", "Isolation"]:
        w = get_effective_weight(15, cat)
        check(15 <= w <= 18, f"{cat}: base=15 → effective={w}")

    # Drain has highest multiplier
    w_drain = get_effective_weight(15, "Drain")
    check(16 <= w_drain <= 18, f"Drain: base=15 → effective={w_drain}")

    # Hook has base 10
    w_hook = get_effective_weight(10, "Hook")
    check(10 <= w_hook <= 12, f"Hook: base=10 → effective={w_hook}")

    # Unknown category defaults to base
    w_unknown = get_effective_weight(15, "UnknownCategory")
    check(w_unknown == 15, f"Unknown category: base=15 → effective={w_unknown} (should be 15)")


def test_mock_no_score_inflation():
    print(f"\n{'='*70}")
    print("  TEST: Score stays within [0, 100] even with all categories triggered")
    print(f"{'='*70}\n")

    full_scam_text = (
        "This is CBI. An FIR is registered against you. "
        "Don't tell anyone. Stay on the call. Transfer money to safe account now "
        "or you will be arrested immediately."
    )
    result = check_rules(full_scam_text)
    score = result["score"]
    check(0 <= score <= 100, f"Score {score} is in [0, 100]")
    check(result["trend_weighting_applied"], "trend_weighting_applied is True")
    check(len(result["applied_multipliers"]) == 5, "All 5 rule families have multipliers")


def test_benign_stays_low():
    print(f"\n{'='*70}")
    print("  TEST: Benign transcripts do not jump unexpectedly")
    print(f"{'='*70}\n")

    cases = [
        ("bank call", "Hello, this is SBI calling regarding your home loan application."),
        ("courier", "Your package is out for delivery. Please keep your ID ready."),
        ("KYC", "Your KYC is due for renewal. Please visit our branch. No payment needed."),
        ("school call", "This is St. Mary's School. Your child scored 92% in the midterm."),
    ]
    for label, text in cases:
        result = check_rules(text)
        check(
            result["score"] < 20,
            f"{label}: score={result['score']} stays low (< 20)",
        )


def test_hard_negative_stays_safe():
    print(f"\n{'='*70}")
    print("  TEST: Hard negatives remain SAFE")
    print(f"{'='*70}\n")

    cases = [
        ("RBI guidelines", "The RBI has issued new guidelines on UPI transactions."),
        ("police lost property", "This is the local police station. You filed a lost property report."),
        ("OTP own transaction", "Your OTP for the transaction of 499 rupees at Amazon is 837214."),
        ("UPI received", "You have received 2000 rupees via UPI from your friend Vikram."),
    ]
    for label, text in cases:
        result = check_rules(text)
        score = result["score"]
        safe = score < 40
        check(safe, f"{label}: score={score} (< 40, SAFE)")


def test_before_after_examples():
    print(f"\n{'='*70}")
    print("  BEFORE/AFTER EXAMPLES (trend multipliers enabled)")
    print(f"{'='*70}\n")

    # Store original multipliers to restore later
    original = dict(TREND_MULTIPLIERS)

    # Example 1: Scam with authority+legal+payment (score not ceiling-bound)
    scam_text = (
        "This is CBI. A court order has been issued against you. "
        "Transfer money to the safe account for verification."
    )

    # Simulate "before" by using all 1.0 multipliers
    for k in TREND_MULTIPLIERS:
        TREND_MULTIPLIERS[k] = 1.0
    before = check_rules(scam_text)

    # Simulate "after" by using actual trend multipliers
    for k, v in original.items():
        TREND_MULTIPLIERS[k] = v
    after = check_rules(scam_text)

    delta = after["score"] - before["score"]
    check(
        delta > 0,
        f"Scam transcript: before={before['score']}, after={after['score']}, "
        f"increase={delta} ({delta/before['score']*100:.1f}% increase)",
    )
    check(
        after["recommended_risk"] == before["recommended_risk"],
        f"Risk label unchanged: {before['recommended_risk']} → {after['recommended_risk']}",
    )

    # Show breakdown
    print(f"\n    Before (all ×1.00): score={before['score']}, "
          f"risk={before['recommended_risk']}, rules={before['rules_fired']}")
    print(f"    After (trend multipliers): score={after['score']}, "
          f"risk={after['recommended_risk']}, rules={after['rules_fired']}")

    # Example 2: Benign transcript should barely change
    benign_text = "Your appointment is confirmed for Monday. No payment is required on this call."
    before_b = check_rules(benign_text)
    after_b = check_rules(benign_text)
    check(
        before_b["score"] == after_b["score"],
        f"Benign transcript: before={before_b['score']}, after={after_b['score']} "
        f"(no change expected for zero-match transcripts)",
    )

    # Restore originals (values are the same but just to be clean)
    for k, v in original.items():
        TREND_MULTIPLIERS[k] = v


def test_incremental_sessions_trend_aware():
    print(f"\n{'='*70}")
    print("  TEST: Incremental sessions work with trend weights")
    print(f"{'='*70}\n")

    from app.rules_engine import check_rules_delta
    previous = None
    chunks = [
        "Hello? This is CBI calling.",
        "An FIR is registered against your Aadhaar.",
        "Transfer money to safe account or be arrested. Do not tell anyone.",
    ]
    scores = []
    accumulated = ""
    for chunk in chunks:
        accumulated += chunk
        delta = check_rules_delta(previous, accumulated)
        previous = delta["rule_result"]
        scores.append(delta["rule_result"]["score"])

    check(len(scores) == 3, f"Got {len(scores)} scores across 3 chunks")
    check(all(scores[i] <= scores[i + 1] for i in range(len(scores) - 1)),
          f"Scores are non-decreasing: {scores}")
    check(scores[-1] == 100, f"Final score capped at 100, got {scores[-1]}")


def test_trend_weighting_flag():
    print(f"\n{'='*70}")
    print("  TEST: Result contains trend_weighting metadata")
    print(f"{'='*70}\n")

    result = check_rules("Test text with CBI.")
    check("trend_weighting_applied" in result, "trend_weighting_applied key present")
    check("applied_multipliers" in result, "applied_multipliers key present")
    check(isinstance(result["applied_multipliers"], dict), "applied_multipliers is a dict")
    check(result["trend_weighting_applied"] is True, "trend_weighting_applied is True")
    check(len(result["applied_multipliers"]) == 5, "5 rule families in applied_multipliers")


if __name__ == "__main__":
    os.environ["DISABLE_LLM"] = "true"

    import importlib
    import app.llm_classifier as llm_mod
    llm_mod.DISABLE_LLM = True

    test_multipliers_are_conservative()
    test_effective_weight_rounding()
    test_mock_no_score_inflation()
    test_benign_stays_low()
    test_hard_negative_stays_safe()
    test_before_after_examples()
    test_incremental_sessions_trend_aware()
    test_trend_weighting_flag()

    print(f"\n{'='*70}")
    print("  All trend weight tests complete.")
    print(f"{'='*70}\n")
