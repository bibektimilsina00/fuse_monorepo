---
name: add-node
description: Create or update a Fuse node — the frontend NodeDefinition (packages/node-definitions) and the backend BaseNode executor (apps/api/app/node_system/builtins). Use when adding a new node type to the canvas or fixing an existing one.
---

# Add Node Skill

You are an expert at creating nodes for Fuse. A node has two parts:
1. **Frontend definition** — `NodeDefinition` in `packages/node-definitions/src/{category}.ts` (TypeScript, controls UI)
2. **Backend executor** — `BaseNode` subclass in `apps/api/app/node_system/builtins/{node_type}.py` (Python, implements execution)

## Hard Rule: No Guessed Integration Outputs

If the underlying integration client's response shape is not documented or live-verified, you MUST tell the user instead of guessing node outputs.

- Do NOT invent output fields for undocumented API responses
- Do NOT wire fields into the node just because they seem likely to exist
- If outputs are unknown: ask the user, or limit to documented fields only

## Part 1: Frontend Node Definition

### File Location
Add to the appropriate category file in `packages/node-definitions/src/`:
- `ai.ts` — AI/LLM nodes
- `browser.ts` — Playwright/browser automation nodes
- `http.ts` — HTTP request nodes
- `slack.ts` — Slack integration nodes
- Create a new file for new integrations: `{service}.ts`

### NodeDefinition Structure

```typescript
import type { NodeDefinition } from './registry'

export const {Service}{Action}Node: NodeDefinition = {
  type: '{category}.{service}_{action}',   // e.g. 'action.slack_send_message'
  name: '{Service} {Action}',              // Human readable
  category: 'integration',                 // 'trigger' | 'action' | 'logic' | 'ai' | 'browser' | 'integration'
  description: 'Brief one-sentence description',
  icon: '{service}',                        // Icon key for UI
  credentialType: '{service}_oauth',        // If OAuth-required node

  properties: [
    // Define all UI fields here
  ],

  inputs: 1,    // Number of input connections (0 for triggers)
  outputs: 1,   // Number of output connections
}
```

### Property Types Reference

```typescript
// String input
{ name: 'fieldName', label: 'Label', type: 'string', required: true, placeholder: '...' }

// Number input
{ name: 'timeout', label: 'Timeout (ms)', type: 'number', default: 5000 }

// Boolean toggle
{ name: 'enabled', label: 'Enabled', type: 'boolean', default: true }

// Dropdown (options)
{
  name: 'method',
  label: 'HTTP Method',
  type: 'options',
  options: [
    { label: 'GET', value: 'GET' },
    { label: 'POST', value: 'POST' },
    { label: 'PUT', value: 'PUT' },
    { label: 'DELETE', value: 'DELETE' },
  ],
  default: 'GET',
}

// JSON input (complex objects)
{ name: 'body', label: 'Request Body', type: 'json' }

// Credential selector
{ name: 'credential', label: 'Account', type: 'credential', credentialType: '{service}_oauth' }
```

### Condition Syntax (show/hide fields)

```typescript
// Show when another field has a specific value
condition: { field: 'method', value: 'POST' }

// Show when field is one of multiple values
condition: { field: 'method', value: ['POST', 'PUT', 'PATCH'] }

// Show when field is NOT a value
condition: { field: 'operation', value: 'list', not: true }
```

### Required Pattern

```typescript
// Always required
required: true

// Conditionally required
required: { field: 'method', value: 'POST' }
required: { field: 'operation', value: ['create', 'update'] }
```

### Mode Pattern (basic vs advanced)

```typescript
mode: 'basic'     // Only shown in basic view
mode: 'advanced'  // Only shown in advanced view
mode: 'both'      // Always shown (default)
```

Optional rarely-used fields should use `mode: 'advanced'`.

### Registering the Node Definition

After creating the NodeDefinition, add it to `packages/node-definitions/src/registry.ts`:

```typescript
import { {Service}{Action}Node } from './{service}'

export const NODE_REGISTRY: NodeDefinition[] = [
  // ... existing nodes ...
  {Service}{Action}Node,
]
```

---

## Part 2: Backend Node Executor

### File Location
`apps/api/app/node_system/builtins/{service}_{action}.py`

### BaseNode Structure

```python
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_result import NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class {Service}{Action}Node(BaseNode):
    """Brief docstring."""

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type='{category}.{service}_{action}',
            name='{Service} {Action}',
            category='{category}',
            description='Brief description',
            properties=[
                {'name': 'param', 'label': 'Param', 'type': 'string', 'required': True},
            ],
            inputs=1,
            outputs=1,
            credential_type='{service}_oauth',  # omit if no credential needed
        )

    async def execute(self, input_data: Dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            # Access node properties (from frontend definition)
            param = self.properties.get('paramName')

            # Access credentials injected by execution engine
            credential = context.credentials.get('{service}_oauth')

            # Call the integration service
            from apps.api.app.integrations.{service}.service import {Service}Service
            service = {Service}Service(access_token=credential.get('access_token'))
            result = await service.{action}(param=param)

            return NodeResult(
                success=True,
                output_data={
                    'field': result.field,
                    'id': result.id,
                },
            )
        except Exception as e:
            logger.error(f'{Service}{Action}Node failed: {e}', exc_info=True)
            return NodeResult(success=False, error=str(e))
```

### Key Rules for Executors

- Always catch exceptions and return `NodeResult(success=False, error=...)` — never let exceptions propagate
- Use `self.properties.get(key)` to access node configuration
- Use `context.credentials.get(credential_type)` for auth tokens
- Use `context.variables` for workflow-level variables
- Use `logger.error` / `logger.info` (never `print()`)
- Use absolute imports only (never relative)
- Keep executor thin — delegate API calls to `apps/api/app/integrations/{service}/service.py`

### Registering the Node Executor

Add to `apps/api/app/node_system/registry/registry.py`:

```python
from apps.api.app.node_system.builtins.{service}_{action} import {Service}{Action}Node

# At the bottom of the file, register the node:
node_registry.register({Service}{Action}Node)
```

---

## Complete Example (Slack Send Message)

### Frontend (`packages/node-definitions/src/slack.ts`)

```typescript
import type { NodeDefinition } from './registry'

export const SlackSendMessageNode: NodeDefinition = {
  type: 'action.slack_send_message',
  name: 'Send Slack Message',
  category: 'integration',
  description: 'Send a message to a Slack channel',
  icon: 'slack',
  credentialType: 'slack_oauth',

  properties: [
    {
      name: 'credential',
      label: 'Slack Account',
      type: 'credential',
      credentialType: 'slack_oauth',
      required: true,
    },
    {
      name: 'channel',
      label: 'Channel ID',
      type: 'string',
      required: true,
      placeholder: '#general or C1234567890',
    },
    {
      name: 'text',
      label: 'Message Text',
      type: 'string',
      required: true,
      placeholder: 'Enter your message...',
    },
    {
      name: 'thread_ts',
      label: 'Thread Timestamp',
      type: 'string',
      required: false,
      placeholder: 'Reply to thread (optional)',
      mode: 'advanced',
    },
  ],

  inputs: 1,
  outputs: 1,
}
```

### Backend (`apps/api/app/node_system/builtins/slack_send_message.py`)

```python
from typing import Any, Dict
from apps.api.app.node_system.base.base_node import BaseNode
from apps.api.app.node_system.base.node_metadata import NodeMetadata
from apps.api.app.node_system.base.node_context import NodeContext
from apps.api.app.node_system.base.node_result import NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SlackSendMessageNode(BaseNode):
    """Send a message to a Slack channel."""

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type='action.slack_send_message',
            name='Send Slack Message',
            category='integration',
            description='Send a message to a Slack channel',
            properties=[
                {'name': 'credential', 'label': 'Slack Account', 'type': 'credential', 'credentialType': 'slack_oauth', 'required': True},
                {'name': 'channel', 'label': 'Channel ID', 'type': 'string', 'required': True},
                {'name': 'text', 'label': 'Message Text', 'type': 'string', 'required': True},
            ],
            inputs=1,
            outputs=1,
            credential_type='slack_oauth',
        )

    async def execute(self, input_data: Dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            channel = self.properties.get('channel')
            text = self.properties.get('text')
            thread_ts = self.properties.get('thread_ts')

            if not channel or not text:
                return NodeResult(success=False, error='channel and text are required')

            credential = context.credentials.get('slack_oauth')
            if not credential:
                return NodeResult(success=False, error='Slack credential not found')

            from apps.api.app.integrations.slack.service import SlackService
            service = SlackService(access_token=credential.get('access_token'))
            result = await service.send_message(
                channel=channel,
                text=text,
                thread_ts=thread_ts,
            )

            return NodeResult(
                success=True,
                output_data={
                    'ts': result.get('ts'),
                    'channel': result.get('channel'),
                },
            )
        except Exception as e:
            logger.error(f'SlackSendMessageNode failed: {e}', exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Checklist Before Finishing

- [ ] `type` is identical in both frontend `NodeDefinition` and backend executor `type` property
- [ ] `category` matches the expected canvas grouping
- [ ] All required properties have `required: true`
- [ ] Optional rarely-used properties use `mode: 'advanced'`
- [ ] Credential property uses correct `credentialType` key
- [ ] Backend executor never raises uncaught exceptions
- [ ] Backend uses absolute imports only
- [ ] Backend uses `logger` (not `print`)
- [ ] `NodeDefinition` added to `NODE_REGISTRY` in `packages/node-definitions/src/registry.ts`
- [ ] Executor registered in `apps/api/app/node_system/registry/registry.py`
- [ ] If integration service is new: created in `apps/api/app/integrations/{service}/`
