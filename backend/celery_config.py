"""
Celery Configuration for Event-Driven Job Automation System
"""

import os
from kombu import Queue, Exchange
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Broker Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')

# Task Configuration
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'UTC'
CELERY_ENABLE_UTC = True

# Task execution limits
CELERY_TASK_TIME_LIMIT = 3600  # 1 hour hard limit
CELERY_TASK_SOFT_TIME_LIMIT = 3300  # 55 minutes soft limit

# Result backend settings
CELERY_RESULT_EXPIRES = 86400  # Results expire after 24 hours

# Queue Configuration
CELERY_DEFAULT_QUEUE = 'default'
CELERY_DEFAULT_EXCHANGE = 'default'
CELERY_DEFAULT_EXCHANGE_TYPE = 'direct'
CELERY_DEFAULT_ROUTING_KEY = 'default'

# Define exchanges
job_exchange = Exchange('jobs', type='topic', durable=True)
cv_exchange = Exchange('cvs', type='topic', durable=True)
application_exchange = Exchange('applications', type='topic', durable=True)
notification_exchange = Exchange('notifications', type='fanout', durable=True)

# Define queues with priorities
CELERY_QUEUES = (
    # Default queue for misc tasks
    Queue('default', Exchange('default'), routing_key='default'),
    
    # Job Discovery queues
    Queue('job_discovery.high', job_exchange, routing_key='job.discovery.high', 
          priority=10, max_priority=10),
    Queue('job_discovery.normal', job_exchange, routing_key='job.discovery.normal',
          priority=5, max_priority=10),
    Queue('job_discovery.batch', job_exchange, routing_key='job.discovery.batch',
          priority=1, max_priority=10),
    
    # CV Generation queues
    Queue('cv_generation.urgent', cv_exchange, routing_key='cv.generate.urgent',
          priority=10, max_priority=10),
    Queue('cv_generation.normal', cv_exchange, routing_key='cv.generate.normal',
          priority=5, max_priority=10),
    
    # Application submission queues (with rate limiting)
    Queue('applications.linkedin', application_exchange, routing_key='app.submit.linkedin',
          priority=5, max_priority=10),
    Queue('applications.indeed', application_exchange, routing_key='app.submit.indeed',
          priority=5, max_priority=10),
    Queue('applications.greenhouse', application_exchange, routing_key='app.submit.greenhouse',
          priority=5, max_priority=10),
    Queue('applications.lever', application_exchange, routing_key='app.submit.lever',
          priority=5, max_priority=10),
    Queue('applications.generic', application_exchange, routing_key='app.submit.generic',
          priority=3, max_priority=10),
    
    # Notification queue
    Queue('notifications', notification_exchange, routing_key=''),
)

# Task routing
CELERY_TASK_ROUTES = {
    # Job Discovery tasks
    'tasks.job_discovery.discover_single_company': {
        'queue': 'job_discovery.normal',
        'routing_key': 'job.discovery.normal',
    },
    'tasks.job_discovery.discover_batch_companies': {
        'queue': 'job_discovery.batch',
        'routing_key': 'job.discovery.batch',
    },
    'tasks.job_discovery.urgent_job_search': {
        'queue': 'job_discovery.high',
        'routing_key': 'job.discovery.high',
    },
    
    # CV Generation tasks
    'tasks.cv_generation.generate_cv': {
        'queue': 'cv_generation.normal',
        'routing_key': 'cv.generate.normal',
    },
    'tasks.cv_generation.generate_urgent_cv': {
        'queue': 'cv_generation.urgent',
        'routing_key': 'cv.generate.urgent',
    },
    
    # Application tasks (routed by platform)
    'tasks.applications.submit_to_linkedin': {
        'queue': 'applications.linkedin',
        'routing_key': 'app.submit.linkedin',
    },
    'tasks.applications.submit_to_indeed': {
        'queue': 'applications.indeed',
        'routing_key': 'app.submit.indeed',
    },
    'tasks.applications.submit_to_greenhouse': {
        'queue': 'applications.greenhouse',
        'routing_key': 'app.submit.greenhouse',
    },
    'tasks.applications.submit_to_lever': {
        'queue': 'applications.lever',
        'routing_key': 'app.submit.lever',
    },
    'tasks.applications.submit_generic': {
        'queue': 'applications.generic',
        'routing_key': 'app.submit.generic',
    },
    
    # Notification tasks
    'tasks.notifications.*': {
        'queue': 'notifications',
    },
}

# Rate limiting configuration (per queue)
CELERY_ANNOTATIONS = {
    'tasks.applications.submit_to_linkedin': {
        'rate_limit': '50/h',  # 50 per hour for LinkedIn
    },
    'tasks.applications.submit_to_indeed': {
        'rate_limit': '100/h',  # 100 per hour for Indeed
    },
    'tasks.applications.submit_to_greenhouse': {
        'rate_limit': '30/h',  # 30 per hour for Greenhouse
    },
    'tasks.applications.submit_to_lever': {
        'rate_limit': '30/h',  # 30 per hour for Lever
    },
    'tasks.cv_generation.generate_cv': {
        'rate_limit': '20/m',  # 20 CVs per minute
    },
    'tasks.job_discovery.discover_single_company': {
        'rate_limit': '10/m',  # 10 companies per minute
    },
}

# Worker configuration
CELERYD_PREFETCH_MULTIPLIER = 4  # Number of tasks to prefetch
CELERYD_MAX_TASKS_PER_CHILD = 100  # Restart worker after 100 tasks (memory management)

# Beat schedule for periodic tasks
CELERYBEAT_SCHEDULE = {
    # Clean up old results every hour
    'cleanup-results': {
        'task': 'tasks.maintenance.cleanup_old_results',
        'schedule': timedelta(hours=1),
    },
    # Check for stuck applications every 30 minutes
    'check-stuck-applications': {
        'task': 'tasks.maintenance.check_stuck_applications',
        'schedule': timedelta(minutes=30),
    },
    # Generate daily stats
    'daily-stats': {
        'task': 'tasks.analytics.generate_daily_stats',
        'schedule': timedelta(days=1),
        'options': {
            'queue': 'default',
            'priority': 1,
        }
    },
    # Retry failed applications every 2 hours
    'retry-failed-applications': {
        'task': 'tasks.applications.retry_failed',
        'schedule': timedelta(hours=2),
        'options': {
            'queue': 'default',
            'priority': 3,
        }
    },
}

# Error handling
CELERY_TASK_REJECT_ON_WORKER_LOST = True
CELERY_TASK_IGNORE_RESULT = False

# Monitoring
CELERY_SEND_TASK_EVENTS = True
CELERY_SEND_EVENTS = True

# Redis specific settings
CELERY_REDIS_MAX_CONNECTIONS = 20
CELERY_REDIS_RETRY_ON_TIMEOUT = True
CELERY_REDIS_SOCKET_KEEPALIVE = True

# Task priorities (if using Redis)
CELERY_ACKS_LATE = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_SEND_SENT_EVENT = True

# Compression
CELERY_MESSAGE_COMPRESSION = 'gzip'

# Security
CELERY_TASK_ALWAYS_EAGER = False  # Set to True for testing without broker

# Custom task base name
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_DEFAULT_EXCHANGE = 'default'
CELERY_TASK_DEFAULT_EXCHANGE_TYPE = 'direct'
CELERY_TASK_DEFAULT_ROUTING_KEY = 'default'