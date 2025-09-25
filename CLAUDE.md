# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development
- `npm run dev` - Start frontend development server (port 5173)
- `npm run build` - Build production frontend
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run test:quick` - Quick validation (lint + typecheck)

### Backend Development
- `npm run backend` - Start Python FastAPI backend (port 8000)
- `npm run backend:unified` - Start unified backend system
- `cd backend && uv run python start.py` - Direct backend startup
- `cd backend && uv run pytest` - Run backend tests
- `cd backend && uv run pytest tests/test_services.py -v` - Run specific test files

### Service-Specific Commands
- `npm run backend:cv` - Start CV processing API (port 8001)
- `npm run backend:agent` - Start Application Agent API (port 8002)
- `npm run dev:complete` - Start all services (frontend + all backends)
- `npm run dev:unified` - Start unified system (frontend + unified backend)
- `npm run dev:full` - Start main backend + frontend

### Database Operations
- `npm run db:setup` - Setup Supabase database
- `npm run db:local` - Start local Supabase (npx supabase start)
- `npm run db:reset` - Reset local database (npx supabase db reset)
- `npm run db:seed` - Seed database with test data
- `npm run test:system` - System integration tests

### Event-Driven System (Celery)
- `celery -A celery_app worker --loglevel=info` - Start Celery worker
- `celery -A celery_app worker --loglevel=info -Q job_discovery.high,job_discovery.low` - Start specific queue workers
- `celery -A celery_app flower` - Start Flower monitoring dashboard (port 5555)
- `redis-server` - Start Redis broker (required for Celery)

## Architecture Overview

### Event-Driven Microservices Pattern
The application uses an event-driven architecture with Celery for asynchronous task processing:

1. **Job Discovery Service** (Port 8000) - Core job search and matching
2. **CV Processing Service** (Port 8001) - AI-powered CV generation and analysis
3. **Application Agent Service** (Port 8002) - Automated form filling and application submission
4. **Event System** - Celery + Redis for async task processing and event publishing

### Technology Stack
- **Frontend**: React 18.3 + TypeScript 5.5 + Vite 5.4 + Tailwind CSS + shadcn/ui
- **Backend**: Python 3.11-3.12 + FastAPI 0.104 + uv package manager
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Message Broker**: Redis + Celery 5.3 for event-driven architecture
- **AI**: OpenAI GPT-4o/GPT-4o-mini, LangChain 0.1.0 for Application Agent
- **Automation**: Playwright 1.40 for browser automation

### Project Structure
```
├── src/                     # React/TypeScript frontend
│   ├── components/         # React components
│   ├── services/          # Frontend service layer
│   └── contexts/          # React contexts (AuthContext)
├── backend/               # Main Python backend
│   ├── src/
│   │   ├── job_automation/
│   │   │   ├── application/   # High-level services
│   │   │   ├── core/         # Domain logic (agents, models)
│   │   │   └── infrastructure/ # External dependencies
│   │   └── events/           # Event system (publisher, consumer, schemas)
│   ├── tasks/             # Celery task definitions
│   │   ├── job_discovery.py
│   │   ├── applications.py
│   │   ├── cv_generation.py
│   │   └── notifications.py
│   ├── celery_app.py      # Celery application configuration
│   └── celery_config.py   # Queue and exchange definitions
├── backend/cv_api/        # CV processing service
├── backend/application_agent/ # Application automation service
│   └── langchain_services/   # LangChain-based services
└── supabase/             # Database migrations
```

## Key Services and Endpoints

### Main Backend API (Port 8000)
- `POST /api/web-search-job-discovery` - Main job discovery endpoint
- `GET /api/system/status` - System health and status
- `POST /api/github-oauth/token` - GitHub OAuth token exchange

### CV Processing API (Port 8001)
- `POST /process` - Extract structured data from CV
- `POST /generate-job-specific-cv` - Create tailored CVs
- `POST /generate-cover-letter` - AI-generated cover letters
- `POST /extract-pdf-text` - PDF text extraction

### Application Agent API (Port 8002)
- `POST /api/apply/start` - Initiate automated application
- `GET /api/apply/status/{application_id}` - Real-time progress tracking
- `POST /api/apply/cv/upload` - Upload CV files with validation
- `GET /api/apply/history/{user_id}` - Application history

### Frontend Services (`src/services/`)
- `unifiedJobDiscoveryService.ts` - Main job discovery orchestrator
- `userService.ts` - User profile management
- `githubService.ts` - GitHub integration
- `cvGenerationService.ts` - CV generation
- `applicationService.ts` - Application Agent client
- `cvSelectionService.ts` - CV selection and upload

## Celery Task Queues

### Queue Configuration
- **job_discovery.high** - Priority job searches (priority=10)
- **job_discovery.low** - Background job searches (priority=1)
- **cv_generation.high** - Urgent CV generation
- **cv_generation.low** - Batch CV generation
- **applications.submit** - Application submissions
- **applications.track** - Application status tracking
- **notifications** - User notifications (fanout exchange)
- **analytics** - Data processing and reporting
- **maintenance** - System cleanup tasks

### Task Routing
Tasks are routed based on priority and type:
```python
# High priority job discovery
discover_jobs.apply_async(args=[user_id], queue='job_discovery.high', priority=10)

# Batch CV generation
generate_cvs.apply_async(args=[job_ids], queue='cv_generation.low', priority=1)
```

## Development Environment Setup

### Required Environment Variables
**Frontend (.env.local):**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_OPENAI_API_KEY=your_openai_key  # Optional
VITE_BYPASS_AUTH=true  # Development only
```

**Backend (backend/.env):**
```bash
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
API_HOST=0.0.0.0
API_PORT=8000
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

**Application Agent (backend/application_agent/.env):**
```bash
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Package Management
- **Frontend**: npm (package.json)
- **Backend**: uv with pyproject.toml (includes Celery, Redis, Kombu)
- **CV API**: pip with requirements.txt (fastapi, openai, pdfplumber)
- **Application Agent**: pip with requirements.txt (includes LangChain 0.1.0, playwright-stealth)

## Database Schema

Key tables and their purposes:
- `user_profiles` - User personal information
- `user_preferences` - Job search preferences
- `cv_assets` - Structured CV data (experience, education, skills)
- `github_repositories` - Connected GitHub repos
- `google_scholar_publications` - Academic publications
- `job_applications` - Application history and status
- `cv_generations` - Generated CVs for applications
- `uploaded_cvs` - User-uploaded CV files
- `application_attempts` - Application Agent tracking
- `form_templates` - Analyzed form patterns

## Enhanced Application Agent Architecture

The Application Agent uses enhanced services with LangChain integration:
- **EnhancedApplicationAgent** (`enhanced_application_agent.py`) - Main orchestrator with state management
- **EnhancedFormAnalysisService** (`enhanced_form_analysis_service.py`) - AI-powered form field detection using LangChain
- **EnhancedCVSelectionService** (`enhanced_cv_selection_service.py`) - Intelligent CV selection and validation
- **EnhancedBrowserFormFiller** (`enhanced_browser_form_filler.py`) - Playwright automation with AI guidance
- **EnhancedContentGenerationService** (`enhanced_content_generation_service.py`) - Dynamic content generation with LangChain
- **HumanBehavior** (`human_behavior.py`) - Bot detection evasion techniques
- **CVAPIClient** (`cv_api_client.py`) - Client for CV processing service

### LangChain Services Integration
Located in `backend/application_agent/langchain_services/`:
- Advanced prompt templates
- Chain composition for complex workflows
- Memory management for context retention
- Tool integration for form analysis

## Event-Driven Patterns

### Event Publishing
```python
from src.events.publisher import EventPublisher

publisher = EventPublisher()
await publisher.publish_job_discovered(user_id, job_data)
await publisher.publish_application_submitted(application_id, status)
```

### Event Consumption
```python
from src.events.consumer import EventConsumer

consumer = EventConsumer()
await consumer.subscribe_to_job_events(callback)
```

### Event Schemas
Located in `src/events/schemas.py`:
- JobDiscoveredEvent
- ApplicationSubmittedEvent
- CVGeneratedEvent
- NotificationEvent

## Testing Strategy
- `npm run test:quick` - Fast validation (lint + typecheck)
- `npm run test:system` - System integration tests (node supabase/test-system.js)
- `cd backend && uv run pytest` - Backend unit tests
- `cd backend && uv run pytest tests/test_github_integration.py -v` - Specific integration tests
- `cd backend && uv run pytest tests/test_scholar_integration.py -v` - Scholar integration tests
- `cd backend && uv run pytest tests/test_supabase_integration.py -v` - Database integration tests
- `cd backend && python test_bot_evasion.py` - Test anti-bot detection measures

## Common Patterns

### Error Handling
- Frontend services return `{ success: boolean, error?: string, data?: any }`
- Backend uses FastAPI exception handling with HTTP status codes
- Application Agent includes detailed error tracking and recovery
- Celery tasks implement retry logic with exponential backoff

### AI Integration
- OpenAI client centralized in each backend service
- GPT-4o for complex tasks, GPT-4o-mini for simpler operations
- LangChain for Application Agent's advanced AI features
- Structured output parsing with Pydantic models

### Authentication
- Supabase Auth with email/password and GitHub OAuth
- Development bypass with `VITE_BYPASS_AUTH=true`
- RLS policies enforce data security in production
- Service-to-service auth using service role keys

## Security & Bot Detection Evasion

### Application Agent Security Features
- **Human-like Behavior**: Random delays, natural mouse movements, typing simulation
- **Browser Fingerprinting**: Playwright-stealth integration for anti-detection
- **Rate Limiting**: Built-in delays between applications
- **Session Management**: Proper cookie and session handling
- **Error Recovery**: Graceful handling of captchas and security challenges

## Important Notes

### Service Independence
Each backend service can be developed and deployed independently while sharing the Supabase database. Services communicate via REST APIs and event streams, not direct database access between services.

### Real-time Features
- Application Agent uses polling for progress tracking
- Supabase real-time subscriptions available for live updates
- Celery provides async task status updates
- WebSocket-like experience without WebSocket complexity

### Performance Considerations
- Frontend uses Vite for fast HMR
- Backend uses uv for fast Python dependency management
- Database queries optimized with proper indexing
- Application Agent includes rate limiting and retry logic
- Celery workers scale horizontally for high throughput
- Redis caching for frequently accessed data