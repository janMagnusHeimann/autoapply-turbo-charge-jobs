FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies and browser requirements
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    curl \
    git \
    xvfb \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy project files
COPY pyproject.toml ./
COPY uv.lock* ./

# Install dependencies with uv
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs

# Set display for headless browser
ENV DISPLAY=:99

# Install Playwright browsers with error handling
RUN python -m playwright install-deps 2>/dev/null || echo "System deps install failed, will retry at runtime" && \
    python -m playwright install chromium 2>/dev/null || echo "Browser install failed, will retry at runtime"

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Production startup with simplified backend
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & uv run python start.py"]