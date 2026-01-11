# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

**Frontend (Vite + React + TypeScript):**
- `npm run dev` - Start Vite dev server on port 8080
- `npm run build` - Production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - TypeScript type checking
- `npm run test:quick` - Run lint + typecheck together

**Backend (Python + FastAPI + uv):**
- `npm run backend` - Start main FastAPI server via `backend/start.py`
- `npm run backend:cv` - Start CV microservice (`backend/cv_api/main.py`)
- `npm run backend:agent` - Start application agent (`backend/application_agent/main.py`)
- `cd backend && uv run pytest` - Run backend tests

**Combined Development:**
- `npm run dev:full` - Backend + frontend together
- `npm run dev:complete` - All services (backend, cv_api, agent, frontend)

**Database (Supabase):**
- `npm run db:local` - Start local Supabase
- `npm run db:reset` - Reset database with migrations
- `npm run test:system` - Supabase integration smoke tests

**Dependencies:**
- `npm run install:deps` - Install both npm packages and backend Python deps via uv

## Architecture

### Frontend (`src/`)
React SPA with React Router. Main entry in `App.tsx`, pages in `src/pages/`, dashboard components in `src/components/dashboard/`. UI primitives use shadcn/ui pattern in `src/components/ui/`. Path alias `@` maps to `src/`.

### Backend (`backend/`)
Three separate Python services:

1. **Main API** (`backend/src/job_automation/`) - FastAPI server for job automation
   - `core/agents/` - AI agent implementations
   - `core/models/` - Data models
   - `application/` - High-level services
   - `infrastructure/` - External integrations (monitoring, vector DB, APIs)

2. **CV API** (`backend/cv_api/`) - CV generation microservice
   - `main.py` - FastAPI endpoints
   - `cv_processor.py` - PDF generation logic

3. **Application Agent** (`backend/application_agent/`) - Autonomous job application agent
   - `enhanced_application_agent.py` - Main agent orchestration
   - `enhanced_browser_form_filler.py` - Playwright-based form filling
   - `enhanced_cv_selection_service.py` - CV matching logic
   - `langchain_services/` - LangChain integrations for structured LLM outputs

### Event-Driven Architecture
Celery + Redis for async tasks. Config in `backend/celery_config.py`, tasks in `backend/tasks/`.

### Database
Supabase (PostgreSQL). Migrations in `supabase/migrations/`, seed data in `supabase/seed.sql`. Setup script: `supabase/setup-database.js`.

## Environment Files
- `.env.local` - Frontend Vite env vars (VITE_ prefix)
- `backend/.env` - Main backend config
- `backend/application_agent/.env` - Agent-specific config
- `backend/cv_api/.env` - CV service config

## Code Style
- Frontend: ESLint with typescript-eslint, 2-space indent, Tailwind CSS
- Backend: Python 3.11+, typed functions, snake_case modules, PascalCase classes
- Components: PascalCase files, hooks prefixed with `use` in `src/hooks/`
