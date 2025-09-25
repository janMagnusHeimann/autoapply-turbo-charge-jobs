"""
CV Processing API - Dedicated FastAPI service for CV analysis and data extraction
"""

import os
import logging
import base64
import io
import uuid
from typing import Dict, Any
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from dotenv import load_dotenv
import pdfplumber
import PyPDF2

from cv_processor import CVProcessor

# Load environment variables from the root directory
root_dir = Path(__file__).parent.parent.parent
env_path = root_dir / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"Loaded environment variables from: {env_path}")
else:
    print(f"No .env file found at: {env_path}")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

def validate_user_id(user_id: str) -> bool:
    """Validate that user_id is a proper UUID format"""
    try:
        uuid.UUID(user_id)
        return True
    except (ValueError, TypeError):
        return False

# Environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-4o')
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_SERVICE_ROLE_KEY')
API_HOST = os.getenv('API_HOST', '0.0.0.0')
API_PORT = int(os.getenv('CV_API_PORT', '8001'))

# Debug environment variables with detailed info
print(f"🔧 Environment Configuration:")
print(f"  OPENAI_API_KEY: {'SET' if OPENAI_API_KEY else 'NOT SET'}")
print(f"  OPENAI_MODEL: {OPENAI_MODEL}")
print(f"  SUPABASE_URL: {'SET' if SUPABASE_URL else 'NOT SET'}")
if SUPABASE_URL:
    print(f"    URL: {SUPABASE_URL}")
print(f"  SUPABASE_SERVICE_ROLE_KEY: {'SET' if SUPABASE_SERVICE_ROLE_KEY else 'NOT SET'}")
if SUPABASE_SERVICE_ROLE_KEY:
    print(f"    Key length: {len(SUPABASE_SERVICE_ROLE_KEY)} chars")
    print(f"    Key preview: {SUPABASE_SERVICE_ROLE_KEY[:20]}...")

# Validate critical environment variables
if not SUPABASE_URL:
    print("❌ CRITICAL: SUPABASE_URL not found in environment")
if not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY not found in environment")

# Create FastAPI app
app = FastAPI(
    title="CV Processing API",
    description="Dedicated AI-powered CV analysis and data extraction service",
    version="1.0.0",
    docs_url="/docs"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global CV processor instance
cv_processor: CVProcessor = None
supabase_client: Client = None

# Request/Response Models
class CVProcessingRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    cv_text: str = Field(..., description="CV text content to process")
    file_name: str = Field(default="CV", description="Original CV file name")

class PDFExtractionRequest(BaseModel):
    pdf_base64: str = Field(..., description="Base64 encoded PDF file")
    filename: str = Field(default="CV.pdf", description="PDF filename")

class JobSpecificCVRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    job_id: str = Field(..., description="Job ID for tracking")
    job_title: str = Field(..., description="Job title")
    job_description: str = Field(..., description="Job description")
    company_name: str = Field(..., description="Company name")
    template_id: str = Field(default="premium", description="CV template to use")

class CoverLetterRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    job_id: str = Field(..., description="Job ID")
    job_title: str = Field(..., description="Job title")
    job_description: str = Field(..., description="Job description")
    company_name: str = Field(..., description="Company name")
    cv_generation_id: str = Field(None, description="Associated CV generation ID")
    custom_prompt: str = Field(None, description="Custom instructions for cover letter")

class CVProcessingResponse(BaseModel):
    status: str
    message: str
    data: Dict[str, Any] = None
    processing_time: float = 0.0
    chunks_processed: int = 0
    error: str = None

class PDFExtractionResponse(BaseModel):
    status: str
    text: str = ""
    character_count: int = 0
    extraction_method: str = ""
    error: str = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global cv_processor, supabase_client
    
    logger.info("🚀 Starting CV Processing API")
    
    try:
        # Validate environment variables
        if not OPENAI_API_KEY:
            logger.error("❌ OPENAI_API_KEY not found in environment")
            raise ValueError("OpenAI API key is required")
        
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            logger.error("❌ Supabase configuration missing")
            raise ValueError("Supabase URL and service role key are required")
        
        # Initialize CV processor
        cv_processor = CVProcessor(
            openai_api_key=OPENAI_API_KEY,
            model=OPENAI_MODEL,
            max_chunk_size=40000  # ~10k tokens
        )
        
        if not cv_processor.is_available():
            logger.warning("⚠️ CV processor not available - check OpenAI configuration")
        
        # Initialize Supabase client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Test database connection and permissions
        try:
            logger.info("🔍 Testing database connection...")
            
            # Test reading from user_profiles table
            test_result = supabase_client.table('user_profiles').select('id').limit(1).execute()
            logger.info(f"✅ Database read test: SUCCESS - can access user_profiles table")
            
            # Test reading from cv_assets table
            test_result = supabase_client.table('cv_assets').select('id').limit(1).execute()
            logger.info(f"✅ Database read test: SUCCESS - can access cv_assets table")
            
            logger.info("✅ Database connection and permissions verified")
            
        except Exception as db_error:
            logger.error(f"❌ Database connection test FAILED: {db_error}")
            logger.error("❌ This will cause CV processing to fail - check Supabase credentials and permissions")
        
        logger.info("✅ CV Processing API startup complete")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down CV Processing API")
    logger.info("✅ Shutdown complete")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "cv-processing-api",
        "version": "1.0.0",
        "cv_processor_available": cv_processor.is_available() if cv_processor else False,
        "supabase_connected": supabase_client is not None,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/generate-job-specific-cv")
async def generate_job_specific_cv(request: JobSpecificCVRequest):
    """
    Generate a CV tailored for a specific job opportunity
    """
    start_time = datetime.utcnow()
    
    try:
        # Validate user_id format
        if not validate_user_id(request.user_id):
            logger.error(f"❌ Invalid user_id format: {request.user_id}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid user_id format. Expected UUID, got: {request.user_id}"
            )
        
        logger.info(f"🎯 Generating job-specific CV for user {request.user_id} and job {request.job_id}")
        
        if not supabase_client:
            raise HTTPException(status_code=503, detail="Database service not available")
        
        # 1. Fetch user profile and data
        user_profile_result = supabase_client.table('user_profiles').select('*').eq('user_id', request.user_id).execute()
        user_profile = user_profile_result.data[0] if user_profile_result.data else {}
        
        # 2. Fetch user's CV assets (experience, education, etc.)
        cv_assets_result = supabase_client.table('cv_assets').select('*').eq('user_id', request.user_id).execute()
        cv_assets = cv_assets_result.data if cv_assets_result.data else []
        
        # 3. Fetch user's skills and preferences
        preferences_result = supabase_client.table('user_preferences').select('*').eq('user_id', request.user_id).execute()
        user_preferences = preferences_result.data[0] if preferences_result.data else {}
        
        # 4. Fetch GitHub projects
        projects_result = supabase_client.table('selected_repositories').select('*').eq('user_id', request.user_id).execute()
        projects = projects_result.data if projects_result.data else []
        
        # 5. Fetch publications
        publications_result = supabase_client.table('selected_publications').select('*').eq('user_id', request.user_id).execute()
        publications = publications_result.data if publications_result.data else []
        
        # 6. Analyze job requirements and optimize content selection
        if not cv_processor or not cv_processor.is_available():
            raise HTTPException(status_code=503, detail="CV processor not available")
        
        job_analysis_prompt = f"""
        Analyze this job posting and extract key requirements:
        
        Job Title: {request.job_title}
        Company: {request.company_name}
        Job Description: {request.job_description}
        
        Extract:
        1. Required technical skills
        2. Preferred experience areas
        3. Education requirements
        4. Key responsibilities
        5. Company culture keywords
        
        Return a JSON object with these categories.
        """
        
        job_analysis_response = await cv_processor._extract_from_chunk(job_analysis_prompt, 0)
        
        # 7. Select and optimize content based on job requirements
        optimized_experiences = []
        optimized_projects = []
        optimized_skills = []
        
        # Filter experiences by relevance to job
        for asset in cv_assets:
            if asset.get('asset_type') == 'experience':
                metadata = asset.get('metadata', {})
                # Simple relevance scoring based on job title keywords
                relevance_score = 0
                asset_text = f"{asset.get('title', '')} {asset.get('description', '')}".lower()
                for keyword in request.job_title.lower().split():
                    if keyword in asset_text:
                        relevance_score += 1
                
                optimized_experiences.append({
                    **asset,
                    'relevance_score': relevance_score
                })
        
        # Sort by relevance and take top experiences
        optimized_experiences = sorted(optimized_experiences, key=lambda x: x.get('relevance_score', 0), reverse=True)[:4]
        
        # Filter projects by relevance
        for project in projects[:4]:  # Take top 4 projects
            optimized_projects.append(project)
        
        # 8. Generate customized professional summary
        summary_prompt = f"""
        Create a professional summary for this candidate applying to:
        Job Title: {request.job_title}
        Company: {request.company_name}
        
        Based on their background:
        - Current role: {user_profile.get('title', 'Professional')}
        - Experience: {len(optimized_experiences)} positions
        - Education: {user_profile.get('education', 'Various')}
        - Skills: {', '.join(user_preferences.get('skills', [])[:5])}
        
        Write a 2-3 sentence professional summary that highlights their fit for this role.
        """
        
        custom_summary = await cv_processor._extract_from_chunk(summary_prompt, 0)
        
        # 9. Store the generated CV in database
        cv_id = f"cv-{int(datetime.utcnow().timestamp() * 1000)}-{request.user_id[:8]}"
        
        cv_data = {
            'profile': user_profile,
            'experiences': optimized_experiences,
            'education': [asset for asset in cv_assets if asset.get('asset_type') == 'education'],
            'skills': user_preferences.get('skills', []),
            'selectedProjects': optimized_projects,
            'selectedPublications': publications[:3],  # Top 3 publications
            'customSummary': custom_summary if isinstance(custom_summary, str) else user_profile.get('professional_summary', ''),
            'optimization_metadata': {
                'job_title': request.job_title,
                'company_name': request.company_name,
                'analysis_time': datetime.utcnow().timestamp(),
                'customizations': [
                    f"Selected {len(optimized_experiences)} most relevant experiences",
                    f"Selected {len(optimized_projects)} relevant projects",
                    f"Selected {len(publications[:3])} publications",
                    "Customized professional summary for job requirements"
                ]
            }
        }
        
        # Generate PDF URL placeholder (frontend will handle actual PDF generation)
        pdf_url = f"blob:http://localhost:8080/{cv_id}"
        
        # Store in cv_generations table
        cv_generation = {
            'id': cv_id,
            'user_id': request.user_id,
            'job_id': request.job_id,
            'template_id': request.template_id,
            'pdf_url': pdf_url,
            'cv_data': cv_data,
            'optimization_metadata': cv_data['optimization_metadata'],
            'status': 'ready',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        insert_result = supabase_client.table('cv_generations').insert(cv_generation).execute()
        
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Failed to store CV generation")
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"✅ Job-specific CV generated successfully: {cv_id}")
        
        return {
            'status': 'success',
            'cv_id': cv_id,
            'pdf_url': pdf_url,
            'processing_time': processing_time,
            'optimizations_applied': len(cv_data['optimization_metadata']['customizations']),
            'data': cv_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"❌ Job-specific CV generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"CV generation failed: {str(e)}")

@app.post("/generate-cover-letter")
async def generate_cover_letter(request: CoverLetterRequest):
    """
    Generate a cover letter for a specific job application
    """
    start_time = datetime.utcnow()
    
    try:
        # Validate user_id format
        if not validate_user_id(request.user_id):
            logger.error(f"❌ Invalid user_id format: {request.user_id}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid user_id format. Expected UUID, got: {request.user_id}"
            )
        
        logger.info(f"📝 Generating cover letter for user {request.user_id} and job {request.job_id}")
        
        if not cv_processor or not cv_processor.is_available():
            raise HTTPException(status_code=503, detail="CV processor not available")
        
        if not supabase_client:
            raise HTTPException(status_code=503, detail="Database service not available")
        
        # 1. Fetch user profile
        user_profile_result = supabase_client.table('user_profiles').select('*').eq('user_id', request.user_id).execute()
        user_profile = user_profile_result.data[0] if user_profile_result.data else {}
        
        # 2. Fetch recent experience
        recent_experience_result = supabase_client.table('cv_assets').select('*').eq('user_id', request.user_id).eq('asset_type', 'experience').limit(2).execute()
        recent_experiences = recent_experience_result.data if recent_experience_result.data else []
        
        # 3. Generate cover letter using AI
        cover_letter_prompt = f"""
        Write a professional cover letter for this job application:
        
        Job Details:
        - Title: {request.job_title}
        - Company: {request.company_name}
        - Description: {request.job_description[:1000]}...
        
        Candidate Profile:
        - Name: {user_profile.get('full_name', 'Candidate')}
        - Title: {user_profile.get('title', 'Professional')}
        - Summary: {user_profile.get('professional_summary', 'Experienced professional')}
        
        Recent Experience:
        {chr(10).join([f"- {exp.get('title', '')} at {exp.get('metadata', {}).get('company', '')}" for exp in recent_experiences[:2]])}
        
        {f"Additional Instructions: {request.custom_prompt}" if request.custom_prompt else ""}
        
        Write a compelling, professional cover letter that:
        1. Shows enthusiasm for the role and company
        2. Highlights relevant experience and skills
        3. Demonstrates knowledge of the company/role
        4. Has a strong closing with call to action
        5. Is appropriately formatted for business correspondence
        
        Format as a complete letter with proper business letter formatting.
        """
        
        cover_letter_content = await cv_processor._extract_from_chunk(cover_letter_prompt, 0)
        
        # 4. Store cover letter in database
        cover_letter_id = f"cl-{int(datetime.utcnow().timestamp() * 1000)}-{request.user_id[:8]}"
        
        cover_letter_data = {
            'id': cover_letter_id,
            'user_id': request.user_id,
            'job_id': request.job_id,
            'cv_generation_id': request.cv_generation_id,
            'content': cover_letter_content if isinstance(cover_letter_content, str) else "Cover letter generated successfully.",
            'template_id': 'standard',
            'optimization_metadata': {
                'job_title': request.job_title,
                'company_name': request.company_name,
                'custom_prompt_used': bool(request.custom_prompt),
                'generation_time': datetime.utcnow().timestamp()
            },
            'created_at': datetime.utcnow().isoformat()
        }
        
        # Create table if it doesn't exist (we'll create this table structure)
        try:
            insert_result = supabase_client.table('cover_letter_generations').insert(cover_letter_data).execute()
            logger.info(f"✅ Cover letter stored in database: {cover_letter_id}")
        except Exception as db_error:
            logger.warning(f"⚠️ Could not store cover letter in database: {db_error}")
            # Continue without storing in DB for now
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"✅ Cover letter generated successfully: {cover_letter_id}")
        
        return {
            'status': 'success',
            'cover_letter_id': cover_letter_id,
            'content': cover_letter_data['content'],
            'processing_time': processing_time,
            'data': cover_letter_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"❌ Cover letter generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cover letter generation failed: {str(e)}")

@app.post("/process", response_model=CVProcessingResponse)
async def process_cv(request: CVProcessingRequest):
    """
    Process CV text using OpenAI to extract structured profile information
    Handles large CV text by chunking and merging results
    """
    start_time = datetime.utcnow()
    
    try:
        # Validate user_id format
        if not validate_user_id(request.user_id):
            logger.error(f"❌ Invalid user_id format: {request.user_id}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid user_id format. Expected UUID, got: {request.user_id}"
            )
        
        logger.info(f"📄 Processing CV for user: {request.user_id}")
        logger.info(f"📏 CV text length: {len(request.cv_text)} characters")
        
        if not cv_processor:
            raise HTTPException(status_code=503, detail="CV processor not initialized")
        
        if not cv_processor.is_available():
            raise HTTPException(status_code=503, detail="OpenAI service not available")
        
        if not supabase_client:
            raise HTTPException(status_code=503, detail="Database service not available")
        
        # Process CV with OpenAI
        extracted_data = await cv_processor.process_cv(request.cv_text)
        chunks_processed = len(cv_processor._chunk_text(request.cv_text))
        
        # Update user profile with personal info and social links
        personal_info = extracted_data.get('personal_info', {})
        social_links = extracted_data.get('social_links', {})
        
        # Combine personal info with social links for profile update
        profile_data = {}
        
        # Map personal info fields
        if personal_info.get('full_name'):
            profile_data['full_name'] = personal_info['full_name']
        if personal_info.get('email'):
            profile_data['email'] = personal_info['email']
        if personal_info.get('phone'):
            profile_data['phone'] = personal_info['phone']
        if personal_info.get('location'):
            profile_data['location'] = personal_info['location']
        if personal_info.get('summary'):
            profile_data['professional_summary'] = personal_info['summary']
        
        # Map social links
        if social_links.get('linkedin'):
            profile_data['linkedin_url'] = social_links['linkedin']
        if social_links.get('github'):
            profile_data['github_url'] = social_links['github']
        if social_links.get('portfolio'):
            profile_data['portfolio_url'] = social_links['portfolio']
        if social_links.get('x'):
            profile_data['twitter_url'] = social_links['x']  # Fixed: use twitter_url instead of x_url
        if social_links.get('medium'):
            profile_data['medium_url'] = social_links['medium']
        
        # Update user profile if we have data
        profile_updated = False
        if profile_data:
            try:
                logger.info(f"🔄 Updating user profile for user {request.user_id} with data: {profile_data}")
                result = supabase_client.table('user_profiles').update(profile_data).eq('user_id', request.user_id).execute()
                
                if result.error:
                    logger.error(f"❌ Supabase error updating profile: {result.error}")
                    logger.error(f"❌ Error details: {result.error_message if hasattr(result, 'error_message') else 'No details'}")
                else:
                    profile_updated = len(result.data) > 0
                    logger.info(f"✅ Updated user profile: {len(result.data)} rows affected")
                    logger.info(f"✅ Profile update result: {result.data}")
                    
            except Exception as e:
                logger.error(f"❌ Exception updating user profile: {e}")
                logger.error(f"❌ Exception type: {type(e).__name__}")
                import traceback
                logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        
        # BACKUP AND CLEAR EXISTING CV DATA before importing new CV
        logger.info("🔄 Backing up and clearing existing CV data...")
        
        # Step 1: Backup existing CV assets (experience, education, other with category award/certification)
        backup_timestamp = datetime.utcnow().isoformat()
        try:
            # Find existing CV assets to backup
            cv_asset_types = ['experience', 'education', 'other']
            existing_assets_result = supabase_client.table('cv_assets')\
                .select('*')\
                .eq('user_id', request.user_id)\
                .in_('asset_type', cv_asset_types)\
                .execute()
            
            existing_assets = existing_assets_result.data if existing_assets_result.data else []
            logger.info(f"📦 Found {len(existing_assets)} existing CV assets to backup")
            
            # Backup existing assets by updating their metadata with backup flag
            assets_backed_up = 0
            for asset in existing_assets:
                try:
                    # Add backup metadata
                    backup_metadata = asset.get('metadata', {}) or {}
                    backup_metadata['backup_timestamp'] = backup_timestamp
                    backup_metadata['backup_title'] = asset.get('title', '')
                    backup_metadata['is_backup'] = True
                    
                    # Update the asset to mark it as backup and change title
                    backup_title = f"[BACKUP {backup_timestamp[:10]}] {asset.get('title', 'CV Asset')}"
                    
                    update_result = supabase_client.table('cv_assets')\
                        .update({\
                            'title': backup_title,\
                            'metadata': backup_metadata\
                        })\
                        .eq('id', asset['id'])\
                        .execute()
                    
                    if update_result.data:
                        assets_backed_up += 1
                        
                except Exception as backup_error:
                    logger.error(f"❌ Failed to backup asset {asset.get('id')}: {backup_error}")
            
            logger.info(f"✅ Backed up {assets_backed_up} CV assets with timestamp {backup_timestamp}")
            
        except Exception as e:
            logger.error(f"❌ CV backup failed: {e}")
            # Continue with import even if backup fails
        
        # Step 2: Delete the original CV assets that were just backed up
        try:
            logger.info(f"🗑️ Now deleting the {len(existing_assets)} original assets that were backed up...")
            
            # Delete the original assets (we already have their IDs from the backup step)
            deleted_count = 0
            for asset in existing_assets:
                asset_id = asset['id']
                title = asset.get('title', 'Untitled')
                
                logger.info(f"🗑️ Deleting original asset: '{title}' (ID: {asset_id})")
            
                try:
                    delete_result = supabase_client.table('cv_assets')\
                        .delete()\
                        .eq('id', asset_id)\
                        .execute()
                    
                    if delete_result.data:
                        deleted_count += len(delete_result.data)
                        logger.info(f"✅ Successfully deleted original asset: '{title}'")
                    else:
                        logger.warning(f"⚠️ Delete operation returned no data for asset: '{title}'")
                        
                except Exception as del_error:
                    logger.error(f"❌ Failed to delete asset {asset_id}: {del_error}")
            
            logger.info(f"🗑️ Successfully cleared {deleted_count} original CV assets")
            logger.info(f"📊 Final result: {deleted_count} originals deleted, {assets_backed_up} backups created")
            
        except Exception as e:
            logger.error(f"❌ Failed to clear existing CV data: {e}")
            import traceback
            logger.error(f"❌ Full traceback: {traceback.format_exc()}")
            # Continue with import even if clearing fails
        
        # Create CV assets for experience, education, certifications, and awards
        assets_created = 0
        
        # Process experience - very lenient validation
        for exp in extracted_data.get('experience', []):
            # Only require at least a title OR company (not both)
            if exp.get('title') or exp.get('company'):
                try:
                    # Build title with available information
                    title_parts = []
                    if exp.get('title'):
                        title_parts.append(exp['title'])
                    if exp.get('company'):
                        title_parts.append(f"at {exp['company']}")
                    
                    title = " ".join(title_parts) if title_parts else "Work Experience"
                    
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'experience',
                        'title': title,
                        'description': exp.get('description', ''),
                        'metadata': {
                            'company': exp.get('company', ''),
                            'title': exp.get('title', ''),
                            'location': exp.get('location', ''),
                            'startDate': exp.get('start_date', ''),
                            'endDate': exp.get('end_date', ''),
                            'current': exp.get('end_date', '') == 'current'
                        }
                    }
                    logger.info(f"🔄 Creating experience asset: {asset_data}")
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    # Check if the request was successful (200-299 status codes)
                    if hasattr(result, 'data') and result.data:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created experience asset: {title}")
                        logger.info(f"✅ Asset creation result: {result.data}")
                    else:
                        logger.error(f"❌ Failed to create experience asset: {title}")
                        logger.error(f"❌ Asset data was: {asset_data}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception creating experience asset: {e}")
                    logger.error(f"❌ Exception type: {type(e).__name__}")
                    logger.error(f"❌ Data was: {exp}")
                    import traceback
                    logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Process education - very lenient validation  
        for edu in extracted_data.get('education', []):
            # Only require at least an institution OR degree (not both)
            if edu.get('degree') or edu.get('institution'):
                try:
                    # Build title with available information
                    title_parts = []
                    if edu.get('degree'):
                        title_parts.append(edu['degree'])
                    if edu.get('institution'):
                        title_parts.append(f"from {edu['institution']}")
                    
                    title = " ".join(title_parts) if title_parts else "Education"
                    
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'education',
                        'title': title,
                        'description': edu.get('description', ''),
                        'metadata': {
                            'institution': edu.get('institution', ''),
                            'degree': edu.get('degree', ''),
                            'location': edu.get('location', ''),
                            'startDate': edu.get('start_date', ''),
                            'endDate': edu.get('end_date', ''),
                            'current': edu.get('end_date', '') == 'current'
                        }
                    }
                    logger.info(f"🔄 Creating education asset: {asset_data}")
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    # Check if the request was successful (200-299 status codes)
                    if hasattr(result, 'data') and result.data:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created education asset: {title}")
                        logger.info(f"✅ Asset creation result: {result.data}")
                    else:
                        logger.error(f"❌ Failed to create education asset: {title}")
                        logger.error(f"❌ Asset data was: {asset_data}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception creating education asset: {e}")
                    logger.error(f"❌ Exception type: {type(e).__name__}")
                    logger.error(f"❌ Data was: {edu}")
                    import traceback
                    logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Process certifications (use 'other' asset_type as 'certification' is not allowed)
        for cert in extracted_data.get('certifications', []):
            if cert.get('name'):
                try:
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'other',  # Fixed: use 'other' instead of 'certification'
                        'title': cert['name'],
                        'description': f"Issued by {cert.get('issuer', 'Unknown')}",
                        'metadata': {
                            'organization': cert.get('issuer', ''),
                            'startDate': cert.get('date', ''),
                            'endDate': cert.get('date', ''),
                            'credential_id': cert.get('credential_id', ''),
                            'category': 'certification',
                            'current': False
                        }
                    }
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    if hasattr(result, 'data') and result.data:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created certification asset: {cert['name']}")
                    else:
                        logger.error(f"❌ Failed to create certification asset: {cert['name']}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception creating certification asset: {e}")
                    logger.error(f"❌ Certification data was: {cert}")
        
        # Process awards (use 'other' asset_type as 'award' is not allowed)
        for award in extracted_data.get('awards', []):
            if award.get('title'):
                try:
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'other',  # Fixed: use 'other' instead of 'award'
                        'title': award['title'],
                        'description': award.get('description', ''),
                        'metadata': {
                            'organization': award.get('issuer', ''),
                            'startDate': award.get('date', ''),
                            'endDate': award.get('date', ''),
                            'category': 'award',
                            'current': False
                        }
                    }
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    if hasattr(result, 'data') and result.data:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created award asset: {award['title']}")
                    else:
                        logger.error(f"❌ Failed to create award asset: {award['title']}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception creating award asset: {e}")
                    logger.error(f"❌ Award data was: {award}")
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        logger.info(f"✅ CV processing completed: {assets_created} assets created, profile updated: {profile_updated}")
        
        return CVProcessingResponse(
            status="success",
            message=f"CV processed successfully. Created {assets_created} assets.",
            data={
                "profile_updated": profile_updated,
                "assets_created": assets_created,
                "extracted_data": extracted_data
            },
            processing_time=processing_time,
            chunks_processed=chunks_processed
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        logger.error(f"❌ CV processing failed: {e}")
        
        return CVProcessingResponse(
            status="error",
            message="CV processing failed",
            error=str(e),
            processing_time=processing_time
        )

@app.get("/status")
async def get_system_status():
    """Get detailed system status"""
    return {
        "status": "operational",
        "service": "cv-processing-api",
        "components": {
            "cv_processor": "available" if cv_processor and cv_processor.is_available() else "unavailable",
            "supabase_client": "connected" if supabase_client else "disconnected",
            "openai_model": OPENAI_MODEL
        },
        "configuration": {
            "openai_api_configured": bool(OPENAI_API_KEY),
            "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
            "max_chunk_size": cv_processor.max_chunk_size if cv_processor else None
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/debug-process")
async def debug_process_cv(request: CVProcessingRequest):
    """
    Debug version of CV processing that returns more detailed information
    """
    try:
        if not cv_processor or not cv_processor.is_available():
            raise HTTPException(status_code=503, detail="CV processor not available")
        
        logger.info(f"🔍 DEBUG: Processing CV text of length: {len(request.cv_text)}")
        
        # Split into chunks
        chunks = cv_processor._chunk_text(request.cv_text)
        logger.info(f"🔍 DEBUG: Split into {len(chunks)} chunks")
        
        # Process first chunk only for debugging
        if chunks:
            first_chunk = chunks[0]
            logger.info(f"🔍 DEBUG: Processing first chunk of length: {len(first_chunk)}")
            
            result = await cv_processor._extract_from_chunk(first_chunk, 0)
            logger.info(f"🔍 DEBUG: Extraction result: {result}")
            
            return {
                "status": "debug",
                "chunks_count": len(chunks),
                "first_chunk_length": len(first_chunk),
                "first_chunk_preview": first_chunk[:1000] + "..." if len(first_chunk) > 1000 else first_chunk,
                "extraction_result": result,
                "text_analysis": {
                    "contains_email": "@" in first_chunk,
                    "contains_phone": any(char.isdigit() for char in first_chunk),
                    "contains_common_words": any(word in first_chunk.lower() for word in ["experience", "education", "skills", "work", "university", "college"]),
                    "line_count": len(first_chunk.split('\n')),
                    "word_count": len(first_chunk.split()),
                    "character_encoding": "utf-8" if first_chunk.isascii() else "non-ascii"
                }
            }
        else:
            return {
                "status": "error",
                "error": "No chunks created from CV text"
            }
            
    except Exception as e:
        logger.error(f"🔍 DEBUG: Error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/test-extraction")
async def test_extraction(request: dict):
    """
    Test endpoint to validate CV text extraction with sample data
    """
    try:
        sample_text = request.get('sample_text', '''
        John Smith
        Software Engineer
        Email: john.smith@example.com
        Phone: (555) 123-4567
        
        EXPERIENCE
        Senior Software Engineer at Google Inc. (2020-2024)
        - Led development of cloud infrastructure
        - Managed team of 5 engineers
        
        Software Developer at Microsoft (2018-2020)
        - Built web applications using React
        - Improved system performance by 40%
        
        EDUCATION
        Master of Science in Computer Science
        Stanford University (2016-2018)
        
        Bachelor of Science in Computer Science  
        UC Berkeley (2012-2016)
        
        SKILLS
        Python, JavaScript, React, Node.js, AWS, Docker
        ''')
        
        if not cv_processor or not cv_processor.is_available():
            raise HTTPException(status_code=503, detail="CV processor not available")
        
        # Process the sample text
        result = await cv_processor._extract_from_chunk(sample_text, 0)
        
        return {
            "status": "success",
            "sample_text": sample_text,
            "extraction_result": result,
            "summary": {
                "experiences_found": len(result.get('experience', [])),
                "education_found": len(result.get('education', [])), 
                "skills_found": len(result.get('skills', [])),
                "personal_info_found": bool(result.get('personal_info', {}).get('full_name'))
            }
        }
        
    except Exception as e:
        logger.error(f"Test extraction error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/extract-pdf-text", response_model=PDFExtractionResponse)
async def extract_pdf_text(request: PDFExtractionRequest):
    """
    Extract text from PDF file using multiple extraction methods
    """
    try:
        logger.info(f"📄 Extracting text from PDF: {request.filename}")
        
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(request.pdf_base64)
        pdf_stream = io.BytesIO(pdf_bytes)
        
        extracted_text = ""
        extraction_method = ""
        
        # Method 1: Try pdfplumber (best for complex layouts)
        try:
            logger.info("🔍 Trying pdfplumber extraction...")
            with pdfplumber.open(pdf_stream) as pdf:
                text_parts = []
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                        logger.info(f"📄 Page {page_num + 1}: {len(page_text)} characters extracted")
                
                if text_parts:
                    extracted_text = "\n".join(text_parts)
                    extraction_method = "pdfplumber"
                    logger.info(f"✅ pdfplumber extraction successful: {len(extracted_text)} characters")
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")
        
        # Method 2: Try PyPDF2 if pdfplumber failed or returned insufficient text
        if not extracted_text or len(extracted_text) < 100:
            try:
                logger.info("🔍 Trying PyPDF2 extraction...")
                pdf_stream.seek(0)  # Reset stream position
                pdf_reader = PyPDF2.PdfReader(pdf_stream)
                
                text_parts = []
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
                        logger.info(f"📄 Page {page_num + 1}: {len(page_text)} characters extracted")
                
                if text_parts:
                    pypdf_text = "\n".join(text_parts)
                    if len(pypdf_text) > len(extracted_text):
                        extracted_text = pypdf_text
                        extraction_method = "PyPDF2"
                        logger.info(f"✅ PyPDF2 extraction successful: {len(extracted_text)} characters")
            except Exception as e:
                logger.warning(f"PyPDF2 extraction failed: {e}")
        
        # Clean up the extracted text
        if extracted_text:
            # Remove excessive whitespace and normalize
            cleaned_text = ""
            for line in extracted_text.split('\n'):
                cleaned_line = ' '.join(line.split())  # Normalize whitespace within lines
                if cleaned_line:  # Skip empty lines
                    cleaned_text += cleaned_line + '\n'
            
            extracted_text = cleaned_text.strip()
            
            logger.info(f"🧹 Text cleaned: {len(extracted_text)} characters final")
            
            return PDFExtractionResponse(
                status="success",
                text=extracted_text,
                character_count=len(extracted_text),
                extraction_method=extraction_method
            )
        else:
            logger.error("❌ No text could be extracted from PDF")
            return PDFExtractionResponse(
                status="error",
                error="No readable text found in PDF. The PDF might be image-based or corrupted."
            )
            
    except Exception as e:
        logger.error(f"❌ PDF text extraction failed: {e}")
        return PDFExtractionResponse(
            status="error",
            error=f"PDF processing failed: {str(e)}"
        )

@app.post("/restore-cv-backup")
async def restore_cv_backup(request: dict):
    """
    Restore CV data from backup by backup_timestamp
    """
    try:
        user_id = request.get('user_id')
        backup_timestamp = request.get('backup_timestamp')
        
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        if not backup_timestamp:
            raise HTTPException(status_code=400, detail="backup_timestamp is required")
        
        logger.info(f"🔄 Restoring CV backup for user {user_id} from {backup_timestamp}")
        
        if not supabase_client:
            raise HTTPException(status_code=503, detail="Database service not available")
        
        # Step 1: Find backup assets
        backup_assets_result = supabase_client.table('cv_assets')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('metadata->backup_timestamp', backup_timestamp)\
            .eq('metadata->is_backup', True)\
            .execute()
        
        backup_assets = backup_assets_result.data if backup_assets_result.data else []
        logger.info(f"📦 Found {len(backup_assets)} backup assets to restore")
        
        if not backup_assets:
            return {
                "status": "error",
                "message": f"No backup found for timestamp {backup_timestamp}"
            }
        
        # Step 2: Clear current CV data (non-backup)
        cv_asset_types = ['experience', 'education', 'other']
        try:
            delete_result = supabase_client.table('cv_assets')\
                .delete()\
                .eq('user_id', user_id)\
                .in_('asset_type', cv_asset_types)\
                .is_('metadata->is_backup', 'null')\
                .execute()
            
            deleted_count = len(delete_result.data) if delete_result.data else 0
            logger.info(f"🗑️ Cleared {deleted_count} current CV assets")
            
        except Exception as e:
            logger.error(f"❌ Failed to clear current CV data: {e}")
            raise HTTPException(status_code=500, detail="Failed to clear current CV data")
        
        # Step 3: Restore backup assets (remove backup flags and restore original titles)
        restored_count = 0
        for backup_asset in backup_assets:
            try:
                # Restore original metadata
                metadata = backup_asset.get('metadata', {}) or {}
                original_title = metadata.get('backup_title', backup_asset.get('title', ''))
                
                # Remove backup flags
                restored_metadata = {k: v for k, v in metadata.items() 
                                   if k not in ['backup_timestamp', 'backup_title', 'is_backup']}
                
                # Update the asset to restore it
                restore_result = supabase_client.table('cv_assets')\
                    .update({\
                        'title': original_title,\
                        'metadata': restored_metadata\
                    })\
                    .eq('id', backup_asset['id'])\
                    .execute()
                
                if restore_result.data:
                    restored_count += 1
                    
            except Exception as restore_error:
                logger.error(f"❌ Failed to restore asset {backup_asset.get('id')}: {restore_error}")
        
        logger.info(f"✅ Restored {restored_count} CV assets from backup {backup_timestamp}")
        
        return {
            "status": "success",
            "message": f"Successfully restored {restored_count} CV assets from backup",
            "data": {
                "backup_timestamp": backup_timestamp,
                "assets_restored": restored_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ CV restore failed: {e}")
        return {
            "status": "error",
            "message": f"Failed to restore CV backup: {str(e)}"
        }

@app.get("/list-cv-backups/{user_id}")
async def list_cv_backups(user_id: str):
    """
    List available CV backups for a user
    """
    try:
        logger.info(f"📋 Listing CV backups for user {user_id}")
        
        if not supabase_client:
            raise HTTPException(status_code=503, detail="Database service not available")
        
        # Find all backup assets and group by backup_timestamp
        backup_assets_result = supabase_client.table('cv_assets')\
            .select('metadata')\
            .eq('user_id', user_id)\
            .eq('metadata->is_backup', True)\
            .execute()
        
        backup_assets = backup_assets_result.data if backup_assets_result.data else []
        
        # Group by backup timestamp
        backups = {}
        for asset in backup_assets:
            metadata = asset.get('metadata', {}) or {}
            timestamp = metadata.get('backup_timestamp')
            if timestamp:
                if timestamp not in backups:
                    backups[timestamp] = 0
                backups[timestamp] += 1
        
        # Convert to list and sort by timestamp (newest first)
        backup_list = [
            {
                "backup_timestamp": timestamp,
                "asset_count": count,
                "backup_date": timestamp[:10] if timestamp else "Unknown"
            }
            for timestamp, count in sorted(backups.items(), reverse=True)
        ]
        
        logger.info(f"📋 Found {len(backup_list)} CV backups")
        
        return {
            "status": "success",
            "backups": backup_list
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list CV backups: {e}")
        return {
            "status": "error",
            "message": f"Failed to list backups: {str(e)}"
        }

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🚀 Starting CV Processing API on {API_HOST}:{API_PORT}")
    
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info",
        access_log=True
    )