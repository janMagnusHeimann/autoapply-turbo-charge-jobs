"""
Tests for FastAPI endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
import json

from ..api.main import app
from ..models import JobDiscoveryRequest, UserPreferences, JobType


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_request_data():
    """Sample request data for API testing."""
    return {
        "company_name": "Example Corp",
        "company_website": "https://example.com",
        "user_preferences": {
            "skills": ["python", "javascript"],
            "required_skills": ["python"],
            "experience_years": 3,
            "locations": ["remote"],
            "job_types": ["remote"],
            "salary_min": 70000,
            "minimum_match_score": 0.4
        },
        "include_ai_analysis": False,  # Disable for faster testing
        "extract_all_pages": False,
        "max_pages_per_site": 2
    }


class TestAPIEndpoints:
    """Test FastAPI endpoints."""
    
    @patch('src.agents.api.main.orchestrator')
    def test_health_check(self, mock_orchestrator, client):
        """Test health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
    
    @patch('src.agents.api.main.orchestrator')
    def test_job_discovery_start(self, mock_orchestrator, client, sample_request_data):
        """Test starting job discovery workflow."""
        # Mock orchestrator as available
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(
            "/api/multi-agent-job-discovery",
            json=sample_request_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "workflow_id" in data
        assert data["status"] == "started"
        assert "Example Corp" in data["message"]
    
    def test_job_discovery_validation(self, client):
        """Test job discovery request validation."""
        # Missing company name
        invalid_data = {
            "company_name": "",
            "company_website": "https://example.com",
            "user_preferences": {
                "skills": ["python"],
                "experience_years": 3
            }
        }
        
        response = client.post(
            "/api/multi-agent-job-discovery",
            json=invalid_data
        )
        
        assert response.status_code == 400
        assert "Company name is required" in response.json()["detail"]
    
    @patch('src.agents.api.main.orchestrator')
    def test_workflow_status(self, mock_orchestrator, client):
        """Test workflow status endpoint."""
        workflow_id = "test_workflow_123"
        
        # Mock workflow status
        mock_progress = MagicMock()
        mock_progress.workflow_id = workflow_id
        mock_progress.stage.value = "career_discovery"
        mock_progress.progress_percentage = 50.0
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.get_workflow_status = AsyncMock(return_value=mock_progress)
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get(f"/api/workflow-status/{workflow_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_id"] == workflow_id
        assert data["found"] is True
    
    @patch('src.agents.api.main.orchestrator') 
    def test_workflow_status_not_found(self, mock_orchestrator, client):
        """Test workflow status for non-existent workflow."""
        workflow_id = "non_existent_workflow"
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.get_workflow_status = AsyncMock(return_value=None)
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get(f"/api/workflow-status/{workflow_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_id"] == workflow_id
        assert data["found"] is False
    
    @patch('src.agents.api.main.orchestrator')
    def test_workflow_result(self, mock_orchestrator, client):
        """Test workflow result endpoint."""
        workflow_id = "completed_workflow_123"
        
        # Mock completed workflow
        mock_result = MagicMock()
        mock_result.request_id = workflow_id
        mock_result.success = True
        mock_result.total_jobs_extracted = 5
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.get_workflow_status = AsyncMock(return_value=None)  # Not active
        mock_orchestrator_instance.completed_workflows = {workflow_id: mock_result}
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get(f"/api/workflow-result/{workflow_id}")
        
        assert response.status_code == 200
        # Response should contain the mock result
    
    @patch('src.agents.api.main.orchestrator')
    def test_workflow_result_still_running(self, mock_orchestrator, client):
        """Test workflow result for still-running workflow."""
        workflow_id = "running_workflow_123"
        
        # Mock running workflow
        mock_progress = MagicMock()
        mock_progress.workflow_id = workflow_id
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.get_workflow_status = AsyncMock(return_value=mock_progress)
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get(f"/api/workflow-result/{workflow_id}")
        
        assert response.status_code == 202  # Still running
    
    @patch('src.agents.api.main.orchestrator')
    def test_cancel_workflow(self, mock_orchestrator, client):
        """Test workflow cancellation."""
        workflow_id = "workflow_to_cancel"
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.cancel_workflow = AsyncMock(return_value=True)
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(f"/api/cancel-workflow/{workflow_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cancelled successfully" in data["message"]
    
    @patch('src.agents.api.main.orchestrator')
    def test_cancel_workflow_not_found(self, mock_orchestrator, client):
        """Test cancelling non-existent workflow."""
        workflow_id = "non_existent_workflow"
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.cancel_workflow = AsyncMock(return_value=False)
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(f"/api/cancel-workflow/{workflow_id}")
        
        assert response.status_code == 404
    
    @patch('src.agents.api.main.orchestrator')
    def test_find_career_page(self, mock_orchestrator, client):
        """Test career page discovery endpoint."""
        mock_orchestrator_instance = AsyncMock()
        
        # Mock career agent
        mock_career_agent = AsyncMock()
        mock_career_agent.discover_career_pages = AsyncMock(return_value={
            "success": True,
            "discovered_career_pages": [
                {"url": "https://example.com/careers", "confidence": 0.9}
            ]
        })
        
        mock_orchestrator_instance._initialize_agents = AsyncMock()
        mock_orchestrator_instance._career_agent = mock_career_agent
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(
            "/api/find-career-page",
            params={
                "company_website": "https://example.com",
                "company_name": "Example Corp"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["career_pages"]) == 1
    
    @patch('src.agents.api.main.orchestrator')
    def test_extract_jobs(self, mock_orchestrator, client):
        """Test job extraction endpoint."""
        mock_orchestrator_instance = AsyncMock()
        
        # Mock extraction agent
        mock_extraction_agent = AsyncMock()
        mock_extraction_agent.extract_jobs_from_page = AsyncMock(return_value={
            "success": True,
            "jobs_extracted": [
                {"title": "Software Engineer", "company": "Example Corp"}
            ]
        })
        
        mock_orchestrator_instance._initialize_agents = AsyncMock()
        mock_orchestrator_instance._extraction_agent = mock_extraction_agent
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(
            "/api/extract-jobs",
            params={
                "page_url": "https://example.com/careers",
                "company_name": "Example Corp",
                "max_pages": 3
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["jobs"]) == 1
    
    @patch('src.agents.api.main.orchestrator')
    def test_match_jobs(self, mock_orchestrator, client):
        """Test job matching endpoint."""
        mock_orchestrator_instance = AsyncMock()
        
        # Mock matching agent
        mock_matching_agent = AsyncMock()
        mock_matching_agent.match_jobs_to_preferences = AsyncMock(return_value={
            "success": True,
            "match_results": [
                MagicMock(overall_score=0.85, recommendation="highly_recommended")
            ],
            "match_summary": {"total_jobs": 1}
        })
        
        mock_orchestrator_instance._initialize_agents = AsyncMock()
        mock_orchestrator_instance._matching_agent = mock_matching_agent
        mock_orchestrator = mock_orchestrator_instance
        
        # Prepare request data
        jobs_data = [
            {
                "title": "Python Developer",
                "company": "Example Corp",
                "skills": ["python", "django"],
                "location": "Remote"
            }
        ]
        
        preferences_data = {
            "skills": ["python"],
            "experience_years": 3,
            "locations": ["remote"],
            "minimum_match_score": 0.4
        }
        
        response = client.post(
            "/api/match-jobs",
            json={
                "jobs": jobs_data,
                "user_preferences": preferences_data,
                "include_ai_analysis": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["matches"]) == 1
    
    @patch('src.agents.api.main.orchestrator')
    def test_system_status(self, mock_orchestrator, client):
        """Test system status endpoint."""
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.get_orchestrator_stats = MagicMock(return_value={
            "workflows_started": 10,
            "workflows_completed": 8,
            "workflows_failed": 2
        })
        mock_orchestrator_instance.active_workflows = {}
        mock_orchestrator_instance.completed_workflows = {}
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get("/api/system-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "orchestrator_stats" in data
        assert "active_workflows" in data
    
    @patch('src.agents.api.main.orchestrator')
    def test_active_workflows(self, mock_orchestrator, client):
        """Test active workflows listing."""
        from datetime import datetime
        
        # Mock active workflows
        mock_progress = MagicMock()
        mock_progress.workflow_id = "workflow_123"
        mock_progress.stage.value = "job_extraction"
        mock_progress.progress_percentage = 75.0
        mock_progress.current_operation = "Extracting jobs"
        mock_progress.start_time = datetime.utcnow()
        mock_progress.errors_encountered = []
        
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.active_workflows = {"workflow_123": mock_progress}
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.get("/api/active-workflows")
        
        assert response.status_code == 200
        data = response.json()
        assert "active_workflows" in data
        assert data["total_active"] == 1
        assert len(data["active_workflows"]) == 1
    
    def test_invalid_endpoints(self, client):
        """Test invalid endpoint handling."""
        # Non-existent endpoint
        response = client.get("/api/non-existent-endpoint")
        assert response.status_code == 404
        
        # Invalid method
        response = client.put("/health")
        assert response.status_code == 405  # Method not allowed


class TestAPIValidation:
    """Test API request validation."""
    
    def test_job_discovery_request_validation(self, client):
        """Test job discovery request validation."""
        # Missing required fields
        invalid_requests = [
            {},  # Empty request
            {"company_name": "Test"},  # Missing website and preferences
            {
                "company_name": "Test",
                "company_website": "invalid-url",
                "user_preferences": {}
            },  # Invalid URL and empty preferences
        ]
        
        for invalid_request in invalid_requests:
            response = client.post(
                "/api/multi-agent-job-discovery",
                json=invalid_request
            )
            assert response.status_code in [400, 422]  # Bad request or validation error
    
    def test_find_career_page_validation(self, client):
        """Test career page discovery validation."""
        # Missing website parameter
        response = client.post("/api/find-career-page")
        assert response.status_code == 400
        
        # Empty website
        response = client.post(
            "/api/find-career-page",
            params={"company_website": ""}
        )
        assert response.status_code == 400
    
    def test_extract_jobs_validation(self, client):
        """Test job extraction validation."""
        # Missing page_url parameter
        response = client.post("/api/extract-jobs")
        assert response.status_code == 400
        
        # Empty page_url
        response = client.post(
            "/api/extract-jobs",
            params={"page_url": ""}
        )
        assert response.status_code == 400
    
    def test_match_jobs_validation(self, client):
        """Test job matching validation."""
        # Empty jobs list
        response = client.post(
            "/api/match-jobs",
            json={
                "jobs": [],
                "user_preferences": {
                    "skills": ["python"],
                    "experience_years": 3
                }
            }
        )
        assert response.status_code == 400


class TestAPIErrorHandling:
    """Test API error handling."""
    
    @patch('src.agents.api.main.orchestrator')
    def test_orchestrator_not_available(self, mock_orchestrator, client):
        """Test handling when orchestrator is not available."""
        # Mock orchestrator as None
        mock_orchestrator = None
        
        response = client.post(
            "/api/multi-agent-job-discovery",
            json={
                "company_name": "Test",
                "company_website": "https://test.com",
                "user_preferences": {"skills": ["python"]}
            }
        )
        
        assert response.status_code == 503  # Service unavailable
    
    @patch('src.agents.api.main.orchestrator')
    def test_internal_server_error(self, mock_orchestrator, client, sample_request_data):
        """Test internal server error handling."""
        # Mock orchestrator to raise exception
        mock_orchestrator_instance = AsyncMock()
        mock_orchestrator_instance.side_effect = Exception("Internal error")
        mock_orchestrator = mock_orchestrator_instance
        
        response = client.post(
            "/api/multi-agent-job-discovery",
            json=sample_request_data
        )
        
        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["status_code"] == 500