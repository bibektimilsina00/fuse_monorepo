---
name: validate-trigger
description: Audit an existing Fuse webhook trigger against the service webhook API docs and repository conventions, then report and fix issues across trigger node definition, FastAPI handler, signature verification, and registry wiring.
---

# Validate Trigger Skill

You are an expert auditor for Fuse webhook triggers. Your job is to validate that an existing trigger implementation is correct, complete, secure, and aligned across all layers.

## Your Task

1. Read the service's webhook documentation (via WebFetch)
2. Read every trigger file and registration entry
3. Cross-reference against the API docs and Fuse conventions
4. Report all issues grouped by severity (critical, warning, suggestion)
5. Fix all issues after reporting them

## Step 1: Gather All Files

Read **every** file for the trigger — do not skip any:

```
packages/node-definitions/src/{service}.ts              # Trigger NodeDefinition
packages/node-definitions/src/registry.ts               # NODE_REGISTRY entry
apps/api/app/api/v1/triggers/{service}_handler.py       # FastAPI webhook handler
apps/api/app/api/v1/router.py                           # Router registration
apps/api/app/models/trigger.py                          # Trigger DB model
```

## Step 2: Pull API Documentation

Fetch the service's official webhook documentation. Source of truth for:
- Webhook event types and payload shapes
- Signature/auth verification (HMAC algorithm, header names, secret format)
- Challenge/verification handshake requirements
- Webhook subscription API (if any)

### Hard Rule: No Guessed Webhook Payload Schemas

If the official docs do not clearly show the webhook payload JSON, you MUST tell the user.
- Do NOT invent payload field names
- Do NOT infer nested payload paths without evidence
- If payload schema is unknown: ask for sample payloads or live test webhook

## Step 3: Validate Trigger Node Definition

### Type and Naming
- [ ] `type` uses format `'trigger.{service}_{event}'`
- [ ] `category: 'trigger'`
- [ ] `inputs: 0` (triggers never have inputs)
- [ ] `outputs: 1`
- [ ] `description` accurately describes the triggering event

### Properties
- [ ] Credential property present if service requires auth
- [ ] Filter/config fields use `mode: 'advanced'` (optional, not required)
- [ ] No required fields set to `mode: 'advanced'`
- [ ] Registered in `packages/node-definitions/src/registry.ts`

## Step 4: Validate FastAPI Handler

### Route and Registration
- [ ] Handler file at `apps/api/app/api/v1/triggers/{service}_handler.py`
- [ ] Router registered in `apps/api/app/api/v1/router.py`
- [ ] Route prefix and path are correct for the service

### Signature Verification (CRITICAL)
- [ ] Signature verification is implemented
- [ ] Uses `hmac.compare_digest` — NOT `==` for comparison (timing attack vulnerability)
- [ ] Signature computed against **raw request bytes**, not parsed JSON
- [ ] Correct HMAC algorithm per API docs (sha256, sha1, etc.)
- [ ] Correct signature header name per API docs
- [ ] Correct signature format handled (plain hex, `sha256=` prefix, base64, etc.)
- [ ] Handler rejects when secret is missing (fail-closed, not fail-open)
- [ ] Webhook secrets never appear in logs

### Payload Processing
- [ ] Handler calls `await request.body()` BEFORE `await request.json()` for signature verification
- [ ] Only extracts **documented** payload fields — no invented field names
- [ ] Uses `.get()` for all payload field access (payload structure may vary)
- [ ] Returns `{'status': 'ok'}` or appropriate success response

### Workflow Triggering
- [ ] Calls `WorkflowService.trigger_workflows(trigger_type=..., trigger_data=...)`
- [ ] `trigger_type` matches the `NodeDefinition.type` exactly
- [ ] `trigger_data` contains meaningful, documented fields

### Output Alignment (CRITICAL)
- [ ] Every key in `trigger_data` is a documented field from the webhook payload
- [ ] `trigger_type` matches `NodeDefinition.type` exactly
- [ ] No wrapper objects or extra nesting in `trigger_data`

### Error Handling
- [ ] Handler is wrapped in try/except
- [ ] Returns appropriate HTTP error responses (4xx for bad signatures, 5xx for processing errors)
- [ ] Uses `logger.error(...)` with `exc_info=True` for exceptions
- [ ] Never uses `print()`
- [ ] All imports are absolute

## Step 5: Security Audit

- [ ] Webhook secret never logged (not even at debug level)
- [ ] Signature verification runs BEFORE any payload processing
- [ ] `hmac.compare_digest` used (not `==`, not `secrets.compare_digest` unless that's what's available)
- [ ] Raw bytes used for signature (not re-serialized JSON)
- [ ] No secret values in error messages returned to caller

## Step 6: Report and Fix

### Report Format

Group findings by severity:

**Critical** (security issues or runtime failures):
- Signature comparison using `==` instead of `hmac.compare_digest`
- Signature computed against parsed JSON instead of raw bytes
- Handler missing signature verification entirely when service supports it
- `trigger_type` in `trigger_workflows` doesn't match `NodeDefinition.type`
- Handler not registered in router
- Absolute import violations in Python
- Webhook secret logged

**Warning** (convention violations or usability issues):
- Missing or incorrect HMAC algorithm per API docs
- Wrong signature header name
- Inventing payload field names not in API docs
- Filter properties in frontend definition not using `mode: 'advanced'`
- Handler does not call `request.body()` before `request.json()` for signature verification
- Trigger node not registered in `NODE_REGISTRY`

**Suggestion** (minor improvements):
- Better filter field descriptions
- Additional documented payload fields that could be exposed
- Improved error messages for failed signature verification

### Fix All Issues

After reporting, fix every **critical** and **warning** issue. Apply **suggestions** where they don't add unnecessary complexity.

### Validation Output

After fixing, confirm:
1. `make lint` passes
2. `npx tsc --noEmit` passes
3. Re-read all modified files to verify fixes are correct
4. Any remaining unknown webhook payload schemas were explicitly reported to the user

## Checklist Summary

- [ ] Read trigger node definition, handler, and all registries
- [ ] Pulled and read official webhook documentation
- [ ] Validated `type` string matches exactly between frontend and backend `trigger_type`
- [ ] Validated `inputs: 0` and `category: 'trigger'`
- [ ] Validated HMAC algorithm, header name, and format per API docs
- [ ] Validated `hmac.compare_digest` used (not `==`)
- [ ] Validated signature computed against raw bytes
- [ ] Validated fail-closed behavior (reject when secret missing)
- [ ] Validated payload fields match API docs (no invented fields)
- [ ] Validated trigger_type matches NodeDefinition.type exactly
- [ ] Validated router registration
- [ ] Reported all issues grouped by severity
- [ ] Fixed all critical and warning issues
- [ ] `make lint` passes after fixes
