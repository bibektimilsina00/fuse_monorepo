import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from apps.api.app.core.database import get_db
from apps.api.app.core.config import settings
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.asset import Asset

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    asset_id = uuid.uuid4()
    file_extension = os.path.splitext(file.filename or "")[1]
    file_name = f"{asset_id}{file_extension}"
    file_path = UPLOAD_DIR / file_name

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")

    asset = Asset(
        id=asset_id,
        name=file.filename,
        file_path=str(file_path),
        file_type=file.content_type,
        file_size=os.path.getsize(file_path),
        user_id=current_user.id
    )

    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return {
        "id": str(asset.id),
        "name": asset.name,
        "type": asset.file_type,
        "size": asset.file_size,
        "url": f"/api/v1/assets/{asset.id}/view"
    }

@router.get("/{asset_id}/view")
async def view_asset(
    asset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    asset = await db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    from fastapi.responses import FileResponse
    return FileResponse(str(asset.file_path), media_type=str(asset.file_type), filename=str(asset.name))
