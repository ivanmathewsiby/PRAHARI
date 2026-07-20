from typing import Optional


_RISK_MAP = {
    "SAFE": "LOW",
    "SUSPICIOUS": "MEDIUM",
    "CRITICAL": "HIGH",
}


def fuse_results(rule_result: dict, llm_result: Optional[dict] = None) -> dict:
    rules_fired = rule_result.get("rules_fired", [])
    rule_score = rule_result.get("score", 0)
    has_authority = "authority_impersonation" in rules_fired
    has_isolation = "isolation_language" in rules_fired
    has_payment = "payment_request" in rules_fired
    has_legal = "fabricated_legal_language" in rules_fired
    has_urgency = "urgency_threat" in rules_fired

    llm_confidence = 0.0
    llm_phases = []
    llm_highest_phase = 0
    llm_payment = False
    llm_isolation = False
    llm_mode = "offline_safety_analysis"

    if llm_result is not None:
        llm_mode = "full_analysis"
        llm_confidence = llm_result.get("confidence", 0.0)
        llm_phases = llm_result.get("phases_detected", [])
        llm_highest_phase = llm_result.get("highest_phase", 0)
        llm_payment = llm_result.get("payment_requested", False)
        llm_isolation = llm_result.get("isolation_detected", False)

    if has_authority and has_isolation and has_payment:
        risk_label = "CRITICAL"
    elif has_legal and (has_payment or _has_safe_account(rule_result)):
        risk_label = "CRITICAL"
    else:
        combined_score = rule_score

        if llm_result is not None:
            llm_component = llm_confidence * 40
            combined_score += llm_component

            phase_bonus = min(llm_highest_phase * 8, 30)
            combined_score += phase_bonus

            if llm_payment and has_payment:
                combined_score += 10
            if llm_isolation and has_isolation:
                combined_score += 10

        combined_score = max(0, min(100, combined_score))

        if combined_score >= 70:
            risk_label = "CRITICAL"
        elif combined_score >= 40:
            risk_label = "SUSPICIOUS"
        else:
            risk_label = "SAFE"

    if risk_label == "CRITICAL" and not (has_authority or has_legal):
        if rule_score < 50 and (llm_result is None or llm_confidence < 0.7):
            risk_label = "SUSPICIOUS"

    db_risk_level = _RISK_MAP[risk_label]

    final_score = rule_score
    if llm_result is not None:
        final_score = int(rule_score * 0.5 + (llm_confidence * 100) * 0.3 + llm_highest_phase * 20 * 0.2)
        final_score = max(0, min(100, final_score))

    if risk_label == "CRITICAL":
        recommended_action = "IMMEDIATE Escalation: Contact citizen, warn about active scam, block suspected numbers, raise to fraud investigation team"
    elif risk_label == "SUSPICIOUS":
        recommended_action = "Review: Flag for analyst review, send SMS/WhatsApp warning to citizen, monitor for further activity"
    else:
        recommended_action = "Monitor: Log for pattern analysis, no immediate action required"

    return {
        "risk_label": risk_label,
        "db_risk_level": db_risk_level,
        "risk_score": final_score,
        "recommended_action": recommended_action,
        "mode": llm_mode,
    }


def _has_safe_account(rule_result: dict) -> bool:
    matches = rule_result.get("matches", {})
    payment_matches = matches.get("payment_request", [])
    for m in payment_matches:
        if "safe account" in m.lower():
            return True
    return False
