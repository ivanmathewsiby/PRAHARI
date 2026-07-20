import os
import re
import logging

logger = logging.getLogger(__name__)

DISABLE_LLM = os.getenv("DISABLE_LLM", "false").lower() in ("true", "1", "yes")

_claude_client = None
_claude_available = False

if not DISABLE_LLM:
    try:
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if api_key:
            _claude_client = anthropic.Anthropic(api_key=api_key)
            _claude_available = True
            logger.info("Anthropic Claude client initialized successfully")
        else:
            logger.info("ANTHROPIC_API_KEY not set, LLM classifier will use offline fallback")
    except ImportError:
        logger.info("anthropic package not installed, LLM classifier will use offline fallback")

SYSTEM_PROMPT = """You are a scam detection classifier for Indian digital arrest / cyber fraud calls.
Analyze the following transcript and return a JSON object with these fields:

- phases_detected: list of scam phase labels found (e.g., "authority_introduction", "fear_creation", "isolation", "payment_demand", "credential_harvest")
- highest_phase: highest numbered phase detected (1-5 scale)
- confidence: float 0.0-1.0 of your detection confidence
- claimed_agency: string name of agency impersonated, or null
- payment_requested: boolean
- isolation_detected: boolean
- entities: object with phone_numbers (list), upi_ids (list), bank_accounts (list), amount_inr (float or null)
- evidence_spans: list of short quoted spans from the transcript that support your findings
- plain_language_reason: 1-2 sentence explanation

Return ONLY valid JSON, no markdown fences."""

PHONE_RE = re.compile(r"(?:\+91[\s-]?)?\d{10}")
UPI_RE = re.compile(r"[\w.\-]+@[\w]+")
BANK_RE = re.compile(r"\b\d{9,18}\b")
AMOUNT_RE = re.compile(r"(?:rs\.?|inr|rupees)[\s.]*(\d[\d,]*(?:\.\d+)?)", re.IGNORECASE)


def _extract_entities_fallback(transcript: str) -> dict:
    phones = list(set(PHONE_RE.findall(transcript)))
    upis = list(set(UPI_RE.findall(transcript)))
    banks = list(set(BANK_RE.findall(transcript)))
    amt_match = AMOUNT_RE.search(transcript)
    amount = None
    if amt_match:
        try:
            amount = float(amt_match.group(1).replace(",", ""))
        except (ValueError, IndexError):
            pass
    return {
        "phone_numbers": phones,
        "upi_ids": upis,
        "bank_accounts": banks,
        "amount_inr": amount,
    }


def _build_empty_result(transcript: str) -> dict:
    return {
        "phases_detected": [],
        "highest_phase": 0,
        "confidence": 0.0,
        "claimed_agency": None,
        "payment_requested": False,
        "isolation_detected": False,
        "entities": _extract_entities_fallback(transcript),
        "evidence_spans": [],
        "plain_language_reason": "LLM analysis unavailable; using offline rules-only mode.",
    }


def _parse_llm_response(raw: str) -> dict:
    import json
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines)
    try:
        data = json.loads(cleaned)
    except Exception:
        return _build_empty_result("")

    result = _build_empty_result("")
    result["phases_detected"] = data.get("phases_detected", [])
    result["highest_phase"] = data.get("highest_phase", 0)
    result["confidence"] = float(data.get("confidence", 0.0))
    result["claimed_agency"] = data.get("claimed_agency")
    result["payment_requested"] = bool(data.get("payment_requested", False))
    result["isolation_detected"] = bool(data.get("isolation_detected", False))
    result["evidence_spans"] = data.get("evidence_spans", [])
    result["plain_language_reason"] = data.get("plain_language_reason", "")

    ent = data.get("entities", {})
    fb_entities = _extract_entities_fallback("")
    result["entities"] = {
        "phone_numbers": ent.get("phone_numbers", fb_entities["phone_numbers"]),
        "upi_ids": ent.get("upi_ids", fb_entities["upi_ids"]),
        "bank_accounts": ent.get("bank_accounts", fb_entities["bank_accounts"]),
        "amount_inr": ent.get("amount_inr", fb_entities["amount_inr"]),
    }
    return result


def analyze_with_llm(transcript: str) -> dict:
    if DISABLE_LLM or not _claude_available or _claude_client is None:
        return _build_empty_result(transcript)

    try:
        response = _claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": transcript}],
        )
        raw_text = response.content[0].text
        return _parse_llm_response(raw_text)
    except Exception as e:
        logger.warning("LLM call failed: %s - falling back to offline mode", e)
        return _build_empty_result(transcript)
