from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.integrations.slack import router as slack_router
from apps.api.app.core.database import get_db

router = APIRouter()

router.include_router(slack_router, prefix="/slack", tags=["integrations"])


@router.get("/")
async def list_integrations(db: AsyncSession = Depends(get_db)):
    return []
