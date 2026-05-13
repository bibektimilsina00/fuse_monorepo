import httpx
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger("fuse.integration.http")

class IntegrationHTTPClient:
    def __init__(self, base_url: Optional[str] = None, headers: Optional[Dict[str, str]] = None):
        self.client = httpx.AsyncClient(base_url=base_url or "", headers=headers or {})

    async def request(self, method: str, url: str, **kwargs) -> Dict[str, Any]:
        try:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP Error: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request Error: {str(e)}")
            raise

    async def close(self):
        await self.client.aclose()
