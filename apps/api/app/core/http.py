import httpx
from typing import Optional

class HttpClientManager:
    _instance: Optional[httpx.AsyncClient] = None

    @classmethod
    async def get_client(cls) -> httpx.AsyncClient:
        if cls._instance is None or cls._instance.is_closed:
            cls._instance = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
            )
        return cls._instance

    @classmethod
    async def close_client(cls):
        if cls._instance and not cls._instance.is_closed:
            await cls._instance.aclose()
            cls._instance = None

# Helper to get the shared client
async def get_http_client() -> httpx.AsyncClient:
    return await HttpClientManager.get_client()
