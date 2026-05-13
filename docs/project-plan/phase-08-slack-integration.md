# Phase 8 — First Integration: Slack

**Status: ⬜ Not Started**

---

## Goal

Slack "Send Message" node works end-to-end with real credentials. A workflow that sends a real Slack message executes successfully.

## Prerequisites

- Phase 7 complete (credentials stored, OAuth flow works)
- Slack app created at api.slack.com with `chat:write` and `channels:read` scopes
- `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in `.env`

---

## Step 1: Slack Client

**File:** `apps/api/app/integrations/slack/client.py`

```python
import httpx
from typing import Any, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

SLACK_BASE_URL = "https://slack.com/api"


class SlackClient:
    def __init__(self, access_token: str):
        self._access_token = access_token
        self._client = httpx.AsyncClient(
            base_url=SLACK_BASE_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def post(self, path: str, json: Optional[dict] = None) -> dict[str, Any]:
        response = await self._client.post(path, json=json)
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
        return data

    async def get(self, path: str, params: Optional[dict] = None) -> dict[str, Any]:
        response = await self._client.get(path, params=params)
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
        return data

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
```

---

## Step 2: Slack Service

**File:** `apps/api/app/integrations/slack/service.py`

```python
from typing import Optional
from apps.api.app.integrations.slack.client import SlackClient
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SlackService:
    def __init__(self, access_token: str):
        self._client = SlackClient(access_token=access_token)

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
        blocks: Optional[list] = None,
    ) -> dict:
        payload: dict = {"channel": channel, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks
        return await self._client.post("/chat.postMessage", json=payload)

    async def list_channels(self, limit: int = 100) -> list:
        data = await self._client.get("/conversations.list", params={"limit": limit, "types": "public_channel,private_channel"})
        return data.get("channels", [])

    async def get_user_info(self, user_id: str) -> dict:
        data = await self._client.get("/users.info", params={"user": user_id})
        return data.get("user", {})

    async def close(self):
        await self._client.close()
```

---

## Step 3: Slack __init__.py

**File:** `apps/api/app/integrations/slack/__init__.py`

```python
from apps.api.app.integrations.slack.service import SlackService
from apps.api.app.integrations.slack.client import SlackClient

__all__ = ["SlackService", "SlackClient"]
```

---

## Step 4: Slack Node Executor

**File:** `apps/api/app/node_system/builtins/slack_send_message.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SlackSendMessageNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.slack_send_message",
            name="Slack: Send Message",
            category="integration",
            description="Send a message to a Slack channel",
            properties=[
                {"name": "credential", "label": "Slack Account", "type": "credential",
                 "credentialType": "slack_oauth", "required": True},
                {"name": "channel", "label": "Channel ID", "type": "string", "required": True,
                 "placeholder": "C1234567890 or #general"},
                {"name": "text", "label": "Message Text", "type": "string", "required": True},
                {"name": "thread_ts", "label": "Reply to Thread", "type": "string",
                 "required": False, "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
            credential_type="slack_oauth",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            channel = self.properties.get("channel")
            text = self.properties.get("text")
            thread_ts = self.properties.get("thread_ts")

            if not channel:
                return NodeResult(success=False, error="channel is required")
            if not text:
                return NodeResult(success=False, error="text is required")

            # Get credential from context
            credential = context.credentials.get("slack_oauth")
            if not credential:
                return NodeResult(success=False, error="Slack credential not found. Connect a Slack account first.")

            access_token = credential.get("access_token")
            if not access_token:
                return NodeResult(success=False, error="Slack access token missing in credential")

            from apps.api.app.integrations.slack.service import SlackService
            service = SlackService(access_token=access_token)

            result = await service.send_message(
                channel=channel,
                text=text,
                thread_ts=thread_ts or None,
            )

            return NodeResult(
                success=True,
                output_data={
                    "ts": result.get("ts"),
                    "channel": result.get("channel"),
                    "message": result.get("message", {}),
                },
            )
        except ValueError as e:
            # Slack API-level errors (bad token, channel not found, etc.)
            return NodeResult(success=False, error=str(e))
        except Exception as e:
            logger.error(f"SlackSendMessageNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Step 5: Register Slack Node in Backend

**File:** `apps/api/app/node_system/registry/registry.py` — add:

```python
from apps.api.app.node_system.builtins.slack_send_message import SlackSendMessageNode
node_registry.register(SlackSendMessageNode)
```

---

## Step 6: Frontend Node Definition

**File:** `packages/node-definitions/src/slack.ts`

```typescript
import type { NodeDefinition } from './registry'

export const SlackSendMessageNode: NodeDefinition = {
  type: 'action.slack_send_message',
  name: 'Slack: Send Message',
  category: 'integration',
  description: 'Send a message to a Slack channel',
  icon: 'slack',
  credentialType: 'slack_oauth',
  properties: [
    {
      name: 'credential',
      label: 'Slack Account',
      type: 'credential',
      credentialType: 'slack_oauth',
      required: true,
    },
    {
      name: 'channel',
      label: 'Channel ID',
      type: 'string',
      required: true,
      placeholder: 'C1234567890',
    },
    {
      name: 'text',
      label: 'Message Text',
      type: 'string',
      required: true,
    },
    {
      name: 'thread_ts',
      label: 'Reply to Thread (ts)',
      type: 'string',
      required: false,
      mode: 'advanced',
    },
  ],
  inputs: 1,
  outputs: 1,
}
```

Add to `packages/node-definitions/src/registry.ts`:
```typescript
import { SlackSendMessageNode } from './slack'

export const NODE_REGISTRY: NodeDefinition[] = [
  // ... existing nodes ...
  SlackSendMessageNode,
]
```

---

## Step 7: Create Slack App (External Setup)

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. App Name: `Fuse Dev`, workspace: your workspace
4. Go to "OAuth & Permissions"
5. Add Redirect URL: `http://localhost:8000/api/v1/credentials/oauth/slack/callback`
6. Add Bot Token Scopes: `chat:write`, `channels:read`, `users:read`
7. Go to "Basic Information" → copy `Client ID` and `Client Secret` → add to `.env`
8. Click "Install to Workspace"

---

## Checklist

- [ ] `SlackClient` uses `httpx.AsyncClient` with `Authorization: Bearer` header
- [ ] `SlackClient.post()` checks `data["ok"]` and raises `ValueError` if false
- [ ] `SlackService.send_message()` builds correct payload for `chat.postMessage`
- [ ] `SlackService.send_message()` includes `thread_ts` only when provided
- [ ] `SlackSendMessageNode` validates `channel` and `text` before calling service
- [ ] `SlackSendMessageNode` checks `context.credentials.get("slack_oauth")`
- [ ] `SlackSendMessageNode` returns `NodeResult(success=False)` on Slack API error (not crash)
- [ ] `SlackSendMessageNode` returns `ts`, `channel`, `message` in output
- [ ] Node registered in backend `node_registry`
- [ ] Node registered in frontend `NODE_REGISTRY`
- [ ] `type` string identical: `"action.slack_send_message"` in both files
- [ ] Slack app created with correct scopes and redirect URL
- [ ] `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in `.env`
- [ ] `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` added to `config.py` Settings class
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
# 1. Connect Slack via OAuth
curl localhost:8000/api/v1/credentials/oauth/slack/url \
  -H "Authorization: Bearer $TOKEN"
# → {"url":"https://slack.com/oauth/v2/authorize?..."}
# Open URL in browser → authorize → redirected back → credential stored

# 2. Verify credential stored
curl localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN"
# → [{"name":"Slack Account","type":"slack_oauth",...}]

# 3. Create workflow with Slack node
curl -X POST localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send Slack Message",
    "graph": {
      "nodes": [
        {"id":"n1","type":"action.slack_send_message","position":{"x":0,"y":0},
         "data":{"properties":{"channel":"#general","text":"Hello from Fuse!"}}}
      ],
      "edges": []
    }
  }'

# 4. Run it
curl -X POST localhost:8000/api/v1/workflows/{id}/run \
  -H "Authorization: Bearer $TOKEN"

# 5. Verify execution
curl localhost:8000/api/v1/executions/{exec_id} \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"completed","output_data":{"ts":"...","channel":"..."}}

# 6. Check Slack — real message received in #general
```

---

## Common Mistakes

- `SlackClient` not checking `data["ok"]` — Slack returns 200 even for errors
- `access_token` field name: Slack v2 OAuth stores it under `authed_user.access_token` OR `access_token` depending on the flow. Check what your `oauth.py` stores.
- Channel must be channel ID (e.g., `C1234567890`) not name (`#general`) for programmatic use — though Slack also accepts names starting with `#`
- Credential not loaded into `NodeContext.credentials` — verify Phase 7 injection is working
- `SLACK_CLIENT_ID` in `.env` but not in `Settings` class → `AttributeError` at runtime
