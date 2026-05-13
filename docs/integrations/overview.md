# Integrations

An integration connects Fuse to an external service. Each lives in:

```
apps/api/app/integrations/{service}/
├── __init__.py     # barrel: exports Service + Client
├── client.py       # httpx HTTP wrapper — no business logic
├── service.py      # business logic — delegates HTTP to client
└── oauth.py        # OAuth provider config (if OAuth service)
```

## Existing Integrations

| Service | Credential type | Status |
|---|---|---|
| Slack | `slack_oauth` | Scaffold |
| GitHub | `github_oauth` | Scaffold |
| Discord | `discord_oauth` | Scaffold |
| Gmail | `google_oauth` | Empty scaffold |
| Notion | `notion_oauth` | Empty scaffold |
| OpenAI | `openai_api_key` | Empty scaffold |
| Telegram | `telegram_bot_token` | Empty scaffold |

## Client Pattern

`client.py` — thin HTTP wrapper only. Never put business logic here.

```python
import httpx
from typing import Any, Dict, Optional

class SlackClient:
    def __init__(self, access_token: str):
        self._client = httpx.AsyncClient(
            base_url='https://slack.com/api',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=30.0,
        )

    async def post(self, path: str, json: Optional[Dict] = None) -> Dict[str, Any]:
        response = await self._client.post(path, json=json)
        response.raise_for_status()
        return response.json()

    async def get(self, path: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        response = await self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()
```

**Rules:**
- `httpx.AsyncClient` only — never `requests`
- Set `timeout` on the client
- Always call `raise_for_status()`
- No business logic — HTTP only

## Service Pattern

`service.py` — business logic, delegates HTTP to client.

```python
from apps.api.app.integrations.slack.client import SlackClient

class SlackService:
    def __init__(self, access_token: str):
        self._client = SlackClient(access_token=access_token)

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: str | None = None,
    ) -> dict:
        payload: dict = {'channel': channel, 'text': text}
        if thread_ts:
            payload['thread_ts'] = thread_ts
        return await self._client.post('/chat.postMessage', json=payload)
```

## Credential Types

| Pattern | Auth method |
|---|---|
| `{service}_oauth` | OAuth 2.0 (Slack, GitHub, Google, etc.) |
| `{service}_api_key` | API key header (OpenAI, Anthropic, etc.) |
| `{service}_bot_token` | Bot token (Telegram, Discord bots) |

## Registry

Register the service in `apps/api/app/integrations/registry.py`:

```python
from apps.api.app.integrations.slack import SlackService

INTEGRATION_REGISTRY = {
    'slack': SlackService,
}
```

See [adding-integrations.md](adding-integrations.md) for the full guide.
