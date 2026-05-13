# Phase 18 — Production Readiness

**Status: ⬜ Not Started**

---

## Goal

Secure, observable, containerized. Ready to deploy. No localhost references. No dev secrets. HTTPS enforced.

## Prerequisites

- Phase 17 complete (all tests passing)

---

## Step 1: Security Hardening

### CORS — restrict origins

**File:** `apps/api/app/main.py`

Replace `allow_origins=["*"]` with:
```python
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
```

Add to `.env.example`:
```
ALLOWED_ORIGINS=https://app.yourdomain.com
```

### Rate limiting on auth endpoints

Install: add `"slowapi>=0.1.9"` to `pyproject.toml` + `uv sync`

**File:** `apps/api/app/main.py`:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**File:** `apps/api/app/api/v1/auth/router.py`:
```python
from apps.api.app.main import limiter

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, ...):
    ...
```

### Secure ENCRYPTION_KEY validation

**File:** `apps/api/app/core/config.py` — add validator:

```python
from pydantic import field_validator

@field_validator("ENCRYPTION_KEY")
@classmethod
def validate_encryption_key(cls, v: str) -> str:
    if v == "32_byte_base64_encryption_key_here":
        raise ValueError("ENCRYPTION_KEY must be set to a real 44-char Fernet key. Run: openssl rand -hex 32 | base64")
    if len(v) != 44:
        raise ValueError("ENCRYPTION_KEY must be a 44-character base64-encoded Fernet key")
    return v
```

---

## Step 2: Structured JSON Logging

Install: add `"python-json-logger>=2.0.7"` to `pyproject.toml` + `uv sync`

**File:** `apps/api/app/core/logger.py` — update:

```python
import logging
import sys
import os

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)

        if IS_PRODUCTION:
            from pythonjsonlogger import jsonlogger
            formatter = jsonlogger.JsonFormatter(
                fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        else:
            formatter = logging.Formatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
```

Add to `.env.example`:
```
ENVIRONMENT=production
```

---

## Step 3: Docker Files

### API Dockerfile — `apps/api/Dockerfile`

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files
COPY apps/api/pyproject.toml apps/api/uv.lock* ./

# Install dependencies
RUN uv sync --no-dev

# Copy application code
COPY apps/api/app ./app
COPY apps/ ./apps

# Create non-root user
RUN adduser --disabled-password --gecos "" fuse
USER fuse

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Worker Dockerfile — `apps/worker/Dockerfile`

```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system deps for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv

COPY apps/worker/pyproject.toml apps/worker/uv.lock* ./
COPY apps/api/pyproject.toml /app/apps/api/pyproject.toml

RUN uv sync --no-dev
RUN uv run playwright install chromium

COPY apps/ ./apps

RUN adduser --disabled-password --gecos "" fuse
USER fuse

ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "celery", "-A", "apps.api.app.core.celery", "worker", "--loglevel=info"]
```

### Web Dockerfile — `apps/web/Dockerfile`

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/web/ ./apps/web/

RUN pnpm --filter web build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf — `apps/web/nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://api:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Step 4: Production docker-compose

**File:** `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      - POSTGRES_SERVER=db
      - REDIS_HOST=redis
      - ENVIRONMENT=production
    env_file: .env
    depends_on: [db, redis]
    restart: unless-stopped

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    env_file: .env
    environment:
      - REDIS_HOST=redis
      - POSTGRES_SERVER=db
      - ENVIRONMENT=production
    depends_on: [db, redis]
    restart: unless-stopped

  beat:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    command: uv run celery -A apps.api.app.core.celery beat --loglevel=info
    env_file: .env
    depends_on: [db, redis]
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on: [api]
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Step 5: Environment Variable Checklist for Production

All these must be set (not defaults) in production `.env`:

```bash
# Required — no defaults
SECRET_KEY=<openssl rand -hex 32>
ENCRYPTION_KEY=<valid 44-char Fernet key>
POSTGRES_PASSWORD=<strong password, not 'postgres'>

# Required for features
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Required for frontend
VITE_API_BASE_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://app.yourdomain.com

# Required for environment
ENVIRONMENT=production
```

---

## Step 6: Pre-deployment Checklist

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm api \
  uv run alembic upgrade head

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl https://api.yourdomain.com/health
```

---

## Checklist

### Security
- [ ] `allow_origins=["*"]` replaced with `ALLOWED_ORIGINS` env var
- [ ] Rate limiting on `POST /auth/login` (10/minute) and `POST /auth/register` (5/minute)
- [ ] `ENCRYPTION_KEY` validator rejects default/placeholder value
- [ ] `SECRET_KEY` is not the default development value in production
- [ ] All passwords/secrets in `.env` (not committed to git)
- [ ] `.env` in `.gitignore` ✓ (already done)
- [ ] No `print()` or `console.log()` in production code

### Observability
- [ ] JSON logging in production (`ENVIRONMENT=production`)
- [ ] Request ID in every log line and response header
- [ ] `GET /health` returns DB + Redis status
- [ ] Celery worker logs include task IDs

### Docker
- [ ] `apps/api/Dockerfile` builds without errors
- [ ] `apps/worker/Dockerfile` builds with Playwright chromium
- [ ] `apps/web/Dockerfile` builds React app with nginx
- [ ] `apps/web/nginx.conf` proxies `/api` and `/ws` to API container
- [ ] `docker-compose.prod.yml` runs all 5 services
- [ ] `docker-compose.prod.yml` uses `restart: unless-stopped`
- [ ] Non-root user in all Dockerfiles

### Frontend
- [ ] `pnpm build` succeeds with no type errors
- [ ] `VITE_API_BASE_URL` set to production API URL
- [ ] WebSocket URL uses `wss://` (not `ws://`) in production

### Final validation
- [ ] `docker-compose -f docker-compose.prod.yml up -d` — all containers healthy
- [ ] `curl https://api.yourdomain.com/health` → `{"status":"ok",...}`
- [ ] Full user flow works on production URL (register, login, create workflow, run, view logs)
- [ ] `make test` passes locally

---

## Acceptance Criteria

```bash
# All containers running
docker-compose -f docker-compose.prod.yml ps
# → api, worker, beat, web, db, redis — all "running"

# Health check passes
curl https://api.yourdomain.com/health
# → {"status":"ok","checks":{"database":"ok","redis":"ok"}}

# Auth flow works
curl -X POST https://api.yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"prod@test.com","password":"password123"}'
# → {"id":"...","email":"prod@test.com"}

# Rate limit enforced (11th login attempt in 1 minute)
# → 429 Too Many Requests

# Unauthenticated access blocked
curl https://api.yourdomain.com/api/v1/workflows/
# → 401 Unauthorized
```

---

## Common Mistakes

- Forgetting `ENVIRONMENT=production` — JSON logging doesn't activate
- `VITE_API_BASE_URL` still pointing to localhost in prod build — frontend can't reach API
- WebSocket `ws://` vs `wss://` — browsers block insecure WS from HTTPS pages
- Not running `alembic upgrade head` before starting API — DB schema mismatch on first run
- Playwright chromium not installed in worker Docker image — browser nodes fail silently
- Rate limiter stores state in-process — won't work correctly with multiple API replicas. Use Redis-backed limiter for multi-instance: `Limiter(key_func=get_remote_address, storage_uri="redis://redis:6379")`
