# Phase 24 — User Management

**Status: ⬜ Not Started**

---

## Goal

Users can update their profile (name, avatar), change password, and delete their account. `users/` router implemented. `audit_log.py` model implemented with basic audit trail.

## Prerequisites

- Phase 1 complete (auth working)

---

## Step 1: Update User Model

**File:** `apps/api/app/models/user.py` — add fields:

```python
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class User(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)           # ADD
    avatar_url = Column(String, nullable=True)          # ADD
    is_active = Column(Boolean, default=True)
    current_workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),  # ADD
                        onupdate=lambda: datetime.now(timezone.utc))

    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    workflows = relationship("Workflow", back_populates="user", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="user", cascade="all, delete-orphan")
```

Migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "add user profile fields"
make migrate
```

---

## Step 2: User Schemas

**File:** `apps/api/app/schemas/user.py`

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateProfile(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    avatar_url: Optional[str] = None


class UserChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserChangeEmail(BaseModel):
    new_email: EmailStr
    password: str  # confirm with password
```

---

## Step 3: Users Router

**File:** `apps/api/app/api/v1/users/router.py` (create this file):

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.schemas.user import UserOut, UserUpdateProfile, UserChangePassword, UserChangeEmail
from apps.api.app.core.security import verify_password, get_password_hash
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
async def update_profile(
    data: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    data: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current")

    current_user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    logger.info(f"User {current_user.id} changed password")
    return {"status": "password changed"}


@router.post("/me/change-email", response_model=UserOut)
async def change_email(
    data: UserChangeEmail,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")

    # Check email not already taken
    from apps.api.app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db)
    existing = await user_repo.get_by_email(data.new_email)
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=409, detail="Email already in use")

    current_user.email = data.new_email
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete user account and all their data."""
    logger.warning(f"User {current_user.id} ({current_user.email}) deleted their account")
    await db.delete(current_user)
    await db.commit()
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.users.router import router as users_router
router.include_router(users_router, prefix="/users", tags=["users"])
```

---

## Step 4: Audit Log Model

**File:** `apps/api/app/models/audit_log.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class AuditLog(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=True)  # nullable: system actions
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=True)
    action = Column(String, nullable=False)         # e.g. "workflow.created", "user.login"
    resource_type = Column(String, nullable=True)   # e.g. "workflow", "credential"
    resource_id = Column(String, nullable=True)     # UUID of affected resource
    metadata = Column(JSON, nullable=True)          # additional context
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

Migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create audit_log table"
make migrate
```

---

## Step 5: Audit Logger

**File:** `apps/api/app/services/audit_service.py` (new file):

```python
from typing import Optional
from apps.api.app.models.audit_log import AuditLog
from apps.api.app.core.database import AsyncSessionLocal
from apps.api.app.core.logger import get_logger
import uuid

logger = get_logger(__name__)


async def log_action(
    action: str,
    user_id: Optional[uuid.UUID] = None,
    workspace_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Non-blocking audit log write. Never raises — audit failures are logged but don't fail the request."""
    try:
        async with AsyncSessionLocal() as db:
            entry = AuditLog(
                user_id=user_id,
                workspace_id=workspace_id,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                metadata=metadata,
                ip_address=ip_address,
            )
            db.add(entry)
            await db.commit()
    except Exception as e:
        logger.warning(f"Audit log write failed (non-fatal): {e}")


# Audit action constants
class AuditActions:
    USER_LOGIN = "user.login"
    USER_REGISTER = "user.register"
    USER_PASSWORD_CHANGED = "user.password_changed"
    USER_DELETED = "user.deleted"
    WORKFLOW_CREATED = "workflow.created"
    WORKFLOW_UPDATED = "workflow.updated"
    WORKFLOW_DELETED = "workflow.deleted"
    WORKFLOW_RUN = "workflow.run"
    CREDENTIAL_CREATED = "credential.created"
    CREDENTIAL_DELETED = "credential.deleted"
    SECRET_CREATED = "secret.created"
    SECRET_DELETED = "secret.deleted"
```

Usage in routers:
```python
from apps.api.app.services.audit_service import log_action, AuditActions

# In auth router after login:
await log_action(AuditActions.USER_LOGIN, user_id=user.id, ip_address=request.client.host)

# In workflow router after create:
await log_action(AuditActions.WORKFLOW_CREATED, user_id=current_user.id,
                 resource_type="workflow", resource_id=workflow.id)
```

---

## Step 6: Frontend Profile Page

**File:** `apps/web/src/features/settings/ProfilePage.tsx`

```typescript
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => (await api.get('/users/me')).data,
    staleTime: 1000 * 60 * 5,
  })

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const updateProfile = useMutation({
    mutationFn: (data: { full_name: string }) => api.put('/users/me', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', 'me'] }),
  })

  const changePassword = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post('/users/me/change-password', data),
    onSuccess: () => { setCurrentPassword(''); setNewPassword('') },
  })

  return (
    <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
      <h2 className="text-lg font-semibold">Profile Settings</h2>

      {/* Profile update */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input value={user?.email || ''} disabled
            className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50 text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button
          onClick={() => updateProfile.mutate({ full_name: fullName })}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
        >
          Save Profile
        </button>
      </div>

      {/* Password change */}
      <div className="space-y-4 border-t pt-8">
        <h3 className="font-medium text-slate-900">Change Password</h3>
        <input type="password" placeholder="Current password"
          value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm" />
        <input type="password" placeholder="New password (min 8 chars)"
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm" />
        <button
          onClick={() => changePassword.mutate({ current_password: currentPassword, new_password: newPassword })}
          disabled={!currentPassword || !newPassword || changePassword.isPending}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg disabled:opacity-50"
        >
          Change Password
        </button>
        {changePassword.isSuccess && <p className="text-sm text-green-600">Password changed successfully</p>}
        {changePassword.isError && <p className="text-sm text-red-500">Failed. Check your current password.</p>}
      </div>
    </div>
  )
}
```

---

## Checklist

- [ ] `User.full_name`, `User.avatar_url`, `User.updated_at` columns added + migration
- [ ] `UserOut` schema includes `full_name`, `avatar_url`
- [ ] `GET /users/me` returns current user profile
- [ ] `PUT /users/me` updates `full_name` and/or `avatar_url`
- [ ] `POST /users/me/change-password` verifies current password before changing
- [ ] `POST /users/me/change-password` rejects same password as current
- [ ] `POST /users/me/change-email` verifies password + checks email not taken
- [ ] `DELETE /users/me` deletes user + all their data (cascade)
- [ ] `AuditLog` model created with all fields
- [ ] Migration for `audit_log` table created and applied
- [ ] `log_action()` is non-fatal (never raises to caller)
- [ ] `AuditActions` constants defined for all major actions
- [ ] Audit logging added to: login, register, workflow create/delete, credential create/delete
- [ ] `ProfilePage` frontend component built
- [ ] Route `/settings/profile` added to frontend router
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# Update profile
curl -X PUT localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"full_name":"John Doe"}'
# → {"id":"...","email":"...","full_name":"John Doe",...}

# Change password
curl -X POST localhost:8000/api/v1/users/me/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"current_password":"password123","new_password":"newpassword456"}'
# → {"status":"password changed"}

# Old password no longer works
curl -X POST localhost:8000/api/v1/auth/login \
  -d '{"email":"...","password":"password123"}'
# → 401 Unauthorized
```
