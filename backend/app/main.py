from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.incident import router as incident_router
from app.api.audit import router as audit_router
from app.api.dashboard import router as dashboard_router
from app.api.rings import router as rings_router
from app.api.analyze import router as analyze_router

app = FastAPI(
    title="PRAHARI Backend",
    version="1.0.0",
    description="Fraud Intelligence Platform Backend"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API routers
app.include_router(health_router)
app.include_router(incident_router)
app.include_router(audit_router)
app.include_router(dashboard_router)
app.include_router(rings_router)
app.include_router(analyze_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to PRAHARI Backend"
    }
