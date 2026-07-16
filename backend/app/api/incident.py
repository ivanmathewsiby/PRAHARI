from fastapi import APIRouter
from app.schemas.incident import IncidentCreate

router = APIRouter()

fake_db = []

@router.post("/incidents")
def create_incident(data: IncidentCreate):
    fake_db.append(data)
    return {
        "message": "Incident created successfully"
    }

@router.get("/incidents")
def get_incidents():
    return fake_db