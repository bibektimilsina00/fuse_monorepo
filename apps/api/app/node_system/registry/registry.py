from typing import Any

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.builtins.http_request import HttpRequestNode
from apps.api.app.node_system.builtins.webhook import WebhookTriggerNode


class NodeRegistry:
    def __init__(self):
        self._nodes: dict[str, type[BaseNode]] = {}

    def register(self, node_class: type[BaseNode]) -> None:
        metadata = node_class.get_metadata()
        self._nodes[metadata.type] = node_class

    def get_node(self, node_type: str) -> type[BaseNode]:
        if node_type not in self._nodes:
            raise ValueError(f"Node type '{node_type}' not registered")
        return self._nodes[node_type]

    def list_nodes(self) -> list[dict[str, Any]]:
        return [cls.get_metadata().model_dump() for cls in self._nodes.values()]


node_registry = NodeRegistry()

# Register builtin nodes
node_registry.register(HttpRequestNode)
node_registry.register(WebhookTriggerNode)
