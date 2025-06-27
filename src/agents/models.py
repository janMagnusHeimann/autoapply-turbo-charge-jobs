"""
Pydantic data models for the multi-agent job discovery system.
Provides structured data validation and serialization.
"""

from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, validator, root_validator
import uuid


# Enums for consistent values

class JobType(str, Enum):
    """Job type enumeration."""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    FLEXIBLE = "flexible"


class ExperienceLevel(str, Enum):
    """Experience level enumeration."""
    INTERN = "intern"
    ENTRY = "entry"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    PRINCIPAL = "principal"
    STAFF = "staff"


class CompanySize(str, Enum):
    """Company size enumeration."""
    STARTUP = "startup"       # < 50 employees
    SMALL = "small"          # 50-200 employees
    MEDIUM = "medium"        # 200-1000 employees
    LARGE = "large"          # > 1000 employees


class RecommendationLevel(str, Enum):
    """Job recommendation level."""
    HIGHLY_RECOMMENDED = "highly_recommended"
    RECOMMENDED = "recommended"
    CONSIDER = "consider"
    NOT_RECOMMENDED = "not_recommended"


class WorkflowStage(str, Enum):
    """Workflow execution stages."""
    INITIALIZATION = "initialization"
    CAREER_DISCOVERY = "career_discovery"
    CAREER_VERIFICATION = "career_verification"
    JOB_EXTRACTION = "job_extraction"
    JOB_MATCHING = "job_matching"
    RESULT_COMPILATION = "result_compilation"
    COMPLETED = "completed"
    ERROR = "error"


# Core data models

class JobListing(BaseModel):
    """Represents a job listing extracted from a website."""
    
    # Required fields
    title: str = Field(..., min_length=1, max_length=500, description="Job title")
    company: str = Field(..., min_length=1, max_length=200, description="Company name")
    
    # Optional job details
    location: Optional[str] = Field(None, max_length=200, description="Job location")
    job_type: Optional[JobType] = Field(None, description="Type of job (remote/hybrid/onsite)")
    experience_level: Optional[ExperienceLevel] = Field(None, description="Required experience level")
    department: Optional[str] = Field(None, max_length=100, description="Department or team")
    
    # Compensation
    salary_range: Optional[str] = Field(None, max_length=100, description="Salary range as string")
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")
    currency: Optional[str] = Field("USD", max_length=3, description="Currency code")
    
    # Job content
    description: Optional[str] = Field(None, description="Full job description")
    summary: Optional[str] = Field(None, max_length=1000, description="Brief job summary")
    requirements: Optional[List[str]] = Field(default_factory=list, description="Job requirements")
    responsibilities: Optional[List[str]] = Field(default_factory=list, description="Job responsibilities")
    benefits: Optional[List[str]] = Field(default_factory=list, description="Job benefits")
    
    # Skills and technologies
    skills: Optional[List[str]] = Field(default_factory=list, description="Required/preferred skills")
    technologies: Optional[List[str]] = Field(default_factory=list, description="Technologies used")
    
    # Application details
    application_url: Optional[str] = Field(None, description="URL to apply for the job")
    application_deadline: Optional[datetime] = Field(None, description="Application deadline")
    posted_date: Optional[datetime] = Field(None, description="Job posting date")
    
    # Metadata
    source_url: Optional[str] = Field(None, description="URL where job was found")
    extraction_method: Optional[str] = Field(None, description="Method used to extract job")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Extraction confidence")
    extracted_at: datetime = Field(default_factory=datetime.utcnow, description="Extraction timestamp")
    
    # Unique identifier
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique job ID")
    
    @validator('salary_max')
    def salary_max_greater_than_min(cls, v, values):
        """Validate salary_max >= salary_min."""
        if v is not None and 'salary_min' in values and values['salary_min'] is not None:
            if v < values['salary_min']:
                raise ValueError('salary_max must be greater than or equal to salary_min')
        return v
    
    @validator('skills', 'technologies', 'requirements', 'responsibilities', 'benefits')
    def validate_lists_not_empty_strings(cls, v):
        """Remove empty strings from lists."""
        if v is not None:
            return [item.strip() for item in v if item and item.strip()]
        return v


class UserPreferences(BaseModel):
    """User preferences for job matching."""
    
    # Skills and experience
    skills: List[str] = Field(default_factory=list, description="User's skills")
    required_skills: List[str] = Field(default_factory=list, description="Must-have skills")
    preferred_skills: List[str] = Field(default_factory=list, description="Nice-to-have skills")
    experience_years: int = Field(0, ge=0, le=50, description="Years of experience")
    
    # Location preferences
    locations: List[str] = Field(default_factory=list, description="Preferred locations")
    job_types: List[JobType] = Field(default_factory=list, description="Preferred job types")
    
    # Compensation requirements
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum acceptable salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum expected salary")
    currency: str = Field("USD", max_length=3, description="Preferred currency")
    
    # Industry and company preferences
    industries: List[str] = Field(default_factory=list, description="Preferred industries")
    company_sizes: List[CompanySize] = Field(default_factory=list, description="Preferred company sizes")
    role_levels: List[ExperienceLevel] = Field(default_factory=list, description="Preferred role levels")
    
    # Exclusions
    blacklisted_companies: List[str] = Field(default_factory=list, description="Companies to avoid")
    blacklisted_keywords: List[str] = Field(default_factory=list, description="Keywords to avoid")
    
    # Matching configuration
    minimum_match_score: float = Field(0.3, ge=0.0, le=1.0, description="Minimum match score threshold")
    prioritize_remote: bool = Field(False, description="Prioritize remote positions")
    
    @validator('salary_max')
    def salary_max_greater_than_min(cls, v, values):
        """Validate salary_max >= salary_min."""
        if v is not None and 'salary_min' in values and values['salary_min'] is not None:
            if v < values['salary_min']:
                raise ValueError('salary_max must be greater than or equal to salary_min')
        return v
    
    @validator('skills', 'required_skills', 'preferred_skills', 'locations', 'industries', 'blacklisted_companies', 'blacklisted_keywords')
    def validate_string_lists(cls, v):
        """Clean and validate string lists."""
        if v is not None:
            return [item.strip().lower() for item in v if item and item.strip()]
        return v


class JobMatchResult(BaseModel):
    """Result of matching a job to user preferences."""
    
    # Job identification
    job_id: str = Field(..., description="Job listing ID")
    job_title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    
    # Overall assessment
    overall_score: float = Field(..., ge=0.0, le=1.0, description="Overall match score")
    recommendation: RecommendationLevel = Field(..., description="Recommendation level")
    confidence_score: float = Field(0.8, ge=0.0, le=1.0, description="Analysis confidence")
    
    # Detailed scoring breakdown
    skills_score: float = Field(0.0, ge=0.0, le=1.0, description="Skills compatibility score")
    location_score: float = Field(0.0, ge=0.0, le=1.0, description="Location compatibility score")
    salary_score: float = Field(0.0, ge=0.0, le=1.0, description="Salary compatibility score")
    experience_score: float = Field(0.0, ge=0.0, le=1.0, description="Experience level compatibility score")
    job_type_score: float = Field(0.0, ge=0.0, le=1.0, description="Job type compatibility score")
    company_score: float = Field(0.0, ge=0.0, le=1.0, description="Company compatibility score")
    
    # Match analysis details
    matching_skills: List[str] = Field(default_factory=list, description="Skills that match")
    missing_required_skills: List[str] = Field(default_factory=list, description="Required skills missing")
    location_details: Dict[str, Any] = Field(default_factory=dict, description="Location analysis details")
    salary_analysis: Dict[str, Any] = Field(default_factory=dict, description="Salary analysis details")
    
    # AI analysis (if available)
    fit_analysis: Optional[str] = Field(None, description="AI-generated fit analysis")
    key_strengths: List[str] = Field(default_factory=list, description="Match strengths")
    key_concerns: List[str] = Field(default_factory=list, description="Potential concerns")
    
    # Metadata
    analyzed_at: datetime = Field(default_factory=datetime.utcnow, description="Analysis timestamp")
    analysis_method: str = Field("standard", description="Analysis method used")


class CareerPageInfo(BaseModel):
    """Information about a discovered career page."""
    
    url: str = Field(..., description="Career page URL")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence this is a career page")
    is_career_page: bool = Field(..., description="Whether this is confirmed as a career page")
    is_job_listing: bool = Field(False, description="Whether this page contains job listings")
    
    # Page analysis
    job_count: int = Field(0, ge=0, description="Number of jobs detected on page")
    page_title: Optional[str] = Field(None, description="Page title")
    indicators: List[str] = Field(default_factory=list, description="Career page indicators found")
    
    # Discovery metadata
    discovered_at: datetime = Field(default_factory=datetime.utcnow, description="Discovery timestamp")
    discovery_method: Optional[str] = Field(None, description="Method used to discover page")
    
    # Navigation hints for further exploration
    navigation_hints: List[Dict[str, Any]] = Field(default_factory=list, description="Navigation suggestions")


class WorkflowProgress(BaseModel):
    """Progress tracking for job discovery workflow."""
    
    workflow_id: str = Field(..., description="Unique workflow identifier")
    stage: WorkflowStage = Field(..., description="Current workflow stage")
    progress_percentage: float = Field(0.0, ge=0.0, le=100.0, description="Progress percentage")
    current_operation: str = Field("", description="Current operation description")
    
    # Stage tracking
    stages_completed: List[WorkflowStage] = Field(default_factory=list, description="Completed stages")
    stage_times: Dict[str, float] = Field(default_factory=dict, description="Time spent in each stage")
    
    # Error and warning tracking
    errors_encountered: List[Dict[str, Any]] = Field(default_factory=list, description="Errors encountered")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    
    # Timing
    start_time: datetime = Field(default_factory=datetime.utcnow, description="Workflow start time")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")


class JobDiscoveryRequest(BaseModel):
    """Request for job discovery workflow."""
    
    # Required parameters
    company_name: str = Field(..., min_length=1, max_length=200, description="Company name")
    company_website: str = Field(..., description="Company website URL")
    user_preferences: UserPreferences = Field(..., description="User job preferences")
    
    # Workflow configuration
    max_execution_time: int = Field(300, ge=30, le=1800, description="Max execution time in seconds")
    include_ai_analysis: bool = Field(True, description="Include AI-powered analysis")
    extract_all_pages: bool = Field(True, description="Extract from all career pages found")
    max_pages_per_site: int = Field(10, ge=1, le=50, description="Maximum pages to process per site")
    
    # Optional configuration
    workflow_config: Optional[Dict[str, Any]] = Field(None, description="Additional workflow configuration")
    
    # Metadata (auto-generated)
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique request ID")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Request creation time")
    
    @validator('company_website')
    def validate_website_url(cls, v):
        """Validate website URL format."""
        if not v.startswith(('http://', 'https://')):
            v = f"https://{v}"
        return v


class JobDiscoveryResult(BaseModel):
    """Complete result of job discovery workflow."""
    
    # Request identification
    request_id: str = Field(..., description="Request ID")
    success: bool = Field(..., description="Whether workflow succeeded")
    
    # Progress information
    workflow_progress: WorkflowProgress = Field(..., description="Final workflow progress")
    
    # Results from each stage
    career_pages_found: List[CareerPageInfo] = Field(default_factory=list, description="Career pages discovered")
    jobs_extracted: List[JobListing] = Field(default_factory=list, description="Jobs extracted")
    job_matches: List[JobMatchResult] = Field(default_factory=list, description="Job match results")
    
    # Summary statistics
    total_career_pages: int = Field(0, ge=0, description="Total career pages found")
    total_jobs_extracted: int = Field(0, ge=0, description="Total jobs extracted")
    total_matches: int = Field(0, ge=0, description="Total job matches")
    execution_time: float = Field(0.0, ge=0.0, description="Total execution time in seconds")
    
    # Recommendations and analysis
    top_recommendations: List[Dict[str, Any]] = Field(default_factory=list, description="Top job recommendations")
    match_summary: Dict[str, Any] = Field(default_factory=dict, description="Match summary statistics")
    
    # Technical metadata
    agent_statistics: Dict[str, Any] = Field(default_factory=dict, description="Agent performance statistics")
    
    # Timestamp
    completed_at: datetime = Field(default_factory=datetime.utcnow, description="Completion timestamp")


class AgentConfiguration(BaseModel):
    """Configuration for individual agents."""
    
    # LLM configuration
    llm_provider: str = Field("openai", description="LLM provider (openai)")
    llm_model: str = Field("gpt-4o-mini", description="LLM model to use")
    use_vision: bool = Field(True, description="Whether to use vision-enabled models")
    temperature: float = Field(0.1, ge=0.0, le=2.0, description="LLM temperature")
    
    # Execution configuration
    max_retries: int = Field(3, ge=0, le=10, description="Maximum retry attempts")
    timeout_seconds: int = Field(30, ge=5, le=300, description="Operation timeout")
    
    # Browser configuration (for agents that use browser)
    headless_browser: bool = Field(True, description="Run browser in headless mode")
    save_screenshots: bool = Field(False, description="Save screenshots for debugging")
    
    # Performance tuning
    parallel_execution: bool = Field(True, description="Enable parallel execution where possible")
    cache_results: bool = Field(True, description="Cache intermediate results")
    
    # Logging and monitoring
    log_conversations: bool = Field(True, description="Log LLM conversations")
    track_token_usage: bool = Field(True, description="Track token usage for cost analysis")


class SystemConfiguration(BaseModel):
    """Overall system configuration."""
    
    # Agent configurations
    career_agent_config: AgentConfiguration = Field(default_factory=AgentConfiguration)
    extraction_agent_config: AgentConfiguration = Field(default_factory=AgentConfiguration)
    matching_agent_config: AgentConfiguration = Field(default_factory=AgentConfiguration)
    
    # Browser configuration
    browser_headless: bool = Field(True, description="Run browser in headless mode")
    browser_timeout: int = Field(30000, description="Browser timeout in milliseconds")
    max_concurrent_pages: int = Field(5, ge=1, le=20, description="Maximum concurrent browser pages")
    
    # Performance and scaling
    max_concurrent_workflows: int = Field(10, ge=1, le=100, description="Maximum concurrent workflows")
    workflow_timeout: int = Field(600, ge=60, le=3600, description="Workflow timeout in seconds")
    
    # Storage and persistence
    memory_persistence_enabled: bool = Field(False, description="Enable persistent memory storage")
    memory_persistence_dir: Optional[str] = Field(None, description="Memory persistence directory")
    
    # Monitoring and logging
    enable_detailed_logging: bool = Field(True, description="Enable detailed logging")
    log_level: str = Field("INFO", description="Logging level")
    track_performance_metrics: bool = Field(True, description="Track performance metrics")
    
    # API and integration
    api_rate_limiting: bool = Field(True, description="Enable API rate limiting")
    webhook_notifications: bool = Field(False, description="Enable webhook notifications")
    webhook_url: Optional[str] = Field(None, description="Webhook URL for notifications")


# Response models for API endpoints

class JobDiscoveryResponse(BaseModel):
    """Response for job discovery API endpoint."""
    
    workflow_id: str = Field(..., description="Workflow ID for tracking")
    status: str = Field(..., description="Initial status")
    message: str = Field(..., description="Status message")
    estimated_completion_time: Optional[datetime] = Field(None, description="Estimated completion")


class WorkflowStatusResponse(BaseModel):
    """Response for workflow status API endpoint."""
    
    workflow_id: str = Field(..., description="Workflow ID")
    found: bool = Field(..., description="Whether workflow was found")
    progress: Optional[WorkflowProgress] = Field(None, description="Current progress")


class JobMatchSummary(BaseModel):
    """Summary of job matching results."""
    
    total_jobs: int = Field(..., ge=0, description="Total jobs analyzed")
    highly_recommended: int = Field(0, ge=0, description="Highly recommended jobs")
    recommended: int = Field(0, ge=0, description="Recommended jobs")
    consider: int = Field(0, ge=0, description="Jobs to consider")
    not_recommended: int = Field(0, ge=0, description="Not recommended jobs")
    
    average_match_score: float = Field(0.0, ge=0.0, le=1.0, description="Average match score")
    top_matching_skills: List[Dict[str, Any]] = Field(default_factory=list, description="Most frequently matched skills")
    
    # Recommendations breakdown
    salary_matches: int = Field(0, ge=0, description="Jobs matching salary requirements")
    location_matches: int = Field(0, ge=0, description="Jobs matching location preferences")
    remote_opportunities: int = Field(0, ge=0, description="Remote job opportunities")


# Validation helpers

def validate_job_listing(job_data: Dict[str, Any]) -> JobListing:
    """Validate and create JobListing from raw data."""
    return JobListing.parse_obj(job_data)


def validate_user_preferences(prefs_data: Dict[str, Any]) -> UserPreferences:
    """Validate and create UserPreferences from raw data."""
    return UserPreferences.parse_obj(prefs_data)


def validate_discovery_request(request_data: Dict[str, Any]) -> JobDiscoveryRequest:
    """Validate and create JobDiscoveryRequest from raw data."""
    return JobDiscoveryRequest.parse_obj(request_data)