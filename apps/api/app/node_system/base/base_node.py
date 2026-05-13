from abc import ABC, abstractmethod
from typing import Any

from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class BaseNode(ABC):
    def __init__(self, node_id: str, properties: dict[str, Any]):
        self.node_id = node_id
        self.properties = properties

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> NodeMetadata:
        """Static node metadata — type, name, category, properties schema."""
        pass

    @abstractmethod
    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        """Core execution logic for the node."""
        pass
