from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any


class AuditCreate(BaseModel):
    incident_id: str
    action: str
    rule_hits: List[str]
    model_version: str
    prompt_version: str
    score_components: Dict[str, Any]
    threshold_version: str


class AuditResponse(BaseModel):
    id: int
    incident_id: str
    action: str
    rule_hits: List[str]
    model_version: str
    prompt_version: str
    score_components: Dict[str, Any]
    threshold_version: str
    created_at: datetime

    class Config:
        from_attributes = True