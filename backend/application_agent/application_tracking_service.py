"""
Application Tracking Service - Track and manage job application progress

This service handles:
- Application attempt tracking
- Real-time progress updates
- Application history and analytics
- Status management and notifications
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

from supabase import Client

logger = logging.getLogger(__name__)

class ApplicationTrackingService:
    """
    Service for tracking job application progress and history
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
    async def create_application_attempt(self, application_data: Dict[str, Any]) -> str:
        """
        Create a new application attempt record
        
        Args:
            application_data: Dictionary containing application details
            
        Returns:
            Application ID
        """
        try:
            logger.info(f"📝 Creating application attempt: {application_data['id']}")
            
            # Insert into application_attempts table
            response = self.supabase.table('application_attempts').insert(application_data).execute()
            
            if not response.data:
                raise Exception("Failed to create application attempt")
            
            application_id = response.data[0]['id']
            logger.info(f"✅ Application attempt created: {application_id}")
            
            return application_id
            
        except Exception as e:
            logger.error(f"❌ Failed to create application attempt: {e}")
            raise
    
    async def update_application_progress(
        self, 
        application_id: str, 
        progress_percentage: int, 
        current_step: str, 
        status: str,
        messages: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Update application progress and status
        
        Args:
            application_id: Application ID
            progress_percentage: Progress percentage (0-100)
            current_step: Description of current step
            status: Application status
            messages: List of progress messages
            metadata: Additional metadata
        """
        try:
            logger.info(f"📊 Updating progress for {application_id}: {progress_percentage}% - {current_step}")
            
            update_data = {
                'progress_percentage': progress_percentage,
                'current_step': current_step,
                'status': status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if messages:
                # Get existing messages and append new ones
                existing_response = self.supabase.table('application_attempts').select('messages').eq('id', application_id).execute()
                existing_messages = []
                if existing_response.data:
                    existing_messages = existing_response.data[0].get('messages', [])
                
                all_messages = existing_messages + messages
                update_data['messages'] = all_messages
            
            if metadata:
                update_data['metadata'] = metadata
            
            # Update the record
            response = self.supabase.table('application_attempts').update(update_data).eq('id', application_id).execute()
            
            if not response.data:
                logger.warning(f"No rows updated for application {application_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to update application progress: {e}")
            raise
    
    async def get_application_status(self, application_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current status of an application
        
        Args:
            application_id: Application ID
            
        Returns:
            Dictionary containing application status or None if not found
        """
        try:
            response = self.supabase.table('application_attempts').select('*').eq('id', application_id).execute()
            
            if not response.data:
                return None
            
            application = response.data[0]
            
            return {
                'application_id': application['id'],
                'status': application.get('status', 'unknown'),
                'progress_percentage': application.get('progress_percentage', 0),
                'current_step': application.get('current_step', ''),
                'messages': application.get('messages', []),
                'form_data': application.get('filled_form_data'),
                'error': application.get('error_message'),
                'created_at': application.get('created_at'),
                'updated_at': application.get('updated_at')
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get application status: {e}")
            return None
    
    async def store_filled_form(self, application_id: str, form_data: Dict[str, Any]):
        """
        Store filled form data for review
        
        Args:
            application_id: Application ID
            form_data: Filled form data
        """
        try:
            logger.info(f"💾 Storing filled form for application: {application_id}")
            
            update_data = {
                'filled_form_data': form_data,
                'form_stored_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('application_attempts').update(update_data).eq('id', application_id).execute()
            
            if not response.data:
                logger.warning(f"No rows updated when storing form for {application_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to store filled form: {e}")
            raise
    
    async def cancel_application(self, application_id: str):
        """
        Cancel an ongoing application process
        
        Args:
            application_id: Application ID
        """
        try:
            logger.info(f"❌ Cancelling application: {application_id}")
            
            update_data = {
                'status': 'cancelled',
                'cancelled_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('application_attempts').update(update_data).eq('id', application_id).execute()
            
            if not response.data:
                logger.warning(f"No rows updated when cancelling {application_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to cancel application: {e}")
            raise
    
    async def get_user_application_history(self, user_id: str) -> Dict[str, Any]:
        """
        Get application history for a user with analytics
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary containing application history and statistics
        """
        try:
            logger.info(f"📊 Getting application history for user: {user_id}")
            
            # Get all applications for user
            response = self.supabase.table('application_attempts').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            applications = response.data
            
            # Calculate statistics
            total_applications = len(applications)
            successful_applications = len([app for app in applications if app.get('status') == 'submitted'])
            failed_applications = len([app for app in applications if app.get('status') == 'failed'])
            pending_applications = len([app for app in applications if app.get('status') in ['analyzing', 'filling', 'reviewing', 'submitting']])
            
            success_rate = (successful_applications / total_applications * 100) if total_applications > 0 else 0
            
            # Get recent applications (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_applications = [
                app for app in applications 
                if datetime.fromisoformat(app['created_at'].replace('Z', '+00:00')) > thirty_days_ago
            ]
            
            # Format applications for frontend
            formatted_applications = []
            for app in applications:
                formatted_app = {
                    'id': app['id'],
                    'job_id': app.get('job_id'),
                    'cv_choice': app.get('cv_choice'),
                    'status': app.get('status'),
                    'progress_percentage': app.get('progress_percentage', 0),
                    'current_step': app.get('current_step'),
                    'created_at': app.get('created_at'),
                    'updated_at': app.get('updated_at'),
                    'error_message': app.get('error_message'),
                    'auto_submit': app.get('auto_submit', False)
                }
                formatted_applications.append(formatted_app)
            
            return {
                'applications': formatted_applications,
                'total': total_applications,
                'success_rate': round(success_rate, 1),
                'statistics': {
                    'successful': successful_applications,
                    'failed': failed_applications,
                    'pending': pending_applications,
                    'recent_count': len(recent_applications),
                    'average_success_rate': round(success_rate, 1)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get application history: {e}")
            return {
                'applications': [],
                'total': 0,
                'success_rate': 0.0,
                'statistics': {
                    'successful': 0,
                    'failed': 0,
                    'pending': 0,
                    'recent_count': 0,
                    'average_success_rate': 0.0
                }
            }
    
    async def get_application_analytics(self, user_id: str) -> Dict[str, Any]:
        """
        Get detailed analytics for user applications
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary containing detailed analytics
        """
        try:
            logger.info(f"📈 Getting application analytics for user: {user_id}")
            
            # Get all applications
            response = self.supabase.table('application_attempts').select('*').eq('user_id', user_id).execute()
            applications = response.data
            
            if not applications:
                return self._empty_analytics()
            
            # Analyze by status
            status_counts = {}
            for app in applications:
                status = app.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            # Analyze by time periods
            now = datetime.utcnow()
            time_periods = {
                'last_7_days': 0,
                'last_30_days': 0,
                'last_90_days': 0
            }
            
            for app in applications:
                created_at = datetime.fromisoformat(app['created_at'].replace('Z', '+00:00'))
                days_ago = (now - created_at).days
                
                if days_ago <= 7:
                    time_periods['last_7_days'] += 1
                if days_ago <= 30:
                    time_periods['last_30_days'] += 1
                if days_ago <= 90:
                    time_periods['last_90_days'] += 1
            
            # Calculate average completion time for successful applications
            successful_apps = [app for app in applications if app.get('status') == 'submitted']
            avg_completion_time = 0
            
            if successful_apps:
                total_time = 0
                count = 0
                for app in successful_apps:
                    if app.get('created_at') and app.get('updated_at'):
                        created = datetime.fromisoformat(app['created_at'].replace('Z', '+00:00'))
                        updated = datetime.fromisoformat(app['updated_at'].replace('Z', '+00:00'))
                        completion_time = (updated - created).total_seconds() / 60  # minutes
                        total_time += completion_time
                        count += 1
                
                if count > 0:
                    avg_completion_time = total_time / count
            
            return {
                'total_applications': len(applications),
                'status_breakdown': status_counts,
                'time_periods': time_periods,
                'success_rate': (status_counts.get('submitted', 0) / len(applications) * 100) if applications else 0,
                'average_completion_time_minutes': round(avg_completion_time, 1),
                'most_recent_application': applications[0]['created_at'] if applications else None,
                'trends': {
                    'weekly_average': time_periods['last_7_days'],
                    'monthly_average': time_periods['last_30_days'] / 4,  # Approximate weekly from monthly
                    'improvement_areas': self._identify_improvement_areas(applications)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get application analytics: {e}")
            return self._empty_analytics()
    
    def _empty_analytics(self) -> Dict[str, Any]:
        """Return empty analytics structure"""
        return {
            'total_applications': 0,
            'status_breakdown': {},
            'time_periods': {'last_7_days': 0, 'last_30_days': 0, 'last_90_days': 0},
            'success_rate': 0.0,
            'average_completion_time_minutes': 0.0,
            'most_recent_application': None,
            'trends': {
                'weekly_average': 0,
                'monthly_average': 0,
                'improvement_areas': []
            }
        }
    
    def _identify_improvement_areas(self, applications: List[Dict[str, Any]]) -> List[str]:
        """Identify areas for improvement based on application patterns"""
        improvement_areas = []
        
        if not applications:
            return improvement_areas
        
        # Check failure rate
        failed_count = len([app for app in applications if app.get('status') == 'failed'])
        failure_rate = failed_count / len(applications)
        
        if failure_rate > 0.3:  # More than 30% failure rate
            improvement_areas.append("High failure rate - consider improving CV quality or form filling accuracy")
        
        # Check for frequent cancellations
        cancelled_count = len([app for app in applications if app.get('status') == 'cancelled'])
        if cancelled_count > 3:
            improvement_areas.append("Frequent cancellations - consider better job filtering or automated submission")
        
        # Check for stuck applications
        stuck_count = len([app for app in applications if app.get('status') in ['analyzing', 'filling'] and app.get('progress_percentage', 0) < 50])
        if stuck_count > 2:
            improvement_areas.append("Applications getting stuck in early stages - may indicate form complexity issues")
        
        return improvement_areas