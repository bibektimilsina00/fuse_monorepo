from fastapi import APIRouter

from apps.api.app.api.v1.router import router as v1_router
from apps.api.app.core.config import settings

router = APIRouter()

router.include_router(v1_router, prefix=settings.API_V1_STR)
