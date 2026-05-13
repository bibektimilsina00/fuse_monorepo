import uuid
from datetime import datetime

from pydantic import BaseModel


class ExecutionLogOut(BaseModel):
    id: uuid.UUID
    node_id: str | None
    level: str
    message: str
    payload: dict | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class ExecutionOut(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    trigger_type: str
    input_data: dict | None
    output_data: dict | None
    started_at: datetime | None
    finished_at: datetime | None
    logs: list[ExecutionLogOut] = []

    model_config = {"from_attributes": True}


class ExecutionCreate(BaseModel):
    trigger_type: str = "manual"
    input_data: dict | None = None
