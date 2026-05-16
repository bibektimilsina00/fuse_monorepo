import asyncio

import httpx


class HttpClientManager:
    _instance: httpx.AsyncClient | None = None
    _loop: asyncio.AbstractEventLoop | None = None

    @classmethod
    async def get_client(cls) -> httpx.AsyncClient:
        current_loop = asyncio.get_running_loop()

        # If no instance, or instance is closed, or loop has changed
        if cls._instance is None or cls._instance.is_closed or cls._loop != current_loop:
            # Close old client if loop changed but client not closed
            if cls._instance and not cls._instance.is_closed:
                # We can't safely aclose() if the old loop is closed
                # so we just drop it and create a new one for the new loop
                cls._instance = None

            cls._instance = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            )
            cls._loop = current_loop

        return cls._instance

    @classmethod
    async def close_client(cls):
        if cls._instance and not cls._instance.is_closed:
            await cls._instance.aclose()
            cls._instance = None
            cls._loop = None


# Helper to get the shared client
async def get_http_client() -> httpx.AsyncClient:
    return await HttpClientManager.get_client()
