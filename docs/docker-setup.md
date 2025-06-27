# Docker Configuration Guide

This project uses Docker Compose to orchestrate the application stack consisting of a React frontend and FastAPI backend.

## Available Configurations

### Production (`docker-compose.yml`)
- **Purpose**: Full production deployment with all features enabled
- **Command**: `docker-compose up --build`
- **Features**:
  - Complete LLM provider support (OpenAI, Gemini)
  - Browser automation with Playwright
  - Multi-agent orchestration system
  - Health checks and auto-restart
  - Comprehensive logging and metrics
  - Performance optimizations

### Development (`docker-compose.dev.yml`)
- **Purpose**: Local development with hot reload
- **Command**: `docker-compose -f docker-compose.dev.yml up --build`
- **Features**:
  - Volume mounts for live code changes
  - Debug logging enabled
  - Development build targets
  - Simplified configuration for faster startup

## Services

### Frontend
- **Port**: 8087
- **Technology**: React + Vite
- **Environment**: Connects to backend at localhost:8000

### Backend
- **Port**: 8000
- **Technology**: FastAPI + Python (using uv package manager)
- **Features**: 
  - Multi-agent job automation system
  - GitHub OAuth integration
  - Google Scholar scraping
  - Browser automation with Playwright
  - Job discovery and matching

## Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Set required variables in `.env`:
   - `OPENAI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GITHUB_CLIENT_ID` (for GitHub OAuth)
   - `GITHUB_CLIENT_SECRET` (for GitHub OAuth)

3. Run development environment:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. Access the application:
   - Frontend: http://localhost:8087
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Environment Variables

Key variables for both configurations:
- `OPENAI_API_KEY`: Required for AI functionality
- `VITE_SUPABASE_URL`: Database connection
- `VITE_SUPABASE_ANON_KEY`: Database authentication
- `LOG_LEVEL`: Logging verbosity (INFO, DEBUG)
- `DEMO_MODE`: Enable demo features

Production includes additional variables for advanced features like browser automation, agent configuration, and performance tuning.

## Package Management

The backend uses **uv** (Ultra-fast Python package installer and resolver) instead of pip for better performance and reproducibility:

- **Lock file**: `backend/uv.lock` ensures reproducible builds
- **Configuration**: `backend/pyproject.toml` defines dependencies
- **Python version**: Constrained to 3.11-3.12 for compatibility
- **Virtual environment**: Automatically managed by uv in Docker containers

## API Endpoints

### Core Job Discovery
- `POST /api/job-discovery` - Single company job discovery
- `POST /api/multi-company-job-discovery` - Multi-company batch processing
- `GET /api/system/status` - System health and component status

### GitHub Integration
- `POST /api/github-oauth/token` - Exchange OAuth code for access token
- Supports GitHub repository integration and user authentication

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /docs` - Interactive API documentation (Swagger UI)

## Troubleshooting

### Backend Issues
1. **Module not found errors**: Rebuild containers with `--build` flag
2. **Port conflicts**: Ensure ports 8000 and 8087 are available
3. **GitHub OAuth 404**: Verify `GITHUB_CLIENT_SECRET` is set in environment

### Container Issues
```bash
# Stop all containers
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs backend-dev
```