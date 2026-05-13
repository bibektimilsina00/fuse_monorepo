from abc import abstractmethod
from typing import Any, Dict, Optional
from apps.api.app.integrations.base.base_integration import BaseIntegration

class OAuthIntegration(BaseIntegration):
    def __init__(self, credentials: Dict[str, Any]):
        super().__init__(credentials)
        self.access_token = credentials.get("access_token")
        self.refresh_token = credentials.get("refresh_token")
        self.expires_at = credentials.get("expires_at")

    @abstractmethod
    async def refresh_access_token(self) -> Dict[str, Any]:
        """Logic to refresh OAuth token"""
        pass

    async def get_valid_token(self) -> str:
        # Check if expired and refresh if necessary
        # Simplified for now
        return self.access_token
