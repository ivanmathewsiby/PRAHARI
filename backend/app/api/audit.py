from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.schemas.audit import AuditCreate
from app.services.audit_service import AuditService

router = APIRouter(
    prefix="/api",
    tags=["Audit"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/audit")
def create_audit(
    data: AuditCreate,
    db: Session = Depends(get_db)
):
    return AuditService.create_audit(db, data)


@router.get("/audit")
def get_audits(
    db: Session = Depends(get_db)
):
    return AuditService.get_audits(db)