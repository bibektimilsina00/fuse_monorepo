from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.credential_manager.oauth.flow import get_oauth_provider
from apps.api.app.models.user import User
from apps.api.app.services.credential_service import CredentialService


async def handle_oauth_callback(
    service_name: str,
    code: str,
    user: User,
    db: AsyncSession,
    custom_name: str | None = None,
    custom_description: str | None = None,
    code_verifier: str | None = None,
):
    provider = get_oauth_provider(service_name)
    if not provider:
        raise ValueError(f"Unknown OAuth service: {service_name}")

    token_data = await provider.exchange_code(code, code_verifier=code_verifier)

    service = CredentialService(db)

    # Use custom name if provided, otherwise fallback to default
    final_name = custom_name or f"{service_name.capitalize()} Account"

    await service.store_credential(
        name=final_name,
        type=f"{service_name}_oauth",
        data=token_data,
        user=user,
        meta={
            "description": custom_description,
            "team_name": token_data.get("team_name"),
            "team_id": token_data.get("team_id"),
        },
    )
