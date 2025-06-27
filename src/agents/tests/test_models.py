"""
Tests for data models and validation.
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from ..models import (
    JobListing, UserPreferences, JobMatchResult, CareerPageInfo,
    JobDiscoveryRequest, JobDiscoveryResult, WorkflowProgress,
    JobType, ExperienceLevel, RecommendationLevel, WorkflowStage
)


class TestJobListing:
    """Test JobListing model."""
    
    def test_job_listing_creation(self):
        """Test creating a valid job listing."""
        job = JobListing(
            title="Software Engineer",
            company="Example Corp",
            location="Remote",
            job_type=JobType.REMOTE,
            skills=["python", "react"],
            salary_min=80000,
            salary_max=120000
        )
        
        assert job.title == "Software Engineer"
        assert job.company == "Example Corp"
        assert job.job_type == JobType.REMOTE
        assert len(job.skills) == 2
        assert job.id is not None  # Auto-generated ID
    
    def test_job_listing_validation(self):
        """Test job listing validation."""
        # Test minimum requirements
        with pytest.raises(ValidationError):
            JobListing(title="", company="Example")  # Empty title
        
        with pytest.raises(ValidationError):
            JobListing(title="Engineer", company="")  # Empty company
    
    def test_salary_validation(self):
        """Test salary range validation."""
        # Valid salary range
        job = JobListing(
            title="Engineer",
            company="Example",
            salary_min=70000,
            salary_max=100000
        )
        assert job.salary_min == 70000
        assert job.salary_max == 100000
        
        # Invalid: max < min
        with pytest.raises(ValidationError):
            JobListing(
                title="Engineer",
                company="Example",
                salary_min=100000,
                salary_max=70000
            )


class TestUserPreferences:
    """Test UserPreferences model."""
    
    def test_user_preferences_creation(self):
        """Test creating valid user preferences."""
        prefs = UserPreferences(
            skills=["Python", "JavaScript"],
            required_skills=["Python"],
            experience_years=5,
            locations=["Remote", "San Francisco"],
            job_types=[JobType.REMOTE, JobType.HYBRID],
            salary_min=80000,
            salary_max=150000
        )
        
        assert len(prefs.skills) == 2
        assert "python" in prefs.skills  # Should be lowercase
        assert prefs.experience_years == 5
        assert prefs.salary_min == 80000
    
    def test_preferences_validation(self):
        """Test preferences validation."""
        # Valid preferences
        prefs = UserPreferences(skills=["python"])
        assert prefs.minimum_match_score == 0.3  # Default value
        
        # Invalid experience years
        with pytest.raises(ValidationError):
            UserPreferences(experience_years=-1)
        
        with pytest.raises(ValidationError):
            UserPreferences(experience_years=100)  # Too high
    
    def test_salary_validation(self):
        """Test salary validation in preferences."""
        # Valid salary range
        prefs = UserPreferences(
            skills=["python"],
            salary_min=70000,
            salary_max=120000
        )
        assert prefs.salary_min == 70000
        
        # Invalid: max < min
        with pytest.raises(ValidationError):
            UserPreferences(
                skills=["python"],
                salary_min=120000,
                salary_max=70000
            )


class TestJobMatchResult:
    """Test JobMatchResult model."""
    
    def test_match_result_creation(self):
        """Test creating a job match result."""
        result = JobMatchResult(
            job_id="job_123",
            job_title="Software Engineer",
            company="Example Corp",
            overall_score=0.85,
            recommendation=RecommendationLevel.HIGHLY_RECOMMENDED,
            skills_score=0.9,
            location_score=1.0,
            matching_skills=["python", "react"]
        )
        
        assert result.overall_score == 0.85
        assert result.recommendation == RecommendationLevel.HIGHLY_RECOMMENDED
        assert len(result.matching_skills) == 2
        assert result.analyzed_at is not None
    
    def test_score_validation(self):
        """Test score validation."""
        # Valid scores
        result = JobMatchResult(
            job_id="job_123",
            job_title="Engineer",
            company="Example",
            overall_score=0.5,
            recommendation=RecommendationLevel.CONSIDER
        )
        assert result.overall_score == 0.5
        
        # Invalid scores
        with pytest.raises(ValidationError):
            JobMatchResult(
                job_id="job_123",
                job_title="Engineer",
                company="Example",
                overall_score=1.5,  # > 1.0
                recommendation=RecommendationLevel.CONSIDER
            )


class TestJobDiscoveryRequest:
    """Test JobDiscoveryRequest model."""
    
    def test_request_creation(self, sample_user_preferences):
        """Test creating a job discovery request."""
        request = JobDiscoveryRequest(
            company_name="Example Corp",
            company_website="https://example.com",
            user_preferences=sample_user_preferences
        )
        
        assert request.company_name == "Example Corp"
        assert request.company_website == "https://example.com"
        assert request.request_id is not None  # Auto-generated
        assert request.created_at is not None
    
    def test_url_validation(self, sample_user_preferences):
        """Test URL validation and normalization."""
        # URL without protocol should be normalized
        request = JobDiscoveryRequest(
            company_name="Example",
            company_website="example.com",
            user_preferences=sample_user_preferences
        )
        assert request.company_website == "https://example.com"
        
        # URL with protocol should remain unchanged
        request2 = JobDiscoveryRequest(
            company_name="Example",
            company_website="http://example.com",
            user_preferences=sample_user_preferences
        )
        assert request2.company_website == "http://example.com"
    
    def test_request_validation(self, sample_user_preferences):
        """Test request validation."""
        # Valid request
        request = JobDiscoveryRequest(
            company_name="Example",
            company_website="https://example.com",
            user_preferences=sample_user_preferences
        )
        assert request.max_execution_time == 300  # Default
        
        # Invalid: empty company name
        with pytest.raises(ValidationError):
            JobDiscoveryRequest(
                company_name="",
                company_website="https://example.com",
                user_preferences=sample_user_preferences
            )


class TestWorkflowProgress:
    """Test WorkflowProgress model."""
    
    def test_progress_creation(self):
        """Test creating workflow progress."""
        progress = WorkflowProgress(
            workflow_id="workflow_123",
            stage=WorkflowStage.CAREER_DISCOVERY,
            progress_percentage=25.0,
            current_operation="Discovering career pages"
        )
        
        assert progress.workflow_id == "workflow_123"
        assert progress.stage == WorkflowStage.CAREER_DISCOVERY
        assert progress.progress_percentage == 25.0
        assert progress.start_time is not None
    
    def test_progress_validation(self):
        """Test progress validation."""
        # Valid progress
        progress = WorkflowProgress(
            workflow_id="test",
            stage=WorkflowStage.INITIALIZATION,
            progress_percentage=0.0
        )
        assert progress.progress_percentage == 0.0
        
        # Invalid: progress > 100
        with pytest.raises(ValidationError):
            WorkflowProgress(
                workflow_id="test",
                stage=WorkflowStage.INITIALIZATION,
                progress_percentage=150.0
            )
        
        # Invalid: progress < 0
        with pytest.raises(ValidationError):
            WorkflowProgress(
                workflow_id="test",
                stage=WorkflowStage.INITIALIZATION,
                progress_percentage=-10.0
            )


class TestJobDiscoveryResult:
    """Test JobDiscoveryResult model."""
    
    def test_result_creation(self):
        """Test creating job discovery result."""
        progress = WorkflowProgress(
            workflow_id="test",
            stage=WorkflowStage.COMPLETED
        )
        
        result = JobDiscoveryResult(
            request_id="req_123",
            success=True,
            workflow_progress=progress,
            total_jobs_extracted=5,
            total_matches=3
        )
        
        assert result.request_id == "req_123"
        assert result.success is True
        assert result.total_jobs_extracted == 5
        assert result.completed_at is not None
    
    def test_result_with_data(self, sample_job_listing):
        """Test result with actual job data."""
        progress = WorkflowProgress(
            workflow_id="test",
            stage=WorkflowStage.COMPLETED
        )
        
        result = JobDiscoveryResult(
            request_id="req_123",
            success=True,
            workflow_progress=progress,
            jobs_extracted=[sample_job_listing],
            total_jobs_extracted=1
        )
        
        assert len(result.jobs_extracted) == 1
        assert result.jobs_extracted[0].title == "Senior Python Developer"


class TestEnumValues:
    """Test enum values and validation."""
    
    def test_job_type_enum(self):
        """Test JobType enum."""
        assert JobType.REMOTE == "remote"
        assert JobType.HYBRID == "hybrid"
        assert JobType.ONSITE == "onsite"
    
    def test_experience_level_enum(self):
        """Test ExperienceLevel enum."""
        assert ExperienceLevel.JUNIOR == "junior"
        assert ExperienceLevel.SENIOR == "senior"
        assert ExperienceLevel.LEAD == "lead"
    
    def test_recommendation_level_enum(self):
        """Test RecommendationLevel enum."""
        assert RecommendationLevel.HIGHLY_RECOMMENDED == "highly_recommended"
        assert RecommendationLevel.NOT_RECOMMENDED == "not_recommended"
    
    def test_workflow_stage_enum(self):
        """Test WorkflowStage enum."""
        assert WorkflowStage.INITIALIZATION == "initialization"
        assert WorkflowStage.COMPLETED == "completed"
        assert WorkflowStage.ERROR == "error"