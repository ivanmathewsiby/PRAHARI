from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.graph_service import GraphService

router = APIRouter(
    prefix="/api",
    tags=["Rings"],
)


@router.get("/rings")
def list_rings():
    rings = GraphService.get_rings_summary()
    return rings


@router.get("/rings/{ring_id}")
def get_ring(ring_id: str):
    detail = GraphService.get_ring_detail(ring_id)
    hubs = GraphService.get_ring_hubs(ring_id)
    graph = GraphService.get_graph_json(ring_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Ring not found")
    return {
        "ring_id": ring_id,
        "reports": detail,
        "top_hubs": hubs,
        "graph": graph,
    }


@router.get("/rings/{ring_id}/evidence-package")
def get_evidence_package(ring_id: str):
    pkg = GraphService.get_evidence_package(ring_id)
    if not pkg or not pkg.get("reports"):
        raise HTTPException(status_code=404, detail="Ring not found")
    return pkg


@router.get("/rings/{ring_id}/graph")
def get_ring_graph(ring_id: str):
    graph = GraphService.get_graph_json(ring_id)
    if not graph["nodes"]:
        raise HTTPException(status_code=404, detail="Ring not found")
    return graph


@router.post("/graph/ingest")
def ingest_all(db: Session = Depends(get_db)):
    result = GraphService.ingest_all_incidents(db)
    return result


@router.post("/graph/init")
def init_schema():
    result = GraphService.initialize()
    return result


@router.post("/graph/clear")
def clear_graph():
    result = GraphService.clear_graph()
    return result
