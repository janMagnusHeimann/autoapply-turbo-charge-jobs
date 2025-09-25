# AutoApply Job Automation System - Architecture Summary

## 🎯 Executive Overview

AutoApply is an **AI-powered job automation platform** that helps users discover jobs, generate tailored CVs, and automatically submit applications. The system uses a **microservices architecture** with **event-driven processing** to handle complex, time-consuming tasks asynchronously.

### Core Capabilities
- 🔍 **Intelligent Job Discovery** - Searches multiple job boards simultaneously
- 📄 **AI-Powered CV Generation** - Creates tailored CVs for each job posting
- 🤖 **Automated Application Submission** - Fills and submits job applications automatically
- 🛡️ **Anti-Bot Detection Evasion** - Mimics human behavior to avoid detection

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTOAPPLY JOB AUTOMATION SYSTEM                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────── FRONTEND ──────────────────────────────────┐
│                                                                             │
│  React 18.3 + TypeScript + Vite (Port 5173)                               │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │   UI Components      │  │    Services       │  │    Contexts       │   │
│  │  - ApplicationModal  │  │ - Job Discovery   │  │  - AuthContext    │   │
│  │  - MyJobs Dashboard  │  │ - CV Generation   │  │  - UserContext    │   │
│  │  - Profile Setup     │  │ - Application     │  │                   │   │
│  └─────────────────────┘  └──────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                              REST API Calls
                                      ▼
┌──────────────────────────── BACKEND SERVICES ─────────────────────────────┐
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │              MAIN BACKEND API (Port 8000)                      │      │
│  │  FastAPI + Python 3.11+ + uv package manager                   │      │
│  │  - Job discovery orchestration                                 │      │
│  │  - User management & authentication                            │      │
│  │  - GitHub integration                                          │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │              CV PROCESSING API (Port 8001)                     │      │
│  │  FastAPI + OpenAI GPT-4 + pdfplumber                          │      │
│  │  - Extract data from uploaded CVs                             │      │
│  │  - Generate job-specific CVs                                  │      │
│  │  - Create cover letters                                       │      │
│  └────────────────────────────────────────────────────────────────┘      │
│                                                                            │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │         APPLICATION AGENT API (Port 8002)                      │      │
│  │  FastAPI + LangChain + Playwright                              │      │
│  │  - Automated form filling with AI                             │      │
│  │  - Browser automation with anti-detection                     │      │
│  │  - Real-time application tracking                             │      │
│  └────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                            Async Task Publishing
                                      ▼
┌────────────────────── EVENT-DRIVEN SYSTEM ────────────────────────────────┐
│                                                                            │
│  ┌─────────────────┐        ┌──────────────────────────────────┐        │
│  │   Redis Broker  │◄───────│        Celery Workers           │        │
│  │   (Port 6379)   │        │  Processing background tasks     │        │
│  └─────────────────┘        └──────────────────────────────────┘        │
│           │                                                               │
│           ▼                                                               │
│  ┌─────────────────┐                                                     │
│  │  Flower Monitor │  Web UI for monitoring Celery tasks                 │
│  │   (Port 5555)   │                                                     │
│  └─────────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────── DATA LAYER ──────────────────────────────────────┐
│                                                                             │
│              Supabase (PostgreSQL) with Row Level Security                 │
│              - User data, CVs, job applications, preferences               │
│              - Secure multi-tenant isolation                               │
│              - Real-time subscriptions                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 How Redis & Celery Work (Simple Explanation)

### The Problem
When a user clicks "Find Jobs", the system needs to:
1. Search multiple job sites (takes 10-30 seconds)
2. Analyze each job with AI (more time)
3. Generate custom CVs (even more time)

**Without Redis/Celery**: User's browser freezes for minutes! 😱
**With Redis/Celery**: User gets instant feedback and can browse while work happens in background! 🚀

### Restaurant Analogy 🍔
Think of Redis as the **order ticket system** in a restaurant:

1. **Customer (User)** places an order at the counter
2. **Cashier (Web App)** writes it on a ticket and puts it on the board (Redis)
3. **Customer** gets a number and sits down (doesn't wait at counter)
4. **Kitchen Staff (Celery Workers)** grab tickets from the board and cook
5. **When ready**, customer is notified to pick up their order

### In Code Terms
```python
# User clicks "Find Jobs"
# Instead of:
result = slow_job_search()  # Browser freezes for 30 seconds!

# We do:
task_id = discover_jobs.apply_async(args=[user_id])  # Instant return!
# Returns immediately with task_id while work happens in background
```

### Redis Message Queues (Inboxes)
Redis organizes tasks into different "inboxes" by priority:
- 📥 **job_discovery.high** - "I need jobs NOW!" (Priority: 10)
- 📥 **job_discovery.batch** - "Find jobs when you can" (Priority: 1)
- 📥 **cv_generation.urgent** - "Rush this CV!" (Priority: 10)
- 📥 **applications.linkedin** - "Submit to LinkedIn" (Rate-limited: 50/hour)

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3 with TypeScript 5.5
- **Build Tool**: Vite 5.4 (Lightning-fast HMR)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context API
- **Authentication**: Supabase Auth

### Backend
- **Language**: Python 3.11-3.12
- **Framework**: FastAPI 0.104
- **Package Manager**: uv (Fast Python package management)
- **AI Models**: OpenAI GPT-4o & GPT-4o-mini
- **Agent Framework**: LangChain 0.1.0
- **Browser Automation**: Playwright 1.40 with stealth mode
- **PDF Processing**: pdfplumber

### Infrastructure
- **Database**: Supabase (PostgreSQL with RLS)
- **Message Broker**: Redis
- **Task Queue**: Celery 5.3
- **Monitoring**: Flower (Celery monitoring dashboard)
- **Container**: Docker (with specific configs for each service)

---

## 📁 Project Structure

```
autoapply-turbo-charge-jobs/
├── src/                          # React Frontend
│   ├── components/               # UI Components
│   ├── services/                # API Service Layer
│   └── contexts/                # React Contexts
│
├── backend/                      # Python Backend Services
│   ├── src/
│   │   ├── job_automation/
│   │   │   ├── application/    # High-level service orchestration
│   │   │   ├── core/          # Business logic & domain models
│   │   │   └── infrastructure/ # External integrations
│   │   └── events/             # Event publishing/consuming
│   │
│   ├── tasks/                  # Celery Task Definitions
│   │   ├── job_discovery.py   # Job search tasks
│   │   ├── applications.py    # Application submission tasks
│   │   ├── cv_generation.py   # CV creation tasks
│   │   └── notifications.py   # User notification tasks
│   │
│   ├── cv_api/                 # CV Processing Microservice
│   │   └── main.py            # FastAPI app for CV operations
│   │
│   ├── application_agent/      # Application Automation Service
│   │   ├── enhanced_*.py      # Enhanced AI-powered services
│   │   ├── langchain_services/ # LangChain integrations
│   │   └── human_behavior.py  # Anti-bot detection evasion
│   │
│   ├── celery_app.py          # Celery application setup
│   └── celery_config.py       # Queue & exchange configuration
│
└── supabase/                   # Database migrations & config
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+
- Python 3.11+
- Redis server
- Supabase account (or local instance)

### Environment Setup

1. **Frontend** (`.env.local`):
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_OPENAI_API_KEY=your_openai_key  # Optional
```

2. **Backend** (`backend/.env`):
```bash
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
CELERY_BROKER_URL=redis://localhost:6379/0
```

### Starting the System

#### Option 1: Everything at Once
```bash
npm run dev:complete
```
This starts all services:
- Frontend: http://localhost:5173
- Main API: http://localhost:8000
- CV API: http://localhost:8001
- Application Agent: http://localhost:8002

#### Option 2: Individual Services
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend services
npm run backend          # Main API
npm run backend:cv       # CV Processing
npm run backend:agent    # Application Agent

# Terminal 3: Redis
redis-server

# Terminal 4: Celery Worker
cd backend && celery -A celery_app worker --loglevel=info

# Terminal 5: Flower (Optional - Monitoring)
cd backend && celery -A celery_app flower
```

---

## 🔌 Key API Endpoints

### Main Backend (Port 8000)
```
POST /api/web-search-job-discovery     # Start job discovery
GET  /api/system/status                # Health check
POST /api/github-oauth/token          # GitHub authentication
```

### CV Processing (Port 8001)
```
POST /process                          # Extract CV data
POST /generate-job-specific-cv        # Create tailored CV
POST /generate-cover-letter           # Generate cover letter
```

### Application Agent (Port 8002)
```
POST /api/apply/start                  # Begin automated application
GET  /api/apply/status/{id}           # Track application progress
POST /api/apply/cv/upload              # Upload CV with validation
```

---

## 🔐 Security Features

### Authentication & Authorization
- **Supabase Auth** with email/password and OAuth
- **Row Level Security (RLS)** for data isolation
- **Service-to-service auth** using service role keys

### Anti-Bot Detection Evasion
The Application Agent includes sophisticated measures to avoid detection:
- **Human-like behavior**: Random delays, natural mouse movements
- **Browser fingerprinting**: Playwright-stealth integration
- **Rate limiting**: Respects platform limits (e.g., 50 LinkedIn apps/hour)
- **Session management**: Proper cookie and session handling

---

## 📊 Event-Driven Architecture Details

### Task Priorities & Rate Limiting
Tasks are organized by priority and rate-limited to avoid overwhelming external services:

```python
# High priority job search
discover_jobs.apply_async(
    args=[user_id],
    queue='job_discovery.high',
    priority=10
)

# Rate-limited LinkedIn submissions (50/hour)
submit_to_linkedin.apply_async(
    args=[application_data],
    queue='applications.linkedin'
)
```

### Queue Configuration
- **Job Discovery**: high (10), normal (5), batch (1) priority
- **CV Generation**: urgent (10), normal (5) priority
- **Applications**: Platform-specific queues with rate limits
- **Notifications**: Fanout exchange for broadcasting

---

## 🧪 Testing

```bash
# Quick validation
npm run test:quick              # Lint + TypeScript check

# Backend tests
cd backend && uv run pytest     # All tests
cd backend && uv run pytest tests/test_services.py -v  # Specific

# System integration
npm run test:system             # Full system test

# Bot evasion testing
cd backend && python test_bot_evasion.py
```

---

## 🚢 Deployment Considerations

### Microservices Independence
Each backend service can be:
- Developed independently
- Deployed separately
- Scaled horizontally
- Updated without affecting others

### Performance Optimization
- **Frontend**: Vite provides instant HMR in development
- **Backend**: uv offers 10-100x faster Python package installation
- **Database**: Proper indexing and connection pooling
- **Queue**: Celery workers scale horizontally
- **Caching**: Redis stores frequently accessed data

### Monitoring
- **Flower Dashboard** (Port 5555): Real-time Celery task monitoring
- **Application tracking**: Progress tracking for each automation
- **Error recovery**: Automatic retry with exponential backoff

---

## 📝 Common Development Commands

### Frontend
```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run lint            # Run ESLint
npm run typecheck       # TypeScript validation
```

### Backend
```bash
npm run backend         # Start main API
npm run backend:unified # Start unified system
cd backend && uv run python start.py     # Direct startup
cd backend && uv run pytest              # Run tests
```

### Database
```bash
npm run db:local        # Start local Supabase
npm run db:reset       # Reset database
npm run db:seed        # Add test data
```

---

## 💡 Key Design Decisions

1. **Microservices over Monolith**: Allows independent scaling and development
2. **Event-driven over Synchronous**: Prevents UI blocking for long operations
3. **Redis/Celery over custom queue**: Battle-tested, scalable solution
4. **LangChain for AI**: Provides advanced prompt engineering and chaining
5. **Playwright over Selenium**: Better performance and anti-detection features
6. **Supabase over custom auth**: Reduces development time, provides RLS

---

## 🤝 Contributing

When contributing to this codebase:
1. Follow existing code patterns and conventions
2. Never commit secrets or API keys
3. Test anti-bot measures with `test_bot_evasion.py`
4. Use proper error handling and logging
5. Update this documentation for architectural changes

---

## 📚 Additional Resources

- [CLAUDE.md](./CLAUDE.md) - Detailed development instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Extended architecture details
- [Celery Documentation](https://docs.celeryproject.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)

---

*Built with ❤️ for job seekers by the AutoApply team*