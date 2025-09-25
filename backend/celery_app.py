"""
Celery Application Instance
"""

from celery import Celery
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Celery instance
app = Celery('autoapply')

# Load configuration from celery_config.py
app.config_from_object('celery_config')

# Import tasks directly since autodiscover has path issues
from tasks import job_discovery, cv_generation, applications, notifications, maintenance, analytics

# Configure task error handling
@app.task(bind=True, max_retries=3)
def debug_task(self):
    """Debug task for testing Celery setup"""
    print(f'Request: {self.request!r}')
    return {'status': 'ok', 'worker': self.request.hostname}

if __name__ == '__main__':
    app.start()