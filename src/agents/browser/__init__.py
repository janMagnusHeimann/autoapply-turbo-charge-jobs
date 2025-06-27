"""
Browser automation and DOM processing components.
"""

from .browser_controller import BrowserController, BrowserConfig
from .dom_processor import DOMProcessor, ExtractedJob

__all__ = [
    "BrowserController",
    "BrowserConfig",
    "DOMProcessor", 
    "ExtractedJob",
]