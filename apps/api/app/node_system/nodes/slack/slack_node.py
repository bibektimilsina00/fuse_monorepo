import json
from typing import Any, Optional, List
from pydantic import BaseModel, Field

from apps.api.app.core.logger import get_logger
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

logger = get_logger(__name__)


class SlackProperties(BaseModel):
    operation: str = "send_message"
    channel: Optional[str] = None
    text: Optional[str] = None
    user: Optional[str] = None
    thread_ts: Optional[str] = None
    blocks: Optional[Any] = None
    attachments: Optional[Any] = None
    channel_name: Optional[str] = None
    is_private: bool = False
    limit: int = 100
    ts: Optional[str] = None


class SlackNode(BaseNode[SlackProperties]):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.slack",
            name="Slack",
            category="integration",
            description="Perform various operations in Slack like sending messages, managing channels, and more.",
            icon="MessageSquare",
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
                    "name": "operation",
                    "label": "Operation",
                    "type": "options",
                    "default": "send_message",
                    "options": [
                        {"label": "Send Message", "value": "send_message"},
                        {"label": "Send Ephemeral Message", "value": "send_ephemeral"},
                        {"label": "List Channels", "value": "list_channels"},
                        {"label": "Get Message", "value": "get_message"},
                        {"label": "Create Channel", "value": "create_channel"},
                    ],
                },
                # Fields for Send Message
                {
                    "name": "channel",
                    "label": "Channel ID",
                    "type": "string",
                    "required": True,
                    "placeholder": "C1234567890 or #general",
                    "condition": {"field": "operation", "value": ["send_message", "send_ephemeral", "get_message"]}
                },
                {
                    "name": "text",
                    "label": "Message Text",
                    "type": "string",
                    "required": True,
                    "condition": {"field": "operation", "value": ["send_message", "send_ephemeral"]}
                },
                {
                    "name": "user",
                    "label": "User ID",
                    "type": "string",
                    "required": True,
                    "placeholder": "U1234567890",
                    "condition": {"field": "operation", "value": "send_ephemeral"}
                },
                # Advanced Message Options
                {
                    "name": "thread_ts",
                    "label": "Thread TS",
                    "type": "string",
                    "mode": "advanced",
                    "condition": {"field": "operation", "value": ["send_message", "send_ephemeral"]}
                },
                {
                    "name": "blocks",
                    "label": "Blocks (JSON)",
                    "type": "json",
                    "mode": "advanced",
                    "condition": {"field": "operation", "value": ["send_message", "send_ephemeral"]}
                },
                {
                    "name": "attachments",
                    "label": "Attachments (JSON)",
                    "type": "json",
                    "mode": "advanced",
                    "condition": {"field": "operation", "value": "send_message"}
                },
                # Fields for List Channels
                {
                    "name": "limit",
                    "label": "Limit",
                    "type": "number",
                    "default": 100,
                    "condition": {"field": "operation", "value": "list_channels"}
                },
                # Fields for Get Message
                {
                    "name": "ts",
                    "label": "Message Timestamp (ts)",
                    "type": "string",
                    "required": True,
                    "condition": {"field": "operation", "value": "get_message"}
                },
                # Fields for Create Channel
                {
                    "name": "channel_name",
                    "label": "Channel Name",
                    "type": "string",
                    "required": True,
                    "placeholder": "new-channel",
                    "condition": {"field": "operation", "value": "create_channel"}
                },
                {
                    "name": "is_private",
                    "label": "Is Private?",
                    "type": "boolean",
                    "default": False,
                    "condition": {"field": "operation", "value": "create_channel"}
                },
            ],
            inputs=1,
            outputs=1,
            outputs_schema=[
                {"label": "ts", "type": "string"},
                {"label": "channel", "type": "string"},
                {"label": "message", "type": "object"},
                {"label": "ok", "type": "boolean"},
            ],
            credential_type="slack_oauth",
        )

    @classmethod
    def get_properties_model(cls) -> type[SlackProperties]:
        return SlackProperties

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            if not self.credential:
                return NodeResult(success=False, error="Slack credential not found.")

            access_token = self.credential.get("access_token")
            if not access_token:
                return NodeResult(success=False, error="Slack access token missing in credential.")

            from apps.api.app.integrations.slack.service import SlackService
            service = SlackService(access_token=access_token, client=context.http_client)

            op = self.props.operation
            output = {}

            if op == "send_message":
                if not self.props.channel or not self.props.text:
                     return NodeResult(success=False, error="Channel and Text are required for send_message")
                output = await service.send_message(
                    channel=self.props.channel,
                    text=self.props.text,
                    thread_ts=self.props.thread_ts,
                    blocks=self.props.blocks,
                    attachments=self.props.attachments
                )
            elif op == "send_ephemeral":
                if not self.props.channel or not self.props.user or not self.props.text:
                    return NodeResult(success=False, error="Channel, User, and Text are required for send_ephemeral")
                output = await service.send_ephemeral_message(
                    channel=self.props.channel,
                    user=self.props.user,
                    text=self.props.text,
                    thread_ts=self.props.thread_ts,
                    blocks=self.props.blocks
                )
            elif op == "list_channels":
                channels = await service.list_channels(limit=self.props.limit)
                output = {"channels": channels}
            elif op == "get_message":
                if not self.props.channel or not self.props.ts:
                    return NodeResult(success=False, error="Channel and Timestamp (ts) are required for get_message")
                output = await service.get_message(channel=self.props.channel, ts=self.props.ts)
            elif op == "create_channel":
                if not self.props.channel_name:
                    return NodeResult(success=False, error="Channel Name is required for create_channel")
                output = await service.create_channel(name=self.props.channel_name, is_private=self.props.is_private)
            else:
                return NodeResult(success=False, error=f"Unsupported operation: {op}")

            return NodeResult(success=True, output_data=output)

        except Exception as e:
            logger.error(f"SlackNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
