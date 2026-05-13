# WebSocket

Fuse uses WebSockets to stream real-time execution logs and node status updates to the browser.

## Connection

```
ws://localhost:8000/api/v1/ws/executions/{execution_id}
```

Include the JWT token as a query param or header:
```
ws://localhost:8000/api/v1/ws/executions/{id}?token=eyJ...
```

## Message Types

All messages are JSON with a `type` field.

### `node_started`
```json
{
  "type": "node_started",
  "node_id": "node-1",
  "node_type": "action.slack_send_message",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### `node_completed`
```json
{
  "type": "node_completed",
  "node_id": "node-1",
  "success": true,
  "output": { "ts": "1234567890.123456", "channel": "C123" },
  "timestamp": "2024-01-01T00:00:01Z"
}
```

### `node_failed`
```json
{
  "type": "node_failed",
  "node_id": "node-1",
  "error": "Slack credential not found",
  "timestamp": "2024-01-01T00:00:01Z"
}
```

### `execution_completed`
```json
{
  "type": "execution_completed",
  "execution_id": "uuid",
  "status": "completed",
  "timestamp": "2024-01-01T00:00:05Z"
}
```

### `log`
```json
{
  "type": "log",
  "node_id": "node-1",
  "level": "info",
  "message": "Sending message to #general",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Frontend Usage

```typescript
import { useEffect } from 'react'

function useExecutionLogs(executionId: string) {
  useEffect(() => {
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/api/v1/ws/executions/${executionId}`
    )

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      // handle msg.type
    }

    return () => ws.close()
  }, [executionId])
}
```
