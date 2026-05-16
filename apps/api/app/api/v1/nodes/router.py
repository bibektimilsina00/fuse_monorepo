from typing import Any

from fastapi import APIRouter

from apps.api.app.node_system.registry.registry import node_registry

router = APIRouter()


@router.get("/")
async def list_nodes() -> list[dict[str, Any]]:
    """
    List all available nodes and their metadata (properties, inputs, outputs).
    This endpoint is used by the frontend for dynamic node discovery.
    """
    return node_registry.list_nodes()
