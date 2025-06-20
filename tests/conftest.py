"""Pytest configuration and fixtures."""

import pytest
import sys
from pathlib import Path

# Add backend to path for all tests
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


@pytest.fixture
def memory_manager():
    """Fixture for MemoryManager instance."""
    from src.job_automation.core.memory import MemoryManager
    return MemoryManager()


@pytest.fixture
def tool_registry():
    """Fixture for ToolRegistry instance."""
    from src.job_automation.core.tools import ToolRegistry
    return ToolRegistry()


@pytest.fixture
def mock_logger():
    """Fixture for mock logger."""
    import logging
    from unittest.mock import Mock
    
    logger = Mock(spec=logging.Logger)
    logger.info = Mock()
    logger.error = Mock()
    logger.warning = Mock()
    logger.debug = Mock()
    
    return logger


@pytest.fixture
def sample_knowledge():
    """Fixture for sample knowledge data."""
    return {
        "job_search": {
            "best_practices": [
                "Tailor resume to job description",
                "Write personalized cover letters",
                "Follow up after applications"
            ],
            "common_mistakes": [
                "Generic applications",
                "Poor follow-up",
                "Inadequate research"
            ]
        },
        "companies": {
            "tech_giants": {
                "google": {"culture": "innovation", "hiring_bar": "high"},
                "microsoft": {"culture": "inclusive", "hiring_bar": "high"}
            }
        }
    }


@pytest.fixture
def sample_experiences():
    """Fixture for sample experience data."""
    return [
        {
            "type": "job_application",
            "data": {"personalized": True, "quick_response": True},
            "outcome": "success"
        },
        {
            "type": "job_application", 
            "data": {"personalized": False, "quick_response": False},
            "outcome": "failure"
        },
        {
            "type": "interview",
            "data": {"prepared": True, "researched_company": True},
            "outcome": "success"
        }
    ]