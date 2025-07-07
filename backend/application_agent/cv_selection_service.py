"""
CV Selection Service - Manage CV selection for job applications

This service handles:
- Generated CV retrieval from CV generation system
- Uploaded CV storage and management
- CV format validation and conversion
- CV data extraction and structuring
"""

import asyncio
import logging
import os
import base64
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import mimetypes

from supabase import Client
import pdfplumber
import PyPDF2
from docx import Document

logger = logging.getLogger(__name__)

class CVSelectionService:
    """
    Service for managing CV selection and data preparation
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
    async def get_generated_cv(self, cv_id: str) -> Dict[str, Any]:
        """
        Retrieve a generated CV from the CV generation system
        
        Args:
            cv_id: ID of the generated CV
            
        Returns:
            Dictionary containing CV data and metadata
        """
        try:
            logger.info(f"📄 Retrieving generated CV: {cv_id}")
            
            # Query cv_generations table
            response = self.supabase.table('cv_generations').select('*').eq('id', cv_id).execute()
            
            if not response.data:
                raise ValueError(f"Generated CV not found: {cv_id}")
            
            cv_generation = response.data[0]
            cv_data = cv_generation.get('cv_data', {})
            
            # Structure the CV data
            structured_cv = {
                'id': cv_id,
                'type': 'generated',
                'personal_info': cv_data.get('profile', {}),
                'experiences': cv_data.get('experiences', []),
                'education': cv_data.get('education', []),
                'skills': cv_data.get('skills', {}),
                'projects': cv_data.get('selectedProjects', []),
                'publications': cv_data.get('selectedPublications', []),
                'file_url': cv_generation.get('pdf_url'),
                'created_at': cv_generation.get('created_at'),
                'template_id': cv_generation.get('template_id'),
                'optimization_metadata': cv_generation.get('optimization_metadata', {})
            }
            
            logger.info(f"✅ Generated CV retrieved successfully")
            return structured_cv
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve generated CV: {e}")
            raise
    
    async def get_uploaded_cv(self, cv_path: str) -> Dict[str, Any]:
        """
        Retrieve an uploaded CV and extract its data
        
        Args:
            cv_path: Path or ID of the uploaded CV
            
        Returns:
            Dictionary containing CV data and metadata
        """
        try:
            logger.info(f"📄 Retrieving uploaded CV: {cv_path}")
            
            # Query uploaded_cvs table (we'll create this)
            response = self.supabase.table('uploaded_cvs').select('*').eq('id', cv_path).execute()
            
            if not response.data:
                raise ValueError(f"Uploaded CV not found: {cv_path}")
            
            cv_record = response.data[0]
            
            # Download CV file if URL is provided
            cv_content = None
            if cv_record.get('file_url'):
                cv_content = await self._download_cv_file(cv_record['file_url'])
            
            # Extract CV data
            extracted_data = await self._extract_cv_data(
                cv_content, 
                cv_record.get('filename', ''),
                cv_record.get('content_type', '')
            )
            
            # Structure the CV data
            structured_cv = {
                'id': cv_path,
                'type': 'uploaded',
                'filename': cv_record.get('filename'),
                'file_url': cv_record.get('file_url'),
                'file_path': cv_record.get('file_path'),
                'content_type': cv_record.get('content_type'),
                'uploaded_at': cv_record.get('created_at'),
                **extracted_data
            }
            
            logger.info(f"✅ Uploaded CV retrieved successfully")
            return structured_cv
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve uploaded CV: {e}")
            raise
    
    async def store_uploaded_cv(
        self, 
        user_id: str, 
        filename: str, 
        content: bytes, 
        content_type: str
    ) -> Dict[str, Any]:
        """
        Store an uploaded CV file
        
        Args:
            user_id: User ID
            filename: Original filename
            content: File content as bytes
            content_type: MIME type
            
        Returns:
            Dictionary containing stored CV information
        """
        try:
            logger.info(f"💾 Storing uploaded CV for user {user_id}: {filename}")
            
            # Validate file type
            allowed_types = {
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
            
            if content_type not in allowed_types:
                raise ValueError(f"Unsupported file type: {content_type}")
            
            # Generate unique file ID
            file_hash = hashlib.md5(content).hexdigest()
            file_id = f"{user_id}_{file_hash}_{int(datetime.utcnow().timestamp())}"
            
            # Store file in Supabase Storage
            file_path = f"uploaded_cvs/{user_id}/{file_id}_{filename}"
            
            # Upload to Supabase storage
            storage_response = self.supabase.storage.from_('cv-files').upload(
                file_path, content, file_options={'content-type': content_type}
            )
            
            if storage_response.get('error'):
                raise Exception(f"File upload failed: {storage_response['error']}")
            
            # Get public URL
            file_url = self.supabase.storage.from_('cv-files').get_public_url(file_path)
            
            # Store CV metadata in database
            cv_record = {
                'id': file_id,
                'user_id': user_id,
                'filename': filename,
                'file_path': file_path,
                'file_url': file_url,
                'content_type': content_type,
                'file_size': len(content),
                'file_hash': file_hash,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Insert into uploaded_cvs table
            db_response = self.supabase.table('uploaded_cvs').insert(cv_record).execute()
            
            if not db_response.data:
                raise Exception("Failed to store CV metadata")
            
            logger.info(f"✅ CV stored successfully: {file_id}")
            
            return {
                'id': file_id,
                'filename': filename,
                'file_url': file_url,
                'file_path': file_path,
                'created_at': cv_record['created_at']
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store uploaded CV: {e}")
            raise
    
    async def list_user_cvs(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List all CVs (generated and uploaded) for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of CV information dictionaries
        """
        try:
            logger.info(f"📋 Listing CVs for user: {user_id}")
            
            cvs = []
            
            # Get generated CVs
            generated_response = self.supabase.table('cv_generations').select(
                'id, job_id, template_id, pdf_url, created_at, status'
            ).eq('user_id', user_id).order('created_at', desc=True).execute()
            
            for cv in generated_response.data:
                cvs.append({
                    'id': cv['id'],
                    'type': 'generated',
                    'name': f"Generated CV - {cv.get('template_id', 'Unknown Template')}",
                    'created_at': cv['created_at'],
                    'file_url': cv.get('pdf_url'),
                    'status': cv.get('status', 'ready'),
                    'job_id': cv.get('job_id')
                })
            
            # Get uploaded CVs
            uploaded_response = self.supabase.table('uploaded_cvs').select(
                'id, filename, file_url, created_at'
            ).eq('user_id', user_id).order('created_at', desc=True).execute()
            
            for cv in uploaded_response.data:
                cvs.append({
                    'id': cv['id'],
                    'type': 'uploaded',
                    'name': cv['filename'],
                    'created_at': cv['created_at'],
                    'file_url': cv.get('file_url'),
                    'status': 'ready'
                })
            
            # Sort by creation date (most recent first)
            cvs.sort(key=lambda x: x['created_at'], reverse=True)
            
            logger.info(f"✅ Found {len(cvs)} CVs for user {user_id}")
            return cvs
            
        except Exception as e:
            logger.error(f"❌ Failed to list user CVs: {e}")
            return []
    
    async def _download_cv_file(self, file_url: str) -> bytes:
        """
        Download CV file from URL
        """
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(file_url)
                response.raise_for_status()
                return response.content
        except Exception as e:
            logger.error(f"Failed to download CV file: {e}")
            return b""
    
    async def _extract_cv_data(
        self, 
        content: Optional[bytes], 
        filename: str, 
        content_type: str
    ) -> Dict[str, Any]:
        """
        Extract structured data from CV file
        """
        try:
            if not content:
                return self._empty_cv_structure()
            
            text_content = ""
            
            # Extract text based on file type
            if content_type == 'application/pdf':
                text_content = await self._extract_pdf_text(content)
            elif content_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
                text_content = await self._extract_word_text(content)
            
            if not text_content.strip():
                logger.warning("No text extracted from CV file")
                return self._empty_cv_structure()
            
            # Parse CV text to extract structured data
            # For now, return basic structure with raw text
            # In a production system, you'd use AI to parse this
            
            return {
                'personal_info': {
                    'extracted_text': text_content[:500],  # First 500 chars as preview
                },
                'experiences': [],
                'education': [],
                'skills': [],
                'raw_text': text_content,
                'extraction_status': 'basic'
            }
            
        except Exception as e:
            logger.error(f"CV data extraction failed: {e}")
            return self._empty_cv_structure()
    
    async def _extract_pdf_text(self, content: bytes) -> str:
        """
        Extract text from PDF content
        """
        try:
            import io
            
            # Try pdfplumber first
            try:
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text = ""
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                    return text
            except:
                pass
            
            # Fallback to PyPDF2
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                text = ""
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                return text
            except:
                pass
            
            return ""
            
        except Exception as e:
            logger.error(f"PDF text extraction failed: {e}")
            return ""
    
    async def _extract_word_text(self, content: bytes) -> str:
        """
        Extract text from Word document content
        """
        try:
            import io
            from docx import Document
            
            doc = Document(io.BytesIO(content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text
            
        except Exception as e:
            logger.error(f"Word text extraction failed: {e}")
            return ""
    
    def _empty_cv_structure(self) -> Dict[str, Any]:
        """
        Return empty CV structure
        """
        return {
            'personal_info': {},
            'experiences': [],
            'education': [],
            'skills': [],
            'extraction_status': 'failed'
        }