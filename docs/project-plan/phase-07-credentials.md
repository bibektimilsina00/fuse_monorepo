# Phase 7 — Credential Management

**Status: ✅ Completed**

---

## Goal

Users can store OAuth tokens and API keys encrypted at rest. OAuth authorization flow works. Credentials injected into `NodeContext` at execution time.

## Prerequisites

- Phase 6 complete (frontend working, auth working)
- OAuth app credentials in `.env` (Slack, GitHub, etc.)

---

## Step 1: Update Credential Model
**Status: ✅ Done**

- Added `user_id` FK to `Credential` model.
- Added `credentials` relationship to `User` model.
- Applied migrations.

## Step 2: Fix Encryption Service
**Status: ✅ Done**

- Implemented `AESEncryptionService` using Fernet.
- Secured credentials at rest using `ENCRYPTION_KEY`.

## Step 3: Credential Schemas
**Status: ✅ Done**

- Defined `CredentialCreate`, `CredentialOut`, and `ProviderOut` schemas.
- Added support for dynamic `meta` and `scopes`.

## Step 4: Credential Repository
**Status: ✅ Done**

- Implemented `CredentialRepository` with user isolation.

## Step 5: Credential Service
**Status: ✅ Done**

- Implemented `CredentialService` for secure storage and retrieval.
- Added `get_decrypted_by_type` for execution engine use.

## Step 6: Credentials Router
**Status: ✅ Done**

- Implemented CRUD endpoints for credentials.
- Added dynamic `/providers` endpoint.
- Implemented OAuth URL and Callback routes.

## Step 7: OAuth Flow Helpers
**Status: ✅ Done**

- Implemented `SlackOAuthProvider` and `GitHubOAuthProvider`.
- Added metadata persistence (name/description) via OAuth state.

## Step 8: Inject Credentials into WorkflowRunner
**Status: ✅ Done**

- `WorkflowRunner` now accepts `credentials` dict.
- `tasks.py` loads and decrypts all user credentials before execution.
- `NodeContext` provides credentials to individual node executors.

## Step 9: Add OAuth env vars to `.env`
**Status: ✅ Done**

- Added placeholder/configured vars for Slack and GitHub.

---

## Checklist

- [x] `Credential.user_id` FK added + migration applied
- [x] `User.credentials` back-reference added
- [x] `encryption_service` name fixed (also exported as `aes_service` alias)
- [x] `CredentialOut` schema never includes `encrypted_data` or decrypted tokens
- [x] `CredentialRepository.get_by_type_and_user()` implemented (for execution engine)
- [x] `CredentialService.store_credential()` encrypts data before storing
- [x] `CredentialService.get_decrypted_by_type()` opens own DB session (called from worker)
- [x] `GET /credentials/` returns only current user's credentials
- [x] `POST /credentials/` stores encrypted credential
- [x] `DELETE /credentials/{id}` removes credential (404 if not owner)
- [x] `GET /credentials/oauth/slack/url` returns Slack OAuth URL
- [x] `GET /credentials/oauth/slack/callback` exchanges code, stores token, redirects to frontend
- [x] `WorkflowRunner` accepts `credentials` dict in constructor
- [x] Credentials injected into `NodeContext.credentials` before each node execution
- [x] SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in `.env`
- [x] `make lint` passes

---

## Acceptance Criteria ✅

- [x] Store API key credential (Encrypted)
- [x] List credentials (Privacy secured)
- [x] Get OAuth URL (Dynamic state)
- [x] OAuth Callback (Token exchange + Metadata persistence)
- [x] Delete (Access control verified)

---

## Technical Enhancements Made During Phase 7
1. **Dynamic Provider Registry**: Added a backend-driven registry for both OAuth and API key providers, allowing the UI to update automatically when new services are added.
2. **Metadata-Aware OAuth**: Implemented a deferred OAuth flow that captures custom integration names and descriptions *before* redirecting, preserving them through the handshake.
3. **Premium Configuration UI**: Designed a command-palette style modal for integration setup, including dynamic permission visualizations.
4. **Zustand-Auth Sync**: Integrated the frontend API client with Zustand to ensure all credential requests are automatically authenticated.
