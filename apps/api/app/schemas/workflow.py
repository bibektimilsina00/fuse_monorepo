from datetime import datetime
from typing import Any

from pydantic import UUID4, BaseModel


class WorkflowBase(BaseModel):
    name: str
    description: str | None = None
    graph: dict[str, Any]


class WorkflowCreate(WorkflowBase):
    pass


class WorkflowOut(WorkflowBase):
    id: UUID4
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
