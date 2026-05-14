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
            description="Make HTTP requests with comprehensive support for methods, headers, query parameters, path parameters, and form data. Features configurable timeout and status validation for robust API interactions.",
            icon="Globe",
            color="#3b82f6",
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
                {"name": "headers", "label": "Headers", "type": "key-value", "required": False},
                {
                    "name": "params",
                    "label": "Query Parameters",
                    "type": "key-value",
                    "required": False,
                },
                {
                    "name": "pathParams",
                    "label": "Path Parameters",
                    "type": "key-value",
                    "required": False,
                },
                {"name": "body", "label": "Body", "type": "json", "required": False},
                {"name": "formData", "label": "Form Data", "type": "key-value", "required": False},
                {
                    "name": "timeout",
                    "label": "Timeout (ms)",
                    "type": "number",
                    "default": 30000,
                },
            ],
            inputs=1,
            outputs=1,
            allow_error=True,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        timeout_ms = 30000.0
        try:
            url = self.properties.get("url")
            method = self.properties.get("method", "GET").upper()
            headers = self.properties.get("headers") or {}
            params = self.properties.get("params") or {}
            path_params = self.properties.get("pathParams") or {}
            form_data = self.properties.get("formData") or {}
            body = self.properties.get("body")
            timeout_ms = float(self.properties.get("timeout") or 30000)

            if not url:
                return NodeResult(success=False, error="URL is required")

            # Handle path parameters (e.g. /users/:id)
            for key, val in path_params.items():
                url = url.replace(f":{key}", str(val))
                url = url.replace(f"{{{key}}}", str(val))

            # Parse headers/params if they came in as strings (should be dict/list from UI)
            def ensure_dict(val: Any) -> dict:
                if isinstance(val, str):
                    try:
                        return json.loads(val)
                    except Exception:
                        return {}
                return val or {}

            headers = ensure_dict(headers)
            params = ensure_dict(params)
            form_data = ensure_dict(form_data)

            async with httpx.AsyncClient(timeout=timeout_ms / 1000.0) as client:
                request_kwargs = {
                    "method": method,
                    "url": url,
                    "headers": headers,
                    "params": params,
                }

                if form_data:
                    request_kwargs["data"] = form_data
                elif body:
                    if isinstance(body, str):
                        try:
                            request_kwargs["json"] = json.loads(body)
                        except json.JSONDecodeError:
                            request_kwargs["content"] = body
                    else:
                        request_kwargs["json"] = body

                response = await client.request(**request_kwargs)

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
            return NodeResult(success=False, error=f"Request timed out after {timeout_ms}ms")
        except Exception as e:
            logger.error(f"HttpRequestNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
