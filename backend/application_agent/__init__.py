"""
Application Agent Package - AI-powered automated job application service with LangChain

This package provides enhanced automated job application capabilities including:
- AI-powered form analysis with LangChain
- Intelligent CV selection and data mapping
- Smart form filling with browser automation
- Real-time application tracking
- Content generation for cover letters
"""

from .enhanced_application_agent import EnhancedApplicationAgent
from .enhanced_form_analysis_service import EnhancedFormAnalysisService
from .enhanced_cv_selection_service import EnhancedCVSelectionService
from .enhanced_browser_form_filler import EnhancedBrowserFormFiller
from .enhanced_content_generation_service import EnhancedContentGenerationService
from .application_tracking_service import ApplicationTrackingService
from .cv_api_client import CVAPIClient

__version__ = "2.0.0"
__author__ = "AutoApply Team"

__all__ = [
    "EnhancedApplicationAgent",
    "EnhancedFormAnalysisService", 
    "EnhancedCVSelectionService",
    "EnhancedBrowserFormFiller",
    "EnhancedContentGenerationService",
    "ApplicationTrackingService",
    "CVAPIClient"
]