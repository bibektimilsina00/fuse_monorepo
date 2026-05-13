# Phase 19 — Workflow Versioning

**Status: ⬜ Not Started**

---

## Goal

Every time a workflow is saved, a version snapshot is created. Users can view version history and restore any previous version. `workflow_version.py` model is implemented.

## Prerequisites

- Phase 2 complete (workflow CRUD working)

---

## Step 1: WorkflowVersion Model

**File:** `apps/api/app/models/workflow_version.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class WorkflowVersion(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflow.id"), nullable=False)
    version_number = Column(Integer, nullable=False)          # 1, 2, 3, ...
    graph_snapshot = Column(JSON, nullable=False)             # full graph at save time
    name_snapshot = Column(String, nullable=False)            # workflow name at save time
    description_snapshot = Column(String, nullable=True)
    change_summary = Column(Text, nullable=True)              # optional user note
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    workflow = relationship("Workflow", back_populates="versions")
```

Add to `Workflow` model (`apps/api/app/models/workflow.py`):
```python
current_version = Column(Integer, default=1)  # current version number
versions = relationship("WorkflowVersion", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowVersion.version_number.desc()")
```

Generate and apply migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create workflow_version table"
make migrate
```

---

## Step 2: Version Repository

**File:** `apps/api/app/repositories/workflow_version_repository.py` (new file)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.workflow_version import WorkflowVersion
from typing import List, Optional
import uuid


class WorkflowVersionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, version: WorkflowVersion) -> WorkflowVersion:
        self.db.add(version)
        await self.db.commit()
        await self.db.refresh(version)
        return version

    async def list_by_workflow(self, workflow_id: uuid.UUID) -> List[WorkflowVersion]:
        result = await self.db.execute(
            select(WorkflowVersion)
            .where(WorkflowVersion.workflow_id == workflow_id)
            .order_by(WorkflowVersion.version_number.desc())
        )
        return list(result.scalars().all())

    async def get_by_number(self, workflow_id: uuid.UUID, version_number: int) -> Optional[WorkflowVersion]:
        result = await self.db.execute(
            select(WorkflowVersion).where(
                WorkflowVersion.workflow_id == workflow_id,
                WorkflowVersion.version_number == version_number,
            )
        )
        return result.scalar_one_or_none()

    async def get_latest_version_number(self, workflow_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(WorkflowVersion.version_number)
            .where(WorkflowVersion.workflow_id == workflow_id)
            .order_by(WorkflowVersion.version_number.desc())
            .limit(1)
        )
        row = result.scalar_one_or_none()
        return row if row is not None else 0
```

---

## Step 3: Version Schemas

**File:** `apps/api/app/schemas/workflow.py` — add:

```python
class WorkflowVersionOut(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    version_number: int
    name_snapshot: str
    description_snapshot: Optional[str]
    change_summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkflowVersionDetailOut(WorkflowVersionOut):
    graph_snapshot: dict   # full graph — only in detail view, not list
```

---

## Step 4: Auto-Version on Save

Update `WorkflowService.update_workflow()` to create a version on every save:

**File:** `apps/api/app/services/workflow_service.py`

```python
async def update_workflow(self, workflow_id: uuid.UUID, data: WorkflowUpdate, user: User) -> Workflow:
    workflow = await self.get_workflow(workflow_id, user)
    update_data = data.model_dump(exclude_unset=True)

    # Create version snapshot BEFORE applying changes
    from apps.api.app.repositories.workflow_version_repository import WorkflowVersionRepository
    from apps.api.app.models.workflow_version import WorkflowVersion

    version_repo = WorkflowVersionRepository(self.repository.db)
    latest_version = await version_repo.get_latest_version_number(workflow_id)
    new_version_number = latest_version + 1

    version = WorkflowVersion(
        workflow_id=workflow_id,
        version_number=new_version_number,
        graph_snapshot=update_data.get("graph", workflow.graph),  # snapshot AFTER update
        name_snapshot=update_data.get("name", workflow.name),
        description_snapshot=update_data.get("description", workflow.description),
        change_summary=update_data.pop("change_summary", None),   # optional, not on Workflow model
    )
    await version_repo.create(version)

    # Update workflow
    update_data["current_version"] = new_version_number
    return await self.repository.update(workflow, update_data)
```

Also create initial version on workflow creation:

```python
async def create_workflow(self, data: WorkflowCreate, user: User) -> Workflow:
    workflow = Workflow(user_id=user.id, name=data.name, description=data.description, graph=data.graph)
    workflow = await self.repository.create(workflow)

    # Create version 1
    from apps.api.app.repositories.workflow_version_repository import WorkflowVersionRepository
    from apps.api.app.models.workflow_version import WorkflowVersion
    version_repo = WorkflowVersionRepository(self.repository.db)
    version = WorkflowVersion(
        workflow_id=workflow.id,
        version_number=1,
        graph_snapshot=data.graph,
        name_snapshot=data.name,
        description_snapshot=data.description,
        change_summary="Initial version",
    )
    await version_repo.create(version)
    return workflow
```

---

## Step 5: Version Endpoints

Add to `apps/api/app/api/v1/workflows/router.py`:

```python
from apps.api.app.schemas.workflow import WorkflowVersionOut, WorkflowVersionDetailOut

@router.get("/{workflow_id}/versions", response_model=List[WorkflowVersionOut])
async def list_versions(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    await service.get_workflow(workflow_id, current_user)  # ownership check

    from apps.api.app.repositories.workflow_version_repository import WorkflowVersionRepository
    version_repo = WorkflowVersionRepository(db)
    return await version_repo.list_by_workflow(workflow_id)


@router.get("/{workflow_id}/versions/{version_number}", response_model=WorkflowVersionDetailOut)
async def get_version(
    workflow_id: uuid.UUID,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    await service.get_workflow(workflow_id, current_user)  # ownership check

    from apps.api.app.repositories.workflow_version_repository import WorkflowVersionRepository
    version_repo = WorkflowVersionRepository(db)
    version = await version_repo.get_by_number(workflow_id, version_number)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.post("/{workflow_id}/versions/{version_number}/restore", response_model=WorkflowOut)
async def restore_version(
    workflow_id: uuid.UUID,
    version_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)

    from apps.api.app.repositories.workflow_version_repository import WorkflowVersionRepository
    version_repo = WorkflowVersionRepository(db)
    version = await version_repo.get_by_number(workflow_id, version_number)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Restore: update workflow to version's graph (creates a new version)
    from apps.api.app.schemas.workflow import WorkflowUpdate
    update_data = WorkflowUpdate(
        name=version.name_snapshot,
        description=version.description_snapshot,
        graph=version.graph_snapshot,
    )
    restored = await service.update_workflow(workflow_id, update_data, current_user)
    return restored
```

---

## Step 6: Frontend Version History Panel

**File:** `apps/web/src/features/workflow-editor/VersionHistoryPanel.tsx`

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '@/services/api'
import { workflowKeys } from '@/hooks/workflows/keys'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  workflowId: string
  onRestore: () => void
}

interface Version {
  id: string
  version_number: number
  name_snapshot: string
  change_summary?: string
  created_at: string
}

export function VersionHistoryPanel({ workflowId, onRestore }: Props) {
  const queryClient = useQueryClient()

  const { data: versions } = useQuery({
    queryKey: [...workflowKeys.detail(workflowId), 'versions'],
    queryFn: async () => {
      const { data } = await api.get<Version[]>(`/workflows/${workflowId}/versions`)
      return data
    },
    staleTime: 1000 * 30,
  })

  const restore = useMutation({
    mutationFn: async (versionNumber: number) => {
      const { data } = await api.post(`/workflows/${workflowId}/versions/${versionNumber}/restore`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflowId) })
      onRestore()
    },
  })

  return (
    <div className="w-72 border-l border-slate-200 bg-white overflow-y-auto">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Version History</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {versions?.map((v) => (
          <div key={v.id} className="p-3 hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">v{v.version_number}</span>
              <button
                onClick={() => restore.mutate(v.version_number)}
                disabled={restore.isPending}
                className="text-xs text-blue-600 hover:underline"
              >
                Restore
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{v.change_summary || 'No description'}</p>
            <p className="text-xs text-slate-400">{new Date(v.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Checklist

- [ ] `WorkflowVersion` model created with `id`, `workflow_id`, `version_number`, `graph_snapshot`, `name_snapshot`, `change_summary`
- [ ] `Workflow.current_version` column added
- [ ] `Workflow.versions` relationship added
- [ ] Alembic migration created and applied
- [ ] `WorkflowVersionRepository`: `create`, `list_by_workflow`, `get_by_number`, `get_latest_version_number`
- [ ] `WorkflowVersionOut` schema without `graph_snapshot` (list view — don't return full graphs)
- [ ] `WorkflowVersionDetailOut` schema with `graph_snapshot` (single version view)
- [ ] Version 1 created automatically when workflow is created
- [ ] New version created automatically on every `update_workflow()` call
- [ ] `GET /workflows/{id}/versions` returns version list (no graph data)
- [ ] `GET /workflows/{id}/versions/{n}` returns version with full graph
- [ ] `POST /workflows/{id}/versions/{n}/restore` restores graph and creates new version
- [ ] Restore ownership-checked — can't restore other user's workflow version
- [ ] `VersionHistoryPanel` component built and wired into editor
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."
WF_ID="..."

# Create workflow
curl -X POST localhost:8000/api/v1/workflows/$WF_ID \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"v1 name"}'
# → version 1 created automatically

# Update (creates v2)
curl -X PUT localhost:8000/api/v1/workflows/$WF_ID \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"v2 name"}'

# List versions
curl localhost:8000/api/v1/workflows/$WF_ID/versions \
  -H "Authorization: Bearer $TOKEN"
# → [{"version_number":2,...},{"version_number":1,...}]

# Restore v1 (creates v3)
curl -X POST localhost:8000/api/v1/workflows/$WF_ID/versions/1/restore \
  -H "Authorization: Bearer $TOKEN"
# → {"name":"v1 name","current_version":3,...}

# List again
curl localhost:8000/api/v1/workflows/$WF_ID/versions \
  -H "Authorization: Bearer $TOKEN"
# → 3 versions
```
