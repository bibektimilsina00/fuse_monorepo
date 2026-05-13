from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class NodeContext(BaseModel):
    execution_id: str
    workflow_id: str
    node_id: str
    variables: Dict[str, Any] = Field(default_factory=dict)
    credentials: Dict[str, Any] = Field(default_factory=dict)

class NodeResult(BaseModel):
    success: bool
    output_data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    logs: List[str] = Field(default_factory=list)

class ExecutionContract(ABC):
    @abstractmethod
    async def execute(self, input_data: Dict[str, Any], context: NodeContext) -> NodeResult:
        pass
