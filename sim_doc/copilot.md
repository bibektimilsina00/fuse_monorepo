# Sim Copilot — Full Architecture Reference

## What Is Copilot

Copilot is the per-workflow AI assistant embedded in every workflow editor. A user types a message, it gets routed through a Next.js API layer, assembled into a payload, sent to a Go backend (`copilot.sim.ai`) that runs the actual LLM agentic loop, and the response streams back as SSE events.

**Mothership** is the workspace-wide variant of the same system. Same pipeline, same code, different route (`/api/mothership` instead of `/api/copilot`) and a richer context object (the full `WORKSPACE.md`).

---

## High-Level Request Flow

```
User types message in chat UI
        │
        ▼
POST /api/copilot/chat                   ← Next.js API route
        │
        ▼
handleUnifiedChatPost()                  ← lib/copilot/chat/post.ts
  - Validate schema (Zod)
  - Resolve branch (workflow vs workspace)
  - Acquire stream lock (prevents concurrent responses)
  - resolveAgentContexts() — process user-provided context attachments
  - Persist user message to DB
  - buildInitialExecutionContext()
        │
        ▼
buildCopilotRequestPayload()             ← lib/copilot/chat/payload.ts
  - buildIntegrationToolSchemas()        ← filtered, deferred tool list (30s cached)
  - Append MCP tools
  - Track file uploads
  - Build contexts array
        │
        ▼
createSSEStream()                        ← lib/copilot/request/lifecycle/start.ts
  - Returns ReadableStream to client immediately
  - Manages OTel root span + abort controller
        │
        ▼
runCopilotLifecycle()                    ← lib/copilot/request/lifecycle/run.ts
  - runCheckpointLoop()  ← the core agentic loop
        │
        ▼
runStreamLoop()                          ← lib/copilot/request/go/stream.ts
  - HTTP POST to Go backend (copilot.sim.ai)
  - Parses SSE events line by line
  - Dispatches to tool handlers or message handlers
        │
        ▼
Tool execution (if AI calls a tool)      ← lib/copilot/request/tools/executor.ts
  - executeToolAndReport() per tool call
  - Posts results back to Go via /api/tools/resume
        │
        ▼
finalizeAssistantTurn()                  ← lib/copilot/chat/terminal-state.ts
  - Clears stream marker (conversationId)
  - Persists final assistant message
```

---

## Entry Point: `/app/api/copilot/chat/route.ts`

```typescript
export const maxDuration = 3600  // 1-hour timeout
export const POST = handleUnifiedChatPost
export async function GET(request: NextRequest) { /* chat query handler */ }
```

Dead simple — just re-exports the handler. The real logic lives in `post.ts`.

---

## Core Handler: `handleUnifiedChatPost` (`lib/copilot/chat/post.ts`)

This is the main orchestrator (~1000 lines). Key steps:

### 1. Schema Validation

Input is validated against `ChatMessageSchema`:

```typescript
const ChatMessageSchema = z.object({
  message: z.string(),
  workflowId: z.string().optional(),
  workspaceId: z.string().optional(),
  model: z.string().optional(),
  mode: z.enum(['agent', 'ask', 'plan', 'build']).optional(),
  fileAttachments: z.array(FileAttachmentSchema).optional(),
  resourceAttachments: z.array(ResourceAttachmentSchema).optional(),
  contexts: z.array(ChatContextSchema).optional(),
  commands: z.array(z.string()).optional(),
  chatId: z.string().optional(),
})
```

### 2. Branch Resolution

`resolveBranch()` determines whether this is a workflow-scoped (Copilot) or workspace-scoped (Mothership) request. Returns a `UnifiedChatBranch` with:
- `route` — Go backend path (`/api/copilot` or `/api/mothership/chat`)
- `workflowId`, `workspaceId`
- Workspace context (WORKSPACE.md, for Mothership only)

### 3. Stream Lock

Before building anything, a lock is acquired per chat ID. This prevents two concurrent responses from fighting over the same chat's messages array.

### 4. Context Resolution

`resolveAgentContexts()` iterates the `contexts` array the user attached to the message. Each context has a `type` and `content` (resource ID or raw text). Processed in parallel.

Supported context types:

| Type | What it fetches |
|---|---|
| `past_chat` | Prior chat messages from DB, formatted as `role: message` pairs |
| `workflow` | Workflow metadata or full sanitized state JSON |
| `current_workflow` | Current workflow state (for editing context) |
| `blocks` | Block config, subblocks, tools, auth info |
| `logs` | Execution summary with trace spans |
| `knowledge` | KB name + sample doc filenames |
| `templates` | Template metadata + workflow state |
| `workflow_block` | Single block config from a workflow |
| `table` | Table schema + row count |
| `file` | File metadata |
| `folder` | Folder listing |
| `docs` | Documentation pages |

### 5. Payload Build

`buildCopilotRequestPayload()` assembles the full JSON sent to Go. See [Payload Building](#payload-building) below.

### 6. SSE Stream

`createSSEStream()` creates a `ReadableStream` and returns it immediately to the client. The actual work happens asynchronously inside the stream's `start()` hook. The client begins receiving SSE events right away.

### 7. Finalization

When the Go backend finishes (or errors), `buildOnComplete()` runs:
- Redacts `sim_key` credentials from content
- Merges and coalesces text blocks
- Persists final assistant message
- Clears the stream marker

---

## Payload Building: `buildCopilotRequestPayload` (`lib/copilot/chat/payload.ts`)

Assembles the JSON body sent to Go:

```typescript
{
  message: string
  workflowId?: string
  workflowName?: string
  workspaceId?: string
  userId: string
  model: string              // e.g. 'claude-opus-4-7'
  provider?: string
  mode: string               // 'build' | 'ask' | 'plan'
  messageId: string
  context?: Array<{ type: string; content: string }>
  integrationTools: ToolSchema[]   // deferred schemas (see below)
  chatId?: string
  workspaceContext?: string        // WORKSPACE.md for Mothership
  userPermission?: string
  userTimezone?: string
  isHosted: boolean
}
```

### How Block/Tool Knowledge Is Handled

This is the core solution to the "how does AI know about 1000+ nodes" problem.

**Step 1 — Deferred schemas in the payload**

`buildIntegrationToolSchemas()` iterates the tool registry and produces a *lightweight* list:

```typescript
interface ToolSchema {
  name: string
  description: string
  input_schema: Record<string, unknown>
  defer_loading: true          // Go sees this and does NOT load full spec
  executeLocally?: boolean
  oauth?: { required: boolean; provider: string }
}
```

Every tool gets `defer_loading: true`. The AI sees names + descriptions — enough to understand what tools exist — but not execution details. This list is sent on every request.

**Filtering before AI sees anything:**
- Latest-version tools only (`getLatestVersionTools()` strips old versions)
- Workspace `allowedIntegrations` allowlist filters out disallowed blocks
- `hideFromToolbar` blocks are excluded

**Caching:** The filtered list is cached per `(userId, workspaceId, surface)` for 30 seconds (`TOOL_SCHEMA_CACHE_TTL_MS = 30_000`). Avoids re-iterating the full registry on every chat turn.

**Step 2 — On-demand full metadata (AI calls `get_blocks_metadata`)**

When the AI decides it needs full details about specific blocks, it calls `get_blocks_metadata` with `blockIds[]`.

File: `lib/copilot/tools/server/blocks/get-blocks-metadata-tool.ts`

Returns per block:
- `inputSchema` — all subblocks (UI inputs) with types, options, constraints, conditions
- `tools` — available API operations (id, name, description, inputs, outputs)
- `triggers` — compatible trigger types with config fields
- `auth` — authentication mode and OAuth provider info
- `operationInputSchema` — per-operation subblock definitions
- `yamlDocumentation` — raw YAML docs read from `apps/docs/content/docs/yaml/blocks/`
- `outputs` — output schema

**Step 3 — VFS (Virtual File System)**

The AI can also navigate a full virtual filesystem to read block schemas, integration schemas, workflow state, credentials, etc. See the [VFS doc](./vfs.md) for details.

---

## Workspace Context (Mothership only)

`buildWorkspaceMd()` (`lib/copilot/chat/workspace-context.ts`) assembles a `WORKSPACE.md` markdown document sent in the payload as `workspaceContext`.

Contains:
- Workspace name, ID, owner
- Members + permission levels
- All workflows (name, deployment status, last run, VFS path to state)
- Knowledge bases (embedding models, doc counts, connector types)
- Tables (row counts)
- Files
- OAuth integrations connected
- Environment variables (names only, never values)
- Custom tools
- MCP servers
- Skills
- Scheduled jobs

This is plain markdown, not JSON, not embeddings. Bounded in size by what's in the workspace — no retrieval needed.

---

## The Agentic Loop: `runCheckpointLoop` (`lib/copilot/request/lifecycle/run.ts`)

The checkpoint loop is the state machine that handles multi-turn tool execution:

```
1. POST /api/copilot with full payload
         │
         ▼
   SSE stream from Go starts
         │
         ▼
   Go emits events:
     - text events → stream to client
     - tool events → dispatch to tool executor
     - checkpoint_pause → Go needs tool results before continuing
         │
         ▼ (on checkpoint_pause)
   Wait for pending tool promises to complete
         │
         ▼
   Collect results: [{callId, name, data, success}]
         │
         ▼
   POST /api/tools/resume with checkpoint ID + results
     - Retries up to 3x with backoff (250ms, 500ms, 1000ms) on 5xx
         │
         ▼
   Go resumes from checkpoint with tool results
         │
         ▼
   Loop until no more checkpoints or stream ends
```

**Constants:**
```typescript
MAX_RESUME_ATTEMPTS = 3
RESUME_BACKOFF_MS = [250, 500, 1000]
ORCHESTRATION_TIMEOUT_MS = 3_600_000  // 1 hour
```

---

## Go Backend Streaming: `runStreamLoop` (`lib/copilot/request/go/stream.ts`)

Handles the actual HTTP connection to `copilot.sim.ai`:

1. `fetch()` with streaming body reader
2. Reads SSE events: `data: {...}\n\n`
3. Parses each event via `eventToStreamEvent()`
4. Dispatches to handlers:
   - File preview adapter (for file previews)
   - Client-executable tool pre-persist
   - `onEvent()` callback (publishes to StreamWriter → client)
   - Subagent handlers (for nested agent spans)
   - Main SSE handlers

**Aggregate metrics stamped at loop end:**
```typescript
{
  bytes, chunks, events
  eventsByType: { session, text, tool, span, resource, run, error, complete }
  firstEventMs          // TTFT (time to first token)
  longestInboundGapMs   // max gap between TCP reads
  longestDispatchMs     // max single event handler time
  totalDispatchMs       // total handler CPU time
}
```

**Error classes:**
- `CopilotBackendError(message, {status?, body?})` — wraps HTTP errors
- `BillingLimitError(userId)` — 402 from Go

---

## Tool Execution: `executeToolAndReport` (`lib/copilot/request/tools/executor.ts`)

Called per tool the AI invokes. Runs inside an OTel span.

```
1. Check if tool already executing or terminal (dedup)
2. Check abort signal
3. Mark async tool as running in DB
4. executeTool() — the actual tool function
5. Post-process output:
   - maybeWriteOutputToFile
   - maybeWriteOutputToTable
   - maybeWriteReadCsvToTable
6. Check abort at each step
7. Publish tool result back to Go
8. Persist resource side effects (workspace state updates)
```

**Special cases:**
- `create_workflow` tool: updates `execContext.workflowId` so subsequent tools in the same stream can reference the newly created workflow
- Async tool calls are persisted to DB for tracking and resume

---

## Workflow Editing Engine (`lib/copilot/tools/server/workflow/edit-workflow/`)

The AI doesn't write free-form code or JSON to edit a workflow. It emits structured operations:

```typescript
type EditWorkflowOperation = {
  operation_type: 'add' | 'delete' | 'edit' | 'insert_into_subflow' | 'extract_from_subflow'
  block_id: string
  params?: Record<string, unknown>
}
```

`applyOperationsToWorkflowState()` in `engine.ts` processes them:

**Execution order (always enforced):**
1. `delete` — remove blocks first (avoid orphans)
2. `extract_from_subflow` — pull blocks out of containers
3. `add` — create new blocks
4. `insert_into_subflow` — add blocks into containers (topologically sorted via Kahn's algorithm so parents before children)
5. `edit` — modify existing blocks

**Topological sort for inserts:** Kahn's algorithm ensures a parent loop/parallel block is always inserted before the child blocks that go inside it.

**After applying:** The engine validates the resulting workflow state — checks edge integrity, block references, loop/parallel structure.

**`createBlockFromParams()`** (`builders.ts`):
- Validates inputs against block config
- Computes outputs (trigger-mode aware)
- Normalizes arrays, conditions, tools, response formats
- Filters disallowed tools by permission config

---

## Stream Buffering: `buffer.ts` / `sse.ts`

Redis-backed stream event buffer for durability and client reconnect:

```typescript
// Key operations
allocateCursor(streamId)           // allocates monotonic event ID
appendEvent(envelope)              // appends to Redis sorted set
readEvents(streamId, afterCursor)  // reads all events after cursor
writeAbortMarker(streamId)         // user clicked stop
hasAbortMarker(streamId)           // check if stop requested
clearAbortMarker(streamId)         // cleanup
scheduleBufferCleanup(streamId)    // cleanup with TTL
```

**Config:**
```typescript
ttlSeconds: envNumber('COPILOT_STREAM_TTL_SECONDS', 3600)
eventLimit: envNumber('COPILOT_STREAM_EVENT_LIMIT', 5000)
```

**SSE encoding:**
```typescript
encodeSSEEnvelope(envelope)        // → Uint8Array: "data: {...}\n\n"
encodeSSEComment(comment)          // → Uint8Array: ": comment\n\n"
SSE_RESPONSE_HEADERS               // Content-Type, Cache-Control, X-Accel-Buffering
```

---

## Message Assembly: `buildEffectiveChatTranscript` (`effective-transcript.ts`)

Reconstructs the full conversation from stored messages + live SSE events:

- `buildLiveAssistantMessage()` — builds assistant message from SSE event stream:
  - `text` events → append to text block, merge consecutive blocks from same lane
  - `tool` events → build tool call block with params + result
  - `span` (subagent) → track parent-child nesting
  - `run` (compaction) → synthetic tool call block for context compaction UI
  - `error` → inline as `<mothership-error>` tag
  - `complete` → mark terminal

- `buildEffectiveChatTranscript()` — appends live message to stored messages for rendering

---

## Credential Redaction: `sim-key-redaction.ts`

Before persisting the assistant message to DB, `sim_key` credentials (Sim-managed API keys) are redacted:

```typescript
// In message content:
// <credential type="sim_key">...</credential>
// becomes:
// <credential>{"type":"sim_key","redacted":true}</credential>

redactSensitiveContent(content)              // replace sim_key tags
mergeAndRedactPersistedBlocks(blocks)        // coalesce + redact (catches cross-block tags)
redactToolCallResult('generate_api_key', r)  // redact key field from tool result
```

**Client-side reveal:** During the live stream, actual key values are captured in `RevealedSimKeysByMessage` cache and re-injected client-side for display. After the stream ends and the message is refetched from DB (redacted), the cache re-applies the values. The DB never stores the raw key.

---

## Constants (`lib/copilot/constants.ts`)

```typescript
SIM_AGENT_API_URL_DEFAULT = 'https://copilot.sim.ai'
SIM_AGENT_VERSION = '3.0.0'
ORCHESTRATION_TIMEOUT_MS = 3_600_000        // 1 hour
STREAM_TIMEOUT_MS = 3_600_000               // 1 hour
STREAM_STORAGE_KEY = 'copilot_active_stream'
MOTHERSHIP_CHAT_API_PATH = '/api/mothership/chat'
COPILOT_CONFIRM_API_PATH = '/api/copilot/confirm'
COPILOT_STATS_API_PATH = '/api/copilot/stats'
STREAM_BUFFER_MAX_DEDUP_ENTRIES = 1_000
TOOL_RESULT_MAX_INLINE_TOKENS = 50_000
TOOL_RESULT_ESTIMATED_CHARS_PER_TOKEN = 4
TOOL_RESULT_MAX_INLINE_CHARS = 200_000      // ~200KB per tool result
COPILOT_MODES = ['ask', 'build', 'plan']
COPILOT_REQUEST_MODES = ['ask', 'build', 'plan', 'agent']
DEFAULT_MODEL = 'claude-opus-4-6'
```

---

## Key File Map

| File | Purpose |
|---|---|
| `app/api/copilot/chat/route.ts` | Next.js API entry point |
| `lib/copilot/chat/post.ts` | Main handler: validate → context → stream |
| `lib/copilot/chat/payload.ts` | Build payload sent to Go; deferred tool schemas |
| `lib/copilot/chat/workspace-context.ts` | WORKSPACE.md for Mothership requests |
| `lib/copilot/chat/process-contents.ts` | Resolve user-attached context objects |
| `lib/copilot/chat/effective-transcript.ts` | Reconstruct conversation from SSE events |
| `lib/copilot/chat/terminal-state.ts` | Finalize stream, persist assistant message |
| `lib/copilot/chat/sim-key-redaction.ts` | Redact API keys before DB persistence |
| `lib/copilot/request/lifecycle/run.ts` | Checkpoint loop — core agentic state machine |
| `lib/copilot/request/lifecycle/start.ts` | Create ReadableStream, manage OTel span |
| `lib/copilot/request/go/stream.ts` | HTTP fetch to Go, SSE parsing, dispatch |
| `lib/copilot/request/tools/executor.ts` | Execute tools, post-process, report results |
| `lib/copilot/request/session/buffer.ts` | Redis stream buffer (durability + reconnect) |
| `lib/copilot/request/session/sse.ts` | SSE encoding helpers |
| `lib/copilot/tools/server/workflow/edit-workflow/engine.ts` | Apply operations to workflow state |
| `lib/copilot/tools/server/workflow/edit-workflow/builders.ts` | Create block from params |
| `lib/copilot/tools/server/workflow/edit-workflow/operations.ts` | Per-operation handlers |
| `lib/copilot/tools/server/blocks/get-blocks-metadata-tool.ts` | On-demand block metadata |
| `lib/copilot/vfs/workspace-vfs.ts` | Virtual filesystem for workspace data |
| `lib/copilot/constants.ts` | All constants in one place |

---

## How to Add a New Copilot Tool

1. **Create a server tool file** in `lib/copilot/tools/server/{category}/{tool-name}.ts`

   ```typescript
   import type { BaseServerTool } from '@/lib/copilot/tools/server/base-tool'
   import { z } from 'zod'

   export const myNewServerTool: BaseServerTool = {
     name: 'my_new_tool',
     description: 'What this tool does for the AI',
     parameters: z.object({
       inputA: z.string().describe('What inputA is'),
       inputB: z.number().optional(),
     }),
     async execute({ inputA, inputB }, context, execContext) {
       // Do work
       return { success: true, output: { result: 'value' } }
     },
   }
   ```

2. **Register the tool** in `lib/copilot/tool-executor/register-handlers.ts`

3. **Add to generated schemas** if Go backend needs to know the tool's type: update `lib/copilot/generated/tool-schemas-v1.ts`

4. **If the tool requires user confirmation**, wire `COPILOT_CONFIRM_API_PATH` into your tool's confirmation flow.

---

## How to Add a New Context Type

1. Add the type to `ChatContextSchema` enum in `post.ts`
2. Add a handler case in `processContextsServer()` in `process-contents.ts`
3. Handler should return `AgentContext | null` — `null` = skip, object = include in payload

---

## Operational Notes

- **Go backend URL** is `process.env.SIM_AGENT_API_URL` (default `https://copilot.sim.ai`)
- **Auth** to Go backend uses `process.env.COPILOT_API_KEY` as `x-api-key` header
- **Self-hosted** deployments need to set `COPILOT_API_KEY` to a key from sim.ai settings
- **Stream TTL** defaults to 3600s; tune with `COPILOT_STREAM_TTL_SECONDS`
- **Event buffer limit** defaults to 5000 events; tune with `COPILOT_STREAM_EVENT_LIMIT`
- **Tool result size** capped at `TOOL_RESULT_MAX_INLINE_CHARS` (200KB) — oversized results return an error telling AI to use grep + targeted read instead
