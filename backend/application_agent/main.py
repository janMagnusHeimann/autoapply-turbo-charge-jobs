"""
Application Agent API - AI-powered automated job application service

This service handles:
- Job application form analysis and filling
- CV selection (generated vs uploaded)
- Automated application submission
- Real-time progress tracking
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from collections import defaultdict

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv

try:
    # Try relative imports first (when run as module)
    from .application_agent import ApplicationAgent
    from .form_analysis_service import FormAnalysisService
    from .cv_selection_service import CVSelectionService
    from .application_tracking_service import ApplicationTrackingService
except ImportError:
    # Fall back to absolute imports (when run directly)
    from application_agent import ApplicationAgent
    from form_analysis_service import FormAnalysisService
    from cv_selection_service import CVSelectionService
    from application_tracking_service import ApplicationTrackingService

# Load environment variables
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('APPLICATION_AGENT_PORT', '8002'))

# CORS configuration - secure defaults
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
    "http://localhost:8080",  # Production preview
    "https://autoapply.com",  # Production domain (adjust as needed)
]

# Add custom origins from environment
custom_origins = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
if custom_origins and custom_origins[0]:  # Only if not empty
    ALLOWED_ORIGINS.extend([origin.strip() for origin in custom_origins if origin.strip()])

# Validate environment variables
required_env_vars = {
    'OPENAI_API_KEY': OPENAI_API_KEY,
    'SUPABASE_URL': SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': SUPABASE_SERVICE_ROLE_KEY
}

missing_vars = [var for var, value in required_env_vars.items() if not value]
if missing_vars:
    error_msg = f"❌ Missing required environment variables: {', '.join(missing_vars)}"
    logger.error(error_msg)
    raise ValueError(error_msg)

logger.info("✅ All required environment variables are set")

# Rate limiting storage
rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = 10  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds

def check_rate_limit(client_ip: str) -> bool:
    """Simple rate limiting implementation"""
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old requests
    rate_limit_storage[client_ip] = [
        req_time for req_time in rate_limit_storage[client_ip] 
        if req_time > window_start
    ]
    
    # Check if limit exceeded
    if len(rate_limit_storage[client_ip]) >= RATE_LIMIT_REQUESTS:
        return False
    
    # Add current request
    rate_limit_storage[client_ip].append(now)
    return True

# Create FastAPI app
app = FastAPI(
    title="Application Agent API",
    description="AI-powered automated job application service",
    version="1.0.0",
    docs_url="/docs"
)

# Add CORS middleware with secure configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Restricted to specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Specific methods only
    allow_headers=["*"],  # Can be further restricted if needed
)

# Global service instances
application_agent: ApplicationAgent = None
form_analysis_service: FormAnalysisService = None
cv_selection_service: CVSelectionService = None
tracking_service: ApplicationTrackingService = None
supabase_client: Client = None

# Request/Response Models
class StartApplicationRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    job_id: str = Field(..., description="Job ID from discovered jobs")
    cv_choice: str = Field(..., description="'generated' or 'uploaded'")
    cv_id: Optional[str] = Field(None, description="CV ID if using generated CV")
    uploaded_cv_path: Optional[str] = Field(None, description="Path to uploaded CV")
    cover_letter_prompt: Optional[str] = Field(None, description="Custom cover letter instructions")
    auto_submit: bool = Field(default=False, description="Automatically submit after filling")

class ApplicationStatusResponse(BaseModel):
    application_id: str
    status: str  # 'analyzing', 'filling', 'reviewing', 'submitted', 'failed'
    progress_percentage: int
    current_step: str
    messages: List[str]
    form_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class CVUploadRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    filename: str = Field(..., description="Original filename")

class ApplicationHistoryResponse(BaseModel):
    applications: List[Dict[str, Any]]
    total: int
    success_rate: float

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global application_agent, form_analysis_service, cv_selection_service, tracking_service, supabase_client
    
    logger.info("🚀 Starting Application Agent API")
    
    try:
        # Initialize Supabase client
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            logger.info("✅ Supabase client initialized")
        
        # Initialize services
        tracking_service = ApplicationTrackingService(supabase_client)
        cv_selection_service = CVSelectionService(supabase_client)
        form_analysis_service = FormAnalysisService(OPENAI_API_KEY)
        application_agent = ApplicationAgent(
            form_analysis_service=form_analysis_service,
            cv_selection_service=cv_selection_service,
            tracking_service=tracking_service,
            openai_api_key=OPENAI_API_KEY
        )
        
        logger.info("✅ Application Agent API startup complete")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "application-agent",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "application_agent": "active" if application_agent else "inactive",
            "form_analysis": "active" if form_analysis_service else "inactive",
            "cv_selection": "active" if cv_selection_service else "inactive",
            "tracking": "active" if tracking_service else "inactive",
            "supabase": "connected" if supabase_client else "disconnected"
        }
    }

@app.post("/api/apply/start")
async def start_application(request: StartApplicationRequest, background_tasks: BackgroundTasks, http_request: Request):
    """
    Start automated job application process
    """
    # Rate limiting check
    client_ip = http_request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    # Basic user ID validation (should be UUID)
    try:
        uuid.UUID(request.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    if not application_agent:
        raise HTTPException(status_code=503, detail="Application agent not initialized")
    
    try:
        logger.info(f"🎯 Starting application for user {request.user_id}, job {request.job_id}")
        
        # Generate unique application ID
        application_id = str(uuid.uuid4())
        
        # Validate job exists and get job details
        job_data = await _get_job_data(request.job_id)
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Initialize application tracking
        await tracking_service.create_application_attempt({
            'id': application_id,
            'user_id': request.user_id,
            'job_id': request.job_id,
            'cv_choice': request.cv_choice,
            'cv_id': request.cv_id,
            'status': 'analyzing',
            'progress_percentage': 0,
            'current_step': 'Analyzing application form',
            'auto_submit': request.auto_submit,
            'created_at': datetime.utcnow().isoformat()
        })
        
        # Start application process in background
        background_tasks.add_task(
            _process_application,
            application_id,
            request,
            job_data
        )
        
        return {
            "status": "started",
            "application_id": application_id,
            "message": "Application process started. Use /api/apply/status to track progress."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start application: {str(e)}")

@app.get("/api/apply/status/{application_id}")
async def get_application_status(application_id: str) -> ApplicationStatusResponse:
    """
    Get real-time status of an application process
    """
    if not tracking_service:
        raise HTTPException(status_code=503, detail="Tracking service not initialized")
    
    try:
        status_data = await tracking_service.get_application_status(application_id)
        if not status_data:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return ApplicationStatusResponse(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get application status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.post("/api/apply/cv/upload")
async def upload_cv(
    user_id: str,
    cv_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload CV file for job applications
    """
    if not cv_selection_service:
        raise HTTPException(status_code=503, detail="CV service not initialized")
    
    try:
        logger.info(f"📄 Uploading CV for user {user_id}: {cv_file.filename}")
        
        # Security validation: file size limit (10MB max)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
        if cv_file.size and cv_file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds 10MB limit")
        
        # Security validation: file type
        allowed_types = {
            'application/pdf',
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        }
        if cv_file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Only PDF, Word documents, and text files are allowed")
        
        # Security validation: filename sanitization
        if not cv_file.filename or '..' in cv_file.filename or '/' in cv_file.filename or '\\' in cv_file.filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        # Additional security: check file extension matches content type
        allowed_extensions = {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        }
        file_extension = cv_file.filename.lower().split('.')[-1] if '.' in cv_file.filename else ''
        if not file_extension or f'.{file_extension}' not in allowed_extensions.get(cv_file.content_type, []):
            raise HTTPException(status_code=400, detail="File extension does not match content type")
        
        # Read file content
        cv_content = await cv_file.read()
        
        # Store CV using CV selection service
        cv_data = await cv_selection_service.store_uploaded_cv(
            user_id=user_id,
            filename=cv_file.filename,
            content=cv_content,
            content_type=cv_file.content_type
        )
        
        return {
            "status": "success",
            "cv_id": cv_data['id'],
            "filename": cv_data['filename'],
            "message": "CV uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CV upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"CV upload failed: {str(e)}")

@app.get("/api/apply/cv/list/{user_id}")
async def list_user_cvs(user_id: str):
    """
    List all CVs (generated and uploaded) for a user
    """
    if not cv_selection_service:
        raise HTTPException(status_code=503, detail="CV service not initialized")
    
    try:
        cvs = await cv_selection_service.list_user_cvs(user_id)
        return {
            "status": "success",
            "cvs": cvs
        }
        
    except Exception as e:
        logger.error(f"Failed to list CVs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list CVs: {str(e)}")

@app.get("/api/apply/history/{user_id}")
async def get_application_history(user_id: str) -> ApplicationHistoryResponse:
    """
    Get application history for a user
    """
    if not tracking_service:
        raise HTTPException(status_code=503, detail="Tracking service not initialized")
    
    try:
        history_data = await tracking_service.get_user_application_history(user_id)
        return ApplicationHistoryResponse(**history_data)
        
    except Exception as e:
        logger.error(f"Failed to get application history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")

@app.post("/api/apply/cancel/{application_id}")
async def cancel_application(application_id: str):
    """
    Cancel an ongoing application process
    """
    if not tracking_service:
        raise HTTPException(status_code=503, detail="Tracking service not initialized")
    
    try:
        await tracking_service.cancel_application(application_id)
        return {
            "status": "cancelled",
            "application_id": application_id,
            "message": "Application process cancelled"
        }
        
    except Exception as e:
        logger.error(f"Failed to cancel application: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel: {str(e)}")

# Background task functions
async def _process_application(application_id: str, request: StartApplicationRequest, job_data: Dict[str, Any]):
    """
    Background task to process the entire application workflow
    """
    try:
        logger.info(f"🔄 Processing application {application_id}")
        
        # Step 1: Analyze the application form
        await tracking_service.update_application_progress(
            application_id, 10, "Analyzing application form", "analyzing"
        )
        
        form_analysis = await application_agent.analyze_application_form(job_data['applicationUrl'])
        
        # Step 2: Prepare CV and data
        await tracking_service.update_application_progress(
            application_id, 30, "Preparing CV and application data", "preparing"
        )
        
        cv_data = await application_agent.prepare_cv_data(request)
        
        # Step 3: Fill the application form
        await tracking_service.update_application_progress(
            application_id, 60, "Filling application form", "filling"
        )
        
        filled_form = await application_agent.fill_application_form(
            form_analysis, cv_data, job_data
        )
        
        # Step 4: Review before submission (if not auto-submit)
        if not request.auto_submit:
            await tracking_service.update_application_progress(
                application_id, 90, "Ready for review - waiting for user confirmation", "reviewing"
            )
            await tracking_service.store_filled_form(application_id, filled_form)
        else:
            # Step 5: Submit application
            await tracking_service.update_application_progress(
                application_id, 90, "Submitting application", "submitting"
            )
            
            submission_result = await application_agent.submit_application(filled_form)
            
            if submission_result['success']:
                await tracking_service.update_application_progress(
                    application_id, 100, "Application submitted successfully", "submitted"
                )
            else:
                await tracking_service.update_application_progress(
                    application_id, 100, f"Submission failed: {submission_result['error']}", "failed"
                )
        
        logger.info(f"✅ Application {application_id} processed successfully")
        
    except Exception as e:
        logger.error(f"❌ Application processing failed for {application_id}: {e}")
        await tracking_service.update_application_progress(
            application_id, 100, f"Application failed: {str(e)}", "failed"
        )

async def _get_job_data(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get job data from localStorage or database
    """
    # For now, we'll assume job data comes from the frontend's localStorage
    # In a production system, this might come from a database
    
    # This is a placeholder - in reality, the frontend will pass job data
    # or we'll query it from a jobs database
    return {
        'id': job_id,
        'title': 'Software Engineer',
        'company': 'Example Company',
        'applicationUrl': 'https://example.com/apply',
        'description': 'Job description...',
        'requirements': ['Python', 'JavaScript']
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info"
    )