from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.incident import IncidentEvent


class DashboardRepository:

    @staticmethod
    def get_stats(db: Session):

        total = db.query(IncidentEvent).count()

        open_cases = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.status == "OPEN")
            .count()
        )

        closed_cases = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.status == "CLOSED")
            .count()
        )

        under_review = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.status == "UNDER_REVIEW")
            .count()
        )

        high = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.risk_level.in_(["HIGH", "CRITICAL"]))
            .count()
        )

        medium = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.risk_level == "MEDIUM")
            .count()
        )

        low = (
            db.query(IncidentEvent)
            .filter(IncidentEvent.risk_level == "LOW")
            .count()
        )

        return {
            "total_incidents": total,
            "open_cases": open_cases,
            "closed_cases": closed_cases,
            "under_review": under_review,
            "high_risk": high,
            "medium_risk": medium,
            "low_risk": low,
        }

    @staticmethod
    def recent_incidents(db: Session):

        return (
            db.query(IncidentEvent)
            .order_by(IncidentEvent.created_at.desc())
            .limit(5)
            .all()
        )

    @staticmethod
    def high_risk(db: Session):

        return (
            db.query(IncidentEvent)
            .filter(IncidentEvent.risk_level.in_(["HIGH", "CRITICAL"]))
            .all()
        )

    @staticmethod
    def open_cases(db: Session):

        return (
            db.query(IncidentEvent)
            .filter(IncidentEvent.status == "OPEN")
            .all()
        )

    @staticmethod
    def analytics(db: Session):

        rows = (
            db.query(
                IncidentEvent.fraud_type,
                func.count(IncidentEvent.id)
            )
            .group_by(IncidentEvent.fraud_type)
            .all()
        )

        return {fraud: count for fraud, count in rows}
