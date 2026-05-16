import httpx
from typing import Optional, Any
from apps.api.app.integrations.slack.client import SlackClient
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SlackService:
    def __init__(self, access_token: str, client: Optional[httpx.AsyncClient] = None):
        self._client = SlackClient(access_token=access_token, client=client)

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
        blocks: Optional[list] = None,
        attachments: Optional[list] = None,
    ) -> dict:
        payload: dict = {"channel": channel, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks
        if attachments:
            payload["attachments"] = attachments
        return await self._client.post("/chat.postMessage", json=payload)

    async def send_ephemeral_message(
        self,
        channel: str,
        user: str,
        text: str,
        thread_ts: Optional[str] = None,
        blocks: Optional[list] = None,
    ) -> dict:
        payload: dict = {"channel": channel, "user": user, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks
        return await self._client.post("/chat.postEphemeral", json=payload)

    async def list_channels(self, limit: int = 100, types: str = "public_channel,private_channel") -> list:
        data = await self._client.get("/conversations.list", params={"limit": limit, "types": types})
        return data.get("channels", [])

    async def get_message(self, channel: str, ts: str) -> dict:
        data = await self._client.get("/conversations.replies", params={"channel": channel, "ts": ts, "limit": 1})
        messages = data.get("messages", [])
        return messages[0] if messages else {}

    async def create_channel(self, name: str, is_private: bool = False) -> dict:
        payload = {"name": name, "is_private": is_private}
        data = await self._client.post("/conversations.create", json=payload)
        return data.get("channel", {})

    async def get_user_info(self, user_id: str) -> dict:
        data = await self._client.get("/users.info", params={"user": user_id})
        return data.get("user", {})

    async def close(self):
        await self._client.close()
