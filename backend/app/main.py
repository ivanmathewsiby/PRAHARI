from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.incident import router as incident_router
from app.api.audit import router as audit_router

app = FastAPI(
    title="PRAHARI Backend",
    version="1.0.0",
    description="Fraud Intelligence Platform Backend"
)

app.include_router(health_router)
app.include_router(incident_router)
app.include_router(audit_router)


@app.get("/")
def root():
    return {"message": "Welcome to PRAHARI Backend"}