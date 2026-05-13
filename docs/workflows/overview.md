# Workflows

A workflow is a directed acyclic graph (DAG) of nodes connected by edges. It defines what runs and in what order.

## Workflow Graph Schema

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "trigger.webhook",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Webhook Trigger",
        "properties": {
          "path": "my-webhook-path"
        }
      }
    },
    {
      "id": "node-2",
      "type": "action.slack_send_message",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "Send Slack Message",
        "properties": {
          "channel": "C1234567890",
          "text": "Workflow triggered!"
        }
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "node-1",
      "target": "node-2"
    }
  ]
}
```

## Execution Model

- **Start nodes**: nodes with no incoming edges — they receive `trigger_data` as input
- **Data flow**: each node's `output_data` becomes the next node's `input_data`
- **Branching**: one node can connect to multiple downstream nodes (fan-out)
- **Merging**: not yet supported — each node has exactly one input connection

## Trigger Types

| Trigger | `trigger_type` | How it starts |
|---|---|---|
| Manual | `manual` | User clicks "Run" in UI |
| Webhook | `webhook` | POST to `/webhooks/{service}/{event}` |
| Schedule | `cron` | Celery beat scheduler (planned) |

## Node Data Flow

```
trigger_data
    │
    ▼
[node-1] execute(input_data=trigger_data)
    │ output_data: { ts: "...", channel: "..." }
    ▼
[node-2] execute(input_data=node-1.output_data)
    │
    ▼
  ...
```

Each node can reference previous node outputs via `input_data` in its execution context.

## Workflow Versions

The `Workflow` model stores `schema_version` for future migration support. Current version: `1.0.0`.

## Building in the UI

1. Drag nodes from the left panel onto the canvas
2. Connect node outputs to inputs by dragging from the node handle
3. Click a node to configure its properties
4. Click "Save Workflow" to persist
5. Click "Run" to trigger a manual execution
6. Watch real-time logs in the execution panel via WebSocket

## DB Model

```python
class Workflow(Base):
    id: UUID
    name: str
    description: str | None
    schema_version: str        # "1.0.0"
    graph: dict                # { nodes: [...], edges: [...] }
    is_active: bool
    created_at: datetime
    updated_at: datetime

class Execution(Base):
    id: UUID
    workflow_id: UUID
    status: str                # pending | running | completed | failed
    trigger_type: str          # manual | webhook | cron
    input_data: dict | None    # trigger payload
    output_data: dict | None   # final node output
    started_at: datetime | None
    finished_at: datetime | None
```
