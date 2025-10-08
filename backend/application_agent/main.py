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
    from .enhanced_application_agent import EnhancedApplicationAgent
    from .enhanced_form_analysis_service import EnhancedFormAnalysisService
    from .enhanced_cv_selection_service import EnhancedCVSelectionService
    from .enhanced_browser_form_filler import EnhancedBrowserFormFiller
    from .enhanced_content_generation_service import EnhancedContentGenerationService
    from .application_tracking_service import ApplicationTrackingService
    from .cv_api_client import CVAPIClient
except ImportError:
    # Fall back to absolute imports (when run directly)
    from enhanced_application_agent import EnhancedApplicationAgent
    from enhanced_form_analysis_service import EnhancedFormAnalysisService
    from enhanced_cv_selection_service import EnhancedCVSelectionService
    from enhanced_browser_form_filler import EnhancedBrowserFormFiller
    from enhanced_content_generation_service import EnhancedContentGenerationService
    from application_tracking_service import ApplicationTrackingService
    from cv_api_client import CVAPIClient

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

# Global service instances - Enhanced LangChain services
application_agent: EnhancedApplicationAgent = None
form_analysis_service: EnhancedFormAnalysisService = None
cv_selection_service: EnhancedCVSelectionService = None
browser_form_filler: EnhancedBrowserFormFiller = None
content_generation_service: EnhancedContentGenerationService = None

# Shared service instances
cv_api_client: CVAPIClient = None
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

class GenerateJobCVRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    job_id: str = Field(..., description="Job ID for tracking")
    job_title: str = Field(..., description="Job title")
    job_description: str = Field(..., description="Job description")
    company_name: str = Field(..., description="Company name")
    template_id: str = Field(default="premium", description="CV template to use")

class ApplicationHistoryResponse(BaseModel):
    applications: List[Dict[str, Any]]
    total: int
    success_rate: float

async def setup_storage_buckets(supabase_client):
    """Setup required storage buckets for CV uploads"""
    try:
        logger.info("🗄️ Setting up storage buckets...")
        
        # Check if cv-files bucket exists
        try:
            buckets = supabase_client.storage.list_buckets()
            bucket_names = [bucket.name for bucket in buckets]
            
            if 'cv-files' not in bucket_names:
                logger.info("📁 Creating cv-files storage bucket...")
                
                # Create the bucket
                bucket_response = supabase_client.storage.create_bucket(
                    'cv-files',
                    options={
                        'public': False,  # Private bucket for security
                        'file_size_limit': 10 * 1024 * 1024,  # 10MB limit
                        'allowed_mime_types': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                    }
                )
                
                if bucket_response.get('error'):
                    logger.error(f"❌ Failed to create cv-files bucket: {bucket_response['error']}")
                else:
                    logger.info("✅ cv-files bucket created successfully")
                    
                    # Set bucket policies for authenticated users
                    await setup_bucket_policies(supabase_client)
            else:
                logger.info("✅ cv-files bucket already exists")
                
        except Exception as e:
            logger.error(f"❌ Error checking/creating storage buckets: {e}")
            logger.warning("⚠️ Please create the 'cv-files' bucket manually in Supabase Dashboard")
            logger.info("📝 Manual setup instructions:")
            logger.info("1. Go to Supabase Dashboard > Storage")
            logger.info("2. Create a new bucket named 'cv-files'")
            logger.info("3. Set it as private (not public)")
            logger.info("4. Set file size limit to 10MB")
            logger.info("5. Allow MIME types: PDF, DOC, DOCX")
            
    except Exception as e:
        logger.error(f"❌ Storage setup failed: {e}")

async def setup_bucket_policies(supabase_client):
    """Setup RLS policies for cv-files bucket"""
    try:
        logger.info("🔐 Setting up bucket policies...")
        
        # Note: Bucket policies are typically set through SQL or Dashboard
        # The Python client doesn't have direct policy creation methods
        logger.info("⚠️ Bucket policies should be set manually in Supabase Dashboard")
        logger.info("📝 Required policies for cv-files bucket:")
        logger.info("- INSERT: Allow authenticated users to upload files")
        logger.info("- SELECT: Allow users to view their own files")
        logger.info("- DELETE: Allow users to delete their own files")
        
    except Exception as e:
        logger.error(f"❌ Policy setup failed: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup with enhanced LangChain capabilities"""
    global application_agent, form_analysis_service, cv_selection_service, \
           browser_form_filler, content_generation_service, \
           tracking_service, supabase_client, cv_api_client
    
    logger.info("🚀 Starting Enhanced Application Agent API with LangChain")
    
    try:
        # Initialize Supabase client
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            logger.info("📊 Initializing Supabase client...")
            supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
            
            # Setup storage buckets
            await setup_storage_buckets(supabase_client)
            
            # Test Supabase connection
            try:
                test_response = supabase_client.table('users').select('id').limit(1).execute()
                logger.info("✅ Supabase connection verified")
            except Exception as db_error:
                logger.error(f"❌ Supabase connection test failed: {db_error}")
                # Continue anyway - some operations might still work
            
            logger.info("✅ Supabase client initialized")
        else:
            logger.error("❌ Missing Supabase credentials")
            raise ValueError("Supabase credentials are required")
        
        # Initialize CV API client
        logger.info("🔗 Initializing CV API client...")
        cv_api_client = CVAPIClient()
        logger.info("✅ CV API client initialized")
        
        # Initialize tracking service (shared between legacy and enhanced)
        logger.info("📊 Initializing tracking service...")
        tracking_service = ApplicationTrackingService(supabase_client)
        logger.info("✅ Tracking service initialized")
        
        # Initialize enhanced services
        logger.info("🧠 Initializing Enhanced LangChain Services...")
        
        # Enhanced Form Analysis Service
        logger.info("🔍 Initializing Enhanced Form Analysis Service...")
        form_analysis_service = EnhancedFormAnalysisService(OPENAI_API_KEY)
        logger.info("✅ Enhanced Form Analysis Service initialized")
        
        # Enhanced CV Selection Service
        logger.info("📄 Initializing Enhanced CV Selection Service...")
        cv_selection_service = EnhancedCVSelectionService(supabase_client, OPENAI_API_KEY)
        logger.info("✅ Enhanced CV Selection Service initialized")
        
        # Enhanced Browser Form Filler
        logger.info("🖥️ Initializing Enhanced Browser Form Filler...")
        browser_form_filler = EnhancedBrowserFormFiller(OPENAI_API_KEY)
        logger.info("✅ Enhanced Browser Form Filler initialized")
        
        # Enhanced Content Generation Service
        logger.info("✍️ Initializing Enhanced Content Generation Service...")
        content_generation_service = EnhancedContentGenerationService(OPENAI_API_KEY)
        logger.info("✅ Enhanced Content Generation Service initialized")
        
        # Enhanced Application Agent (orchestrator)
        logger.info("🤖 Initializing Enhanced Application Agent...")
        application_agent = EnhancedApplicationAgent(
            form_analysis_service=form_analysis_service,
            cv_selection_service=cv_selection_service,
            browser_form_filler=browser_form_filler,
            content_generation_service=content_generation_service,
            tracking_service=tracking_service,
            openai_api_key=OPENAI_API_KEY
        )
        logger.info("✅ Enhanced Application Agent initialized")
        
        logger.info("🎉 Enhanced Application Agent API startup complete - LangChain services active")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        logger.error(f"🔍 Error type: {type(e)}")
        import traceback
        logger.error(f"🔍 Full traceback: {traceback.format_exc()}")
        raise

@app.get("/health")
async def health_check():
    """Enhanced health check endpoint with LangChain service status"""
    
    # Service status
    services = {
        "application_agent": "active" if application_agent else "inactive",
        "form_analysis": "active" if form_analysis_service else "inactive",
        "cv_selection": "active" if cv_selection_service else "inactive",
        "browser_filler": "active" if browser_form_filler else "inactive",
        "content_generation": "active" if content_generation_service else "inactive",
        "tracking": "active" if tracking_service else "inactive",
        "supabase": "connected" if supabase_client else "disconnected",
        "cv_api_client": "active" if cv_api_client else "inactive"
    }
    
    return {
        "status": "healthy",
        "service": "enhanced-application-agent",
        "version": "2.0.0",
        "langchain_enabled": True,
        "services": services,
        "message": "Enhanced Application Agent API with LangChain is running"
    }
    
    # Legacy services status
    legacy_services = {
        "legacy_application_agent": "active" if application_agent else "inactive",
        "legacy_form_analysis": "active" if form_analysis_service else "inactive",
        "legacy_cv_selection": "active" if cv_selection_service else "inactive"
    }
    
    # Get performance statistics from enhanced services
    performance_stats = {}
    if USE_ENHANCED_SERVICES and enhanced_application_agent:
        try:
            performance_stats = enhanced_application_agent.get_orchestration_stats()
        except:
            pass
    
    return {
        "status": "healthy",
        "service": "enhanced-application-agent" if USE_ENHANCED_SERVICES else "application-agent",
        "version": "2.0.0" if USE_ENHANCED_SERVICES else "1.0.0",
        "enhanced_mode": USE_ENHANCED_SERVICES,
        "langchain_enabled": USE_ENHANCED_SERVICES,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            **base_services,
            **enhanced_services,
            **legacy_services
        },
        "performance": performance_stats
    }

@app.post("/api/apply/start")
async def start_application(request: StartApplicationRequest, background_tasks: BackgroundTasks, http_request: Request):
    """
    Start automated job application process
    """
    logger.info(f"🎯 Received application request for user {request.user_id}, job {request.job_id}")
    
    # Rate limiting check
    client_ip = http_request.client.host
    if not check_rate_limit(client_ip):
        logger.warning(f"⚠️ Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    # Basic user ID validation (should be UUID)
    try:
        uuid.UUID(request.user_id)
    except ValueError:
        logger.error(f"❌ Invalid user ID format: {request.user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if services are initialized
    if not application_agent:
        logger.error("❌ Application agent not initialized")
        raise HTTPException(status_code=503, detail="Application agent not initialized")
    
    if not tracking_service:
        logger.error("❌ Tracking service not initialized")
        raise HTTPException(status_code=503, detail="Tracking service not initialized")
    
    try:
        logger.info(f"🎯 Starting application for user {request.user_id}, job {request.job_id}")
        logger.info(f"📋 Request details: CV choice={request.cv_choice}, CV ID={request.cv_id}, Auto-submit={request.auto_submit}")
        
        # Generate unique application ID
        application_id = str(uuid.uuid4())
        logger.info(f"🆔 Generated application ID: {application_id}")
        
        # Validate job exists and get job details
        logger.info(f"🔍 Getting job data for job_id: {request.job_id}")
        job_data = await _get_job_data(request.job_id)
        if not job_data:
            logger.error(f"❌ Job not found: {request.job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.info(f"✅ Job data retrieved: {job_data.get('title', 'Unknown')} at {job_data.get('company', 'Unknown')}")
        
        # Prepare application attempt data
        application_data = {
            'id': application_id,
            'user_id': request.user_id,
            'job_id': request.job_id,
            'cv_choice': request.cv_choice,
            'cv_id': request.cv_id,
            'uploaded_cv_path': request.uploaded_cv_path,
            'status': 'analyzing',
            'progress_percentage': 0,
            'current_step': 'Analyzing application form',
            'auto_submit': request.auto_submit,
            'created_at': datetime.utcnow().isoformat()
        }
        
        logger.info(f"💾 Creating application attempt record...")
        
        # Initialize application tracking
        await tracking_service.create_application_attempt(application_data)
        logger.info(f"✅ Application attempt record created successfully")
        
        # Start application process in background
        logger.info(f"🚀 Starting background application process with Enhanced LangChain Agent...")
        background_tasks.add_task(
            _process_application,
            application_id,
            request,
            job_data,
            application_agent
        )
        
        logger.info(f"✅ Application process started successfully - ID: {application_id}")
        
        return {
            "status": "started",
            "application_id": application_id,
            "message": "Application process started. Use /api/apply/status to track progress."
        }
        
    except HTTPException as http_error:
        logger.error(f"❌ HTTP Exception in start_application: {http_error.detail}")
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in start_application: {e}")
        logger.error(f"🔍 Error type: {type(e)}")
        import traceback
        logger.error(f"🔍 Full traceback: {traceback.format_exc()}")
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

@app.post("/api/apply/cv/generate")
async def generate_job_specific_cv(request: GenerateJobCVRequest):
    """
    Generate a CV tailored for a specific job using CV API
    """
    # Validate user_id format
    try:
        uuid.UUID(request.user_id)
    except ValueError:
        logger.error(f"❌ Invalid user ID format: {request.user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    if not cv_api_client:
        raise HTTPException(status_code=503, detail="CV API client not initialized")
    
    try:
        logger.info(f"🎯 Generating job-specific CV for user {request.user_id}, job {request.job_id}")
        
        # Check if CV API is available
        if not await cv_api_client.health_check():
            raise HTTPException(status_code=503, detail="CV generation service is not available")
        
        # Call CV API to generate job-specific CV
        result = await cv_api_client.generate_job_specific_cv(
            user_id=request.user_id,
            job_id=request.job_id,
            job_title=request.job_title,
            job_description=request.job_description,
            company_name=request.company_name,
            template_id=request.template_id
        )
        
        if result['success']:
            logger.info(f"✅ CV generation successful: {result['cv_id']}")
            return {
                "status": "success",
                "cv_id": result['cv_id'],
                "pdf_url": result['pdf_url'],
                "processing_time": result.get('processing_time', 0),
                "message": f"CV generated successfully for {request.company_name} position"
            }
        else:
            logger.error(f"❌ CV generation failed: {result['error']}")
            raise HTTPException(status_code=500, detail=result['error'])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ CV generation request failed: {e}")
        raise HTTPException(status_code=500, detail=f"CV generation failed: {str(e)}")

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
        cv_data = await cv_file.read()
        
        # Store CV using CV selection service
        cv_record = await cv_selection_service.store_uploaded_cv(
            user_id=user_id,
            filename=cv_file.filename,
            content=cv_data,
            content_type=cv_file.content_type
        )
        
        return {
            "status": "success",
            "cv_id": cv_record['id'],
            "filename": cv_record['filename'],
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
    List all CVs (generated and uploaded) for a user using enhanced services
    """
    # Validate user_id format
    try:
        uuid.UUID(user_id)
    except ValueError:
        logger.error(f"❌ Invalid user ID format: {user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Use enhanced service if available, otherwise fallback to legacy
    active_cv_service = enhanced_cv_selection_service if USE_ENHANCED_SERVICES and enhanced_cv_selection_service else cv_selection_service
    
    if not active_cv_service:
        raise HTTPException(status_code=503, detail="CV service not initialized")
    
    try:
        logger.info(f"🔍 API endpoint called for user: {user_id} ({'enhanced' if USE_ENHANCED_SERVICES else 'legacy'} service)")
        cvs = await active_cv_service.list_user_cvs(user_id)
        logger.info(f"✅ API returning {len(cvs)} CVs")
        return {
            "status": "success",
            "cvs": cvs,
            "service_type": "enhanced" if USE_ENHANCED_SERVICES and enhanced_cv_selection_service else "legacy"
        }
        
    except Exception as e:
        logger.error(f"Failed to list CVs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list CVs: {str(e)}")

@app.get("/debug/cv_generations/{user_id}")
async def debug_cv_generations(user_id: str):
    """
    Debug endpoint to check cv_generations table directly
    """
    # Validate user_id format
    try:
        uuid.UUID(user_id)
    except ValueError:
        logger.error(f"❌ Invalid user ID format: {user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    try:
        logger.info(f"🔍 Debug: Checking cv_generations for user: {user_id}")
        
        # Direct query to see what's in the database
        response = supabase_client.table('cv_generations').select('*').execute()
        
        logger.info(f"🔍 Debug: All cv_generations records: {response.data}")
        
        # Filter for specific user
        user_cvs = [cv for cv in response.data if cv.get('user_id') == user_id]
        
        return {
            "status": "debug",
            "user_id": user_id,
            "total_records": len(response.data),
            "user_records": len(user_cvs),
            "all_records": response.data,
            "user_cvs": user_cvs
        }
    except Exception as e:
        logger.error(f"Debug query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Debug query failed: {str(e)}")

@app.get("/api/apply/history/{user_id}")
async def get_application_history(user_id: str) -> ApplicationHistoryResponse:
    """
    Get application history for a user
    """
    # Validate user_id format
    try:
        uuid.UUID(user_id)
    except ValueError:
        logger.error(f"❌ Invalid user ID format: {user_id}")
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
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

@app.get("/api/enhanced/stats")
async def get_enhanced_service_stats():
    """
    Get statistics from all enhanced services
    """
    if not USE_ENHANCED_SERVICES:
        return {
            "status": "disabled",
            "message": "Enhanced services are not enabled"
        }
    
    stats = {
        "enhanced_mode": USE_ENHANCED_SERVICES,
        "langchain_enabled": True,
        "services": {}
    }
    
    try:
        # Form Analysis Service Stats
        if enhanced_form_analysis_service:
            stats["services"]["form_analysis"] = enhanced_form_analysis_service.get_analysis_stats()
        
        # CV Selection Service Stats
        if enhanced_cv_selection_service:
            stats["services"]["cv_mapping"] = enhanced_cv_selection_service.get_mapping_stats()
        
        # Browser Form Filler Stats
        if enhanced_browser_form_filler:
            stats["services"]["form_filling"] = enhanced_browser_form_filler.get_filling_stats()
        
        # Content Generation Service Stats
        if enhanced_content_generation_service:
            stats["services"]["content_generation"] = enhanced_content_generation_service.get_generation_stats()
        
        # Application Agent Orchestration Stats
        if enhanced_application_agent:
            stats["services"]["orchestration"] = enhanced_application_agent.get_orchestration_stats()
        
        stats["total_services"] = len(stats["services"])
        stats["timestamp"] = datetime.utcnow().isoformat()
        
        return {
            "status": "success",
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Failed to get enhanced stats: {e}")
        return {
            "status": "error",
            "error": str(e),
            "enhanced_mode": USE_ENHANCED_SERVICES
        }

@app.post("/api/enhanced/cover-letter")
async def generate_enhanced_cover_letter(
    cv_data: Dict[str, Any],
    job_data: Dict[str, Any],
    user_instructions: Optional[str] = None
):
    """
    Generate enhanced cover letter using LangChain content generation
    """
    if not USE_ENHANCED_SERVICES or not enhanced_content_generation_service:
        raise HTTPException(status_code=503, detail="Enhanced content generation service not available")
    
    try:
        result = await enhanced_content_generation_service.generate_job_specific_cover_letter(
            cv_data=cv_data,
            job_data=job_data,
            user_instructions=user_instructions
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Enhanced cover letter generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

# Background task functions
async def _process_application(
    application_id: str, 
    request: StartApplicationRequest, 
    job_data: Dict[str, Any], 
    agent: EnhancedApplicationAgent
) -> None:
    """
    Enhanced background task to process the entire application workflow using LangChain
    """
    try:
        logger.info(f"🧠 Processing application {application_id} with Enhanced LangChain Agent")
        
        # Execute complete application workflow
        result = await agent.process_complete_application(
            application_id=application_id,
            user_id=request.user_id,
            job_data=job_data,
            cv_choice=request.cv_choice,
            cv_id=request.cv_id,
            uploaded_cv_path=request.uploaded_cv_path,
            cover_letter_prompt=request.cover_letter_prompt,
            auto_submit=request.auto_submit
        )
        
        if result.get('success', False):
            logger.info(f"✅ Enhanced application {application_id} processed successfully")
        else:
            logger.error(f"❌ Enhanced application {application_id} processing failed: {result.get('error', 'Unknown error')}")
        
    except Exception as e:
        logger.error(f"❌ Enhanced application processing failed for {application_id}: {e}")
        await tracking_service.update_application_progress(
            application_id, 100, f"Enhanced application failed: {str(e)}", "failed"
        )


async def _get_job_data(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get job data from the database
    """
    try:
        logger.info(f"🔍 Looking up job data for job_id: {job_id}")
        
        # Query the job_listings table for real job data
        response = supabase_client.table('job_listings').select(
            'id, title, description, requirements, location, salary_range, '
            'job_type, remote_option, external_url, posted_date, company_id'
        ).eq('id', job_id).execute()
        
        if not response.data:
            logger.warning(f"⚠️ Job not found in database: {job_id}")
            return None
        
        job_record = response.data[0]
        
        # Get company information
        company_data = None
        if job_record.get('company_id'):
            company_response = supabase_client.table('companies').select(
                'name, website, description'
            ).eq('id', job_record['company_id']).execute()
            
            if company_response.data:
                company_data = company_response.data[0]
        
        # Structure job data for application agent
        job_data = {
            'id': job_record['id'],
            'title': job_record.get('title', 'Unknown Position'),
            'company': company_data.get('name', 'Unknown Company') if company_data else 'Unknown Company',
            'applicationUrl': job_record.get('external_url', ''),  # This is the key field
            'description': job_record.get('description', ''),
            'requirements': job_record.get('requirements', '').split('\n') if job_record.get('requirements') else [],
            'location': job_record.get('location', 'Not specified'),
            'salary_range': job_record.get('salary_range'),
            'job_type': job_record.get('job_type'),
            'remote_option': job_record.get('remote_option'),
            'posted_date': job_record.get('posted_date'),
            'company_website': company_data.get('website') if company_data else None,
            'company_description': company_data.get('description') if company_data else None
        }
        
        if not job_data['applicationUrl']:
            logger.warning(f"⚠️ No application URL found for job {job_id}")
            return None
        
        logger.info(f"✅ Retrieved job data: {job_data['title']} at {job_data['company']}")
        logger.info(f"🔗 Application URL: {job_data['applicationUrl']}")
        
        return job_data
        
    except Exception as e:
        logger.error(f"❌ Failed to get job data for {job_id}: {e}")
        return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info"
    )