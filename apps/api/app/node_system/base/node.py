from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult


class NodeMetadata(BaseModel):
    type: str
    name: str
    category: str
    description: str
    properties: List[Dict[str, Any]]
    inputs: int
    outputs: int
    credential_type: Optional[str] = None


class BaseNode(ABC):
    def __init__(self, node_id: str, properties: Dict[str, Any]):
        self.node_id = node_id
        self.properties = properties

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> NodeMetadata:
        """Static node metadata — type, name, category, properties schema."""
        pass

    @abstractmethod
    async def execute(self, input_data: Dict[str, Any], context: NodeContext) -> NodeResult:
        """Core execution logic for the node."""
        pass
