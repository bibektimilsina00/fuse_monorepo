import json
from typing import Any, Dict
from apps.api.app.credential_manager.encryption.aes import aes_service
from apps.api.app.models.credential import Credential
from apps.api.app.core.database import AsyncSessionLocal
from sqlalchemy import select

class VaultStorage:
    async def get_decrypted(self, credential_id: str) -> Dict[str, Any]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Credential).where(Credential.id == credential_id))
            credential = result.scalar_one_or_none()
            if not credential:
                raise ValueError("Credential not found")
            
            decrypted_str = aes_service.decrypt(credential.encrypted_data)
            return json.loads(decrypted_str)

    async def save_encrypted(self, name: str, type: str, data: Dict[str, Any], metadata: Dict[str, Any] = None):
        async with AsyncSessionLocal() as db:
            encrypted_data = aes_service.encrypt(json.dumps(data))
            credential = Credential(
                name=name,
                type=type,
                encrypted_data=encrypted_data,
                metadata=metadata
            )
            db.add(credential)
            await db.commit()
            await db.refresh(credential)
            return credential

vault_storage = VaultStorage()
