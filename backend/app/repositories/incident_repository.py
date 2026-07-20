import uuid

from sqlalchemy.orm import Session

from app.models.incident import IncidentEvent


class IncidentRepository:

    @staticmethod
    def create(db: Session, data):

        incident = IncidentEvent(
            incident_id=str(uuid.uuid4())[:8],
            citizen_name=data.citizen_name,
            phone_number=data.phone_number,
            transcript=data.transcript,
            location=data.location,
            consent_status=data.consent_status,
            consent_scope=data.consent_scope,
            local_only=data.local_only,
            redaction_summary=data.redaction_summary,
            fraud_type="Unknown",
            risk_level="PENDING",
            status="OPEN"
        )

        db.add(incident)
        db.commit()
        db.refresh(incident)

        return incident

    @staticmethod
    def get_all(db: Session):
        return db.query(IncidentEvent).all()

    @staticmethod
    def get_by_id(db: Session, incident_id: str):
        return (
            db.query(IncidentEvent)
            .filter(IncidentEvent.incident_id == incident_id)
            .first()
        )

    @staticmethod
    def update(db: Session, incident, data):

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(incident, field, value)

        db.commit()
        db.refresh(incident)

        return incident

    @staticmethod
    def delete(db: Session, incident):

        db.delete(incident)
        db.commit()
