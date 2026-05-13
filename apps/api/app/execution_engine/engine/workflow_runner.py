from typing import Dict, Any, List
import uuid
from apps.api.app.execution_engine.engine.node_executor import node_executor
from apps.api.app.node_system.base.execution_contract import NodeContext
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

class WorkflowRunner:
    def __init__(self, workflow_id: str, execution_id: str, graph: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.execution_id = execution_id
        self.graph = graph
        self.nodes = {node['id']: node for node in graph.get('nodes', [])}
        self.edges = graph.get('edges', [])
        self.executed_nodes: Dict[str, Any] = {}

    async def run(self, trigger_data: Dict[str, Any]):
        logger.info(f"Starting workflow execution {self.execution_id}")
        
        # 1. Find start nodes (nodes with no incoming edges)
        start_nodes = self._get_start_nodes()
        
        for node_id in start_nodes:
            await self._execute_node_recursive(node_id, trigger_data)

    def _get_start_nodes(self) -> List[str]:
        target_nodes = {edge['target'] for edge in self.edges}
        return [node_id for node_id in self.nodes if node_id not in target_nodes]

    async def _execute_node_recursive(self, node_id: str, input_data: Dict[str, Any]):
        if node_id in self.executed_nodes:
            return

        node_data = self.nodes[node_id]
        context = NodeContext(
            execution_id=self.execution_id,
            workflow_id=self.workflow_id,
            node_id=node_id,
            variables={} # To be populated from state
        )

        result = await node_executor.execute_node(
            node_type=node_data['type'],
            node_id=node_id,
            properties=node_data.get('data', {}).get('properties', {}),
            input_data=input_data,
            context=context
        )

        self.executed_nodes[node_id] = result

        if result.success:
            # Find next nodes
            next_edges = [edge for edge in self.edges if edge['source'] == node_id]
            for edge in next_edges:
                await self._execute_node_recursive(edge['target'], result.output_data)
        else:
            logger.error(f"Execution failed at node {node_id}: {result.error}")
