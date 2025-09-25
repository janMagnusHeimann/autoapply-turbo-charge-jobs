"""
Event Store for Event Persistence and Replay
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import redis
from supabase import create_client, Client
from .schemas import BaseEvent, EventType

logger = logging.getLogger(__name__)

class EventStore:
    """
    Persistent event storage with replay capability
    """
    
    def __init__(
        self, 
        redis_url: str = 'redis://localhost:6379/0',
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None
    ):
        self.redis_client = redis.from_url(redis_url)
        self.supabase_client = None
        
        if supabase_url and supabase_key:
            self.supabase_client = create_client(supabase_url, supabase_key)
    
    async def store_event(self, event: BaseEvent) -> bool:
        """
        Store event in both Redis (hot storage) and Supabase (cold storage)
        
        Args:
            event: Event to store
            
        Returns:
            Success status
        """
        try:
            event_dict = event.dict()
            event_json = json.dumps(event_dict, default=str)
            
            # Store in Redis with TTL (7 days for hot data)
            redis_key = f"event:{event.event_id}"
            self.redis_client.setex(
                redis_key,
                timedelta(days=7),
                event_json
            )
            
            # Add to event streams
            self._add_to_streams(event)
            
            # Store in Supabase for long-term storage
            if self.supabase_client:
                await self._store_in_supabase(event_dict)
            
            logger.info(f"Stored event {event.event_id} in event store")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store event {event.event_id}: {e}")
            return False
    
    def _add_to_streams(self, event: BaseEvent):
        """Add event to various streams for querying"""
        
        # User stream
        user_stream = f"stream:user:{event.user_id}"
        self.redis_client.zadd(
            user_stream,
            {event.event_id: event.timestamp.timestamp()}
        )
        
        # Type stream
        type_stream = f"stream:type:{event.event_type}"
        self.redis_client.zadd(
            type_stream,
            {event.event_id: event.timestamp.timestamp()}
        )
        
        # Global stream
        global_stream = "stream:global"
        self.redis_client.zadd(
            global_stream,
            {event.event_id: event.timestamp.timestamp()}
        )
        
        # Correlation stream (if correlation_id exists)
        if event.correlation_id:
            correlation_stream = f"stream:correlation:{event.correlation_id}"
            self.redis_client.zadd(
                correlation_stream,
                {event.event_id: event.timestamp.timestamp()}
            )
        
        # Trim streams to prevent unbounded growth
        for stream_key in [user_stream, type_stream, global_stream]:
            self.redis_client.zremrangebyrank(stream_key, 0, -10001)  # Keep last 10000
    
    async def _store_in_supabase(self, event_dict: Dict[str, Any]):
        """Store event in Supabase for long-term storage"""
        try:
            # Store in events table
            self.supabase_client.table('events').insert({
                'event_id': event_dict['event_id'],
                'event_type': event_dict['event_type'],
                'user_id': event_dict['user_id'],
                'correlation_id': event_dict.get('correlation_id'),
                'priority': event_dict['priority'],
                'timestamp': event_dict['timestamp'],
                'data': event_dict,
                'metadata': event_dict.get('metadata', {})
            }).execute()
            
        except Exception as e:
            logger.error(f"Failed to store event in Supabase: {e}")
    
    async def get_event(self, event_id: str) -> Optional[BaseEvent]:
        """
        Retrieve a single event by ID
        
        Args:
            event_id: Event ID
            
        Returns:
            Event object or None
        """
        try:
            # Try Redis first (hot storage)
            redis_key = f"event:{event_id}"
            event_json = self.redis_client.get(redis_key)
            
            if event_json:
                event_dict = json.loads(event_json)
                return self._deserialize_event(event_dict)
            
            # Fall back to Supabase (cold storage)
            if self.supabase_client:
                response = self.supabase_client.table('events').select('data').eq('event_id', event_id).execute()
                if response.data:
                    event_dict = response.data[0]['data']
                    return self._deserialize_event(event_dict)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve event {event_id}: {e}")
            return None
    
    async def get_user_events(
        self, 
        user_id: str, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        event_types: Optional[List[EventType]] = None,
        limit: int = 100
    ) -> List[BaseEvent]:
        """
        Get events for a user
        
        Args:
            user_id: User ID
            start_time: Start time filter
            end_time: End time filter
            event_types: Filter by event types
            limit: Maximum number of events
            
        Returns:
            List of events
        """
        try:
            # Get event IDs from user stream
            user_stream = f"stream:user:{user_id}"
            
            # Calculate time bounds
            min_score = start_time.timestamp() if start_time else '-inf'
            max_score = end_time.timestamp() if end_time else '+inf'
            
            # Get event IDs from Redis
            event_ids = self.redis_client.zrevrangebyscore(
                user_stream,
                max_score,
                min_score,
                start=0,
                num=limit
            )
            
            # Retrieve events
            events = []
            for event_id in event_ids:
                event = await self.get_event(event_id.decode() if isinstance(event_id, bytes) else event_id)
                if event:
                    # Filter by type if specified
                    if not event_types or event.event_type in event_types:
                        events.append(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get user events: {e}")
            return []
    
    async def get_events_by_correlation(self, correlation_id: str) -> List[BaseEvent]:
        """
        Get all events with a specific correlation ID
        
        Args:
            correlation_id: Correlation ID
            
        Returns:
            List of related events
        """
        try:
            correlation_stream = f"stream:correlation:{correlation_id}"
            event_ids = self.redis_client.zrange(correlation_stream, 0, -1)
            
            events = []
            for event_id in event_ids:
                event = await self.get_event(event_id.decode() if isinstance(event_id, bytes) else event_id)
                if event:
                    events.append(event)
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get correlated events: {e}")
            return []
    
    async def replay_events(
        self,
        start_time: datetime,
        end_time: datetime,
        event_types: Optional[List[EventType]] = None,
        user_id: Optional[str] = None
    ) -> List[BaseEvent]:
        """
        Replay events within a time range
        
        Args:
            start_time: Start time
            end_time: End time
            event_types: Filter by event types
            user_id: Filter by user
            
        Returns:
            List of events in chronological order
        """
        try:
            if user_id:
                # Get user-specific events
                return await self.get_user_events(
                    user_id, 
                    start_time, 
                    end_time, 
                    event_types
                )
            else:
                # Get all events from global stream
                global_stream = "stream:global"
                
                min_score = start_time.timestamp()
                max_score = end_time.timestamp()
                
                event_ids = self.redis_client.zrangebyscore(
                    global_stream,
                    min_score,
                    max_score
                )
                
                events = []
                for event_id in event_ids:
                    event = await self.get_event(event_id.decode() if isinstance(event_id, bytes) else event_id)
                    if event:
                        if not event_types or event.event_type in event_types:
                            events.append(event)
                
                return events
                
        except Exception as e:
            logger.error(f"Failed to replay events: {e}")
            return []
    
    def _deserialize_event(self, event_dict: Dict[str, Any]) -> Optional[BaseEvent]:
        """Deserialize event dictionary to event object"""
        try:
            from . import schemas
            
            event_type = EventType(event_dict['event_type'])
            
            # Map to specific event class
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
            
            event_class = event_class_mapping.get(event_type, schemas.BaseEvent)
            
            # Handle datetime conversion
            if isinstance(event_dict.get('timestamp'), str):
                event_dict['timestamp'] = datetime.fromisoformat(event_dict['timestamp'])
            
            return event_class(**event_dict)
            
        except Exception as e:
            logger.error(f"Failed to deserialize event: {e}")
            return None
    
    async def get_statistics(
        self,
        user_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get event statistics
        
        Args:
            user_id: Optional user filter
            start_time: Start time filter
            end_time: End time filter
            
        Returns:
            Statistics dictionary
        """
        try:
            stats = {
                'total_events': 0,
                'events_by_type': {},
                'events_by_priority': {},
                'success_rate': 0,
                'failed_events': 0,
            }
            
            # Get events
            if user_id:
                events = await self.get_user_events(user_id, start_time, end_time)
            else:
                events = await self.replay_events(
                    start_time or datetime.utcnow() - timedelta(days=7),
                    end_time or datetime.utcnow()
                )
            
            stats['total_events'] = len(events)
            
            # Count by type
            for event in events:
                event_type = str(event.event_type)
                stats['events_by_type'][event_type] = stats['events_by_type'].get(event_type, 0) + 1
                
                # Count by priority
                priority = str(event.priority)
                stats['events_by_priority'][priority] = stats['events_by_priority'].get(priority, 0) + 1
                
                # Count failures
                if 'FAILED' in event_type:
                    stats['failed_events'] += 1
            
            # Calculate success rate
            if stats['total_events'] > 0:
                stats['success_rate'] = (stats['total_events'] - stats['failed_events']) / stats['total_events']
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get statistics: {e}")
            return {}

# Singleton instance
_event_store_instance = None

def get_event_store(
    redis_url: str = 'redis://localhost:6379/0',
    supabase_url: Optional[str] = None,
    supabase_key: Optional[str] = None
) -> EventStore:
    """Get or create singleton event store"""
    global _event_store_instance
    if _event_store_instance is None:
        _event_store_instance = EventStore(redis_url, supabase_url, supabase_key)
    return _event_store_instance