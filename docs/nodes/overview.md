# Node System

Every node has two parts that must stay in sync:

| Part | Location | Language | Role |
|---|---|---|---|
| `NodeDefinition` | `packages/node-definitions/src/{service}.ts` | TypeScript | UI: name, category, properties form schema |
| `BaseNode` subclass | `apps/api/app/node_system/builtins/{service}_{action}.py` | Python | Runtime: `execute()` logic |

The `type` string (e.g. `'action.slack_send_message'`) **must be identical** in both.

## Node Categories

| `category` | Canvas group | `inputs` |
|---|---|---|
| `'trigger'` | Triggers | `0` |
| `'action'` | Actions | `1` |
| `'logic'` | Logic | `1` |
| `'ai'` | AI | `1` |
| `'browser'` | Browser | `1` |
| `'integration'` | Integrations | `1` |

## Property Types (Frontend)

| `type` | UI control | Use for |
|---|---|---|
| `'string'` | Text input | URLs, IDs, free text |
| `'number'` | Number input | Timeouts, limits, counts |
| `'boolean'` | Toggle | On/off flags |
| `'options'` | Dropdown | Enum values |
| `'json'` | Code editor | Objects, arrays |
| `'credential'` | Credential picker | OAuth / API key |

## Mode

```typescript
mode: 'basic'     // Only shown in basic view
mode: 'advanced'  // Only shown in advanced view (rarely-used fields)
mode: 'both'      // Always shown (default)
```

## Condition Syntax

Show/hide fields based on other field values:

```typescript
// Show when method === 'POST'
condition: { field: 'method', value: 'POST' }

// Show when operation is one of multiple values
condition: { field: 'operation', value: ['create', 'update'] }

// Show when NOT a value
condition: { field: 'operation', value: 'list', not: true }
```

## Builtin Nodes

| Type | File | Status |
|---|---|---|
| `trigger.webhook` | (defined in registry only) | Scaffold |
| `action.http_request` | `builtins/http_request.py` | Scaffold |
| `action.slack_send_message` | `builtins/slack_send_message.py` | Scaffold |
| `logic.condition` | `builtins/condition.py` | Scaffold |
| `action.delay` | `builtins/delay.py` | Scaffold |
| `browser.open_page` | `builtins/browser_open_page.py` | Scaffold |

## Registry

**Frontend** — `packages/node-definitions/src/registry.ts`:
```typescript
export const NODE_REGISTRY: NodeDefinition[] = [
  SlackSendMessageNode,
  // ...
]
```

**Backend** — `apps/api/app/node_system/registry/registry.py`:
```python
node_registry.register(SlackSendMessageNode)
```

See [creating-nodes.md](creating-nodes.md) for the full guide.
