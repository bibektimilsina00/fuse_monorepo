# Phase 1 — Real Authentication

**Status: ✅ DONE**

---

## Goal

Users can register, log in with JWT, and all protected endpoints enforce auth. No more hardcoded admin/admin.

## Prerequisites

- Phase 0 complete
- PostgreSQL running (`make db-up`)

## What Was Built

### Files created/modified

| File | What |
|---|---|
| `apps/api/app/models/user.py` | `User` SQLAlchemy model |
| `apps/api/app/schemas/auth.py` | `UserRegister`, `UserLogin`, `TokenResponse`, `UserOut` Pydantic schemas |
| `apps/api/app/repositories/user_repository.py` | `get_by_email()`, `create()` |
| `apps/api/app/services/auth_service.py` | `register()`, `authenticate()` |
| `apps/api/app/api/v1/auth/router.py` | `POST /register`, `POST /login`, `GET /me` |
| `apps/api/app/api/v1/auth/dependencies.py` | `get_current_user` FastAPI dependency |
| `apps/api/alembic/versions/xxxx_create_user_table.py` | Alembic migration |

### User model fields
- `id` — UUID primary key
- `email` — String, unique, not null
- `hashed_password` — String, not null
- `is_active` — Boolean, default True
- `created_at` — DateTime UTC

### Auth patterns used
- Password hashing: `passlib[bcrypt]`
- JWT: `python-jose`
- Token expiry: 8 days (from `settings.ACCESS_TOKEN_EXPIRE_MINUTES`)

## Acceptance Criteria (Verified)

```bash
# Register
curl -X POST localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"id":"...","email":"test@test.com"}

# Login
curl -X POST localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"access_token":"eyJ...","token_type":"bearer"}

# Protected route
curl localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJ..."
# → {"id":"...","email":"test@test.com"}

# Reject bad token
curl localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer badtoken"
# → 401 Unauthorized
```
