# Phase 11 — More Integrations

**Status: ⬜ Not Started**

---

## Goal

GitHub and Notion integrations fully working. Pattern established for adding any future integration.

## Prerequisites

- Phase 8 complete (Slack integration pattern understood)
- GitHub OAuth app created
- Notion integration created

---

## Integration Pattern (copy for every new integration)

For each integration, create these files:
```
apps/api/app/integrations/{service}/
├── __init__.py      → export Service + Client
├── client.py        → httpx.AsyncClient wrapper
├── service.py       → business logic methods
└── oauth.py         → OAuth provider (or api_key.py for API key)

apps/api/app/node_system/builtins/{service}_{action}.py
packages/node-definitions/src/{service}.ts
```

Register in:
- Backend: `apps/api/app/node_system/registry/registry.py`
- Frontend: `packages/node-definitions/src/registry.ts`
- OAuth: `apps/api/app/credential_manager/oauth/flow.py` PROVIDERS dict

---

## Integration 1: GitHub

### Nodes to build:
1. `action.github_create_issue` — create issue in a repo
2. `action.github_list_issues` — list open issues
3. `action.github_add_comment` — add comment to issue

### GitHub OAuth Scopes needed:
- `repo` (for private repos) or `public_repo` (for public only)
- `issues` (create/manage issues)

### Step 1: GitHub Client — `apps/api/app/integrations/github/client.py`

```python
import httpx
from typing import Any, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

GITHUB_BASE_URL = "https://api.github.com"


class GitHubClient:
    def __init__(self, access_token: str):
        self._client = httpx.AsyncClient(
            base_url=GITHUB_BASE_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=30.0,
        )

    async def get(self, path: str, params: Optional[dict] = None) -> Any:
        response = await self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    async def post(self, path: str, json: Optional[dict] = None) -> Any:
        response = await self._client.post(path, json=json)
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self._client.aclose()
```

### Step 2: GitHub Service — `apps/api/app/integrations/github/service.py`

```python
from typing import Optional, List
from apps.api.app.integrations.github.client import GitHubClient
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class GitHubService:
    def __init__(self, access_token: str):
        self._client = GitHubClient(access_token=access_token)

    async def create_issue(self, owner: str, repo: str, title: str, body: Optional[str] = None, labels: Optional[List[str]] = None) -> dict:
        return await self._client.post(
            f"/repos/{owner}/{repo}/issues",
            json={"title": title, "body": body, "labels": labels or []},
        )

    async def list_issues(self, owner: str, repo: str, state: str = "open", limit: int = 30) -> list:
        return await self._client.get(
            f"/repos/{owner}/{repo}/issues",
            params={"state": state, "per_page": min(limit, 100)},
        )

    async def add_comment(self, owner: str, repo: str, issue_number: int, body: str) -> dict:
        return await self._client.post(
            f"/repos/{owner}/{repo}/issues/{issue_number}/comments",
            json={"body": body},
        )

    async def get_repo(self, owner: str, repo: str) -> dict:
        return await self._client.get(f"/repos/{owner}/{repo}")
```

### Step 3: GitHub Create Issue Node — `apps/api/app/node_system/builtins/github_create_issue.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class GitHubCreateIssueNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.github_create_issue",
            name="GitHub: Create Issue",
            category="integration",
            description="Create a new issue in a GitHub repository",
            properties=[
                {"name": "credential", "label": "GitHub Account", "type": "credential",
                 "credentialType": "github_oauth", "required": True},
                {"name": "owner", "label": "Owner (user or org)", "type": "string", "required": True,
                 "placeholder": "octocat"},
                {"name": "repo", "label": "Repository", "type": "string", "required": True,
                 "placeholder": "hello-world"},
                {"name": "title", "label": "Issue Title", "type": "string", "required": True},
                {"name": "body", "label": "Issue Body", "type": "string", "required": False},
                {"name": "labels", "label": "Labels (comma-separated)", "type": "string",
                 "required": False, "mode": "advanced"},
            ],
            inputs=1,
            outputs=1,
            credential_type="github_oauth",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            owner = self.properties.get("owner", "").strip()
            repo = self.properties.get("repo", "").strip()
            title = self.properties.get("title")
            body = self.properties.get("body")
            labels_str = self.properties.get("labels", "")

            if not owner or not repo:
                return NodeResult(success=False, error="owner and repo are required")
            if not title:
                return NodeResult(success=False, error="title is required")

            credential = context.credentials.get("github_oauth")
            if not credential:
                return NodeResult(success=False, error="GitHub credential not found")

            labels = [l.strip() for l in labels_str.split(",") if l.strip()] if labels_str else []

            from apps.api.app.integrations.github.service import GitHubService
            service = GitHubService(access_token=credential.get("access_token"))
            issue = await service.create_issue(owner=owner, repo=repo, title=title, body=body, labels=labels)

            return NodeResult(
                success=True,
                output_data={
                    "issue_number": issue.get("number"),
                    "issue_id": issue.get("id"),
                    "title": issue.get("title"),
                    "url": issue.get("html_url"),
                    "state": issue.get("state"),
                },
            )
        except Exception as e:
            logger.error(f"GitHubCreateIssueNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

### Step 4: Register GitHub Nodes

Add OAuth provider to `flow.py`:
```python
class GitHubOAuthProvider:
    def get_authorization_url(self, state: str) -> str:
        from urllib.parse import urlencode
        params = urlencode({
            "client_id": settings.GITHUB_CLIENT_ID,
            "scope": "repo,issues",
            "state": state,
            "redirect_uri": REDIRECT_URI.format(service="github"),
        })
        return f"https://github.com/login/oauth/authorize?{params}"

    async def exchange_code(self, code: str) -> dict:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                },
                headers={"Accept": "application/json"},
            )
        data = response.json()
        if "error" in data:
            raise ValueError(f"GitHub OAuth error: {data['error_description']}")
        return {"access_token": data["access_token"], "scope": data.get("scope", "")}

PROVIDERS["github"] = GitHubOAuthProvider()
```

Add to `registry.py`:
```python
from apps.api.app.node_system.builtins.github_create_issue import GitHubCreateIssueNode
node_registry.register(GitHubCreateIssueNode)
```

Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `config.py` Settings.

---

## Integration 2: Notion

### Nodes to build:
1. `action.notion_create_page` — create a page in a database

### Notion Auth: API Key (not OAuth for simplicity — use internal integration token)

### Notion Client — `apps/api/app/integrations/notion/client.py`

```python
import httpx
from typing import Any, Optional
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

NOTION_BASE_URL = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


class NotionClient:
    def __init__(self, api_key: str):
        self._client = httpx.AsyncClient(
            base_url=NOTION_BASE_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def post(self, path: str, json: Optional[dict] = None) -> Any:
        response = await self._client.post(path, json=json)
        response.raise_for_status()
        return response.json()

    async def get(self, path: str) -> Any:
        response = await self._client.get(path)
        response.raise_for_status()
        return response.json()
```

### Notion Service — `apps/api/app/integrations/notion/service.py`

```python
from apps.api.app.integrations.notion.client import NotionClient


class NotionService:
    def __init__(self, api_key: str):
        self._client = NotionClient(api_key=api_key)

    async def create_page(self, database_id: str, title: str, properties: dict = None) -> dict:
        return await self._client.post("/pages", json={
            "parent": {"database_id": database_id},
            "properties": {
                "title": {
                    "title": [{"type": "text", "text": {"content": title}}]
                },
                **(properties or {}),
            },
        })

    async def get_database(self, database_id: str) -> dict:
        return await self._client.get(f"/databases/{database_id}")
```

### Notion Create Page Node — `apps/api/app/node_system/builtins/notion_create_page.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class NotionCreatePageNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="action.notion_create_page",
            name="Notion: Create Page",
            category="integration",
            description="Create a new page in a Notion database",
            properties=[
                {"name": "credential", "label": "Notion API Key", "type": "credential",
                 "credentialType": "notion_api_key", "required": True},
                {"name": "database_id", "label": "Database ID", "type": "string", "required": True,
                 "placeholder": "32-char database ID from Notion URL"},
                {"name": "title", "label": "Page Title", "type": "string", "required": True},
            ],
            inputs=1,
            outputs=1,
            credential_type="notion_api_key",
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            database_id = (self.properties.get("database_id") or "").strip().replace("-", "")
            title = self.properties.get("title")

            if not database_id:
                return NodeResult(success=False, error="database_id is required")
            if not title:
                return NodeResult(success=False, error="title is required")

            credential = context.credentials.get("notion_api_key")
            if not credential:
                return NodeResult(success=False, error="Notion credential not found")

            from apps.api.app.integrations.notion.service import NotionService
            service = NotionService(api_key=credential.get("api_key"))
            page = await service.create_page(database_id=database_id, title=title)

            return NodeResult(
                success=True,
                output_data={
                    "page_id": page.get("id"),
                    "url": page.get("url"),
                    "title": title,
                },
            )
        except Exception as e:
            logger.error(f"NotionCreatePageNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Checklist

### GitHub
- [ ] `GitHubClient` uses `Accept: application/vnd.github+json` and `X-GitHub-Api-Version` headers
- [ ] `GitHubService.create_issue()` builds correct payload
- [ ] `GitHubCreateIssueNode` strips whitespace from `owner` and `repo`
- [ ] `GitHubCreateIssueNode` parses comma-separated `labels` string
- [ ] GitHub OAuth provider added to `PROVIDERS` in `flow.py`
- [ ] `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env` and `config.py`
- [ ] Node registered in backend and frontend
- [ ] End-to-end test: workflow creates real GitHub issue

### Notion
- [ ] `NotionClient` sends `Notion-Version: 2022-06-28` header
- [ ] `NotionService.create_page()` builds correct Notion API payload
- [ ] `NotionCreatePageNode` strips dashes from `database_id`
- [ ] Notion credential stored as `notion_api_key` type with `{"api_key": "secret_..."}`
- [ ] Node registered in backend and frontend
- [ ] End-to-end test: workflow creates real Notion page

### Both
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
# GitHub: store credential
curl -X POST localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"GitHub","type":"github_oauth","data":{"access_token":"ghp_..."}}'

# Create workflow with GitHub Create Issue node, run it
# → Real issue appears in your GitHub repo

# Notion: store credential  
curl -X POST localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Notion","type":"notion_api_key","data":{"api_key":"secret_..."}}'

# Create workflow with Notion Create Page node, run it
# → Real page appears in your Notion database
```

---

## Common Mistakes

- GitHub returns 422 if label doesn't exist — create labels first in the repo
- Notion database_id must have dashes removed: `abc123def456` not `abc123-def4-56...`
- Notion internal integration must be shared with the database — go to database → Share → invite integration
- `access_token` field name differs by OAuth provider — verify what your `exchange_code` stores
