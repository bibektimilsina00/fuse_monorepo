from typing import Any

from pydantic import BaseModel


class NodeMetadata(BaseModel):
    type: str
    name: str
    category: str
    description: str
    properties: list[dict[str, Any]]
    inputs: int
    outputs: int
    credential_type: str | None = None
