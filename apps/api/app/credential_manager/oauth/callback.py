from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.models.user import User
from apps.api.app.services.credential_service import CredentialService
from apps.api.app.credential_manager.oauth.flow import get_oauth_provider


async def handle_oauth_callback(service_name: str, code: str, user: User, db: AsyncSession):
    provider = get_oauth_provider(service_name)
    if not provider:
        raise ValueError(f"Unknown OAuth service: {service_name}")

    token_data = await provider.exchange_code(code)

    service = CredentialService(db)
    await service.store_credential(
        name=f"{service_name.capitalize()} Account",
        type=f"{service_name}_oauth",
        data=token_data,
        user=user,
        meta={
            "team_name": token_data.get("team_name"),
            "team_id": token_data.get("team_id"),
        }
    )
