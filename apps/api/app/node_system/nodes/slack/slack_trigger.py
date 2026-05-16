from typing import Any, Optional
from pydantic import BaseModel

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class SlackTriggerProperties(BaseModel):
    event_type: str = "message"
    channel: Optional[str] = None


class SlackTriggerNode(BaseNode[SlackTriggerProperties]):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="trigger.slack",
            name="Slack Trigger",
            category="trigger",
            description="Trigger workflow when an event happens in Slack (e.g., new message, reaction).",
            icon="Zap",
            color="#4a154b",
            properties=[
                {
                    "name": "credential",
                    "label": "Slack Account",
                    "type": "credential",
                    "credentialType": "slack_oauth",
                    "required": True
                },
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "options",
                    "default": "message",
                    "options": [
                        {"label": "New Message", "value": "message"},
                        {"label": "New Reaction", "value": "reaction_added"},
                        {"label": "Channel Created", "value": "channel_created"},
                        {"label": "Member Joined", "value": "member_joined_channel"},
                    ],
                },
                {
                    "name": "channel",
                    "label": "Channel ID (Optional)",
                    "type": "string",
                    "placeholder": "C1234567890",
                    "condition": {"field": "event_type", "value": ["message", "reaction_added"]}
                }
            ],
            inputs=0,
            outputs=1,
            credential_type="slack_oauth",
        )

    @classmethod
    def get_properties_model(cls) -> type[SlackTriggerProperties]:
        return SlackTriggerProperties

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        # Trigger nodes simply pass the incoming event payload to the next node
        return NodeResult(success=True, output_data=input_data)
