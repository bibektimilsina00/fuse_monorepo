# Phase 2 — Workflow CRUD API

**Status: ✅ Done**

---

## Goal

Full create/read/update/delete for workflows via the API. Every workflow is owned by a user. All endpoints require auth.

## Prerequisites

- Phase 1 complete (auth working, `get_current_user` dependency exists)
- PostgreSQL running

---

## Step 1: Update Workflow Model

**File:** `apps/api/app/models/workflow.py`

Add `user_id` foreign key column to the existing `Workflow` model:

```python
from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class Workflow(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)  # ADD THIS
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    schema_version = Column(String, default="1.0.0")
    graph = Column(JSON, nullable=False, default=lambda: {"nodes": [], "edges": []})
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="workflows")
    executions = relationship("Execution", back_populates="workflow", cascade="all, delete-orphan")
```

Also add `workflows` back-reference to `User` model (`apps/api/app/models/user.py`):
```python
workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
```

---

## Step 2: Create Pydantic Schemas

**File:** `apps/api/app/schemas/workflow.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    graph: dict = Field(default_factory=lambda: {"nodes": [], "edges": []})


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    graph: Optional[dict] = None
    is_active: Optional[bool] = None


class WorkflowOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    description: Optional[str]
    schema_version: str
    graph: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

---

## Step 3: Create Alembic Migration

Run this command:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "add user_id to workflow"
```

Review the generated file in `alembic/versions/`. It should add:
- `user_id` UUID column with FK to `user.id`
- NOT NULL constraint

Then apply:
```bash
make migrate
```

**Important:** If existing `workflow` rows exist, migration will fail on NOT NULL. Either:
- Drop all existing rows first: `DELETE FROM workflow;`
- Or make `user_id` nullable temporarily, then backfill

---

## Step 4: Update Workflow Repository

**File:** `apps/api/app/repositories/workflow_repository.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from apps.api.app.models.workflow import Workflow
from typing import List, Optional
import uuid


class WorkflowRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, workflow_id: uuid.UUID) -> Optional[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(Workflow.id == workflow_id)
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_user(self, workflow_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Workflow]:
        result = await self.db.execute(
            select(Workflow).where(
                Workflow.id == workflow_id,
                Workflow.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> List[Workflow]:
        result = await self.db.execute(
            select(Workflow)
            .where(Workflow.user_id == user_id)
            .order_by(Workflow.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, workflow: Workflow) -> Workflow:
        self.db.add(workflow)
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow

    async def update(self, workflow: Workflow, data: dict) -> Workflow:
        for key, value in data.items():
            setattr(workflow, key, value)
        await self.db.commit()
        await self.db.refresh(workflow)
        return workflow

    async def delete(self, workflow: Workflow) -> None:
        await self.db.delete(workflow)
        await self.db.commit()
```

---

## Step 5: Create Workflow Service

**File:** `apps/api/app/services/workflow_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from apps.api.app.repositories.workflow_repository import WorkflowRepository
from apps.api.app.models.workflow import Workflow
from apps.api.app.schemas.workflow import WorkflowCreate, WorkflowUpdate
from apps.api.app.models.user import User
import uuid


class WorkflowService:
    def __init__(self, db: AsyncSession):
        self.repository = WorkflowRepository(db)

    async def list_workflows(self, user: User) -> list[Workflow]:
        return await self.repository.list_by_user(user.id)

    async def get_workflow(self, workflow_id: uuid.UUID, user: User) -> Workflow:
        workflow = await self.repository.get_by_id_and_user(workflow_id, user.id)
        if not workflow:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")
        return workflow

    async def create_workflow(self, data: WorkflowCreate, user: User) -> Workflow:
        workflow = Workflow(
            user_id=user.id,
            name=data.name,
            description=data.description,
            graph=data.graph,
        )
        return await self.repository.create(workflow)

    async def update_workflow(self, workflow_id: uuid.UUID, data: WorkflowUpdate, user: User) -> Workflow:
        workflow = await self.get_workflow(workflow_id, user)
        update_data = data.model_dump(exclude_unset=True)
        return await self.repository.update(workflow, update_data)

    async def delete_workflow(self, workflow_id: uuid.UUID, user: User) -> None:
        workflow = await self.get_workflow(workflow_id, user)
        await self.repository.delete(workflow)
```

---

## Step 6: Build Workflow Router

**File:** `apps/api/app/api/v1/workflows/router.py`

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.services.workflow_service import WorkflowService
from apps.api.app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowOut
from typing import List
import uuid

router = APIRouter()


@router.get("/", response_model=List[WorkflowOut])
async def list_workflows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.list_workflows(current_user)


@router.post("/", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.create_workflow(data, current_user)


@router.get("/{workflow_id}", response_model=WorkflowOut)
async def get_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.get_workflow(workflow_id, current_user)


@router.put("/{workflow_id}", response_model=WorkflowOut)
async def update_workflow(
    workflow_id: uuid.UUID,
    data: WorkflowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    return await service.update_workflow(workflow_id, data, current_user)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    await service.delete_workflow(workflow_id, current_user)


@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Phase 3 will implement real execution here
    # For now just validate ownership and return stub
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)
    return {"execution_id": "stub-phase-3-will-implement", "workflow_id": str(workflow.id)}
```

---

## Step 7: Run lint

```bash
make lint
```

Fix any ruff errors before proceeding.

---

## Checklist

- [x] `Workflow.user_id` FK column added to model
- [x] `User.workflows` back-reference added
- [x] Alembic migration generated and applied (`make migrate` succeeds)
- [x] `WorkflowCreate` schema: `name` required, `description` optional, `graph` defaults to `{"nodes":[],"edges":[]}`
- [x] `WorkflowUpdate` schema: all fields optional
- [x] `WorkflowOut` schema: includes all fields, `model_config = {"from_attributes": True}`
- [x] `WorkflowRepository.list_by_user()` filters by `user_id`, orders by `created_at DESC`
- [x] `WorkflowRepository.get_by_id_and_user()` filters by both `id` and `user_id`
- [x] `WorkflowRepository.update()` uses `model_dump(exclude_unset=True)` pattern
- [x] `WorkflowService.get_workflow()` raises 404 if not found
- [x] `GET /workflows/` returns only current user's workflows (not other users')
- [x] `POST /workflows/` creates workflow with `user_id` set to current user
- [x] `GET /workflows/{id}` returns 404 if workflow belongs to different user
- [x] `PUT /workflows/{id}` returns 404 if workflow belongs to different user
- [x] `DELETE /workflows/{id}` returns 204, returns 404 if not owner
- [x] `POST /workflows/{id}/run` returns stub response (Phase 3 completes this)
- [x] All routes have `Depends(get_current_user)` — unauthenticated requests get 401
- [x] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."   # get from POST /auth/login

# Create
curl -X POST localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My First Workflow","description":"Test"}'
# → 201 {"id":"...","name":"My First Workflow","graph":{"nodes":[],"edges":[]},...}

# List
curl localhost:8000/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN"
# → [{"id":"...","name":"My First Workflow",...}]

# Get
curl localhost:8000/api/v1/workflows/{id} \
  -H "Authorization: Bearer $TOKEN"
# → {"id":"...","name":"My First Workflow",...}

# Update
curl -X PUT localhost:8000/api/v1/workflows/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
# → {"id":"...","name":"Updated Name",...}

# Delete
curl -X DELETE localhost:8000/api/v1/workflows/{id} \
  -H "Authorization: Bearer $TOKEN"
# → 204 No Content

# Unauthenticated request rejected
curl localhost:8000/api/v1/workflows/
# → 401 Unauthorized

# Other user's workflow returns 404
# (create workflow with user A, try to get with user B's token)
# → 404 Not Found
```

---

## Common Mistakes

- Forgetting `model_config = {"from_attributes": True}` on `WorkflowOut` — FastAPI can't serialize SQLAlchemy model
- Using `data.model_dump()` instead of `data.model_dump(exclude_unset=True)` in update — overwrites fields with `None`
- Not importing `User` relationship in alembic `env.py` — migration doesn't see the table
- `ForeignKey("user.id")` — table name is lowercase `user` not `User`
