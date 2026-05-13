---
name: validate-node
description: Audit an existing Fuse node against the service API docs and repository conventions, then report and fix issues across the frontend NodeDefinition, backend BaseNode executor, integration service/client, and registry entries. Use when validating or repairing a service node.
---

# Validate Node Skill

You are an expert auditor for Fuse nodes. Your job is to validate that an existing node is correct, complete, and follows all conventions.

## Your Task

When the user asks you to validate a node:
1. Read the service's API documentation (via WebFetch)
2. Read every file for the node and its integration
3. Cross-reference everything against the API docs and Fuse conventions
4. Report all issues found, grouped by severity (critical, warning, suggestion)
5. Fix all issues after reporting them

## Step 1: Gather All Files

Read **every** file for the node — do not skip any:

```
packages/node-definitions/src/{service}.ts        # Frontend NodeDefinition(s)
packages/node-definitions/src/registry.ts         # NODE_REGISTRY — is node registered?

apps/api/app/node_system/builtins/{service}_*.py  # Backend executor(s)
apps/api/app/node_system/registry/registry.py     # Backend registry — is executor registered?

apps/api/app/integrations/{service}/client.py     # HTTP client
apps/api/app/integrations/{service}/service.py    # Business logic
apps/api/app/integrations/{service}/__init__.py   # Barrel export
apps/api/app/integrations/registry.py             # Integration registry

apps/api/app/credential_manager/providers/{service}_provider.py  # OAuth provider (if OAuth)
```

## Step 2: Pull API Documentation

Fetch official API docs for the service. Source of truth for:
- Endpoint URLs, HTTP methods, and auth headers
- Required vs optional parameters
- Parameter types and allowed values
- Response shapes and field names
- OAuth scopes

### Hard Rule: No Guessed Response Schemas

If docs do not clearly show response JSON shape, you MUST tell the user.
- Do NOT assume field names from nearby endpoints
- Do NOT infer nested JSON paths without evidence
- If response schema is unknown: ask for sample responses or test credentials

## Step 3: Validate Frontend NodeDefinition

### Type and Naming
- [ ] `type` uses format `'{category}.{service}_{action}'` (snake_case, dot-separated)
- [ ] `name` is human-readable
- [ ] `description` is a concise one-liner
- [ ] `category` is one of: `'trigger' | 'action' | 'logic' | 'ai' | 'browser' | 'integration'`
- [ ] `credentialType` matches backend credential type exactly (`'{service}_oauth'` or `'{service}_api_key'`)

### Properties
- [ ] All required API params are marked `required: true`
- [ ] All optional API params are marked `required: false` or omitted with a default
- [ ] Property types match the API (`'string'`, `'number'`, `'boolean'`, `'json'`, `'options'`, `'credential'`)
- [ ] Credential property uses `type: 'credential'` with correct `credentialType`
- [ ] Options dropdowns have all valid values from API
- [ ] Conditions use correct syntax: `condition: { field: '...', value: '...' }`
- [ ] Optional/rarely-used fields use `mode: 'advanced'`
- [ ] Required fields are NEVER set to `mode: 'advanced'`

### Inputs/Outputs
- [ ] `inputs: 0` for trigger nodes, `inputs: 1` for all others
- [ ] `outputs: 1` for standard nodes

### Registry
- [ ] Node is imported and added to `NODE_REGISTRY` in `packages/node-definitions/src/registry.ts`
- [ ] Import is alphabetically ordered

## Step 4: Validate Backend Node Executor

### Type Alignment (CRITICAL)
- [ ] Executor `type` property returns **exact same string** as `NodeDefinition.type`
- [ ] Class name is `PascalCase` matching the node operation (e.g., `SlackSendMessageNode`)
- [ ] File is registered in `apps/api/app/node_system/registry/registry.py` with the correct key

### Property Access
- [ ] Uses `self.properties.get('key')` to access node configuration (not `self.properties['key']` — will crash on missing)
- [ ] Validates required properties before use
- [ ] Returns `NodeResult(success=False, error='...')` for missing required values

### Credential Access
- [ ] Uses `context.credentials.get('{service}_oauth')` (not direct attribute access)
- [ ] Checks credential exists before using it
- [ ] Returns `NodeResult(success=False, error='credential not found')` if missing

### Error Handling
- [ ] ALL code paths inside `execute()` are wrapped in `try/except Exception`
- [ ] Exceptions return `NodeResult(success=False, error=str(e))` — never propagate
- [ ] Logs exceptions with `logger.error(f'...', exc_info=True)` before returning

### Imports
- [ ] All imports are **absolute** (never `from .client import ...`)
- [ ] Uses `from apps.api.app.core.logger import get_logger`
- [ ] Does NOT use `print()` anywhere

### Output Data
- [ ] `output_data` contains only documented API response fields
- [ ] All nullable fields use `.get('key')` with optional defaults
- [ ] No raw JSON dumps — extracts meaningful fields
- [ ] Output field names match what downstream nodes would expect

## Step 5: Validate Integration Client

- [ ] Uses `httpx.AsyncClient` (not `requests` or raw `urllib`)
- [ ] Auth header matches the API spec (Bearer token, API key header name, etc.)
- [ ] `timeout` is set on the client
- [ ] All HTTP methods implemented correctly (GET params vs POST body)
- [ ] ID fields in URL paths are `.strip()`-ed to prevent whitespace errors
- [ ] `raise_for_status()` called after every response
- [ ] Client can be used as async context manager (`async with`)

## Step 6: Validate Integration Service

- [ ] Service delegates all HTTP calls to client (no raw HTTP in service)
- [ ] Method signatures match what executors expect
- [ ] Optional params handled correctly (not sent as `None` if API doesn't accept null)
- [ ] Service is importable from `apps.api.app.integrations.{service}.service`
- [ ] Registered in `apps/api/app/integrations/registry.py`

## Step 7: Validate OAuth Provider (if OAuth)

- [ ] `provider_id` matches the `credentialType` prefix (`{service}`)
- [ ] `credential_type` = `'{service}_oauth'`
- [ ] `authorization_url` and `token_url` match API docs exactly
- [ ] `scopes` contain only real, documented scopes — no invented ones
- [ ] No excess scopes beyond what the integration actually uses
- [ ] `exchange_code` correctly implements authorization code flow
- [ ] `refresh_token` correctly refreshes expired tokens
- [ ] Registered in credential manager providers

## Step 8: Report and Fix

### Report Format

Group findings by severity:

**Critical** (runtime errors or auth failures):
- `type` string mismatch between frontend and backend
- Missing executor registration in `registry.py`
- Uncaught exceptions in `execute()` (no try/except)
- Missing credential check before use
- Wrong endpoint URL or HTTP method
- Relative imports in Python files
- `print()` usage instead of logger
- Signature verification not using `hmac.compare_digest`

**Warning** (conventions violated, usability issues):
- `self.properties['key']` instead of `.get('key')` (will crash on missing)
- Optional API fields not set to `mode: 'advanced'` in frontend
- Raw JSON dumps in `output_data` instead of extracted fields
- Missing `.strip()` on ID fields in URLs
- Missing `raise_for_status()` in client
- Invented scopes in OAuth provider
- Missing or incorrect `__init__.py` barrel exports

**Suggestion** (minor improvements):
- Better property descriptions
- Missing `placeholder` text for string inputs
- Inconsistent naming across related nodes

### Fix All Issues

After reporting, fix every **critical** and **warning** issue. Apply **suggestions** where they don't add unnecessary complexity.

### Validation Output

After fixing, confirm:
1. `make lint` passes (`ruff` for Python, `eslint` for TypeScript)
2. `npx tsc --noEmit` passes (TypeScript type check)
3. Re-read all modified files to verify fixes are correct
4. Any remaining unknown response schemas were explicitly reported to the user

## Checklist Summary

- [ ] Read ALL node definition, executor, client, service, and registry files
- [ ] Pulled and read official API documentation
- [ ] Validated `type` string matches exactly between frontend and backend
- [ ] Validated all properties have correct types, required flags, and conditions
- [ ] Validated executor: no uncaught exceptions, absolute imports, logger usage
- [ ] Validated credential access: `.get()` with null check
- [ ] Validated integration client: httpx, raise_for_status, auth headers
- [ ] Validated integration service: no raw HTTP, correct method signatures
- [ ] Validated OAuth provider: correct scopes, correct URLs (if OAuth)
- [ ] Validated all registry entries
- [ ] Reported all issues grouped by severity
- [ ] Fixed all critical and warning issues
- [ ] `make lint` passes after fixes
- [ ] TypeScript compiles clean
