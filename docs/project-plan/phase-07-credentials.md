# Phase 7 — Credential Management

**Status: ⬜ Not Started**

---

## Goal

Users can store OAuth tokens and API keys encrypted at rest. OAuth authorization flow works. Credentials injected into `NodeContext` at execution time.

## Prerequisites

- Phase 6 complete (frontend working, auth working)
- OAuth app credentials in `.env` (Slack, GitHub, etc.)

---

## Step 1: Update Credential Model

**File:** `apps/api/app/models/credential.py`

Add `user_id` FK:

```python
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class Credential(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)        # e.g. slack_oauth, openai_api_key
    encrypted_data = Column(String, nullable=False)  # AES-256 encrypted JSON
    meta = Column(JSON, nullable=True)           # non-sensitive metadata (scopes, expiry)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="credentials")
```

Add back-reference to `User` model:
```python
credentials = relationship("Credential", back_populates="user", cascade="all, delete-orphan")
```

Generate and apply migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "add user_id to credential"
make migrate
```

---

## Step 2: Fix Encryption Service

**File:** `apps/api/app/credential_manager/encryption/aes.py`

The existing file uses `aes_service` but `vault/manager.py` imports `encryption_service`. Fix by renaming:

```python
from cryptography.fernet import Fernet
from apps.api.app.core.config import settings
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class AESEncryptionService:
    def __init__(self):
        key = settings.ENCRYPTION_KEY
        # Fernet key must be 32 url-safe base64-encoded bytes (44 chars)
        if not key or len(key) != 44:
            logger.warning("ENCRYPTION_KEY invalid — generating ephemeral key. Set a proper key in .env!")
            self._fernet = Fernet(Fernet.generate_key())
        else:
            self._fernet = Fernet(key.encode())

    def encrypt(self, data: str) -> str:
        return self._fernet.encrypt(data.encode()).decode()

    def decrypt(self, token: str) -> str:
        return self._fernet.decrypt(token.encode()).decode()


# Single instance — both names for backward compat
encryption_service = AESEncryptionService()
aes_service = encryption_service  # alias
```

---

## Step 3: Credential Schemas

**File:** `apps/api/app/schemas/credential.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class CredentialCreate(BaseModel):
    name: str
    type: str        # e.g. "openai_api_key", "slack_oauth"
    data: dict       # raw credential data — will be encrypted


class CredentialOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    meta: Optional[dict]
    created_at: datetime

    model_config = {"from_attributes": True}
    # NOTE: never return encrypted_data or decrypted data in this schema


class OAuthUrlResponse(BaseModel):
    url: str
    state: str
```

---

## Step 4: Credential Repository

**File:** `apps/api/app/repositories/credential_repository.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.credential import Credential
from typing import List, Optional
import uuid


class CredentialRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, user_id: uuid.UUID) -> List[Credential]:
        result = await self.db.execute(
            select(Credential)
            .where(Credential.user_id == user_id)
            .order_by(Credential.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id_and_user(self, cred_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Credential]:
        result = await self.db.execute(
            select(Credential).where(
                Credential.id == cred_id,
                Credential.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_type_and_user(self, cred_type: str, user_id: uuid.UUID) -> Optional[Credential]:
        result = await self.db.execute(
            select(Credential).where(
                Credential.type == cred_type,
                Credential.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, credential: Credential) -> Credential:
        self.db.add(credential)
        await self.db.commit()
        await self.db.refresh(credential)
        return credential

    async def delete(self, credential: Credential) -> None:
        await self.db.delete(credential)
        await self.db.commit()
```

---

## Step 5: Credential Service

**File:** `apps/api/app/services/credential_service.py`

```python
import json
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from apps.api.app.repositories.credential_repository import CredentialRepository
from apps.api.app.models.credential import Credential
from apps.api.app.models.user import User
from apps.api.app.credential_manager.encryption.aes import encryption_service
import uuid


class CredentialService:
    def __init__(self, db: AsyncSession):
        self.repo = CredentialRepository(db)

    async def list_credentials(self, user: User) -> list[Credential]:
        return await self.repo.list_by_user(user.id)

    async def store_credential(self, name: str, cred_type: str, data: dict, user: User, meta: dict = None) -> Credential:
        encrypted = encryption_service.encrypt(json.dumps(data))
        cred = Credential(
            user_id=user.id,
            name=name,
            type=cred_type,
            encrypted_data=encrypted,
            meta=meta,
        )
        return await self.repo.create(cred)

    async def get_decrypted(self, cred_id: uuid.UUID, user: User) -> dict:
        cred = await self.repo.get_by_id_and_user(cred_id, user.id)
        if not cred:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
        return json.loads(encryption_service.decrypt(cred.encrypted_data))

    async def get_decrypted_by_type(self, cred_type: str, user_id: uuid.UUID) -> dict | None:
        """Used by execution engine to inject credentials into NodeContext."""
        from apps.api.app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            repo = CredentialRepository(db)
            cred = await repo.get_by_type_and_user(cred_type, user_id)
            if not cred:
                return None
            return json.loads(encryption_service.decrypt(cred.encrypted_data))

    async def delete_credential(self, cred_id: uuid.UUID, user: User) -> None:
        cred = await self.repo.get_by_id_and_user(cred_id, user.id)
        if not cred:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
        await self.repo.delete(cred)
```

---

## Step 6: Credentials Router

**File:** `apps/api/app/api/v1/credentials/router.py`

```python
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.services.credential_service import CredentialService
from apps.api.app.schemas.credential import CredentialCreate, CredentialOut, OAuthUrlResponse
from typing import List
import uuid

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
        cred_type=data.type,
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
    from apps.api.app.credential_manager.oauth.flow import get_oauth_provider
    provider = get_oauth_provider(service_name)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unknown OAuth service: {service_name}")

    state = secrets.token_urlsafe(32)
    url = provider.get_authorization_url(state=state)
    return OAuthUrlResponse(url=url, state=state)


@router.get("/oauth/{service_name}/callback")
async def oauth_callback(
    service_name: str,
    code: str,
    state: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from apps.api.app.credential_manager.oauth.callback import handle_oauth_callback
    await handle_oauth_callback(
        service_name=service_name,
        code=code,
        user=current_user,
        db=db,
    )
    # Redirect back to frontend credentials page
    return RedirectResponse(url="http://localhost:5173/credentials")
```

---

## Step 7: OAuth Flow Helpers

**File:** `apps/api/app/credential_manager/oauth/flow.py`

```python
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
```

**File:** `apps/api/app/credential_manager/oauth/callback.py`

```python
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
        cred_type=f"{service_name}_oauth",
        data=token_data,
        user=user,
    )
```

---

## Step 8: Inject Credentials into WorkflowRunner

**File:** `apps/api/app/execution_engine/engine/workflow_runner.py`

Update `_execute_node_recursive` to inject credentials:

```python
context = NodeContext(
    execution_id=self.execution_id,
    workflow_id=self.workflow_id,
    node_id=node_id,
    variables={},
    credentials=self.credentials,  # pass pre-loaded credentials dict
)
```

And in `WorkflowRunner.__init__`:
```python
def __init__(self, workflow_id: str, execution_id: str, graph: dict, credentials: dict = None):
    self.workflow_id = workflow_id
    self.execution_id = execution_id
    self.graph = graph
    self.nodes = {node['id']: node for node in graph.get('nodes', [])}
    self.edges = graph.get('edges', [])
    self.executed_nodes: dict = {}
    self.credentials = credentials or {}
```

In `tasks.py`, load credentials before creating runner:
```python
# Load credentials for the workflow owner
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.models.workflow import Execution
# (fetch user_id from workflow, then load all their credentials)
```

---

## Step 9: Add OAuth env vars to `.env`

```bash
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

---

## Checklist

- [ ] `Credential.user_id` FK added + migration applied
- [ ] `User.credentials` back-reference added
- [ ] `encryption_service` name fixed (also exported as `aes_service` alias)
- [ ] `CredentialOut` schema never includes `encrypted_data` or decrypted tokens
- [ ] `CredentialRepository.get_by_type_and_user()` implemented (for execution engine)
- [ ] `CredentialService.store_credential()` encrypts data before storing
- [ ] `CredentialService.get_decrypted_by_type()` opens own DB session (called from worker)
- [ ] `GET /credentials/` returns only current user's credentials
- [ ] `POST /credentials/` stores encrypted credential
- [ ] `DELETE /credentials/{id}` removes credential (404 if not owner)
- [ ] `GET /credentials/oauth/slack/url` returns Slack OAuth URL
- [ ] `GET /credentials/oauth/slack/callback` exchanges code, stores token, redirects to frontend
- [ ] `WorkflowRunner` accepts `credentials` dict in constructor
- [ ] Credentials injected into `NodeContext.credentials` before each node execution
- [ ] SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in `.env`
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# Store API key credential
curl -X POST localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My OpenAI Key","type":"openai_api_key","data":{"api_key":"sk-..."}}'
# → {"id":"...","name":"My OpenAI Key","type":"openai_api_key",...}

# List credentials (no raw data returned)
curl localhost:8000/api/v1/credentials/ \
  -H "Authorization: Bearer $TOKEN"
# → [{"id":"...","name":"My OpenAI Key","type":"openai_api_key",...}]
# → encrypted_data NOT in response

# Get OAuth URL
curl localhost:8000/api/v1/credentials/oauth/slack/url \
  -H "Authorization: Bearer $TOKEN"
# → {"url":"https://slack.com/oauth/v2/authorize?...","state":"..."}

# Delete
curl -X DELETE localhost:8000/api/v1/credentials/{id} \
  -H "Authorization: Bearer $TOKEN"
# → 204 No Content
```

---

## Common Mistakes

- Returning `encrypted_data` in `CredentialOut` — NEVER expose encrypted blobs to frontend
- `encryption_service` name mismatch — `vault/manager.py` uses different name. Fix both files
- Not adding `SLACK_CLIENT_ID` to `config.py` Settings class — attribute error on startup
- `get_decrypted_by_type` opens its own session — must not reuse the request-scoped session (worker doesn't have one)
- OAuth callback URL must match exactly what's registered in Slack app settings
