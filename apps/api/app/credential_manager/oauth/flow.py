from apps.api.app.core.config import settings
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

REDIRECT_URI = "http://localhost:8000/api/v1/credentials/oauth/{service}/callback"


class SlackOAuthProvider:
    def get_authorization_url(self, state: str) -> str:
        from urllib.parse import urlencode
        params = urlencode({
            "client_id": settings.SLACK_CLIENT_ID,
            "scope": "chat:write,channels:read",
            "redirect_uri": REDIRECT_URI.format(service="slack"),
            "state": state,
        })
        return f"https://slack.com/oauth/v2/authorize?{params}"

    async def exchange_code(self, code: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://slack.com/api/oauth.v2.access",
                data={
                    "client_id": settings.SLACK_CLIENT_ID,
                    "client_secret": settings.SLACK_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": REDIRECT_URI.format(service="slack"),
                },
            )
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Slack OAuth failed: {data.get('error')}")
        
        # Structure the token data
        return {
            "access_token": data["authed_user"]["access_token"],
            "team_id": data["team"]["id"],
            "team_name": data["team"]["name"],
        }


PROVIDERS = {
    "slack": SlackOAuthProvider(),
}


def get_oauth_provider(service_name: str):
    return PROVIDERS.get(service_name)
