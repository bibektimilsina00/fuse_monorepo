from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Any, Optional, List

class WorkflowBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    graph: dict[str, Any] = Field(default_factory=lambda: {"nodes": [], "edges": []})

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    graph: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None

class WorkflowOut(WorkflowBase):
    id: UUID
    user_id: UUID
    is_active: bool
    schema_version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class WorkflowList(BaseModel):
    items: List[WorkflowOut]
    total: int
