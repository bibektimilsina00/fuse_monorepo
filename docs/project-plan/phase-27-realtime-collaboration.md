# Phase 27 — Real-Time Collaboration

**Status: ⬜ Not Started**

---

## Goal

Multiple users can edit the same workflow simultaneously. They see each other's cursors, node selections, and graph changes in real-time. Conflicts resolved via version counter (last write wins with rejection of stale updates).

## Prerequisites

- Phase 9 complete (WebSocket infrastructure in place)
- Phase 20 complete (workspaces — multiple users exist)
- Phase 19 complete (versioning — needed for conflict detection)

---

## Architecture

```
User A moves node
  → frontend sends {type: "node_moved", node_id, position} via WebSocket
  → server broadcasts to all other users in same workflow room
  → User B sees node move instantly

User A edits node property
  → frontend sends {type: "node_updated", node_id, properties} via WebSocket
  → server broadcasts to room

User A clicks Save
  → REST PUT /workflows/{id} with version_number check
  → if version_number matches DB → save + broadcast "graph_saved" event
  → if stale → 409 Conflict → frontend shows "workflow was updated, reload?"

Presence
  → on WebSocket connect: broadcast {type: "user_joined", user_id, name, color}
  → on disconnect: broadcast {type: "user_left", user_id}
  → periodic {type: "cursor_moved", user_id, x, y} on canvas mouse move
```

---

## Step 1: Collaboration WebSocket Room

**File:** `apps/api/app/api/v1/websocket/router.py` — add collaboration endpoint alongside the execution endpoint:

```python
import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from apps.api.app.core.security import decode_token
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

# In-memory room tracking: {workflow_id: set of WebSocket connections}
# For production: replace with Redis pub/sub (same pattern as execution streaming)
_rooms: dict[str, set] = {}


@router.websocket("/collaborate/{workflow_id}")
async def collaboration_websocket(
    websocket: WebSocket,
    workflow_id: str,
    token: str = Query(...),
):
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    # Get user info
    from apps.api.app.core.database import AsyncSessionLocal
    from apps.api.app.repositories.user_repository import UserRepository
    async with AsyncSessionLocal() as db:
        user_repo = UserRepository(db)
        user = await user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            await websocket.close(code=4001)
            return
        user_name = user.full_name or user.email.split("@")[0]

    await websocket.accept()

    # Join room
    if workflow_id not in _rooms:
        _rooms[workflow_id] = set()
    _rooms[workflow_id].add(websocket)

    # Assign a color to this user (deterministic from user_id)
    colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
    color = colors[hash(user_id) % len(colors)]

    logger.info(f"User {user_id} joined collaboration room for workflow {workflow_id}")

    # Announce presence to others
    await _broadcast_to_room(workflow_id, websocket, {
        "type": "user_joined",
        "user_id": user_id,
        "user_name": user_name,
        "color": color,
    })

    # Send current room members to the new user
    await websocket.send_text(json.dumps({
        "type": "room_state",
        "member_count": len(_rooms[workflow_id]),
        "your_color": color,
        "your_user_id": user_id,
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # Attach sender info to all messages
            msg["user_id"] = user_id
            msg["user_name"] = user_name
            msg["color"] = color

            allowed_types = {
                "cursor_moved",
                "node_moved",
                "node_selected",
                "node_deselected",
                "node_updated",
                "node_added",
                "node_deleted",
                "edge_added",
                "edge_deleted",
                "graph_saved",
            }

            if msg.get("type") in allowed_types:
                await _broadcast_to_room(workflow_id, websocket, msg)

    except WebSocketDisconnect:
        logger.info(f"User {user_id} left collaboration room {workflow_id}")
    except Exception as e:
        logger.error(f"Collaboration WebSocket error: {e}", exc_info=True)
    finally:
        _rooms[workflow_id].discard(websocket)
        if not _rooms[workflow_id]:
            del _rooms[workflow_id]

        # Announce departure
        if workflow_id in _rooms:
            await _broadcast_to_room(workflow_id, None, {
                "type": "user_left",
                "user_id": user_id,
                "user_name": user_name,
            })


async def _broadcast_to_room(
    workflow_id: str,
    exclude: WebSocket | None,
    message: dict,
) -> None:
    """Send message to all connections in a room except the sender."""
    if workflow_id not in _rooms:
        return
    dead = set()
    payload = json.dumps(message)
    for ws in _rooms[workflow_id]:
        if ws is exclude:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)
    _rooms[workflow_id] -= dead
```

---

## Step 2: Optimistic Conflict Detection on Save

Update `PUT /workflows/{id}` to accept and check `version_number`:

**File:** `apps/api/app/schemas/workflow.py` — update `WorkflowUpdate`:

```python
class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    graph: Optional[dict] = None
    is_active: Optional[bool] = None
    expected_version: Optional[int] = None  # ADD: for optimistic concurrency
```

**File:** `apps/api/app/services/workflow_service.py` — update `update_workflow()`:

```python
async def update_workflow(self, workflow_id: uuid.UUID, data: WorkflowUpdate, user: User) -> Workflow:
    workflow = await self.get_workflow(workflow_id, user)

    # Optimistic concurrency check
    if data.expected_version is not None and workflow.current_version != data.expected_version:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=409,
            detail={
                "error": "version_conflict",
                "message": "Workflow was modified by another user",
                "current_version": workflow.current_version,
                "your_version": data.expected_version,
            },
        )

    update_data = data.model_dump(exclude_unset=True, exclude={"expected_version"})
    # ... create version snapshot and update (same as before)
```

---

## Step 3: Redis-Backed Room (Production)

The in-memory `_rooms` dict doesn't work with multiple API instances. Replace with Redis pub/sub for production.

**File:** `apps/api/app/api/v1/websocket/collaboration.py` (new file):

```python
import asyncio
import json
from apps.api.app.core.redis import get_redis
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


async def publish_collaboration_event(workflow_id: str, event: dict, exclude_user_id: str = None) -> None:
    """Publish collaboration event to Redis channel for the workflow room."""
    try:
        redis = await get_redis()
        channel = f"collab:{workflow_id}"
        if exclude_user_id:
            event["_exclude_user"] = exclude_user_id
        await redis.publish(channel, json.dumps(event))
    except Exception as e:
        logger.warning(f"Failed to publish collaboration event: {e}")


async def subscribe_to_workflow_room(
    websocket,
    workflow_id: str,
    user_id: str,
):
    """Subscribe to Redis pub/sub and forward messages to WebSocket."""
    from apps.api.app.core.redis import get_redis
    redis = await get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"collab:{workflow_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            # Don't send message back to the user who sent it
            if data.get("_exclude_user") == user_id:
                continue
            data.pop("_exclude_user", None)
            await websocket.send_text(json.dumps(data))
    finally:
        await pubsub.unsubscribe(f"collab:{workflow_id}")
```

In production, the WebSocket handler uses Redis pub/sub:
```python
# When user sends a message:
await publish_collaboration_event(workflow_id, msg, exclude_user_id=user_id)

# Background task listens and forwards to this WebSocket:
listen_task = asyncio.create_task(subscribe_to_workflow_room(websocket, workflow_id, user_id))
```

---

## Step 4: Frontend Collaboration Hook

**File:** `apps/web/src/hooks/collaboration/useCollaboration.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth.store'

export interface CollaboratorState {
  user_id: string
  user_name: string
  color: string
  cursor?: { x: number; y: number }
  selected_node?: string
}

export interface CollabMessage {
  type: string
  user_id?: string
  user_name?: string
  color?: string
  [key: string]: unknown
}

export function useCollaboration(workflowId: string) {
  const token = useAuthStore((s) => s.token)
  const wsRef = useRef<WebSocket | null>(null)
  const [collaborators, setCollaborators] = useState<Map<string, CollaboratorState>>(new Map())
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!workflowId || !token) return

    const ws = new WebSocket(
      `ws://localhost:8000/api/v1/ws/collaborate/${workflowId}?token=${token}`
    )
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)

    ws.onmessage = (e) => {
      const msg: CollabMessage = JSON.parse(e.data)

      setCollaborators((prev) => {
        const next = new Map(prev)
        switch (msg.type) {
          case 'user_joined':
            next.set(msg.user_id!, {
              user_id: msg.user_id!,
              user_name: msg.user_name!,
              color: msg.color!,
            })
            break
          case 'user_left':
            next.delete(msg.user_id!)
            break
          case 'cursor_moved':
            if (next.has(msg.user_id!)) {
              next.set(msg.user_id!, {
                ...next.get(msg.user_id!)!,
                cursor: { x: msg.x as number, y: msg.y as number },
              })
            }
            break
          case 'node_selected':
            if (next.has(msg.user_id!)) {
              next.set(msg.user_id!, {
                ...next.get(msg.user_id!)!,
                selected_node: msg.node_id as string,
              })
            }
            break
          case 'node_deselected':
            if (next.has(msg.user_id!)) {
              next.set(msg.user_id!, {
                ...next.get(msg.user_id!)!,
                selected_node: undefined,
              })
            }
            break
        }
        return next
      })
    }

    return () => ws.close()
  }, [workflowId, token])

  const send = useCallback((message: Omit<CollabMessage, 'user_id' | 'user_name' | 'color'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendCursorMove = useCallback((x: number, y: number) => {
    send({ type: 'cursor_moved', x, y })
  }, [send])

  const sendNodeMoved = useCallback((nodeId: string, position: { x: number; y: number }) => {
    send({ type: 'node_moved', node_id: nodeId, position })
  }, [send])

  const sendNodeSelected = useCallback((nodeId: string) => {
    send({ type: 'node_selected', node_id: nodeId })
  }, [send])

  const sendNodeDeselected = useCallback(() => {
    send({ type: 'node_deselected' })
  }, [send])

  const sendGraphSaved = useCallback((version: number) => {
    send({ type: 'graph_saved', version })
  }, [send])

  return {
    collaborators,
    isConnected,
    send,
    sendCursorMove,
    sendNodeMoved,
    sendNodeSelected,
    sendNodeDeselected,
    sendGraphSaved,
  }
}
```

---

## Step 5: Collaborator Cursors on Canvas

**File:** `apps/web/src/features/workflow-editor/CollaboratorCursors.tsx`

```typescript
import type { CollaboratorState } from '@/hooks/collaboration/useCollaboration'

interface Props {
  collaborators: Map<string, CollaboratorState>
  canvasOffset: { x: number; y: number }
}

export function CollaboratorCursors({ collaborators, canvasOffset }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from(collaborators.values()).map((collab) => {
        if (!collab.cursor) return null
        return (
          <div
            key={collab.user_id}
            className="absolute flex items-center gap-1 transition-transform duration-75"
            style={{
              transform: `translate(${collab.cursor.x + canvasOffset.x}px, ${collab.cursor.y + canvasOffset.y}px)`,
              zIndex: 1000,
            }}
          >
            {/* Cursor arrow */}
            <svg width="16" height="20" viewBox="0 0 16 20" fill={collab.color}>
              <path d="M0 0 L0 16 L4 12 L7 18 L9 17 L6 11 L11 11 Z" />
            </svg>
            {/* Name badge */}
            <span
              className="text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap"
              style={{ backgroundColor: collab.color }}
            >
              {collab.user_name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

---

## Step 6: Collaborator Avatars in Editor Header

**File:** `apps/web/src/features/workflow-editor/CollaboratorAvatars.tsx`

```typescript
import type { CollaboratorState } from '@/hooks/collaboration/useCollaboration'

interface Props {
  collaborators: Map<string, CollaboratorState>
}

export function CollaboratorAvatars({ collaborators }: Props) {
  const list = Array.from(collaborators.values())
  if (list.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-500 mr-1">
        {list.length} other{list.length > 1 ? 's' : ''} here
      </span>
      <div className="flex -space-x-2">
        {list.slice(0, 5).map((collab) => (
          <div
            key={collab.user_id}
            title={collab.user_name}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
            style={{ backgroundColor: collab.color }}
          >
            {collab.user_name[0].toUpperCase()}
          </div>
        ))}
        {list.length > 5 && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-white text-xs font-bold">
            +{list.length - 5}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Step 7: Conflict Notification

**File:** `apps/web/src/features/workflow-editor/ConflictBanner.tsx`

```typescript
interface Props {
  onReload: () => void
  onDismiss: () => void
}

export function ConflictBanner({ onReload, onDismiss }: Props) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 shadow-lg flex items-center gap-4">
      <span className="text-sm text-amber-800">
        ⚠️ This workflow was updated by another user.
      </span>
      <button
        onClick={onReload}
        className="text-sm font-medium text-amber-900 underline"
      >
        Reload latest
      </button>
      <button onClick={onDismiss} className="text-xs text-amber-600">
        Dismiss
      </button>
    </div>
  )
}
```

Wire into `EditorPage.tsx`:

```typescript
// On save, catch 409:
const handleSave = async (graph) => {
  try {
    await updateWorkflow.mutateAsync({ graph, expected_version: currentVersion })
    sendGraphSaved(currentVersion + 1)
  } catch (err: any) {
    if (err.response?.status === 409) {
      setShowConflict(true)
    }
  }
}

// When remote "graph_saved" event received:
// Show conflict banner if user has unsaved changes
```

---

## Step 8: Node Selection Highlights

When another user selects a node, highlight it with their color on the canvas.

In `Editor.tsx`, listen for `node_selected` events from collaborators. For each collaborator with a `selected_node`, add a custom class/style to that ReactFlow node.

```typescript
// In Editor.tsx
const { collaborators, sendNodeSelected, sendNodeMoved } = useCollaboration(workflowId)

// When local user selects a node:
onSelectionChange={({ nodes }) => {
  if (nodes.length === 1) sendNodeSelected(nodes[0].id)
  else sendNodeDeselected()
}}

// Overlay collaborator selections visually:
// Find nodes that other users have selected, add colored outline
const collaboratorSelections = new Map(
  Array.from(collaborators.values())
    .filter((c) => c.selected_node)
    .map((c) => [c.selected_node!, c.color])
)
```

---

## Checklist

### Backend
- [ ] `ws://localhost:8000/api/v1/ws/collaborate/{workflow_id}` endpoint exists
- [ ] JWT token verified on connection — close with 4001 if invalid
- [ ] `user_joined` broadcast when user connects (with name + color)
- [ ] `user_left` broadcast when user disconnects
- [ ] `room_state` sent to new connection (member count, assigned color)
- [ ] All 9 message types relayed: cursor_moved, node_moved, node_selected, node_deselected, node_updated, node_added, node_deleted, edge_added, edge_deleted, graph_saved
- [ ] Messages NOT echoed back to sender
- [ ] Dead WebSocket connections cleaned from room on send failure
- [ ] `WorkflowUpdate.expected_version` field added
- [ ] `update_workflow()` returns 409 when `expected_version` doesn't match DB version
- [ ] 409 response body includes `current_version` and `your_version`

### Frontend
- [ ] `useCollaboration()` hook connects to collab WebSocket
- [ ] Hook tracks `collaborators` Map (user_id → state)
- [ ] Hook exposes `sendCursorMove`, `sendNodeMoved`, `sendNodeSelected`, `sendNodeDeselected`, `sendGraphSaved`
- [ ] `CollaboratorCursors` renders colored cursors at correct canvas positions
- [ ] `CollaboratorAvatars` shows collaborator initials in editor header
- [ ] Mouse move on canvas throttled to `sendCursorMove` (max 30fps — use `throttle()`)
- [ ] Node drag sends `sendNodeMoved` on each position change
- [ ] Node click sends `sendNodeSelected`
- [ ] `ConflictBanner` shown on 409 save error
- [ ] "Reload latest" reloads workflow from API (discarding local changes)
- [ ] Remote `graph_saved` event updates local version tracker
- [ ] `make lint` passes

---

## Acceptance Criteria

1. Open workflow in browser tab A (User A)
2. Open same workflow in browser tab B (User B) — use different login or incognito
3. User B's avatar appears in User A's editor header
4. Move cursor in tab B → colored cursor appears in tab A
5. Click a node in tab B → node gets colored selection outline in tab A
6. Move a node in tab B → `node_moved` event received in tab A (canvas updates on next render/save)
7. User A clicks Save → `graph_saved` event sent to User B
8. User A edits and saves; User B also edits and tries to save → User B gets ConflictBanner

---

## Common Mistakes

- In-memory `_rooms` dict — only works single-instance. Use Redis pub/sub in production (code provided in Step 3)
- Cursor positions are in canvas space, not screen space — must account for ReactFlow viewport transform
- Mouse move throttle missing — sends hundreds of events per second, overwhelms WebSocket
- Broadcasting cursor moves to the sender — user sees their own "ghost cursor"
- Not cleaning dead WebSocket references — `_rooms` grows forever on disconnect without cleanup
- `graph_saved` event not sent after successful save — other users don't know to update their version counter
- `expected_version` not sent on save — 409 conflict detection never triggers
