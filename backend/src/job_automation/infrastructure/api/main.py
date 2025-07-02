"""
Simplified Job Discovery API - Single endpoint for job discovery workflow
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import os
import httpx

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ...config import config
# from ...application.orchestrator import JobDiscoveryOrchestrator, create_orchestrator  # Disabled for web search
from ...application.web_search_job_service import WebSearchJobService
from ...infrastructure.clients.openai_client import create_openai_client

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Job Discovery API",
    description="Simplified AI-powered job discovery system",
    version="2.0.0",
    docs_url="/docs" if not config.demo_mode else None
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
# orchestrator: JobDiscoveryOrchestrator = None  # Disabled for web search
web_search_service: WebSearchJobService = None

# Request/Response Models
class JobDiscoveryRequest(BaseModel):
    company_id: str = Field(..., description="Company name or ID")
    company_website: str = Field(..., description="Company website URL")
    user_preferences: Dict[str, Any] = Field(default={}, description="User job preferences")
    use_browser_automation: bool = Field(default=True, description="Enable browser automation for dynamic content")

class MultiCompanyJobDiscoveryRequest(BaseModel):
    companies: List[Dict[str, str]] = Field(..., description="List of companies with name and website")
    user_preferences: Dict[str, Any] = Field(default={}, description="User job preferences")
    max_concurrent: int = Field(default=3, description="Maximum concurrent company processing")
    use_browser_automation: bool = Field(default=True, description="Enable browser automation")

class GitHubOAuthRequest(BaseModel):
    client_id: str
    code: str

class JobDiscoveryResponse(BaseModel):
    status: str
    company: str
    career_page_url: Optional[str] = None
    total_jobs: int = 0
    matched_jobs: List[Dict[str, Any]] = []
    execution_time: float = 0.0
    extraction_method: Optional[str] = None
    used_browser: bool = False
    discovery_method: Optional[str] = None
    error: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global web_search_service
    
    logger.info("🚀 Starting Job Discovery API")
    
    try:
        # Initialize OpenAI client
        openai_client = create_openai_client(
            api_key=config.openai_api_key,
            model=config.openai_model,
            temperature=config.llm_temperature
        )
        
        if not openai_client.is_available():
            logger.warning("⚠️ OpenAI client not available - API will use mock responses")
        
        # Initialize orchestrator (legacy support) - DISABLED for web search approach
        # orchestrator = await create_orchestrator(
        #     openai_client=openai_client,
        #     use_browser=config.browser_headless,  # Use browser if configured
        # )
        # orchestrator = None  # Disable legacy orchestrator
        
        # Initialize web search service (new simplified approach)
        web_search_service = WebSearchJobService(config)
        
        logger.info("✅ Job Discovery API startup complete")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global web_search_service
    
    logger.info("👋 Shutting down Job Discovery API")
    
    # No cleanup needed for web search service
    
    logger.info("✅ Shutdown complete")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "system": "simplified-job-discovery-web-search",
        "demo_mode": config.demo_mode,
        "web_search_available": web_search_service.is_available() if web_search_service else False,
        "browser_automation": False,  # Disabled for web search approach
        "timestamp": datetime.utcnow().isoformat()
    }

# LEGACY ENDPOINT - DISABLED FOR WEB SEARCH APPROACH
# Legacy job discovery endpoint has been removed - use /api/web-search-job-discovery instead

@app.post("/api/web-search-job-discovery")
async def discover_jobs_web_search(request: JobDiscoveryRequest):
    """
    Simplified job discovery using OpenAI web search (NEW)
    """
    if not web_search_service:
        raise HTTPException(status_code=503, detail="Web search service not initialized")
    
    try:
        logger.info(f"🔍 Web search job discovery for {request.company_id}")
        
        # Convert request to format expected by web search service
        from ...core.models.user_preferences import UserPreferences
        
        # Create user preferences object
        user_prefs = UserPreferences(
            skills=request.user_preferences.get('skills', []),
            locations=request.user_preferences.get('locations', []),
            job_types=request.user_preferences.get('job_types', []),
            salary_min=request.user_preferences.get('salary_min'),
            salary_max=request.user_preferences.get('salary_max'),
            experience_level=request.user_preferences.get('experience_level', 'mid'),
            experience_years=request.user_preferences.get('experience_years', 3)
        )
        
        company_info = {
            'name': request.company_id,
            'website_url': request.company_website
        }
        
        # Execute web search job discovery
        result = await web_search_service.discover_jobs_for_company(
            company=company_info,
            user_preferences=user_prefs,
            max_jobs=20
        )
        
        # Convert to response model
        if result.get("success"):
            return JobDiscoveryResponse(
                status="success",
                company=result.get("company", request.company_id),
                career_page_url=result.get("career_page_url"),
                total_jobs=result.get("total_jobs", 0),
                matched_jobs=result.get("matched_jobs", []),
                execution_time=result.get("execution_time", 0.0),
                extraction_method="web_search",
                used_browser=False,
                discovery_method="openai_web_search"
            )
        else:
            return JobDiscoveryResponse(
                status="error",
                company=request.company_id,
                execution_time=result.get("execution_time", 0.0),
                error=result.get("error", "Web search failed")
            )
            
    except Exception as e:
        logger.error(f"Web search job discovery failed: {e}")
        return JobDiscoveryResponse(
            status="error",
            company=request.company_id,
            error=str(e)
        )

# LEGACY MULTI-COMPANY ENDPOINT - DISABLED FOR WEB SEARCH
# Legacy multi-company job discovery endpoint has been removed

@app.get("/api/system/status")
async def get_system_status():
    """Get detailed system status for web search system"""
    return {
        "status": "operational",
        "system_type": "web-search-based",
        "components": {
            "web_search_service": "active" if web_search_service else "inactive",
            "openai_client": "available" if web_search_service and web_search_service.is_available() else "unavailable",
            "browser_automation": "disabled",  # No longer used
            "legacy_orchestrator": "disabled"  # No longer used
        },
        "configuration": {
            "demo_mode": config.demo_mode,
            "openai_model": config.openai_model,
            "browser_enabled": False,  # Disabled for web search
            "web_search_enabled": True
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Demo endpoints for testing
@app.get("/api/demo/companies")
async def get_demo_companies():
    """Get list of demo companies for testing"""
    return {
        "companies": [
            {"name": "N26", "website": "https://n26.com"},
            {"name": "Spotify", "website": "https://spotify.com"},
            {"name": "Zalando", "website": "https://zalando.com"},
            {"name": "Trade Republic", "website": "https://traderepublic.com"},
            {"name": "Google", "website": "https://google.com"}
        ]
    }

@app.get("/api/demo/user-preferences")
async def get_demo_user_preferences():
    """Get demo user preferences for testing"""
    return {
        "user_preferences": {
            "skills": ["Python", "JavaScript", "React", "TypeScript", "Node.js"],
            "locations": ["Berlin", "Remote", "Munich"],
            "experience_years": 5,
            "experience_level": "senior",
            "desired_roles": ["Software Engineer", "Full Stack Developer", "Backend Developer"],
            "industries": ["Technology", "Fintech"],
            "job_types": ["remote", "hybrid"],
            "salary_min": 60000,
            "salary_max": 100000
        }
    }

@app.post("/api/github-oauth/token")
async def github_oauth_token(request: GitHubOAuthRequest):
    """
    Exchange GitHub OAuth code for access token
    """
    try:
        # Validate input parameters
        if not request.code or not request.code.strip():
            logger.warning("GitHub OAuth called with empty authorization code")
            raise HTTPException(status_code=400, detail="Authorization code is required")
        
        if not request.client_id or not request.client_id.strip():
            logger.warning("GitHub OAuth called with empty client ID")
            raise HTTPException(status_code=400, detail="Client ID is required")
        
        github_client_secret = os.getenv('GITHUB_CLIENT_SECRET')
        if not github_client_secret:
            logger.error("GitHub client secret not configured in environment")
            raise HTTPException(status_code=500, detail="GitHub client secret not configured")
        
        logger.info(f"Processing GitHub OAuth token exchange for client ID: {request.client_id[:8]}...")
        
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "client_id": request.client_id,
                    "client_secret": github_client_secret,
                    "code": request.code,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"GitHub OAuth API returned status {response.status_code}: {response.text}")
                raise HTTPException(status_code=400, detail=f"Failed to exchange code for token (status: {response.status_code})")
            
            token_data = response.json()
            
            if "error" in token_data:
                error_msg = token_data.get("error_description", token_data.get("error", "OAuth error"))
                logger.error(f"GitHub OAuth error response: {error_msg}")
                raise HTTPException(status_code=400, detail=error_msg)
            
            logger.info("GitHub OAuth token exchange successful")
            return token_data
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"GitHub OAuth unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=config.api_host,
        port=config.api_port,
        log_level=config.log_level.lower()
    )