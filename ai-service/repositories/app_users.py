"""
Repository for app_users table operations.

Handles all database operations related to user profiles and subscriptions.
"""

from typing import Optional, Dict, Any
from datetime import datetime
import logging

from services.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class AppUsersRepository:
    """Repository for managing app_users table."""

    @staticmethod
    def get_or_create_user(
        user_id: str,
        email: str,
        profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Get user by ID, or create if doesn't exist.

        This is typically called after OAuth sign-in to ensure the user
        has a row in app_users table.

        Uses UPSERT operation to prevent race conditions when multiple
        requests try to create the same user simultaneously.

        Args:
            user_id: User UUID from auth.users
            email: User email
            profile: Optional profile data from OAuth (full_name, avatar_url)

        Returns:
            Dict containing user data from app_users table

        Raises:
            Exception: If database operation fails
        """
        supabase = get_supabase_client()

        try:
            # Prepare user data for UPSERT
            profile = profile or {}
            user_data = {
                "user_id": user_id,
                "email": email,
                "full_name": profile.get("full_name"),
                "avatar_url": profile.get("avatar_url"),
                "tier": "free",
                "status": "inactive",  # Inactive until user subscribes to paid plan
            }

            # Use UPSERT to handle race conditions atomically
            # This will insert if user doesn't exist, or update if they do
            response = supabase.table("app_users").upsert(
                user_data,
                on_conflict="user_id"  # Specify the conflict column
            ).execute()

            if response.data and len(response.data) > 0:
                user_record = response.data[0]
                logger.info(f"User {user_id} synced successfully (upsert)")
                return user_record
            else:
                raise Exception("Failed to upsert user record")

        except Exception as e:
            logger.error(f"Error in get_or_create_user for {user_id}: {str(e)}")
            raise

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by ID.

        Args:
            user_id: User UUID

        Returns:
            Dict containing user data, or None if not found
        """
        supabase = get_supabase_client()

        try:
            response = supabase.table("app_users").select("*").eq("user_id", user_id).execute()

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None

        except Exception as e:
            logger.error(f"Error getting user {user_id}: {str(e)}")
            raise

    @staticmethod
    def update_subscription_fields(
        user_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update subscription-related fields for a user.

        This is typically called from Stripe webhook handlers.

        Args:
            user_id: User UUID
            data: Dict containing fields to update (e.g., tier, status,
                  stripe_customer_id, stripe_subscription_id,
                  current_period_start, current_period_end,
                  cancel_at_period_end)

        Returns:
            Dict containing updated user data

        Raises:
            Exception: If database operation fails
        """
        supabase = get_supabase_client()

        try:
            response = (
                supabase.table("app_users")
                .update(data)
                .eq("user_id", user_id)
                .execute()
            )

            if response.data and len(response.data) > 0:
                logger.info(f"Updated subscription for user {user_id}: {list(data.keys())}")
                return response.data[0]
            else:
                raise Exception(f"User {user_id} not found for update")

        except Exception as e:
            logger.error(f"Error updating subscription for {user_id}: {str(e)}")
            raise

    @staticmethod
    def get_user_by_stripe_customer_id(stripe_customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user by Stripe customer ID.

        Useful for webhook handlers that provide customer_id but not user_id.

        Args:
            stripe_customer_id: Stripe customer ID

        Returns:
            Dict containing user data, or None if not found
        """
        supabase = get_supabase_client()

        try:
            response = (
                supabase.table("app_users")
                .select("*")
                .eq("stripe_customer_id", stripe_customer_id)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]

            return None

        except Exception as e:
            logger.error(f"Error getting user by customer_id {stripe_customer_id}: {str(e)}")
            raise

    @staticmethod
    def get_subscription_status(user_id: str) -> Dict[str, Any]:
        """
        Get subscription status for a user.

        Args:
            user_id: User UUID

        Returns:
            Dict containing subscription status fields:
                - tier: "free" or "professional"
                - status: "inactive", "active", "canceled", etc.
                - current_period_end: timestamp or None
                - cancel_at_period_end: boolean

        Raises:
            Exception: If user not found
        """
        supabase = get_supabase_client()

        try:
            response = (
                supabase.table("app_users")
                .select("tier, status, current_period_start, current_period_end, cancel_at_period_end, promo_locked")
                .eq("user_id", user_id)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0]
            else:
                raise Exception(f"User {user_id} not found")

        except Exception as e:
            logger.error(f"Error getting subscription status for {user_id}: {str(e)}")
            raise

    @staticmethod
    def is_promo_locked(user_id: str) -> bool:
        """
        Check if user is locked to promo pricing.

        Args:
            user_id: User UUID

        Returns:
            bool: True if user is locked to promo price
        """
        supabase = get_supabase_client()

        try:
            response = (
                supabase.table("app_users")
                .select("promo_locked")
                .eq("user_id", user_id)
                .execute()
            )

            if response.data and len(response.data) > 0:
                return response.data[0].get("promo_locked", False)

            return False

        except Exception as e:
            logger.error(f"Error checking promo lock for {user_id}: {str(e)}")
            return False


# Convenience instance
app_users_repo = AppUsersRepository()
