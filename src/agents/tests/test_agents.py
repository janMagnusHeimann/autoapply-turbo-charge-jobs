"""
Tests for individual agent implementations.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from ..core.base_agent import AgentState, ActionType
from ..specialized.career_discovery_agent import CareerDiscoveryAgent
from ..specialized.job_extraction_agent import JobExtractionAgent
from ..specialized.job_matching_agent import JobMatchingAgent, UserPreferences
from ..browser.dom_processor import DOMProcessor, ExtractedJob


class TestCareerDiscoveryAgent:
    """Test CareerDiscoveryAgent functionality."""
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self, mock_llm_client, mock_browser_controller):
        """Test agent initialization."""
        agent = CareerDiscoveryAgent(
            llm_client=mock_llm_client,
            browser_controller=mock_browser_controller
        )
        
        assert agent.name == "CareerDiscoveryAgent"
        assert agent.llm_client == mock_llm_client
        assert agent.browser_controller == mock_browser_controller
        assert agent.state == AgentState.IDLE
    
    @pytest.mark.asyncio
    async def test_discover_career_pages_success(self, mock_career_discovery_agent):
        """Test successful career page discovery."""
        # Mock the execute_task method to return success
        mock_result = {
            "success": True,
            "discovered_career_pages": [
                {
                    "url": "https://example.com/careers",
                    "confidence": 0.9,
                    "is_career_page": True
                }
            ]
        }
        
        with patch.object(mock_career_discovery_agent, 'execute_task', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = mock_result
            
            result = await mock_career_discovery_agent.discover_career_pages(
                company_website="https://example.com",
                company_name="Example Corp"
            )
            
            assert result["success"] is True
            assert len(result["discovered_career_pages"]) == 1
            assert result["discovered_career_pages"][0]["url"] == "https://example.com/careers"
    
    @pytest.mark.asyncio
    async def test_career_discovery_patterns(self, mock_career_discovery_agent):
        """Test career URL pattern matching."""
        agent = mock_career_discovery_agent
        
        # Test pattern matching
        patterns = agent.career_url_patterns
        assert "/careers" in patterns
        assert "/jobs" in patterns
        assert "/positions" in patterns
        
        # Test alternative patterns
        alt_patterns = agent.alternative_patterns
        assert "/about/careers" in alt_patterns
        assert "/company/careers" in alt_patterns


class TestJobExtractionAgent:
    """Test JobExtractionAgent functionality."""
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self, mock_llm_client, mock_browser_controller):
        """Test agent initialization."""
        agent = JobExtractionAgent(
            llm_client=mock_llm_client,
            browser_controller=mock_browser_controller
        )
        
        assert agent.name == "JobExtractionAgent"
        assert agent.llm_client == mock_llm_client
        assert agent.browser_controller == mock_browser_controller
    
    @pytest.mark.asyncio
    async def test_extract_jobs_success(self, mock_job_extraction_agent):
        """Test successful job extraction."""
        mock_result = {
            "success": True,
            "jobs_extracted": [
                {
                    "title": "Software Engineer",
                    "company": "Example Corp",
                    "location": "Remote",
                    "skills": ["python", "react"],
                    "confidence_score": 0.8
                }
            ],
            "total_jobs": 1
        }
        
        with patch.object(mock_job_extraction_agent, 'execute_task', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = mock_result
            
            result = await mock_job_extraction_agent.extract_jobs_from_page(
                page_url="https://example.com/careers",
                company_name="Example Corp"
            )
            
            assert result["success"] is True
            assert result["total_jobs"] == 1
            assert len(result["jobs_extracted"]) == 1
    
    @pytest.mark.asyncio
    async def test_validation_rules(self, mock_job_extraction_agent):
        """Test job validation rules."""
        agent = mock_job_extraction_agent
        
        # Valid job
        valid_job = {
            "title": "Software Engineer",
            "company": "Example Corp",
            "description": "Great job opportunity"
        }
        assert agent._is_valid_job(valid_job) is True
        
        # Invalid job - no title
        invalid_job = {
            "title": "",
            "company": "Example Corp"
        }
        assert agent._is_valid_job(invalid_job) is False
        
        # Invalid job - blacklisted title
        blacklisted_job = {
            "title": "test position",
            "company": "Example Corp"
        }
        assert agent._is_valid_job(blacklisted_job) is False


class TestJobMatchingAgent:
    """Test JobMatchingAgent functionality."""
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self, mock_llm_client):
        """Test agent initialization."""
        agent = JobMatchingAgent(llm_client=mock_llm_client)
        
        assert agent.name == "JobMatchingAgent"
        assert agent.llm_client == mock_llm_client
        assert agent.browser_controller is None  # Doesn't need browser
    
    @pytest.mark.asyncio
    async def test_match_jobs_success(self, mock_job_matching_agent, sample_user_preferences):
        """Test successful job matching."""
        jobs = [
            {
                "id": "job_1",
                "title": "Python Developer",
                "company": "Example Corp",
                "skills": ["python", "django"],
                "location": "Remote",
                "job_type": "remote"
            }
        ]
        
        mock_result = {
            "success": True,
            "match_results": [
                MagicMock(
                    job_id="job_1",
                    job_title="Python Developer",
                    company="Example Corp",
                    overall_score=0.85,
                    recommendation="highly_recommended"
                )
            ],
            "match_summary": {
                "total_jobs": 1,
                "average_scores": {"overall": 0.85}
            }
        }
        
        with patch.object(mock_job_matching_agent, 'execute_task', new_callable=AsyncMock) as mock_execute:
            mock_execute.return_value = mock_result
            
            result = await mock_job_matching_agent.match_jobs_to_preferences(
                jobs=jobs,
                user_preferences=sample_user_preferences
            )
            
            assert result["success"] is True
            assert len(result["match_results"]) == 1
            assert result["match_results"][0].overall_score == 0.85
    
    def test_skills_matching(self, mock_job_matching_agent):
        """Test skills matching logic."""
        agent = mock_job_matching_agent
        
        # Test direct skill match
        job_skills = ["python", "django", "postgresql"]
        assert agent._skills_match("python", job_skills) is True
        assert agent._skills_match("java", job_skills) is False
        
        # Test partial match
        assert agent._skills_match("py", job_skills) is True  # "py" in "python"
    
    def test_salary_score_calculation(self, mock_job_matching_agent, sample_user_preferences):
        """Test salary compatibility scoring."""
        agent = mock_job_matching_agent
        
        # Perfect match
        job_with_salary = {
            "salary_range": "$80,000 - $100,000"
        }
        score = agent._calculate_salary_score(job_with_salary, sample_user_preferences)
        assert score > 0.8  # Should be high score
        
        # No salary info
        job_without_salary = {
            "salary_range": ""
        }
        score = agent._calculate_salary_score(job_without_salary, sample_user_preferences)
        assert score == 0.5  # Neutral score
    
    def test_location_score_calculation(self, mock_job_matching_agent, sample_user_preferences):
        """Test location compatibility scoring."""
        agent = mock_job_matching_agent
        
        # Remote job, user wants remote
        remote_job = {
            "location": "Remote",
            "job_type": "remote"
        }
        score = agent._calculate_location_score(remote_job, sample_user_preferences)
        assert score == 1.0  # Perfect match
        
        # Location match
        sf_job = {
            "location": "San Francisco, CA",
            "job_type": "onsite"
        }
        score = agent._calculate_location_score(sf_job, sample_user_preferences)
        assert score == 1.0  # Should match "san francisco" preference


class TestDOMProcessor:
    """Test DOM processing functionality."""
    
    def test_processor_initialization(self):
        """Test DOM processor initialization."""
        processor = DOMProcessor()
        
        assert processor.job_keywords is not None
        assert "titles" in processor.job_keywords
        assert "locations" in processor.job_keywords
        assert processor.job_selectors is not None
    
    def test_page_analysis(self):
        """Test page analysis functionality."""
        processor = DOMProcessor()
        
        # Mock DOM content
        dom_content = {
            "title": "Careers - Example Company",
            "links": [
                {"text": "Software Engineer Position", "href": "/job/123"}
            ],
            "headings": [
                {"text": "Join Our Team", "tag": "h1"},
                {"text": "Software Engineer", "tag": "h2"}
            ],
            "jobIndicators": [
                {"text": "Software Engineer - Full Stack", "class": "job-title"}
            ]
        }
        
        analysis = processor.analyze_page(dom_content, "https://example.com/careers")
        
        assert analysis.is_career_page is True
        assert analysis.confidence_score > 0.5
        assert analysis.job_count >= 0
        assert len(analysis.indicators) > 0
    
    def test_job_extraction_from_text(self):
        """Test job extraction from text content."""
        processor = DOMProcessor()
        
        page_content = {
            "text": "Join our team! We're hiring Software Engineers and Product Managers.",
            "html": "<html><body>Join our team!</body></html>"
        }
        
        dom_content = {
            "title": "Careers",
            "links": [],
            "headings": [
                {"text": "Software Engineer", "tag": "h2"},
                {"text": "Product Manager", "tag": "h2"}
            ]
        }
        
        jobs = processor.extract_jobs(
            page_content, 
            dom_content, 
            "https://example.com/careers",
            "Example Corp"
        )
        
        assert isinstance(jobs, list)
        # May extract jobs based on headings that look like job titles
    
    def test_career_page_link_extraction(self):
        """Test career page link extraction."""
        processor = DOMProcessor()
        
        dom_content = {
            "links": [
                {"text": "Careers", "href": "/careers"},
                {"text": "Jobs", "href": "/jobs"},
                {"text": "About Us", "href": "/about"},
                {"text": "Join Our Team", "href": "/join"}
            ]
        }
        
        career_links = processor.extract_career_page_links(dom_content, "https://example.com")
        
        # Should find career-related links
        assert len(career_links) >= 2  # At least "Careers" and "Jobs"
        
        # Check if links are sorted by relevance
        if career_links:
            assert career_links[0]["relevance_score"] > 0
    
    def test_extracted_job_model(self):
        """Test ExtractedJob model."""
        job = ExtractedJob(
            title="Software Engineer",
            company="Example Corp",
            location="Remote",
            confidence_score=0.8
        )
        
        assert job.title == "Software Engineer"
        assert job.company == "Example Corp"
        assert job.confidence_score == 0.8
        assert job.skills == []  # Default empty list