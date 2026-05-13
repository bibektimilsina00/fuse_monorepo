# Phase 4 — First Real Nodes

**Status: ✅ Completed**

---

## Goal

HTTP Request, Delay, and Condition nodes fully implemented and executing correctly. A workflow with these nodes runs end-to-end.

## Prerequisites

- Phase 3 complete (execution pipeline working, empty workflow runs)

---

## Node Pattern (read before coding)

Every node = two files that must stay in sync:

1. **Frontend** — `packages/node-definitions/src/{service}.ts` → `NodeDefinition`
2. **Backend** — `apps/api/app/node_system/builtins/{type}.py` → `BaseNode` subclass

The `type` string (e.g. `'action.http_request'`) must be **identical** in both.

Backend executor rules:
- Always `try/except Exception` → return `NodeResult(success=False, error=str(e))`
- `self.properties.get('key')` never `self.properties['key']`
- `get_logger(__name__)` never `print()`
- Absolute imports only

---

## Node 1: HTTP Request

### Backend — `apps/api/app/node_system/builtins/http_request.py`

```python
import json
from typing import Any
import httpx
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

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
                {"name": "method", "label": "Method", "type": "options", "default": "GET",
                 "options": [{"label": "GET", "value": "GET"}, {"label": "POST", "value": "POST"},
                              {"label": "PUT", "value": "PUT"}, {"label": "DELETE", "value": "DELETE"},
                              {"label": "PATCH", "value": "PATCH"}]},
                {"name": "headers", "label": "Headers", "type": "json", "required": False},
                {"name": "body", "label": "Body", "type": "json", "required": False},
                {"name": "timeout", "label": "Timeout (s)", "type": "number", "default": 30, "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
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
                try:
                    body = json.loads(body)
                except json.JSONDecodeError:
                    pass  # keep as string if not valid JSON

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
```

### Frontend — update `packages/node-definitions/src/http.ts`

```typescript
import type { NodeDefinition } from './registry'

export const HttpRequestNode: NodeDefinition = {
  type: 'action.http_request',
  name: 'HTTP Request',
  category: 'action',
  description: 'Send an HTTP request to any URL',
  properties: [
    { name: 'url', label: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com/endpoint' },
    {
      name: 'method',
      label: 'Method',
      type: 'options',
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
    },
    { name: 'headers', label: 'Headers', type: 'json', required: false },
    { name: 'body', label: 'Body', type: 'json', required: false, condition: { field: 'method', value: ['POST', 'PUT', 'PATCH'] } },
    { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 30, mode: 'advanced' },
  ],
  inputs: 1,
  outputs: 1,
}
```

---

## Node 2: Delay

### Backend — `apps/api/app/node_system/builtins/delay.py`

```python
import asyncio
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class DelayNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.delay",
            name="Delay",
            category="action",
            description="Wait for a specified number of milliseconds",
            properties=[
                {"name": "milliseconds", "label": "Delay (ms)", "type": "number",
                 "required": True, "default": 1000},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            ms = int(self.properties.get("milliseconds") or 1000)
            if ms < 0:
                return NodeResult(success=False, error="Delay must be >= 0")
            if ms > 300_000:
                return NodeResult(success=False, error="Delay cannot exceed 300000ms (5 minutes)")

            await asyncio.sleep(ms / 1000)

            return NodeResult(
                success=True,
                output_data={"delayed_for_ms": ms, **input_data},
            )
        except Exception as e:
            logger.error(f"DelayNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

### Frontend — `packages/node-definitions/src/registry.ts` — add:

```typescript
export const DelayNode: NodeDefinition = {
  type: 'action.delay',
  name: 'Delay',
  category: 'action',
  description: 'Wait for a specified number of milliseconds',
  properties: [
    { name: 'milliseconds', label: 'Delay (ms)', type: 'number', required: true, default: 1000 },
  ],
  inputs: 1,
  outputs: 1,
}
```

---

## Node 3: Condition (IF/ELSE)

### Backend — `apps/api/app/node_system/builtins/condition.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

OPERATORS = {
    "==": lambda a, b: str(a) == str(b),
    "!=": lambda a, b: str(a) != str(b),
    ">": lambda a, b: float(a) > float(b),
    "<": lambda a, b: float(a) < float(b),
    ">=": lambda a, b: float(a) >= float(b),
    "<=": lambda a, b: float(a) <= float(b),
    "contains": lambda a, b: str(b).lower() in str(a).lower(),
    "not_contains": lambda a, b: str(b).lower() not in str(a).lower(),
}


class ConditionNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.condition",
            name="Condition",
            category="logic",
            description="Branch workflow based on a condition",
            properties=[
                {"name": "left", "label": "Left Value", "type": "string", "required": True},
                {"name": "operator", "label": "Operator", "type": "options", "default": "==",
                 "options": [{"label": op, "value": op} for op in OPERATORS]},
                {"name": "right", "label": "Right Value", "type": "string", "required": True},
            ],
            inputs=1,
            outputs=2,  # output 0 = true branch, output 1 = false branch
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            left = self.properties.get("left", "")
            operator = self.properties.get("operator", "==")
            right = self.properties.get("right", "")

            if operator not in OPERATORS:
                return NodeResult(success=False, error=f"Unknown operator: {operator}")

            try:
                result = OPERATORS[operator](left, right)
            except (ValueError, TypeError) as e:
                return NodeResult(success=False, error=f"Comparison failed: {e}")

            return NodeResult(
                success=True,
                output_data={
                    "result": result,
                    "branch": "true" if result else "false",
                    **input_data,
                },
            )
        except Exception as e:
            logger.error(f"ConditionNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step: Register All Nodes in Backend

**File:** `apps/api/app/node_system/registry/registry.py` — add at the bottom:

```python
# Register builtin nodes
from apps.api.app.node_system.builtins.http_request import HttpRequestNode
from apps.api.app.node_system.builtins.delay import DelayNode
from apps.api.app.node_system.builtins.condition import ConditionNode

node_registry.register(HttpRequestNode)
node_registry.register(DelayNode)
node_registry.register(ConditionNode)
```

---

## Step: Register All Nodes in Frontend

**File:** `packages/node-definitions/src/registry.ts`

```typescript
import type { NodeDefinition, NodeProperty } from './registry'
import { HttpRequestNode } from './http'
import { DelayNode, ConditionNode } from './logic'  // create logic.ts for these
// OR inline them here

export const NODE_REGISTRY: NodeDefinition[] = [
  HttpRequestNode,
  DelayNode,
  ConditionNode,
  // existing trigger.webhook entry
]
```

---

## Step: Run lint

```bash
make lint
```

---

## Checklist

- [ ] `HttpRequestNode.execute()` makes real HTTP call using `httpx.AsyncClient`
- [ ] `HttpRequestNode` handles all 5 HTTP methods (GET/POST/PUT/DELETE/PATCH)
- [ ] `HttpRequestNode` handles timeout → returns `NodeResult(success=False, error="timed out")`
- [ ] `HttpRequestNode` returns `status_code`, `body`, `headers`, `ok`
- [ ] `HttpRequestNode` parses JSON body automatically; falls back to text
- [ ] `DelayNode.execute()` uses `asyncio.sleep(ms/1000)`
- [ ] `DelayNode` rejects negative ms and > 300,000ms
- [ ] `DelayNode` passes through `input_data` in output
- [ ] `ConditionNode` supports all 8 operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `not_contains`
- [ ] `ConditionNode` returns `result` (bool) and `branch` ("true"/"false") in output
- [ ] All 3 nodes registered in backend `node_registry` (bottom of `registry.py`)
- [ ] All 3 nodes registered in frontend `NODE_REGISTRY`
- [ ] `type` string identical between `NodeDefinition` and `get_metadata()`
- [ ] All executors have `try/except Exception` → `NodeResult(success=False)`
- [ ] All executors use `get_logger(__name__)` not `print()`
- [ ] All executors use absolute imports
- [ ] `make lint` passes

---

## Acceptance Criteria

Build and run this workflow via API:

```bash
TOKEN="eyJ..."

# Create workflow with Delay → HTTP Request
curl -X POST localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delay then HTTP",
    "graph": {
      "nodes": [
        {"id":"n1","type":"action.delay","position":{"x":0,"y":0},"data":{"properties":{"milliseconds":500}}},
        {"id":"n2","type":"action.http_request","position":{"x":200,"y":0},"data":{"properties":{"url":"https://httpbin.org/get","method":"GET"}}}
      ],
      "edges": [{"id":"e1","source":"n1","target":"n2"}]
    }
  }'

# Run it
curl -X POST localhost:8000/api/v1/workflows/{id}/run \
  -H "Authorization: Bearer $TOKEN"

# Check result (wait ~2 seconds)
curl localhost:8000/api/v1/executions/{exec_id} \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"completed","logs":[...],"output_data":{"status_code":200,"body":{...},...}}
```

---

## Common Mistakes

- Registering nodes at module import time but not importing the registry module — nodes never register. Must import `registry.py` on app startup.
- `httpx.AsyncClient` must be used inside `async with` — don't create it as class attribute
- `asyncio.sleep` not `time.sleep` — time.sleep blocks the Celery worker event loop
- Condition node: comparing numbers as strings causes wrong results. Cast to float for numeric operators.
- Frontend `type` has a typo vs backend — execution engine can't find the node class
