# Phase 23 — Node Registry API & Node Service

**Status: ⬜ Not Started**

---

## Goal

`/nodes/` API endpoint returns all registered node types for the frontend. `node_service.py` and `node_definition.py` model implemented. `nodes/` router implemented.

## Prerequisites

- Phase 4 complete (nodes registered in backend registry)

---

## Step 1: NodeDefinition Model

The `node_definition.py` is for **custom/user-defined nodes** stored in DB (future feature). For now implement as a DB table that mirrors the in-memory registry, useful for:
- Caching node metadata
- Custom nodes added via API (Phase 25)
- Audit of which nodes are installed

**File:** `apps/api/app/models/node_definition.py`

```python
from sqlalchemy import Column, String, JSON, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime, timezone
from apps.api.app.models.base import Base


class NodeDefinition(Base):
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, nullable=False, unique=True)   # e.g. "action.slack_send_message"
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    properties_schema = Column(JSON, nullable=False, default=list)
    inputs = Column(String, nullable=False, default="1")
    outputs = Column(String, nullable=False, default="1")
    credential_type = Column(String, nullable=True)
    is_builtin = Column(Boolean, default=True)           # False = custom user node
    is_active = Column(Boolean, default=True)
    version = Column(String, default="1.0.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
```

Generate migration:
```bash
cd apps/api && PYTHONPATH=../.. uv run alembic revision --autogenerate -m "create node_definition table"
make migrate
```

---

## Step 2: Node Service

**File:** `apps/api/app/services/node_service.py`

```python
from typing import List, Dict, Any
from apps.api.app.node_system.registry.registry import node_registry
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class NodeService:
    """Service layer for node registry operations."""

    def list_nodes(self) -> List[Dict[str, Any]]:
        """Return all registered node metadata."""
        return node_registry.list_nodes()

    def get_node_metadata(self, node_type: str) -> Dict[str, Any] | None:
        """Return metadata for a specific node type."""
        try:
            node_class = node_registry.get_node(node_type)
            return node_class.get_metadata().model_dump()
        except ValueError:
            return None

    def list_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Return all nodes in a category."""
        return [n for n in self.list_nodes() if n.get("category") == category]

    def search_nodes(self, query: str) -> List[Dict[str, Any]]:
        """Search nodes by name or description."""
        query_lower = query.lower()
        return [
            n for n in self.list_nodes()
            if query_lower in n.get("name", "").lower()
            or query_lower in n.get("description", "").lower()
        ]

    def get_categories(self) -> List[str]:
        """Return all unique categories."""
        return list(set(n.get("category", "") for n in self.list_nodes()))
```

---

## Step 3: Nodes Router

**File:** `apps/api/app/api/v1/nodes/router.py` (create this file):

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.services.node_service import NodeService

router = APIRouter()


@router.get("/")
async def list_nodes(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    current_user: User = Depends(get_current_user),
):
    """List all available node types."""
    service = NodeService()

    if search:
        return service.search_nodes(search)
    if category:
        return service.list_by_category(category)
    return service.list_nodes()


@router.get("/categories")
async def list_categories(
    current_user: User = Depends(get_current_user),
):
    """List all node categories."""
    service = NodeService()
    return {"categories": service.get_categories()}


@router.get("/{node_type:path}")
async def get_node(
    node_type: str,
    current_user: User = Depends(get_current_user),
):
    """Get metadata for a specific node type."""
    service = NodeService()
    node = service.get_node_metadata(node_type)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node type '{node_type}' not found")
    return node
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.nodes.router import router as nodes_router
router.include_router(nodes_router, prefix="/nodes", tags=["nodes"])
```

**Note:** `{node_type:path}` path param handles types with dots like `action.slack_send_message`.

---

## Step 4: Ensure Nodes Register on API Startup

Currently nodes register when the registry module is imported. Make this explicit by importing registry in app startup.

**File:** `apps/api/app/main.py` — add after app creation:

```python
@app.on_event("startup")
async def startup():
    # Import registry to trigger node registrations
    import apps.api.app.node_system.registry.registry  # noqa: F401
    from apps.api.app.core.logger import get_logger
    logger = get_logger(__name__)
    from apps.api.app.node_system.registry.registry import node_registry
    logger.info(f"Node registry initialized with {len(node_registry._nodes)} nodes")
```

---

## Step 5: Execution Logs Router

The `logs/` router stub is for querying execution logs with filters.

**File:** `apps/api/app/api/v1/logs/router.py` (create this file):

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.models.workflow import ExecutionLog
from apps.api.app.schemas.execution import ExecutionLogOut
import uuid

router = APIRouter()


@router.get("/executions/{execution_id}", response_model=List[ExecutionLogOut])
async def get_execution_logs(
    execution_id: uuid.UUID,
    level: Optional[str] = Query(None, description="Filter: info, warn, error"),
    node_id: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ExecutionLog).where(ExecutionLog.execution_id == execution_id)

    if level:
        query = query.where(ExecutionLog.level == level)
    if node_id:
        query = query.where(ExecutionLog.node_id == node_id)

    query = query.order_by(ExecutionLog.timestamp.asc()).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.logs.router import router as logs_router
router.include_router(logs_router, prefix="/logs", tags=["logs"])
```

---

## Step 6: Variables Router

The `variables/` router handles workflow-level variable definitions (not secrets — these are public config values like base URLs, environment names).

**File:** `apps/api/app/api/v1/variables/router.py` (create this file):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
import uuid

router = APIRouter()


class Variable(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class WorkflowVariables(BaseModel):
    workflow_id: uuid.UUID
    variables: List[Variable]


@router.get("/workflows/{workflow_id}")
async def get_workflow_variables(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get variable definitions for a workflow (stored in workflow.graph.variables)."""
    from apps.api.app.repositories.workflow_repository import WorkflowRepository
    repo = WorkflowRepository(db)
    workflow = await repo.get_by_id_and_user(workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    variables = workflow.graph.get("variables", [])
    return {"workflow_id": str(workflow_id), "variables": variables}


@router.put("/workflows/{workflow_id}")
async def set_workflow_variables(
    workflow_id: uuid.UUID,
    data: WorkflowVariables,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save variable definitions into workflow.graph.variables."""
    from apps.api.app.repositories.workflow_repository import WorkflowRepository
    from apps.api.app.schemas.workflow import WorkflowUpdate
    repo = WorkflowRepository(db)
    workflow = await repo.get_by_id_and_user(workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    new_graph = {**workflow.graph, "variables": [v.model_dump() for v in data.variables]}
    await repo.update(workflow, {"graph": new_graph})
    return {"status": "saved", "variable_count": len(data.variables)}
```

Register in `v1/router.py`:
```python
from apps.api.app.api.v1.variables.router import router as variables_router
router.include_router(variables_router, prefix="/variables", tags=["variables"])
```

---

## Checklist

- [ ] `NodeDefinition` model created with all fields
- [ ] Alembic migration created and applied
- [ ] `NodeService.list_nodes()` returns all registered nodes
- [ ] `NodeService.search_nodes()` filters by name/description
- [ ] `NodeService.list_by_category()` filters by category
- [ ] `GET /nodes/` returns all nodes (optionally filtered)
- [ ] `GET /nodes/categories` returns list of unique categories
- [ ] `GET /nodes/{node_type}` returns single node metadata (handles dots in path)
- [ ] Node registry initialized on API startup with count logged
- [ ] `GET /logs/executions/{id}` returns logs (filterable by level, node_id)
- [ ] `GET /variables/workflows/{id}` returns workflow variable definitions
- [ ] `PUT /variables/workflows/{id}` saves variable definitions to graph
- [ ] All 3 new routers registered in `v1/router.py`
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# List all nodes
curl localhost:8000/api/v1/nodes/ \
  -H "Authorization: Bearer $TOKEN"
# → [{"type":"action.http_request","name":"HTTP Request",...}, ...]

# Filter by category
curl "localhost:8000/api/v1/nodes/?category=ai" \
  -H "Authorization: Bearer $TOKEN"
# → only AI nodes

# Search
curl "localhost:8000/api/v1/nodes/?search=slack" \
  -H "Authorization: Bearer $TOKEN"
# → Slack nodes

# Get specific node
curl "localhost:8000/api/v1/nodes/action.slack_send_message" \
  -H "Authorization: Bearer $TOKEN"
# → {"type":"action.slack_send_message","properties":[...]}

# Get execution logs
curl "localhost:8000/api/v1/logs/executions/{exec_id}?level=error" \
  -H "Authorization: Bearer $TOKEN"
# → only error-level logs for that execution
```
