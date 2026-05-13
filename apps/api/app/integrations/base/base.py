from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class BaseIntegration(ABC):
    def __init__(self, credentials: Dict[str, Any] = None):
        self.credentials = credentials or {}

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique ID for the provider (e.g. 'slack')"""
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        """Verify if credentials are valid"""
        pass

class OAuthIntegration(BaseIntegration):
    @abstractmethod
    async def refresh_token(self) -> Dict[str, Any]:
        """Refresh OAuth token using refresh_token"""
        pass

    @property
    def access_token(self) -> Optional[str]:
        return self.credentials.get("access_token")
