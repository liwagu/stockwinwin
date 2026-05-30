"""
Repository for lead_submissions table operations.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import logging

from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class LeadSubmissionsRepository:
    """Repository for marketing lead capture submissions."""

    @staticmethod
    def get_recent_by_email(email: str, hours: int = 24) -> Optional[Dict[str, Any]]:
        """Return the most recent lead submission for an email within the given window."""
        supabase = get_supabase_client()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        try:
            response = (
                supabase.table("lead_submissions")
                .select("*")
                .eq("email", email)
                .gte("created_at", cutoff.isoformat())
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if response.data:
                return response.data[0]

            return None
        except Exception as e:
            logger.error(f"Error checking recent lead submission for {email}: {str(e)}")
            raise

    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a new lead submission."""
        supabase = get_supabase_client()

        try:
            response = supabase.table("lead_submissions").insert(data).execute()

            if response.data:
                logger.info(f"Created lead submission for {data.get('email')}")
                return response.data[0]

            raise Exception("Failed to create lead submission")
        except Exception as e:
            logger.error(f"Error creating lead submission for {data.get('email')}: {str(e)}")
            raise


lead_submissions_repo = LeadSubmissionsRepository()
