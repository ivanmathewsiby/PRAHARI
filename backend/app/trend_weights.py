"""Trend-informed rule weight configuration for the deterministic scoring engine.

This layer allows conservative multipliers to be applied to rule family base
scores. The intent is to gently reflect general awareness of publicly reported
cybercrime patterns without hardcoding exact statistics or altering the
original scoring structure.

Informed by awareness of NCRB/NCRP cybercrime reporting (general trends, not
specific figures). This is not a live feed, not a government API integration,
and not an opaque heuristic — every multiplier is explicit, bounded, and
reviewable.

Usage:
    from app.trend_weights import get_effective_weight

    score += get_effective_weight(15, "Authority")

Rule families:
    - urgency_threat / Hook
    - authority_impersonation / Authority
    - fabricated_legal_language / Fabricated Evidence
    - isolation_language / Isolation
    - payment_request / Drain (also covers credential-harvest signals like
      OTP, card details, CVV, since the engine groups these under Drain)
"""

from app.scam_phases import AUTHORITY, DRAIN, FABRICATED_EVIDENCE, HOOK, ISOLATION

# Trend-informed multipliers per rule family.
# Each multiplier is applied to the category's base score before summation.
# Range: 1.00 (neutral) to 1.20 (conservative ceiling).
# Values reflect general NCRB/NCRP trend awareness, not exact statistics.
TREND_MULTIPLIERS = {
    AUTHORITY: 1.08,
    FABRICATED_EVIDENCE: 1.10,
    DRAIN: 1.12,
    ISOLATION: 1.04,
    HOOK: 1.06,
}


def get_effective_weight(base_score: int, category: str) -> int:
    """Apply the trend-informed multiplier for *category* to *base_score*.

    Args:
        base_score: The base weight for the rule family (e.g. 15 for authority).
        category: One of the CANONICAL_PHASES constants.

    Returns:
        Rounded effective score after applying the configured multiplier.
        Falls back to base_score if the category has no configured multiplier.
    """
    multiplier = TREND_MULTIPLIERS.get(category, 1.0)
    return round(base_score * multiplier)
