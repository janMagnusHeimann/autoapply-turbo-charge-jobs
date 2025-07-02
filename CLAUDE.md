# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development
- `npm run dev` - Start frontend development server (port 8080)
- `npm run build` - Build production frontend
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run frontend tests
- `npm run test:quick` - Quick lint and typecheck only

### Backend Development
- `npm run backend` - Start Python FastAPI backend (port 8000)
- `npm run backend:unified` - Start unified backend system
- `uv run python start.py` - Direct backend startup (from backend/)
- `uv run pytest` - Run backend tests (from backend/)
- `uv run pytest tests/test_services.py -v` - Run specific test files

### Full Stack Development
- `npm run dev:full` - Start both frontend and backend
- `npm run dev:unified` - Start unified system (frontend + unified backend)
- `docker-compose -f docker-compose.dev.yml up` - Start with Docker

### Database Operations
- `npm run db:setup` - Setup Supabase database
- `npm run db:local` - Start local Supabase
- `npm run db:reset` - Reset local database
- `npm run db:seed` - Seed database with test data

### Testing Commands
- `npm run test:system` - System integration tests
- `npm run test:quick` - Fast validation (lint + typecheck)
- `cd backend && uv run pytest tests/test_github_integration.py -v` - Test GitHub integration
- `cd backend && uv run pytest tests/test_supabase_integration.py -v` - Test Supabase integration

## Architecture Overview

### Project Structure
```
├── src/                     # React/TypeScript frontend
│   ├── components/         # React components (UI, dashboard, auth)
│   ├── services/          # Frontend service layer
│   ├── contexts/          # React contexts (AuthContext)
│   └── integrations/      # Supabase client configuration
├── backend/               # Python FastAPI backend
│   └── src/job_automation/
│       ├── application/   # High-level services
│       ├── core/         # Domain logic (agents, models, tools)
│       └── infrastructure/ # External dependencies (API, clients)
├── supabase/             # Database migrations and setup
└── docs/                 # Project documentation
```

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend**: Python 3.11+ + FastAPI + Pydantic + uv package manager
- **Database**: Supabase (PostgreSQL) with real-time features
- **AI Integration**: OpenAI API for job discovery and matching
- **Authentication**: Supabase Auth with GitHub OAuth
- **Deployment**: Docker containers with development/production configs

### Key Services and Architecture

#### Frontend Services (`src/services/`)
- `unifiedJobDiscoveryService.ts` - Main job discovery orchestrator
- `userService.ts` - User profile and preferences management
- `githubService.ts` - GitHub integration and repository analysis
- `googleScholarService.ts` - Academic publication integration
- `cvGenerationService.ts` - Dynamic CV/resume generation
- `supabaseService.ts` - Database operations wrapper

#### Backend Architecture (`backend/src/job_automation/`)
- **Application Layer**: Web search job service, orchestrators
- **Core Domain**: Agents (web search, job matching), models (user preferences, job listings)
- **Infrastructure**: OpenAI client, Supabase client, browser automation, API routes

#### Authentication System
- **Production**: Supabase Auth with email/password and GitHub OAuth
- **Development**: Bypass mode with `VITE_BYPASS_AUTH=true`
- **Context**: `AuthContext.tsx` manages user state, profile, and preferences

### AI Agent System
The project uses a multi-agent architecture for job automation:
- **Web Search Agent**: Uses OpenAI to discover jobs through web search
- **Job Matching Agent**: Matches discovered jobs to user preferences
- **Career Discovery Agent**: Finds company career pages
- **Browser Automation**: Playwright for dynamic content (currently disabled in favor of web search)

### Development Environment Setup

#### Required Environment Variables
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
```

#### Package Management
- **Frontend**: npm (Node.js 18+)
- **Backend**: uv (fast Python package manager)
- **Install all**: `npm run install:deps`

### Database Schema (Supabase)
Key tables and relationships:
- `user_profiles` - User personal information and settings
- `user_preferences` - Job search preferences and criteria
- `github_repositories` - Connected GitHub repos with descriptions
- `google_scholar_publications` - Academic publications
- `job_applications` - Application history and status
- `cv_generations` - Generated CVs for different applications

### API Endpoints

#### Backend API (Port 8000)
- `GET /health` - System health check
- `POST /api/web-search-job-discovery` - Main job discovery endpoint
- `GET /api/system/status` - Detailed system status
- `POST /api/github-oauth/token` - GitHub OAuth token exchange
- `GET /docs` - FastAPI auto-generated documentation

#### Key Integration Points
- OpenAI API for job search and matching
- GitHub API for repository analysis
- Google Scholar for publication scraping
- Supabase for all data persistence

### Testing Strategy
- **Mock Tests**: Structure validation, always passing
- **Integration Tests**: Real API calls with credentials
- **Docker Tests**: Container health and networking
- **CI/CD**: GitHub Actions with 3-tier testing approach

### Common Patterns

#### Error Handling
- Frontend services return `{ success: boolean, error?: string }` patterns
- Backend uses FastAPI exception handling with proper HTTP status codes
- Async operations use try/catch with comprehensive logging

#### State Management
- React Context for authentication and user data
- Service classes for API interactions
- Local state with React hooks for component-specific data

#### TypeScript Usage
- Strict type checking enabled
- Interface definitions for all API responses
- Proper typing for Supabase database operations

### Development Workflow

#### Feature Development
1. Create feature branch from `main`
2. Run `npm run dev:unified` for full-stack development
3. Use `npm run test:quick` for fast validation
4. Test with real data using integration tests when needed
5. Create PR with proper CI/CD validation

#### Debugging
- Frontend: Browser DevTools + React DevTools
- Backend: FastAPI `/docs` for API testing
- Database: Supabase Studio dashboard
- Logs: Check browser console and terminal output

### Performance Considerations
- Frontend uses Vite for fast development builds
- Backend uses uv for fast Python dependency management
- Database queries optimized with proper indexing
- API responses cached where appropriate
- Docker multi-stage builds for production optimization

### Security Notes
- All API keys stored in environment variables
- Supabase Row Level Security (RLS) policies enabled
- GitHub tokens encrypted in database
- Input validation on all API endpoints
- CORS properly configured for development/production
