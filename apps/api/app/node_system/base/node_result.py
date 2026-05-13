from typing import Any

from pydantic import BaseModel, Field


class NodeResult(BaseModel):
    success: bool
    output_data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    logs: list[str] = Field(default_factory=list)
