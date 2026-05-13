---
name: add-trigger
description: Create or update a Fuse webhook trigger — FastAPI webhook handler, trigger node definition, and all registrations. Use when adding webhook support for a service under apps/api/app/api/v1/triggers/ or packages/node-definitions/.
---

# Add Trigger Skill

You are an expert at creating webhook triggers for Fuse. A trigger is a node that starts a workflow when an external event fires a webhook.

## Your Task

1. Research what webhook events the service supports
2. Create the trigger node definition (frontend)
3. Create the FastAPI webhook handler (backend)
4. Register everything

## Hard Rule: No Guessed Webhook Payload Schemas

If the service docs do not clearly show the webhook payload JSON for an event, you MUST tell the user instead of guessing.

- Do NOT invent payload field names
- Do NOT guess nested event object paths
- Do NOT write handler logic against unverified webhook bodies
- If the payload shape is unknown: ask the user for sample payloads

## Directory Structure

```
apps/api/app/api/v1/triggers/
└── {service}_handler.py      # FastAPI webhook endpoint + payload processing

packages/node-definitions/src/
└── {service}.ts              # Trigger NodeDefinition (already exists for most services)

apps/api/app/models/trigger.py  # Trigger DB model (no changes usually needed)
```

## Step 1: Create Trigger Node Definition (Frontend)

Add trigger node to `packages/node-definitions/src/{service}.ts`:

```typescript
import type { NodeDefinition } from './registry'

export const {Service}{Event}TriggerNode: NodeDefinition = {
  type: 'trigger.{service}_{event}',
  name: '{Service} {Event}',
  category: 'trigger',
  description: 'Trigger workflow when {event description}',
  icon: '{service}',
  credentialType: '{service}_oauth',  // omit if no credentials needed

  properties: [
    // Credential (if OAuth-required)
    {
      name: 'credential',
      label: '{Service} Account',
      type: 'credential',
      credentialType: '{service}_oauth',
      required: true,
    },
    // Optional filter fields
    {
      name: 'filter_{field}',
      label: 'Filter by {Field}',
      type: 'string',
      required: false,
      placeholder: 'Leave empty to receive all events',
      mode: 'advanced',
    },
  ],

  inputs: 0,    // Triggers have no inputs
  outputs: 1,   // Triggers produce one output
}
```

Register in `packages/node-definitions/src/registry.ts`:
```typescript
import { {Service}{Event}TriggerNode } from './{service}'

export const NODE_REGISTRY: NodeDefinition[] = [
  // ... existing nodes ...
  {Service}{Event}TriggerNode,
]
```

## Step 2: Create FastAPI Webhook Handler (Backend)

### File Location
`apps/api/app/api/v1/triggers/{service}_handler.py`

```python
import hashlib
import hmac
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import get_db
from apps.api.app.core.logger import get_logger
from apps.api.app.core.security import verify_webhook_signature
from apps.api.app.services.workflow_service import WorkflowService

logger = get_logger(__name__)
router = APIRouter(prefix='/webhooks/{service}', tags=['{service}-webhooks'])


def _verify_{service}_signature(payload: bytes, secret: str, signature: str) -> bool:
    """Verify {Service} webhook HMAC signature."""
    if not secret or not signature:
        return False
    computed = hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256,
    ).hexdigest()
    # Use constant-time comparison to prevent timing attacks
    return hmac.compare_digest(computed, signature.removeprefix('sha256='))


@router.post('/{event}')
async def handle_{service}_{event}(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_{service}_signature: Optional[str] = Header(None),
):
    """Handle {Service} {event} webhook."""
    raw_body = await request.body()
    payload: Dict[str, Any] = await request.json()

    # Verify signature if secret is configured
    # NOTE: fetch the secret from the trigger configuration in DB
    # and verify before processing

    event_type = payload.get('type') or payload.get('event')
    logger.info(f'Received {service} webhook: {event_type}')

    # Extract meaningful data from the payload
    # DO NOT guess field names — use only documented payload fields
    output_data = {
        'event_type': event_type,
        'id': payload.get('id'),
        # Add documented fields here
    }

    # Find matching trigger workflows and enqueue them
    service = WorkflowService(db=db)
    await service.trigger_workflows(
        trigger_type='trigger.{service}_{event}',
        trigger_data=output_data,
    )

    return {'status': 'ok'}
```

### Register the router

In `apps/api/app/api/v1/router.py`:
```python
from apps.api.app.api.v1.triggers.{service}_handler import router as {service}_webhook_router

v1_router.include_router({service}_webhook_router)
```

## Step 3: HMAC Signature Verification

Always verify signatures for services that provide them.

### Pattern

```python
import hashlib
import hmac

def verify_signature(raw_body: bytes, secret: str, signature_header: str) -> bool:
    """Constant-time HMAC verification."""
    if not secret or not signature_header:
        return False
    computed = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    received = signature_header.removeprefix('sha256=')
    return hmac.compare_digest(computed, received)
```

**Security rules:**
- Always use `hmac.compare_digest` — never `==` for signature comparison (timing attack)
- Always verify against the **raw body bytes**, not parsed JSON (re-serialization changes the signature)
- Reject if secret is missing (fail-closed, not fail-open)
- Never log secrets or tokens

## Output Alignment (Critical)

The `output_data` returned by the handler **must match** the properties the frontend node exposes as outputs. If the handler returns `event_type` and `id`, the frontend node definition should document those as available outputs via the node's output schema (when implemented).

## Checklist

### Trigger Definition (Frontend)
- [ ] `type` uses format `'trigger.{service}_{event}'`
- [ ] `inputs: 0` (triggers never have inputs)
- [ ] `outputs: 1`
- [ ] `category: 'trigger'`
- [ ] Optional filter fields use `mode: 'advanced'`
- [ ] Registered in `packages/node-definitions/src/registry.ts`

### Webhook Handler (Backend)
- [ ] Handler in `apps/api/app/api/v1/triggers/{service}_handler.py`
- [ ] Signature verification uses `hmac.compare_digest` (not `==`)
- [ ] Signature verified against raw bytes (not parsed JSON)
- [ ] Fail-closed: reject requests when secret is missing
- [ ] Handler extracts only documented payload fields
- [ ] Handler calls `WorkflowService.trigger_workflows(trigger_type=..., trigger_data=...)`
- [ ] Router registered in `apps/api/app/api/v1/router.py`

### Security
- [ ] Webhook secrets never logged
- [ ] HMAC comparison is timing-safe
- [ ] Authentication check runs before payload processing
- [ ] `trigger_type` string matches `NodeDefinition.type` exactly

### Testing
- [ ] `make lint` passes
- [ ] Trigger node type string matches between frontend and backend
- [ ] Handler output keys match expected workflow trigger data schema
