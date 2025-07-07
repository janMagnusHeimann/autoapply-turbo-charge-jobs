"""
Application Agent Package - AI-powered automated job application service

This package provides automated job application capabilities including:
- Form analysis and understanding
- CV selection and data mapping
- Intelligent form filling
- Application submission and tracking
"""

from .application_agent import ApplicationAgent
from .form_analysis_service import FormAnalysisService
from .cv_selection_service import CVSelectionService
from .application_tracking_service import ApplicationTrackingService
from .browser_form_filler import BrowserFormFiller

__version__ = "1.0.0"
__author__ = "AutoApply Team"

__all__ = [
    "ApplicationAgent",
    "FormAnalysisService", 
    "CVSelectionService",
    "ApplicationTrackingService",
    "BrowserFormFiller"
]