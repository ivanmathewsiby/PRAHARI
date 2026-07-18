from app.repositories.incident_repository import IncidentRepository


class IncidentService:

    @staticmethod
    def create_incident(db, data):
        return IncidentRepository.create(db, data)

    @staticmethod
    def get_incidents(db):
        return IncidentRepository.get_all(db)

    @staticmethod
    def get_incident(db, incident_id):
        return IncidentRepository.get_by_id(db, incident_id)

    @staticmethod
    def update_incident(db, incident, data):
        return IncidentRepository.update(db, incident, data)

    @staticmethod
    def delete_incident(db, incident):
        IncidentRepository.delete(db, incident)