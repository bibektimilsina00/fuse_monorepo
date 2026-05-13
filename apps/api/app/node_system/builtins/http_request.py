import json
from typing import Any

import httpx

from apps.api.app.core.logger import get_logger
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_result import NodeResult

logger = get_logger(__name__)


class HttpRequestNode(BaseNode):
    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.http_request",
            name="HTTP Request",
            category="action",
            description="Send an HTTP request to any URL",
            properties=[
                {"name": "url", "label": "URL", "type": "string", "required": True},
                {
                    "name": "method",
                    "label": "Method",
                    "type": "options",
                    "default": "GET",
                    "options": [
                        {"label": "GET", "value": "GET"},
                        {"label": "POST", "value": "POST"},
                        {"label": "PUT", "value": "PUT"},
                        {"label": "DELETE", "value": "DELETE"},
                        {"label": "PATCH", "value": "PATCH"},
                    ],
                },
                {"name": "headers", "label": "Headers", "type": "json", "required": False},
                {"name": "body", "label": "Body", "type": "json", "required": False},
                {
                    "name": "timeout",
                    "label": "Timeout (s)",
                    "type": "number",
                    "default": 30,
                    "mode": "advanced",
                },
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        timeout = 30.0
        try:
            url = self.properties.get("url")
            method = self.properties.get("method", "GET").upper()
            headers = self.properties.get("headers") or {}
            body = self.properties.get("body")
            timeout = float(self.properties.get("timeout") or 30)

            if not url:
                return NodeResult(success=False, error="URL is required")

            # Parse headers/body if they came in as strings
            if isinstance(headers, str):
                headers = json.loads(headers)
            if isinstance(body, str):
                import contextlib

                with contextlib.suppress(json.JSONDecodeError):
                    body = json.loads(body)

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body if isinstance(body, dict) else None,
                    content=body if isinstance(body, str) else None,
                )

            # Try to parse response as JSON
            try:
                response_body = response.json()
            except Exception:
                response_body = response.text

            return NodeResult(
                success=True,
                output_data={
                    "status_code": response.status_code,
                    "body": response_body,
                    "headers": dict(response.headers),
                    "ok": response.is_success,
                },
            )
        except httpx.TimeoutException:
            return NodeResult(success=False, error=f"Request timed out after {timeout}s")
        except Exception as e:
            logger.error(f"HttpRequestNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
