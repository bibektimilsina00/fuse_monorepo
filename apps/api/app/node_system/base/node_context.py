from typing import Any, Optional
import httpx
from pydantic import BaseModel, Field


class NodeContext(BaseModel):
    execution_id: str
    workflow_id: str
    node_id: str
    variables: dict[str, Any] = Field(default_factory=dict)
    credentials: dict[str, Any] = Field(default_factory=dict)
    http_client: Optional[httpx.AsyncClient] = None

    class Config:
        arbitrary_types_allowed = True
