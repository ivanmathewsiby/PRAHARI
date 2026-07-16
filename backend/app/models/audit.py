from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)

    incident_id = Column(String)

    action = Column(String)

    performed_by = Column(String)

    timestamp = Column(DateTime, default=datetime.utcnow)