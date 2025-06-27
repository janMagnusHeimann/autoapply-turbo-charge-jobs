# 🐳 Docker Setup Overview

## Current Docker Configuration

The project uses Docker Compose to orchestrate multiple services. There are **4 different Docker configurations** for different use cases:

### 📋 Available Docker Configurations

| File | Purpose | Services | Use Case |
|------|---------|----------|----------|
| `docker-compose.yml` | **Production** | Frontend + Backend | Production 2-service setup |
| `docker-compose.dev.yml` | **Development** | Frontend + Backend | Development stack with hot reload |
| `docker-compose.simple.yml` | **Simplified Backend** | Frontend + Simplified Backend | Uses simplified backend only |
| `docker-compose.test.yml` | **Testing** | Frontend + Backend | Testing with mock API keys |

## 🚀 Quick Start Commands

### 1. Production Setup (Recommended for Testing)
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Development Setup (With Database)
```bash
# Build and start development stack
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### 3. Simplified Backend Setup (Recommended)
```bash
# Build and start simplified backend stack
docker-compose -f docker-compose.simple.yml up --build -d

# View logs
docker-compose -f docker-compose.simple.yml logs -f

# Stop services
docker-compose -f docker-compose.simple.yml down
```

### 4. Testing Setup
```bash
# Build and start testing stack (with mock keys)
docker-compose -f docker-compose.test.yml up --build -d

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Stop services
docker-compose -f docker-compose.test.yml down
```

## 🏗️ Service Architecture

### Frontend Service
- **Port**: 8087
- **Framework**: React + Vite
- **Build**: Multi-stage Docker build
- **Environment**: Supabase, GitHub OAuth, API endpoints

### Backend Service
- **Port**: 8000
- **Framework**: FastAPI + Python 3.11
- **Features**: Simplified OODA agent architecture, browser automation, job discovery
- **Dependencies**: Playwright, OpenAI, BeautifulSoup, aiohttp

### Database & Storage
- **Database**: Supabase (cloud-hosted PostgreSQL)
- **Authentication**: Supabase Auth  
- **File Storage**: Supabase Storage

## 🔧 Essential Commands

### Building and Running
```bash
# Build all services (force rebuild)
docker-compose build --no-cache

# Start services in background
docker-compose up -d

# Start services with real-time logs
docker-compose up

# Rebuild and start specific service
docker-compose up --build backend

# Scale a service (multiple instances)
docker-compose up --scale backend=2
```

### Monitoring and Logs
```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100

# View logs since specific time
docker-compose logs --since="2024-01-01T00:00:00"
```

### Container Management
```bash
# List running containers
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all

# Restart specific service
docker-compose restart backend

# Execute command in running container
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Development Commands
```bash
# Hot reload development (with volumes)
docker-compose -f docker-compose.dev.yml up

# Test Supabase connection
docker-compose exec backend python -c "from supabase import create_client; print('Supabase connected')"

# View backend logs for database operations
docker-compose logs backend | grep -i supabase
```

## 🔍 Health Checks and Debugging

### Check Service Health
```bash
# Backend health check
curl http://localhost:8000/health

# Frontend health check
curl http://localhost:8087

# Check all container status
docker-compose ps
```

### Debug Container Issues
```bash
# Enter container shell
docker-compose exec backend bash
docker-compose exec frontend sh

# Check container resources
docker stats

# View container details
docker inspect autoapply-backend-1

# Check container logs for errors
docker-compose logs backend | grep -i error
```

### Network Debugging
```bash
# List Docker networks
docker network ls

# Inspect app network
docker network inspect autoapply_app-network

# Test connectivity between services
docker-compose exec frontend ping backend
docker-compose exec backend ping frontend
```

## 📊 Environment Variables

### Required Environment Variables
Create a `.env` file in the root directory:

```bash
# API Keys
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_GITHUB_CLIENT_SECRET=your-github-client-secret

# Optional
DEMO_MODE=false
VITE_BYPASS_AUTH=true
```

### Environment Variable Validation
```bash
# Check if required env vars are set
docker-compose config

# Validate environment in container
docker-compose exec backend env | grep -E "(OPENAI|ANTHROPIC)"
```

## 🔄 Common Workflows

### 1. Fresh Development Setup
```bash
# Clone repository
git clone <repository-url>
cd autoapply-turbo-charge-jobs

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start development environment
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### 2. Production Deployment
```bash
# Build production images
docker-compose build --no-cache

# Start production services
docker-compose up -d

# Verify deployment
curl http://localhost:8000/health
curl http://localhost:8087
```

### 3. Update and Redeploy
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Check deployment
docker-compose logs -f
```

### 4. Debugging Production Issues
```bash
# Check all services
docker-compose ps

# View recent logs
docker-compose logs --tail=50

# Enter backend container
docker-compose exec backend bash

# Check backend logs
docker-compose logs backend | tail -100

# Test API directly
curl -X POST http://localhost:8000/api/multi-agent-job-discovery \
  -H "Content-Type: application/json" \
  -d '{"company_name": "GitHub", "company_website": "https://github.com"}'
```

## 🗂️ File Structure

```
├── docker-compose.yml              # Production setup
├── docker-compose.dev.yml         # Development with DB
├── docker-compose.simple.yml      # Simplified production
├── Dockerfile                     # Frontend container
├── Dockerfile.dev                 # Frontend development
├── backend/
│   ├── Dockerfile                 # Backend container
│   ├── Dockerfile.dev             # Backend development
│   └── requirements.txt           # Python dependencies
└── .env                          # Environment variables
```

## ⚠️ Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Find process using port
lsof -i :8000
lsof -i :8087

# Kill process
kill -9 <PID>

# Or use different ports
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

#### Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Remove all containers and images
docker-compose down --rmi all
docker system prune -a --volumes

# Rebuild from scratch
docker-compose build --no-cache
```

#### Container Won't Start
```bash
# Check container logs
docker-compose logs <service-name>

# Check container status
docker-compose ps

# Enter container to debug
docker-compose run <service-name> bash
```

#### Network Issues
```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up

# Check network connectivity
docker-compose exec frontend ping backend
```

## 🔧 Advanced Configuration

### Custom Docker Compose Override
Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'
services:
  backend:
    environment:
      - DEBUG=true
      - LOG_LEVEL=DEBUG
    volumes:
      - ./backend:/app
  frontend:
    environment:
      - VITE_DEBUG=true
```

### Performance Tuning
```bash
# Allocate more memory to Docker
# Docker Desktop -> Settings -> Resources -> Memory: 8GB

# Increase container resources
docker-compose up --scale backend=2
```

### Production Optimization
```bash
# Use production build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

# Enable health checks
docker-compose ps
# Should show "healthy" status
```

## 📱 Monitoring and Metrics

### Container Resource Usage
```bash
# Real-time stats
docker stats

# Detailed container info
docker system df
docker system events
```

### Log Management
```bash
# Configure log rotation
docker-compose logs --tail=1000 > app.log

# Clear container logs
docker-compose down
docker system prune
```

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start all services in background |
| `docker-compose logs -f` | Follow all logs |
| `docker-compose down` | Stop all services |
| `docker-compose ps` | List running services |
| `docker-compose exec <service> bash` | Enter container shell |
| `docker-compose restart <service>` | Restart specific service |
| `docker-compose build --no-cache` | Force rebuild all images |

---

## 🆘 Need Help?

1. **Check logs first**: `docker-compose logs -f`
2. **Verify environment**: `docker-compose config`
3. **Test connectivity**: `curl http://localhost:8000/health`
4. **Clean slate**: `docker-compose down && docker system prune -a`

The multi-agent job discovery system is now containerized and ready to use! 🚀