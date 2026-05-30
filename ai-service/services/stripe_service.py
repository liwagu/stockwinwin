"""
Stripe service for handling payments and subscriptions.

Manages checkout sessions, customer portal, and subscription operations.
"""

from typing import Dict, Any, Optional
import stripe
import logging

from config import config

logger = logging.getLogger(__name__)

# Initialize Stripe with secret key
stripe.api_key = config.STRIPE_SECRET_KEY


class StripeService:
    """Service for Stripe payment operations."""

    @staticmethod
    def create_checkout_session(
        user_id: str,
        user_email: str,
        customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription.

        Professional plan: $15/month.
        The amount is controlled by STRIPE_PRICE_ID in the runtime environment.

        Args:
            user_id: User UUID from auth.users
            user_email: User email for receipt
            customer_id: Existing Stripe customer ID (optional)

        Returns:
            Dict containing:
                - session_id: Checkout session ID
                - url: Redirect URL for Stripe Checkout
                - customer_id: Stripe customer ID

        Raises:
            stripe.StripeError: If session creation fails
        """
        try:
            # Success/cancel URLs - redirect back to dashboard
            success_url = f"{config.FRONTEND_URL}/dashboard?upgraded=success"
            cancel_url = f"{config.FRONTEND_URL}/dashboard?upgraded=canceled"

            # Create or reuse customer
            if not customer_id:
                customer = stripe.Customer.create(
                    email=user_email,
                    metadata={"user_id": user_id}
                )
                customer_id = customer.id
                logger.info(f"Created Stripe customer: {customer_id} for user {user_id}")

            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer_id,
                line_items=[{
                    "price": config.STRIPE_PRICE_ID,
                    "quantity": 1,
                }],
                mode="subscription",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": user_id,
                },
                subscription_data={
                    "metadata": {
                        "user_id": user_id,
                    }
                },
                allow_promotion_codes=True,  # Allow users to enter promo codes
            )

            logger.info(f"Created checkout session {session.id} for user {user_id}")

            return {
                "session_id": session.id,
                "url": session.url,
                "customer_id": customer_id,
            }

        except stripe.StripeError as e:
            logger.error(f"Stripe checkout error for user {user_id}: {str(e)}")
            raise

    @staticmethod
    def create_customer_portal_session(
        customer_id: str
    ) -> Dict[str, str]:
        """
        Create a Stripe Customer Portal session for subscription management.

        Allows users to:
        - Update payment method
        - View invoices
        - Cancel subscription
        - Update billing information

        Args:
            customer_id: Stripe customer ID

        Returns:
            Dict containing:
                - url: Redirect URL for Customer Portal

        Raises:
            stripe.StripeError: If portal session creation fails
        """
        if not config.STRIPE_PORTAL_CONFIGURATION_ID:
            message = (
                "Stripe billing portal configuration is missing. "
                "Set STRIPE_PORTAL_CONFIGURATION_ID using the ID from "
                "https://dashboard.stripe.com/test/settings/billing/portal."
            )
            logger.error(message)
            raise ValueError(message)

        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{config.FRONTEND_URL}/dashboard",
                configuration=config.STRIPE_PORTAL_CONFIGURATION_ID,
            )

            logger.info(f"Created portal session for customer {customer_id}")

            return {
                "url": session.url,
            }

        except stripe.StripeError as e:
            logger.error(f"Stripe portal error for customer {customer_id}: {str(e)}")
            raise

    @staticmethod
    def get_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve subscription details from Stripe.

        Args:
            subscription_id: Stripe subscription ID

        Returns:
            Dict containing subscription data, or None if not found

        Raises:
            stripe.StripeError: If retrieval fails
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            subscription_dict = dict(subscription)

            result = {
                "id": subscription.id,
                "status": subscription.status,
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "customer_id": subscription.customer,
            }

            # Extract period dates from subscription items (Stripe API v2025+)
            # current_period_start/end are in items.data[0], not on subscription itself
            if "items" in subscription_dict and subscription_dict["items"].get("data"):
                item = subscription_dict["items"]["data"][0]
                if item.get("current_period_start"):
                    result["current_period_start"] = item["current_period_start"]
                if item.get("current_period_end"):
                    result["current_period_end"] = item["current_period_end"]

            return result

        except stripe.error.InvalidRequestError:
            logger.warning(f"Subscription {subscription_id} not found")
            return None
        except stripe.StripeError as e:
            logger.error(f"Error retrieving subscription {subscription_id}: {str(e)}")
            raise

    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Verify and parse a Stripe webhook event.

        Args:
            payload: Raw request body as bytes
            signature: Stripe-Signature header value

        Returns:
            Dict containing the verified event data

        Raises:
            stripe.error.SignatureVerificationError: If signature is invalid
        """
        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                config.STRIPE_WEBHOOK_SECRET
            )
            return event

        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise


# Singleton instance
stripe_service = StripeService()
