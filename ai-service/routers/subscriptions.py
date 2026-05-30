"""
Subscription management endpoints.

Handles Stripe checkout sessions, customer portal access, and subscription status.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import stripe
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

from middleware.auth import get_current_user
from repositories.app_users import app_users_repo
from services.stripe_service import stripe_service

logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/v1/subscriptions", tags=["subscriptions"])


# Request/Response models
class CheckoutSessionResponse(BaseModel):
    """Response for checkout session creation."""
    session_id: str
    url: str
    message: str = "Redirect user to this URL to complete payment"


class PortalSessionResponse(BaseModel):
    """Response for customer portal session creation."""
    url: str
    message: str = "Redirect user to this URL to manage subscription"


class SubscriptionStatusResponse(BaseModel):
    """Current subscription status for a user."""
    user_id: str
    email: str
    tier: str  # "free" or "professional"
    status: str  # "inactive", "active", "canceled", "past_due", etc.
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    has_active_subscription: bool


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
@limiter.limit("5/minute")
async def create_checkout_session(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Checkout session for subscription purchase.

    Professional plan: $15/month
    - Payment method: Card
    - Promo codes: Allowed (configure in Stripe dashboard)

    Flow:
    1. Creates Stripe Customer (if doesn't exist)
    2. Creates Checkout Session
    3. Returns URL for redirect to Stripe Checkout

    After successful payment:
    - Stripe sends webhook to /v1/webhooks/stripe
    - Webhook updates user's subscription status in database

    Returns:
        CheckoutSessionResponse: Contains redirect URL for Stripe Checkout

    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 500: If Stripe API error occurs
    """
    try:
        user_id = user["id"]
        user_email = user["email"]

        # First check if user exists to avoid resetting subscription status
        user_data = app_users_repo.get_user_by_id(user_id)

        if user_data:
            # User exists - check if they already have active professional subscription
            # IMPORTANT: Do this check BEFORE any UPSERT operations that might reset status
            if (user_data.get("status") == "active" and
                user_data.get("tier") in ["professional", "pro"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User already has an active subscription. Use customer portal to manage."
                )
        else:
            # User doesn't exist - create new user profile with free tier
            user_data = app_users_repo.get_or_create_user(
                user_id=user_id,
                email=user_email,
                profile={
                    "full_name": user.get("raw_user_meta_data", {}).get("full_name"),
                    "avatar_url": user.get("raw_user_meta_data", {}).get("avatar_url"),
                }
            )

        # Create Stripe checkout session
        session_data = stripe_service.create_checkout_session(
            user_id=user_id,
            user_email=user_email,
            customer_id=user_data.get("stripe_customer_id")
        )

        # Update user with Stripe customer ID if new
        if not user_data.get("stripe_customer_id"):
            app_users_repo.update_subscription_fields(
                user_id=user_id,
                data={"stripe_customer_id": session_data["customer_id"]}
            )

        logger.info(f"Created checkout session for user {user_id}")

        return CheckoutSessionResponse(
            session_id=session_data["session_id"],
            url=session_data["url"]
        )

    except HTTPException:
        raise
    except stripe.StripeError as e:
        logger.error(f"Stripe error for user {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment processing failed. Please try again later."
        )
    except Exception as e:
        logger.error(f"Error creating checkout session for {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session. Please try again later."
        )


@router.post("/portal-session", response_model=PortalSessionResponse)
@limiter.limit("5/minute")
async def create_portal_session(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Customer Portal session for subscription management.

    Customer portal allows users to:
    - Update payment method
    - View invoices and payment history
    - Cancel subscription
    - Reactivate canceled subscription
    - Update billing information

    Returns:
        PortalSessionResponse: Contains redirect URL for Customer Portal

    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 404: If user has no Stripe customer ID
        HTTPException 500: If Stripe API error occurs
    """
    try:
        user_id = user["id"]

        # Get user data
        user_data = app_users_repo.get_user_by_id(user_id)

        if not user_data or not user_data.get("stripe_customer_id"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subscription found. Please subscribe first."
            )

        # Create portal session
        portal_data = stripe_service.create_customer_portal_session(
            customer_id=user_data["stripe_customer_id"]
        )

        logger.info(f"Created portal session for user {user_id}")

        return PortalSessionResponse(
            url=portal_data["url"]
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Stripe portal configuration error for user {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Portal access unavailable. Please contact support."
        )
    except stripe.StripeError as e:
        logger.error(f"Stripe portal error for user {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to access billing portal. Please try again later."
        )
    except Exception as e:
        logger.error(f"Error creating portal session for {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session. Please try again later."
        )


@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(
    request: Request,
    user: dict = Depends(get_current_user)
):
    """
    Get current subscription status for authenticated user.

    Returns detailed subscription information including:
    - Subscription tier (free/professional)
    - Status (inactive/active/canceled/past_due)
    - Billing period dates
    - Cancellation status

    Returns:
        SubscriptionStatusResponse: Current subscription details

    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 500: If database error occurs
    """
    try:
        user_id = user["id"]
        user_email = user["email"]

        # Get subscription status from database
        status_data = app_users_repo.get_subscription_status(user_id)

        # Determine if subscription is active
        has_active = status_data["status"] == "active" and status_data["tier"] == "professional"

        return SubscriptionStatusResponse(
            user_id=user_id,
            email=user_email,
            tier=status_data["tier"],
            status=status_data["status"],
            current_period_start=status_data.get("current_period_start"),
            current_period_end=status_data.get("current_period_end"),
            cancel_at_period_end=status_data.get("cancel_at_period_end", False),
            has_active_subscription=has_active
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching subscription status for {user['id']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription status"
        )
