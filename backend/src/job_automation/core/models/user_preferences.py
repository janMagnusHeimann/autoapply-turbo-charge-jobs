"""
User Preferences Model - Simplified user job search preferences
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

class JobType(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    FLEXIBLE = "flexible"

class ExperienceLevel(str, Enum):
    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"

class UserPreferences(BaseModel):
    """User job search preferences"""
    
    # Skills and experience
    skills: List[str] = Field(default=[], description="Technical skills")
    experience_years: int = Field(default=0, description="Years of experience")
    experience_level: ExperienceLevel = Field(default=ExperienceLevel.MID, description="Experience level")
    desired_roles: List[str] = Field(default=[], description="Desired job roles")
    
    # Location preferences
    locations: List[str] = Field(default=[], description="Preferred locations")
    job_types: List[JobType] = Field(default=[JobType.REMOTE], description="Job type preferences")
    
    # Compensation
    salary_min: Optional[int] = Field(default=None, description="Minimum salary expectation")
    salary_max: Optional[int] = Field(default=None, description="Maximum salary expectation")
    salary_currency: str = Field(default="EUR", description="Salary currency")
    
    # Company preferences
    industries: List[str] = Field(default=[], description="Preferred industries")
    company_size: List[str] = Field(default=[], description="Preferred company sizes")
    
    class Config:
        use_enum_values = True
        schema_extra = {
            "example": {
                "skills": ["Python", "JavaScript", "React", "TypeScript"],
                "experience_years": 5,
                "experience_level": "senior",
                "desired_roles": ["Software Engineer", "Full Stack Developer"],
                "locations": ["Berlin", "Remote", "Munich"],
                "job_types": ["remote", "hybrid"],
                "salary_min": 60000,
                "salary_max": 100000,
                "salary_currency": "EUR",
                "industries": ["Technology", "Fintech"],
                "company_size": ["Startup", "Scale-up"]
            }
        }
