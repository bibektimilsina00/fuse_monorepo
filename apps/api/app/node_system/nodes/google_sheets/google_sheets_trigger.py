from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult


class GoogleSheetsTriggerProperties(BaseModel):
    credential: str | None = None
    spreadsheet_id: str | None = None
    sheet_name: str | None = None
    event_type: str = "row_added"


class GoogleSheetsTriggerNode(BaseNode[GoogleSheetsTriggerProperties]):
    @classmethod
    def get_properties_model(cls):
        return GoogleSheetsTriggerProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="trigger.google_sheets",
            name="Google Sheets Trigger",
            category="trigger",
            description="Trigger workflow when a row is added or updated in a Google Sheet.",
            icon="si:SiGooglesheets",
            color="#0f9d58",
            properties=[
                {
                    "name": "credential",
                    "label": "Google Account",
                    "type": "credential",
                    "credentialType": "google_oauth",
                    "required": True,
                },
                {
                    "name": "spreadsheet_id",
                    "label": "Spreadsheet ID",
                    "type": "string",
                    "required": True,
                    "placeholder": "1234567890abcdef...",
                },
                {
                    "name": "sheet_name",
                    "label": "Sheet Name",
                    "type": "string",
                    "placeholder": "Sheet1",
                },
                {
                    "name": "event_type",
                    "label": "Event Type",
                    "type": "options",
                    "default": "row_added",
                    "options": [
                        {"label": "Row Added", "value": "row_added"},
                        {"label": "Row Updated", "value": "row_updated"},
                    ],
                },
            ],
            inputs=0,
            outputs=1,
            outputs_schema=[
                {"label": "row_index", "type": "number"},
                {"label": "values", "type": "array"},
                {"label": "spreadsheet_id", "type": "string"},
            ],
            allow_error=True,
            credential_type="google_oauth",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        # Triggers receive their event payload on execution
        return NodeResult(success=True, output_data=input_data)
