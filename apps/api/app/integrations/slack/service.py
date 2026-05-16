from typing import Any

import httpx

from apps.api.app.core.logger import get_logger
from apps.api.app.integrations.slack.client import SlackClient

logger = get_logger(__name__)


class SlackService:
    def __init__(self, access_token: str, client: httpx.AsyncClient | None = None):
        self._client = SlackClient(access_token=access_token, client=client)

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: str | None = None,
        blocks: list | None = None,
        attachments: list | None = None,
    ) -> dict:
        payload: dict = {"channel": channel, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks
        if attachments:
            payload["attachments"] = attachments
        return await self._client.post("/chat.postMessage", json=payload)

    async def update_message(
        self,
        channel: str,
        ts: str,
        text: str | None = None,
        blocks: list | None = None,
    ) -> dict:
        payload: dict = {"channel": channel, "ts": ts}
        if text:
            payload["text"] = text
        if blocks:
            payload["blocks"] = blocks
        return await self._client.post("/chat.update", json=payload)

    async def delete_message(self, channel: str, ts: str) -> dict:
        return await self._client.post("/chat.delete", json={"channel": channel, "ts": ts})

    async def send_ephemeral_message(
        self,
        channel: str,
        user: str,
        text: str,
        thread_ts: str | None = None,
        blocks: list | None = None,
    ) -> dict:
        payload: dict = {"channel": channel, "user": user, "text": text}
        if thread_ts:
            payload["thread_ts"] = thread_ts
        if blocks:
            payload["blocks"] = blocks
        return await self._client.post("/chat.postEphemeral", json=payload)

    async def list_channels(self, limit: int = 100, types: str = "public_channel,private_channel", cursor: str | None = None) -> dict:
        params = {"limit": limit, "types": types}
        if cursor:
            params["cursor"] = cursor
        return await self._client.get("/conversations.list", params=params)

    async def get_channel_info(self, channel: str, include_num_members: bool = True) -> dict:
        return await self._client.get("/conversations.info", params={"channel": channel, "include_num_members": str(include_num_members).lower()})

    async def list_members(self, channel: str, limit: int = 100, cursor: str | None = None) -> dict:
        params = {"channel": channel, "limit": limit}
        if cursor:
            params["cursor"] = cursor
        return await self._client.get("/conversations.members", params=params)

    async def get_message(self, channel: str, ts: str) -> dict:
        data = await self._client.get("/conversations.replies", params={"channel": channel, "ts": ts, "limit": 1})
        messages = data.get("messages", [])
        return messages[0] if messages else {}

    async def create_channel(self, name: str, is_private: bool = False) -> dict:
        payload = {"name": name, "is_private": is_private}
        data = await self._client.post("/conversations.create", json=payload)
        return data.get("channel", {})

    async def invite_to_channel(self, channel: str, users: list[str]) -> dict:
        return await self._client.post("/conversations.invite", json={"channel": channel, "users": ",".join(users)})

    async def list_users(self, limit: int = 100, cursor: str | None = None, include_deleted: bool = False) -> dict:
        params = {"limit": limit, "include_locale": "false"}
        if cursor:
            params["cursor"] = cursor
        return await self._client.get("/users.list", params=params)

    async def get_user_info(self, user_id: str) -> dict:
        data = await self._client.get("/users.info", params={"user": user_id})
        return data.get("user", {})

    async def get_user_presence(self, user_id: str) -> dict:
        return await self._client.get("/users.getPresence", params={"user": user_id})

    async def add_reaction(self, channel: str, timestamp: str, name: str) -> dict:
        return await self._client.post("/reactions.add", json={"channel": channel, "timestamp": timestamp, "name": name})

    async def remove_reaction(self, channel: str, timestamp: str, name: str) -> dict:
        return await self._client.post("/reactions.remove", json={"channel": channel, "timestamp": timestamp, "name": name})

    # Views / Modals
    async def open_view(self, trigger_id: str, view: dict) -> dict:
        return await self._client.post("/views.open", json={"trigger_id": trigger_id, "view": view})

    async def push_view(self, trigger_id: str, view: dict) -> dict:
        return await self._client.post("/views.push", json={"trigger_id": trigger_id, "view": view})

    async def update_view(self, view: dict, view_id: str | None = None, external_id: str | None = None, hash: str | None = None) -> dict:
        payload: dict[str, Any] = {"view": view}
        if view_id: payload["view_id"] = view_id
        if external_id: payload["external_id"] = external_id
        if hash: payload["hash"] = hash
        return await self._client.post("/views.update", json=payload)

    async def publish_view(self, user_id: str, view: dict, hash: str | None = None) -> dict:
        payload: dict[str, Any] = {"user_id": user_id, "view": view}
        if hash: payload["hash"] = hash
        return await self._client.post("/views.publish", json=payload)

    async def upload_file(self, channels: str, file: str | bytes, filename: str | None = None, title: str | None = None, initial_comment: str | None = None) -> dict:
        """
        Upload a file to Slack using files.upload (legacy but simpler for small files).
        """
        files = {}
        if isinstance(file, str):
            files["file"] = open(file, "rb")
        else:
            files["file"] = (filename or "file", file)
            
        data = {
            "channels": channels,
        }
        if initial_comment:
            data["initial_comment"] = initial_comment
        if title:
            data["title"] = title
            
        return await self._client.post("/files.upload", data=data, files=files)

    async def close(self):
        await self._client.close()
