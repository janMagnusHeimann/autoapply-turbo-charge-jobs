"""
Pytest configuration and fixtures for testing the multi-agent system.
"""

import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock
from typing import AsyncGenerator, Generator

# Set test environment
os.environ["ENVIRONMENT"] = "test"
os.environ["OPENAI_API_KEY"] = "test-key-123"
os.environ["DEBUG"] = "true"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def mock_llm_client():
    """Mock LLM client for testing."""
    mock_client = AsyncMock()
    
    # Mock chat completions
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Mock AI response"
    
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    return mock_client


@pytest.fixture
async def mock_browser_controller():
    """Mock browser controller for testing."""
    from ..browser.browser_controller import BrowserController
    
    mock_browser = AsyncMock(spec=BrowserController)
    
    # Mock common methods
    mock_browser.navigate = AsyncMock(return_value={
        "success": True,
        "url": "https://example.com/careers",
        "final_url": "https://example.com/careers",
        "status_code": 200
    })
    
    mock_browser.get_dom_content = AsyncMock(return_value={
        "success": True,
        "dom": {
            "title": "Careers - Example Company",
            "links": [
                {"text": "Software Engineer", "href": "/job/123"},
                {"text": "Product Manager", "href": "/job/124"}
            ],
            "headings": [
                {"text": "Join Our Team", "tag": "h1"},
                {"text": "Software Engineer", "tag": "h2"}
            ],
            "jobIndicators": [
                {"text": "Software Engineer - Full Stack", "class": "job-title"}
            ]
        }
    })
    
    mock_browser.get_page_content = AsyncMock(return_value={
        "success": True,
        "text": "Join our team. We're hiring Software Engineers and Product Managers.",
        "title": "Careers - Example Company",
        "url": "https://example.com/careers"
    })
    
    mock_browser.capture_screenshot = AsyncMock(return_value={
        "success": True,
        "screenshot_path": "/tmp/screenshot.png"
    })
    
    mock_browser.get_current_url = MagicMock(return_value="https://example.com/careers")
    mock_browser.get_stats = MagicMock(return_value={
        "navigation_count": 1,
        "avg_load_time": 1.5
    })
    
    mock_browser.detect_dynamic_content = AsyncMock(return_value=False)
    mock_browser.get_intercepted_api_calls = AsyncMock(return_value=[])
    
    return mock_browser


@pytest.fixture
def sample_user_preferences():
    """Sample user preferences for testing."""
    from ..models import UserPreferences, JobType
    
    return UserPreferences(
        skills=["python", "javascript", "react"],
        required_skills=["python"],
        experience_years=3,
        locations=["remote", "san francisco"],
        job_types=[JobType.REMOTE],
        salary_min=70000,
        salary_max=120000,
        minimum_match_score=0.4
    )


@pytest.fixture
def sample_job_listing():
    """Sample job listing for testing."""
    from ..models import JobListing, JobType
    
    return JobListing(
        title="Senior Python Developer",
        company="Example Corp",
        location="Remote",
        job_type=JobType.REMOTE,
        skills=["python", "django", "postgresql"],
        description="Join our team as a Senior Python Developer...",
        salary_range="$80,000 - $120,000",
        application_url="https://example.com/apply/123"
    )


@pytest.fixture
def sample_job_discovery_request(sample_user_preferences):
    """Sample job discovery request for testing."""
    from ..models import JobDiscoveryRequest
    
    return JobDiscoveryRequest(
        company_name="Example Corp",
        company_website="https://example.com",
        user_preferences=sample_user_preferences,
        max_execution_time=60,
        include_ai_analysis=False,  # Disable for faster testing
        extract_all_pages=False,
        max_pages_per_site=2
    )


@pytest.fixture
async def mock_career_discovery_agent(mock_llm_client, mock_browser_controller):
    """Mock career discovery agent."""
    from ..specialized.career_discovery_agent import CareerDiscoveryAgent
    
    agent = CareerDiscoveryAgent(
        llm_client=mock_llm_client,
        browser_controller=mock_browser_controller
    )
    
    return agent


@pytest.fixture
async def mock_job_extraction_agent(mock_llm_client, mock_browser_controller):
    """Mock job extraction agent."""
    from ..specialized.job_extraction_agent import JobExtractionAgent
    
    agent = JobExtractionAgent(
        llm_client=mock_llm_client,
        browser_controller=mock_browser_controller
    )
    
    return agent


@pytest.fixture
async def mock_job_matching_agent(mock_llm_client):
    """Mock job matching agent."""
    from ..specialized.job_matching_agent import JobMatchingAgent
    
    agent = JobMatchingAgent(llm_client=mock_llm_client)
    
    return agent


@pytest.fixture
async def mock_orchestrator(mock_llm_client):
    """Mock job discovery orchestrator."""
    from ..core.agent_orchestrator import JobDiscoveryOrchestrator
    from ..browser.browser_controller import BrowserConfig
    
    browser_config = BrowserConfig(headless=True)
    
    orchestrator = JobDiscoveryOrchestrator(
        llm_client=mock_llm_client,
        browser_config=browser_config
    )
    
    # Mock the agents
    orchestrator._career_agent = AsyncMock()
    orchestrator._extraction_agent = AsyncMock()
    orchestrator._matching_agent = AsyncMock()
    orchestrator._browser_controller = AsyncMock()
    
    return orchestrator


@pytest.fixture
def sample_extracted_jobs():
    """Sample extracted jobs for testing."""
    from ..browser.dom_processor import ExtractedJob
    
    return [
        ExtractedJob(
            title="Software Engineer",
            company="Example Corp",
            location="Remote",
            job_type="remote",
            skills=["python", "react"],
            description="Build amazing software...",
            confidence_score=0.8
        ),
        ExtractedJob(
            title="Product Manager",
            company="Example Corp", 
            location="San Francisco, CA",
            job_type="onsite",
            skills=["product management", "analytics"],
            description="Lead product development...",
            confidence_score=0.7
        )
    ]


# Mock external dependencies
@pytest.fixture(autouse=True)
def mock_external_apis(monkeypatch):
    """Mock external API calls."""
    
    # Mock OpenAI
    mock_openai_response = MagicMock()
    mock_openai_response.choices = [MagicMock()]
    mock_openai_response.choices[0].message.content = "Mock AI response"
    
    # Mock Playwright
    mock_playwright = AsyncMock()
    mock_browser = AsyncMock()
    mock_context = AsyncMock()
    mock_page = AsyncMock()
    
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)
    mock_browser.new_context = AsyncMock(return_value=mock_context)
    mock_context.new_page = AsyncMock(return_value=mock_page)
    
    # Set up page mocks
    mock_page.goto = AsyncMock(return_value=MagicMock(status=200))
    mock_page.content = AsyncMock(return_value="<html><body>Mock content</body></html>")
    mock_page.title = AsyncMock(return_value="Mock Page Title")
    mock_page.url = "https://example.com"
    
    return {
        "openai_response": mock_openai_response,
        "playwright": mock_playwright,
        "browser": mock_browser,
        "page": mock_page
    }