# Phase 25 — Workflow Templates & Import/Export

**Status: ⬜ Not Started**

---

## Goal

Users can export workflows as JSON, import from JSON, and use pre-built templates. `integration.py` model implemented for stored integration configs.

## Prerequisites

- Phase 2 complete (workflow CRUD)
- Phase 19 complete (versioning, for template snapshots)

---

## Step 1: Integration Model

The `integration.py` model stores configured integrations per workspace (which services are connected, their config, status).

**File:** `apps/api/app/models/integration.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class Integration(Base):
    """Represents a configured integration (e.g., "Connected Slack workspace XYZ")."""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspace.id"), nullable=False)
    service = Column(String, nullable=False)        # e.g. "slack", "github", "notion"
    name = Column(String, nullable=False)           # e.g. "My Slack Workspace"
    credential_id = Column(UUID(as_uuid=True), ForeignKey("credential.id"), nullable=True)
    config = Column(JSON, nullable=False, default=dict)  # service-specific config
    is_active = Column(Boolean, default=True)
    last_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
```

Migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create integration table"
make migrate
```

---

## Step 2: Integration Service

**File:** `apps/api/app/services/integration_service.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from apps.api.app.models.integration import Integration
from apps.api.app.core.logger import get_logger
import uuid

logger = get_logger(__name__)


class IntegrationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_integrations(self, workspace_id: uuid.UUID) -> list[Integration]:
        result = await self.db.execute(
            select(Integration).where(Integration.workspace_id == workspace_id)
        )
        return list(result.scalars().all())

    async def get_integration(self, integration_id: uuid.UUID, workspace_id: uuid.UUID) -> Integration | None:
        result = await self.db.execute(
            select(Integration).where(
                Integration.id == integration_id,
                Integration.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def verify_integration(self, integration: Integration) -> bool:
        """Test if the integration's credential is still valid."""
        try:
            from apps.api.app.credential_manager.encryption.aes import encryption_service
            import json

            result = await self.db.execute(
                __import__('sqlalchemy').select(
                    __import__('apps.api.app.models.credential', fromlist=['Credential']).Credential
                ).where(
                    __import__('apps.api.app.models.credential', fromlist=['Credential']).Credential.id == integration.credential_id
                )
            )
            credential = result.scalar_one_or_none()
            if not credential:
                return False

            cred_data = json.loads(encryption_service.decrypt(credential.encrypted_data))
            # Service-specific ping/verify
            if integration.service == "slack":
                import httpx
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        "https://slack.com/api/auth.test",
                        headers={"Authorization": f"Bearer {cred_data.get('access_token')}"},
                    )
                    return resp.json().get("ok", False)
            return True
        except Exception as e:
            logger.warning(f"Integration {integration.id} verification failed: {e}")
            return False
```

---

## Step 3: Import/Export

### Export Endpoint

**Add to `apps/api/app/api/v1/workflows/router.py`:**

```python
from fastapi.responses import JSONResponse
import json

@router.get("/{workflow_id}/export")
async def export_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export workflow as downloadable JSON."""
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)

    export_data = {
        "fuse_export_version": "1.0",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "workflow": {
            "name": workflow.name,
            "description": workflow.description,
            "schema_version": workflow.schema_version,
            "graph": workflow.graph,
        },
    }

    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f'attachment; filename="{workflow.name.replace(" ", "_")}.json"',
            "Content-Type": "application/json",
        },
    )
```

### Import Endpoint

```python
from pydantic import BaseModel

class WorkflowImport(BaseModel):
    name: str | None = None         # override name on import
    graph: dict
    description: str | None = None

@router.post("/import", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def import_workflow(
    data: WorkflowImport,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import a workflow from exported JSON."""
    from apps.api.app.schemas.workflow import WorkflowCreate
    create_data = WorkflowCreate(
        name=data.name or "Imported Workflow",
        description=data.description,
        graph=data.graph,
    )
    service = WorkflowService(db)
    return await service.create_workflow(create_data, current_user)
```

---

## Step 4: Workflow Templates

Templates are pre-built workflows stored as static JSON. On first run, seed them to DB.

### Template Storage

**File:** `apps/api/app/data/templates/` — create directory with JSON files:

**`apps/api/app/data/templates/http_to_slack.json`:**
```json
{
  "name": "HTTP Request to Slack",
  "description": "Fetch data from an API and send it to Slack",
  "category": "notifications",
  "thumbnail": null,
  "graph": {
    "nodes": [
      {
        "id": "n1",
        "type": "trigger.webhook",
        "position": {"x": 0, "y": 0},
        "data": {"label": "Webhook Trigger", "properties": {"path": "my-webhook"}}
      },
      {
        "id": "n2",
        "type": "action.http_request",
        "position": {"x": 250, "y": 0},
        "data": {"label": "Fetch Data", "properties": {"url": "", "method": "GET"}}
      },
      {
        "id": "n3",
        "type": "action.slack_send_message",
        "position": {"x": 500, "y": 0},
        "data": {"label": "Send to Slack", "properties": {"channel": "", "text": "{{n2.output.body}}"}}
      }
    ],
    "edges": [
      {"id": "e1", "source": "n1", "target": "n2"},
      {"id": "e2", "source": "n2", "target": "n3"}
    ]
  }
}
```

### Template Router

**File:** `apps/api/app/api/v1/workflows/router.py` — add:

```python
import os

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "../../../../data/templates")


@router.get("/templates")
async def list_templates(current_user: User = Depends(get_current_user)):
    """List available workflow templates."""
    templates = []
    if os.path.exists(TEMPLATES_DIR):
        for filename in os.listdir(TEMPLATES_DIR):
            if filename.endswith(".json"):
                with open(os.path.join(TEMPLATES_DIR, filename)) as f:
                    template = json.load(f)
                    templates.append({
                        "id": filename.replace(".json", ""),
                        "name": template["name"],
                        "description": template["description"],
                        "category": template.get("category", "general"),
                    })
    return templates


@router.post("/templates/{template_id}/use", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def use_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a workflow from a template."""
    template_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if not os.path.exists(template_path):
        raise HTTPException(status_code=404, detail="Template not found")

    with open(template_path) as f:
        template = json.load(f)

    from apps.api.app.schemas.workflow import WorkflowCreate
    create_data = WorkflowCreate(
        name=f"{template['name']} (copy)",
        description=template.get("description"),
        graph=template["graph"],
    )
    service = WorkflowService(db)
    return await service.create_workflow(create_data, current_user)
```

---

## Step 5: Workflow Duplication

```python
@router.post("/{workflow_id}/duplicate", response_model=WorkflowOut, status_code=status.HTTP_201_CREATED)
async def duplicate_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a copy of an existing workflow."""
    service = WorkflowService(db)
    original = await service.get_workflow(workflow_id, current_user)

    from apps.api.app.schemas.workflow import WorkflowCreate
    create_data = WorkflowCreate(
        name=f"{original.name} (copy)",
        description=original.description,
        graph=original.graph,
    )
    return await service.create_workflow(create_data, current_user)
```

---

## Step 6: Frontend Template Gallery

**File:** `apps/web/src/features/dashboard/TemplateGallery.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { workflowKeys } from '@/hooks/workflows/keys'

export function TemplateGallery() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: templates } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => (await api.get('/workflows/templates')).data,
    staleTime: 1000 * 60 * 60, // templates rarely change
  })

  const useTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { data } = await api.post(`/workflows/templates/${templateId}/use`)
      return data
    },
    onSuccess: (workflow) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
      navigate(`/workflows/${workflow.id}`)
    },
  })

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Templates</h3>
      <div className="grid grid-cols-3 gap-4">
        {templates?.map((t: any) => (
          <div
            key={t.id}
            className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 cursor-pointer transition-colors"
            onClick={() => useTemplate.mutate(t.id)}
          >
            <h4 className="font-medium text-slate-900 text-sm">{t.name}</h4>
            <p className="text-xs text-slate-500 mt-1">{t.description}</p>
            <span className="mt-2 inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {t.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Checklist

- [ ] `Integration` model: `id`, `workspace_id`, `service`, `name`, `credential_id`, `config`, `is_active`
- [ ] `IntegrationService.list_integrations()` and `verify_integration()` implemented
- [ ] Migration for `integration` table created and applied
- [ ] `GET /workflows/{id}/export` returns JSON with `Content-Disposition` header
- [ ] `POST /workflows/import` creates workflow from exported JSON
- [ ] `apps/api/app/data/templates/` directory created with at least 3 template JSON files
- [ ] `GET /workflows/templates` returns list of template metadata (no graph data)
- [ ] `POST /workflows/templates/{id}/use` creates workflow from template
- [ ] `POST /workflows/{id}/duplicate` creates copy with "(copy)" suffix
- [ ] `TemplateGallery` shown on dashboard page
- [ ] Export button in workflow editor header
- [ ] Import button on dashboard
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# List templates
curl localhost:8000/api/v1/workflows/templates \
  -H "Authorization: Bearer $TOKEN"
# → [{"id":"http_to_slack","name":"HTTP Request to Slack",...}]

# Use template
curl -X POST localhost:8000/api/v1/workflows/templates/http_to_slack/use \
  -H "Authorization: Bearer $TOKEN"
# → {"id":"...","name":"HTTP Request to Slack (copy)","graph":{...}}

# Export
curl localhost:8000/api/v1/workflows/{id}/export \
  -H "Authorization: Bearer $TOKEN" \
  -o my_workflow.json
# → JSON file downloaded

# Import
curl -X POST localhost:8000/api/v1/workflows/import \
  -H "Authorization: Bearer $TOKEN" \
  -d @my_workflow.json
# → {"id":"...","name":"Imported Workflow",...}

# Duplicate
curl -X POST localhost:8000/api/v1/workflows/{id}/duplicate \
  -H "Authorization: Bearer $TOKEN"
# → {"id":"...","name":"My Workflow (copy)",...}
```
