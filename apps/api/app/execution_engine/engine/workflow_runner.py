from typing import Any

from apps.api.app.core.logger import get_logger
from apps.api.app.execution_engine.engine.node_executor import node_executor
from apps.api.app.node_system.base.node_context import NodeContext

logger = get_logger(__name__)


class WorkflowRunner:
    def __init__(
        self,
        workflow_id: str,
        execution_id: str,
        graph: dict[str, Any],
        on_log: Any = None,
        credentials: dict[str, Any] = None,
    ):
        self.workflow_id = workflow_id
        self.execution_id = execution_id
        self.graph = graph
        self.nodes = {node["id"]: node for node in graph.get("nodes", [])}
        self.edges = graph.get("edges", [])
        self.executed_nodes: dict[str, Any] = {}
        self.node_outputs: dict[str, dict[str, Any]] = {}
        self.trigger_data: dict[str, Any] = {}
        self.credentials = credentials or {}
        self.on_log = on_log
        self.failed = False
        self.error_message = None

    async def _log(
        self, message: str, level: str = "info", node_id: str | None = None, payload: Any = None
    ):
        if self.on_log:
            await self.on_log(message, level=level, node_id=node_id, payload=payload)

    async def run(self, trigger_data: dict[str, Any]) -> dict:
        self.trigger_data = trigger_data
        logger.info(f"Starting workflow execution {self.execution_id}")

        # 1. Find start nodes (nodes with no incoming edges)
        start_nodes = self._get_start_nodes()

        if not start_nodes:
            logger.info(f"Workflow {self.workflow_id} has no nodes — completing immediately")
            return {}

        for node_id in start_nodes:
            await self._execute_node_recursive(node_id, trigger_data)
            if self.failed:
                break

        if self.failed:
            raise Exception(self.error_message or "Execution failed")

        # Return output of last executed nodes
        if self.node_outputs:
            last_node_id = list(self.node_outputs.keys())[-1]
            return self.node_outputs[last_node_id]
        return {}

    def _get_start_nodes(self) -> list[str]:
        target_nodes = {edge["target"] for edge in self.edges}
        return [node_id for node_id in self.nodes if node_id not in target_nodes]

    async def _execute_node_recursive(self, node_id: str, input_data: dict[str, Any]):
        if node_id in self.executed_nodes or self.failed:
            return

        node_data = self.nodes[node_id]
        label = node_data.get("data", {}).get("label") or node_data["type"]

        await self._log(f"Executing node: {label}", node_id=node_id)

        # Resolve templates in properties BEFORE executing
        from apps.api.app.execution_engine.engine.template_resolver import TemplateResolver

        resolver = TemplateResolver(
            node_outputs=self.node_outputs,
            trigger_data=self.trigger_data,
        )
        raw_properties = node_data.get("data", {}).get("properties", {})
        resolved_properties = resolver.resolve_properties(raw_properties)

        context = NodeContext(
            execution_id=self.execution_id,
            workflow_id=self.workflow_id,
            node_id=node_id,
            variables={},  # To be populated from state
            credentials=self.credentials,
        )

        result = await node_executor.execute_node(
            node_type=node_data["type"],
            node_id=node_id,
            properties=resolved_properties,  # Pass resolved properties
            input_data=input_data,
            context=context,
        )

        self.executed_nodes[node_id] = result

        # Log individual node logs if any
        for log_msg in result.logs:
            await self._log(log_msg, level="info" if result.success else "error", node_id=node_id)

        next_edges = [edge for edge in self.edges if edge["source"] == node_id]

        if result.success:
            # Store output for future interpolation
            self.node_outputs[node_id] = result.output_data
            
            await self._log(
                f"Node {label} executed successfully",
                node_id=node_id,
                payload={
                    "input": resolved_properties,
                    "data_in": input_data,
                    "output": result.output_data,
                },
            )

            branch = result.output_data.get("branch")
            for edge in next_edges:
                edge_handle = edge.get("sourceHandle")
                
                # SKIP error branches on success
                if edge_handle == 'error':
                    continue
                    
                # Handle specific logical branches (e.g. from Condition node)
                if branch and edge_handle and edge_handle != branch:
                    continue

                await self._execute_node_recursive(edge["target"], result.output_data)
        else:
            # Handle Failure
            error_payload = {
                "input": resolved_properties,
                "data_in": input_data,
                "error": result.error
            }
            
            await self._log(
                f"Node {label} failed: {result.error}",
                level="error",
                node_id=node_id,
                payload=error_payload,
            )

            # Check if we have an error handler branch
            error_edges = [e for e in next_edges if e.get("sourceHandle") == "error"]
            
            if error_edges:
                logger.info(f"Node {node_id} failed, following {len(error_edges)} error branch(es)")
                for edge in error_edges:
                    await self._execute_node_recursive(edge["target"], error_payload)
            else:
                # No error handler -> workflow fails
                self.failed = True
                self.error_message = f"Node {label} failed: {result.error}"
                logger.error(f"Execution failed at node {node_id}: {result.error}")
