---
name: add-trigger
description: Create or update a Fuse webhook trigger — FastAPI webhook handler, trigger node definition, and all registrations. Use when adding webhook support for a service under apps/api/app/api/v1/triggers/ or packages/node-definitions/.
---

# Add Trigger Skill

You are an expert at creating webhook triggers for Fuse. A trigger is a node that starts a workflow when an external event fires a webhook.

## Your Task

1. Research what webhook events the service supports
2. Create the trigger node definition (frontend)
3. Create the backend trigger executor (BaseNode)
4. Create the FastAPI webhook handler (API endpoint)
5. Register everything

## Hard Rule: No Guessed Webhook Payload Schemas

If the service docs do not clearly show the webhook payload JSON for an event, you MUST tell the user instead of guessing.

- Do NOT invent payload field names
- Do NOT guess nested event object paths
- Do NOT write handler logic against unverified webhook bodies
- If the payload shape is unknown: ask the user for sample payloads

## Directory Structure

```
packages/node-definitions/src/
└── {service}.ts              # Trigger NodeDefinition

apps/api/app/node_system/builtins/
└── {service}.py              # Trigger BaseNode executor

apps/api/app/api/v1/triggers/
└── {service}_handler.py      # FastAPI webhook endpoint + payload processing
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
      name: 'filter_id',
      label: 'Filter by ID',
      type: 'string',
      required: false,
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

## Step 2: Create Backend Trigger Executor

Triggers need a backend class to be registered in the system and to provide metadata.

### File Location
`apps/api/app/node_system/builtins/{service}.py`

```python
from typing import Any
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_result import NodeResult

class {Service}{Event}TriggerNode(BaseNode):
    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="trigger.{service}_{event}",
            name="{Service} {Event}",
            category="trigger",
            description="Trigger workflow when {event}",
            properties=[
                # Must match frontend properties
                {"name": "filter_id", "label": "Filter ID", "type": "string", "required": False},
            ],
            inputs=0,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        # Triggers usually just pass their input (the webhook payload) through
        return NodeResult(success=True, output_data=input_data)
```

Register in `apps/api/app/node_system/registry/registry.py`:
```python
from apps.api.app.node_system.builtins.{service} import {Service}{Event}TriggerNode
node_registry.register({Service}{Event}TriggerNode)
```

## Step 3: Create FastAPI Webhook Handler

This is the public endpoint that receives the webhook and starts the workflow.

### File Location
`apps/api/app/api/v1/triggers/{service}_handler.py`

```python
import hashlib
import hmac
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.core.database import get_db
from apps.api.app.core.logger import get_logger
from apps.api.app.services.workflow_service import WorkflowService

logger = get_logger(__name__)
router = APIRouter(prefix='/webhooks/{service}', tags=['{service}-webhooks'])

@router.post('/{event}')
async def handle_{service}_{event}(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_signature: Optional[str] = Header(None, alias='X-{Service}-Signature'),
):
    raw_body = await request.body()
    payload = await request.json()

    # 1. Verify signature here (if supported by service)

    # 2. Extract data
    output_data = {
        'id': payload.get('id'),
        'event': payload.get('type'),
        'data': payload.get('data'),
    }

    # 3. Trigger matching workflows
    service = WorkflowService(db)
    await service.trigger_workflows(
        trigger_type='trigger.{service}_{event}',
        trigger_data=output_data,
        # Optional: property_filters={'filter_id': payload.get('id')}
    )

    return {'status': 'ok'}
```

Register in `apps/api/app/api/v1/router.py`:
```python
from apps.api.app.api.v1.triggers.{service}_handler import router as {service}_router
router.include_router({service}_router)
```

## Step 4: HMAC Signature Verification

Always verify signatures for services that provide them.

```python
def verify_signature(raw_body: bytes, secret: str, signature: str) -> bool:
    if not secret or not signature: return False
    computed = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature.removeprefix('sha256='))
```

## Checklist

### Frontend
- [ ] `type` is `trigger.{service}_{event}`
- [ ] `inputs: 0`, `outputs: 1`
- [ ] Registered in `packages/node-definitions/src/registry.ts`

### Backend Executor
- [ ] Class inherits from `BaseNode`
- [ ] Metadata `type` matches frontend exactly
- [ ] Registered in `apps/api/app/node_system/registry/registry.py`

### Webhook Handler
- [ ] Handler in `apps/api/app/api/v1/triggers/`
- [ ] Signature verified against **raw bytes** (not parsed JSON)
- [ ] Uses `WorkflowService.trigger_workflows()`
- [ ] Router registered in `apps/api/app/api/v1/router.py`

### Security
- [ ] Timing-safe comparison (`hmac.compare_digest`)
- [ ] Secrets/tokens never logged
- [ ] Fail-closed logic (reject if secret missing)
