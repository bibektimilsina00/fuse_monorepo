# Phase 10 — More Nodes

**Status: ⬜ Not Started**

---

## Goal

Core utility nodes fully implemented: Set Variable, JSON Transform, Code (JavaScript runner), and Merge. These unlock real workflow logic.

## Prerequisites

- Phase 4 complete (first nodes pattern established, execution pipeline solid)

---

## Node Pattern Reminder

Every node = backend `BaseNode` + frontend `NodeDefinition`. Type string must match exactly. Always:
- `try/except Exception` → `NodeResult(success=False, error=str(e))`
- `self.properties.get('key')` not `self.properties['key']`
- `get_logger(__name__)` not `print()`
- Absolute imports

---

## Node 1: Set Variable

Stores a value in workflow-level variables. Downstream nodes can reference it.

### Backend — `apps/api/app/node_system/builtins/set_variable.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SetVariableNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.set_variable",
            name="Set Variable",
            category="logic",
            description="Store a value in workflow variables for use by downstream nodes",
            properties=[
                {"name": "key", "label": "Variable Name", "type": "string", "required": True,
                 "placeholder": "myVariable"},
                {"name": "value", "label": "Value", "type": "string", "required": True},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            key = self.properties.get("key")
            value = self.properties.get("value")

            if not key:
                return NodeResult(success=False, error="Variable name (key) is required")

            # Update context variables
            context.variables[key] = value

            return NodeResult(
                success=True,
                output_data={
                    "key": key,
                    "value": value,
                    **input_data,
                },
            )
        except Exception as e:
            logger.error(f"SetVariableNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Node 2: JSON Transform

Takes `input_data` and applies a jinja2-style template to reshape it.

### Install dependency first

Add to `apps/api/pyproject.toml`:
```toml
"jinja2>=3.1.0",
```

Run: `cd apps/api && uv sync`

### Backend — `apps/api/app/node_system/builtins/json_transform.py`

```python
import json
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class JsonTransformNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.json_transform",
            name="JSON Transform",
            category="logic",
            description="Reshape or extract fields from input data using a JSON template",
            properties=[
                {"name": "template", "label": "Output Template (JSON)", "type": "json", "required": True,
                 "placeholder": '{"name": "{{ input.name }}", "email": "{{ input.email }}"}'},
            ],
            inputs=1,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            from jinja2 import Environment, BaseLoader
            template_str = self.properties.get("template")
            if not template_str:
                return NodeResult(success=False, error="template is required")

            if isinstance(template_str, dict):
                template_str = json.dumps(template_str)

            # Render jinja2 template with input_data as context
            env = Environment(loader=BaseLoader())
            tmpl = env.from_string(template_str)
            rendered = tmpl.render(input=input_data, **input_data)

            try:
                result = json.loads(rendered)
            except json.JSONDecodeError:
                result = rendered  # Return as string if not valid JSON

            return NodeResult(success=True, output_data={"result": result})
        except Exception as e:
            logger.error(f"JsonTransformNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Node 3: Merge (Combine two inputs)

Merges two incoming data objects into one. Used when branches converge.

### Backend — `apps/api/app/node_system/builtins/merge.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class MergeNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.merge",
            name="Merge",
            category="logic",
            description="Merge multiple inputs into a single output object",
            properties=[
                {"name": "mode", "label": "Merge Mode", "type": "options", "default": "shallow",
                 "options": [
                     {"label": "Shallow merge (last wins)", "value": "shallow"},
                     {"label": "Deep merge", "value": "deep"},
                 ]},
            ],
            inputs=2,
            outputs=1,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            # input_data may contain merged data from multiple incoming edges
            return NodeResult(success=True, output_data=input_data)
        except Exception as e:
            logger.error(f"MergeNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Node 4: Switch (Route by value)

Routes execution to one of N branches based on a field value.

### Backend — `apps/api/app/node_system/builtins/switch.py`

```python
from typing import Any
from apps.api.app.node_system.base.node import BaseNode, NodeMetadata
from apps.api.app.node_system.base.execution_contract import NodeContext, NodeResult
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)


class SwitchNode(BaseNode):

    @classmethod
    def get_metadata(cls) -> NodeMetadata:
        return NodeMetadata(
            type="logic.switch",
            name="Switch",
            category="logic",
            description="Route to different branches based on a field value",
            properties=[
                {"name": "field", "label": "Field to Check", "type": "string", "required": True,
                 "placeholder": "status"},
                {"name": "cases", "label": "Cases (JSON array)", "type": "json", "required": True,
                 "placeholder": '[{"value":"success","label":"Success"},{"value":"error","label":"Error"}]'},
            ],
            inputs=1,
            outputs=2,
        )

    async def execute(self, input_data: dict[str, Any], context: NodeContext) -> NodeResult:
        try:
            field = self.properties.get("field")
            if not field:
                return NodeResult(success=False, error="field is required")

            field_value = input_data.get(field)

            return NodeResult(
                success=True,
                output_data={
                    "matched_value": field_value,
                    "branch": str(field_value),
                    **input_data,
                },
            )
        except Exception as e:
            logger.error(f"SwitchNode failed: {e}", exc_info=True)
            return NodeResult(success=False, error=str(e))
```

---

## Register All New Nodes

**File:** `apps/api/app/node_system/registry/registry.py` — add:

```python
from apps.api.app.node_system.builtins.set_variable import SetVariableNode
from apps.api.app.node_system.builtins.json_transform import JsonTransformNode
from apps.api.app.node_system.builtins.merge import MergeNode
from apps.api.app.node_system.builtins.switch import SwitchNode

node_registry.register(SetVariableNode)
node_registry.register(JsonTransformNode)
node_registry.register(MergeNode)
node_registry.register(SwitchNode)
```

---

## Frontend Node Definitions

Create `packages/node-definitions/src/logic.ts`:

```typescript
import type { NodeDefinition } from './registry'

export const SetVariableNode: NodeDefinition = {
  type: 'logic.set_variable',
  name: 'Set Variable',
  category: 'logic',
  description: 'Store a value in workflow variables',
  properties: [
    { name: 'key', label: 'Variable Name', type: 'string', required: true },
    { name: 'value', label: 'Value', type: 'string', required: true },
  ],
  inputs: 1,
  outputs: 1,
}

export const JsonTransformNode: NodeDefinition = {
  type: 'logic.json_transform',
  name: 'JSON Transform',
  category: 'logic',
  description: 'Reshape input data using a JSON template',
  properties: [
    { name: 'template', label: 'Output Template (JSON)', type: 'json', required: true },
  ],
  inputs: 1,
  outputs: 1,
}

export const MergeNode: NodeDefinition = {
  type: 'logic.merge',
  name: 'Merge',
  category: 'logic',
  description: 'Merge multiple inputs into one output',
  properties: [
    {
      name: 'mode',
      label: 'Merge Mode',
      type: 'options',
      default: 'shallow',
      options: [{ label: 'Shallow merge', value: 'shallow' }, { label: 'Deep merge', value: 'deep' }],
    },
  ],
  inputs: 2,
  outputs: 1,
}

export const SwitchNode: NodeDefinition = {
  type: 'logic.switch',
  name: 'Switch',
  category: 'logic',
  description: 'Route to different branches based on a value',
  properties: [
    { name: 'field', label: 'Field to Check', type: 'string', required: true },
    { name: 'cases', label: 'Cases', type: 'json', required: true },
  ],
  inputs: 1,
  outputs: 2,
}
```

Add all to `NODE_REGISTRY` in `registry.ts`.

---

## Checklist

- [ ] `jinja2` added to `apps/api/pyproject.toml` + `uv sync` run
- [ ] `SetVariableNode` stores value in `context.variables[key]`
- [ ] `SetVariableNode` passes through `input_data` in output
- [ ] `JsonTransformNode` renders jinja2 template with `input=input_data` context
- [ ] `JsonTransformNode` returns parsed JSON if output is valid JSON, else string
- [ ] `MergeNode` passes `input_data` through (execution engine handles merging)
- [ ] `SwitchNode` returns `branch` field with the matched value
- [ ] All 4 nodes registered in backend `node_registry`
- [ ] All 4 nodes registered in frontend `NODE_REGISTRY`
- [ ] All `type` strings match exactly between frontend and backend
- [ ] `make lint` passes

---

## Acceptance Criteria

Build workflow: `[HTTP Request: GET httpbin.org/json] → [JSON Transform] → [Set Variable]`

JSON Transform template:
```json
{"message": "{{ input.slideshow.title }}", "author": "{{ input.slideshow.author }}"}
```

Run workflow → execution completes → output contains `{"message":"Sample Slide Show","author":"Yours Truly"}`

---

## Common Mistakes

- Jinja2 template as dict object — must convert to string before rendering
- `context.variables` changes in `SetVariableNode` don't persist to next node — `context` is passed by reference to each node in the same execution, so mutations DO persist in the same run
- `MergeNode` with `inputs: 2` — execution engine currently runs nodes sequentially. True multi-input merging requires Phase 16 refactor. For now it just passes through.
