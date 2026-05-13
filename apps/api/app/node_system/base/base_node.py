# Re-export canonical BaseNode from node.py for backward compatibility.
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata

__all__ = ['BaseNode', 'NodeMetadata']
