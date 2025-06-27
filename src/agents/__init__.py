"""
Multi-Agent Job Discovery System

A comprehensive AI-powered job discovery and matching system using specialized agents.

Key Components:
- CareerDiscoveryAgent: Finds career pages on company websites
- JobExtractionAgent: Extracts structured job data from career pages  
- JobMatchingAgent: Matches jobs to user preferences with detailed scoring
- JobDiscoveryOrchestrator: Coordinates multi-agent workflows
- BrowserController: Intelligent browser automation with Playwright
"""

from .core.base_agent import BaseAgent, AgentAction, AgentObservation, ActionType, AgentState
from .core.agent_orchestrator import JobDiscoveryOrchestrator, WorkflowStage
from .core.agent_memory import AgentMemoryManager
from .core.agent_tools import AgentToolRegistry, BaseTool

from .specialized.career_discovery_agent import CareerDiscoveryAgent
from .specialized.job_extraction_agent import JobExtractionAgent
from .specialized.job_matching_agent import JobMatchingAgent, UserPreferences

from .browser.browser_controller import BrowserController, BrowserConfig
from .browser.dom_processor import DOMProcessor, ExtractedJob

from .models import (
    JobListing, JobMatchResult, CareerPageInfo,
    JobDiscoveryRequest, JobDiscoveryResult, WorkflowProgress,
    UserPreferences, SystemConfiguration, JobType, ExperienceLevel
)

__version__ = "1.0.0"
__author__ = "Multi-Agent Job Discovery System"

# Convenience imports for common usage patterns
__all__ = [
    # Core framework
    "BaseAgent",
    "AgentAction", 
    "AgentObservation",
    "ActionType",
    "AgentState",
    "AgentMemoryManager",
    "AgentToolRegistry",
    "BaseTool",
    
    # Orchestration
    "JobDiscoveryOrchestrator",
    "WorkflowStage",
    
    # Specialized agents
    "CareerDiscoveryAgent",
    "JobExtractionAgent", 
    "JobMatchingAgent",
    
    # Browser automation
    "BrowserController",
    "BrowserConfig",
    "DOMProcessor",
    "ExtractedJob",
    
    # Data models
    "JobListing",
    "JobMatchResult",
    "CareerPageInfo",
    "JobDiscoveryRequest",
    "JobDiscoveryResult", 
    "WorkflowProgress",
    "UserPreferences",
    "SystemConfiguration",
    "JobType",
    "ExperienceLevel",
]