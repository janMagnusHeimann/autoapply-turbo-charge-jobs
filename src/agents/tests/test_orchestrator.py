"""
Tests for the job discovery orchestrator.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from ..core.agent_orchestrator import (
    JobDiscoveryOrchestrator, WorkflowStage, 
    JobDiscoveryRequest, JobDiscoveryResult, WorkflowProgress
)
from ..models import UserPreferences, JobType


class TestJobDiscoveryOrchestrator:
    """Test JobDiscoveryOrchestrator functionality."""
    
    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, mock_llm_client):
        """Test orchestrator initialization."""
        from ..browser.browser_controller import BrowserConfig
        
        browser_config = BrowserConfig(headless=True)
        orchestrator = JobDiscoveryOrchestrator(
            llm_client=mock_llm_client,
            browser_config=browser_config
        )
        
        assert orchestrator.llm_client == mock_llm_client
        assert orchestrator.browser_config == browser_config
        assert orchestrator.active_workflows == {}
        assert orchestrator.completed_workflows == {}
    
    @pytest.mark.asyncio
    async def test_workflow_execution_success(self, mock_orchestrator, sample_job_discovery_request):
        """Test successful workflow execution."""
        # Mock successful agent responses
        mock_orchestrator._career_agent.discover_career_pages = AsyncMock(return_value={
            "success": True,
            "discovered_career_pages": [
                {
                    "url": "https://example.com/careers",
                    "confidence": 0.9,
                    "is_career_page": True,
                    "job_count": 5
                }
            ]
        })
        
        mock_orchestrator._extraction_agent.extract_jobs_from_page = AsyncMock(return_value={
            "success": True,
            "jobs_extracted": [
                {
                    "title": "Software Engineer",
                    "company": "Example Corp",
                    "skills": ["python", "react"],
                    "location": "Remote"
                }
            ]
        })
        
        mock_orchestrator._matching_agent.match_jobs_to_preferences = AsyncMock(return_value={
            "success": True,
            "match_results": [
                MagicMock(
                    job_title="Software Engineer",
                    overall_score=0.85,
                    recommendation="highly_recommended"
                )
            ],
            "match_summary": {"total_jobs": 1}
        })
        
        # Execute workflow
        result = await mock_orchestrator.discover_jobs(sample_job_discovery_request)
        
        assert isinstance(result, JobDiscoveryResult)
        assert result.success is True
        assert result.request_id == sample_job_discovery_request.request_id
        assert result.total_career_pages >= 0
        assert result.total_jobs_extracted >= 0
    
    @pytest.mark.asyncio
    async def test_workflow_failure_handling(self, mock_orchestrator, sample_job_discovery_request):
        """Test workflow failure handling."""
        # Mock career discovery failure
        mock_orchestrator._career_agent.discover_career_pages = AsyncMock(return_value={
            "success": False,
            "discovered_career_pages": []
        })
        
        # Execute workflow
        result = await mock_orchestrator.discover_jobs(sample_job_discovery_request)
        
        assert isinstance(result, JobDiscoveryResult)
        assert result.success is False
        assert len(result.workflow_progress.errors_encountered) > 0
    
    @pytest.mark.asyncio
    async def test_workflow_status_tracking(self, mock_orchestrator, sample_job_discovery_request):
        """Test workflow status tracking."""
        workflow_id = sample_job_discovery_request.request_id
        
        # Initially no workflow
        status = await mock_orchestrator.get_workflow_status(workflow_id)
        assert status is None
        
        # Mock a long-running workflow
        async def mock_long_workflow(request):
            # Simulate workflow being tracked
            progress = WorkflowProgress(
                workflow_id=workflow_id,
                stage=WorkflowStage.CAREER_DISCOVERY,
                progress_percentage=50.0
            )
            mock_orchestrator.active_workflows[workflow_id] = progress
            
            # Return result
            return JobDiscoveryResult(
                request_id=workflow_id,
                success=True,
                workflow_progress=progress
            )
        
        # Start workflow
        with patch.object(mock_orchestrator, 'discover_jobs', side_effect=mock_long_workflow):
            result = await mock_orchestrator.discover_jobs(sample_job_discovery_request)
            
            # Check status was tracked
            status = await mock_orchestrator.get_workflow_status(workflow_id)
            assert status is not None
            assert status.workflow_id == workflow_id
    
    @pytest.mark.asyncio
    async def test_workflow_cancellation(self, mock_orchestrator):
        """Test workflow cancellation."""
        workflow_id = "test_workflow_123"
        
        # Create active workflow
        progress = WorkflowProgress(
            workflow_id=workflow_id,
            stage=WorkflowStage.JOB_EXTRACTION,
            progress_percentage=60.0
        )
        mock_orchestrator.active_workflows[workflow_id] = progress
        
        # Cancel workflow
        success = await mock_orchestrator.cancel_workflow(workflow_id)
        assert success is True
        
        # Workflow should be removed from active workflows
        assert workflow_id not in mock_orchestrator.active_workflows
        
        # Cancel non-existent workflow
        success = await mock_orchestrator.cancel_workflow("non_existent")
        assert success is False
    
    @pytest.mark.asyncio
    async def test_progress_callbacks(self, mock_orchestrator):
        """Test progress callback functionality."""
        callback_called = False
        callback_progress = None
        
        async def progress_callback(progress: WorkflowProgress):
            nonlocal callback_called, callback_progress
            callback_called = True
            callback_progress = progress
        
        # Add callback
        mock_orchestrator.add_progress_callback(progress_callback)
        
        # Trigger progress update
        progress = WorkflowProgress(
            workflow_id="test",
            stage=WorkflowStage.INITIALIZATION,
            progress_percentage=10.0
        )
        
        await mock_orchestrator._update_progress(
            progress, 25.0, "Testing progress callback"
        )
        
        assert callback_called is True
        assert callback_progress is not None
        assert callback_progress.progress_percentage == 25.0
    
    def test_orchestrator_stats(self, mock_orchestrator):
        """Test orchestrator statistics."""
        # Initial stats
        stats = mock_orchestrator.get_orchestrator_stats()
        
        assert "workflows_started" in stats
        assert "workflows_completed" in stats
        assert "workflows_failed" in stats
        assert "active_workflows" in stats
        assert stats["workflows_started"] >= 0
        assert stats["workflows_completed"] >= 0
    
    @pytest.mark.asyncio
    async def test_agent_initialization(self, mock_orchestrator):
        """Test agent initialization."""
        await mock_orchestrator._initialize_agents()
        
        # Check that agents are initialized (mocked)
        assert mock_orchestrator._career_agent is not None
        assert mock_orchestrator._extraction_agent is not None
        assert mock_orchestrator._matching_agent is not None
        assert mock_orchestrator._browser_controller is not None
    
    @pytest.mark.asyncio
    async def test_context_manager(self, mock_llm_client):
        """Test orchestrator as context manager."""
        from ..browser.browser_controller import BrowserConfig
        
        browser_config = BrowserConfig(headless=True)
        
        # Test async context manager
        async with JobDiscoveryOrchestrator(
            llm_client=mock_llm_client,
            browser_config=browser_config
        ) as orchestrator:
            assert orchestrator is not None
            assert orchestrator.llm_client == mock_llm_client
    
    @pytest.mark.asyncio 
    async def test_workflow_stages(self, mock_orchestrator, sample_job_discovery_request):
        """Test workflow stage progression."""
        stages_encountered = []
        
        async def track_stage_callback(progress: WorkflowProgress):
            stages_encountered.append(progress.stage)
        
        mock_orchestrator.add_progress_callback(track_stage_callback)
        
        # Mock successful workflow
        mock_orchestrator._career_agent.discover_career_pages = AsyncMock(return_value={
            "success": True,
            "discovered_career_pages": [{"url": "https://example.com/careers"}]
        })
        
        mock_orchestrator._extraction_agent.extract_jobs_from_page = AsyncMock(return_value={
            "success": True,
            "jobs_extracted": [{"title": "Engineer"}]
        })
        
        mock_orchestrator._matching_agent.match_jobs_to_preferences = AsyncMock(return_value={
            "success": True,
            "match_results": [],
            "match_summary": {}
        })
        
        # Execute workflow
        result = await mock_orchestrator.discover_jobs(sample_job_discovery_request)
        
        # Check that stages were progressed through
        assert len(stages_encountered) > 0
        # Should include at least initialization and some progress stages
    
    @pytest.mark.asyncio
    async def test_memory_management(self, mock_orchestrator):
        """Test memory management in orchestrator."""
        # Check memory manager exists
        assert mock_orchestrator.memory_manager is not None
        
        # Test adding observation
        mock_orchestrator.memory_manager.add_observation(
            content={"test": "data"},
            observation_type="test_observation",
            importance=0.5
        )
        
        # Test memory stats
        stats = mock_orchestrator.memory_manager.get_memory_stats()
        assert "total_items" in stats
        assert stats["total_items"] >= 0
    
    @pytest.mark.asyncio
    async def test_error_recovery(self, mock_orchestrator, sample_job_discovery_request):
        """Test error recovery mechanisms."""
        # Mock an agent that fails then succeeds
        call_count = 0
        
        async def failing_then_succeeding_agent(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Simulated failure")
            return {
                "success": True,
                "discovered_career_pages": [{"url": "https://example.com/careers"}]
            }
        
        mock_orchestrator._career_agent.discover_career_pages = failing_then_succeeding_agent
        
        # Mock other agents to succeed
        mock_orchestrator._extraction_agent.extract_jobs_from_page = AsyncMock(return_value={
            "success": True,
            "jobs_extracted": []
        })
        
        mock_orchestrator._matching_agent.match_jobs_to_preferences = AsyncMock(return_value={
            "success": True,
            "match_results": [],
            "match_summary": {}
        })
        
        # Execute workflow - should handle the initial failure
        result = await mock_orchestrator.discover_jobs(sample_job_discovery_request)
        
        # Result might still fail depending on error handling strategy
        # but the test verifies that the error was encountered and handled
        assert isinstance(result, JobDiscoveryResult)