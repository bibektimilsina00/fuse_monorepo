# Phase 21 — Secrets Management

**Status: ⬜ Not Started**

---

## Goal

Workflow-level secrets (environment variables like API keys, tokens) stored encrypted and injected into node properties at execution time via `{{secrets.MY_KEY}}` syntax. `secret.py` model implemented. `secrets/` router implemented.

## Difference from Credentials

| Secrets | Credentials |
|---|---|
| Key-value pairs (like .env) | OAuth tokens / full auth objects |
| Accessed as `{{secrets.KEY_NAME}}` | Accessed via credential picker in node UI |
| Created manually by user | Created via OAuth flow or manual entry |
| Simple string values | Structured JSON (access_token, refresh_token, etc.) |

## Prerequisites

- Phase 7 complete (AES encryption service exists — used to encrypt secret values)
- Phase 5 complete (`TemplateResolver` exists — needed for `{{secrets.KEY}}` injection at runtime)

---

## Step 1: Secret Model

**File:** `apps/api/app/models/secret.py`

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class Secret(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=False)
    key = Column(String, nullable=False)            # e.g. "OPENAI_API_KEY"
    encrypted_value = Column(Text, nullable=False)  # AES-256 encrypted
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Unique per workspace: one key name per workspace
    __table_args__ = (
        {"schema": None},  # add UniqueConstraint in migration: (workspace_id, key)
    )
```

Generate migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create secret table"
```

Add unique constraint manually in migration:
```python
op.create_unique_constraint('uq_secret_workspace_key', 'secret', ['workspace_id', 'key'])
```

Apply:
```bash
make migrate
```

---

## Step 2: Secret Schemas

**File:** `apps/api/app/schemas/secret.py` (new file):

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class SecretCreate(BaseModel):
    key: str = Field(..., pattern=r'^[A-Z][A-Z0-9_]*$', description="SCREAMING_SNAKE_CASE")
    value: str
    description: Optional[str] = None


class SecretUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class SecretOut(BaseModel):
    id: uuid.UUID
    key: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    # NOTE: never return the value, even encrypted

    model_config = {"from_attributes": True}
```

---

## Step 3: Secret Repository

**File:** `apps/api/app/repositories/secret_repository.py` (new file):

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.secret import Secret
from typing import List, Optional, Dict
import uuid


class SecretRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, secret: Secret) -> Secret:
        self.db.add(secret)
        await self.db.commit()
        await self.db.refresh(secret)
        return secret

    async def get_by_key(self, workspace_id: uuid.UUID, key: str) -> Optional[Secret]:
        result = await self.db.execute(
            select(Secret).where(Secret.workspace_id == workspace_id, Secret.key == key)
        )
        return result.scalar_one_or_none()

    async def list_by_workspace(self, workspace_id: uuid.UUID) -> List[Secret]:
        result = await self.db.execute(
            select(Secret).where(Secret.workspace_id == workspace_id).order_by(Secret.key)
        )
        return list(result.scalars().all())

    async def get_all_decrypted(self, workspace_id: uuid.UUID) -> Dict[str, str]:
        """Returns {KEY: decrypted_value} for all workspace secrets. Used by execution engine."""
        from apps.api.app.credential_manager.encryption.aes import encryption_service
        secrets = await self.list_by_workspace(workspace_id)
        return {s.key: encryption_service.decrypt(s.encrypted_value) for s in secrets}

    async def update(self, secret: Secret, data: dict) -> Secret:
        for k, v in data.items():
            setattr(secret, k, v)
        await self.db.commit()
        await self.db.refresh(secret)
        return secret

    async def delete(self, secret: Secret) -> None:
        await self.db.delete(secret)
        await self.db.commit()
```

---

## Step 4: Secrets Router

**File:** `apps/api/app/api/v1/secrets/router.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.secret import Secret
from apps.api.app.repositories.secret_repository import SecretRepository
from apps.api.app.credential_manager.encryption.aes import encryption_service
from apps.api.app.schemas.secret import SecretCreate, SecretUpdate, SecretOut
from typing import List
import uuid

router = APIRouter()


@router.get("/", response_model=List[SecretOut])
async def list_secrets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Use current_workspace_id from user
    workspace_id = current_user.current_workspace_id
    repo = SecretRepository(db)
    return await repo.list_by_workspace(workspace_id)


@router.post("/", response_model=SecretOut, status_code=status.HTTP_201_CREATED)
async def create_secret(
    data: SecretCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = current_user.current_workspace_id
    repo = SecretRepository(db)

    # Check for duplicate key
    existing = await repo.get_by_key(workspace_id, data.key)
    if existing:
        raise HTTPException(status_code=409, detail=f"Secret '{data.key}' already exists")

    encrypted = encryption_service.encrypt(data.value)
    secret = Secret(
        workspace_id=workspace_id,
        key=data.key,
        encrypted_value=encrypted,
        description=data.description,
    )
    return await repo.create(secret)


@router.put("/{secret_id}", response_model=SecretOut)
async def update_secret(
    secret_id: uuid.UUID,
    data: SecretUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = current_user.current_workspace_id
    repo = SecretRepository(db)

    result = await db.execute(
        __import__('sqlalchemy').select(Secret).where(
            Secret.id == secret_id, Secret.workspace_id == workspace_id
        )
    )
    secret = result.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")

    update_data = {}
    if data.value is not None:
        update_data["encrypted_value"] = encryption_service.encrypt(data.value)
    if data.description is not None:
        update_data["description"] = data.description

    return await repo.update(secret, update_data)


@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    secret_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace_id = current_user.current_workspace_id
    repo = SecretRepository(db)
    from sqlalchemy import select
    result = await db.execute(
        select(Secret).where(Secret.id == secret_id, Secret.workspace_id == workspace_id)
    )
    secret = result.scalar_one_or_none()
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
    await repo.delete(secret)
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.secrets.router import router as secrets_router
router.include_router(secrets_router, prefix="/secrets", tags=["secrets"])
```

---

## Step 5: Inject Secrets into Template Resolver

Update `TemplateResolver` (Phase 5) to support `{{secrets.KEY}}`:

**File:** `apps/api/app/execution_engine/engine/template_resolver.py` — update `__init__`:

```python
def __init__(self, node_outputs: dict, trigger_data: dict, secrets: dict = None):
    self._context = {
        "trigger": {"output": trigger_data},
        "secrets": secrets or {},   # ADD THIS
        **{node_id: {"output": output} for node_id, output in node_outputs.items()},
    }
```

Then in `tasks.py`, load secrets and pass to WorkflowRunner:

```python
# Load workspace secrets
from apps.api.app.repositories.secret_repository import SecretRepository
async with AsyncSessionLocal() as db:
    # Get workspace_id from workflow
    from apps.api.app.repositories.workflow_repository import WorkflowRepository
    wf_repo = WorkflowRepository(db)
    workflow = await wf_repo.get_by_id(uuid.UUID(workflow_id))
    workspace_id = workflow.workspace_id

    secret_repo = SecretRepository(db)
    secrets = await secret_repo.get_all_decrypted(workspace_id)

runner = WorkflowRunner(
    workflow_id=workflow_id,
    execution_id=execution_id,
    graph=graph,
    credentials=credentials,
    secrets=secrets,  # ADD THIS
)
```

Update `WorkflowRunner.__init__` to accept `secrets`:
```python
def __init__(self, ..., secrets: dict = None):
    ...
    self.secrets = secrets or {}
```

Pass to `TemplateResolver`:
```python
resolver = TemplateResolver(
    node_outputs=self.node_outputs,
    trigger_data=self.trigger_data,
    secrets=self.secrets,
)
```

---

## Step 6: Frontend Secrets Page

**File:** `apps/web/src/features/secrets/SecretsPage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

const secretKeys = {
  all: ['secrets'] as const,
  list: () => [...secretKeys.all, 'list'] as const,
}

export default function SecretsPage() {
  const queryClient = useQueryClient()
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const { data: secrets } = useQuery({
    queryKey: secretKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/secrets/')
      return data
    },
    staleTime: 1000 * 60,
  })

  const createSecret = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      await api.post('/secrets/', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretKeys.list() })
      setNewKey('')
      setNewValue('')
    },
  })

  const deleteSecret = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/secrets/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: secretKeys.list() }),
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h2 className="text-lg font-semibold mb-6">Secrets</h2>
      <p className="text-sm text-slate-500 mb-6">
        Use secrets in workflows with <code className="bg-slate-100 px-1 rounded">{'{{secrets.KEY_NAME}}'}</code>
      </p>

      {/* Add new secret */}
      <div className="flex gap-3 mb-6">
        <input
          placeholder="KEY_NAME (UPPERCASE)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <input
          type="password"
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <button
          onClick={() => createSecret.mutate({ key: newKey, value: newValue })}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
        >
          Add
        </button>
      </div>

      {/* List secrets */}
      <div className="space-y-2">
        {secrets?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <code className="text-sm font-mono font-medium">{s.key}</code>
              {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
            </div>
            <button
              onClick={() => deleteSecret.mutate(s.id)}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Checklist

- [ ] `Secret` model: `id`, `workspace_id`, `key`, `encrypted_value`, `description`
- [ ] Unique constraint on `(workspace_id, key)` in migration
- [ ] `SecretCreate` validates `key` is SCREAMING_SNAKE_CASE (`^[A-Z][A-Z0-9_]*$`)
- [ ] `SecretOut` never returns `encrypted_value` or decrypted value
- [ ] `SecretRepository.get_all_decrypted()` returns `{KEY: decrypted_value}` for injection
- [ ] `POST /secrets/` returns 409 if key already exists in workspace
- [ ] `DELETE /secrets/{id}` verifies workspace membership
- [ ] `TemplateResolver` resolves `{{secrets.KEY}}` against injected secrets dict
- [ ] `tasks.py` loads workspace secrets and passes to `WorkflowRunner`
- [ ] `SecretsPage` frontend page with add/delete UI
- [ ] Route added to frontend router: `/secrets`
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# Create secret
curl -X POST localhost:8000/api/v1/secrets/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"key":"OPENAI_API_KEY","value":"sk-real-key-here"}'
# → {"id":"...","key":"OPENAI_API_KEY",...}  (no value returned)

# Create workflow using secret in property
# OpenAI node with: api_key = "{{secrets.OPENAI_API_KEY}}"
# Run workflow → OpenAI call succeeds with real key injected at runtime

# Verify secret not exposed in execution logs
# → logs never contain "sk-real-key-here"
```
