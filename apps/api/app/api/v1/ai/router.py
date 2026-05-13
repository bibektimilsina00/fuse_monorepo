from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def ai_status():
    return {"status": "ok"}
