# Phase 3 — Execution Pipeline (End-to-End)

**Status: ✅ Completed**

---

## Goal

Trigger a workflow manually via API. Celery worker picks it up. WorkflowRunner executes the DAG. Status tracked in DB. Empty graph completes cleanly.

## Prerequisites

- Phase 2 complete (workflow CRUD working)
- Redis running (`make db-up`)
- Worker can be started (`make worker` in a separate terminal)

---

## Step 1: Create Execution Schemas

**File:** `apps/api/app/schemas/execution.py`

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class ExecutionLogOut(BaseModel):
    id: uuid.UUID
    node_id: Optional[str]
    level: str
    message: str
    payload: Optional[dict]
    timestamp: datetime

    model_config = {"from_attributes": True}


class ExecutionOut(BaseModel):
    id: uuid.UUID
    workflow_id: uuid.UUID
    status: str
    trigger_type: str
    input_data: Optional[dict]
    output_data: Optional[dict]
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    logs: List[ExecutionLogOut] = []

    model_config = {"from_attributes": True}


class ExecutionCreate(BaseModel):
    trigger_type: str = "manual"
    input_data: Optional[dict] = None
```

---

## Step 2: Create Execution Repository

**File:** `apps/api/app/repositories/execution_repository.py`

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apps.api.app.models.workflow import Execution, ExecutionLog
from typing import List, Optional
import uuid
from datetime import datetime, timezone


class ExecutionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, execution: Execution) -> Execution:
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)
        return execution

    async def get_by_id(self, execution_id: uuid.UUID) -> Optional[Execution]:
        result = await self.db.execute(
            select(Execution)
            .where(Execution.id == execution_id)
            .options(selectinload(Execution.logs))
        )
        return result.scalar_one_or_none()

    async def list_by_workflow(self, workflow_id: uuid.UUID) -> List[Execution]:
        result = await self.db.execute(
            select(Execution)
            .where(Execution.workflow_id == workflow_id)
            .order_by(Execution.started_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        execution_id: uuid.UUID,
        status: str,
        output_data: Optional[dict] = None,
    ) -> None:
        result = await self.db.execute(
            select(Execution).where(Execution.id == execution_id)
        )
        execution = result.scalar_one_or_none()
        if execution:
            execution.status = status
            if status == "running":
                execution.started_at = datetime.now(timezone.utc)
            elif status in ("completed", "failed"):
                execution.finished_at = datetime.now(timezone.utc)
            if output_data is not None:
                execution.output_data = output_data
            await self.db.commit()

    async def add_log(
        self,
        execution_id: uuid.UUID,
        message: str,
        level: str = "info",
        node_id: Optional[str] = None,
        payload: Optional[dict] = None,
    ) -> None:
        log = ExecutionLog(
            execution_id=execution_id,
            node_id=node_id,
            level=level,
            message=message,
            payload=payload,
        )
        self.db.add(log)
        await self.db.commit()
```

---

## Step 3: Rewrite Celery Tasks

**File:** `apps/worker/app/jobs/tasks.py`

Remove all the old code. Replace with:

```python
import asyncio
import uuid
from apps.api.app.core.celery import celery_app
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


@celery_app.task(name="execute_workflow", bind=True, max_retries=3)
def execute_workflow(self, execution_id: str, workflow_id: str, graph: dict, trigger_data: dict):
    """Main workflow execution task. Runs async WorkflowRunner in sync Celery context."""
    try:
        asyncio.run(_run_workflow(execution_id, workflow_id, graph, trigger_data))
    except Exception as e:
        logger.error(f"execute_workflow task failed: {e}", exc_info=True)
        raise self.retry(exc=e, countdown=2 ** self.request.retries)


async def _run_workflow(execution_id: str, workflow_id: str, graph: dict, trigger_data: dict):
    from apps.api.app.core.database import AsyncSessionLocal
    from apps.api.app.repositories.execution_repository import ExecutionRepository
    from apps.api.app.execution_engine.engine.workflow_runner import WorkflowRunner

    async with AsyncSessionLocal() as db:
        repo = ExecutionRepository(db)

        # Mark running
        await repo.update_status(uuid.UUID(execution_id), "running")
        await repo.add_log(uuid.UUID(execution_id), "Workflow execution started", level="info")

        try:
            runner = WorkflowRunner(
                workflow_id=workflow_id,
                execution_id=execution_id,
                graph=graph,
            )
            output = await runner.run(trigger_data)

            await repo.update_status(uuid.UUID(execution_id), "completed", output_data=output)
            await repo.add_log(uuid.UUID(execution_id), "Workflow execution completed", level="info")

        except Exception as e:
            logger.error(f"Workflow {workflow_id} failed: {e}", exc_info=True)
            await repo.update_status(uuid.UUID(execution_id), "failed")
            await repo.add_log(uuid.UUID(execution_id), f"Workflow failed: {str(e)}", level="error")
            raise
```

---

## Step 4: Update WorkflowRunner to Return Output

**File:** `apps/api/app/execution_engine/engine/workflow_runner.py`

Update the `run()` method to return the final output data:

```python
async def run(self, trigger_data: dict) -> dict:
    logger.info(f"Starting workflow execution {self.execution_id}")
    start_nodes = self._get_start_nodes()

    if not start_nodes:
        logger.info(f"Workflow {self.workflow_id} has no nodes — completing immediately")
        return {}

    for node_id in start_nodes:
        await self._execute_node_recursive(node_id, trigger_data)

    # Return output of last executed nodes
    if self.executed_nodes:
        last_node = list(self.executed_nodes.values())[-1]
        return last_node.output_data if last_node.success else {}
    return {}
```

---

## Step 5: Update ExecutionEngine to Enqueue Real Task

**File:** `apps/api/app/execution_engine/engine.py`

```python
import uuid
from typing import Any, Optional
from apps.api.app.models.workflow import Execution
from apps.api.app.core.database import AsyncSessionLocal
from apps.api.app.core.logger import get_logger
from sqlalchemy import select

logger = get_logger(__name__)


class ExecutionEngine:
    async def trigger_workflow(
        self,
        workflow_id: uuid.UUID,
        graph: dict,
        trigger_type: str = "manual",
        input_data: Optional[dict] = None,
    ) -> uuid.UUID:
        async with AsyncSessionLocal() as db:
            # Create Execution record (status: pending)
            execution = Execution(
                workflow_id=workflow_id,
                trigger_type=trigger_type,
                status="pending",
                input_data=input_data or {},
            )
            db.add(execution)
            await db.commit()
            await db.refresh(execution)

            execution_id = execution.id

        # Enqueue Celery task AFTER DB commit (so worker can query it)
        from apps.worker.app.jobs.tasks import execute_workflow
        execute_workflow.delay(
            execution_id=str(execution_id),
            workflow_id=str(workflow_id),
            graph=graph,
            trigger_data=input_data or {},
        )

        logger.info(f"Enqueued execution {execution_id} for workflow {workflow_id}")
        return execution_id


execution_engine = ExecutionEngine()
```

---

## Step 6: Update Workflow Router run Endpoint

**File:** `apps/api/app/api/v1/workflows/router.py`

Replace the stub `/run` endpoint:

```python
@router.post("/{workflow_id}/run")
async def run_workflow(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WorkflowService(db)
    workflow = await service.get_workflow(workflow_id, current_user)

    from apps.api.app.execution_engine.engine import execution_engine
    execution_id = await execution_engine.trigger_workflow(
        workflow_id=workflow.id,
        graph=workflow.graph,
        trigger_type="manual",
    )
    return {"execution_id": str(execution_id)}
```

---

## Step 7: Build Executions Router

**File:** `apps/api/app/api/v1/executions/router.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.api.v1.auth.dependencies import get_current_user
from apps.api.app.models.user import User
from apps.api.app.repositories.execution_repository import ExecutionRepository
from apps.api.app.schemas.execution import ExecutionOut
from typing import List
import uuid

router = APIRouter()


@router.get("/", response_model=List[ExecutionOut])
async def list_executions(
    workflow_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExecutionRepository(db)
    return await repo.list_by_workflow(workflow_id)


@router.get("/{execution_id}", response_model=ExecutionOut)
async def get_execution(
    execution_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution not found")
    return execution
```

---

## Step 8: Start Worker and Test

In a separate terminal:
```bash
make worker
# or: cd apps/api && PYTHONPATH=../.. uv run celery -A apps.api.app.core.celery worker --loglevel=info
```

---

## Checklist

- [ ] `ExecutionOut` and `ExecutionLogOut` schemas created with `from_attributes = True`
- [ ] `ExecutionRepository.create()`, `get_by_id()`, `list_by_workflow()`, `update_status()`, `add_log()` implemented
- [ ] `ExecutionRepository.get_by_id()` uses `selectinload(Execution.logs)` to eagerly load logs
- [ ] `ExecutionRepository.update_status()` sets `started_at` when → `running`, `finished_at` when → `completed`/`failed`
- [ ] `tasks.py` has no `print()` — uses `get_logger`
- [ ] `tasks.py` `execute_workflow` task calls `WorkflowRunner` via `asyncio.run()`
- [ ] `tasks.py` marks execution `running` before starting, `completed`/`failed` after
- [ ] `WorkflowRunner.run()` returns `{}` immediately if graph has no nodes (no crash)
- [ ] `ExecutionEngine.trigger_workflow()` creates DB record first, then enqueues task
- [ ] `POST /workflows/{id}/run` returns `{"execution_id": "uuid"}`
- [ ] `GET /executions/{execution_id}` returns `status`, `logs` array
- [ ] Worker starts without errors: `make worker`
- [ ] Celery task visible in worker logs when workflow is triggered
- [ ] Execution with empty graph → status `completed` within 2 seconds
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."
WORKFLOW_ID="..." # from Phase 2

# Trigger
curl -X POST localhost:8000/api/v1/workflows/$WORKFLOW_ID/run \
  -H "Authorization: Bearer $TOKEN"
# → {"execution_id":"abc-123-..."}

EXEC_ID="abc-123-..."

# Poll status (wait 2-3 seconds)
curl localhost:8000/api/v1/executions/$EXEC_ID \
  -H "Authorization: Bearer $TOKEN"
# → {"id":"...","status":"completed","logs":[{"message":"Workflow execution started",...},{"message":"Workflow execution completed",...}]}

# Worker terminal shows:
# [INFO] execute_workflow[abc-123] - Starting workflow execution abc-123
# [INFO] execute_workflow[abc-123] - Workflow abc-123 has no nodes — completing immediately
```

---

## Common Mistakes

- Celery task imports at module level — causes circular imports. Always import inside the function or task body
- Forgetting `asyncio.run()` — Celery tasks are sync, WorkflowRunner is async
- DB session not closed before enqueuing task — worker can't see the execution record
- `selectinload` missing on `get_by_id` — logs come back empty even though they exist
- `tasks.py` importing from `apps.api` — make sure `PYTHONPATH=../..` is set in Makefile (already done)
