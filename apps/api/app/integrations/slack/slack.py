from apps.api.app.integrations.base.base import OAuthIntegration
import httpx
from typing import Any, Dict

class SlackIntegration(OAuthIntegration):
    provider_id = "slack"

    async def test_connection(self) -> bool:
        if not self.access_token:
            return False
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://slack.com/api/auth.test",
                headers={"Authorization": f"Bearer {self.access_token}"}
            )
            return response.json().get("ok", False)

    async def refresh_token(self) -> Dict[str, Any]:
        # Implementation for OAuth token refresh via Slack API
        return {"access_token": "new_mock_token"}

    async def send_message(self, channel: str, text: str):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {self.access_token}"},
                json={"channel": channel, "text": text}
            )
            response.raise_for_status()
            return response.json()
