"""
Event Publisher for Event-Driven Architecture
"""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import asyncio
from celery import current_app
import redis
from .schemas import BaseEvent, EventType, EventPriority

logger = logging.getLogger(__name__)

class EventPublisher:
    """
    Publishes events to message queues and event store
    """
    
    def __init__(self, redis_url: str = 'redis://localhost:6379/0'):
        self.redis_client = redis.from_url(redis_url)
        self.celery_app = current_app
        
    async def publish(self, event: BaseEvent) -> bool:
        """
        Publish an event to the appropriate queue
        
        Args:
            event: Event to publish
            
        Returns:
            Success status
        """
        try:
            # Serialize event
            event_data = event.dict()
            event_json = json.dumps(event_data, default=str)
            
            # Store in event store for audit/replay
            await self._store_event(event)
            
            # Route to appropriate queue based on event type
            queue_name = self._get_queue_for_event(event)
            routing_key = self._get_routing_key(event)
            
            # Publish to Celery queue
            task_name = self._get_task_for_event(event)
            if task_name:
                self.celery_app.send_task(
                    task_name,
                    args=[event_data],
                    queue=queue_name,
                    routing_key=routing_key,
                    priority=self._get_priority_value(event.priority)
                )
                
            # Also publish to Redis pub/sub for real-time updates
            channel = f"events:{event.event_type}:{event.user_id}"
            self.redis_client.publish(channel, event_json)
            
            logger.info(f"Published event {event.event_id} of type {event.event_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish event {event.event_id}: {e}")
            return False
    
    async def publish_batch(self, events: List[BaseEvent]) -> Dict[str, bool]:
        """
        Publish multiple events
        
        Args:
            events: List of events to publish
            
        Returns:
            Dictionary of event_id -> success status
        """
        results = {}
        tasks = []
        
        for event in events:
            task = asyncio.create_task(self.publish(event))
            tasks.append((event.event_id, task))
        
        for event_id, task in tasks:
            results[event_id] = await task
            
        return results
    
    def publish_sync(self, event: BaseEvent) -> bool:
        """
        Synchronous version of publish for non-async contexts
        """
        try:
            event_data = event.dict()
            event_json = json.dumps(event_data, default=str)
            
            # Store in event store
            self._store_event_sync(event)
            
            # Route and publish
            queue_name = self._get_queue_for_event(event)
            routing_key = self._get_routing_key(event)
            task_name = self._get_task_for_event(event)
            
            if task_name:
                self.celery_app.send_task(
                    task_name,
                    args=[event_data],
                    queue=queue_name,
                    routing_key=routing_key,
                    priority=self._get_priority_value(event.priority)
                )
            
            # Redis pub/sub
            channel = f"events:{event.event_type}:{event.user_id}"
            self.redis_client.publish(channel, event_json)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish event {event.event_id}: {e}")
            return False
    
    async def _store_event(self, event: BaseEvent):
        """Store event in event store for audit/replay"""
        # Store in Redis with TTL (7 days)
        key = f"event_store:{event.event_id}"
        self.redis_client.setex(
            key,
            604800,  # 7 days in seconds
            json.dumps(event.dict(), default=str)
        )
        
        # Add to user's event stream
        stream_key = f"event_stream:{event.user_id}"
        self.redis_client.zadd(
            stream_key,
            {event.event_id: event.timestamp.timestamp()}
        )
        
        # Trim old events (keep last 1000)
        self.redis_client.zremrangebyrank(stream_key, 0, -1001)
    
    def _store_event_sync(self, event: BaseEvent):
        """Synchronous version of event storage"""
        key = f"event_store:{event.event_id}"
        self.redis_client.setex(
            key,
            604800,
            json.dumps(event.dict(), default=str)
        )
        
        stream_key = f"event_stream:{event.user_id}"
        self.redis_client.zadd(
            stream_key,
            {event.event_id: event.timestamp.timestamp()}
        )
        self.redis_client.zremrangebyrank(stream_key, 0, -1001)
    
    def _get_queue_for_event(self, event: BaseEvent) -> str:
        """Determine queue based on event type"""
        queue_mapping = {
            EventType.JOB_FOUND: 'job_discovery.normal',
            EventType.JOB_BATCH_FOUND: 'job_discovery.batch',
            EventType.CV_GENERATED: 'cv_generation.normal',
            EventType.CV_GENERATION_FAILED: 'cv_generation.normal',
            EventType.APPLICATION_SUBMITTED: 'applications.generic',
            EventType.APPLICATION_FAILED: 'applications.generic',
            EventType.APPLICATION_RETRY: 'applications.generic',
            EventType.NOTIFICATION: 'notifications',
            EventType.USER_ACTION: 'default',
            EventType.SYSTEM_ALERT: 'default',
        }
        
        # Override for high priority
        if event.priority == EventPriority.URGENT:
            if event.event_type in [EventType.JOB_FOUND, EventType.JOB_BATCH_FOUND]:
                return 'job_discovery.high'
            elif event.event_type == EventType.CV_GENERATED:
                return 'cv_generation.urgent'
        
        return queue_mapping.get(event.event_type, 'default')
    
    def _get_routing_key(self, event: BaseEvent) -> str:
        """Generate routing key for event"""
        routing_key_mapping = {
            EventType.JOB_FOUND: 'job.discovery.normal',
            EventType.JOB_BATCH_FOUND: 'job.discovery.batch',
            EventType.CV_GENERATED: 'cv.generate.normal',
            EventType.CV_GENERATION_FAILED: 'cv.generate.failed',
            EventType.APPLICATION_SUBMITTED: 'app.submit.generic',
            EventType.APPLICATION_FAILED: 'app.submit.failed',
            EventType.APPLICATION_RETRY: 'app.submit.retry',
            EventType.NOTIFICATION: 'notification',
            EventType.USER_ACTION: 'user.action',
            EventType.SYSTEM_ALERT: 'system.alert',
        }
        
        # Platform-specific routing for applications
        if event.event_type in [EventType.APPLICATION_SUBMITTED, EventType.APPLICATION_FAILED]:
            platform = getattr(event, 'platform', 'generic')
            return f'app.submit.{platform}'
        
        return routing_key_mapping.get(event.event_type, 'default')
    
    def _get_task_for_event(self, event: BaseEvent) -> Optional[str]:
        """Map event to Celery task"""
        task_mapping = {
            EventType.JOB_FOUND: 'tasks.cv_generation.generate_cv_for_job',
            EventType.JOB_BATCH_FOUND: 'tasks.cv_generation.generate_cvs_batch',
            EventType.CV_GENERATED: 'tasks.applications.submit_application',
            EventType.CV_GENERATION_FAILED: 'tasks.cv_generation.handle_generation_failure',
            EventType.APPLICATION_SUBMITTED: 'tasks.notifications.send_submission_confirmation',
            EventType.APPLICATION_FAILED: 'tasks.applications.handle_submission_failure',
            EventType.APPLICATION_RETRY: 'tasks.applications.retry_submission',
            EventType.NOTIFICATION: 'tasks.notifications.send_notification',
            EventType.USER_ACTION: 'tasks.analytics.track_user_action',
            EventType.SYSTEM_ALERT: 'tasks.monitoring.handle_system_alert',
        }
        
        return task_mapping.get(event.event_type)
    
    def _get_priority_value(self, priority: EventPriority) -> int:
        """Convert priority enum to numeric value"""
        priority_values = {
            EventPriority.LOW: 1,
            EventPriority.NORMAL: 5,
            EventPriority.HIGH: 8,
            EventPriority.URGENT: 10,
        }
        return priority_values.get(priority, 5)

# Singleton instance
_publisher_instance = None

def get_event_publisher() -> EventPublisher:
    """Get or create singleton event publisher"""
    global _publisher_instance
    if _publisher_instance is None:
        _publisher_instance = EventPublisher()
    return _publisher_instance

# Convenience functions for common event publishing patterns

async def publish_job_found(user_id: str, job_data: Dict[str, Any]) -> bool:
    """Publish a job found event"""
    from .schemas import create_job_found_event
    
    publisher = get_event_publisher()
    event = create_job_found_event(user_id, job_data)
    return await publisher.publish(event)

async def publish_cv_generated(user_id: str, job_id: str, cv_data: Dict[str, Any]) -> bool:
    """Publish a CV generated event"""
    from .schemas import create_cv_generated_event
    
    publisher = get_event_publisher()
    event = create_cv_generated_event(user_id, job_id, cv_data)
    return await publisher.publish(event)

async def publish_application_submitted(
    user_id: str, 
    job_id: str, 
    cv_id: str,
    application_data: Dict[str, Any]
) -> bool:
    """Publish an application submitted event"""
    from .schemas import create_application_submitted_event
    
    publisher = get_event_publisher()
    event = create_application_submitted_event(user_id, job_id, cv_id, application_data)
    return await publisher.publish(event)

async def publish_notification(
    user_id: str,
    subject: str,
    message: str,
    notification_type: str = 'email',
    **kwargs
) -> bool:
    """Publish a notification event"""
    from .schemas import create_notification_event
    
    publisher = get_event_publisher()
    event = create_notification_event(user_id, subject, message, notification_type, **kwargs)
    return await publisher.publish(event)