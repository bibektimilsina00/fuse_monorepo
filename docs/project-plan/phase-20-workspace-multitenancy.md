# Phase 20 — Workspace / Multi-Tenancy

**Status: ⬜ Not Started**

---

## Goal

Users belong to workspaces (teams/organizations). All resources (workflows, credentials, triggers) are scoped to a workspace. `workspace.py` model implemented.

## Prerequisites

- Phase 2 complete (workflow CRUD)
- Phase 7 complete (credential management)

---

## Architecture

```
User → belongs to → Workspace (via WorkspaceMember)
Workflow, Credential, Trigger → all owned by → Workspace (not User directly)
User has a "personal" workspace created automatically on register
```

---

## Step 1: Workspace Model

**File:** `apps/api/app/models/workspace.py`

```python
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class WorkspaceMemberRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class Workspace(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True)  # URL-friendly identifier
    is_personal = Column(Boolean, default=False)        # auto-created personal workspace
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="workspace", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    role = Column(Enum(WorkspaceMemberRole), default=WorkspaceMemberRole.MEMBER)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")
```

---

## Step 2: Update All Resource Models

Add `workspace_id` FK to `Workflow`, `Credential`, `Trigger`:

**`apps/api/app/models/workflow.py`** — change `user_id` to `workspace_id`:
```python
workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=False)
workspace = relationship("Workspace", back_populates="workflows")
```

Keep `user_id` as the **creator** (audit trail):
```python
created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)
```

**Note:** This is a breaking migration. `user_id` → `workspace_id` on existing workflows.

Migration strategy:
1. Add `workspace_id` column as nullable
2. Create personal workspace for each existing user
3. Backfill `workspace_id` from `user_id` (user's personal workspace)
4. Make `workspace_id` NOT NULL

---

## Step 3: Update User Model

**File:** `apps/api/app/models/user.py` — add:

```python
workspace_memberships = relationship("WorkspaceMember", back_populates="user")
current_workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=True)
```

---

## Step 4: Auto-Create Personal Workspace on Register

**File:** `apps/api/app/services/auth_service.py` — update `register()`:

```python
async def register(self, email: str, password: str) -> User:
    # ... create user ...
    user = await self.user_repo.create(email, hashed_password)

    # Auto-create personal workspace
    from apps.api.app.models.workspace import Workspace, WorkspaceMember, WorkspaceMemberRole
    import re
    slug = re.sub(r'[^a-z0-9]', '-', email.split('@')[0].lower())[:50]

    workspace = Workspace(
        name=f"{email.split('@')[0]}'s Workspace",
        slug=f"{slug}-{str(user.id)[:8]}",
        is_personal=True,
    )
    self.db.add(workspace)
    await self.db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=WorkspaceMemberRole.OWNER,
    )
    self.db.add(member)

    user.current_workspace_id = workspace.id
    await self.db.commit()

    return user
```

---

## Step 5: Workspace Middleware / Dependency

**File:** `apps/api/app/api/v1/workspaces/dependencies.py` (new file):

```python
from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.workspace import Workspace, WorkspaceMember
from sqlalchemy import select
import uuid


async def get_current_workspace(
    current_user: User = Depends(get_current_user),
    workspace_id: str | None = Header(None, alias="X-Workspace-ID"),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Get the workspace from header, or fall back to user's current_workspace_id."""
    target_id = workspace_id or str(current_user.current_workspace_id)

    if not target_id:
        raise HTTPException(status_code=400, detail="No workspace selected")

    result = await db.execute(
        select(Workspace).where(Workspace.id == uuid.UUID(target_id))
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Verify membership
    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")

    return workspace
```

---

## Step 6: Workspace Router

**File:** `apps/api/app/api/v1/workspaces/router.py`:

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.workspace import Workspace, WorkspaceMember, WorkspaceMemberRole
from pydantic import BaseModel
from typing import List
import uuid

router = APIRouter()


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_personal: bool
    role: str
    model_config = {"from_attributes": True}


class WorkspaceCreate(BaseModel):
    name: str


@router.get("/", response_model=List[WorkspaceOut])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace, WorkspaceMember.role)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
    )
    rows = result.all()
    return [
        WorkspaceOut(
            id=ws.id, name=ws.name, slug=ws.slug,
            is_personal=ws.is_personal, role=role.value,
        )
        for ws, role in rows
    ]


@router.post("/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import re
    slug = re.sub(r'[^a-z0-9]', '-', data.name.lower())[:50]
    slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    workspace = Workspace(name=data.name, slug=slug)
    db.add(workspace)
    await db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role=WorkspaceMemberRole.OWNER,
    )
    db.add(member)
    await db.commit()

    return WorkspaceOut(
        id=workspace.id, name=workspace.name, slug=workspace.slug,
        is_personal=workspace.is_personal, role="owner",
    )


@router.post("/{workspace_id}/invite")
async def invite_member(
    workspace_id: uuid.UUID,
    email: str,
    role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify inviter is owner or admin
    member_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    inviter = member_result.scalar_one_or_none()
    if not inviter or inviter.role not in (WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    # Find user by email
    from apps.api.app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    invitee = await user_repo.get_by_email(email)
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")

    # Add member
    new_member = WorkspaceMember(workspace_id=workspace_id, user_id=invitee.id, role=role)
    db.add(new_member)
    await db.commit()
    return {"status": "invited", "email": email}
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.workspaces.router import router as workspaces_router
router.include_router(workspaces_router, prefix="/workspaces", tags=["workspaces"])
```

---

## Step 7: Update All Resource Queries to Scope by Workspace

Update `WorkflowRepository.list_by_user()` → `list_by_workspace()`:
```python
async def list_by_workspace(self, workspace_id: uuid.UUID) -> List[Workflow]:
    result = await self.db.execute(
        select(Workflow)
        .where(Workflow.workspace_id == workspace_id)
        .order_by(Workflow.created_at.desc())
    )
    return list(result.scalars().all())
```

Update all workflow router endpoints to use `get_current_workspace` instead of `get_current_user` for resource scoping.

---

## Checklist

- [ ] `Workspace` model: `id`, `name`, `slug`, `is_personal`
- [ ] `WorkspaceMember` model: `workspace_id`, `user_id`, `role` (OWNER/ADMIN/MEMBER/VIEWER)
- [ ] `Workflow.workspace_id` FK replacing `user_id` as primary ownership
- [ ] `Credential.workspace_id` FK added
- [ ] `User.current_workspace_id` FK added
- [ ] `User.workspace_memberships` relationship added
- [ ] Alembic migration: add workspace tables, backfill workspace_id from user_id
- [ ] Personal workspace auto-created on user register
- [ ] `get_current_workspace` FastAPI dependency reads `X-Workspace-ID` header
- [ ] `GET /workspaces/` lists all user's workspaces with their role
- [ ] `POST /workspaces/` creates new workspace, user is OWNER
- [ ] `POST /workspaces/{id}/invite` adds member (OWNER/ADMIN only)
- [ ] Workflow queries scoped to workspace (not user)
- [ ] Credential queries scoped to workspace
- [ ] Frontend: workspace switcher in nav bar
- [ ] Frontend: sends `X-Workspace-ID` header on all API calls
- [ ] `make lint` passes

---

## Common Mistakes

- Not backfilling `workspace_id` before making it NOT NULL — migration fails on existing data
- Slug conflicts — use `uuid` suffix to guarantee uniqueness
- Personal workspace `is_personal=True` — clients can differentiate it in UI
- Forgetting to scope queries — user in workspace A sees workspace B's workflows
