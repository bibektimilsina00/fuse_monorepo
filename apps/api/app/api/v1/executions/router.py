from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import get_db

router = APIRouter()


@router.get("/")
async def list_executions(db: AsyncSession = Depends(get_db)):
    return []


@router.get("/{execution_id}")
async def get_execution(execution_id: str, db: AsyncSession = Depends(get_db)):
    return {"id": execution_id}
