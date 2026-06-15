from __future__ import annotations

from typing import Any

import httpx
from pydantic import BaseModel

from apps.api.app.core.logger import get_logger
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

logger = get_logger(__name__)
SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"


class GoogleSheetsProperties(BaseModel):
    credential: str | None = None
    operation: str = "get_spreadsheet"
    spreadsheet_id: str | None = None
    range_name: str | None = None
    value_input_option: str = "RAW"
    values: list[list[Any]] | None = None


class GoogleSheetsNode(BaseNode[GoogleSheetsProperties]):
    @classmethod
    def get_properties_model(cls):
        return GoogleSheetsProperties

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.google_sheets",
            name="Google Sheets",
            category="integration",
            description="Read and write data in Google Sheets using Google OAuth credentials.",
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
                    "name": "operation",
                    "label": "Operation",
                    "type": "options",
                    "default": "get_spreadsheet",
                    "options": [
                        {"label": "Get Spreadsheet Metadata", "value": "get_spreadsheet"},
                        {"label": "Read Spreadsheet Values", "value": "get_values"},
                        {"label": "Update Spreadsheet Values", "value": "update_values"},
                        {"label": "Append Spreadsheet Values", "value": "append_values"},
                        {"label": "Clear Spreadsheet Values", "value": "clear_values"},
                    ],
                },
                {
                    "name": "spreadsheet_id",
                    "label": "Spreadsheet ID",
                    "type": "string",
                    "required": True,
                    "placeholder": "1234567890abcdef...",
                },
                {
                    "name": "range_name",
                    "label": "Range",
                    "type": "string",
                    "placeholder": "Sheet1!A1:D10",
                    "condition": {
                        "field": "operation",
                        "value": ["get_values", "update_values", "append_values", "clear_values"],
                    },
                },
                {
                    "name": "value_input_option",
                    "label": "Value Input Option",
                    "type": "options",
                    "default": "RAW",
                    "options": [
                        {"label": "Raw", "value": "RAW"},
                        {"label": "User Entered", "value": "USER_ENTERED"},
                    ],
                    "condition": {
                        "field": "operation",
                        "value": ["update_values", "append_values"],
                    },
                },
                {
                    "name": "values",
                    "label": "Values (JSON Array of Arrays)",
                    "type": "json",
                    "placeholder": '[["Header1", "Header2"], ["Val1", "Val2"]]',
                    "condition": {
                        "field": "operation",
                        "value": ["update_values", "append_values"],
                    },
                },
            ],
            inputs=1,
            outputs=1,
            outputs_schema=[
                {"label": "spreadsheetId", "type": "string"},
                {"label": "values", "type": "array"},
                {"label": "updatedRange", "type": "string"},
                {"label": "updatedRows", "type": "number"},
            ],
            allow_error=True,
            credential_type="google_oauth",
        )

    def _get_token(self) -> str | None:
        if not self.credential:
            return None
        return self.credential.get("access_token")

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        token = self._get_token()
        if not token:
            return NodeResult(success=False, error="Google OAuth credential required.")

        if not self.props.spreadsheet_id:
            return NodeResult(success=False, error="Spreadsheet ID required.")

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        op = self.props.operation

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                if op == "get_spreadsheet":
                    r = await client.get(
                        f"{SHEETS_API}/{self.props.spreadsheet_id}",
                        headers=headers,
                    )
                    r.raise_for_status()
                    return NodeResult(success=True, output_data=r.json())

                elif op == "get_values":
                    if not self.props.range_name:
                        return NodeResult(success=False, error="Range is required.")
                    r = await client.get(
                        f"{SHEETS_API}/{self.props.spreadsheet_id}/values/{self.props.range_name}",
                        headers=headers,
                    )
                    r.raise_for_status()
                    return NodeResult(success=True, output_data=r.json())

                elif op == "update_values":
                    if not self.props.range_name:
                        return NodeResult(success=False, error="Range is required.")
                    body = {
                        "range": self.props.range_name,
                        "majorDimension": "ROWS",
                        "values": self.props.values or [],
                    }
                    params = {"valueInputOption": self.props.value_input_option}
                    r = await client.put(
                        f"{SHEETS_API}/{self.props.spreadsheet_id}/values/{self.props.range_name}",
                        headers=headers,
                        json=body,
                        params=params,
                    )
                    r.raise_for_status()
                    return NodeResult(success=True, output_data=r.json())

                elif op == "append_values":
                    if not self.props.range_name:
                        return NodeResult(success=False, error="Range is required.")
                    body = {
                        "range": self.props.range_name,
                        "majorDimension": "ROWS",
                        "values": self.props.values or [],
                    }
                    params = {
                        "valueInputOption": self.props.value_input_option,
                        "insertDataOption": "INSERT_ROWS",
                    }
                    r = await client.post(
                        f"{SHEETS_API}/{self.props.spreadsheet_id}/values/{self.props.range_name}:append",
                        headers=headers,
                        json=body,
                        params=params,
                    )
                    r.raise_for_status()
                    return NodeResult(success=True, output_data=r.json())

                elif op == "clear_values":
                    if not self.props.range_name:
                        return NodeResult(success=False, error="Range is required.")
                    r = await client.post(
                        f"{SHEETS_API}/{self.props.spreadsheet_id}/values/{self.props.range_name}:clear",
                        headers=headers,
                    )
                    r.raise_for_status()
                    return NodeResult(success=True, output_data=r.json())

                else:
                    return NodeResult(success=False, error=f"Unknown operation: {op}")

        except httpx.HTTPStatusError as e:
            return NodeResult(
                success=False,
                error=f"Google Sheets API error {e.response.status_code}: {e.response.text[:200]}",
            )
        except Exception as e:
            logger.error(f"GoogleSheetsNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
