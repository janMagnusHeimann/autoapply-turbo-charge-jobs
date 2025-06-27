# Simplified Job Discovery Backend

A clean, simplified AI-powered job discovery system following the OODA loop agent architecture.

## 🏗️ Architecture

```
backend/
└── src/job_automation/
    ├── core/                           # Domain layer
    │   ├── agents/                     # AI agents (OODA loop)
    │   │   ├── base_agent.py          # Base agent framework
    │   │   ├── career_discovery_agent.py  # Finds career pages
    │   │   ├── job_extraction_agent.py    # Extracts job listings
    │   │   └── job_matching_agent.py      # Matches jobs to preferences
    │   └── models/                     # Data models
    │       ├── job_listing.py         # Job data structure
    │       └── user_preferences.py    # User preferences
    ├── infrastructure/                # External integrations
    │   ├── api/                       # FastAPI endpoints
    │   │   └── main.py               # Single API with essential endpoints
    │   ├── browser/                   # Browser automation
    │   │   └── browser_controller.py # Playwright controller
    │   └── clients/                   # External service clients
    │       └── openai_client.py      # OpenAI client
    ├── application/                   # Orchestration layer
    │   └── orchestrator.py           # Multi-agent workflow coordinator
    └── config.py                     # Simplified configuration
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements_simplified.txt

# Optional: Install browser for dynamic content
playwright install chromium
```

### 2. Configure Environment

Create `.env` file in the backend directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
API_HOST=0.0.0.0
API_PORT=8000
BROWSER_HEADLESS=true
DEMO_MODE=false
LOG_LEVEL=INFO
```

### 3. Start the Server

```bash
# Using the simplified startup script
python start_simplified.py

# Or directly
python -m uvicorn src.job_automation.infrastructure.api.main:app --host 0.0.0.0 --port 8000
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Single Company Job Discovery
```bash
POST /api/job-discovery
Content-Type: application/json

{
  "company_id": "N26",
  "company_website": "https://n26.com",
  "user_preferences": {
    "skills": ["Python", "JavaScript", "React"],
    "locations": ["Berlin", "Remote"],
    "experience_years": 5,
    "experience_level": "senior",
    "desired_roles": ["Software Engineer", "Full Stack Developer"],
    "job_types": ["remote", "hybrid"],
    "salary_min": 60000,
    "salary_max": 100000
  },
  "use_browser_automation": true
}
```

### Multi-Company Job Discovery
```bash
POST /api/multi-company-job-discovery
Content-Type: application/json

{
  "companies": [
    {"name": "N26", "website": "https://n26.com"},
    {"name": "Spotify", "website": "https://spotify.com"},
    {"name": "Zalando", "website": "https://zalando.com"}
  ],
  "user_preferences": {
    "skills": ["Python", "JavaScript"],
    "locations": ["Berlin", "Remote"],
    "experience_years": 5
  },
  "max_concurrent": 3,
  "use_browser_automation": true
}
```

### System Status
```bash
GET /api/system/status
```

### Demo Endpoints
```bash
GET /api/demo/companies        # Get demo companies
GET /api/demo/user-preferences # Get demo user preferences
```

## 🔄 Workflow

The system follows a 4-step agent-based workflow:

1. **Career Discovery Agent** 
   - Finds company career pages using pattern matching and AI
   - Handles common patterns like `/careers`, `/jobs`
   - Falls back to AI analysis for complex sites

2. **Job Extraction Agent**
   - Extracts job listings from career pages
   - Uses multiple strategies: JSON-LD, HTML patterns, AI extraction
   - Supports browser automation for JavaScript-heavy sites
   - Optional vision-based extraction for complex layouts

3. **Job Matching Agent**
   - Matches extracted jobs to user preferences
   - Calculates compatibility scores across multiple dimensions
   - Provides AI-powered reasoning for match decisions

4. **Orchestrator**
   - Coordinates the multi-agent workflow
   - Handles parallel processing for multiple companies
   - Provides progress tracking and error handling

## 🧠 Agent Architecture

Each agent follows the OODA (Observe-Orient-Decide-Act) loop pattern:

- **Observe**: Gather information about the current state
- **Orient**: Process and contextualize observations  
- **Decide**: Make decisions based on oriented information
- **Act**: Execute the decided action

This provides:
- Consistent agent behavior
- Clear separation of concerns
- Easy debugging and monitoring
- Extensible architecture

## 🌐 Browser Automation

Optional browser automation using Playwright:

- Handles JavaScript-heavy career pages
- Intelligent waiting for dynamic content
- Infinite scroll detection and handling
- Screenshot capture for vision models
- Stealth mode to avoid detection

## 🔧 Configuration

The system uses a simplified configuration class that loads from environment variables:

- **API Settings**: Host, port, CORS
- **OpenAI Settings**: API key, model, temperature
- **Browser Settings**: Headless mode, timeout
- **General Settings**: Demo mode, logging level

## 📊 Response Format

Single company response:
```json
{
  "status": "success",
  "company": "N26",
  "career_page_url": "https://n26.com/careers",
  "total_jobs": 15,
  "matched_jobs": [
    {
      "title": "Senior Software Engineer",
      "company": "N26",
      "location": "Berlin",
      "employment_type": "Full-time",
      "description": "Build scalable applications...",
      "application_url": "https://n26.com/careers/123",
      "match_score": 85.2,
      "dimension_scores": {
        "skills_match": 90.0,
        "location_match": 100.0,
        "experience_match": 80.0
      },
      "match_reasoning": "Excellent match! This position aligns well with your skills...",
      "recommendation": "Highly Recommended"
    }
  ],
  "execution_time": 12.5,
  "extraction_method": "ai_extraction",
  "used_browser": true,
  "discovery_method": "pattern_match"
}
```

## 🚨 Error Handling

The system provides graceful error handling:

- Configuration validation on startup
- Agent-level error recovery
- Fallback strategies (static → browser → AI)
- Detailed error messages and logging
- Partial success handling for multi-company requests

## 🔍 Demo Mode

Set `DEMO_MODE=true` to run without API keys:
- Uses mock responses for AI calls
- Simulates job discovery workflow
- Perfect for testing and development

## 🧪 Testing

```bash
cd backend

# Test the API endpoints
curl http://localhost:8000/health

# Test with demo data
curl -X POST http://localhost:8000/api/job-discovery \
  -H "Content-Type: application/json" \
  -d '{"company_id": "N26", "company_website": "https://n26.com", "user_preferences": {}}'
```

## 📈 Performance

The simplified architecture provides:

- **Fast startup**: Minimal dependencies and initialization
- **Efficient processing**: Parallel company processing  
- **Smart caching**: Browser content and career page caching
- **Resource management**: Automatic cleanup of browser instances
- **Graceful degradation**: Falls back when components unavailable

## 🔒 Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# API Configuration  
API_HOST=0.0.0.0
API_PORT=8000

# OpenAI Configuration
OPENAI_MODEL=gpt-4o
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=4000

# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# General Settings
DEMO_MODE=false
LOG_LEVEL=INFO
```

## 🎯 Key Benefits

1. **Simplified**: Removed redundant services and abstractions
2. **Focused**: Single responsibility for each component
3. **Reliable**: Comprehensive error handling and fallbacks
4. **Extensible**: Clean agent architecture for easy additions
5. **Fast**: Optimized for quick job discovery
6. **Production Ready**: Proper logging, configuration, and monitoring

This simplified backend provides all essential job discovery functionality while maintaining clean architecture and extensibility. 