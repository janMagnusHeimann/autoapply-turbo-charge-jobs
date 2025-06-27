"""
Simplified Job Discovery API - Single endpoint for job discovery workflow
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime
import logging
import os
import httpx

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ...config import config
from ...application.orchestrator import JobDiscoveryOrchestrator, create_orchestrator
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

# Global orchestrator instance
orchestrator: JobDiscoveryOrchestrator = None

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
    career_page_url: str = None
    total_jobs: int = 0
    matched_jobs: List[Dict[str, Any]] = []
    execution_time: float = 0.0
    extraction_method: str = None
    used_browser: bool = False
    discovery_method: str = None
    error: str = None

@app.on_event("startup")
async def startup_event():
    """Initialize the orchestrator on startup"""
    global orchestrator
    
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
        
        # Initialize orchestrator
        orchestrator = await create_orchestrator(
            openai_client=openai_client,
            use_browser=config.browser_headless,  # Use browser if configured
        )
        
        logger.info("✅ Job Discovery API startup complete")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global orchestrator
    
    logger.info("👋 Shutting down Job Discovery API")
    
    if orchestrator:
        await orchestrator.cleanup()
    
    logger.info("✅ Shutdown complete")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "system": "simplified-job-discovery",
        "demo_mode": config.demo_mode,
        "openai_available": orchestrator.openai_client.is_available() if orchestrator else False,
        "browser_available": orchestrator.browser_controller is not None if orchestrator else False,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/job-discovery", response_model=JobDiscoveryResponse)
async def discover_jobs(request: JobDiscoveryRequest):
    """
    Main job discovery endpoint for a single company
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        logger.info(f"🔍 Job discovery request for {request.company_id}")
        
        # Execute job discovery
        result = await orchestrator.discover_jobs(
            company=request.company_id,
            website=request.company_website,
            user_preferences=request.user_preferences
        )
        
        # Convert to response model
        if result["status"] == "success":
            return JobDiscoveryResponse(
                status=result["status"],
                company=result["company"],
                career_page_url=result.get("career_page_url"),
                total_jobs=result.get("total_jobs", 0),
                matched_jobs=result.get("matched_jobs", []),
                execution_time=result.get("execution_time", 0.0),
                extraction_method=result.get("extraction_method"),
                used_browser=result.get("used_browser", False),
                discovery_method=result.get("discovery_method")
            )
        else:
            return JobDiscoveryResponse(
                status=result["status"],
                company=result["company"],
                execution_time=result.get("execution_time", 0.0),
                error=result.get("message", "Unknown error")
            )
            
    except Exception as e:
        logger.error(f"Job discovery failed: {e}")
        return JobDiscoveryResponse(
            status="error",
            company=request.company_id,
            error=str(e)
        )

@app.post("/api/multi-company-job-discovery")
async def discover_jobs_multi_company(request: MultiCompanyJobDiscoveryRequest):
    """
    Job discovery endpoint for multiple companies
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        logger.info(f"🔍 Multi-company job discovery for {len(request.companies)} companies")
        
        # Validate companies format
        for company in request.companies:
            if "name" not in company or "website" not in company:
                raise HTTPException(
                    status_code=400, 
                    detail="Each company must have 'name' and 'website' fields"
                )
        
        # Execute batch discovery
        result = await orchestrator.discover_jobs_batch({
            "companies": request.companies,
            "user_preferences": request.user_preferences,
            "max_concurrent": request.max_concurrent
        })
        
        return result
        
    except Exception as e:
        logger.error(f"Multi-company job discovery failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/status")
async def get_system_status():
    """Get detailed system status"""
    if not orchestrator:
        return {
            "status": "error",
            "message": "Orchestrator not initialized"
        }
    
    return {
        "status": "operational",
        "components": {
            "orchestrator": "active",
            "openai_client": "available" if orchestrator.openai_client.is_available() else "unavailable",
            "browser_controller": "available" if orchestrator.browser_controller else "unavailable",
            "career_agent": "active",
            "extraction_agent": "active", 
            "matching_agent": "active"
        },
        "configuration": {
            "demo_mode": config.demo_mode,
            "openai_model": config.openai_model,
            "browser_enabled": orchestrator.browser_controller is not None,
            "vision_enabled": True
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
        github_client_secret = os.getenv('GITHUB_CLIENT_SECRET')
        if not github_client_secret:
            raise HTTPException(status_code=500, detail="GitHub client secret not configured")
        
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
                raise HTTPException(status_code=400, detail="Failed to exchange code for token")
            
            token_data = response.json()
            
            if "error" in token_data:
                raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth error"))
            
            return token_data
            
    except Exception as e:
        logger.error(f"GitHub OAuth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=config.api_host,
        port=config.api_port,
        log_level=config.log_level.lower()
    )