from typing import Any

from apps.api.app.core.logger import get_logger
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.node_system.registry.registry import node_registry

logger = get_logger(__name__)


class NodeExecutor:
    async def execute_node(
        self,
        node_type: str,
        node_id: str,
        properties: dict[str, Any],
        input_data: dict[str, Any],
        context: NodeContext,
    ) -> NodeResult:
        try:
            node_class = node_registry.get_node(node_type)
            node_instance = node_class(node_id=node_id, properties=properties)

            logger.info(f"Executing node {node_id} of type {node_type}")
            result = await node_instance.execute(input_data, context)
            return result
        except Exception as e:
            logger.error(f"Error executing node {node_id}: {str(e)}")
            return NodeResult(success=False, error=str(e), logs=[f"System Error: {str(e)}"])


node_executor = NodeExecutor()
