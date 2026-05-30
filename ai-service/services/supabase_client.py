"""
Supabase client wrapper for StockWin.

Provides a singleton Supabase client instance and JWT verification utilities.
"""

from typing import Optional, Dict, Any
from supabase import create_client, Client
from fastapi import HTTPException, status
import jwt
import logging

from config import config

logger = logging.getLogger(__name__)


class SupabaseClientWrapper:
    """
    Singleton wrapper for Supabase client.

    Provides methods for JWT verification and user authentication.
    """

    _instance: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Get or create the Supabase client instance.

        Returns:
            Client: Supabase client instance.
        """
        if cls._instance is None:
            logger.info(f"[SUPABASE] Initializing client with URL: {config.SUPABASE_URL[:30] if config.SUPABASE_URL else 'EMPTY'}...")
            logger.info(f"[SUPABASE] Service key present: {bool(config.SUPABASE_SERVICE_KEY)}, length: {len(config.SUPABASE_SERVICE_KEY) if config.SUPABASE_SERVICE_KEY else 0}")

            if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_KEY:
                raise ValueError(
                    "Supabase configuration is incomplete. "
                    "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY."
                )

            cls._instance = create_client(
                config.SUPABASE_URL,
                config.SUPABASE_SERVICE_KEY
            )
            logger.info("Supabase client initialized successfully")

        return cls._instance

    @classmethod
    async def verify_jwt(cls, token: str) -> Dict[str, Any]:
        """
        Verify a Supabase JWT token and return the user information.

        This method uses Supabase's built-in get_user() which verifies the JWT
        signature against the project's JWK and checks expiration.

        Args:
            token: JWT token from Authorization header (without 'Bearer ' prefix).

        Returns:
            Dict containing user information including:
                - id: User UUID
                - email: User email
                - aud: Audience claim
                - role: User role
                - raw_user_meta_data: OAuth profile data

        Raises:
            HTTPException: If token is invalid, expired, or user not found.
        """
        client = cls.get_client()

        try:
            logger.info(f"[AUTH] Verifying JWT token (length: {len(token)})")
            logger.info(f"[AUTH] Token starts with: {token[:20]}...")

            # Supabase's get_user validates the JWT automatically
            response = client.auth.get_user(token)

            logger.info(f"[AUTH] JWT verification completed, response: {type(response)}")
            logger.info(f"[AUTH] Has user: {bool(response.user if response else False)}")

            if not response or not response.user:
                logger.warning("[AUTH] No user found in JWT response")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            user = response.user

            return {
                "id": user.id,
                "email": user.email,
                "aud": user.aud,
                "role": user.role if hasattr(user, "role") else "authenticated",
                "raw_user_meta_data": user.user_metadata or {},
                "app_metadata": user.app_metadata or {},
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"JWT verification failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token verification failed: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @classmethod
    def verify_service_role(cls) -> bool:
        """
        Check if the current client is using service role credentials.

        Returns:
            bool: True if service role is configured.
        """
        return bool(config.SUPABASE_SERVICE_KEY)


# Singleton instance getter
def get_supabase_client() -> Client:
    """Get the singleton Supabase client instance."""
    return SupabaseClientWrapper.get_client()
