"""
Event Consumer Base Class for Event-Driven Architecture
"""

import json
import logging
from typing import Dict, Any, Optional, Callable, List
from abc import ABC, abstractmethod
import asyncio
import redis.asyncio as redis
from celery import Task
from .schemas import BaseEvent, EventType, NotificationEvent

logger = logging.getLogger(__name__)

class EventConsumer(ABC):
    """
    Base class for event consumers
    """
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        self.redis_client = None
        self.redis_url = redis_url
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.running = False
        
    async def connect(self):
        """Connect to Redis"""
        self.redis_client = await redis.from_url(self.redis_url)
        
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
    
    @abstractmethod
    async def handle_event(self, event: BaseEvent) -> bool:
        """
        Handle an event - must be implemented by subclasses
        
        Args:
            event: Event to handle
            
        Returns:
            Success status
        """
        pass
    
    def subscribe(self, event_type: EventType, handler: Callable):
        """
        Subscribe a handler to an event type
        
        Args:
            event_type: Type of event to subscribe to
            handler: Async function to handle the event
        """
        if event_type not in self.subscriptions:
            self.subscriptions[event_type] = []
        self.subscriptions[event_type].append(handler)
        logger.info(f"Subscribed handler to {event_type}")
    
    async def consume_events(self, user_id: Optional[str] = None, event_types: Optional[List[EventType]] = None):
        """
        Start consuming events from Redis pub/sub
        
        Args:
            user_id: Optional user ID to filter events
            event_types: Optional list of event types to consume
        """
        await self.connect()
        
        # Subscribe to channels
        pubsub = self.redis_client.pubsub()
        channels = []
        
        if event_types:
            for event_type in event_types:
                if user_id:
                    channels.append(f"events:{event_type}:{user_id}")
                else:
                    channels.append(f"events:{event_type}:*")
        else:
            # Subscribe to all events for user or all events
            channels.append(f"events:*:{user_id}" if user_id else "events:*")
        
        for channel in channels:
            await pubsub.subscribe(channel)
            logger.info(f"Subscribed to channel: {channel}")
        
        self.running = True
        
        try:
            while self.running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    await self._process_message(message)
                    
        except Exception as e:
            logger.error(f"Error consuming events: {e}")
        finally:
            await pubsub.unsubscribe()
            await self.disconnect()
    
    async def _process_message(self, message: Dict[str, Any]):
        """Process a message from Redis pub/sub"""
        try:
            # Parse message
            data = json.loads(message['data'])
            event_type = EventType(data['event_type'])
            
            # Create event object
            event_class = self._get_event_class(event_type)
            if event_class:
                event = event_class(**data)
                
                # Call main handler
                success = await self.handle_event(event)
                
                # Call subscribed handlers
                if event_type in self.subscriptions:
                    for handler in self.subscriptions[event_type]:
                        try:
                            await handler(event)
                        except Exception as e:
                            logger.error(f"Handler failed for {event_type}: {e}")
                
                if success:
                    logger.info(f"Successfully processed event {event.event_id}")
                else:
                    logger.warning(f"Failed to process event {event.event_id}")
                    
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def _get_event_class(self, event_type: EventType):
        """Get event class based on event type"""
        from . import schemas
        
        event_class_mapping = {
            EventType.JOB_FOUND: schemas.JobFoundEvent,
            EventType.JOB_BATCH_FOUND: schemas.JobBatchFoundEvent,
            EventType.CV_GENERATED: schemas.CVGeneratedEvent,
            EventType.CV_GENERATION_FAILED: schemas.CVGenerationFailedEvent,
            EventType.APPLICATION_SUBMITTED: schemas.ApplicationSubmittedEvent,
            EventType.APPLICATION_FAILED: schemas.ApplicationFailedEvent,
            EventType.APPLICATION_RETRY: schemas.ApplicationRetryEvent,
            EventType.NOTIFICATION: schemas.NotificationEvent,
            EventType.USER_ACTION: schemas.UserActionEvent,
            EventType.SYSTEM_ALERT: schemas.SystemAlertEvent,
        }
        
        return event_class_mapping.get(event_type, schemas.BaseEvent)
    
    def stop(self):
        """Stop consuming events"""
        self.running = False

class CeleryEventConsumer(Task):
    """
    Celery task base class for event consumption
    """
    
    autoretry_for = (Exception,)
    max_retries = 3
    default_retry_delay = 60
    
    @abstractmethod
    def process_event(self, event_data: Dict[str, Any]) -> bool:
        """
        Process an event - must be implemented by subclasses
        
        Args:
            event_data: Event data dictionary
            
        Returns:
            Success status
        """
        pass
    
    def run(self, event_data: Dict[str, Any]):
        """
        Celery task execution
        
        Args:
            event_data: Event data from queue
        """
        try:
            # Process the event
            success = self.process_event(event_data)
            
            if not success:
                # Retry if processing failed
                raise self.retry(countdown=self.default_retry_delay)
                
            return success
            
        except Exception as exc:
            logger.error(f"Event processing failed: {exc}")
            raise self.retry(exc=exc, countdown=self.default_retry_delay)

# Example concrete consumer implementations

class JobDiscoveryConsumer(EventConsumer):
    """
    Consumer for job discovery events
    """
    
    async def handle_event(self, event: BaseEvent) -> bool:
        """Handle job discovery events"""
        from .schemas import JobFoundEvent, JobBatchFoundEvent
        
        if isinstance(event, JobFoundEvent):
            # Single job found - trigger CV generation
            logger.info(f"Processing job found event for {event.job_title} at {event.company_name}")
            
            # Check if CV should be generated
            if event.should_generate_cv():
                # Publish CV generation task
                from .publisher import get_event_publisher
                from .schemas import EventType, EventPriority
                
                publisher = get_event_publisher()
                # This would trigger CV generation
                # Implementation depends on your CV generation service
                
            return True
            
        elif isinstance(event, JobBatchFoundEvent):
            # Batch of jobs found
            logger.info(f"Processing batch of {event.total_jobs} jobs from {event.company_name}")
            
            # Process each job
            for job_data in event.matched_jobs:
                # Create individual job events if needed
                pass
                
            return True
            
        return False

class CVGenerationConsumer(EventConsumer):
    """
    Consumer for CV generation events
    """
    
    async def handle_event(self, event: BaseEvent) -> bool:
        """Handle CV generation events"""
        from .schemas import CVGeneratedEvent, CVGenerationFailedEvent
        
        if isinstance(event, CVGeneratedEvent):
            # CV generated - trigger application submission
            logger.info(f"Processing CV generated event for job {event.job_id}")
            
            # Publish application submission task
            from .publisher import get_event_publisher
            
            publisher = get_event_publisher()
            # This would trigger application submission
            # Implementation depends on your application service
            
            return True
            
        elif isinstance(event, CVGenerationFailedEvent):
            # CV generation failed
            logger.warning(f"CV generation failed for job {event.job_id}: {event.error_message}")
            
            if event.should_retry():
                # Schedule retry
                logger.info(f"Scheduling retry for CV generation (attempt {event.retry_count + 1})")
                
            return True
            
        return False

class ApplicationConsumer(EventConsumer):
    """
    Consumer for application events
    """
    
    async def handle_event(self, event: BaseEvent) -> bool:
        """Handle application events"""
        from .schemas import ApplicationSubmittedEvent, ApplicationFailedEvent, ApplicationRetryEvent
        
        if isinstance(event, ApplicationSubmittedEvent):
            # Application submitted successfully
            logger.info(f"Application submitted for job {event.job_id} on {event.platform}")
            
            # Send notification
            from .publisher import publish_notification
            
            await publish_notification(
                event.user_id,
                "Application Submitted Successfully",
                f"Your application for job {event.job_id} has been submitted to {event.platform}",
                notification_type='email'
            )
            
            return True
            
        elif isinstance(event, ApplicationFailedEvent):
            # Application failed
            logger.warning(f"Application failed for job {event.job_id}: {event.error_message}")
            
            if event.should_retry():
                # Schedule retry
                from .schemas import ApplicationRetryEvent
                from .publisher import get_event_publisher
                
                retry_event = ApplicationRetryEvent(
                    user_id=event.user_id,
                    original_event_id=event.event_id,
                    job_id=event.job_id,
                    cv_id=event.cv_id or '',
                    application_id=event.application_id,
                    platform=event.platform,
                    retry_count=event.retry_count + 1
                )
                
                publisher = get_event_publisher()
                await publisher.publish(retry_event)
                
            return True
            
        elif isinstance(event, ApplicationRetryEvent):
            # Retry application submission
            logger.info(f"Retrying application for job {event.job_id} (attempt {event.retry_count})")
            
            # Trigger application submission with retry logic
            # Implementation depends on your application service
            
            return True
            
        return False

class NotificationConsumer(EventConsumer):
    """
    Consumer for notification events
    """
    
    async def handle_event(self, event: BaseEvent) -> bool:
        """Handle notification events"""
        from .schemas import NotificationEvent
        
        if isinstance(event, NotificationEvent):
            logger.info(f"Processing notification for user {event.user_id}: {event.subject}")
            
            # Send notification based on type
            if 'email' in event.channels:
                await self._send_email(event)
            if 'websocket' in event.channels:
                await self._send_websocket(event)
            if 'push' in event.channels:
                await self._send_push(event)
                
            return True
            
        return False
    
    async def _send_email(self, event: NotificationEvent):
        """Send email notification"""
        # Implementation depends on your email service
        logger.info(f"Sending email to {event.recipient_id}: {event.subject}")
    
    async def _send_websocket(self, event: NotificationEvent):
        """Send websocket notification"""
        # Implementation depends on your websocket service
        logger.info(f"Sending websocket notification to {event.recipient_id}")
    
    async def _send_push(self, event: NotificationEvent):
        """Send push notification"""
        # Implementation depends on your push notification service
        logger.info(f"Sending push notification to {event.recipient_id}")