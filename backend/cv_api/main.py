"""
CV Processing API - Dedicated FastAPI service for CV analysis and data extraction
"""

import os
import logging
import base64
import io
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

@app.post("/process", response_model=CVProcessingResponse)
async def process_cv(request: CVProcessingRequest):
    """
    Process CV text using OpenAI to extract structured profile information
    Handles large CV text by chunking and merging results
    """
    start_time = datetime.utcnow()
    
    try:
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
            profile_data['github'] = social_links['github']
        if social_links.get('portfolio'):
            profile_data['portfolio_url'] = social_links['portfolio']
        if social_links.get('x'):
            profile_data['x_url'] = social_links['x']
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
                            'start_date': exp.get('start_date', ''),
                            'end_date': exp.get('end_date', '')
                        }
                    }
                    logger.info(f"🔄 Creating experience asset: {asset_data}")
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    if result.error:
                        logger.error(f"❌ Supabase error creating experience asset: {result.error}")
                        logger.error(f"❌ Asset data was: {asset_data}")
                    else:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created experience asset: {title}")
                        logger.info(f"✅ Asset creation result: {result.data}")
                        
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
                            'start_date': edu.get('start_date', ''),
                            'end_date': edu.get('end_date', '')
                        }
                    }
                    logger.info(f"🔄 Creating education asset: {asset_data}")
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    
                    if result.error:
                        logger.error(f"❌ Supabase error creating education asset: {result.error}")
                        logger.error(f"❌ Asset data was: {asset_data}")
                    else:
                        assets_created += len(result.data)
                        logger.info(f"✅ Created education asset: {title}")
                        logger.info(f"✅ Asset creation result: {result.data}")
                        
                except Exception as e:
                    logger.error(f"❌ Exception creating education asset: {e}")
                    logger.error(f"❌ Exception type: {type(e).__name__}")
                    logger.error(f"❌ Data was: {edu}")
                    import traceback
                    logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Process certifications
        for cert in extracted_data.get('certifications', []):
            if cert.get('name'):
                try:
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'certification',
                        'title': cert['name'],
                        'description': f"Issued by {cert.get('issuer', 'Unknown')}",
                        'metadata': {
                            'issuer': cert.get('issuer'),
                            'date': cert.get('date'),
                            'credential_id': cert.get('credential_id')
                        }
                    }
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    assets_created += len(result.data)
                except Exception as e:
                    logger.error(f"Failed to create certification asset: {e}")
        
        # Process awards
        for award in extracted_data.get('awards', []):
            if award.get('title'):
                try:
                    asset_data = {
                        'user_id': request.user_id,
                        'asset_type': 'award',
                        'title': award['title'],
                        'description': award.get('description', ''),
                        'metadata': {
                            'issuer': award.get('issuer'),
                            'date': award.get('date')
                        }
                    }
                    result = supabase_client.table('cv_assets').insert(asset_data).execute()
                    assets_created += len(result.data)
                except Exception as e:
                    logger.error(f"Failed to create award asset: {e}")
        
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