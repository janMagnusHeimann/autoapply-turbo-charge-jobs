"""
Application Agent - Main AI agent for automated job applications

This agent coordinates the entire application process:
1. Form analysis and understanding
2. CV data preparation and mapping
3. Intelligent form filling
4. Application submission
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

try:
    from .form_analysis_service import FormAnalysisService
    from .cv_selection_service import CVSelectionService
    from .application_tracking_service import ApplicationTrackingService
    from .browser_form_filler import BrowserFormFiller
except ImportError:
    from form_analysis_service import FormAnalysisService
    from cv_selection_service import CVSelectionService
    from application_tracking_service import ApplicationTrackingService
    from browser_form_filler import BrowserFormFiller

logger = logging.getLogger(__name__)

class ApplicationAgent:
    """
    Main AI agent that orchestrates the job application process
    """
    
    def __init__(
        self,
        form_analysis_service: FormAnalysisService,
        cv_selection_service: CVSelectionService,
        tracking_service: ApplicationTrackingService,
        openai_api_key: str
    ):
        self.form_analysis_service = form_analysis_service
        self.cv_selection_service = cv_selection_service
        self.tracking_service = tracking_service
        self.openai_api_key = openai_api_key
        self.browser_filler = BrowserFormFiller(openai_api_key)
        
    async def analyze_application_form(self, application_url: str) -> Dict[str, Any]:
        """
        Analyze the job application form to understand its structure and requirements
        
        Args:
            application_url: URL of the job application page
            
        Returns:
            Dictionary containing form analysis results
        """
        try:
            logger.info(f"🔍 Analyzing application form: {application_url}")
            
            # Use form analysis service to analyze the form
            analysis_result = await self.form_analysis_service.analyze_form(application_url)
            
            if not analysis_result['success']:
                raise Exception(f"Form analysis failed: {analysis_result['error']}")
            
            form_data = analysis_result['form_data']
            
            logger.info(f"✅ Form analysis completed - found {len(form_data.get('fields', []))} fields")
            
            return {
                'url': application_url,
                'form_type': form_data.get('form_type', 'unknown'),
                'fields': form_data.get('fields', []),
                'file_uploads': form_data.get('file_uploads', []),
                'required_fields': form_data.get('required_fields', []),
                'multi_step': form_data.get('multi_step', False),
                'captcha_present': form_data.get('captcha_present', False),
                'estimated_difficulty': form_data.get('estimated_difficulty', 'medium'),
                'analysis_confidence': form_data.get('confidence', 0.0)
            }
            
        except Exception as e:
            logger.error(f"❌ Form analysis failed: {e}")
            raise
    
    async def prepare_cv_data(self, request) -> Dict[str, Any]:
        """
        Prepare CV data for form filling based on user's choice
        
        Args:
            request: Application request with CV choice details
            
        Returns:
            Dictionary containing prepared CV data
        """
        try:
            logger.info(f"📄 Preparing CV data for user {request.user_id}, choice: {request.cv_choice}")
            
            if request.cv_choice == 'generated':
                if not request.cv_id:
                    raise ValueError("CV ID required for generated CV choice")
                cv_data = await self.cv_selection_service.get_generated_cv(request.cv_id)
            elif request.cv_choice == 'uploaded':
                if not request.uploaded_cv_path:
                    raise ValueError("CV path required for uploaded CV choice")
                cv_data = await self.cv_selection_service.get_uploaded_cv(request.uploaded_cv_path)
            else:
                raise ValueError(f"Invalid CV choice: {request.cv_choice}")
            
            # Extract and structure the CV data for form filling
            structured_data = await self._structure_cv_data(cv_data)
            
            # Generate cover letter if requested
            if request.cover_letter_prompt:
                cover_letter = await self._generate_cover_letter(
                    cv_data, request.cover_letter_prompt
                )
                structured_data['cover_letter'] = cover_letter
            
            logger.info(f"✅ CV data prepared successfully")
            return structured_data
            
        except Exception as e:
            logger.error(f"❌ CV data preparation failed: {e}")
            raise
    
    async def fill_application_form(
        self, 
        form_analysis: Dict[str, Any], 
        cv_data: Dict[str, Any],
        job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fill the application form using AI-powered field mapping
        
        Args:
            form_analysis: Results from form analysis
            cv_data: Prepared CV data
            job_data: Job information
            
        Returns:
            Dictionary containing filled form data
        """
        try:
            logger.info(f"📝 Filling application form for {job_data.get('company', 'Unknown')}")
            
            # Use browser form filler to navigate and fill the form
            filling_result = await self.browser_filler.fill_form(
                url=form_analysis['url'],
                form_fields=form_analysis['fields'],
                cv_data=cv_data,
                job_data=job_data
            )
            
            if not filling_result['success']:
                raise Exception(f"Form filling failed: {filling_result['error']}")
            
            logger.info(f"✅ Form filled successfully")
            
            return {
                'form_analysis': form_analysis,
                'filled_data': filling_result['filled_data'],
                'screenshots': filling_result.get('screenshots', []),
                'validation_errors': filling_result.get('validation_errors', []),
                'completion_status': filling_result.get('completion_status', 'completed'),
                'ready_for_submission': filling_result.get('ready_for_submission', False)
            }
            
        except Exception as e:
            logger.error(f"❌ Form filling failed: {e}")
            raise
    
    async def submit_application(self, filled_form: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submit the filled application form
        
        Args:
            filled_form: Form data ready for submission
            
        Returns:
            Dictionary containing submission results
        """
        try:
            logger.info(f"🚀 Submitting application")
            
            if not filled_form.get('ready_for_submission', False):
                raise Exception("Form not ready for submission")
            
            # Use browser form filler to submit the form
            submission_result = await self.browser_filler.submit_form(filled_form)
            
            if submission_result['success']:
                logger.info(f"✅ Application submitted successfully")
            else:
                logger.error(f"❌ Application submission failed: {submission_result['error']}")
            
            return submission_result
            
        except Exception as e:
            logger.error(f"❌ Application submission failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def _structure_cv_data(self, cv_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Structure CV data into a format suitable for form filling
        """
        try:
            # Extract personal information
            personal_info = cv_data.get('personal_info', {})
            
            # Extract experience
            experiences = cv_data.get('experiences', [])
            current_experience = None
            previous_experiences = []
            
            for exp in experiences:
                if exp.get('current', False) or exp.get('endDate') == 'current':
                    current_experience = exp
                else:
                    previous_experiences.append(exp)
            
            # Extract education
            education = cv_data.get('education', [])
            highest_education = education[0] if education else {}
            
            # Extract skills
            skills = cv_data.get('skills', [])
            if isinstance(skills, dict):
                skills = skills.get('all', [])
            
            # Structure the data
            structured = {
                'personal': {
                    'first_name': self._extract_first_name(personal_info.get('full_name', '')),
                    'last_name': self._extract_last_name(personal_info.get('full_name', '')),
                    'full_name': personal_info.get('full_name', ''),
                    'email': personal_info.get('email', ''),
                    'phone': personal_info.get('phone', ''),
                    'location': personal_info.get('location', ''),
                    'linkedin_url': personal_info.get('linkedin_url', ''),
                    'github_url': personal_info.get('github_url', ''),
                    'portfolio_url': personal_info.get('portfolio_url', ''),
                    'summary': personal_info.get('professional_summary', '')
                },
                'current_experience': current_experience,
                'previous_experiences': previous_experiences,
                'education': {
                    'highest_degree': highest_education.get('degree', ''),
                    'institution': highest_education.get('institution', ''),
                    'graduation_year': self._extract_year(highest_education.get('endDate', '')),
                    'all_education': education
                },
                'skills': {
                    'technical': [skill for skill in skills if isinstance(skill, str)],
                    'top_skills': skills[:10] if len(skills) > 10 else skills
                },
                'cv_file_path': cv_data.get('file_path'),
                'cv_file_url': cv_data.get('file_url')
            }
            
            return structured
            
        except Exception as e:
            logger.error(f"Failed to structure CV data: {e}")
            # Return minimal structure
            return {
                'personal': {},
                'current_experience': None,
                'previous_experiences': [],
                'education': {},
                'skills': {'technical': [], 'top_skills': []},
                'cv_file_path': None,
                'cv_file_url': None
            }
    
    async def _generate_cover_letter(self, cv_data: Dict[str, Any], prompt: str) -> str:
        """
        Generate a cover letter using AI
        """
        try:
            # This would use OpenAI to generate a cover letter
            # For now, return a placeholder
            return f"Generated cover letter based on: {prompt}"
        except Exception as e:
            logger.error(f"Cover letter generation failed: {e}")
            return ""
    
    def _extract_first_name(self, full_name: str) -> str:
        """Extract first name from full name"""
        if not full_name:
            return ""
        parts = full_name.strip().split()
        return parts[0] if parts else ""
    
    def _extract_last_name(self, full_name: str) -> str:
        """Extract last name from full name"""
        if not full_name:
            return ""
        parts = full_name.strip().split()
        return parts[-1] if len(parts) > 1 else ""
    
    def _extract_year(self, date_string: str) -> str:
        """Extract year from date string"""
        if not date_string:
            return ""
        if date_string == 'current':
            return str(datetime.now().year)
        # Try to extract year from various date formats
        try:
            if '-' in date_string:
                return date_string.split('-')[0]
            elif len(date_string) == 4 and date_string.isdigit():
                return date_string
        except:
            pass
        return ""