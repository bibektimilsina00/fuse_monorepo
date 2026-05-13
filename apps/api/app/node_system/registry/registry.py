from typing import Any, Dict, List, Type
from apps.api.app.node_system.base.node import BaseNode


class NodeRegistry:
    def __init__(self):
        self._nodes: Dict[str, Type[BaseNode]] = {}

    def register(self, node_class: Type[BaseNode]) -> None:
        metadata = node_class.get_metadata()
        self._nodes[metadata.type] = node_class

    def get_node(self, node_type: str) -> Type[BaseNode]:
        if node_type not in self._nodes:
            raise ValueError(f"Node type '{node_type}' not registered")
        return self._nodes[node_type]

    def list_nodes(self) -> List[Dict[str, Any]]:
        return [cls.get_metadata().model_dump() for cls in self._nodes.values()]


node_registry = NodeRegistry()
