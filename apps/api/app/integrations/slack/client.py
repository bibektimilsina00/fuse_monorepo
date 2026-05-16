from typing import Any

import httpx

from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

SLACK_BASE_URL = "https://slack.com/api"


class SlackClient:
    def __init__(self, access_token: str, client: httpx.AsyncClient | None = None):
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

    async def post(
        self,
        path: str,
        json: dict | None = None,
        data: dict | None = None,
        files: dict | None = None,
    ) -> dict[str, Any]:
        # If using external client, we must set headers manually
        headers = {
            "Authorization": f"Bearer {self._access_token}",
        }

        # Only add application/json if we are sending json
        if json is not None:
            headers["Content-Type"] = "application/json"

        if self._external_client:
            # Construct full URL for external client
            url = f"{SLACK_BASE_URL}{path}"
            response = await self._external_client.post(
                url, json=json, data=data, files=files, headers=headers
            )
        else:
            # If using internal client, we might need to override headers if they were set in __init__
            # But httpx handles multipart headers automatically if Content-Type is not set in call
            # Our internal client HAS Content-Type: application/json in headers
            # So we must use the external_client style or recreate client
            response = await self._client.post(
                path, json=json, data=data, files=files, headers=headers
            )

        response.raise_for_status()
        res_data = response.json()
        if not res_data.get("ok"):
            raise ValueError(f"Slack API error: {res_data.get('error', 'unknown')}")
        return res_data

    async def get(self, path: str, params: dict | None = None) -> dict[str, Any]:
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
