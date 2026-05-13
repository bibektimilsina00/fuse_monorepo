from typing import Any

from pydantic import BaseModel, Field


class NodeContext(BaseModel):
    execution_id: str
    workflow_id: str
    node_id: str
    variables: dict[str, Any] = Field(default_factory=dict)
    credentials: dict[str, Any] = Field(default_factory=dict)
