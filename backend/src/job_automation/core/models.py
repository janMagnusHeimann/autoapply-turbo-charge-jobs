"""
Core domain models for job automation system
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class CompanyData(BaseModel):
    """Company information model"""
    id: str
    name: str
    website_url: Optional[str] = None
    industry: Optional[str] = None
    headquarters: Optional[str] = None
    size_category: Optional[str] = None


class CareerPageResult(BaseModel):
    """Result of career page discovery"""
    company_id: str
    company_name: str
    career_page_url: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    validation_status: str = "pending"  # pending, verified, failed
    discovery_method: str = "unknown"  # websearch, pattern_matching, ai_analysis
    additional_urls: List[str] = []
    error_message: Optional[str] = None
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    cost_usd: float = 0.0


class UserProfile(BaseModel):
    """User profile model"""
    id: str
    email: str
    full_name: Optional[str] = None
    github_username: Optional[str] = None
    scholar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserPreferences(BaseModel):
    """User job preferences model"""
    id: str
    user_id: str
    preferred_locations: List[str] = []
    preferred_remote: str = "any"  # on-site, remote, hybrid, any
    preferred_job_types: List[str] = []
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    preferred_industries: List[str] = []
    preferred_company_sizes: List[str] = []
    skills: List[str] = []
    excluded_companies: List[str] = []
    created_at: datetime
    updated_at: datetime


class ProfileValidationResult(BaseModel):
    """Result of user profile validation"""
    is_valid: bool
    missing_fields: List[str] = []
    warnings: List[str] = []
    recommendations: List[str] = []
    completion_score: int = Field(ge=0, le=100)  # 0-100


class ValidationStatus(str, Enum):
    """Validation status enum"""
    VALID = "valid"
    INCOMPLETE = "incomplete"
    INVALID = "invalid"


class WorkflowStep(BaseModel):
    """Individual step in workflow execution"""
    step_name: str
    status: str  # pending, in_progress, completed, failed
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    result_data: Optional[Dict[str, Any]] = None


class WorkflowExecution(BaseModel):
    """Complete workflow execution tracking"""
    workflow_id: str
    user_id: str
    company_id: str
    status: str  # pending, running, completed, failed
    steps: List[WorkflowStep] = []
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    total_cost_usd: float = 0.0
    results: Dict[str, Any] = {}


class APIResponse(BaseModel):
    """Standard API response format"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class CareerPageDiscoveryRequest(BaseModel):
    """Request for career page discovery"""
    company_id: str
    company_name: str
    website_url: Optional[str] = None
    industry: Optional[str] = None


class BulkCareerPageDiscoveryRequest(BaseModel):
    """Request for bulk career page discovery"""
    companies: List[CareerPageDiscoveryRequest]


class UserProfileValidationRequest(BaseModel):
    """Request for user profile validation"""
    user_id: str


class WorkflowExecutionRequest(BaseModel):
    """Request to start workflow execution"""
    user_id: str
    company_id: str
    workflow_type: str = "career_page_discovery_and_cv_generation"