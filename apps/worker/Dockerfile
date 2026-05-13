FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY apps/worker/pyproject.toml ./apps/worker/

# Install dependencies
RUN cd apps/worker && uv sync --frozen

# Install playwright browsers
RUN cd apps/worker && uv run playwright install chromium

# Copy the rest of the application
COPY apps/worker ./apps/worker
COPY packages ./packages

# Set environment variables
ENV PYTHONPATH=/app

CMD ["uv", "run", "--project", "apps/worker", "celery", "-A", "apps.worker.app.jobs.tasks", "worker", "--loglevel=info"]
