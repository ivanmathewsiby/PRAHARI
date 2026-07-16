from pydantic import BaseModel


class IncidentCreate(BaseModel):
    citizen_name: str
    phone_number: str
    transcript: str
    location: str


class IncidentResponse(BaseModel):
    incident_id: str
    risk_level: str
    status: str