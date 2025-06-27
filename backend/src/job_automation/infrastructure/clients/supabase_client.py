"""
Supabase Client - Handles all interactions with the Supabase database.
Provides a centralized, reusable client for database operations.
"""

import os
import logging
from typing import Optional, List, Dict, Any

from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseClient:
    """A wrapper for the Supabase client to manage database interactions."""
    
    _client: Optional[Client] = None

    def __init__(self):
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            logger.warning("Supabase credentials not found. Database operations will be disabled.")
            self._client = None
        else:
            try:
                self._client = create_client(url, key)
                logger.info("Supabase client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                self._client = None

    def get_client(self) -> Optional[Client]:
        """Returns the Supabase client instance."""
        return self._client

# Create a single, reusable instance of the client
supabase_client = SupabaseClient()

def get_supabase_client() -> Optional[Client]:
    """Provides access to the shared Supabase client instance."""
    return supabase_client.get_client() 