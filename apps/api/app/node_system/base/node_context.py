from dataclasses import dataclass
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class NodeContext:
    execution_id: str
    workflow_id: str
    node_id: str
    variables: dict[str, Any]
    credentials: list[dict[str, Any]]
    http_client: httpx.AsyncClient
    db: AsyncSession | None = None
