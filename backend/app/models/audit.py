from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    incident_id = Column(String, index=True)

    action = Column(String)

    rule_hits = Column(JSON)

    model_version = Column(String)

    prompt_version = Column(String)

    score_components = Column(JSON)

    threshold_version = Column(String)

    created_at = Column(DateTime, default=datetime.utcnow)