from typing import Any

from pydantic import BaseModel

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class WebhookTriggerProperties(BaseModel):
    path: str = "webhook-id"


class WebhookTriggerNode(BaseNode[WebhookTriggerProperties]):
    @classmethod
    def get_properties_model(cls) -> type[WebhookTriggerProperties]:
        return WebhookTriggerProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="trigger.webhook",
            name="Webhook Trigger",
            category="trigger",
            description="Trigger workflow via HTTP POST request",
            icon="Zap",
            color="#ec4899",
            properties=[
                {
                    "name": "path",
                    "label": "Webhook Path",
                    "type": "string",
                    "default": "webhook-id",
                    "required": True,
                }
            ],
            inputs=0,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        # For a trigger, the input_data is the webhook payload.
        # We just pass it through.
        return NodeResult(
            success=True,
            output_data=input_data,
        )
