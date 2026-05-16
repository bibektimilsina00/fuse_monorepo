
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.core.database import get_db
from apps.api.app.core.logger import get_logger
from apps.api.app.credential_manager.encryption.aes import AESEncryptionService
from apps.api.app.integrations.slack.service import SlackService
from apps.api.app.models.user import User
from apps.api.app.repositories.credential_repository import CredentialRepository

logger = get_logger(__name__)
router = APIRouter()

async def get_slack_service(
    credential: str | None = None,
    bot_token: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SlackService:
    if bot_token:
        return SlackService(access_token=bot_token)
    
    if credential:
        repo = CredentialRepository(db)
        import uuid
        cred = await repo.get_by_id_and_user(uuid.UUID(credential), current_user.id)
        if not cred or cred.type != "slack_oauth":
            raise HTTPException(status_code=404, detail="Slack credential not found")
        
        encryption_service = AESEncryptionService()
        import json
        decrypted_data = json.loads(encryption_service.decrypt(cred.encrypted_data))
        token = decrypted_data.get("access_token")
        if not token:
            raise HTTPException(status_code=400, detail="Access token missing in credential")
            
        return SlackService(access_token=token)
    
    raise HTTPException(status_code=400, detail="Either credential_id or bot_token must be provided")

@router.get("/channels")
async def list_slack_channels(
    credential: str | None = Query(None),
    bot_token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        service = await get_slack_service(credential, bot_token, db, current_user)
        data = await service.list_channels(limit=1000)
        if not data.get("ok"):
            return {"ok": False, "error": data.get("error")}
        
        channels = [
            {"label": f"#{c['name']}", "value": c['id']}
            for c in data.get("channels", [])
        ]
        return {"ok": True, "data": channels}
    except Exception as e:
        logger.error(f"Failed to list slack channels: {e}")
        return {"ok": False, "error": str(e)}

@router.get("/users")
async def list_slack_users(
    credential: str | None = Query(None),
    bot_token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        service = await get_slack_service(credential, bot_token, db, current_user)
        data = await service.list_users(limit=1000)
        if not data.get("ok"):
            return {"ok": False, "error": data.get("error")}
        
        users = [
            {"label": f"@{u.get('real_name') or u['name']}", "value": u['id']}
            for u in data.get("members", [])
            if not u.get("deleted") and not u.get("is_bot")
        ]
        return {"ok": True, "data": users}
    except Exception as e:
        logger.error(f"Failed to list slack users: {e}")
        return {"ok": False, "error": str(e)}
