from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import get_db
from apps.api.app.core.logger import get_logger
from apps.api.app.services.workflow_service import WorkflowService

logger = get_logger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/{path}")
async def handle_generic_webhook(
    path: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle generic webhooks by path.
    Finds all workflows with a Webhook Trigger node matching this path.
    """
    try:
        payload = await request.json()
    except Exception:
        # Fallback to empty dict if not JSON
        payload = {}

    logger.info(f"Received generic webhook for path: {path}")

    service = WorkflowService(db)
    execution_ids = await service.trigger_workflows(
        trigger_type="trigger.webhook",
        trigger_data=payload,
        property_filters={"path": path},
    )

    return {
        "status": "ok",
        "triggered_count": len(execution_ids),
        "execution_ids": [str(eid) for eid in execution_ids],
    }
