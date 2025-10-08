"""
Structured Output Models for LangChain LLM Responses

This module defines Pydantic models for consistent LLM output parsing
across all application agent services.
"""

from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from enum import Enum


class FieldType(str, Enum):
    """Enum for form field types"""
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    SELECT = "select"
    TEXTAREA = "textarea"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    FILE = "file"
    DATE = "date"
    NUMBER = "number"
    URL = "url"


class FormFieldAnalysis(BaseModel):
    """Analysis of a single form field"""
    name: str = Field(description="Field name/id")
    type: FieldType = Field(description="Field type")
    label: str = Field(description="Human-readable field label")
    required: bool = Field(description="Whether field is required")
    placeholder: Optional[str] = Field(description="Placeholder text")
    validation_rules: List[str] = Field(default_factory=list, description="Validation constraints")
    options: Optional[List[str]] = Field(description="Options for select/radio fields")
    confidence: float = Field(description="Confidence in field analysis (0-1)")


class FormComplexity(str, Enum):
    """Form complexity levels"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class FormAnalysisOutput(BaseModel):
    """Complete form analysis output"""
    form_type: str = Field(default="no_form_detected", description="Type of application form")
    complexity: FormComplexity = Field(default=FormComplexity.SIMPLE, description="Overall form complexity")
    estimated_time_minutes: int = Field(default=0, description="Estimated completion time")
    fields: List[FormFieldAnalysis] = Field(default_factory=list, description="All detected form fields")
    multi_step: bool = Field(default=False, description="Whether form has multiple steps")
    file_uploads_required: List[str] = Field(default_factory=list, description="Required file uploads")
    captcha_present: bool = Field(default=False, description="Whether CAPTCHA is present")
    special_requirements: List[str] = Field(default_factory=list, description="Special form requirements")
    confidence: float = Field(default=1.0, description="Overall analysis confidence (0-1)")


class CVFieldMapping(BaseModel):
    """Mapping between CV data and form field"""
    form_field: str = Field(description="Target form field name")
    cv_data_path: str = Field(description="Path to CV data (e.g., 'personal.email')")
    mapped_value: str = Field(description="Actual value to fill")
    confidence: float = Field(description="Mapping confidence (0-1)")
    transformation_applied: Optional[str] = Field(description="Data transformation if applied")


class CVMappingOutput(BaseModel):
    """Complete CV to form mapping output"""
    mappings: List[CVFieldMapping] = Field(default_factory=list, description="Field mappings")
    unmapped_fields: List[str] = Field(default_factory=list, description="Form fields without CV mapping")
    missing_cv_data: List[str] = Field(default_factory=list, description="Required CV data not found")
    overall_match_score: float = Field(default=0.0, description="Overall CV-form compatibility (0-1)")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations for improvement")


class FormFillingAction(BaseModel):
    """Single form filling action"""
    field_name: str = Field(description="Target field name")
    action_type: str = Field(description="Action type (fill, select, upload, etc.)")
    value: str = Field(description="Value to input")
    success: bool = Field(description="Whether action succeeded")
    error_message: Optional[str] = Field(description="Error message if failed")
    screenshot_path: Optional[str] = Field(description="Screenshot path for verification")


class FormFillingOutput(BaseModel):
    """Complete form filling results"""
    actions_performed: List[FormFillingAction] = Field(description="All actions performed")
    successful_fields: int = Field(description="Number of successfully filled fields")
    failed_fields: int = Field(description="Number of failed fields")
    completion_percentage: float = Field(description="Form completion percentage (0-100)")
    ready_for_submission: bool = Field(description="Whether form is ready to submit")
    validation_errors: List[str] = Field(default_factory=list, description="Form validation errors")
    next_steps: List[str] = Field(default_factory=list, description="Required next steps")


class JobAnalysis(BaseModel):
    """Analysis of job requirements"""
    key_requirements: List[str] = Field(description="Main job requirements")
    preferred_qualifications: List[str] = Field(description="Preferred qualifications")
    company_culture: str = Field(description="Company culture description")
    role_focus: str = Field(description="Main focus of the role")
    seniority_level: str = Field(description="Required seniority level")
    industry: str = Field(description="Industry/sector")


class CoverLetterOutput(BaseModel):
    """Generated cover letter output"""
    content: str = Field(description="Complete cover letter content")
    word_count: int = Field(description="Word count")
    tone: str = Field(description="Detected tone (professional, enthusiastic, etc.)")
    key_points_covered: List[str] = Field(description="Key points addressed")
    personalization_score: float = Field(description="Personalization score (0-1)")
    job_alignment_score: float = Field(description="Job alignment score (0-1)")
    improvement_suggestions: List[str] = Field(default_factory=list, description="Suggestions for improvement")


class ErrorRecoveryAction(BaseModel):
    """Error recovery action recommendation"""
    error_type: str = Field(default="unknown_error", description="Type of error encountered")
    recommended_action: str = Field(default="retry_operation", description="Recommended recovery action")
    confidence: float = Field(default=0.5, description="Confidence in recommendation (0-1)")
    estimated_success_rate: float = Field(default=0.3, description="Estimated success rate (0-1)")


class ErrorRecoveryOutput(BaseModel):
    """Error recovery analysis output"""
    error_analysis: str = Field(default="Error occurred during operation", description="Analysis of the error")
    recovery_actions: List[ErrorRecoveryAction] = Field(default_factory=list, description="Possible recovery actions")
    should_retry: bool = Field(default=False, description="Whether to retry the operation")
    alternative_approach: Optional[str] = Field(default=None, description="Alternative approach if retry fails")


class QualityAssessment(BaseModel):
    """Quality assessment of generated content"""
    overall_score: float = Field(description="Overall quality score (0-1)")
    grammar_score: float = Field(description="Grammar and language quality (0-1)")
    relevance_score: float = Field(description="Relevance to job requirements (0-1)")
    personalization_score: float = Field(description="Personalization level (0-1)")
    improvement_areas: List[str] = Field(default_factory=list, description="Areas for improvement")
    strengths: List[str] = Field(default_factory=list, description="Content strengths")


class AgentDecision(BaseModel):
    """Agent decision output"""
    decision: str = Field(description="Decision made by agent")
    reasoning: str = Field(description="Reasoning behind decision")
    confidence: float = Field(description="Confidence in decision (0-1)")
    alternative_options: List[str] = Field(default_factory=list, description="Alternative options considered")
    required_actions: List[str] = Field(default_factory=list, description="Required follow-up actions")