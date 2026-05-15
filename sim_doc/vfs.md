# Sim Workspace VFS — Full Architecture Reference

## What Is the VFS

The VFS (Virtual File System) is an in-memory `Map<string, string>` that models the entire workspace as a navigable file tree. It is NOT a real filesystem on disk. The AI copilot can browse and read it on-demand using four tools: `read()`, `grep()`, `glob()`, and `list()`.

Nothing is sent to the AI upfront. The AI navigates the VFS to find what it needs — block schemas, workflow state, credentials, integration schemas, trigger configs, KB metadata, etc.

---

## Why VFS Exists

The core problem: the workspace contains hundreds of blocks, thousands of tool definitions, all workflow states, all knowledge bases, files, tables, credentials, and more. Sending all of that to the LLM on every turn is:
- Too expensive (tokens)
- Too slow (serialization)
- Wasteful (AI usually only needs a small slice)

The VFS solves this with a **pull model**:
1. At request time, materialize a Map of every file path → serialized content
2. Give the AI four read-only tools to navigate it
3. AI browses what it needs, ignores the rest

This means the AI can self-navigate to exactly the information it needs, in the order it needs it.

---

## Architecture Overview

```
WorkspaceVFS (Map<string, string>)
        │
        ├── Static component files (computed once per process, shared across all instances)
        │     ├── components/blocks/{type}.json        ← block schemas
        │     ├── components/integrations/{svc}/{op}.json  ← tool schemas
        │     ├── components/triggers/...              ← trigger schemas
        │     └── knowledgebases/connectors/...        ← connector schemas
        │
        └── Dynamic workspace files (fresh from DB per request)
              ├── WORKSPACE.md                         ← workspace inventory
              ├── workflows/**                         ← all workflows
              ├── tables/**                            ← all tables
              ├── files/**                             ← file metadata
              ├── knowledgebases/**                    ← KB metadata
              ├── environment/**                       ← credentials, vars, keys
              ├── agent/**                             ← MCP servers, skills, tools
              └── jobs/**                              ← scheduled jobs
```

---

## Key Files

| File | Purpose |
|---|---|
| `lib/copilot/vfs/workspace-vfs.ts` | `WorkspaceVFS` class + `getOrMaterializeVFS()` factory |
| `lib/copilot/vfs/serializers.ts` | Pure functions that produce VFS file contents from data |
| `lib/copilot/vfs/operations.ts` | Pure `read`, `grep`, `glob`, `list`, `suggestSimilar` on a Map |
| `lib/copilot/vfs/file-reader.ts` | Dynamic read for actual workspace files (images, PDFs, etc.) |
| `lib/copilot/vfs/normalize-segment.ts` | Path sanitization: names → safe VFS segments |
| `lib/copilot/vfs/document-style.ts` | OOXML theme/font extraction for .docx/.pptx |
| `lib/copilot/tools/handlers/vfs.ts` | Exposes the four VFS tools to the AI |

---

## Complete VFS Directory Tree

Every path that gets a `files.set()` call during materialization:

```
WORKSPACE.md
  └── Workspace summary: name, members, all workflows, KBs, tables, files,
      OAuth integrations, env vars, custom tools, MCP servers, skills, jobs.
      Links to VFS paths like "workflows/{name}/state.json".

workflows/
  {folder}/
    .folder                          — empty marker for empty folders
    {subfolder}/
      .folder
      {workflowName}/
        meta.json                    — id, name, description, isDeployed, deployedAt,
        │                              runCount, lastRunAt, createdAt, updatedAt
        state.json                   — full workflow JSON (blocks, edges, loops, parallels)
        executions.json              — last 5 execution logs
        deployment.json              — API/chat/form/MCP/A2A deployment config
        versions.json                — deployment version history (if any versions exist)

knowledgebases/
  {name}/
    meta.json                        — id, name, description, embeddingModel,
    │                                  embeddingDimension, tokenCount, documentCount,
    │                                  connectorTypes, createdAt, updatedAt
    documents.json                   — per-doc: id, filename, fileSize, mimeType,
    │                                  chunkCount, tokenCount, processingStatus, enabled
    connectors.json                  — per-connector: type, status, syncMode,
                                       syncInterval, lastSyncAt, consecutiveFailures
  connectors/
    connectors.md                    — markdown table of all available connector types
    {type}.json                      — full config schema for that connector type
                                       (field types, required, options, auth mode)

tables/
  {name}/
    meta.json                        — id, name, description, schema (JSON),
                                       rowCount, maxRows, createdAt, updatedAt

files/
  {name}/
    meta.json                        — id, name, contentType, size, uploadedAt
  by-id/
    {id}/
      meta.json                      — same as above
      style                          — [dynamic] OOXML theme+fonts for .docx/.pptx
      compiled-check                 — [dynamic] Mermaid validation or JS sandbox compile

environment/
  credentials.json                   — OAuth credential IDs, provider, displayName, scope
                                       (NO tokens or secret values)
  api-keys.json                      — API key names, type, lastUsed (NO values)
  variables.json                     — env var names by scope: personal + workspace (NO values)
  oauth-integrations.json            — static: all OAuth providers + required scopes
  api-key-integrations.json          — static: all API key integrations + param names

custom-tools/
  {name}.json                        — id, title, schema, codePreview (first 500 chars)

agent/
  custom-tools/
    {name}.json                      — same as above (duplicate path for agent context)
  mcp-servers/
    {name}.json                      — id, name, url, transport, enabled, connectionStatus
  skills/
    {name}.json                      — id, name, description, contentPreview (first 500 chars)

jobs/
  {name}/
    meta.json                        — id, title, prompt, cronExpression, timezone,
    │                                  status, lifecycle, successCondition, maxRuns,
    │                                  runCount, nextRunAt, lastRanAt
    history.json                     — job execution history summaries
    executions.json                  — last 5 execution logs

tasks/
  {title}/
    session.md                       — chat ID, created/updated, message count
    chat.json                        — user + assistant messages (filtered)

recently-deleted/
  workflows/{name}/meta.json
  tables/{name}/meta.json
  files/{name}/meta.json
  folders/{name}/meta.json
  knowledgebases/{name}/meta.json

components/
  blocks/
    {type}.json                      — block schema (see Block Schema section)
    loop.json                        — built-in loop block schema
    parallel.json                    — built-in parallel block schema
  integrations/
    {service}/
      {operation}.json               — tool schema (see Integration Schema section)
  triggers/
    sim/
      {type}.json                    — built-in trigger schema (start, schedule, webhook)
    {provider}/
      {id}.json                      — external trigger schema
    triggers.md                      — markdown overview table of all trigger types
```

**Notes:**
- Folder nesting is arbitrary depth: `workflows/Team A/Projects/Q1/My Workflow/state.json` is valid.
- Empty folders exist as `.folder` marker files so `glob("workflows/**")` can discover them.
- `recently-deleted/*` only visible if AI explicitly globs for it — not included in `WORKSPACE.md`.
- All names are run through `sanitizeName()` before becoming VFS paths.

---

## Block Schema (`components/blocks/{type}.json`)

Produced by `serializeBlockSchema(block)` from `lib/copilot/vfs/serializers.ts`.

```json
{
  "type": "agent",
  "name": "Agent",
  "description": "Run an LLM with tools",
  "category": "blocks",
  "longDescription": "...",
  "bestPractices": "...",
  "triggerAllowed": true,
  "singleInstance": false,
  "tools": ["tool_id_1", "tool_id_2"],
  "subBlocks": [
    {
      "id": "model",
      "type": "combobox",
      "title": "Model",
      "required": true,
      "options": [
        { "id": "claude-opus-4-7", "provider": "anthropic", "hosted": true, "recommended": true },
        { "id": "gpt-4o", "provider": "openai", "hosted": false }
      ],
      "dynamicProviders": {
        "note": "...",
        "prefixes": ["ollama/", "vllm/", "openrouter/"]
      }
    },
    {
      "id": "prompt",
      "type": "long-input",
      "title": "Prompt",
      "required": true
    }
  ],
  "inputs": { "input": { "type": "string" } },
  "outputs": {
    "response": { "type": "string" },
    "tokens": { "type": "json" }
  }
}
```

**Key details:**
- Hidden subblocks (flagged `hidden: true` in block config) are excluded.
- Functions are stripped — the `options` array for `model` combobox has static data inlined by `getStaticModelOptionsForVFS()`.
- `dynamicProviders` note explains how user-configured providers (Ollama, vllm, OpenRouter) work.

---

## Integration Schema (`components/integrations/{service}/{op}.json`)

Produced by `serializeIntegrationSchema(tool)`.

```json
{
  "id": "slack_send_message",
  "name": "Send Message",
  "description": "Send a message to a Slack channel",
  "version": "1.0.0",
  "oauth": { "required": true, "provider": "slack" },
  "params": {
    "channel": { "type": "string", "required": true, "description": "Channel ID or name" },
    "text": { "type": "string", "required": true, "description": "Message text" },
    "credentialId": {
      "type": "string",
      "required": false,
      "description": "Credential ID. Get valid IDs from environment/credentials.json."
    }
  },
  "outputs": {
    "ts": { "type": "string", "description": "Message timestamp" },
    "channel": { "type": "string", "description": "Channel ID" }
  }
}
```

**Key details:**
- `credentialId` is automatically added to OAuth tools as a param hint.
- Hosted API key param (`tool.hosting.apiKeyParam`) is stripped from output — AI shouldn't try to set it.
- Actual param values are never included, only types and descriptions.

---

## Trigger Schema (`components/triggers/{provider}/{id}.json`)

```json
{
  "id": "github_push",
  "name": "GitHub Push",
  "provider": "github",
  "description": "Trigger on repository push events",
  "version": "1.0.0",
  "webhook": { "method": "POST", "headers": { "X-GitHub-Event": "push" } },
  "subBlocks": [
    { "id": "repo", "type": "short-input", "title": "Repository", "required": true }
  ],
  "outputs": {
    "ref": { "type": "string" },
    "commits": { "type": "json" }
  }
}
```

---

## Dynamic File Reading

The VFS Map only stores *metadata* for workspace files (name, size, type). Actual content is fetched dynamically when the AI calls `read("files/by-id/{id}")`.

`lib/copilot/vfs/file-reader.ts` handles this by file type:

| File type | Handling |
|---|---|
| **Images** (JPEG, PNG, GIF, WebP) | Resize with sharp if needed (max 5MB, max 1568px). Return as base64 attachment. |
| **Text files** (txt, csv, md, json, etc.) | Read bytes, convert to UTF-8. Return as plain content. Max 5MB. |
| **Parseable documents** (PDF, DOCX, XLS, PPTX) | Parse with `parseBuffer()`, extract text. Max 5MB. |
| **Binary files** | Return placeholder: `[Binary file: name (type, size). Cannot display as text.]` |
| `files/by-id/{id}/style` | Extract OOXML theme colors + fonts via `extractDocumentStyle()`. |
| `files/by-id/{id}/compiled-check` | Validate Mermaid source, or compile JS in sandbox. |

All operations are wrapped in OTel spans (`copilot.vfs.read_file`, `copilot.vfs.prepare_image`).

---

## Path Normalization: `normalizeVfsSegment`

Every resource name (workflow name, file name, folder name, etc.) goes through `normalizeVfsSegment()` before becoming a VFS path segment.

Transforms applied:
1. NFC Unicode normalization
2. Trim whitespace
3. Strip ASCII control chars (`\x00–\x1f`, `\x7f`)
4. Map `/` → `-` (no path traversal)
5. Collapse Unicode whitespace (including `U+202F` narrow no-break space) → ASCII space

Examples:
- `"My  Workflow  (v1)"` → `"My Workflow (v1)"`
- `"folder/name"` → `"folder-name"` (no slash injection)
- `"héllo"` NFC-normalized consistently

This ensures database names (which may have exotic Unicode or multiple spaces) always map to the same VFS path.

---

## The Four AI-Facing VFS Tools

Defined in `lib/copilot/tools/handlers/vfs.ts`. These are what the AI actually calls.

### `read(path, offset?, limit?)`

Read a file or a window of its lines.

**Parameters:**
- `path` — VFS path (e.g., `workflows/My Workflow/state.json`)
- `offset` — start line (0-based, optional)
- `limit` — number of lines to return (optional)

**Returns:**
```typescript
{
  content: string,
  totalLines: number,
  attachment?: {           // only for image files
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: "..." }
  }
}
```

**Error recovery:** If path not found, calls `suggestSimilar()` and returns an error with up to 5 candidate paths ranked by similarity.

**Size guard:** If file is over `TOOL_RESULT_MAX_INLINE_CHARS` (200KB), returns an error suggesting AI use `grep` + targeted `read(offset, limit)` instead.

---

### `grep(pattern, path?, output_mode?, maxResults?, ignoreCase?, lineNumbers?, context?)`

Regex search across VFS files.

**Parameters:**
- `pattern` — ECMAScript regex
- `path` — scope to a path prefix or glob pattern (optional)
- `output_mode` — `'content'` (default), `'files_with_matches'`, or `'count'`
- `maxResults` — max matches to return (default 50)
- `ignoreCase` — case-insensitive (default false)
- `lineNumbers` — include line numbers (default true)
- `context` — lines of context around each match (default 0)

**Returns (by mode):**
- `content` mode: `[{ path, line, content }]`
- `files_with_matches` mode: `[path1, path2, ...]`
- `count` mode: `[{ path, count }]`

**Path scoping:** If `path` contains `*` or `?`, uses micromatch. Otherwise uses directory-prefix matching — `"workflows/"` matches `workflows/foo/meta.json` but not `workflows-old/meta.json`.

---

### `glob(pattern)`

List all files/directories matching a glob pattern.

**Parameters:**
- `pattern` — micromatch glob (supports `*`, `?`, `**`, no braces or extglobs)

**Returns:** Sorted array of matching paths, including virtual directories.

Examples:
- `glob("workflows/*/state.json")` → `["workflows/My Wf/state.json", ...]`
- `glob("components/blocks/**")` → blocks dir + all .json files

---

### `list(path)`

List one level of a directory.

**Parameters:**
- `path` — directory path (e.g., `workflows`, `components/integrations/slack`)

**Returns:** `[{ name: string, type: 'file' | 'dir' }]` sorted dirs-first then alphabetically.

---

## `suggestSimilar` — Typo Recovery

When the AI reads a path that doesn't exist, `suggestSimilar(missingPath)` returns up to 5 candidates ranked by a scoring algorithm:

| Score | Condition |
|---|---|
| 100 | Exact filename + parent dir match |
| 95 | Exact filename match in wrong directory |
| 80 | Partial name/stem match |
| 60-70 | Same top-level dir + matching stem fragment |

Example: AI reads `workflows/Untitled/state.json`, but actual path is `workflows/Untitled Workflow/state.json`. Suggestion score 95 — exact filename in wrong dir.

---

## Static vs Dynamic Files

### Static (computed once per process)

`getStaticComponentFiles()` is called on the first `WorkspaceVFS` instantiation and the result is stored in a module-level variable. All subsequent instances reuse it.

Static files:
- `components/blocks/{type}.json` — from `getAllBlocks()` registry
- `components/integrations/{service}/{op}.json` — from `tools` registry
- `components/triggers/**` — from `TRIGGER_REGISTRY`
- `knowledgebases/connectors/**` — from `CONNECTOR_REGISTRY`
- `environment/oauth-integrations.json` — from OAuth provider registry
- `environment/api-key-integrations.json` — from tools with API key auth

**Why cached:** Block/tool registries are module-level singletons that don't change at runtime. Re-serializing them on every chat turn wastes CPU.

### Dynamic (fresh from DB per request)

Everything under:
- `workflows/**` — loaded from DB via `listWorkflows()`, `loadWorkflowFromNormalizedTables()`
- `knowledgebases/**` — `getKnowledgeBases()`
- `tables/**` — `listTables()`
- `files/**` — `listWorkspaceFiles()`
- `environment/**` — `getAccessibleOAuthCredentials()`, `getAccessibleEnvCredentials()`, `getPersonalAndWorkspaceEnv()`, `listApiKeys()`
- `agent/**` — `listCustomTools()`, MCP servers query, `listSkills()`
- `jobs/**` — scheduled jobs query
- `tasks/**` — copilot chat sessions query
- `recently-deleted/**` — archived resources query
- `WORKSPACE.md` — assembled from summaries returned by each materializer

All materializers run in parallel via `Promise.all()`.

---

## Serializers Reference

All in `lib/copilot/vfs/serializers.ts`. Pure functions — deterministic, no side effects.

| Serializer | Output path | What it includes |
|---|---|---|
| `serializeWorkflowMeta(wf)` | `workflows/{n}/meta.json` | id, name, description, isDeployed, deployedAt, runCount, lastRunAt |
| `serializeDeployments(data)` | `workflows/{n}/deployment.json` | API endpoint, chat URL, form URL, MCP tools, A2A config, needsRedeployment |
| `serializeRecentExecutions(rows)` | `workflows/{n}/executions.json` | Last 5: executionId, status, trigger, startedAt, endedAt, durationMs |
| `serializeVersions(rows)` | `workflows/{n}/versions.json` | id, version, name, description, isActive, createdAt |
| `serializeKBMeta(kb)` | `knowledgebases/{n}/meta.json` | id, name, embeddingModel, dimensions, tokenCount, documentCount |
| `serializeDocuments(docs)` | `knowledgebases/{n}/documents.json` | Per-doc: id, filename, fileSize, mimeType, chunkCount, processingStatus |
| `serializeConnectors(rows)` | `knowledgebases/{n}/connectors.json` | Per-connector: type, status, syncMode, interval, lastSyncAt, failures |
| `serializeConnectorSchema(cc)` | `knowledgebases/connectors/{type}.json` | configFields with types + options, auth mode, tagDefinitions |
| `serializeConnectorOverview(ccs)` | `knowledgebases/connectors/connectors.md` | Markdown table: type, name, OAuth provider, required scopes |
| `serializeTableMeta(t)` | `tables/{n}/meta.json` | id, name, description, schema, rowCount, maxRows |
| `serializeFileMeta(f)` | `files/{n}/meta.json` + `files/by-id/{id}/meta.json` | id, name, contentType, size, uploadedAt |
| `serializeCredentials(accounts)` | `environment/credentials.json` | id, provider, displayName, role, scope — NO tokens |
| `serializeApiKeys(keys)` | `environment/api-keys.json` | id, name, type, lastUsed — NO values |
| `serializeEnvironmentVariables(p, w)` | `environment/variables.json` | Names only by scope — NO values |
| `serializeBlockSchema(block)` | `components/blocks/{type}.json` | subBlocks, inputs, outputs, tools, static model options |
| `serializeIntegrationSchema(tool)` | `components/integrations/{svc}/{op}.json` | params (types only), outputs, oauth info |
| `serializeTriggerSchema(trigger)` | `components/triggers/{provider}/{id}.json` | webhook config, subBlocks, outputs |
| `serializeBuiltinTriggerSchema(block)` | `components/triggers/sim/{type}.json` | Same as above for built-in triggers |
| `serializeTriggerOverview(b, e)` | `components/triggers/triggers.md` | Markdown table of all trigger types |
| `serializeCustomTool(tool)` | `custom-tools/{n}.json` | id, title, schema, codePreview (≤500 chars) |
| `serializeMcpServer(server)` | `agent/mcp-servers/{n}.json` | id, name, url, transport, enabled, connectionStatus |
| `serializeSkill(s)` | `agent/skills/{n}.json` | id, name, description, contentPreview (≤500 chars) |
| `serializeJobMeta(job)` | `jobs/{n}/meta.json` | Full job config: cron, status, lifecycle, run counts |
| `serializeDeployments(data)` | `workflows/{n}/deployment.json` | All deployment surfaces, needsRedeployment flag |

---

## Security Model

### What IS exposed
- Workflow definitions (block configs, edges, parameters, but not runtime execution data)
- Integration schemas (param types and descriptions, but not values)
- Credential IDs and OAuth provider names (but never token values)
- Environment variable names (but never values)
- File metadata (name, type, size, but not content unless explicitly read)
- Knowledge base metadata (embedding models, doc counts, but not chunks or vectors)

### What is NOT exposed
- OAuth tokens, refresh tokens, access tokens
- API key values
- Environment variable values (personal or workspace)
- File contents unless AI explicitly calls `read("files/by-id/{id}")`
- Database internal IDs for security primitives

### How security is enforced

1. **Access gate:** `assertActiveWorkspaceAccess(userId, workspaceId)` is called before VFS materialization. If the user doesn't have workspace access, VFS creation throws and nothing is returned.

2. **Serializers strip secrets:** Credential serializers output IDs and metadata only. `serializeCredentials()` explicitly maps each field — no `...spread` that could accidentally include tokens.

3. **Path normalization:** `normalizeVfsSegment()` maps `/` → `-`, preventing path traversal attacks.

4. **Size guards:** `readFileContent()` checks byte limits before fetching from S3. Images have a 5MB budget before compression; text files have a 5MB hard limit; parseable docs have a 5MB limit.

5. **Content-type trust:** File reading uses the stored `contentType` from the database record — it doesn't trust user-uploaded file extensions.

---

## DOCUMENT-STYLE.TS — OOXML Extraction

`extractDocumentStyle(buffer, ext)` — extracts design tokens from Word/PowerPoint files.

**Process:**
1. Validate ZIP magic bytes (OOXML is a ZIP archive)
2. For DOCX: parse `word/theme/theme1.xml` + `word/styles.xml`
3. For PPTX: parse `ppt/theme/theme1.xml`
4. Extract color scheme (dk1/lt1/accent1-6) and font scheme (majorFont, minorFont)
5. For DOCX: extract named styles (Normal, Heading1-3, Title, etc.)

**Output:**
```typescript
{
  format: 'docx' | 'pptx',
  theme: {
    name: string,
    colors: Record<string, string>,   // e.g., { dk1: '#000000', accent1: '#4472C4' }
    fonts: { major: string, minor: string }
  },
  styles?: Record<string, object>     // DOCX only: named paragraph styles
}
```

Exposed as `read("files/by-id/{id}/style")` so the AI can understand a document's design language before editing it.

---

## Operations Implementation (`operations.ts`)

All operations are pure — they take `Map<string, string>` as input and return data without mutations.

### `read(files, path, offset?, limit?)`
- Map lookup: `files.get(path)`
- If not found: tries NFC normalization as fallback (handles macOS composed characters)
- Splits content on `\n`, applies offset/limit window if specified
- Returns `{ content: string, totalLines: number }` or `null`

### `grep(files, pattern, path?, opts?)`
- Iterates Map entries
- If `path` has glob chars: uses micromatch to filter keys
- If `path` is a directory: uses prefix match with boundary check (`path + '/'`)
- Per-file: split lines, test regex, collect matches with context
- Respects `maxResults` cap — returns early when hit
- Three output modes: `content` (default), `files_with_matches`, `count`

### `glob(files, pattern)`
- Builds virtual directory set from all file paths
- Matches both files and directories against micromatch pattern
- Returns sorted array

### `list(files, path)`
- Collects entries with the prefix `path + '/'`
- Extracts next path segment (name + type: file or dir)
- Deduplicates dirs (multiple files in same subdir → one dir entry)
- Sorts dirs first, then files, both alphabetically

### `suggestSimilar(files, missingPath, max?)`
- Scores every file in the Map against the missing path
- Scoring: exact filename match in wrong dir (95), exact + parent dir (100), partial matches (60-80)
- Returns top-N sorted by score descending

---

## How to Add a New VFS Resource Type

**Example: adding `scheduled-reports/{name}/config.json`**

1. **Add a serializer** in `lib/copilot/vfs/serializers.ts`:

   ```typescript
   export function serializeReportConfig(report: {
     id: string
     name: string
     schedule: string
     recipients: string[]
     createdAt: Date
   }): string {
     return JSON.stringify({
       id: report.id,
       name: report.name,
       schedule: report.schedule,
       recipientCount: report.recipients.length,  // count only, not addresses
       createdAt: report.createdAt.toISOString(),
     }, null, 2)
   }
   ```

2. **Add a materializer** in `WorkspaceVFS.materialize()`:

   ```typescript
   // Inside the Promise.all block:
   async () => {
     const reports = await listScheduledReports(workspaceId)
     for (const report of reports) {
       const safeName = sanitizeName(report.name)
       this.files.set(
         `scheduled-reports/${safeName}/config.json`,
         serializeReportConfig(report)
       )
     }
     return reports.map(r => ({ name: r.name }))  // summary for WORKSPACE.md
   }
   ```

3. **Add to WORKSPACE.md** — update `buildWorkspaceMd()` in `workspace-context.ts` to include the new section in the markdown summary.

4. **If the resource has secrets**, make sure the serializer only includes IDs and metadata — never the actual secret values.

---

## How to Add a New Static Component Type

For things that are defined in code (like new block types or new integration schemas) and don't change per-workspace:

1. Add serializer in `serializers.ts`
2. Call it inside `getStaticComponentFiles()` in `workspace-vfs.ts`:
   ```typescript
   files.set(`components/my-type/${thing.id}.json`, serializeMyThing(thing))
   ```
3. Static files are computed once per process — no DB needed, no caching code needed.

---

## Typical AI Usage Patterns

**"Build a Slack → Notion workflow"**
```
1. glob("components/blocks/*.json")              → find available block types
2. read("components/blocks/slack.json")          → see Slack block's subblocks + tools
3. read("components/integrations/slack/send_message.json")  → param names for send_message
4. read("components/blocks/notion.json")         → see Notion block
5. read("environment/credentials.json")          → find available OAuth credentials
→ AI now has everything to emit correct add operations
```

**"Edit an existing workflow"**
```
1. read("workflows/My Workflow/state.json")       → inspect current blocks and edges
2. grep("model", { path: "workflows/My Workflow/" })  → find specific config value
→ AI generates targeted edit operations
```

**"Add a scheduled trigger"**
```
1. read("components/triggers/triggers.md")        → overview of all trigger types
2. read("components/triggers/sim/schedule.json")  → schedule trigger config fields
→ AI generates add operation with correct trigger config
```

**"Connect to user's Gmail"**
```
1. read("environment/credentials.json")           → find Google credential IDs
2. read("components/integrations/gmail/send_email.json")  → params for gmail tool
→ AI uses the credential ID directly in the block config
```

---

## Performance Notes

- **VFS materialization:** ~100–500ms depending on workspace size. Runs once per chat request. All materializers run in parallel via `Promise.all()`.
- **Static component files:** Computed once per process lifetime (on first VFS instantiation). Zero cost on subsequent requests.
- **Map reads:** O(1). `read()` is essentially `map.get(path)`.
- **grep:** O(n × lines). Scans all files. For large workspaces with many workflows, scoping with `path` parameter dramatically reduces cost.
- **glob:** O(n). Single pass over Map keys + directory enumeration.
- **Dynamic file reads (S3):** Only triggered when AI explicitly calls `read("files/by-id/{id}")`. Not part of materialization.
