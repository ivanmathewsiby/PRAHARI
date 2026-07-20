from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services.incident_service import IncidentService
from app.core.database import SessionLocal

router = APIRouter(
    prefix="/api",
    tags=["Incidents"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/incidents")
def create_incident(
    data: IncidentCreate,
    db: Session = Depends(get_db)
):
    return IncidentService.create_incident(db, data)


@router.get("/incidents")
def get_incidents(
    db: Session = Depends(get_db)
):
    return IncidentService.get_incidents(db)


@router.get("/incidents/{incident_id}")
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db)
):
    incident = IncidentService.get_incident(db, incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    return incident


@router.put("/incidents/{incident_id}")
def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    db: Session = Depends(get_db)
):
    incident = IncidentService.get_incident(db, incident_id)

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    return IncidentService.update_incident(db, incident, data)


@router.delete("/incidents/{incident_id}")
def delete_incident(
    incident_id: str,
    db: Session = Depends(get_db)
):
    incident = IncidentService.get_incident(
        db,
        incident_id
    )

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    IncidentService.delete_incident(
        db,
        incident
    )

    return {
        "message": "Incident deleted successfully"
    }