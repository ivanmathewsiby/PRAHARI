#!/usr/bin/env python3
"""Reproducible synthetic safety benchmark for the hackathon prototype."""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rules_engine import check_rules
from app.rules_fusion import fuse_results


SCAM_TEMPLATES = {
    "en": (
        "This is {agency}. A {case} is registered against you. "
        "Do not tell anyone and stay on the call or you will be arrested immediately. "
        "[[PAYMENT]] Transfer money to {destination} for verification."
    ),
    "hi": (
        "मैं {agency} अधिकारी बोल रहा हूं। आपके नाम पर {case} दर्ज है। "
        "किसी को मत बताना और फोन मत काटना, नहीं तो तुरंत गिरफ्तार होंगे। "
        "[[PAYMENT]] सत्यापन के लिए पैसे ट्रांसफर करें {destination}।"
    ),
    "hinglish": (
        "Main {agency} officer bol raha hoon. Aapke naam par {case} hai. "
        "Kisi ko mat batana aur call par raho, warna turant giraftar honge. "
        "[[PAYMENT]] Verification ke liye paisa {destination} par transfer karo."
    ),
}

AGENCIES = ["CBI", "ED", "Customs", "cyber cell police", "RBI"]
CASES = ["FIR", "arrest warrant", "narcotics parcel case", "court order"]
DESTINATIONS = ["cbi.verify@upi", "safe account", "UPI ID", "bank account"]

SUBTLE_SCAMS = {
    "en": (
        "Your confidential verification has failed. Stay on the line while the legal team reviews it. "
        "[[PAYMENT]] Send money to {destination} to close the review."
    ),
    "hi": (
        "आपका गोपनीय सत्यापन विफल हुआ है। कानूनी समीक्षा पूरी होने तक कॉल पर रहो। "
        "[[PAYMENT]] समीक्षा बंद करने के लिए रुपये भेजो {destination}।"
    ),
    "hinglish": (
        "Aapka confidential verification fail hua hai. Legal review tak call par raho. "
        "[[PAYMENT]] Review close karne ke liye rupaye bhejo {destination}."
    ),
}

BENIGN_TEMPLATES = [
    "Your {service} appointment is confirmed for {day}. No payment or OTP is required on this call.",
    "Hi, I reached {place} safely. I will call the family after dinner.",
    "Your order is out for delivery. Please keep an ID ready; pay only in the official app.",
]

HARD_NEGATIVE_TEMPLATES = [
    "RBI published guidance about {topic}. Read it independently at rbi.org.in; nobody will request money.",
    "The local police confirmed your lost-property report. Visit the station with ID; do not pay anyone.",
    "Your OTP for your own purchase is 837214. Do not share this OTP with anyone.",
    "We discussed the court order in class. This is an academic exercise and no transfer is requested.",
    "UPI received Rs {amount} from your friend. You do not need to send money back.",
]


def build_dataset():
    rows = []
    for language, template in SCAM_TEMPLATES.items():
        for index in range(20):
            selected_template = SUBTLE_SCAMS[language] if index >= 18 else template
            rows.append({
                "id": f"scam-{language}-{index + 1:02d}",
                "label": "scam",
                "bucket": language,
                "text": selected_template.format(
                    agency=AGENCIES[index % len(AGENCIES)],
                    case=CASES[index % len(CASES)],
                    destination=DESTINATIONS[index % len(DESTINATIONS)],
                ),
            })
    for index in range(30):
        rows.append({
            "id": f"benign-{index + 1:02d}",
            "label": "benign",
            "bucket": "benign",
            "text": BENIGN_TEMPLATES[index % len(BENIGN_TEMPLATES)].format(
                service=["bank branch", "hospital", "school"][index % 3],
                day=["Monday", "Tuesday", "Friday"][index % 3],
                place=["home", "the hostel", "the office"][index % 3],
            ),
        })
    for index in range(30):
        rows.append({
            "id": f"hard-negative-{index + 1:02d}",
            "label": "benign",
            "bucket": "hard_negative",
            "text": HARD_NEGATIVE_TEMPLATES[index % len(HARD_NEGATIVE_TEMPLATES)].format(
                topic=["UPI", "KYC", "mule accounts"][index % 3],
                amount=500 + index * 25,
            ),
        })
    return rows


def predict(text):
    clean = text.replace("[[PAYMENT]]", "")
    return fuse_results(check_rules(clean), None)["risk_label"]


def evaluate(rows):
    results = []
    for row in rows:
        prediction = predict(row["text"])
        positive = prediction in {"SUSPICIOUS", "CRITICAL"}
        results.append({**row, "prediction": prediction, "positive": positive})

    scams = [row for row in results if row["label"] == "scam"]
    benign = [row for row in results if row["label"] == "benign"]
    hard_negatives = [row for row in results if row["bucket"] == "hard_negative"]
    true_positive = sum(row["positive"] for row in scams)
    false_positive = sum(row["positive"] for row in benign)
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
    recall = true_positive / len(scams)
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    before_payment = sum(
        predict(row["text"].split("[[PAYMENT]]")[0]) in {"SUSPICIOUS", "CRITICAL"}
        for row in scams
    )

    return {
        "benchmark": "PRAHARI synthetic multilingual safety benchmark",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_size": len(results),
        "composition": {"scams": len(scams), "benign": 30, "hard_negatives": len(hard_negatives)},
        "languages": ["English", "Hindi", "Hinglish"],
        "mode": "offline deterministic rules",
        "metrics": {
            "scam_recall": round(recall * 100, 1),
            "precision": round(precision * 100, 1),
            "f1": round(f1 * 100, 1),
            "benign_false_positive_rate": round(false_positive / len(benign) * 100, 1),
            "hard_negative_critical_rate": round(
                sum(row["prediction"] == "CRITICAL" for row in hard_negatives) / len(hard_negatives) * 100,
                1,
            ),
            "detected_before_payment_language": round(before_payment / len(scams) * 100, 1),
        },
        "disclosure": "Template-generated prototype benchmark; not a field or production validation set.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = evaluate(build_dataset())
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
