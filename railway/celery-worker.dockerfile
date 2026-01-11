# Railway - Celery Worker Service
# Processes background tasks

FROM python:3.11-slim

WORKDIR /app

# Environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy project files
COPY backend/pyproject.toml ./
COPY backend/uv.lock* ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY backend/ .

# Create log directory
RUN mkdir -p /app/logs

# No port needed for worker - it connects to Redis
# Health check via Celery inspect
HEALTHCHECK --interval=60s --timeout=30s --start-period=10s --retries=3 \
    CMD celery -A celery_app inspect ping || exit 1

# Start Celery worker
# --concurrency=2 to limit resource usage on Railway
CMD ["sh", "-c", "uv run celery -A celery_app worker --loglevel=info --concurrency=2"]
