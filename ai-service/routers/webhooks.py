"""
Stripe webhook handlers.

Processes Stripe events for subscription lifecycle management.
"""

from fastapi import APIRouter, Request, HTTPException, status, Header
from pydantic import BaseModel
from datetime import datetime
import stripe
from stripe import SignatureVerificationError
import logging
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address

from repositories.app_users import app_users_repo
from services.stripe_service import stripe_service
from services.webhook_idempotency import WebhookIdempotencyService
from config import Config

logger = logging.getLogger(__name__)

# Stripe API timeout (must respond to webhook within 5s)
STRIPE_API_TIMEOUT = 3.0  # 3 seconds to leave room for processing

# Initialize idempotency service
# Uses Supabase client from config for database operations
from supabase import create_client
supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_KEY)
idempotency_service = WebhookIdempotencyService(supabase)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])


async def retrieve_subscription_safely(subscription_id: str) -> dict:
    """
    Retrieve Stripe subscription with timeout and error handling.

    Args:
        subscription_id: Stripe subscription ID

    Returns:
        Subscription object as dict

    Raises:
        Exception: If subscription retrieval fails
    """
    try:
        # Run Stripe API call in thread pool with timeout
        subscription = await asyncio.wait_for(
            asyncio.to_thread(stripe.Subscription.retrieve, subscription_id),
            timeout=STRIPE_API_TIMEOUT
        )
        return dict(subscription)
    except asyncio.TimeoutError:
        logger.error(f"Timeout retrieving subscription {subscription_id}")
        raise Exception(f"Stripe API timeout for subscription {subscription_id}")
    except stripe.StripeError as e:
        logger.error(f"Stripe API error retrieving subscription {subscription_id}: {e}")
        raise Exception(f"Failed to retrieve subscription: {str(e)}")


def extract_period_dates(subscription: dict) -> dict:
    """
    Safely extract period dates from subscription items.

    Handles Stripe API v2025+ structure where dates are in items.data[0].

    Args:
        subscription: Subscription object as dict

    Returns:
        Dict with current_period_start and current_period_end (ISO format)
        Returns empty dict if dates not found
    """
    period_data = {}

    try:
        # Check if items exist and have data
        if "items" not in subscription:
            logger.warning("Subscription missing 'items' field")
            return period_data

        items_data = subscription["items"].get("data", [])
        if not items_data or len(items_data) == 0:
            logger.warning("Subscription items.data is empty")
            return period_data

        item = items_data[0]

        # Extract start date
        if "current_period_start" in item and item["current_period_start"]:
            period_data["current_period_start"] = datetime.fromtimestamp(
                item["current_period_start"]
            ).isoformat()

        # Extract end date
        if "current_period_end" in item and item["current_period_end"]:
            period_data["current_period_end"] = datetime.fromtimestamp(
                item["current_period_end"]
            ).isoformat()

    except (KeyError, IndexError, TypeError) as e:
        logger.warning(f"Error extracting period dates: {e}")

    return period_data


class WebhookResponse(BaseModel):
    """Response for webhook processing."""
    received: bool
    event_type: str
    message: str


@router.post("/stripe", response_model=WebhookResponse)
@limiter.limit("10/minute")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """
    Handle Stripe webhook events with idempotency protection.

    Processes subscription lifecycle events:
    - checkout.session.completed: Payment successful (sync payment methods)
    - checkout.session.async_payment_succeeded: Async payment cleared
    - checkout.session.async_payment_failed: Async payment failed
    - checkout.session.expired: Session expired without completion
    - customer.subscription.created: New subscription
    - customer.subscription.updated: Subscription changed
    - customer.subscription.deleted: Subscription canceled
    - invoice.payment_succeeded: Payment successful
    - invoice.payment_failed: Payment failed

    Security:
    - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
    - Rejects unsigned or invalid requests

    Idempotency:
    - Checks event_id before processing (prevents duplicates)
    - Responds within 200ms (Stripe requires <5s)
    - Tracks events for 30 days (Stripe's retention guarantee)

    Returns:
        WebhookResponse: Acknowledgment of event receipt

    Raises:
        HTTPException 400: If signature verification fails
        HTTPException 500: If event processing fails
    """
    if not stripe_signature:
        logger.error("Webhook received without signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header"
        )

    # Get raw request body
    payload = await request.body()
    event_id = None

    try:
        # Step 1: Verify webhook signature (security)
        event = stripe_service.verify_webhook_signature(payload, stripe_signature)
        event_id = event["id"]
        event_type = event["type"]
        event_data = event["data"]["object"]

        logger.info(f"Received webhook: {event_type} (event_id: {event_id})")

        # Step 2: Idempotency check (CRITICAL for production)
        if await idempotency_service.is_event_processed(event_id):
            logger.info(f"Duplicate event {event_id} ({event_type}) - already processed")
            return WebhookResponse(
                received=True,
                event_type=event_type,
                message="Duplicate event - already processed"
            )

        # Step 3: Mark as processing BEFORE actual work (fast response to Stripe)
        processing_started = await idempotency_service.mark_event_processing(
            event_id, event_type
        )

        if not processing_started:
            # Another request is already processing this event
            logger.warning(f"Event {event_id} already being processed concurrently")
            return WebhookResponse(
                received=True,
                event_type=event_type,
                message="Event already being processed"
            )

        # Route to appropriate handler using registry
        handler = WEBHOOK_HANDLERS.get(event_type)
        if handler:
            await handler(event_data)
        else:
            logger.info(f"Unhandled event type: {event_type}")

        # Step 4: Mark as successfully processed
        if event_id:
            await idempotency_service.mark_event_completed(event_id, "processed")

        return WebhookResponse(
            received=True,
            event_type=event_type,
            message="Event processed successfully"
        )

    except SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    except Exception as e:
        # Mark as failed for monitoring
        if event_id:
            await idempotency_service.mark_event_completed(
                event_id,
                "failed",
                str(e)
            )

        logger.error(f"Webhook processing error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )


async def handle_checkout_completed(session: dict):
    """
    Handle successful checkout completion.

    IMPORTANT: Behavior depends on payment method:
    - Sync payment (credit card): payment_status="paid" -> Activate immediately
    - Async payment (ACH, SEPA): payment_status="unpaid" -> Wait for async_payment_succeeded

    For async payments, checkout completion means user SUBMITTED the form,
    NOT that payment succeeded. Payment clears 2-7 days later.

    Updates user record with:
    - Stripe customer ID
    - Subscription ID
    - Tier = "professional" (if sync) or stays "free" (if async)
    - Status = "active" (if sync) or "pending_payment" (if async)
    """
    try:
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        payment_status = session.get("payment_status")  # "paid" or "unpaid"

        if not user_id:
            logger.error(f"Checkout session {session.get('id')} missing user_id metadata")
            return

        # Get subscription details from Stripe with timeout protection
        subscription = await retrieve_subscription_safely(subscription_id)

        # Check if payment is sync (immediate) or async (pending)
        is_sync_payment = payment_status == "paid"

        # Build update data based on payment type
        update_data = {
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
        }

        if is_sync_payment:
            # Credit card payment - activate immediately
            update_data.update({
                "tier": "professional",
                "status": "active",
                "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
            })
            logger.info(
                f"Sync payment completed for user {user_id}. "
                f"Subscription {subscription_id} activated immediately."
            )
        else:
            # Async payment (ACH, SEPA, etc.) - wait for payment to clear
            update_data.update({
                "tier": "free",  # Keep on free until payment clears
                "status": "pending_payment",  # Mark as pending
                "cancel_at_period_end": False,
            })
            logger.info(
                f"Async payment pending for user {user_id}. "
                f"Subscription {subscription_id} will activate when payment clears. "
                f"Waiting for async_payment_succeeded event."
            )

        # Extract period dates safely
        period_dates = extract_period_dates(subscription)
        update_data.update(period_dates)

        # Update database in thread pool (repository method is sync)
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(f"Checkout completed for user {user_id}, subscription {subscription_id}")

    except Exception as e:
        logger.error(f"Error handling checkout completion: {str(e)}")
        raise


async def handle_subscription_created(subscription: dict):
    """Handle new subscription creation."""
    try:
        customer_id = subscription.get("customer")
        subscription_id = subscription.get("id")

        # Find user by customer ID (run in thread pool)
        user_data = await asyncio.to_thread(
            app_users_repo.get_user_by_stripe_customer_id,
            customer_id
        )

        if not user_data:
            logger.warning(f"No user found for customer {customer_id}")
            return

        user_id = user_data["user_id"]

        # Build update data with required fields
        update_data = {
            "stripe_subscription_id": subscription_id,
            "tier": "professional",
            "status": subscription.get("status", "active"),
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        }

        # Extract period dates safely
        period_dates = extract_period_dates(subscription)
        update_data.update(period_dates)

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(f"Subscription created for user {user_id}: {subscription_id}")

    except Exception as e:
        logger.error(f"Error handling subscription creation: {str(e)}")
        raise


async def handle_subscription_updated(subscription: dict):
    """Handle subscription changes (renewal, cancellation scheduled, etc.)."""
    try:
        subscription_id = subscription["id"]
        customer_id = subscription["customer"]

        # Find user by customer ID (run in thread pool)
        user_data = await asyncio.to_thread(
            app_users_repo.get_user_by_stripe_customer_id,
            customer_id
        )

        if not user_data:
            logger.warning(f"No user found for customer {customer_id}")
            return

        user_id = user_data["user_id"]

        # Update subscription status and dates
        update_data = {
            "status": subscription["status"],
            "cancel_at_period_end": subscription["cancel_at_period_end"],
        }

        # Extract period dates safely
        period_dates = extract_period_dates(subscription)
        update_data.update(period_dates)

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(f"Subscription updated for user {user_id}: {subscription_id}, status={subscription['status']}")

    except Exception as e:
        logger.error(f"Error handling subscription update: {str(e)}")
        raise


async def handle_subscription_deleted(subscription: dict):
    """Handle subscription cancellation (end of billing period)."""
    try:
        subscription_id = subscription["id"]
        customer_id = subscription["customer"]

        # Find user by customer ID (run in thread pool)
        user_data = await asyncio.to_thread(
            app_users_repo.get_user_by_stripe_customer_id,
            customer_id
        )

        if not user_data:
            logger.warning(f"No user found for customer {customer_id}")
            return

        user_id = user_data["user_id"]

        # Update user to free tier
        update_data = {
            "tier": "free",
            "status": "inactive",
            "cancel_at_period_end": False,
        }

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(f"Subscription deleted for user {user_id}: {subscription_id}")

    except Exception as e:
        logger.error(f"Error handling subscription deletion: {str(e)}")
        raise


async def handle_payment_succeeded(invoice: dict):
    """Handle successful payment (renewal, etc.)."""
    try:
        subscription_id = invoice.get("subscription")

        if not subscription_id:
            logger.info("Invoice not associated with subscription")
            return

        customer_id = invoice["customer"]

        # Find user by customer ID (run in thread pool)
        user_data = await asyncio.to_thread(
            app_users_repo.get_user_by_stripe_customer_id,
            customer_id
        )

        if not user_data:
            logger.warning(f"No user found for customer {customer_id}")
            return

        user_id = user_data["user_id"]

        # Fetch latest subscription data with timeout protection
        subscription = await retrieve_subscription_safely(subscription_id)

        # Update subscription status (ensure active after successful payment)
        update_data = {
            "status": "active",
        }

        # Extract period dates safely
        period_dates = extract_period_dates(subscription)
        update_data.update(period_dates)

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(f"Payment succeeded for user {user_id}, subscription {subscription_id}")

    except Exception as e:
        logger.error(f"Error handling payment success: {str(e)}")
        raise


async def handle_payment_failed(invoice: dict):
    """Handle failed payment."""
    try:
        subscription_id = invoice.get("subscription")

        if not subscription_id:
            logger.info("Invoice not associated with subscription")
            return

        customer_id = invoice["customer"]

        # Find user by customer ID (run in thread pool)
        user_data = await asyncio.to_thread(
            app_users_repo.get_user_by_stripe_customer_id,
            customer_id
        )

        if not user_data:
            logger.warning(f"No user found for customer {customer_id}")
            return

        user_id = user_data["user_id"]

        # Fetch latest subscription data with timeout protection
        subscription = await retrieve_subscription_safely(subscription_id)

        # Update status to past_due or other status from Stripe
        update_data = {
            "status": subscription.get("status", "past_due"),  # "past_due", "unpaid", etc.
        }

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.warning(f"Payment failed for user {user_id}, subscription {subscription_id}")

    except Exception as e:
        logger.error(f"Error handling payment failure: {str(e)}")
        raise


async def handle_async_payment_succeeded(session: dict):
    """
    Handle successful async payment (ACH, SEPA, bank transfer).

    CRITICAL: For async payment methods, checkout.session.completed fires when
    the user submits the form, but payment hasn't cleared yet. THIS event fires
    when payment actually succeeds (2-7 days later).

    This is when we should activate the subscription.
    """
    try:
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if not user_id:
            logger.error(f"Async payment session {session.get('id')} missing user_id metadata")
            return

        # Get subscription details from Stripe with timeout protection
        subscription = await retrieve_subscription_safely(subscription_id)

        # Build update data - NOW activate the subscription
        update_data = {
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "tier": "professional",
            "status": "active",  # Payment confirmed, activate now
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        }

        # Extract period dates safely
        period_dates = extract_period_dates(subscription)
        update_data.update(period_dates)

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.info(
            f"Async payment succeeded for user {user_id}, subscription {subscription_id}. "
            f"Subscription now active."
        )

    except Exception as e:
        logger.error(f"Error handling async payment success: {str(e)}")
        raise


async def handle_async_payment_failed(session: dict):
    """
    Handle failed async payment (ACH, SEPA, bank transfer).

    Payment failed after user completed checkout. Common reasons:
    - Insufficient funds
    - Bank account closed
    - Payment method declined

    User should remain on free tier and not get subscription access.
    """
    try:
        user_id = session.get("metadata", {}).get("user_id")
        customer_id = session.get("customer")
        session_id = session.get("id")

        if not user_id:
            logger.error(f"Async payment failed session {session_id} missing user_id metadata")
            return

        # Update user status to reflect failed payment
        # Keep them on free tier, mark status as payment_failed
        update_data = {
            "stripe_customer_id": customer_id,
            "tier": "free",  # Keep on free tier
            "status": "payment_failed",  # Mark as failed
            "stripe_subscription_id": None,  # No subscription created
        }

        # Update database in thread pool
        await asyncio.to_thread(
            app_users_repo.update_subscription_fields,
            user_id,
            update_data
        )

        logger.warning(
            f"Async payment failed for user {user_id}, session {session_id}. "
            f"User remains on free tier. Customer: {customer_id}"
        )

        # TODO (Phase 2): Send email notification about payment failure
        # TODO (Phase 2): Provide link to retry payment or update payment method

    except Exception as e:
        logger.error(f"Error handling async payment failure: {str(e)}")
        raise


async def handle_checkout_expired(session: dict):
    """
    Handle expired checkout session.

    User started checkout but didn't complete within expiration window (24 hours).
    Useful for:
    - Conversion funnel tracking
    - Abandoned cart recovery emails
    - Analytics on checkout abandonment rate
    """
    try:
        user_id = session.get("metadata", {}).get("user_id")
        session_id = session.get("id")
        created_at = session.get("created")

        logger.info(
            f"Checkout expired for user {user_id}, session {session_id}. "
            f"Created at: {datetime.fromtimestamp(created_at) if created_at else 'unknown'}"
        )

        # TODO (Phase 2): Send abandoned cart email after 24 hours
        # TODO (Phase 3): Track in analytics for conversion optimization
        # Note: No database update needed - user should remain on current tier

    except Exception as e:
        logger.error(f"Error handling checkout expiration: {str(e)}")
        # Don't raise - this is primarily for logging/analytics


# Webhook handler registry - maps event types to handler functions
WEBHOOK_HANDLERS = {
    "checkout.session.completed": handle_checkout_completed,
    "checkout.session.async_payment_succeeded": handle_async_payment_succeeded,
    "checkout.session.async_payment_failed": handle_async_payment_failed,
    "checkout.session.expired": handle_checkout_expired,
    "customer.subscription.created": handle_subscription_created,
    "customer.subscription.updated": handle_subscription_updated,
    "customer.subscription.deleted": handle_subscription_deleted,
    "invoice.payment_succeeded": handle_payment_succeeded,
    "invoice.payment_failed": handle_payment_failed,
}
