from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db

router = APIRouter()


@router.get("/")
async def list_credentials(db: AsyncSession = Depends(get_db)):
    return []
