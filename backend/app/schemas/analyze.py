from datetime import datetime
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


class AnalyzeStartRequest(BaseModel):
    citizen_name: Optional[str] = None
    phone_number: Optional[str] = None
    caller_phone_number: Optional[str] = None
    language: str = "en-IN"
    source_channel: Literal["citizen_web", "telephony_sip", "telephony_pstn"] = "citizen_web"
    consent_status: Literal["GRANTED"]
    consent_scope: Literal[
        "selected_evidence",
        "redacted_transcript",
        "full_transcript",
    ]
    redaction_summary: Optional[str] = None
    retention_days: Literal[1, 7, 30] = 7


class AnalyzeStartResponse(BaseModel):
    session_id: str
    expires_at: datetime


class AnalyzeChunkRequest(BaseModel):
    transcript_chunk: str = Field(min_length=1)
    is_final: bool


class AnalyzeChunkResponse(BaseModel):
    session_id: str
    mode: str
    phases_detected: list[str]
    highest_phase: int
    risk_label: str
    risk_score: int
    rules_fired: list[str]
    evidence_spans: list[str]
    entities: dict
    has_new_signal: bool
    accumulated_length: int
    is_complete: bool
    incident_id: Optional[str] = None
    persisted: Optional[bool] = None
    graph_synced: Optional[bool] = None
    ring_id: Optional[str] = None
    recommended_action: Optional[str] = None
    matches: Optional[dict] = None
    plain_language_reason: Optional[str] = None
    consent_scope: Optional[str] = None
    retention_days: Optional[int] = None
    expires_at: Optional[str] = None
    risk_level: Optional[str] = None
