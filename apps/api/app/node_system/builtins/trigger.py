from typing import Any

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

class TriggerNode(BaseNode):
    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="trigger.manual",
            name="Start",
            category="trigger",
            description="Initiate workflow execution manually",
            properties=[
                {
                    "name": "startWorkflow",
                    "label": "Start Workflow",
                    "type": "string",
                    "default": "manual",
                }
            ],
            inputs=0,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        # Starter nodes receive the initial workflow input (from context or input_data)
        return NodeResult(
            success=True,
            output_data=input_data,
        )
