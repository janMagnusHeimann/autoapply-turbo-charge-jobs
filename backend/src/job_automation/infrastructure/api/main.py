"""
FastAPI main application
Secure backend API for job automation system
"""

import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
from dotenv import load_dotenv

from ...core.models import (
    CareerPageDiscoveryRequest, BulkCareerPageDiscoveryRequest,
    UserProfileValidationRequest, WorkflowExecutionRequest, APIResponse
)
from ...application.career_discovery_service.service import CareerDiscoveryService
from ...application.user_validation_service.service import UserValidationService
from ...application.workflow_orchestration_service.service import WorkflowOrchestrationService
from ...infrastructure.clients.supabase_client import SupabaseClient

# Load environment variables
load_dotenv("../../.env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global service instances
career_discovery_service = None
user_validation_service = None
workflow_orchestration_service = None
supabase_client = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global career_discovery_service, user_validation_service, workflow_orchestration_service, supabase_client
    
    # Initialize services on startup
    logger.info("Initializing services...")
    
    # Check required environment variables
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    
    # Initialize clients and services
    supabase_client = SupabaseClient()
    career_discovery_service = CareerDiscoveryService(openai_api_key, supabase_client)
    user_validation_service = UserValidationService(supabase_client)
    workflow_orchestration_service = WorkflowOrchestrationService(
        career_discovery_service, user_validation_service, supabase_client
    )
    
    logger.info("Services initialized successfully")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down services...")


app = FastAPI(
    title="Job Automation API",
    version="1.0.0",
    description="Secure AI-powered job application automation system",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8087", 
        "http://localhost:5173", 
        "http://localhost:8080",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Job Automation API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": [
            "career_discovery",
            "user_validation",
            "supabase_client"
        ]
    }


# User Profile Validation Endpoints

@app.post("/api/validate-user-profile", response_model=APIResponse)
async def validate_user_profile(request: UserProfileValidationRequest):
    """
    Validate user profile completeness and readiness for job applications
    
    This endpoint checks:
    - Required profile fields (name, email)
    - Job preferences (locations, job types, skills)
    - CV assets (experience, education)
    - Integration status (GitHub, Scholar)
    
    Returns validation result with completion score and recommendations.
    """
    try:
        return await user_validation_service.validate_user_profile(request)
    except Exception as e:
        logger.error(f"Error in profile validation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Career Page Discovery Endpoints

@app.post("/api/discover-career-page", response_model=APIResponse)
async def discover_career_page(request: CareerPageDiscoveryRequest):
    """
    Discover career page for a single company
    
    This endpoint:
    1. Checks if company already has career page in database
    2. If not, uses AI agent to discover it using multiple methods:
       - Pattern matching (common career page URLs)
       - ATS platform detection (Greenhouse, Lever, etc.)
       - AI-powered web search and analysis
    3. Validates discovered URLs
    4. Updates database with verified career page
    
    Returns career page URL with confidence score and discovery method.
    """
    try:
        return await career_discovery_service.discover_single_career_page(request)
    except Exception as e:
        logger.error(f"Error in career page discovery: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/discover-career-pages-bulk", response_model=APIResponse)
async def discover_career_pages_bulk(request: BulkCareerPageDiscoveryRequest):
    """
    Discover career pages for multiple companies
    
    Processes companies in batches to avoid rate limiting and provides
    progress updates for long-running operations.
    
    Returns summary of successful/failed discoveries with total cost.
    """
    try:
        return await career_discovery_service.discover_bulk_career_pages(request)
    except Exception as e:
        logger.error(f"Error in bulk career page discovery: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/discovery-stats", response_model=APIResponse)
async def get_discovery_stats():
    """Get career page discovery statistics and cache status"""
    try:
        return await career_discovery_service.get_discovery_stats()
    except Exception as e:
        logger.error(f"Error getting discovery stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/clear-discovery-cache", response_model=APIResponse)
async def clear_discovery_cache():
    """Clear the career page discovery cache"""
    try:
        return await career_discovery_service.clear_discovery_cache()
    except Exception as e:
        logger.error(f"Error clearing discovery cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# GitHub OAuth Proxy Endpoint (existing functionality)

from pydantic import BaseModel

class GitHubOAuthRequest(BaseModel):
    code: str
    client_id: str


@app.post("/api/github-oauth/token")
async def github_oauth_token(request: GitHubOAuthRequest):
    """Proxy GitHub OAuth token exchange to avoid CORS issues"""
    try:
        github_client_secret = os.getenv("GITHUB_CLIENT_SECRET")
        if not github_client_secret:
            raise HTTPException(status_code=500, detail="GitHub client secret not configured")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://github.com/login/oauth/access_token",
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json={
                    "client_id": request.client_id,
                    "client_secret": github_client_secret,
                    "code": request.code,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="GitHub OAuth failed")
            
            data = response.json()
            
            if "error" in data:
                raise HTTPException(status_code=400, detail=f"GitHub OAuth error: {data.get('error_description', data['error'])}")
            
            return data
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Workflow Orchestration Endpoints

@app.post("/api/execute-career-discovery-workflow", response_model=APIResponse)
async def execute_career_discovery_workflow(request: WorkflowExecutionRequest):
    """
    Execute complete career page discovery workflow for a user and company
    
    This endpoint orchestrates the full workflow:
    1. Validates user profile readiness
    2. Retrieves company information
    3. Discovers career page using AI agent
    4. Updates database with results
    5. Prepares for next workflow steps
    
    Returns workflow execution results with step-by-step status.
    """
    try:
        return await workflow_orchestration_service.execute_career_page_discovery_workflow(request)
    except Exception as e:
        logger.error(f"Error in workflow execution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workflow-status/{workflow_id}", response_model=APIResponse)
async def get_workflow_status(workflow_id: str):
    """Get status of a specific workflow execution"""
    try:
        return await workflow_orchestration_service.get_workflow_status(workflow_id)
    except Exception as e:
        logger.error(f"Error getting workflow status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)