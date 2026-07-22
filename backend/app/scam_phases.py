HOOK = "Hook"
AUTHORITY = "Authority"
FABRICATED_EVIDENCE = "Fabricated Evidence"
ISOLATION = "Isolation"
DRAIN = "Drain"

CANONICAL_PHASES = [HOOK, AUTHORITY, FABRICATED_EVIDENCE, ISOLATION, DRAIN]

LEGACY_LLM_PHASE_MAP = {
    "fear_creation": HOOK,
    "authority_introduction": AUTHORITY,
    "isolation": ISOLATION,
    "payment_demand": DRAIN,
    "credential_harvest": DRAIN,
    HOOK: HOOK,
    AUTHORITY: AUTHORITY,
    FABRICATED_EVIDENCE: FABRICATED_EVIDENCE,
    ISOLATION: ISOLATION,
    DRAIN: DRAIN,
}
