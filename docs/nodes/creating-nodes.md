# Creating a Node

> Use the `/add-node` agent skill for automated guidance. This doc is the manual reference.

A node requires two files. Create both, then register both.

---

## Step 1: Frontend — NodeDefinition

File: `packages/node-definitions/src/{service}.ts`

```typescript
import type { NodeDefinition } from './registry'

export const SlackSendMessageNode: NodeDefinition = {
  type: 'action.slack_send_message',   // MUST match backend get_metadata().type
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
    },
    {
      name: 'thread_ts',
      label: 'Reply to Thread',
      type: 'string',
      required: false,
      mode: 'advanced',            // hide from basic view
    },
  ],

  inputs: 1,
  outputs: 1,
}
```

Register in `packages/node-definitions/src/registry.ts`:
```typescript
import { SlackSendMessageNode } from './slack'

export const NODE_REGISTRY: NodeDefinition[] = [
  // ... existing
  SlackSendMessageNode,
]
```

---

## Step 2: Backend — BaseNode Executor

File: `apps/api/app/node_system/builtins/slack_send_message.py`

```python
from typing import Any, Dict
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SlackSendMessageNode(BaseNode):
    """Send a message to a Slack channel."""

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type='action.slack_send_message',  # MUST match frontend NodeDefinition.type
            name='Send Slack Message',
            category='integration',
            description='Send a message to a Slack channel',
            properties=[],   # mirrors frontend properties schema
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
            result = await service.send_message(channel=channel, text=text, thread_ts=thread_ts)

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

Register in `apps/api/app/node_system/registry/registry.py`:
```python
from apps.api.app.node_system.builtins.slack_send_message import SlackSendMessageNode

node_registry.register(SlackSendMessageNode)
```

---

## Rules for `execute()`

| Rule | Why |
|---|---|
| Always `try/except Exception` → `NodeResult(success=False)` | Never let exceptions propagate to the engine |
| `self.properties.get('key')` not `self.properties['key']` | Missing key raises `KeyError` |
| `context.credentials.get('type')` + null check | Credential may not be present |
| `logger.error(..., exc_info=True)` not `print()` | Structured logging, stack traces |
| Absolute imports only | `from apps.api.app...` never `from .module import` |

---

## Checklist

- [ ] `type` string is identical in `NodeDefinition` and `get_metadata()`
- [ ] `category` is correct (determines canvas panel grouping)
- [ ] `inputs: 0` for trigger nodes, `inputs: 1` for all others
- [ ] Required properties marked `required: true`
- [ ] Optional/rarely-used properties use `mode: 'advanced'`
- [ ] Credential property uses `type: 'credential'` with correct `credentialType`
- [ ] Executor catches all exceptions → returns `NodeResult(success=False)`
- [ ] Executor uses absolute imports
- [ ] Executor uses `get_logger(__name__)` not `print()`
- [ ] `NodeDefinition` registered in `packages/node-definitions/src/registry.ts`
- [ ] Executor registered via `node_registry.register()` in `registry.py`
