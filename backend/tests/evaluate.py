#!/usr/bin/env python3
"""
PRAHARI Prompt 2 Evaluation Harness

Run from backend/ directory:
    cd backend && python -m tests.evaluate

Or:
    cd backend && python tests/evaluate.py

To test with LLM disabled:
    DISABLE_LLM=true python tests/evaluate.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rules_engine import check_rules
from app.llm_classifier import analyze_with_llm
from app.rules_fusion import fuse_results


SCAM_TRANSCRIPTS = [
    {
        "id": "scam_01",
        "label": "scam",
        "bucket": "digital_arrest_full",
        "transcript": (
            "This is Officer Rajesh Kumar from the Central Bureau of Investigation. "
            "Your Aadhaar number has been linked to a narcotics parcel worth 50 lakh rupees. "
            "An FIR has been filed against you, case number CBI-2024-4451. "
            "You must transfer 2,50,000 rupees to the safe account for verification. "
            "Do not tell anyone about this call or you will be arrested immediately. "
            "Stay on the video call and do not disconnect. Your bank account will be frozen within 2 hours."
        ),
    },
    {
        "id": "scam_02",
        "label": "scam",
        "bucket": "digital_arrest_partial",
        "transcript": (
            "Hello, this is the Enforcement Directorate. We have a court order against you. "
            "You need to share your OTP and card details for verification. "
            "Keep this secret, do not inform your family. Transfer money to this UPI ID right now."
        ),
    },
    {
        "id": "scam_03",
        "label": "scam",
        "bucket": "payment_focused",
        "transcript": (
            "This is the cyber cell police. Your account has been compromised. "
            "Send money to this bank account 123456789012 for verification amount. "
            "Do not hang up or your SIM will be suspended."
        ),
    },
    {
        "id": "scam_04",
        "label": "scam",
        "bucket": "authority_only_light",
        "transcript": (
            "Ma'am this is RBI calling. We detected unauthorized transactions on your account. "
            "Please share your card details and OTP immediately so we can secure your account."
        ),
    },
    {
        "id": "scam_05",
        "label": "scam",
        "bucket": "legal_payment_combo",
        "transcript": (
            "This is Inspector Sharma from the police. A non-bailable warrant has been issued "
            "in your name. To settle this, deposit 75000 rupees via crypto to this safe account. "
            "Don't tell anyone or face consequences. Stay on the line."
        ),
    },
    {
        "id": "scam_06",
        "label": "scam",
        "bucket": "isolation_payment",
        "transcript": (
            "Don't end the call. I am from the Customs department. Your parcel from abroad "
            "has been seized. You need to pay a verification fee of 30000 via UPI. "
            "Don't talk to anyone about this or you will face legal action."
        ),
    },
    {
        "id": "scam_07",
        "label": "scam",
        "bucket": "multi_vector",
        "transcript": (
            "This is Judge Verma from the High Court. An arrest warrant is against you. "
            "Your case number is HC-2024-9921. The only way to resolve this is to pay "
            "5 lakh rupees to the safe account immediately. Do not disconnect this video call. "
            "Remain isolated. We are monitoring you. If you inform anyone, your account will be frozen."
        ),
    },
    {
        "id": "scam_08",
        "label": "scam",
        "bucket": "trai_scam",
        "transcript": (
            "This is TRAI. Your SIM card will be suspended within 1 hour due to illegal activity. "
            "Press 1 to speak to the officer. Transfer money to this account to reactivate."
        ),
    },
]

BENIGN_TRANSCRIPTS = [
    {
        "id": "benign_01",
        "label": "benign",
        "bucket": "bank_legit_call",
        "transcript": (
            "Hello, this is SBI calling regarding your home loan application. "
            "We need some additional documents. Could you please visit the branch tomorrow? "
            "Your application number is HL-2024-3342."
        ),
    },
    {
        "id": "benign_02",
        "label": "benign",
        "bucket": "courier_delivery",
        "transcript": (
            "Hi, this is from Blue Dart courier. Your package is out for delivery. "
            "It will arrive between 2 to 5 PM today. Please keep your ID ready."
        ),
    },
    {
        "id": "benign_03",
        "label": "benign",
        "bucket": "kyc_renewal",
        "transcript": (
            "Good morning. This is Axis Bank KYC department. Your KYC is due for renewal. "
            "Please visit our branch or complete it online through our app. No payment is needed."
        ),
    },
    {
        "id": "benign_04",
        "label": "benign",
        "bucket": "electricity_bill",
        "transcript": (
            "Dear customer, your electricity bill for March is 2340 rupees. "
            "Please pay before the 15th to avoid late fees. You can pay via UPI or net banking."
        ),
    },
    {
        "id": "benign_05",
        "label": "benign",
        "bucket": "insurance_renewal",
        "transcript": (
            "This is calling from LIC regarding your life insurance policy maturing next year. "
            "We would like to discuss renewal options. Is this a good time to talk?"
        ),
    },
    {
        "id": "benign_06",
        "label": "benign",
        "bucket": "school_call",
        "transcript": (
            "This is St. Mary's School calling. Your child Aryan scored 92% in the midterm. "
            "Congratulations! The parent-teacher meeting is scheduled for Friday."
        ),
    },
]

HARD_NEGATIVE_TRANSCRIPTS = [
    {
        "id": "hardneg_01",
        "label": "benign",
        "bucket": "rbi_mention_legit",
        "transcript": (
            "The RBI has issued new guidelines on UPI transactions. Please update your "
            "banking app to the latest version for compliance. For details visit rbi.org.in."
        ),
    },
    {
        "id": "hardneg_02",
        "label": "benign",
        "bucket": "police_lost_property",
        "transcript": (
            "This is the local police station. You filed a lost property report yesterday. "
            "We found your wallet. Please come to collect it with your ID proof."
        ),
    },
    {
        "id": "hardneg_03",
        "label": "benign",
        "bucket": "court_jury_summons",
        "transcript": (
            "You have been summoned for jury duty at the district court on Monday. "
            "Please bring your ID and report to room 12 by 10 AM."
        ),
    },
    {
        "id": "hardneg_04",
        "label": "benign",
        "bucket": "otp_for_own_transaction",
        "transcript": (
            "Your OTP for the transaction of 499 rupees at Amazon is 837214. "
            "Do not share this OTP with anyone. Valid for 10 minutes."
        ),
    },
    {
        "id": "hardneg_05",
        "label": "benign",
        "bucket": "upi_self_transfer",
        "transcript": (
            "You have received 2000 rupees via UPI from your friend Vikram. "
            "Your current balance is 15,430 rupees. Thank you for using our banking service."
        ),
    },
]

ALL_TRANSCRIPTS = SCAM_TRANSCRIPTS + BENIGN_TRANSCRIPTS + HARD_NEGATIVE_TRANSCRIPTS


def evaluate_transcript(entry: dict, use_llm: bool = True) -> dict:
    rule_result = check_rules(entry["transcript"])

    llm_result = None
    if use_llm:
        try:
            llm_result = analyze_with_llm(entry["transcript"])
            if llm_result.get("plain_language_reason", "").startswith("LLM analysis unavailable"):
                llm_result = None
        except Exception:
            llm_result = None

    fused = fuse_results(rule_result, llm_result)

    predicted_positive = fused["risk_label"] in ("SUSPICIOUS", "CRITICAL")
    actual_positive = entry["label"] == "scam"

    return {
        "id": entry["id"],
        "bucket": entry["bucket"],
        "label": entry["label"],
        "risk_label": fused["risk_label"],
        "risk_level": fused["db_risk_level"],
        "risk_score": fused["risk_score"],
        "mode": fused["mode"],
        "rules_fired": rule_result["rules_fired"],
        "predicted_positive": predicted_positive,
        "actual_positive": actual_positive,
    }


def compute_metrics(results: list) -> dict:
    tp = sum(1 for r in results if r["predicted_positive"] and r["actual_positive"])
    fp = sum(1 for r in results if r["predicted_positive"] and not r["actual_positive"])
    fn = sum(1 for r in results if not r["predicted_positive"] and r["actual_positive"])
    tn = sum(1 for r in results if not r["predicted_positive"] and not r["actual_positive"])

    scam_total = sum(1 for r in results if r["actual_positive"])
    benign_total = sum(1 for r in results if not r["actual_positive"])

    scam_recall = tp / scam_total if scam_total > 0 else 0.0
    benign_fpr = fp / benign_total if benign_total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    f1 = (2 * precision * scam_recall / (precision + scam_recall)) if (precision + scam_recall) > 0 else 0.0

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "scam_recall": scam_recall,
        "benign_fpr": benign_fpr,
        "precision": precision,
        "f1": f1,
    }


def run_evaluation(use_llm: bool = True):
    mode_str = "FULL (LLM + Rules)" if use_llm else "OFFLINE (Rules only)"
    print(f"\n{'='*70}")
    print(f"  PRAHARI Prompt 2 Evaluation - Mode: {mode_str}")
    print(f"{'='*70}\n")

    results = [evaluate_transcript(t, use_llm=use_llm) for t in ALL_TRANSCRIPTS]

    for r in results:
        status = "PASS" if (
            (r["actual_positive"] and r["predicted_positive"]) or
            (not r["actual_positive"] and not r["predicted_positive"])
        ) else "FAIL"
        print(f"  [{status}] {r['id']:15s} | bucket={r['bucket']:25s} | "
              f"true={r['label']:7s} | pred={r['risk_label']:12s} | "
              f"score={r['risk_score']:3d} | rules={r['rules_fired']}")

    print(f"\n{'-'*70}")
    metrics = compute_metrics(results)
    print(f"  True Positives:  {metrics['tp']}")
    print(f"  False Positives: {metrics['fp']}")
    print(f"  False Negatives: {metrics['fn']}")
    print(f"  True Negatives:  {metrics['tn']}")
    print(f"\n  Scam Recall:     {metrics['scam_recall']:.2%}")
    print(f"  Benign FPR:      {metrics['benign_fpr']:.2%}")
    print(f"  Precision:       {metrics['precision']:.2%}")
    print(f"  F1 Score:        {metrics['f1']:.2%}")

    print(f"\n{'-'*70}")
    print("  Per-Bucket Breakdown:")
    buckets = {}
    for r in results:
        b = r["bucket"]
        if b not in buckets:
            buckets[b] = {"correct": 0, "total": 0, "results": []}
        buckets[b]["total"] += 1
        is_correct = (r["actual_positive"] and r["predicted_positive"]) or \
                     (not r["actual_positive"] and not r["predicted_positive"])
        if is_correct:
            buckets[b]["correct"] += 1
        buckets[b]["results"].append(r)

    for bname, bdata in buckets.items():
        acc = bdata["correct"] / bdata["total"] if bdata["total"] > 0 else 0
        print(f"    {bname:30s} | {bdata['correct']}/{bdata['total']} correct ({acc:.0%})")

    print(f"\n{'-'*70}")

    scam_results = [r for r in results if r["actual_positive"]]
    benign_results = [r for r in results if not r["actual_positive"]]
    hardneg_results = [r for r in results if r["id"].startswith("hardneg")]

    scam_detected = sum(1 for r in scam_results if r["predicted_positive"])
    benign_flagged = sum(1 for r in benign_results if r["predicted_positive"])
    hardneg_flagged = sum(1 for r in hardneg_results if r["predicted_positive"])

    print(f"\n  Summary:")
    print(f"    Scam transcripts detected:    {scam_detected}/{len(scam_results)}")
    print(f"    Benign flagged as scam:       {benign_flagged}/{len(benign_results)}")
    print(f"    Hard negatives flagged:       {hardneg_flagged}/{len(hardneg_results)}")
    print(f"\n{'='*70}\n")

    return metrics


def test_offline_fallback():
    print(f"\n{'='*70}")
    print("  OFFLINE FALLBACK MODE TEST")
    print(f"{'='*70}\n")

    os.environ["DISABLE_LLM"] = "true"

    import importlib
    import app.llm_classifier as llm_mod
    llm_mod.DISABLE_LLM = True

    test_entry = {
        "id": "offline_test_01",
        "label": "scam",
        "bucket": "digital_arrest_full",
        "transcript": (
            "This is Officer from CBI. Your Aadhaar is linked to drugs parcel. "
            "Transfer 2 lakh to safe account. Don't tell anyone. Stay on video call. "
            "FIR filed, case number CBI-2024-123. You will be arrested within 2 hours."
        ),
    }

    result = evaluate_transcript(test_entry, use_llm=False)
    print(f"  Result:  risk_label={result['risk_label']}  risk_level={result['risk_level']}  "
          f"mode={result['mode']}  rules_fired={result['rules_fired']}")

    assert result["mode"] == "offline_safety_analysis", "Mode should be offline_safety_analysis"
    assert result["predicted_positive"], "Scam should still be detected offline"
    print("  PASS: Offline fallback produces valid results without LLM")
    print("  PASS: Scam detection works in offline mode")
    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    use_llm = os.getenv("DISABLE_LLM", "false").lower() not in ("true", "1", "yes")

    run_evaluation(use_llm=use_llm)
    test_offline_fallback()

    print("All evaluation tests complete.")
