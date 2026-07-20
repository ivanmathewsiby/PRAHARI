import re
from typing import Dict, List, Tuple

AUTHORITY_PATTERNS = [
    r"\bCBI\b",
    r"\bED\b",
    r"\bEnforcement Directorate\b",
    r"\bCustoms\b",
    r"\bRBI\b",
    r"\bReserve Bank of India\b",
    r"\bTRAI\b",
    r"\bpolice\b",
    r"\bcyber cell\b",
    r"\bInterpol\b",
    r"\bjudge\b",
    r"\bSuperintendent of Police\b",
    r"\bCommissioner\b",
    r"सीबीआई|ईडी|पुलिस|कस्टम्स|आरबीआई|अधिकारी",
]

ISOLATION_PATTERNS = [
    r"don'?t tell anyone",
    r"do not tell anyone",
    r"don'?t inform (?:your )?family",
    r"do not inform (?:your )?family",
    r"keep this secret",
    r"stay on (?:the )?video call",
    r"do not disconnect",
    r"remain isolated",
    r"don'?t hang up",
    r"do not hang up",
    r"don'?t end the call",
    r"stay on the line",
    r"don'?t talk to anyone",
    r"don'?t share this with anyone",
    r"किसी को मत बताना|परिवार को मत बताना|फोन मत काटना|कॉल पर रहो",
    r"kisi ko mat bata(?:na|o)|family ko mat bata(?:na|o)|phone mat kaat(?:na|o)|call par raho",
]

PAYMENT_PATTERNS = [
    r"transfer money",
    r"send money",
    r"safe account",
    r"verification amount",
    r"verification fee",
    r"\bUPI\b",
    r"bank account",
    r"crypto",
    r"cryptocurrency",
    r"Bitcoin",
    r"\bOTP\b",
    r"card details",
    r"credit card",
    r"debit card",
    r"CVV",
    r"account number",
    r"IFSC",
    r"NEFT",
    r"RTGS",
    r"wire transfer",
    r"deposit(?:ed)?",
    r"pay(?:ment)? (?:of )?(?:rs\.?|inr|rupees)",
    r"पैसे ट्रांसफर|रुपये भेजो|सुरक्षित खात(?:ा|े)|सत्यापन शुल्क|यूपीआई|ओटीपी",
    r"paise transfer|rupaye bhejo|safe khaate?|verification ke liye paisa",
]

FABRICATED_LEGAL_PATTERNS = [
    r"\bFIR\b",
    r"\bwarrant\b",
    r"court order",
    r"case number",
    r"legal notice",
    r"narcotics parcel",
    r"customs seizure",
    r"arrest warrant",
    r"non[- ]?bailable warrant",
    r"summons",
    r"subpoena",
    r"एफआईआर|वारंट|अदालत का आदेश|केस नंबर",
    r"giraftari warrant|case number",
]

URGENCY_THREAT_PATTERNS = [
    r"\barrest\b",
    r"\bjail\b",
    r"immediate action",
    r"suspend SIM",
    r"freeze(?:d)? (?:your )?account",
    r"within \d+ hours?",
    r"within \d+ minutes?",
    r"right now",
    r"immediately",
    r"last warning",
    r"final warning",
    r"or else",
    r"consequences",
    r"गिरफ्तार|जेल|तुरंत|अभी|खाता फ्रीज",
    r"giraftar|turant|abhi|khata freeze",
]


def _match_category(text: str, patterns: List[str]) -> Tuple[bool, List[str]]:
    found = []
    for pat in patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        found.extend(matches)
    return len(found) > 0, found


def check_rules(transcript: str) -> dict:
    t = transcript or ""

    authority_hit, authority_matches = _match_category(t, AUTHORITY_PATTERNS)
    isolation_hit, isolation_matches = _match_category(t, ISOLATION_PATTERNS)
    payment_hit, payment_matches = _match_category(t, PAYMENT_PATTERNS)
    legal_hit, legal_matches = _match_category(t, FABRICATED_LEGAL_PATTERNS)
    urgency_hit, urgency_matches = _match_category(t, URGENCY_THREAT_PATTERNS)

    rules_fired: List[str] = []
    if authority_hit:
        rules_fired.append("authority_impersonation")
    if isolation_hit:
        rules_fired.append("isolation_language")
    if payment_hit:
        rules_fired.append("payment_request")
    if legal_hit:
        rules_fired.append("fabricated_legal_language")
    if urgency_hit:
        rules_fired.append("urgency_threat")

    matches: Dict[str, list] = {}
    if authority_hit:
        matches["authority_impersonation"] = authority_matches
    if isolation_hit:
        matches["isolation_language"] = isolation_matches
    if payment_hit:
        matches["payment_request"] = payment_matches
    if legal_hit:
        matches["fabricated_legal_language"] = legal_matches
    if urgency_hit:
        matches["urgency_threat"] = urgency_matches

    num_categories = len(rules_fired)

    score = 0
    if authority_hit:
        score += 15
    if isolation_hit:
        score += 15
    if payment_hit:
        score += 15
    if legal_hit:
        score += 15
    if urgency_hit:
        score += 10

    combos = sum([
        authority_hit and isolation_hit and payment_hit,
        legal_hit and payment_hit,
        legal_hit and authority_hit,
        authority_hit and payment_hit and urgency_hit,
        isolation_hit and payment_hit and urgency_hit,
    ])
    score += combos * 20

    if num_categories >= 4:
        score += 15
    elif num_categories == 3:
        score += 10
    elif num_categories == 2:
        score += 5

    score = max(0, min(100, score))

    if (authority_hit and isolation_hit and payment_hit) or (legal_hit and payment_hit):
        recommended_risk = "HIGH"
    elif num_categories >= 3 or (num_categories >= 2 and score >= 60):
        recommended_risk = "HIGH"
    elif num_categories >= 2 or score >= 40:
        recommended_risk = "MEDIUM"
    else:
        recommended_risk = "LOW"

    return {
        "score": score,
        "rules_fired": rules_fired,
        "matches": matches,
        "recommended_risk": recommended_risk,
    }
