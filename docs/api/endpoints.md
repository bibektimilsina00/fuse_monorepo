# API Endpoints

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/api/v1/openapi.json`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth — `/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register new user |
| `POST` | `/auth/login` | No | Login, returns JWT access token |
| `GET` | `/auth/me` | Yes | Get current user info |

### Register
```json
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Login
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
// Response:
{ "access_token": "eyJ...", "token_type": "bearer" }
```

---

## Workflows — `/workflows`

| Method | Path | Description |
|---|---|---|
| `GET` | `/workflows/` | List all workflows |
| `POST` | `/workflows/` | Create new workflow |
| `GET` | `/workflows/{id}` | Get workflow by ID |
| `PUT` | `/workflows/{id}` | Update workflow |
| `DELETE` | `/workflows/{id}` | Delete workflow |
| `POST` | `/workflows/{id}/run` | Trigger manual execution |

### Workflow Object
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Post to Slack on GitHub PR",
  "description": "Optional description",
  "schema_version": "1.0.0",
  "graph": {
    "nodes": [
      {
        "id": "node-1",
        "type": "trigger.webhook",
        "position": { "x": 100, "y": 100 },
        "data": {
          "label": "Webhook Trigger",
          "properties": { "path": "github-pr" }
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
            "text": "New PR opened!"
          }
        }
      }
    ],
    "edges": [
      { "id": "e1", "source": "node-1", "target": "node-2" }
    ]
  },
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

## Executions — `/executions`

| Method | Path | Description |
|---|---|---|
| `GET` | `/executions/` | List executions (paginated) |
| `GET` | `/executions/{id}` | Get execution details + logs |

### Execution Object
```json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "status": "completed",
  "trigger_type": "manual",
  "input_data": {},
  "output_data": {},
  "started_at": "2024-01-01T00:00:00Z",
  "finished_at": "2024-01-01T00:00:05Z"
}
```

### Status Values
| Status | Meaning |
|---|---|
| `pending` | Queued, not started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Finished with error |

---

## Credentials — `/credentials`

| Method | Path | Description |
|---|---|---|
| `GET` | `/credentials/` | List stored credentials |
| `POST` | `/credentials/` | Store API key credential |
| `DELETE` | `/credentials/{id}` | Remove credential |
| `GET` | `/credentials/oauth/{service}/url` | Get OAuth authorization URL |
| `GET` | `/credentials/oauth/{service}/callback` | OAuth callback (redirect handler) |

---

## Integrations — `/integrations`

| Method | Path | Description |
|---|---|---|
| `GET` | `/integrations/` | List available integrations and their status |

---

## Nodes — `/nodes`

| Method | Path | Description |
|---|---|---|
| `GET` | `/nodes/` | List all registered node types (NODE_REGISTRY) |

---

## Webhooks — `/webhooks`

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/{service}/{event}` | Receive webhook from external service |

Trigger workflows by sending a POST request to the workflow's webhook URL (available in trigger node config).
