import json
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.credential_manager.encryption.aes import encryption_service
from apps.api.app.models.credential import Credential
from apps.api.app.models.user import User
from apps.api.app.repositories.credential_repository import CredentialRepository


class CredentialService:
    def __init__(self, db: AsyncSession):
        self.repo = CredentialRepository(db)

    async def list_credentials(self, user: User) -> list[Credential]:
        return await self.repo.list_by_user(user.id)

    async def store_credential(
        self,
        name: str,
        type: str,
        data: dict,
        user: User,
        meta: Optional[dict] = None,
    ) -> Credential:
        encrypted_data = encryption_service.encrypt(json.dumps(data))
        credential = Credential(
            user_id=user.id,
            name=name,
            type=type,
            encrypted_data=encrypted_data,
            meta=meta,
        )
        return await self.repo.create(credential)

    async def get_decrypted(self, credential_id: uuid.UUID, user: User) -> dict:
        credential = await self.repo.get_by_id_and_user(credential_id, user.id)
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found",
            )
        decrypted_json = encryption_service.decrypt(credential.encrypted_data)
        return json.loads(decrypted_json)

    async def get_decrypted_by_type(self, credential_type: str, user_id: uuid.UUID) -> Optional[dict]:
        """Used by execution engine to inject credentials into NodeContext."""
        # For execution engine, we might need a fresh session or use the one provided
        # Here we assume the service is initialized with a session
        credential = await self.repo.get_by_type_and_user(credential_type, user_id)
        if not credential:
            return None
        decrypted_json = encryption_service.decrypt(credential.encrypted_data)
        return json.loads(decrypted_json)

    async def delete_credential(self, credential_id: uuid.UUID, user: User) -> None:
        credential = await self.repo.get_by_id_and_user(credential_id, user.id)
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Credential not found",
            )
        await self.repo.delete(credential)
