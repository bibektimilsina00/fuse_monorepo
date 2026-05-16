from apps.api.app.core.config import settings
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

REDIRECT_URI = "http://localhost:8000/api/v1/credentials/oauth/{service}/callback"


class SlackOAuthProvider:
    id = "slack_oauth"
    name = "Slack"
    type = "oauth"
    description = "Connect to your Slack workspace using OAuth 2.0"
    icon_url = "https://cdn.brandfetch.io/slack.com/icon"
    scopes = [
        "Send messages to channels",
        "View basic profile information",
        "Read messages from public channels"
    ]

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
        
        return {
            "access_token": data["authed_user"]["access_token"],
            "team_id": data["team"]["id"],
            "team_name": data["team"]["name"],
        }


class GitHubOAuthProvider:
    id = "github_oauth"
    name = "GitHub"
    type = "oauth"
    description = "Connect to GitHub using OAuth 2.0"
    icon_url = "https://cdn.brandfetch.io/github.com/icon"
    scopes = [
        "Full access to public and private repositories",
        "Read-only access to user profile information",
        "Manage organization memberships"
    ]

    def get_authorization_url(self, state: str) -> str:
        from urllib.parse import urlencode
        params = urlencode({
            "client_id": settings.GITHUB_CLIENT_ID,
            "scope": "repo,user",
            "redirect_uri": REDIRECT_URI.format(service="github"),
            "state": state,
        })
        return f"https://github.com/login/oauth/authorize?{params}"

    async def exchange_code(self, code: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": REDIRECT_URI.format(service="github"),
                },
            )
        data = response.json()
        if "error" in data:
            raise ValueError(f"GitHub OAuth failed: {data.get('error_description')}")
        
        return {
            "access_token": data["access_token"],
            "token_type": data["token_type"],
            "scope": data["scope"],
        }


PROVIDERS = {
    "slack": SlackOAuthProvider(),
    "github": GitHubOAuthProvider(),
}


def get_oauth_provider(service_name: str):
    return PROVIDERS.get(service_name)
