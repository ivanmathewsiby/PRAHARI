from app.repositories.audit_repository import AuditRepository


class AuditService:

    @staticmethod
    def create_audit(db, data):
        return AuditRepository.create(db, data)

    @staticmethod
    def get_audits(db):
        return AuditRepository.get_all(db)