# Phase 9 — WebSocket Execution Streaming

**Status: ⬜ Not Started**

---

## Goal

Execution logs and node status stream in real-time to the browser via WebSocket while a workflow runs. No more polling.

## Prerequisites

- Phase 8 complete (Slack node works end-to-end)

---

## Architecture

```
WorkflowRunner (Celery worker)
  └─ emits events → Redis pub/sub channel "execution:{id}"

FastAPI WebSocket handler
  └─ subscribes to Redis channel "execution:{id}"
  └─ forwards messages to browser WebSocket connection
```

---

## Step 1: Redis Pub/Sub Publisher (Worker Side)

**File:** `apps/api/app/core/websocket.py`

```python
import json
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


async def publish_execution_event(execution_id: str, event: dict) -> None:
    """Publish execution event to Redis pub/sub. Called from worker."""
    try:
        from apps.api.app.core.redis import get_redis
        redis = await get_redis()
        channel = f"execution:{execution_id}"
        await redis.publish(channel, json.dumps(event))
    except Exception as e:
        logger.warning(f"Failed to publish execution event: {e}")
        # Non-fatal — streaming fails silently, execution continues
```

---

## Step 2: Emit Events from WorkflowRunner

**File:** `apps/api/app/execution_engine/engine/workflow_runner.py`

Add event publishing to `_execute_node_recursive`:

```python
async def _execute_node_recursive(self, node_id: str, input_data: dict):
    if node_id in self.executed_nodes:
        return

    node_data = self.nodes[node_id]

    # Emit NODE_STARTED
    await self._emit("node_started", {"node_id": node_id, "node_type": node_data.get("type")})

    context = NodeContext(
        execution_id=self.execution_id,
        workflow_id=self.workflow_id,
        node_id=node_id,
        variables={},
        credentials=self.credentials,
    )

    result = await node_executor.execute_node(
        node_type=node_data["type"],
        node_id=node_id,
        properties=node_data.get("data", {}).get("properties", {}),
        input_data=input_data,
        context=context,
    )

    self.executed_nodes[node_id] = result

    if result.success:
        # Emit NODE_COMPLETED
        await self._emit("node_completed", {
            "node_id": node_id,
            "output": result.output_data,
        })
        next_edges = [edge for edge in self.edges if edge["source"] == node_id]
        for edge in next_edges:
            await self._execute_node_recursive(edge["target"], result.output_data)
    else:
        # Emit NODE_FAILED
        await self._emit("node_failed", {
            "node_id": node_id,
            "error": result.error,
        })
        logger.error(f"Execution failed at node {node_id}: {result.error}")


async def _emit(self, event_type: str, data: dict) -> None:
    from apps.api.app.core.websocket import publish_execution_event
    import datetime
    await publish_execution_event(self.execution_id, {
        "type": event_type,
        "execution_id": self.execution_id,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        **data,
    })
```

Also emit `execution_started` and `execution_completed` from `tasks.py`:

```python
from apps.api.app.core.websocket import publish_execution_event

await publish_execution_event(execution_id, {"type": "execution_started", "execution_id": execution_id})
# ... run workflow ...
await publish_execution_event(execution_id, {"type": "execution_completed", "execution_id": execution_id, "status": "completed"})
```

---

## Step 3: WebSocket Handler

**File:** `apps/api/app/api/v1/websocket/router.py`

```python
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from apps.api.app.core.logger import get_logger
from apps.api.app.core.security import decode_token

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/executions/{execution_id}")
async def execution_websocket(
    websocket: WebSocket,
    execution_id: str,
    token: str = Query(...),
):
    # Verify JWT token
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for execution {execution_id}")

    from apps.api.app.core.redis import get_redis
    redis = await get_redis()

    # Subscribe to execution channel
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"execution:{execution_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

                # Stop listening after execution completes
                try:
                    data = json.loads(message["data"])
                    if data.get("type") in ("execution_completed", "execution_failed"):
                        break
                except Exception:
                    pass
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for execution {execution_id}")
    except Exception as e:
        logger.error(f"WebSocket error for execution {execution_id}: {e}", exc_info=True)
    finally:
        await pubsub.unsubscribe(f"execution:{execution_id}")
        await websocket.close()
```

Add `decode_token` to `apps/api/app/core/security.py`:

```python
def decode_token(token: str) -> str | None:
    """Returns user_id (sub) from JWT token, or None if invalid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None
```

---

## Step 4: Frontend WebSocket Hook

**File:** `apps/web/src/websocket/client.ts`

```typescript
export type ExecutionEvent =
  | { type: 'execution_started'; execution_id: string }
  | { type: 'execution_completed'; execution_id: string; status: string }
  | { type: 'node_started'; node_id: string; node_type: string }
  | { type: 'node_completed'; node_id: string; output: Record<string, unknown> }
  | { type: 'node_failed'; node_id: string; error: string }

export function connectExecutionWebSocket(
  executionId: string,
  token: string,
  onEvent: (event: ExecutionEvent) => void,
  onClose?: () => void,
): WebSocket {
  const ws = new WebSocket(
    `ws://localhost:8000/api/v1/ws/executions/${executionId}?token=${token}`
  )

  ws.onmessage = (e) => {
    try {
      const event = JSON.parse(e.data) as ExecutionEvent
      onEvent(event)
    } catch {
      // ignore malformed messages
    }
  }

  ws.onclose = () => onClose?.()

  ws.onerror = (e) => {
    console.error('WebSocket error', e)
  }

  return ws
}
```

**File:** `apps/web/src/hooks/executions/useExecutionStream.ts`

```typescript
import { useEffect, useState } from 'react'
import { connectExecutionWebSocket, type ExecutionEvent } from '@/websocket/client'
import { useAuthStore } from '@/stores/auth.store'

export function useExecutionStream(executionId: string | null) {
  const token = useAuthStore((s) => s.token)
  const [events, setEvents] = useState<ExecutionEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!executionId || !token) return

    setEvents([])
    setIsRunning(true)

    const ws = connectExecutionWebSocket(
      executionId,
      token,
      (event) => {
        setEvents((prev) => [...prev, event])
        if (event.type === 'execution_completed' || event.type === 'execution_failed') {
          setIsRunning(false)
        }
      },
      () => setIsRunning(false),
    )

    return () => ws.close()
  }, [executionId, token])

  return { events, isRunning }
}
```

---

## Step 5: Execution Panel in Editor

**File:** `apps/web/src/features/workflow-editor/ExecutionPanel.tsx`

```typescript
import { useExecutionStream } from '@/hooks/executions/useExecutionStream'

interface Props {
  executionId: string | null
}

export function ExecutionPanel({ executionId }: Props) {
  const { events, isRunning } = useExecutionStream(executionId)

  if (!executionId) return null

  return (
    <div className="h-48 border-t border-slate-200 bg-slate-950 text-slate-100 overflow-y-auto p-4 font-mono text-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-semibold text-slate-400">Execution Log</span>
        {isRunning && (
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Running...</span>
        )}
      </div>
      {events.map((event, i) => (
        <div key={i} className="mb-1">
          {event.type === 'node_started' && (
            <span className="text-blue-400">▶ {event.node_id} ({event.node_type})</span>
          )}
          {event.type === 'node_completed' && (
            <span className="text-green-400">✓ {event.node_id} — completed</span>
          )}
          {event.type === 'node_failed' && (
            <span className="text-red-400">✗ {event.node_id} — {event.error}</span>
          )}
          {event.type === 'execution_completed' && (
            <span className="text-green-300 font-semibold">✓ Workflow completed</span>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <span className="text-slate-500">Waiting for events...</span>
      )}
    </div>
  )
}
```

Wire this into `Editor.tsx` — pass `executionId` state down to `ExecutionPanel`.

---

## Checklist

- [ ] `publish_execution_event()` publishes to Redis channel `execution:{id}`
- [ ] `publish_execution_event()` is non-fatal — logs warning and continues if Redis fails
- [ ] `WorkflowRunner._emit()` called on `node_started`, `node_completed`, `node_failed`
- [ ] `tasks.py` emits `execution_started` and `execution_completed` events
- [ ] WebSocket route at `ws://localhost:8000/api/v1/ws/executions/{id}`
- [ ] WebSocket handler verifies JWT token query param — closes with 4001 if invalid
- [ ] WebSocket handler subscribes to Redis pub/sub channel for execution
- [ ] WebSocket handler forwards messages to browser
- [ ] WebSocket handler closes after `execution_completed` or `execution_failed` event
- [ ] `decode_token()` added to `security.py`
- [ ] Frontend `connectExecutionWebSocket()` connects with token query param
- [ ] `useExecutionStream()` hook tracks events and `isRunning` state
- [ ] `ExecutionPanel` renders events as colored log lines
- [ ] Events visible in browser as workflow runs (without page refresh)
- [ ] `make lint` passes

---

## Acceptance Criteria

1. Run workflow from browser
2. Execution panel appears at bottom of editor
3. See `▶ n1 (action.delay)` appear immediately
4. See `✓ n1 — completed` after delay
5. See `▶ n2 (action.http_request)`
6. See `✓ n2 — completed`
7. See `✓ Workflow completed`
8. No polling — all updates arrive in real-time via WebSocket

---

## Common Mistakes

- Redis `pubsub.listen()` is blocking — must use `async for` not `while True`
- WebSocket token must be in query param — browser WebSocket API doesn't support custom headers
- `publish_execution_event` runs in worker process — must use the same Redis URL as the API
- Worker doesn't have `asyncio` event loop by default — wrap all async calls in `asyncio.run()` or use an existing event loop
- Publishing large `output` objects in `node_completed` events can be slow — truncate or omit large outputs
