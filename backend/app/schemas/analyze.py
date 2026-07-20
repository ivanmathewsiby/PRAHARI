from typing import Literal, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    transcript: str = Field(min_length=1, max_length=50_000)
    citizen_name: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    language: str = "en-IN"
    source_channel: str = "citizen_web"
    consent_status: Literal["GRANTED"]
    consent_scope: Literal[
        "selected_evidence",
        "redacted_transcript",
        "full_transcript",
    ]
    redaction_summary: Optional[str] = None
    retention_days: Literal[1, 7, 30] = 7


class AnalyzeResponse(BaseModel):
    incident_id: Optional[str] = None
    persisted: bool
    graph_synced: bool
    ring_id: Optional[str] = None
    risk_label: str
    risk_level: str
    risk_score: int
    recommended_action: str
    mode: str
    rules_fired: list[str]
    matches: dict
    phases_detected: list[str]
    evidence_spans: list[str]
    entities: dict
    plain_language_reason: str
    consent_scope: str
    retention_days: Optional[int] = None
    expires_at: Optional[str] = None
