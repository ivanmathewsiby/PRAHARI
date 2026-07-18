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

        incident.fraud_type = data.fraud_type
        incident.risk_level = data.risk_level
        incident.status = data.status

        db.commit()
        db.refresh(incident)

        return incident

    @staticmethod
    def delete(db: Session, incident):

        db.delete(incident)
        db.commit()