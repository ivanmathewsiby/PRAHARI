from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime

from app.core.database import Base


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    id = Column(Integer, primary_key=True, index=True)

    incident_id = Column(String, unique=True)

    citizen_name = Column(String)

    phone_number = Column(String)

    transcript = Column(String)

    location = Column(String)

    fraud_type = Column(String)

    risk_level = Column(String)

    status = Column(String)

    consent_status = Column(String, default="NOT_REQUESTED")

    consent_scope = Column(String, default="LOCAL_ONLY")

    local_only = Column(Boolean, default=True)

    redaction_summary = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)
