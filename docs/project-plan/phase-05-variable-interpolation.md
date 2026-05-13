# Phase 5 — Variable Interpolation

**Status: ⬜ Not Started**

---

## Goal

Node properties support `{{node_id.output.field}}` template syntax. At execution time, templates are resolved against previous nodes' outputs before the node runs. This is what makes nodes actually chainable — passing data between them.

## Why This Is Critical

Without this, every node property is a static string. With it, you can do:
- Slack node: `text = "New issue created: {{github_node.output.title}}"`
- HTTP node: `url = "https://api.example.com/users/{{trigger.output.user_id}}"`
- Delay: `milliseconds = {{config_node.output.delay_ms}}`

## Prerequisites

- Phase 4 complete (node execution working)
- Phase 3 complete (WorkflowRunner passing output between nodes)

---

## Architecture

```
WorkflowRunner._execute_node_recursive(node_id, input_data)
  ↓
TemplateResolver.resolve(properties, execution_context)
  ↓ replaces {{node_id.output.field}} with actual values
resolved_properties → NodeExecutor.execute_node(resolved_properties)
```

---

## Step 1: Template Resolver

**File:** `apps/api/app/execution_engine/engine/template_resolver.py` (new file)

```python
import re
import json
from typing import Any
from apps.api.app.core.logger import get_logger

logger = get_logger(__name__)

# Matches {{node_id.output.field}} or {{node_id.output.nested.field}}
TEMPLATE_PATTERN = re.compile(r"\{\{([^}]+)\}\}")


class TemplateResolver:
    """Resolves {{node_id.output.field}} templates against execution context."""

    def __init__(self, node_outputs: dict[str, dict], trigger_data: dict):
        # node_outputs: {node_id: {field: value, ...}}
        # trigger_data: the initial trigger payload
        self._context = {
            "trigger": {"output": trigger_data},
            **{node_id: {"output": output} for node_id, output in node_outputs.items()},
        }

    def resolve_value(self, value: Any) -> Any:
        """Resolve a single value — string, dict, list, or primitive."""
        if isinstance(value, str):
            return self._resolve_string(value)
        elif isinstance(value, dict):
            return {k: self.resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self.resolve_value(item) for item in value]
        return value  # int, float, bool — no template resolution

    def resolve_properties(self, properties: dict[str, Any]) -> dict[str, Any]:
        """Resolve all template strings in a node's properties dict."""
        return {key: self.resolve_value(value) for key, value in properties.items()}

    def _resolve_string(self, template: str) -> Any:
        """
        Replace {{path}} references in a string.
        If the entire string is one template and resolves to non-string, return that type.
        e.g. "{{node1.output.count}}" → 42 (int, not "42")
        """
        matches = TEMPLATE_PATTERN.findall(template)

        # Single template taking up the whole string → preserve type
        if len(matches) == 1 and template.strip() == f"{{{{{matches[0]}}}}}":
            return self._resolve_path(matches[0].strip())

        # Multiple templates or mixed text → always return string
        def replace_match(m):
            resolved = self._resolve_path(m.group(1).strip())
            if resolved is None:
                return ""
            if isinstance(resolved, (dict, list)):
                return json.dumps(resolved)
            return str(resolved)

        return TEMPLATE_PATTERN.sub(replace_match, template)

    def _resolve_path(self, path: str) -> Any:
        """
        Resolve a dot-path like 'node1.output.title' or 'trigger.output.user_id'.
        Returns None if path doesn't exist (logs a warning).
        """
        parts = path.split(".")
        current = self._context

        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list):
                try:
                    current = current[int(part)]
                except (ValueError, IndexError):
                    logger.warning(f"Template path '{path}' could not be resolved at '{part}'")
                    return None
            else:
                logger.warning(f"Template path '{path}' could not be resolved at '{part}'")
                return None

        return current
```

---

## Step 2: Integrate into WorkflowRunner

**File:** `apps/api/app/execution_engine/engine/workflow_runner.py`

Update `__init__` to track outputs per node:

```python
def __init__(self, workflow_id, execution_id, graph, credentials=None):
    self.workflow_id = workflow_id
    self.execution_id = execution_id
    self.graph = graph
    self.nodes = {node['id']: node for node in graph.get('nodes', [])}
    self.edges = graph.get('edges', [])
    self.executed_nodes: dict[str, Any] = {}
    self.node_outputs: dict[str, dict] = {}  # ADD THIS: track outputs by node_id
    self.credentials = credentials or {}
    self.trigger_data: dict = {}  # ADD THIS: stored on run()
```

Update `run()` to store trigger data:
```python
async def run(self, trigger_data: dict) -> dict:
    self.trigger_data = trigger_data
    logger.info(f"Starting workflow execution {self.execution_id}")
    start_nodes = self._get_start_nodes()
    if not start_nodes:
        return {}
    for node_id in start_nodes:
        await self._execute_node_recursive(node_id, trigger_data)
    if self.node_outputs:
        return list(self.node_outputs.values())[-1]
    return {}
```

Update `_execute_node_recursive` to resolve templates before execution:

```python
async def _execute_node_recursive(self, node_id: str, input_data: dict):
    if node_id in self.executed_nodes:
        return

    node_data = self.nodes[node_id]

    # Resolve templates in properties BEFORE executing
    from apps.api.app.execution_engine.engine.template_resolver import TemplateResolver
    resolver = TemplateResolver(
        node_outputs=self.node_outputs,
        trigger_data=self.trigger_data,
    )
    raw_properties = node_data.get('data', {}).get('properties', {})
    resolved_properties = resolver.resolve_properties(raw_properties)

    await self._emit("node_started", {"node_id": node_id, "node_type": node_data.get("type")})

    context = NodeContext(
        execution_id=self.execution_id,
        workflow_id=self.workflow_id,
        node_id=node_id,
        variables={},
        credentials=self.credentials,
    )

    result = await node_executor.execute_node(
        node_type=node_data['type'],
        node_id=node_id,
        properties=resolved_properties,    # USE RESOLVED PROPERTIES
        input_data=input_data,
        context=context,
    )

    self.executed_nodes[node_id] = result

    if result.success:
        self.node_outputs[node_id] = result.output_data  # STORE OUTPUT
        await self._emit("node_completed", {"node_id": node_id, "output": result.output_data})
        next_edges = [e for e in self.edges if e['source'] == node_id]
        for edge in next_edges:
            await self._execute_node_recursive(edge['target'], result.output_data)
    else:
        await self._emit("node_failed", {"node_id": node_id, "error": result.error})
        logger.error(f"Execution failed at node {node_id}: {result.error}")
```

---

## Step 3: Frontend Template Helper

**File:** `apps/web/src/lib/template.ts` (new file)

Show users what templates are available based on upstream nodes:

```typescript
export function getAvailableTemplates(
  currentNodeId: string,
  nodes: Array<{ id: string; type: string; data: { label: string } }>,
  edges: Array<{ source: string; target: string }>,
): string[] {
  // Find all nodes upstream of currentNodeId
  const upstream = getUpstreamNodes(currentNodeId, nodes, edges)

  const templates: string[] = ['{{trigger.output.*}}']
  for (const node of upstream) {
    templates.push(`{{${node.id}.output.*}}`)
  }
  return templates
}

function getUpstreamNodes(
  nodeId: string,
  nodes: Array<{ id: string; type: string; data: any }>,
  edges: Array<{ source: string; target: string }>,
) {
  const upstream: typeof nodes = []
  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const incomingEdges = edges.filter((e) => e.target === current)
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source)
        const sourceNode = nodes.find((n) => n.id === edge.source)
        if (sourceNode) {
          upstream.push(sourceNode)
          queue.push(edge.source)
        }
      }
    }
  }
  return upstream
}
```

---

## Step 4: Update packages/workflow-schema

Complete the empty TypeScript type files.

**File:** `packages/workflow-schema/src/node.ts`

```typescript
export interface NodePosition {
  x: number
  y: number
}

export interface NodeData {
  label: string
  properties: Record<string, unknown>
  credentialIds?: Record<string, string>  // credentialType → credentialId
}

export interface WorkflowNode {
  id: string
  type: string
  position: NodePosition
  data: NodeData
}
```

**File:** `packages/workflow-schema/src/edge.ts`

```typescript
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string  // 'true' | 'false' for condition nodes
  targetHandle?: string
  label?: string
}
```

**File:** `packages/workflow-schema/src/workflow.ts`

```typescript
import type { WorkflowNode } from './node'
import type { WorkflowEdge } from './edge'

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface WorkflowMetadata {
  schema_version: string
  created_at: string
  updated_at: string
}
```

**File:** `packages/workflow-schema/src/execution.ts`

```typescript
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface NodeExecutionState {
  nodeId: string
  status: NodeExecutionStatus
  startTime?: string
  endTime?: string
  outputData?: Record<string, unknown>
  error?: string
}

export interface ExecutionSummary {
  executionId: string
  workflowId: string
  status: ExecutionStatus
  triggerType: string
  nodeStates: Record<string, NodeExecutionState>
  startTime: string
  endTime?: string
}
```

**File:** `packages/workflow-schema/src/validation.ts`

```typescript
import type { WorkflowGraph } from './workflow'

export interface ValidationError {
  nodeId?: string
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export function validateWorkflowGraph(graph: WorkflowGraph): ValidationError[] {
  const errors: ValidationError[] = []

  // Check for orphaned nodes (no edges and not a trigger)
  for (const node of graph.nodes) {
    const hasIncoming = graph.edges.some((e) => e.target === node.id)
    const hasOutgoing = graph.edges.some((e) => e.source === node.id)
    const isTrigger = node.type.startsWith('trigger.')

    if (!isTrigger && !hasIncoming) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" has no incoming connections`,
        severity: 'warning',
      })
    }
  }

  // Check for cycles (DAG validation)
  if (hasCycle(graph)) {
    errors.push({ message: 'Workflow contains a cycle — DAGs only', severity: 'error' })
  }

  return errors
}

function hasCycle(graph: WorkflowGraph): boolean {
  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    visited.add(nodeId)
    inStack.add(nodeId)
    const outgoing = graph.edges.filter((e) => e.source === nodeId)
    for (const edge of outgoing) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) return true
      } else if (inStack.has(edge.target)) {
        return true
      }
    }
    inStack.delete(nodeId)
    return false
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }
  return false
}
```

Update `packages/workflow-schema/src/index.ts` to re-export everything:
```typescript
export * from './node'
export * from './edge'
export * from './workflow'
export * from './execution'
export * from './validation'
```

---

## Checklist

- [ ] `TemplateResolver` class created in `execution_engine/engine/template_resolver.py`
- [ ] `TemplateResolver.resolve_properties()` resolves all `{{path}}` in a dict recursively
- [ ] `TemplateResolver._resolve_path()` handles nested dot paths (e.g. `node1.output.body.id`)
- [ ] Single-template strings resolve to native type (int, bool, dict) not always string
- [ ] Unresolved templates return empty string (not crash)
- [ ] `WorkflowRunner` stores `node_outputs` dict after each successful node
- [ ] `WorkflowRunner` passes `trigger_data` to `TemplateResolver`
- [ ] Properties are resolved BEFORE passing to `NodeExecutor`
- [ ] `packages/workflow-schema/src/node.ts` completed
- [ ] `packages/workflow-schema/src/edge.ts` completed
- [ ] `packages/workflow-schema/src/workflow.ts` completed
- [ ] `packages/workflow-schema/src/execution.ts` completed
- [ ] `packages/workflow-schema/src/validation.ts` with `validateWorkflowGraph()` and cycle detection
- [ ] `packages/workflow-schema/src/index.ts` exports everything
- [ ] `make lint` passes

---

## Acceptance Criteria

Build this workflow:
```
[HTTP Request: GET httpbin.org/json] 
  → [Slack Send Message: text = "Title: {{n1.output.body.slideshow.title}}"]
```

Where `n1` is the HTTP Request node ID.

Run it → Slack message received: `"Title: Sample Slide Show"`

Without interpolation this would send literal `"Title: {{n1.output.body.slideshow.title}}"`.

---

## Common Mistakes

- Resolving templates AFTER passing to node — properties are already used, too late
- Not handling `None` resolution gracefully — template for non-existent field should return `""` not crash
- Nested access like `{{n1.output.body.user.name}}` — must traverse dict at each `.`
- Template in a dict value vs template as entire string — type preservation matters for number/bool fields
