# Railway - Celery Beat Scheduler Service
# Runs scheduled/periodic tasks

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

# Create log and schedule directories
RUN mkdir -p /app/logs /app/celerybeat

# No port needed for beat scheduler
# Start Celery beat
# IMPORTANT: Only run ONE instance of beat scheduler
CMD ["sh", "-c", "uv run celery -A celery_app beat --loglevel=info --schedule=/app/celerybeat/celerybeat-schedule"]
