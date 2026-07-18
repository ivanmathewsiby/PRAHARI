from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class IncidentCreate(BaseModel):
    citizen_name: str
    phone_number: str
    transcript: str
    location: str


class IncidentUpdate(BaseModel):
    fraud_type: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None


class IncidentResponse(BaseModel):
    incident_id: str
    citizen_name: str
    phone_number: str
    transcript: str
    location: str
    fraud_type: str
    risk_level: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True