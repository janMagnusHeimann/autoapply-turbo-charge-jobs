"""
Core models for job automation system
"""

from .user_preferences import (
    UserPreferences,
    ExperienceLevel,
    JobType,
    CompanySize
)

from .job_listing import (
    JobListing,
    RankedJob,
    JobSearchResult,
    JobSearchBatchResult,
    JobSource
)

__all__ = [
    "UserPreferences",
    "ExperienceLevel",
    "JobType",
    "CompanySize",
    "JobListing",
    "RankedJob",
    "JobSearchResult",
    "JobSearchBatchResult",
    "JobSource"
]
