# Fuse — Sim Parity Roadmap

Gaps remaining vs sim. Integrations excluded (planned separately).  
Each item: root cause of the gap → correct fix → files touched.

---

## Phase 1 — Quick wins (est. 1–4h each)

### 1.1 Per-workflow environment variables

**Gap:** `TemplateResolver` only resolves `{{node.field}}` and `{{trigger.x}}`. No env var support.  
**Root cause:** `TemplateResolver` has no env map; `Workflow` model has no `env` field.  
**Correct fix:**
- Add `env: dict[str, str]` JSON column to `Workflow` model + migration
- Pass `env` into `WorkflowRunner`, thread into `TemplateResolver`
- Support `{{env.KEY}}` syntax in resolver (alongside existing `{{node.field}}`)
- Frontend: env var editor panel in workflow settings (key/value list)

**Files:**
- `apps/api/app/models/workflow.py` — add `env` column
- `apps/api/app/execution_engine/engine/template_resolver.py` — add env resolution
- `apps/api/app/execution_engine/engine/workflow_runner.py` — pass env to resolver
- `apps/web/src/features/workflow-editor/` — env var panel

---

### 1.2 Agent reasoning effort

**Gap:** `AgentProperties` has no `reasoningEffort` field. OpenAI o1/o3 and Anthropic extended thinking not used.  
**Root cause:** Agent node never sends `reasoning_effort` or `thinking` block to providers.  
**Correct fix:**
- Add `reasoningEffort: 'auto' | 'low' | 'medium' | 'high'` to `AgentProperties` + metadata
- In `_call_llm_openai_compatible`: if model starts with `o1`/`o3` and effort != `auto`, add `reasoning_effort`
- In `_call_llm_anthropic`: if effort != `auto`, add `thinking: {type: "enabled", budget_tokens: N}` (low=1024, medium=8192, high=32768)

**Files:**
- `apps/api/app/node_system/nodes/ai/agent/agent.py`
- `packages/node-definitions/src/nodes/ai/index.ts` — add reasoningEffort property

---

### 1.3 Wait node

**Gap:** No delay/wait node exists.  
**Root cause:** Missing node type.  
**Correct fix:** Scaffold `WaitNode` with `asyncio.sleep()`.

Properties: `duration: number`, `unit: 'seconds' | 'minutes' | 'hours'` (cap at 3600s = 1h)  
Output: `{waitDuration: number, status: 'completed'}`

**Files:**
- `apps/api/app/node_system/nodes/common/wait/wait.py`
- `packages/node-definitions/src/nodes/common/index.ts`
- Migration: registered via NodeRegistry auto-discovery

---

### 1.4 Evaluator node

**Gap:** No LLM-judges-LLM node.  
**Root cause:** Missing node type.  
**Correct fix:** `EvaluatorNode` — takes `content`, `metrics[]` (name, description, min, max), runs LLM, returns scores.

Properties: `provider`, `credential`, `model`, `content`, `metrics: [{name, description, range: {min, max}}]`  
Output: `{scores: {metricName: number}, passed: bool, feedback: string}`  
Implementation: build JSON schema from metrics, call LLM with structured output mode.

**Files:**
- `apps/api/app/node_system/nodes/ai/evaluator/evaluator.py`
- `packages/node-definitions/src/nodes/ai/index.ts`

---

### 1.5 Thinking node

**Gap:** No dedicated chain-of-thought step node.  
**Root cause:** Missing node type.  
**Correct fix:** `ThinkingNode` — runs LLM with extended thinking enabled. For Anthropic uses `thinking` block; for OpenAI uses o1/o3 reasoning.

Properties: `provider`, `credential`, `model`, `prompt`, `budgetTokens: number` (default 8192)  
Output: `{thinking: string, response: string, tokens: object}`

**Files:**
- `apps/api/app/node_system/nodes/ai/thinking/thinking.py`
- `packages/node-definitions/src/nodes/ai/index.ts`

---

## Phase 2 — Medium complexity (est. 1–2 days each)

### 2.1 Parallel branch execution

**Gap:** `WorkflowRunner._execute_node_recursive()` is sequential DFS. Independent branches block each other.  
**Root cause:** Single recursive call — no concept of "ready nodes" or concurrent execution.  
**Correct fix:** Rewrite runner to use a DAG-based ready queue with `asyncio.gather()`.

Algorithm:
1. Build `incoming_edges: dict[node_id, set[node_id]]` — prerequisites per node
2. Start with nodes that have 0 predecessors
3. When a node completes, decrement predecessor count for all its successors
4. Nodes whose predecessor count hits 0 are "ready" — gather them concurrently
5. Loop until no more ready nodes

```python
async def run(self, trigger_data):
    completed: set[str] = set()
    pending_predecessors: dict[str, int] = self._build_predecessor_counts()
    ready = [n for n, c in pending_predecessors.items() if c == 0]
    while ready:
        results = await asyncio.gather(
            *[self._execute_node(n, ...) for n in ready],
            return_exceptions=True
        )
        # update pending_predecessors for successors of completed nodes
        ready = self._get_newly_ready(completed, pending_predecessors)
```

**Files:**
- `apps/api/app/execution_engine/engine/workflow_runner.py` — full rewrite of `run()` and `_execute_node_recursive()`
- No frontend changes

---

### 2.2 forEach loop node

**Gap:** No way to iterate over an array in a workflow.  
**Root cause:** Missing node type + runner has no loop semantics.  
**Correct fix:**

**Graph representation:** `ForEachNode` is a regular node. Its connected downstream sub-graph executes N times (once per item). A `LoopEnd` handle on `ForEachNode` marks where to resume after all iterations.

**Node properties:** `items: any[]`, `parallel: bool` (run all iterations concurrently vs sequential), `maxIterations: number` (default 1000)

**Runner handling:**
1. Detect `ForEachNode` in executor
2. Extract sub-graph (nodes reachable from ForEachNode before hitting a LoopEnd connection)
3. Execute sub-graph N times; each iteration gets `{item, index, total}` as input
4. Collect all iteration outputs into array
5. Pass array to nodes after the loop

**Files:**
- `apps/api/app/node_system/nodes/logic/foreach/foreach.py`
- `apps/api/app/execution_engine/engine/workflow_runner.py` — loop handling in executor
- `packages/node-definitions/src/nodes/logic/index.ts`
- Frontend: custom `ForEachNode` renderer showing loop body visually (Phase 3)

---

### 2.3 Memory backends (Redis + Vector)

**Gap:** Agent `memoryType` only supports `workflow` (process variables). No persistent or semantic memory.  
**Root cause:** `AgentNode` only reads/writes `context.variables`. No abstraction over memory providers.  
**Correct fix:** `MemoryProvider` protocol + concrete implementations.

```python
class MemoryProvider(Protocol):
    async def get(self, key: str) -> list[dict]: ...
    async def append(self, key: str, messages: list[dict], limit: int) -> None: ...
```

Providers:
- `WorkflowMemoryProvider` — existing behavior (context.variables)
- `RedisMemoryProvider` — uses Redis lists, TTL configurable
- `VectorMemoryProvider` — embeds messages, retrieves top-K by similarity (Pinecone/Qdrant)

Agent properties additions: `memoryBackend: 'workflow' | 'redis' | 'pinecone' | 'qdrant'`, `memoryTTL: int`

**Files:**
- `apps/api/app/node_system/nodes/ai/agent/memory/` — new directory with providers
- `apps/api/app/node_system/nodes/ai/agent/agent.py` — swap `_apply_memory`/`_persist_memory` to use provider
- `packages/node-definitions/src/nodes/ai/index.ts` — new memory properties

---

### 2.4 A2A (Agent-to-Agent)

**Gap:** Agents cannot call other agents/workflows.  
**Root cause:** Missing node type + HTTP endpoint.  
**Correct fix:**

**A2ANode properties:** `agentUrl: string`, `message: string`, `contextId?: string`, `taskId?: string`, `operation: 'send_message' | 'get_task' | 'cancel_task'`

**Backend endpoint:** `POST /api/v1/a2a/{workflow_id}` — accepts `{message, contextId?, data?}`, triggers workflow execution, returns `{taskId, status, contextId}`. Auth via Bearer token.

**A2ANode execution:** HTTP POST to target URL, polls for completion if async.

**Files:**
- `apps/api/app/node_system/nodes/ai/a2a/a2a.py`
- `apps/api/app/api/v1/a2a/router.py` + registration
- `packages/node-definitions/src/nodes/ai/index.ts`

---

## Phase 3 — High complexity (est. 3–5 days each)

### 3.1 Pause / Resume

**Gap:** Workflow execution cannot be paused mid-run and resumed later.  
**Root cause:** `WorkflowRunner` runs to completion in a single Celery task. No state serialization.  
**Correct fix:** Serialize execution state to DB on pause; reconstruct runner from snapshot on resume.

**New DB columns on `Execution`:**
```sql
status: adds 'paused' value
paused_at: timestamp
resume_token: uuid (secret, sent in approval URLs)
snapshot: jsonb  -- {node_outputs, variables, completed_nodes, pending_node_id}
resume_input_schema: jsonb  -- what shape the resume payload must have
```

**Pause flow:**
1. Node calls `context.pause(resume_schema)` → runner raises `PauseSignal(node_id, schema)`
2. Celery task catches `PauseSignal`, serializes `{node_outputs, variables, completed_nodes}` to `execution.snapshot`
3. Sets `execution.status = 'paused'`, generates `resume_token`
4. Emits `execution_paused` WebSocket event with resume URL

**Resume flow:**
1. `POST /executions/{id}/resume` with `{token, input: {...}}`
2. Validates token, loads snapshot, reconstructs `WorkflowRunner` with restored state
3. Re-enqueues Celery task with `resume_from=node_id` and `resume_input`
4. Runner skips already-completed nodes, injects resume input at pause point, continues

**Files:**
- `apps/api/app/models/workflow.py` — Execution fields + migration
- `apps/api/app/execution_engine/engine/workflow_runner.py` — PauseSignal + snapshot save/restore
- `apps/api/app/execution_engine/engine/node_executor.py` — expose pause context method
- `apps/api/app/node_system/base/node_context.py` — `pause()` method
- `apps/api/app/api/v1/executions/router.py` — resume endpoint
- `apps/worker/app/jobs/tasks.py` — handle resume path
- Frontend: execution panel shows "Paused — waiting for input" + resume form

---

### 3.2 Human-in-the-loop

**Depends on:** 3.1 Pause/Resume  
**Gap:** No approval gate node.  
**Root cause:** Missing node type; requires pause/resume infrastructure.  
**Correct fix:** `HumanInputNode` pauses execution, sends approval URL, waits for human response.

**Node properties:** `title: string`, `description: string`, `fields: [{name, type, required}]` (schema for human input), `notifyVia: 'slack' | 'email' | 'none'`, `notifyTarget: string`, `timeoutHours: number`

**Flow:**
1. Node executes → calls `context.pause(fields_schema)`
2. Generates resume URL: `{app_url}/resume/{execution_id}?token={resume_token}`
3. Sends URL via configured notification channel
4. Human fills form at URL → `POST /executions/{id}/resume` with `{token, input}`
5. Workflow continues with human input as node output

**Files:**
- `apps/api/app/node_system/nodes/logic/human_input/human_input.py`
- `packages/node-definitions/src/nodes/logic/index.ts`
- `apps/web/src/features/resume/` — public resume form page (no auth required, token-gated)
- `apps/api/app/api/v1/executions/router.py` — resume endpoint (from 3.1)

---

## Phase 4 — DB connectors (est. 2 days)

### 4.1 PostgreSQL node

Properties: `credential` (connection string), `operation: 'query' | 'execute'`, `sql: string`, `params: any[]`  
Output: `{rows: object[], rowCount: number}`

### 4.2 MySQL node

Same pattern as PostgreSQL. Uses `aiomysql` driver.

### 4.3 MongoDB node

Properties: `credential`, `database`, `collection`, `operation: 'find' | 'insertOne' | 'updateOne' | 'deleteOne'`, `query: object`

---

## Implementation order

```
Phase 1 (this sprint):
  1.1  env vars          ~2h
  1.2  reasoning effort  ~1h
  1.3  wait node         ~1h
  1.4  evaluator node    ~3h
  1.5  thinking node     ~2h

Phase 2 (next sprint):
  2.1  parallel exec     ~1 day  ← highest impact
  2.2  forEach loop      ~2 days
  2.3  memory backends   ~1 day
  2.4  A2A               ~1 day

Phase 3 (following sprint):
  3.1  pause/resume      ~3 days ← prerequisite for 3.2
  3.2  human-in-the-loop ~2 days

Phase 4 (when integrations sprint starts):
  4.1  postgres
  4.2  mysql
  4.3  mongodb
```

---

## What is NOT being built

| Item | Reason |
|---|---|
| Custom code (JS sandbox) | Removed intentionally — security surface |
| 200+ integrations | Separate sprint |
| Sim's mothership/workspace multi-tenancy | Different product architecture |
| Sim's permission/RBAC system | Single-user for now |
