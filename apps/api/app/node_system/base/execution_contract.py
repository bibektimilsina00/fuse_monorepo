from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class NodeContext(BaseModel):
    execution_id: str
    workflow_id: str
    node_id: str
    variables: dict[str, Any] = Field(default_factory=dict)
    credentials: dict[str, Any] = Field(default_factory=dict)


class NodeResult(BaseModel):
    success: bool
    output_data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    logs: list[str] = Field(default_factory=list)


class ExecutionContract(ABC):
    @abstractmethod
    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        pass
