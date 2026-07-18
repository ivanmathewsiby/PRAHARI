from sqlalchemy.orm import Session

from app.models.audit import AuditLog


class AuditRepository:

    @staticmethod
    def create(db: Session, data):

        audit = AuditLog(
            incident_id=data.incident_id,
            action=data.action,
            rule_hits=data.rule_hits,
            model_version=data.model_version,
            prompt_version=data.prompt_version,
            score_components=data.score_components,
            threshold_version=data.threshold_version,
        )

        db.add(audit)
        db.commit()
        db.refresh(audit)

        return audit

    @staticmethod
    def get_all(db: Session):
        return db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()