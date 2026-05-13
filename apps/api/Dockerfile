FROM python:3.12-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY apps/api/pyproject.toml ./apps/api/

# Install dependencies
RUN cd apps/api && uv sync --frozen

# Copy the rest of the application
COPY apps/api ./apps/api
COPY packages ./packages

# Set environment variables
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

CMD ["uv", "run", "--project", "apps/api", "uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
