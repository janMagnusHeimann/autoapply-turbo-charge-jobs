"""
LangChain Services Package - Enhanced AI capabilities for job application automation

This package provides LangChain-powered AI services including:
- Form analysis agents
- CV-to-form mapping agents  
- Intelligent form filling agents
- Content generation agents
- Structured output parsing
"""

from .base_service import BaseLangChainService
from .prompt_templates import PromptTemplates
from .structured_outputs import *

__version__ = "1.0.0"
__author__ = "AutoApply Team"

__all__ = [
    "BaseLangChainService",
    "PromptTemplates",
    "FormAnalysisOutput",
    "CVMappingOutput",
    "FormFillingOutput",
    "CoverLetterOutput"
]