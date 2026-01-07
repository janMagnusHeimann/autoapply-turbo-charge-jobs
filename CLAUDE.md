# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoApply is an AI-powered job application automation system that discovers job listings, generates tailored CVs, and tracks applications with GitHub/Google Scholar integration.

**Tech Stack:**
- Frontend: React 18.3 + TypeScript + Vite + Tailwind CSS + Radix UI
- Backend: Python 3.11+ (FastAPI + Uvicorn)
- Database: Supabase (PostgreSQL)
- LLM: OpenAI (GPT-4, GPT-5)
- Browser Automation: Playwright
- Task Queue: Celery + Redis
- Deployment: Docker Compose (local), Terraform + GCP Cloud Run (production), Vercel (frontend)

## Development Commands

### Frontend & Full Stack
```bash
npm run dev              # Vite dev server (frontend only)
npm run dev:full         # Backend + frontend
npm run dev:complete     # All backends (job discovery, CV API, agent) + frontend
npm run build            # Production build
npm run lint             # ESLint checks
npm run typecheck        # TypeScript validation
npm run test:quick       # lint + typecheck
```

### Backend Services
```bash
npm run backend          # Job discovery API (port 8000)
npm run backend:cv       # CV processing API (port 8001)
npm run backend:agent    # Application agent API (port 8002)
```

### Database
```bash
npm run db:setup         # Initialize Supabase
npm run db:local         # Start local Supabase instance
npm run db:reset         # Reset database schema
npm run db:seed          # Populate test data
npm run test:system      # Supabase smoke tests
```

### Python Backend
```bash
cd backend && uv run pytest              # Run tests
cd backend && uv run python start.py     # Start main API
cd backend && python -m playwright install  # Install browsers
```

## Architecture

### Layered Backend Architecture

The backend follows a clean layered architecture inspired by Domain-Driven Design:

```
backend/src/job_automation/
├── application/           # Business logic layer (orchestration)
│   └── web_search_job_service.py  # Main job discovery service
├── core/                  # Domain layer (business rules, models, agents)
│   ├── agents/            # AI agent implementations (BaseAgent, WebSearchJobAgent)
│   ├── models/            # Pydantic domain models (JobListing, UserPreferences)
│   ├── utils/             # Domain utilities
│   └── prompts/           # LLM prompt templates
├── infrastructure/        # External integrations layer
│   ├── api/               # FastAPI routes & startup (main.py)
│   ├── clients/           # External API clients (OpenAI, Supabase, web scraper)
│   ├── browser/           # Playwright automation
│   └── monitoring/        # Logging & health checks
└── config.py              # Centralized configuration (dataclass-based)
```

**Key Pattern:** Dependencies flow inward (infrastructure → application → core). Core domain logic never depends on infrastructure.

### Three-Service Microservices Pattern

The application runs as three independent FastAPI services:

1. **Job Discovery API** (Port 8000, `backend/start.py`)
   - Web search, company management, GitHub OAuth
   - Main endpoints: `/api/web-search-job-discovery`, `/api/companies`

2. **CV Processing API** (Port 8001, `backend/cv_api/main.py`)
   - CV generation, PDF processing, backup management
   - Endpoint: `/api/cv/generate`

3. **Application Agent** (Port 8002, `backend/application_agent/main.py`)
   - Automated job application submission with browser automation
   - Uses Playwright with human behavior emulation (anti-bot evasion)

**Frontend Coordination:** `APIConfigService` (`src/config/apiConfig.ts`) manages routing to all three services via environment-based configuration.

### Frontend Structure

```
src/
├── main.tsx                  # React root (entry point)
├── App.tsx                   # Router + providers (React Query, Auth, Radix UI)
├── pages/                    # Route components
│   ├── Index.tsx             # Main dashboard with view routing
│   ├── Auth.tsx              # Authentication page
│   └── GitHubCallback.tsx    # OAuth callback handler
├── components/
│   ├── dashboard/            # 9 dashboard views (DashboardHome, CompanyDirectory, etc.)
│   ├── ui/                   # 50+ Radix UI components (reusable design system)
│   ├── application/          # Job application workflow components
│   └── auth/                 # Auth components (ProtectedRoute)
├── services/                 # API client layer (service class pattern)
│   ├── userService.ts
│   ├── cvGenerationService.ts
│   ├── githubService.ts
│   ├── googleScholarService.ts
│   ├── jobAnalysisService.ts
│   └── unifiedJobDiscoveryService.ts
├── contexts/                 # React Context providers
│   └── AuthContext.tsx       # Auth state management with development bypass mode
├── integrations/supabase/    # Supabase client (anon key only, RLS enforced)
└── types/                    # TypeScript type definitions
```

### Data Flow

**Job Application Workflow:**
1. User authenticates via Supabase or GitHub OAuth
2. Connects GitHub account → `githubService.ts` analyzes repositories
3. Sets job preferences → stored in Supabase with RLS policies
4. `UnifiedJobDiscoveryService` → Backend `/api/web-search-job-discovery`
5. `WebSearchJobService` → `WebSearchJobAgent` → OpenAI GPT-5 web search
6. Results stored in Supabase
7. `CVGenerationService` → CV API generates tailored CV using OpenAI GPT-4
8. `EnhancedApplicationAgent` automates form submission via Playwright
9. Application tracking in Supabase with status updates

### Event-Driven Architecture (Celery + Redis)

**Task Queues:** (`backend/celery_config.py`)
- `job_discovery.high`, `job_discovery.normal`, `job_discovery.batch`
- `cv_generation.urgent`, `cv_generation.normal`
- `applications.linkedin`, `applications.indeed`, `applications.greenhouse`, `applications.lever`, `applications.generic`
- `notifications` (fanout pattern)

**Configuration:**
- Broker: `redis://localhost:6379/0`
- Result backend: `redis://localhost:6379/1`
- Tasks defined in `backend/tasks/` (job_discovery.py, cv_generation.py, applications.py, notifications.py)

### Web Search-First Architecture

The system has transitioned from complex multi-agent orchestration to a simplified web search approach:
- **Current:** `WebSearchJobService` → OpenAI GPT-5 web search capabilities
- **Legacy:** Playwright browser automation code remains but is disabled by default
- Configuration: `openai_model = "gpt-5"` in `config.py`

## Code Quality Standards

**Frontend:**
- Use Prettier for formatting
- TypeScript required (but `noImplicitAny: false`, `strictNullChecks: false` for rapid development)
- React Hooks for state management
- Service layer pattern for API communication
- Tailwind CSS + Radix UI for component consistency
- Zod for runtime validation

**Backend:**
- Use Black for Python formatting
- Maintain >80% test coverage
- Async/await with FastAPI
- Pydantic for request/response validation
- LLM provider abstraction via factory pattern (`llm_factory.py`)

## Testing Strategy

**3-Tier Testing Approach:**
1. **Mock Tests** - Structure validation (fast, no external dependencies)
2. **Integration Tests** - Functionality validation (backend/tests/, uses mocks)
3. **Real API Tests** - Production readiness (requires API keys, GitHub Actions only)

**Test Files:**
- `backend/tests/test_services.py` - Service integration tests
- `backend/tests/test_github_integration.py` - GitHub OAuth tests
- `backend/tests/test_scholar_integration.py` - Google Scholar integration
- `backend/tests/test_supabase_integration.py` - Database tests

**Run tests:**
```bash
cd backend && uv run pytest              # All backend tests
cd backend && pytest --cov=src/job_automation tests/  # With coverage
```

## Security Requirements

**Database Security:**
- RLS (Row Level Security) enabled on all user data tables
- Service role key used backend-only (`backend/.env`)
- Frontend uses anon key only with RLS policies
- User-scoped policies for sensitive data

**Supabase Configuration:**
- OTP expiry: 30 minutes or less
- HaveIBeenPwned database checks enabled
- Function security: search path vulnerabilities mitigated

**API Keys:**
- Use environment variables for all secrets
- Never log API responses
- `.env` files in root (frontend) and `backend/` directory
- Required: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Development Patterns

### Backend: Singleton Pattern for External Clients

```python
# backend/src/job_automation/infrastructure/clients/supabase_client.py
supabase_client = SupabaseClient()  # Singleton instance

def get_supabase_client():
    return supabase_client
```

### Frontend: Service Class Pattern

```typescript
// src/services/userService.ts
export class UserService {
  static async getUserProfile(userId: string): Promise<UserProfile>
  static async getUserPreferences(userId: string): Promise<UserPreferences>
  static async initializeUserData(user: User): Promise<void>
}

// Usage
const profile = await UserService.getUserProfile(userId);
```

### Context + Custom Hooks Pattern

```typescript
// src/contexts/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

### Development Bypass Authentication

**Purpose:** Test without auth flow while maintaining real database access

```typescript
// Set in .env.local
VITE_BYPASS_AUTH=true

// Hardcoded user ID for bypass mode
const targetUserId = 'ebbae036-5dbf-4571-a29d-2318e1ce0eed';
```

### Configuration Management

**Backend:** Dataclass-based configuration with environment variable loading from `.env`

```python
# backend/src/job_automation/config.py
@dataclass
class Config:
    openai_api_key: str
    supabase_url: str
    demo_mode: bool = False
    openai_model: str = "gpt-5"
```

**Frontend:** Vite environment variables (`import.meta.env`) centralized in `apiConfig.ts`

## Important Files and Locations

**Entry Points:**
- Frontend: `src/main.tsx` → `src/App.tsx` → `src/pages/Index.tsx`
- Backend: `backend/start.py` → `backend/src/job_automation/infrastructure/api/main.py`
- CV API: `backend/cv_api/main.py`
- Application Agent: `backend/application_agent/main.py`

**Configuration:**
- `.env.local` - Frontend environment variables
- `backend/.env` - Backend environment variables
- `backend/src/job_automation/config.py` - Centralized backend config

**Database:**
- `supabase/migrations/` - Database schema migrations
- RLS policies defined in migration files

**Key Models:**
- `backend/src/job_automation/core/models/job_listing.py` - JobListing, RankedJob, JobSearchResult
- `backend/src/job_automation/core/models/user_preferences.py` - UserPreferences with enums

**API Routes:**
- Backend API: `backend/src/job_automation/infrastructure/api/main.py`
- CV API: `backend/cv_api/main.py`
- Application Agent: `backend/application_agent/main.py`

## Documentation References

- `README.md` - Main project documentation
- `docs/project-setup.md` - Multi-agent system architecture
- `docs/ci-cd-guide.md` - Testing & deployment pipeline
- `docs/SECURITY_RECOMMENDATIONS.md` - Security guidelines
- `AGENTS.md` - AI agent documentation

## Common Development Tasks

**Adding a new API endpoint:**
1. Add route to `backend/src/job_automation/infrastructure/api/main.py`
2. Create Pydantic request/response models
3. Implement service logic in `application/` layer
4. Add frontend service method in `src/services/`

**Creating a new UI component:**
1. Check if Radix UI has the component in `src/components/ui/`
2. If custom, create in `src/components/` following existing patterns
3. Use Tailwind CSS classes for styling
4. Export and import in dashboard views

**Database schema changes:**
1. Create migration in `supabase/migrations/`
2. Update RLS policies as needed
3. Test with `npm run db:reset`
4. Update Pydantic models in `backend/src/job_automation/core/models/`

**Adding environment variables:**
1. Add to `.env.example` and `backend/.env.example`
2. Update config files (`config.py` or `apiConfig.ts`)
3. Document in README.md configuration section
