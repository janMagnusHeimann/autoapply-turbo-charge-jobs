"""
Job Listing Models for Gemini Job Search Agent
"""

from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from .user_preferences import JobType, ExperienceLevel

class JobSource(str, Enum):
    COMPANY_WEBSITE = "company_website"
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    WORKDAY = "workday"
    AI_GENERATED = "ai_generated"
    OTHER = "other"

class JobListing(BaseModel):
    """Structured job listing data"""
    
    # Basic job information
    title: str = Field(..., description="Job title")
    company: str = Field(..., description="Company name")
    location: str = Field(..., description="Job location or 'Remote'")
    job_type: Optional[JobType] = Field(None, description="Remote/hybrid/onsite")
    
    # Job details
    department: Optional[str] = None
    experience_level: Optional[ExperienceLevel] = None
    employment_type: Optional[str] = Field(None, description="Full-time, part-time, contract, etc.")
    
    # Requirements and skills
    required_skills: List[str] = Field(default=[], description="Required technical skills")
    nice_to_have_skills: List[str] = Field(default=[], description="Preferred skills")
    experience_years_min: Optional[int] = Field(None, ge=0)
    experience_years_max: Optional[int] = Field(None, ge=0)
    
    # Compensation
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    salary_currency: Optional[str] = Field(default="EUR")
    equity_offered: Optional[bool] = None
    
    # Job description and application
    description: Optional[str] = Field(None, description="Brief job description")
    application_url: Optional[HttpUrl] = Field(None, description="Direct application link")
    
    # Metadata
    posted_date: Optional[datetime] = None
    source: Optional[JobSource] = JobSource.OTHER
    source_url: Optional[HttpUrl] = None
    
    # Additional data
    benefits: List[str] = Field(default=[])
    technologies: List[str] = Field(default=[])
    company_size: Optional[str] = None
    industry: Optional[str] = None
    
    # Internal tracking
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True
        validate_assignment = True
    
    def get_skills_text(self) -> str:
        """Get all skills as comma-separated text"""
        all_skills = self.required_skills + self.nice_to_have_skills
        return ", ".join(all_skills)
    
    def get_salary_range_text(self) -> str:
        """Get formatted salary range"""
        if not self.salary_min and not self.salary_max:
            return "Salary not specified"
        
        currency = self.salary_currency or "EUR"
        
        if self.salary_min and self.salary_max:
            return f"{currency} {self.salary_min:,} - {self.salary_max:,}"
        elif self.salary_min:
            return f"{currency} {self.salary_min:,}+"
        elif self.salary_max:
            return f"Up to {currency} {self.salary_max:,}"
        
        return "Salary not specified"
    
    def is_remote_friendly(self) -> bool:
        """Check if job supports remote work"""
        if self.job_type in [JobType.REMOTE, JobType.HYBRID]:
            return True
        
        # Check location text for remote indicators
        location_lower = self.location.lower()
        remote_indicators = ["remote", "anywhere", "distributed", "work from home"]
        return any(indicator in location_lower for indicator in remote_indicators)

class RankedJob(BaseModel):
    """Job listing with ranking scores and explanations"""
    
    job: JobListing
    
    # Scoring
    match_score: float = Field(..., ge=0, le=100, description="Overall match score")
    skill_match_score: float = Field(..., ge=0, le=100)
    location_match_score: float = Field(..., ge=0, le=100)
    experience_match_score: float = Field(..., ge=0, le=100)
    salary_match_score: float = Field(..., ge=0, le=100)
    culture_match_score: float = Field(default=50, ge=0, le=100)
    
    # Explanations
    match_explanation: str = Field(..., description="Why this job matches or doesn't match")
    missing_skills: List[str] = Field(default=[], description="Skills user lacks")
    matching_skills: List[str] = Field(default=[], description="Skills user has that match")
    
    # Recommendations
    recommendation: Optional[str] = Field(None, description="Apply/Don't Apply/Maybe")
    improvement_suggestions: List[str] = Field(default=[], description="How user can improve match")
    
    # Metadata
    ranked_at: datetime = Field(default_factory=datetime.utcnow)
    ranking_version: str = Field(default="1.0")
    
    class Config:
        use_enum_values = True
    
    def get_match_summary(self) -> str:
        """Get concise match summary"""
        score_range = "Excellent" if self.match_score >= 80 else "Good" if self.match_score >= 60 else "Fair" if self.match_score >= 40 else "Poor"
        return f"{score_range} match ({self.match_score:.0f}%)"
    
    def get_top_matching_skills(self, limit: int = 3) -> List[str]:
        """Get top matching skills"""
        return self.matching_skills[:limit]
    
    def get_skill_gap_summary(self) -> str:
        """Get summary of missing skills"""
        if not self.missing_skills:
            return "All required skills matched"
        
        if len(self.missing_skills) <= 2:
            return f"Missing: {', '.join(self.missing_skills)}"
        
        return f"Missing: {', '.join(self.missing_skills[:2])} (+{len(self.missing_skills)-2} more)"

class JobSearchResult(BaseModel):
    """Results from a job search operation"""
    
    company: str
    company_website: Optional[str] = None
    search_timestamp: datetime
    
    # Results
    total_jobs_found: int = Field(..., ge=0)
    jobs_processed: int = Field(..., ge=0)
    top_matches: List[RankedJob] = Field(default=[])
    
    # Search metadata
    search_queries_used: List[str] = Field(default=[])
    sources_searched: List[JobSource] = Field(default=[])
    search_duration_seconds: float = Field(default=0.0, ge=0)
    
    # Quality metrics
    average_match_score: float = Field(default=0.0, ge=0, le=100)
    jobs_above_threshold: int = Field(default=0, ge=0)
    
    class Config:
        use_enum_values = True
    
    def get_best_match(self) -> Optional[RankedJob]:
        """Get the highest scoring job"""
        return self.top_matches[0] if self.top_matches else None
    
    def get_matches_above_score(self, threshold: float = 70.0) -> List[RankedJob]:
        """Get jobs above a certain match score"""
        return [job for job in self.top_matches if job.match_score >= threshold]

class JobSearchBatchResult(BaseModel):
    """Results from searching multiple companies"""
    
    search_timestamp: datetime
    user_preferences_summary: str
    companies_searched: int
    
    # Results by company
    results_by_company: List[JobSearchResult] = Field(default=[])
    
    # Aggregated results
    total_jobs_found: int = Field(default=0)
    top_matches_overall: List[RankedJob] = Field(default=[])
    
    # Performance metrics
    total_search_duration_seconds: float = Field(default=0.0, ge=0)
    successful_searches: int = Field(default=0, ge=0)
    failed_searches: int = Field(default=0, ge=0)
    
    def get_global_best_matches(self, limit: int = 10) -> List[RankedJob]:
        """Get best matches across all companies"""
        all_matches = []
        for result in self.results_by_company:
            all_matches.extend(result.top_matches)
        
        # Sort by match score descending
        all_matches.sort(key=lambda x: x.match_score, reverse=True)
        return all_matches[:limit]
    
    def get_companies_with_matches(self, min_score: float = 60.0) -> List[str]:
        """Get companies that have jobs above minimum score"""
        companies = []
        for result in self.results_by_company:
            if any(job.match_score >= min_score for job in result.top_matches):
                companies.append(result.company)
        return companies
