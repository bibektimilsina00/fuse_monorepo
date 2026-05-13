# Phase 13 — Schedule (Cron) Triggers

**Status: ⬜ Not Started**

---

## Goal

Workflows run automatically on a cron schedule. Celery beat checks every minute for due triggers and enqueues executions.

## Prerequisites

- Phase 12 complete (Trigger model exists)

---

## Step 1: Add Cron Fields to Trigger Model

The `Trigger` model already exists. Add cron-specific config structure convention:

Cron triggers use `config` field:
```json
{
  "cron": "0 9 * * 1-5",
  "timezone": "UTC",
  "last_run_at": null
}
```

No schema change needed — `config` is already JSON.

---

## Step 2: Celery Beat Schedule

**File:** `apps/api/app/execution_engine/scheduler/cron.py`

```python
from apps.api.app.core.celery import celery_app
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


@celery_app.task(name="check_cron_triggers")
def check_cron_triggers():
    """Run every minute via Celery beat. Finds due cron triggers and enqueues executions."""
    import asyncio
    asyncio.run(_check_and_fire_cron_triggers())


async def _check_and_fire_cron_triggers():
    from datetime import datetime, timezone
    from croniter import croniter
    from apps.api.app.core.database import AsyncSessionLocal
    from apps.api.app.repositories.trigger_repository import TriggerRepository
    from apps.api.app.repositories.workflow_repository import WorkflowRepository
    from apps.api.app.execution_engine.engine import execution_engine

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        repo = TriggerRepository(db)
        workflow_repo = WorkflowRepository(db)
        triggers = await repo.list_active_by_type("cron")

        for trigger in triggers:
            cron_expr = trigger.config.get("cron")
            if not cron_expr:
                continue

            try:
                citer = croniter(cron_expr, now)
                last_expected = citer.get_prev(datetime)

                last_run_str = trigger.config.get("last_run_at")
                if last_run_str:
                    last_run = datetime.fromisoformat(last_run_str)
                    if last_run >= last_expected:
                        continue  # Already ran for this window

                # Due — fire it
                logger.info(f"Firing cron trigger {trigger.id} (cron: {cron_expr})")
                workflow = await workflow_repo.get_by_id(trigger.workflow_id)
                if not workflow:
                    continue

                await execution_engine.trigger_workflow(
                    workflow_id=workflow.id,
                    graph=workflow.graph,
                    trigger_type="cron",
                    input_data={"trigger_id": str(trigger.id), "fired_at": now.isoformat()},
                )

                # Update last_run_at
                trigger.config = {**trigger.config, "last_run_at": now.isoformat()}
                await db.commit()

            except Exception as e:
                logger.error(f"Cron trigger {trigger.id} failed: {e}", exc_info=True)
```

---

## Step 3: Install croniter

Add to `apps/api/pyproject.toml`:
```toml
"croniter>=2.0.0",
```
Run: `cd apps/api && uv sync`

---

## Step 4: Configure Celery Beat

**File:** `apps/api/app/core/celery.py` — add beat schedule:

```python
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "check-cron-triggers": {
        "task": "check_cron_triggers",
        "schedule": crontab(minute="*"),  # every minute
    },
}
celery_app.conf.timezone = "UTC"
```

Also add import of the scheduler module so tasks register:
```python
celery_app.conf.update(
    include=[
        "apps.worker.app.jobs.tasks",
        "apps.api.app.execution_engine.scheduler.cron",
    ],
)
```

---

## Step 5: Start Celery Beat

Add to `Makefile`:
```makefile
beat:
	cd apps/api && PYTHONPATH=../.. uv run celery -A apps.api.app.core.celery beat --loglevel=info
```

Run in separate terminal alongside the worker:
```bash
make beat
```

---

## Step 6: Cron Trigger API Endpoint

Add to triggers router (`apps/api/app/api/v1/triggers/router.py`):

```python
@router.post("/cron", response_model=TriggerOut, status_code=status.HTTP_201_CREATED)
async def create_cron_trigger(
    workflow_id: uuid.UUID,
    cron: str,
    name: str = "Scheduled Run",
    timezone_str: str = "UTC",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from croniter import croniter
    if not croniter.is_valid(cron):
        raise HTTPException(status_code=400, detail=f"Invalid cron expression: {cron}")

    workflow_repo = WorkflowRepository(db)
    workflow = await workflow_repo.get_by_id_and_user(workflow_id, current_user.id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    trigger = Trigger(
        workflow_id=workflow_id,
        user_id=current_user.id,
        type="cron",
        name=name,
        config={"cron": cron, "timezone": timezone_str, "last_run_at": None},
    )

    repo = TriggerRepository(db)
    trigger = await repo.create(trigger)
    return TriggerOut.model_validate(trigger)
```

---

## Checklist

- [ ] `croniter` added to `pyproject.toml` + `uv sync` run
- [ ] `check_cron_triggers` Celery task defined in `scheduler/cron.py`
- [ ] Task checks `last_run_at` to avoid double-firing within same minute
- [ ] Task updates `last_run_at` after firing execution
- [ ] Task catches exceptions per-trigger so one failure doesn't block others
- [ ] Celery beat schedule configured: `check_cron_triggers` every minute
- [ ] `celery_app.conf.include` includes `apps.api.app.execution_engine.scheduler.cron`
- [ ] `make beat` command added to Makefile
- [ ] `POST /triggers/cron` validates cron expression before saving
- [ ] Invalid cron expression returns 400
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."
WORKFLOW_ID="..."

# Create cron trigger (runs every minute for testing)
curl -X POST "localhost:8000/api/v1/triggers/cron?workflow_id=$WORKFLOW_ID&cron=*+*+*+*+*&name=Every+Minute" \
  -H "Authorization: Bearer $TOKEN"
# → {"id":"...","type":"cron","config":{"cron":"* * * * *",...}}

# Start beat in another terminal
# make beat

# Wait 1-2 minutes

# Check executions — should see new ones appearing
curl "localhost:8000/api/v1/executions/?workflow_id=$WORKFLOW_ID" \
  -H "Authorization: Bearer $TOKEN"
# → [{"status":"completed","trigger_type":"cron",...}, ...]
```

---

## Common Mistakes

- `croniter` prev/next calculation timezone issues — always use UTC, convert only for display
- Beat task double-firing: checking `last_run_at` is essential — without it the same workflow fires every minute even after update
- `beat` process must run alongside `worker` — they are separate processes
- Cron `* * * * *` (every minute) is good for testing. Change to `0 9 * * 1-5` (9am weekdays) for production
- `celery_app.conf.include` must list ALL task modules or beat can't find the task
