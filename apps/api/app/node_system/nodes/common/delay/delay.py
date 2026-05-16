import asyncio
from typing import Any

from pydantic import BaseModel

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class DelayProperties(BaseModel):
    milliseconds: int = 1000


class DelayNode(BaseNode[DelayProperties]):
    @classmethod
    def get_properties_model(cls) -> type[DelayProperties]:
        return DelayProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.delay",
            name="Delay",
            category="action",
            description="Wait for a specified number of milliseconds",
            icon="Clock",
            color="#6366f1",
            properties=[
                {
                    "name": "milliseconds",
                    "label": "Delay (ms)",
                    "type": "number",
                    "required": True,
                    "default": 1000,
                },
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            ms = self.props.milliseconds
            if ms < 0:
                return NodeResult(success=False, error="Delay must be >= 0")
            if ms > 300_000:
                return NodeResult(success=False, error="Delay cannot exceed 300000ms (5 minutes)")

            await asyncio.sleep(ms / 1000)

            return NodeResult(
                success=True,
                output_data={"delayed_for_ms": ms},
            )
        except Exception as e:
            return NodeResult(success=False, error=str(e))
