import secrets
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.core.database import get_db
from apps.api.app.models.user import User
from apps.api.app.schemas.credential import (
    CredentialCreate,
    CredentialOut,
    OAuthUrlResponse,
)
from apps.api.app.services.credential_service import CredentialService

router = APIRouter()


@router.get("/", response_model=List[CredentialOut])
async def list_credentials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CredentialService(db)
    return await service.list_credentials(current_user)


@router.post("/", response_model=CredentialOut, status_code=status.HTTP_201_CREATED)
async def create_credential(
    data: CredentialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CredentialService(db)
    return await service.store_credential(
        name=data.name,
        type=data.type,
        data=data.data,
        user=current_user,
    )


@router.delete("/{credential_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_credential(
    credential_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CredentialService(db)
    await service.delete_credential(credential_id, current_user)


@router.get("/oauth/{service_name}/url", response_model=OAuthUrlResponse)
async def get_oauth_url(
    service_name: str,
    current_user: User = Depends(get_current_user),
):
    # This will be implemented fully when providers are added
    # For now, returning a mock or placeholder logic as per plan
    try:
        from apps.api.app.credential_manager.oauth.flow import get_oauth_provider
        provider = get_oauth_provider(service_name)
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown OAuth service: {service_name}",
            )

        state = secrets.token_urlsafe(32)
        url = provider.get_authorization_url(state=state)
        return OAuthUrlResponse(url=url, state=state)
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth flow not yet implemented",
        )


@router.get("/oauth/{service_name}/callback")
async def oauth_callback(
    service_name: str,
    code: str,
    state: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        from apps.api.app.credential_manager.oauth.callback import handle_oauth_callback
        await handle_oauth_callback(
            service_name=service_name,
            code=code,
            user=current_user,
            db=db,
        )
        # Redirect back to frontend credentials page
        return RedirectResponse(url="http://localhost:5173/credentials")
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="OAuth callback not yet implemented",
        )
