# Phase 26 — Advanced Execution: Cancellation, Sub-Workflows, Error Branches

**Status: ⬜ Not Started**

---

## Goal

- Cancel running executions
- Call another workflow as a node (sub-workflow)
- Error branch: route to a different path when a node fails
- Parallel node execution (fan-out/fan-in)

## Prerequisites

- Phase 3 complete (execution pipeline)
- Phase 4 complete (nodes working)

---

## Feature 1: Execution Cancellation

### Step 1: Cancel Status + Signal

Add `cancelled` as a valid status. Use Redis to signal cancellation to the worker.

**File:** `apps/api/app/execution_engine/engine.py` — add:

```python
async def cancel_execution(self, execution_id: uuid.UUID) -> bool:
    """Signal worker to cancel execution. Returns True if signal sent."""
    from apps.api.app.core.redis import get_redis
    redis = await get_redis()
    cancel_key = f"execution:cancel:{execution_id}"
    await redis.set(cancel_key, "1", ex=300)  # 5 min TTL
    return True
```

**File:** `apps/api/app/execution_engine/engine/workflow_runner.py` — add cancellation check:

```python
async def _is_cancelled(self) -> bool:
    """Check Redis for cancellation signal."""
    try:
        from apps.api.app.core.redis import get_redis
        redis = await get_redis()
        result = await redis.get(f"execution:cancel:{self.execution_id}")
        return result is not None
    except Exception:
        return False
```

In `_execute_node_recursive`, check cancellation before each node:

```python
async def _execute_node_recursive(self, node_id: str, input_data: dict):
    if node_id in self.executed_nodes:
        return

    # Check for cancellation signal
    if await self._is_cancelled():
        logger.info(f"Execution {self.execution_id} cancelled before node {node_id}")
        raise CancelledException(f"Execution cancelled at node {node_id}")
```

```python
class CancelledException(Exception):
    pass
```

In `tasks.py`, catch `CancelledException`:

```python
try:
    runner = WorkflowRunner(...)
    output = await runner.run(trigger_data)
    await repo.update_status(execution_id, "completed", output_data=output)
except CancelledException:
    await repo.update_status(uuid.UUID(execution_id), "cancelled")
    await repo.add_log(uuid.UUID(execution_id), "Execution cancelled by user", level="warn")
except Exception as e:
    await repo.update_status(uuid.UUID(execution_id), "failed")
    raise
```

### Step 2: Cancel Endpoint

Add to executions router:

```python
@router.post("/{execution_id}/cancel")
async def cancel_execution(
    execution_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExecutionRepository(db)
    execution = await repo.get_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    if execution.status not in ("pending", "running"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel execution in status: {execution.status}")

    from apps.api.app.execution_engine.engine import execution_engine
    await execution_engine.cancel_execution(execution_id)

    await repo.update_status(execution_id, "cancelling")
    return {"status": "cancellation requested"}
```

---

## Feature 2: Sub-Workflow Node

Call another workflow as a node. The called workflow runs synchronously (within the same Celery task).

### Backend — `apps/api/app/node_system/builtins/sub_workflow.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SubWorkflowNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.sub_workflow",
            name="Sub-Workflow",
            category="logic",
            description="Run another workflow and use its output",
            properties=[
                {"name": "workflow_id", "label": "Workflow ID", "type": "string", "required": True,
                 "placeholder": "UUID of the workflow to call"},
                {"name": "input_data", "label": "Input Data (JSON)", "type": "json", "required": False},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            workflow_id = (self.properties.get("workflow_id") or "").strip()
            extra_input = self.properties.get("input_data") or {}

            if not workflow_id:
                return NodeResult(success=False, error="workflow_id is required")

            import uuid
            from apps.api.app.core.database import AsyncSessionLocal
            from apps.api.app.repositories.workflow_repository import WorkflowRepository
            from apps.api.app.execution_engine.engine.workflow_runner import WorkflowRunner

            async with AsyncSessionLocal() as db:
                repo = WorkflowRepository(db)
                workflow = await repo.get_by_id(uuid.UUID(workflow_id))
                if not workflow:
                    return NodeResult(success=False, error=f"Workflow {workflow_id} not found")

                sub_input = {**input_data, **extra_input}

                runner = WorkflowRunner(
                    workflow_id=str(workflow.id),
                    execution_id=f"{context.execution_id}-sub",
                    graph=workflow.graph,
                    credentials=context.credentials,
                )
                output = await runner.run(sub_input)

            return NodeResult(
                success=True,
                output_data={"sub_workflow_output": output, "workflow_id": workflow_id},
            )
        except Exception as e:
            logger.error(f"SubWorkflowNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

Register:
```python
from apps.api.app.node_system.builtins.sub_workflow import SubWorkflowNode
node_registry.register(SubWorkflowNode)
```

---

## Feature 3: Error Branch

When a node fails, execution currently stops that branch. Add support for an "on error" edge that continues execution with error info.

### Edge Type Convention

Edges have an optional `type` field:
- No type / `"default"` → normal execution path
- `"error"` → only followed when source node fails

### Update WorkflowRunner

```python
async def _execute_node_recursive(self, node_id: str, input_data: dict):
    ...
    if result.success:
        self.node_outputs[node_id] = result.output_data
        await self._emit("node_completed", ...)
        # Follow default/normal edges
        next_edges = [e for e in self.edges if e['source'] == node_id and e.get('type') != 'error']
        for edge in next_edges:
            await self._execute_node_recursive(edge['target'], result.output_data)
    else:
        await self._emit("node_failed", {"node_id": node_id, "error": result.error})
        logger.error(f"Node {node_id} failed: {result.error}")

        # Follow error edges if they exist
        error_edges = [e for e in self.edges if e['source'] == node_id and e.get('type') == 'error']
        if error_edges:
            error_data = {**input_data, "error": result.error, "failed_node": node_id}
            for edge in error_edges:
                await self._execute_node_recursive(edge['target'], error_data)
        # If no error edges, the branch stops (original behavior)
```

### Frontend Edge Type

When connecting nodes, right-click on edge → "Set as Error Branch". This sets `edge.type = "error"` and displays the edge in red.

---

## Feature 4: Parallel Execution (Fan-Out)

When multiple edges leave a node, run them in parallel instead of sequentially.

### Update WorkflowRunner

```python
if result.success:
    next_edges = [e for e in self.edges if e['source'] == node_id and e.get('type') != 'error']
    if len(next_edges) > 1:
        # Fan-out: run branches in parallel
        import asyncio
        await asyncio.gather(*[
            self._execute_node_recursive(edge['target'], result.output_data)
            for edge in next_edges
        ])
    elif len(next_edges) == 1:
        await self._execute_node_recursive(next_edges[0]['target'], result.output_data)
```

---

## Checklist

### Cancellation
- [ ] `cancel_execution()` sets Redis key `execution:cancel:{id}`
- [ ] `WorkflowRunner._is_cancelled()` checks Redis before each node
- [ ] `CancelledException` raised when cancelled
- [ ] `tasks.py` catches `CancelledException` → sets status `cancelled`
- [ ] `POST /executions/{id}/cancel` sets `cancelling` status, sends Redis signal
- [ ] `cancelled` status handled in `ExecutionOut` schema
- [ ] Cancel button shown in frontend execution panel when status is `running`

### Sub-Workflow
- [ ] `SubWorkflowNode` loads workflow by ID and runs it synchronously
- [ ] Sub-workflow execution uses same credentials as parent
- [ ] Sub-workflow execution_id uses `{parent_id}-sub` suffix
- [ ] Node registered in backend and frontend

### Error Branch
- [ ] `WorkflowRunner` checks `edge.type == 'error'` for error routing
- [ ] Error data includes `error` message and `failed_node` ID
- [ ] Normal edges NOT followed on failure, error edges ARE followed
- [ ] Frontend allows marking an edge as error type (visual distinction)

### Parallel Execution
- [ ] Fan-out edges run with `asyncio.gather()` not sequential loop
- [ ] `make lint` passes

---

## Acceptance Criteria

```bash
TOKEN="eyJ..."

# Test cancellation
EXEC_ID=$(curl -X POST localhost:8000/api/v1/workflows/{id}/run \
  -H "Authorization: Bearer $TOKEN" | jq -r .execution_id)

curl -X POST localhost:8000/api/v1/executions/$EXEC_ID/cancel \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"cancellation requested"}

# Wait 1s and check
curl localhost:8000/api/v1/executions/$EXEC_ID \
  -H "Authorization: Bearer $TOKEN"
# → {"status":"cancelled",...}

# Test sub-workflow
# Create workflow A that runs workflow B (by ID)
# Run workflow A → workflow B executes, output appears in A's execution
```
