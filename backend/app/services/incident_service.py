from app.repositories.incident_repository import IncidentRepository
from app.models.audit import AuditLog
from app.services.graph_service import GraphService
from app.models.incident import IncidentEvent
from datetime import datetime


class IncidentService:

    @staticmethod
    def create_incident(db, data):
        return IncidentRepository.create(db, data)

    @staticmethod
    def get_incidents(db):
        IncidentService.purge_expired(db)
        return IncidentRepository.get_all(db)

    @staticmethod
    def get_incident(db, incident_id):
        IncidentService.purge_expired(db)
        return IncidentRepository.get_by_id(db, incident_id)

    @staticmethod
    def purge_expired(db):
        expired = (
            db.query(IncidentEvent)
            .filter(
                IncidentEvent.expires_at.is_not(None),
                IncidentEvent.expires_at <= datetime.utcnow(),
            )
            .all()
        )
        for incident in expired:
            IncidentService.delete_incident(db, incident)
        return len(expired)

    @staticmethod
    def update_incident(db, incident, data):
        return IncidentRepository.update(db, incident, data)

    @staticmethod
    def delete_incident(db, incident):
        incident_id = incident.incident_id
        db.query(AuditLog).filter(AuditLog.incident_id == incident_id).delete(
            synchronize_session=False
        )
        IncidentRepository.delete(db, incident)
        try:
            GraphService.delete_incident(incident_id)
        except Exception:
            # Database deletion remains authoritative when Neo4j is unavailable.
            pass
