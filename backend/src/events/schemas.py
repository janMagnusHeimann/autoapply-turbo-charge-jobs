"""
Event Schemas for Event-Driven Architecture
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from enum import Enum
import uuid

class EventType(str, Enum):
    """Event types in the system"""
    JOB_FOUND = "job.found"
    JOB_BATCH_FOUND = "job.batch_found"
    CV_GENERATED = "cv.generated"
    CV_GENERATION_FAILED = "cv.generation_failed"
    APPLICATION_SUBMITTED = "application.submitted"
    APPLICATION_FAILED = "application.failed"
    APPLICATION_RETRY = "application.retry"
    NOTIFICATION = "notification"
    USER_ACTION = "user.action"
    SYSTEM_ALERT = "system.alert"

class EventPriority(str, Enum):
    """Event priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class BaseEvent(BaseModel):
    """Base event schema"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: str
    correlation_id: Optional[str] = None  # For tracking related events
    priority: EventPriority = EventPriority.NORMAL
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class JobFoundEvent(BaseEvent):
    """Event emitted when jobs are discovered"""
    event_type: EventType = EventType.JOB_FOUND
    company_name: str
    company_id: str
    job_id: str
    job_title: str
    job_url: str
    job_description: str
    location: str
    salary_range: Optional[str] = None
    match_score: float = Field(ge=0.0, le=1.0)
    matching_skills: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    posted_date: Optional[datetime] = None
    application_deadline: Optional[datetime] = None
    job_type: Optional[str] = None  # remote, hybrid, onsite
    experience_level: Optional[str] = None  # entry, mid, senior
    
    def should_generate_cv(self) -> bool:
        """Determine if CV should be generated for this job"""
        return self.match_score >= 0.5  # Configurable threshold

class JobBatchFoundEvent(BaseEvent):
    """Event for batch job discovery"""
    event_type: EventType = EventType.JOB_BATCH_FOUND
    company_name: str
    company_id: str
    total_jobs: int
    matched_jobs: List[Dict[str, Any]]  # List of job details
    career_page_url: Optional[str] = None
    discovery_method: str  # web_search, browser, api
    
class CVGeneratedEvent(BaseEvent):
    """Event emitted when CV is generated"""
    event_type: EventType = EventType.CV_GENERATED
    job_id: str
    cv_id: str
    cv_type: str = "generated"  # generated or uploaded
    cv_content: Optional[str] = None  # Text content
    cv_url: Optional[str] = None  # Storage URL
    cv_file_path: Optional[str] = None
    generation_time_seconds: float
    template_used: Optional[str] = None
    customizations: Dict[str, Any] = Field(default_factory=dict)
    
class CVGenerationFailedEvent(BaseEvent):
    """Event when CV generation fails"""
    event_type: EventType = EventType.CV_GENERATION_FAILED
    job_id: str
    error_message: str
    error_type: str  # template_error, api_error, validation_error
    retry_count: int = 0
    max_retries: int = 3
    
    def should_retry(self) -> bool:
        """Check if generation should be retried"""
        return self.retry_count < self.max_retries

class ApplicationSubmittedEvent(BaseEvent):
    """Event emitted when application is submitted"""
    event_type: EventType = EventType.APPLICATION_SUBMITTED
    job_id: str
    cv_id: str
    application_id: str
    platform: str  # linkedin, indeed, greenhouse, lever, generic
    submission_url: str
    form_data: Dict[str, Any] = Field(default_factory=dict)
    auto_submitted: bool = False
    submission_time: datetime = Field(default_factory=datetime.utcnow)
    confirmation_number: Optional[str] = None
    
class ApplicationFailedEvent(BaseEvent):
    """Event when application submission fails"""
    event_type: EventType = EventType.APPLICATION_FAILED
    job_id: str
    cv_id: Optional[str] = None
    application_id: str
    platform: str
    error_message: str
    error_type: str  # captcha, form_error, network_error, rate_limit
    retry_count: int = 0
    max_retries: int = 3
    failed_at_step: str  # login, form_fill, submission
    screenshot_url: Optional[str] = None  # For debugging
    
    def should_retry(self) -> bool:
        """Check if application should be retried"""
        retriable_errors = ['network_error', 'rate_limit', 'timeout']
        return (self.retry_count < self.max_retries and 
                self.error_type in retriable_errors)

class ApplicationRetryEvent(BaseEvent):
    """Event to trigger application retry"""
    event_type: EventType = EventType.APPLICATION_RETRY
    original_event_id: str  # ID of the failed event
    job_id: str
    cv_id: str
    application_id: str
    platform: str
    retry_count: int
    retry_delay_seconds: int = 300  # Default 5 minutes
    
class NotificationEvent(BaseEvent):
    """Event for user notifications"""
    event_type: EventType = EventType.NOTIFICATION
    notification_type: str  # email, websocket, push, sms
    recipient_id: str  # user_id or email
    subject: str
    message: str
    data: Dict[str, Any] = Field(default_factory=dict)
    channels: List[str] = Field(default_factory=lambda: ['email'])
    template_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    
class UserActionEvent(BaseEvent):
    """Event for tracking user actions"""
    event_type: EventType = EventType.USER_ACTION
    action: str  # bulk_apply, pause_applications, resume_applications
    target_type: str  # job, application, profile
    target_id: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
class SystemAlertEvent(BaseEvent):
    """Event for system alerts and monitoring"""
    event_type: EventType = EventType.SYSTEM_ALERT
    alert_level: str  # info, warning, error, critical
    component: str  # job_discovery, cv_generation, application_submission
    message: str
    metrics: Dict[str, Any] = Field(default_factory=dict)
    requires_action: bool = False
    
# Event validation and factory functions

def create_job_found_event(user_id: str, job_data: Dict[str, Any]) -> JobFoundEvent:
    """Factory function to create JobFoundEvent"""
    return JobFoundEvent(
        user_id=user_id,
        company_name=job_data['company_name'],
        company_id=job_data.get('company_id', str(uuid.uuid4())),
        job_id=job_data.get('job_id', str(uuid.uuid4())),
        job_title=job_data['title'],
        job_url=job_data['url'],
        job_description=job_data.get('description', ''),
        location=job_data.get('location', 'Not specified'),
        salary_range=job_data.get('salary_range'),
        match_score=job_data.get('match_score', 0.5),
        matching_skills=job_data.get('matching_skills', []),
        requirements=job_data.get('requirements', []),
        job_type=job_data.get('job_type'),
        experience_level=job_data.get('experience_level'),
        priority=EventPriority.HIGH if job_data.get('match_score', 0) > 0.8 else EventPriority.NORMAL
    )

def create_cv_generated_event(user_id: str, job_id: str, cv_data: Dict[str, Any]) -> CVGeneratedEvent:
    """Factory function to create CVGeneratedEvent"""
    return CVGeneratedEvent(
        user_id=user_id,
        job_id=job_id,
        cv_id=cv_data.get('cv_id', str(uuid.uuid4())),
        cv_type=cv_data.get('cv_type', 'generated'),
        cv_content=cv_data.get('content'),
        cv_url=cv_data.get('url'),
        cv_file_path=cv_data.get('file_path'),
        generation_time_seconds=cv_data.get('generation_time', 0),
        template_used=cv_data.get('template'),
        customizations=cv_data.get('customizations', {})
    )

def create_application_submitted_event(
    user_id: str, 
    job_id: str, 
    cv_id: str,
    application_data: Dict[str, Any]
) -> ApplicationSubmittedEvent:
    """Factory function to create ApplicationSubmittedEvent"""
    return ApplicationSubmittedEvent(
        user_id=user_id,
        job_id=job_id,
        cv_id=cv_id,
        application_id=application_data.get('application_id', str(uuid.uuid4())),
        platform=application_data['platform'],
        submission_url=application_data['url'],
        form_data=application_data.get('form_data', {}),
        auto_submitted=application_data.get('auto_submitted', False),
        confirmation_number=application_data.get('confirmation_number')
    )

def create_notification_event(
    user_id: str,
    subject: str,
    message: str,
    notification_type: str = 'email',
    **kwargs
) -> NotificationEvent:
    """Factory function to create NotificationEvent"""
    return NotificationEvent(
        user_id=user_id,
        recipient_id=user_id,
        subject=subject,
        message=message,
        notification_type=notification_type,
        **kwargs
    )