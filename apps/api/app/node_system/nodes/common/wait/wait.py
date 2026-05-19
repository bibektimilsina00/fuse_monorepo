from __future__ import annotations

import asyncio
from typing import Any

from pydantic import BaseModel

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

_MAX_SECONDS = 3600  # 1 hour cap


class WaitProperties(BaseModel):
    duration: float = 1
    unit: str = "seconds"  # seconds | minutes | hours


class WaitNode(BaseNode[WaitProperties]):
    @classmethod
    def get_properties_model(cls) -> type[WaitProperties]:
        return WaitProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.wait",
            name="Wait",
            category="logic",
            description="Pause workflow execution for a fixed duration.",
            icon="Clock",
            color="#6b7280",
            properties=[
                {
                    "name": "duration",
                    "label": "Duration",
                    "type": "number",
                    "default": 1,
                    "required": True,
                },
                {
                    "name": "unit",
                    "label": "Unit",
                    "type": "options",
                    "default": "seconds",
                    "options": [
                        {"label": "Seconds", "value": "seconds"},
                        {"label": "Minutes", "value": "minutes"},
                        {"label": "Hours", "value": "hours"},
                    ],
                },
            ],
            inputs=1,
            outputs=1,
            outputs_schema=[
                {"label": "waitDuration", "type": "number"},
                {"label": "status", "type": "string"},
            ],
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        multipliers = {"seconds": 1, "minutes": 60, "hours": 3600}
        seconds = self.props.duration * multipliers.get(self.props.unit, 1)
        seconds = min(max(seconds, 0), _MAX_SECONDS)

        await asyncio.sleep(seconds)

        return NodeResult(
            success=True,
            output_data={"waitDuration": seconds * 1000, "status": "completed"},
        )
