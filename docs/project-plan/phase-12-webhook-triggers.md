# Phase 12 — Webhook Triggers

**Status: ⬜ Not Started**

---

## Goal

Workflows start automatically when external services send webhook events. Signature verification ensures only legitimate requests trigger executions.

## Prerequisites

- Phase 3 complete (execution pipeline working)
- Phase 2 complete (Workflow + Trigger model context)

---

## Step 1: Trigger Model

**File:** `apps/api/app/models/trigger.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class Trigger(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflow.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    type = Column(String, nullable=False)           # "webhook", "cron"
    name = Column(String, nullable=True)
    config = Column(JSON, nullable=False, default=dict)  # non-sensitive config
    encrypted_secret = Column(String, nullable=True)     # HMAC secret, encrypted
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    workflow = relationship("Workflow", back_populates="triggers")
    user = relationship("User")
```

Add back-reference to `Workflow` model:
```python
triggers = relationship("Trigger", back_populates="workflow", cascade="all, delete-orphan")
```

Generate and apply migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create trigger table"
make migrate
```

---

## Step 2: Trigger Schemas

**File:** `apps/api/app/schemas/trigger.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class TriggerCreate(BaseModel):
    workflow_id: uuid.UUID
    type: str = "webhook"
    name: Optional[str] = None
    config: dict = {}


class TriggerOut(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    type: str
    name: Optional[str]
    config: dict
    is_active: bool
    created_at: datetime
    webhook_url: Optional[str] = None   # computed, not stored

    model_config = {"from_attributes": True}
```

---

## Step 3: Trigger Repository

**File:** `apps/api/app/repositories/trigger_repository.py` (create this file):

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.trigger import Trigger
from typing import List, Optional
import uuid


class TriggerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, trigger: Trigger) -> Trigger:
        self.db.add(trigger)
        await self.db.commit()
        await self.db.refresh(trigger)
        return trigger

    async def get_by_id(self, trigger_id: uuid.UUID) -> Optional[Trigger]:
        result = await self.db.execute(select(Trigger).where(Trigger.id == trigger_id))
        return result.scalar_one_or_none()

    async def list_by_workflow(self, workflow_id: uuid.UUID) -> List[Trigger]:
        result = await self.db.execute(
            select(Trigger).where(Trigger.workflow_id == workflow_id)
        )
        return list(result.scalars().all())

    async def list_active_by_type(self, trigger_type: str) -> List[Trigger]:
        result = await self.db.execute(
            select(Trigger).where(Trigger.type == trigger_type, Trigger.is_active == True)
        )
        return list(result.scalars().all())

    async def delete(self, trigger: Trigger) -> None:
        await self.db.delete(trigger)
        await self.db.commit()
```

---

## Step 4: Triggers Router

**File:** `apps/api/app/api/v1/triggers/router.py` (replace the empty file):

```python
import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.trigger import Trigger
from apps.api.app.repositories.trigger_repository import TriggerRepository
from apps.api.app.repositories.workflow_repository import WorkflowRepository
from apps.api.app.schemas.trigger import TriggerCreate, TriggerOut
from apps.api.app.credential_manager.encryption.aes import encryption_service
from typing import List
import uuid

router = APIRouter()

BASE_WEBHOOK_URL = "http://localhost:8000/api/v1/webhooks"


@router.post("/", response_model=TriggerOut, status_code=status.HTTP_201_CREATED)
async def create_trigger(
    data: TriggerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify workflow ownership
    workflow_repo = WorkflowRepository(db)
    workflow = await workflow_repo.get_by_id_and_user(data.workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Generate and encrypt webhook secret
    secret = secrets.token_hex(32)
    encrypted_secret = encryption_service.encrypt(secret)

    trigger = Trigger(
        workflow_id=data.workflow_id,
        user_id=current_user.id,
        type=data.type,
        name=data.name,
        config=data.config,
        encrypted_secret=encrypted_secret,
    )

    repo = TriggerRepository(db)
    trigger = await repo.create(trigger)

    # Add computed webhook URL to response
    result = TriggerOut.model_validate(trigger)
    result.webhook_url = f"{BASE_WEBHOOK_URL}/{trigger.id}"
    return result


@router.get("/workflow/{workflow_id}", response_model=List[TriggerOut])
async def list_triggers(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TriggerRepository(db)
    triggers = await repo.list_by_workflow(workflow_id)
    results = []
    for t in triggers:
        out = TriggerOut.model_validate(t)
        out.webhook_url = f"{BASE_WEBHOOK_URL}/{t.id}"
        results.append(out)
    return results


@router.delete("/{trigger_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trigger(
    trigger_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TriggerRepository(db)
    trigger = await repo.get_by_id(trigger_id)
    if not trigger or trigger.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trigger not found")
    await repo.delete(trigger)
```

Add triggers router to `apps/api/app/api/v1/router.py`:
```python
from apps.api.app.api.v1.triggers.router import router as triggers_router
router.include_router(triggers_router, prefix="/triggers", tags=["triggers"])
```

---

## Step 5: Webhook Handler

**File:** `apps/api/app/api/v1/triggers/webhook_handler.py` (new file):

```python
import hashlib
import hmac
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.core.logger import get_logger
from apps.api.app.repositories.trigger_repository import TriggerRepository
from apps.api.app.repositories.workflow_repository import WorkflowRepository
from apps.api.app.credential_manager.encryption.aes import encryption_service
from apps.api.app.execution_engine.engine import execution_engine
import uuid

logger = get_logger(__name__)
webhook_router = APIRouter()


def _verify_signature(raw_body: bytes, secret: str, signature_header: str) -> bool:
    """Constant-time HMAC-SHA256 signature verification."""
    if not signature_header:
        return False
    computed = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    received = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(computed, received)


@webhook_router.post("/{trigger_id}")
async def receive_webhook(
    trigger_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    raw_body = await request.body()

    # Load trigger
    repo = TriggerRepository(db)
    trigger = await repo.get_by_id(trigger_id)
    if not trigger or not trigger.is_active:
        raise HTTPException(status_code=404, detail="Trigger not found")

    # Verify HMAC signature if secret is set
    if trigger.encrypted_secret:
        secret = encryption_service.decrypt(trigger.encrypted_secret)
        signature = request.headers.get("X-Fuse-Signature", "")
        if not _verify_signature(raw_body, secret, signature):
            logger.warning(f"Invalid signature for trigger {trigger_id}")
            raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse payload
    try:
        payload = await request.json()
    except Exception:
        payload = {"raw": raw_body.decode("utf-8", errors="replace")}

    logger.info(f"Webhook received for trigger {trigger_id}, workflow {trigger.workflow_id}")

    # Load workflow graph
    workflow_repo = WorkflowRepository(db)
    workflow = await workflow_repo.get_by_id(trigger.workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Trigger execution
    execution_id = await execution_engine.trigger_workflow(
        workflow_id=workflow.id,
        graph=workflow.graph,
        trigger_type="webhook",
        input_data={"webhook_payload": payload, "trigger_id": str(trigger_id)},
    )

    return {"status": "accepted", "execution_id": str(execution_id)}
```

Register in `apps/api/app/api/v1/router.py`:
```python
from apps.api.app.api.v1.triggers.webhook_handler import webhook_router
router.include_router(webhook_router, prefix="/webhooks", tags=["webhooks"])
```

---

## Step 6: Get Webhook Secret Endpoint

Add to triggers router so users can reveal their webhook secret:

```python
@router.get("/{trigger_id}/secret")
async def get_trigger_secret(
    trigger_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = TriggerRepository(db)
    trigger = await repo.get_by_id(trigger_id)
    if not trigger or trigger.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Trigger not found")
    secret = encryption_service.decrypt(trigger.encrypted_secret)
    return {"secret": secret}
```

---

## Checklist

- [ ] `Trigger` model has `id`, `workflow_id`, `user_id`, `type`, `config`, `encrypted_secret`, `is_active`
- [ ] `Workflow.triggers` back-reference added
- [ ] Alembic migration created and applied
- [ ] `TriggerCreate` schema has `workflow_id`, `type`, `name`, `config`
- [ ] `TriggerOut` includes computed `webhook_url` field
- [ ] `POST /triggers/` verifies workflow ownership before creating trigger
- [ ] `POST /triggers/` generates 32-byte hex secret, stores encrypted
- [ ] `GET /triggers/workflow/{id}` lists triggers with webhook URLs
- [ ] `DELETE /triggers/{id}` verifies ownership (not just existence)
- [ ] Webhook handler at `POST /webhooks/{trigger_id}`
- [ ] Webhook handler uses `hmac.compare_digest` (not `==`) for signature verification
- [ ] Webhook handler verifies against **raw bytes** not parsed JSON
- [ ] Webhook handler gracefully handles missing signature (if no secret set, allow)
- [ ] Webhook handler returns `{"status":"accepted","execution_id":"..."}` immediately
- [ ] Triggers router registered in `v1/router.py`
- [ ] Webhook router registered in `v1/router.py`
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."
WORKFLOW_ID="..."

# Create trigger
curl -X POST localhost:8000/api/v1/triggers/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflow_id":"'$WORKFLOW_ID'","type":"webhook","name":"My Webhook"}'
# → {"id":"...","webhook_url":"http://localhost:8000/api/v1/webhooks/..."}

TRIGGER_ID="..."
WEBHOOK_URL="http://localhost:8000/api/v1/webhooks/$TRIGGER_ID"

# Get secret
curl localhost:8000/api/v1/triggers/$TRIGGER_ID/secret \
  -H "Authorization: Bearer $TOKEN"
# → {"secret":"abc123..."}

SECRET="abc123..."

# Compute signature and send webhook
BODY='{"event":"test","data":"hello"}'
SIG="sha256=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-Fuse-Signature: $SIG" \
  -d "$BODY"
# → {"status":"accepted","execution_id":"..."}

# Verify execution triggered
curl localhost:8000/api/v1/executions/{execution_id} \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"completed","trigger_type":"webhook",...}

# Send without signature → rejected
curl -X POST $WEBHOOK_URL -d "$BODY"
# → 401 Invalid signature
```

---

## Common Mistakes

- Signature computed against parsed JSON — must use raw bytes
- `hmac.new` vs `hmac.compare_digest` — both needed. `new` computes, `compare_digest` compares
- Workflow owner != trigger creator check missing — any user could create a trigger for another's workflow
- `trigger.is_active` check missing — deleted triggers still fire
- Webhook URL uses `localhost` — in production this must be the public domain
