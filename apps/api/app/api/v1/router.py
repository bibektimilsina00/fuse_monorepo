from fastapi import APIRouter

from apps.api.app.api.v1.ai.router import router as ai_router
from apps.api.app.api.v1.auth.router import router as auth_router
from apps.api.app.api.v1.credentials.router import router as credentials_router
from apps.api.app.api.v1.executions.router import router as executions_router
from apps.api.app.api.v1.folders.router import router as folders_router
from apps.api.app.api.v1.integrations.router import router as integrations_router
from apps.api.app.api.v1.nodes.router import router as nodes_router
from apps.api.app.api.v1.triggers.webhook_handler import router as webhooks_router
from apps.api.app.api.v1.websocket.router import router as websocket_router
from apps.api.app.api.v1.workflows.router import router as workflows_router
from apps.api.app.api.v1.assets.router import router as assets_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(workflows_router, prefix="/workflows", tags=["workflows"])
router.include_router(folders_router, prefix="/folders", tags=["folders"])
router.include_router(executions_router, prefix="/executions", tags=["executions"])
router.include_router(credentials_router, prefix="/credentials", tags=["credentials"])
router.include_router(integrations_router, prefix="/integrations", tags=["integrations"])
router.include_router(websocket_router, prefix="/ws", tags=["realtime"])
router.include_router(ai_router, prefix="/ai", tags=["ai"])
router.include_router(nodes_router, prefix="/nodes", tags=["nodes"])
router.include_router(assets_router, prefix="/assets", tags=["assets"])
router.include_router(webhooks_router)
