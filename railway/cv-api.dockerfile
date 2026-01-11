# Railway - CV Processing API Service
# Port: 8001

FROM python:3.11-slim

WORKDIR /app

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies for PDF processing
RUN apt-get update && apt-get install -y \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy and install dependencies
COPY backend/cv_api/requirements.txt ./
RUN uv pip install --system -r requirements.txt

# Copy application code
COPY backend/cv_api/ .

# Railway uses PORT env variable
ENV PORT=8001
ENV CV_API_PORT=8001
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the CV API
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
