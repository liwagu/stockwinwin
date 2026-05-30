"""
User management endpoints.

Provides endpoints for user profile and account management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from middleware.auth import get_current_user
from repositories.app_users import app_users_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/users", tags=["users"])


# Response models
class UserProfileResponse(BaseModel):
    """User profile with subscription information."""
    user_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    tier: str  # "free" or "professional"
    status: str  # "inactive", "active", "canceled", etc.
    stripe_customer_id: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    created_at: datetime
    updated_at: datetime


class UserSyncResponse(BaseModel):
    """Response for user sync operation."""
    message: str
    user_id: str
    created: bool


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Get current authenticated user's profile and subscription status.

    Returns:
        UserProfileResponse: User profile with subscription information

    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 404: If user profile not found
        HTTPException 500: If database error occurs
    """
    try:
        user_id = user["id"]
        user_email = user["email"]

        # Get or create user profile
        user_data = app_users_repo.get_user_by_id(user_id)

        if not user_data:
            # User signed in via OAuth but doesn't have app_users row yet
            # Create it now
            profile = {
                "full_name": user.get("raw_user_meta_data", {}).get("full_name"),
                "avatar_url": user.get("raw_user_meta_data", {}).get("avatar_url"),
            }
            user_data = app_users_repo.get_or_create_user(
                user_id=user_id,
                email=user_email,
                profile=profile
            )
            logger.info(f"Auto-created user profile for {user_id}")

        return UserProfileResponse(**user_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user profile for {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user profile"
        )


@router.post("/sync", response_model=UserSyncResponse)
async def sync_user_profile(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Sync user profile from auth to app_users table.

    This endpoint ensures the user has a row in app_users.
    Called automatically by frontend after OAuth sign-in.

    Returns:
        UserSyncResponse: Sync result with user_id and created flag

    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 500: If database error occurs
    """
    try:
        user_id = user["id"]
        user_email = user["email"]

        # Check if user exists
        existing_user = app_users_repo.get_user_by_id(user_id)

        if existing_user:
            logger.info(f"User {user_id} already synced")
            return UserSyncResponse(
                message="User already synced",
                user_id=user_id,
                created=False
            )

        # Create user profile
        profile = {
            "full_name": user.get("raw_user_meta_data", {}).get("full_name"),
            "avatar_url": user.get("raw_user_meta_data", {}).get("avatar_url"),
        }

        app_users_repo.get_or_create_user(
            user_id=user_id,
            email=user_email,
            profile=profile
        )

        logger.info(f"Synced user profile for {user_id}")

        return UserSyncResponse(
            message="User profile created successfully",
            user_id=user_id,
            created=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error syncing user profile for {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync user profile"
        )
