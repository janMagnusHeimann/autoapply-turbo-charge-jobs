"""
Supabase client for database operations
"""

import os
import logging
from typing import Optional, List, Dict, Any
from supabase import create_client, Client

from ...core.models import CompanyData, CareerPageResult, UserProfile, UserPreferences

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Client for Supabase database operations"""
    
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_ANON_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Supabase URL and key are required")
            
        self.client: Client = create_client(self.supabase_url, self.supabase_key)

    async def get_company(self, company_id: str) -> Optional[CompanyData]:
        """Get company by ID"""
        try:
            result = self.client.table("companies").select("*").eq("id", company_id).single().execute()
            if result.data:
                return CompanyData(**result.data)
        except Exception as e:
            logger.error(f"Error fetching company {company_id}: {e}")
        return None

    async def get_companies(self, limit: Optional[int] = None) -> List[CompanyData]:
        """Get all companies"""
        try:
            query = self.client.table("companies").select("*").order("name")
            if limit:
                query = query.limit(limit)
            
            result = query.execute()
            return [CompanyData(**row) for row in result.data]
        except Exception as e:
            logger.error(f"Error fetching companies: {e}")
            return []

    async def update_company_career_page(self, company_id: str, career_page_url: str) -> bool:
        """Update company with discovered career page URL"""
        try:
            self.client.table("companies").update({
                "careers_url": career_page_url
            }).eq("id", company_id).execute()
            logger.info(f"Updated career page for company {company_id}: {career_page_url}")
            return True
        except Exception as e:
            logger.error(f"Error updating career page for company {company_id}: {e}")
            return False

    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile by ID"""
        try:
            result = self.client.table("users").select("*").eq("id", user_id).single().execute()
            if result.data:
                return UserProfile(**result.data)
        except Exception as e:
            logger.error(f"Error fetching user profile {user_id}: {e}")
        return None

    async def get_user_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """Get user preferences by user ID"""
        try:
            result = self.client.table("user_preferences").select("*").eq("user_id", user_id).single().execute()
            if result.data:
                return UserPreferences(**result.data)
        except Exception as e:
            logger.error(f"Error fetching user preferences for {user_id}: {e}")
        return None

    async def get_user_cv_assets(self, user_id: str, asset_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get user CV assets"""
        try:
            query = self.client.table("cv_assets").select("*").eq("user_id", user_id).order("created_at", desc=True)
            
            if asset_type:
                query = query.eq("asset_type", asset_type)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching CV assets for user {user_id}: {e}")
            return []

    async def check_company_career_page_exists(self, company_id: str) -> Optional[str]:
        """Check if company already has a career page URL"""
        try:
            result = self.client.table("companies").select("careers_url").eq("id", company_id).single().execute()
            if result.data and result.data.get("careers_url"):
                return result.data["careers_url"]
        except Exception as e:
            logger.warning(f"Could not check existing career page for {company_id}: {e}")
        return None

    async def store_career_page_discovery_log(self, discovery_result: CareerPageResult) -> bool:
        """Store career page discovery result for analytics"""
        try:
            # Create a simplified log entry for the discovery
            log_entry = {
                "company_id": discovery_result.company_id,
                "company_name": discovery_result.company_name,
                "career_page_url": discovery_result.career_page_url,
                "confidence_score": discovery_result.confidence_score,
                "discovery_method": discovery_result.discovery_method,
                "validation_status": discovery_result.validation_status,
                "cost_usd": discovery_result.cost_usd,
                "discovered_at": discovery_result.discovered_at.isoformat(),
                "error_message": discovery_result.error_message
            }
            
            # Store in a career_page_discovery_logs table (if it exists)
            # This is optional and for analytics purposes
            try:
                self.client.table("career_page_discovery_logs").insert(log_entry).execute()
            except Exception:
                # If table doesn't exist, that's fine - logging is optional
                pass
                
            return True
        except Exception as e:
            logger.error(f"Error storing discovery log: {e}")
            return False