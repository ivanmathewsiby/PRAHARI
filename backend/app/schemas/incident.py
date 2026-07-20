from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class IncidentCreate(BaseModel):
    citizen_name: str
    phone_number: str
    transcript: str
    location: str
    consent_status: Optional[str] = "NOT_REQUESTED"
    consent_scope: Optional[str] = "LOCAL_ONLY"
    local_only: Optional[bool] = True
    redaction_summary: Optional[str] = None


class IncidentUpdate(BaseModel):
    fraud_type: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    consent_status: Optional[str] = None
    consent_scope: Optional[str] = None
    local_only: Optional[bool] = None
    redaction_summary: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: str
    citizen_name: str
    phone_number: str
    transcript: str
    location: str
    fraud_type: str
    risk_level: str
    status: str
    consent_status: Optional[str] = None
    consent_scope: Optional[str] = None
    local_only: Optional[bool] = None
    redaction_summary: Optional[str] = None
    retention_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
