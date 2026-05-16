import httpx
from typing import Any, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

SLACK_BASE_URL = "https://slack.com/api"


class SlackClient:
    def __init__(self, access_token: str, client: Optional[httpx.AsyncClient] = None):
        self._access_token = access_token
        self._external_client = client
        self._client = client or httpx.AsyncClient(
            base_url=SLACK_BASE_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def post(self, path: str, json: Optional[dict] = None) -> dict[str, Any]:
        # If using external client, we must set headers manually as it doesn't have the Slack-specific ones
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
        
        if self._external_client:
            # Construct full URL for external client
            url = f"{SLACK_BASE_URL}{path}"
            response = await self._external_client.post(url, json=json, headers=headers)
        else:
            response = await self._client.post(path, json=json)
            
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
        return data

    async def get(self, path: str, params: Optional[dict] = None) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
        
        if self._external_client:
            url = f"{SLACK_BASE_URL}{path}"
            response = await self._external_client.get(url, params=params, headers=headers)
        else:
            response = await self._client.get(path, params=params)
            
        response.raise_for_status()
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
        return data

    async def close(self):
        if not self._external_client:
            await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
