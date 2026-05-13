from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseIntegration(ABC):
    def __init__(self, credentials: Dict[str, Any]):
        self.credentials = credentials

    @property
    @abstractmethod
    def provider_id(self) -> str:
        pass

    @abstractmethod
    async def test_connection(self) -> bool:
        pass
