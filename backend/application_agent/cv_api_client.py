"""
CV API Client - Inter-service communication client for CV/Cover Letter generation
"""

import asyncio
import logging
import os
from typing import Dict, Any, Optional
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)

class CVAPIClient:
    """
    Client for communicating with the CV/Cover Letter Generation API
    """
    
    def __init__(self, cv_api_base_url: str = None):
        self.base_url = cv_api_base_url or os.getenv('CV_API_BASE_URL', 'http://localhost:8001')
        self.timeout = 30.0  # 30 second timeout
        
    async def health_check(self) -> bool:
        """
        Check if CV API is available
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"CV API health check failed: {e}")
            return False
    
    async def generate_job_specific_cv(
        self, 
        user_id: str, 
        job_id: str, 
        job_title: str, 
        job_description: str, 
        company_name: str,
        template_id: str = "premium"
    ) -> Dict[str, Any]:
        """
        Generate a CV tailored for a specific job
        
        Args:
            user_id: User ID
            job_id: Job ID for tracking
            job_title: Job title
            job_description: Job description text
            company_name: Company name
            template_id: CV template to use
            
        Returns:
            Dictionary with CV generation result
        """
        try:
            logger.info(f"🎯 Requesting job-specific CV generation for user {user_id}, job {job_id}")
            
            request_data = {
                "user_id": user_id,
                "job_id": job_id,
                "job_title": job_title,
                "job_description": job_description,
                "company_name": company_name,
                "template_id": template_id
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/generate-job-specific-cv",
                    json=request_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ CV generation successful: {result.get('cv_id')}")
                    return {
                        'success': True,
                        'cv_id': result.get('cv_id'),
                        'pdf_url': result.get('pdf_url'),
                        'processing_time': result.get('processing_time'),
                        'data': result.get('data', {})
                    }
                else:
                    error_detail = response.text
                    logger.error(f"❌ CV generation failed with status {response.status_code}: {error_detail}")
                    return {
                        'success': False,
                        'error': f"CV API returned status {response.status_code}: {error_detail}"
                    }
                    
        except httpx.TimeoutException:
            logger.error("❌ CV generation request timed out")
            return {
                'success': False,
                'error': "CV generation request timed out"
            }
        except Exception as e:
            logger.error(f"❌ CV generation request failed: {e}")
            return {
                'success': False,
                'error': f"CV generation failed: {str(e)}"
            }
    
    async def generate_cover_letter(
        self,
        user_id: str,
        job_id: str,
        job_title: str,
        job_description: str,
        company_name: str,
        cv_generation_id: str = None,
        custom_prompt: str = None
    ) -> Dict[str, Any]:
        """
        Generate a cover letter for a job application
        
        Args:
            user_id: User ID
            job_id: Job ID
            job_title: Job title
            job_description: Job description text
            company_name: Company name
            cv_generation_id: Associated CV generation ID
            custom_prompt: Custom instructions for cover letter
            
        Returns:
            Dictionary with cover letter generation result
        """
        try:
            logger.info(f"📝 Requesting cover letter generation for user {user_id}, job {job_id}")
            
            request_data = {
                "user_id": user_id,
                "job_id": job_id,
                "job_title": job_title,
                "job_description": job_description,
                "company_name": company_name
            }
            
            if cv_generation_id:
                request_data["cv_generation_id"] = cv_generation_id
            if custom_prompt:
                request_data["custom_prompt"] = custom_prompt
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/generate-cover-letter",
                    json=request_data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ Cover letter generation successful: {result.get('cover_letter_id')}")
                    return {
                        'success': True,
                        'cover_letter_id': result.get('cover_letter_id'),
                        'content': result.get('content'),
                        'processing_time': result.get('processing_time'),
                        'data': result.get('data', {})
                    }
                else:
                    error_detail = response.text
                    logger.error(f"❌ Cover letter generation failed with status {response.status_code}: {error_detail}")
                    return {
                        'success': False,
                        'error': f"CV API returned status {response.status_code}: {error_detail}"
                    }
                    
        except httpx.TimeoutException:
            logger.error("❌ Cover letter generation request timed out")
            return {
                'success': False,
                'error': "Cover letter generation request timed out"
            }
        except Exception as e:
            logger.error(f"❌ Cover letter generation request failed: {e}")
            return {
                'success': False,
                'error': f"Cover letter generation failed: {str(e)}"
            }
    
    async def get_cv_for_job(self, user_id: str, job_id: str) -> Dict[str, Any]:
        """
        Get existing CV for a specific job, or None if not found
        
        Args:
            user_id: User ID
            job_id: Job ID
            
        Returns:
            Dictionary with CV data or None
        """
        try:
            # This would be a direct database query since CV API doesn't have this endpoint yet
            # For now, return None to indicate no existing CV
            logger.info(f"🔍 Checking for existing CV for user {user_id}, job {job_id}")
            return {
                'success': True,
                'cv_found': False,
                'message': 'No existing job-specific CV found'
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to check for existing CV: {e}")
            return {
                'success': False,
                'error': f"Failed to check for existing CV: {str(e)}"
            }
    
    async def list_cvs_for_user(self, user_id: str) -> Dict[str, Any]:
        """
        List all CVs for a user (both generated and uploaded)
        This would typically go through the existing CV selection service,
        but included here for completeness of the API client
        """
        try:
            logger.info(f"📋 Listing all CVs for user {user_id}")
            
            # This endpoint doesn't exist in CV API yet - it's handled by Application API
            # Return success but indicate this should be handled differently
            return {
                'success': True,
                'cvs': [],
                'message': 'CV listing is handled by Application API CV Selection Service'
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list CVs: {e}")
            return {
                'success': False,
                'error': f"Failed to list CVs: {str(e)}"
            }