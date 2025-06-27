"""
FastAPI endpoints for multi-agent job discovery system.
Provides REST API interface for job discovery workflows.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from ..models import (
    JobDiscoveryRequest, JobDiscoveryResult, WorkflowProgress,
    UserPreferences, JobListing, JobMatchResult, CareerPageInfo,
    JobDiscoveryResponse, WorkflowStatusResponse, JobMatchSummary,
    SystemConfiguration, AgentConfiguration
)
from ..core.agent_orchestrator import JobDiscoveryOrchestrator
from ..browser.browser_controller import BrowserConfig

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global orchestrator instance
orchestrator: Optional[JobDiscoveryOrchestrator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    global orchestrator
    
    # Startup
    logger.info("Starting multi-agent job discovery API")
    
    # Initialize orchestrator with default config
    from openai import AsyncOpenAI
    llm_client = AsyncOpenAI()  # Uses environment variables for API key
    
    browser_config = BrowserConfig(
        headless=True,
        save_screenshots=False,
        intercept_requests=True
    )
    
    orchestrator = JobDiscoveryOrchestrator(
        llm_client=llm_client,
        browser_config=browser_config
    )
    
    logger.info("Multi-agent job discovery API started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down multi-agent job discovery API")
    if orchestrator:
        await orchestrator.close()
    logger.info("API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Multi-Agent Job Discovery API",
    description="AI-powered job discovery system using multiple specialized agents",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to get orchestrator
async def get_orchestrator() -> JobDiscoveryOrchestrator:
    """Get the global orchestrator instance."""
    global orchestrator
    if orchestrator is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Orchestrator not initialized"
        )
    return orchestrator


# Main API endpoints

@app.post("/api/multi-agent-job-discovery", response_model=JobDiscoveryResponse)
async def start_job_discovery(
    request: JobDiscoveryRequest,
    background_tasks: BackgroundTasks,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> JobDiscoveryResponse:
    """
    Start a multi-agent job discovery workflow.
    
    This endpoint initiates the complete job discovery pipeline:
    1. Career page discovery
    2. Job extraction
    3. Job matching
    4. Result compilation
    
    The workflow runs asynchronously and can be tracked using the workflow_id.
    """
    try:
        logger.info(f"Starting job discovery for {request.company_name}")
        
        # Validate request
        if not request.company_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name is required"
            )
        
        if not request.company_website.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company website is required"
            )
        
        # Add workflow to background tasks
        background_tasks.add_task(
            _execute_workflow_background,
            orchestrator,
            request
        )
        
        # Estimate completion time (rough estimate)
        estimated_completion = datetime.utcnow()
        if hasattr(estimated_completion, 'replace'):
            estimated_completion = estimated_completion.replace(
                second=estimated_completion.second + request.max_execution_time
            )
        
        return JobDiscoveryResponse(
            workflow_id=request.request_id,
            status="started",
            message=f"Job discovery workflow started for {request.company_name}",
            estimated_completion_time=estimated_completion
        )
        
    except Exception as e:
        logger.error(f"Failed to start job discovery: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start job discovery: {str(e)}"
        )


@app.get("/api/workflow-status/{workflow_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(
    workflow_id: str,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> WorkflowStatusResponse:
    """
    Get the current status of a job discovery workflow.
    
    Returns detailed progress information including:
    - Current stage
    - Progress percentage
    - Current operation
    - Errors encountered
    - Time statistics
    """
    try:
        progress = await orchestrator.get_workflow_status(workflow_id)
        
        return WorkflowStatusResponse(
            workflow_id=workflow_id,
            found=progress is not None,
            progress=progress
        )
        
    except Exception as e:
        logger.error(f"Failed to get workflow status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workflow status: {str(e)}"
        )


@app.get("/api/workflow-result/{workflow_id}", response_model=JobDiscoveryResult)
async def get_workflow_result(
    workflow_id: str,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> JobDiscoveryResult:
    """
    Get the complete result of a finished job discovery workflow.
    
    Returns comprehensive results including:
    - All discovered career pages
    - All extracted jobs
    - Job matching results
    - Performance statistics
    - Top recommendations
    """
    try:
        # Check if workflow is still running
        progress = await orchestrator.get_workflow_status(workflow_id)
        if progress is not None:
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail=f"Workflow {workflow_id} is still running"
            )
        
        # Check completed workflows
        if workflow_id in orchestrator.completed_workflows:
            return orchestrator.completed_workflows[workflow_id]
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow {workflow_id} not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workflow result: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workflow result: {str(e)}"
        )


@app.post("/api/cancel-workflow/{workflow_id}")
async def cancel_workflow(
    workflow_id: str,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Cancel a running job discovery workflow.
    
    Attempts to gracefully stop the workflow and clean up resources.
    """
    try:
        success = await orchestrator.cancel_workflow(workflow_id)
        
        if success:
            return {
                "success": True,
                "message": f"Workflow {workflow_id} cancelled successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found or already completed"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel workflow: {str(e)}"
        )


# Specialized endpoints for individual agent functions

@app.post("/api/find-career-page")
async def find_career_page(
    company_website: str,
    company_name: Optional[str] = None,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Find career pages for a specific company website.
    
    Uses the CareerDiscoveryAgent to locate job/career sections.
    """
    try:
        if not company_website.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company website is required"
            )
        
        # Initialize agents if needed
        await orchestrator._initialize_agents()
        
        # Use career discovery agent
        result = await orchestrator._career_agent.discover_career_pages(
            company_website=company_website,
            company_name=company_name,
            max_depth=2
        )
        
        return {
            "success": result.get('success', False),
            "career_pages": result.get('discovered_career_pages', []),
            "total_pages": len(result.get('discovered_career_pages', [])),
            "discovery_details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Career page discovery failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Career page discovery failed: {str(e)}"
        )


@app.post("/api/extract-jobs")
async def extract_jobs(
    page_url: str,
    company_name: Optional[str] = None,
    max_pages: int = 5,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Extract job listings from a specific career page.
    
    Uses the JobExtractionAgent to parse job information.
    """
    try:
        if not page_url.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page URL is required"
            )
        
        # Initialize agents if needed
        await orchestrator._initialize_agents()
        
        # Use job extraction agent
        result = await orchestrator._extraction_agent.extract_jobs_from_page(
            page_url=page_url,
            company_name=company_name,
            extract_all_pages=True,
            max_pages=max_pages
        )
        
        return {
            "success": result.get('success', False),
            "jobs": result.get('jobs_extracted', []),
            "total_jobs": len(result.get('jobs_extracted', [])),
            "extraction_details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job extraction failed: {str(e)}"
        )


@app.post("/api/match-jobs", response_model=Dict[str, Any])
async def match_jobs(
    jobs: List[JobListing],
    user_preferences: UserPreferences,
    include_ai_analysis: bool = True,
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Match a list of jobs against user preferences.
    
    Uses the JobMatchingAgent to score and rank jobs.
    """
    try:
        if not jobs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Jobs list cannot be empty"
            )
        
        # Convert JobListing objects to dictionaries
        jobs_dict = [job.dict() for job in jobs]
        
        # Initialize agents if needed
        await orchestrator._initialize_agents()
        
        # Use job matching agent
        result = await orchestrator._matching_agent.match_jobs_to_preferences(
            jobs=jobs_dict,
            user_preferences=user_preferences,
            include_ai_analysis=include_ai_analysis
        )
        
        return {
            "success": result.get('success', False),
            "matches": result.get('match_results', []),
            "total_matches": len(result.get('match_results', [])),
            "match_summary": result.get('match_summary', {}),
            "matching_details": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job matching failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job matching failed: {str(e)}"
        )


# System monitoring and management endpoints

@app.get("/api/system-status")
async def get_system_status(
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    Get current system status and statistics.
    
    Returns information about:
    - Active workflows
    - Performance metrics
    - Resource usage
    - System health
    """
    try:
        stats = orchestrator.get_orchestrator_stats()
        
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "orchestrator_stats": stats,
            "active_workflows": len(orchestrator.active_workflows),
            "completed_workflows": len(orchestrator.completed_workflows)
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system status: {str(e)}"
        )


@app.get("/api/active-workflows")
async def list_active_workflows(
    orchestrator: JobDiscoveryOrchestrator = Depends(get_orchestrator)
) -> Dict[str, Any]:
    """
    List all currently active workflows.
    
    Returns summary information for each active workflow.
    """
    try:
        active_workflows = []
        
        for workflow_id, progress in orchestrator.active_workflows.items():
            active_workflows.append({
                "workflow_id": workflow_id,
                "stage": progress.stage.value,
                "progress_percentage": progress.progress_percentage,
                "current_operation": progress.current_operation,
                "start_time": progress.start_time.isoformat(),
                "errors_count": len(progress.errors_encountered)
            })
        
        return {
            "active_workflows": active_workflows,
            "total_active": len(active_workflows)
        }
        
    except Exception as e:
        logger.error(f"Failed to list active workflows: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list active workflows: {str(e)}"
        )


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Simple health check endpoint.
    
    Returns basic health status for load balancers and monitoring.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "multi-agent-job-discovery"
    }


# Background task helper functions

async def _execute_workflow_background(
    orchestrator: JobDiscoveryOrchestrator,
    request: JobDiscoveryRequest
) -> None:
    """
    Execute a workflow in the background.
    
    This function runs the complete job discovery workflow asynchronously.
    """
    try:
        logger.info(f"Executing background workflow {request.request_id}")
        
        # Add progress callback for logging
        async def log_progress(progress: WorkflowProgress):
            logger.info(
                f"Workflow {progress.workflow_id}: {progress.stage.value} - "
                f"{progress.progress_percentage:.1f}% - {progress.current_operation}"
            )
        
        orchestrator.add_progress_callback(log_progress)
        
        # Execute the workflow
        result = await orchestrator.discover_jobs(request)
        
        logger.info(
            f"Workflow {request.request_id} completed: "
            f"success={result.success}, jobs={result.total_jobs_extracted}"
        )
        
    except Exception as e:
        logger.error(f"Background workflow {request.request_id} failed: {e}")


# Error handlers

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )