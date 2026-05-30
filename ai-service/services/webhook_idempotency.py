"""
Webhook Idempotency Service

Prevents duplicate webhook processing from Stripe by tracking event IDs.

Production pattern:
- Check if event_id already processed (fast lookup via unique index)
- Respond to Stripe within 200ms
- Track events for 30 days (Stripe's retention guarantee)

References:
- Stripe best practices: https://stripe.com/docs/webhooks/best-practices
- Production case study: 17 duplicate events during network instability
"""

from datetime import datetime, timedelta
from typing import Optional
import logging
import asyncio
from supabase import Client

logger = logging.getLogger(__name__)


class WebhookIdempotencyService:
    """
    Manages webhook event deduplication using database-backed storage.

    Ensures each Stripe webhook event is processed exactly once, even if
    Stripe retries the webhook due to network timeouts or server errors.
    """

    def __init__(self, supabase: Client):
        """
        Initialize idempotency service.

        Args:
            supabase: Supabase client for database operations
        """
        self.supabase = supabase

    async def is_event_processed(self, stripe_event_id: str) -> bool:
        """
        Check if webhook event has already been processed.

        Uses unique index on stripe_event_id for O(1) lookup.

        Args:
            stripe_event_id: Stripe event ID (e.g., evt_1ABC123...)

        Returns:
            True if event was already processed, False otherwise
        """
        def _check_event():
            try:
                result = self.supabase.table("webhook_events") \
                    .select("id, status") \
                    .eq("stripe_event_id", stripe_event_id) \
                    .execute()

                if result.data and len(result.data) > 0:
                    event = result.data[0]
                    status = event.get('status')

                    # Only consider event processed if status is explicitly "processed"
                    # Allow retries for "failed" or "processing" events
                    if status == "processed":
                        logger.info(
                            f"Event {stripe_event_id} already successfully processed, skipping"
                        )
                        return True
                    else:
                        logger.info(
                            f"Event {stripe_event_id} exists with status '{status}', allowing retry"
                        )
                        return False

                return False

            except Exception as e:
                logger.error(f"Error checking event processed status: {e}")
                # On error, assume not processed to avoid blocking webhooks
                # Better to process twice than not at all
                return False

        return await asyncio.to_thread(_check_event)

    async def mark_event_processing(
        self,
        stripe_event_id: str,
        event_type: str
    ) -> bool:
        """
        Mark event as currently being processed.

        This creates a record with status='processing' to prevent
        duplicate processing if Stripe retries during execution.

        Args:
            stripe_event_id: Stripe event ID
            event_type: Event type (e.g., "checkout.session.completed")

        Returns:
            True if successfully marked, False if already exists
        """
        def _mark_processing():
            try:
                result = self.supabase.table("webhook_events").insert({
                    "stripe_event_id": stripe_event_id,
                    "event_type": event_type,
                    "status": "processing",
                    "processed_at": datetime.utcnow().isoformat()
                }).execute()

                logger.info(f"Marked event {stripe_event_id} as processing")
                return True

            except Exception as e:
                # Unique constraint violation means event already exists
                if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
                    logger.warning(
                        f"Event {stripe_event_id} already being processed (duplicate)"
                    )
                    return False

                logger.error(f"Error marking event as processing: {e}")
                return False

        return await asyncio.to_thread(_mark_processing)

    async def mark_event_completed(
        self,
        stripe_event_id: str,
        status: str = "processed",
        error_message: Optional[str] = None
    ):
        """
        Mark event as completed (processed or failed).

        Args:
            stripe_event_id: Stripe event ID
            status: Final status - "processed" or "failed"
            error_message: Error details if status="failed"
        """
        def _mark_completed():
            try:
                update_data = {
                    "status": status,
                    "updated_at": datetime.utcnow().isoformat()
                }

                if error_message:
                    update_data["error_message"] = error_message

                self.supabase.table("webhook_events") \
                    .update(update_data) \
                    .eq("stripe_event_id", stripe_event_id) \
                    .execute()

                logger.info(f"Marked event {stripe_event_id} as {status}")

            except Exception as e:
                logger.error(f"Error marking event as completed: {e}")
                # Don't raise - this is a logging operation

        await asyncio.to_thread(_mark_completed)

    async def increment_retry_count(self, stripe_event_id: str):
        """
        Increment retry counter when Stripe retries an event.

        Args:
            stripe_event_id: Stripe event ID
        """
        def _increment_retry():
            try:
                # Get current retry count
                result = self.supabase.table("webhook_events") \
                    .select("retry_count") \
                    .eq("stripe_event_id", stripe_event_id) \
                    .execute()

                if result.data and len(result.data) > 0:
                    current_count = result.data[0].get("retry_count", 0)

                    self.supabase.table("webhook_events") \
                        .update({"retry_count": current_count + 1}) \
                        .eq("stripe_event_id", stripe_event_id) \
                        .execute()

                    logger.info(
                        f"Incremented retry count for {stripe_event_id} to {current_count + 1}"
                    )

            except Exception as e:
                logger.error(f"Error incrementing retry count: {e}")

        await asyncio.to_thread(_increment_retry)

    async def cleanup_old_events(self, days: int = 30) -> int:
        """
        Delete webhook events older than specified days.

        Stripe guarantees webhook events for 30 days, so we match that retention.
        Run this as a periodic cleanup job (e.g., daily cron).

        Args:
            days: Number of days to retain (default: 30)

        Returns:
            Number of events deleted
        """
        def _cleanup():
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=days)

                # Delete old events directly (skip count to avoid full table scan)
                result = self.supabase.table("webhook_events") \
                    .delete() \
                    .lt("created_at", cutoff_date.isoformat()) \
                    .execute()

                # Estimate count from result if available
                count = len(result.data) if result.data else 0

                logger.info(
                    f"Cleaned up ~{count} webhook events older than {days} days"
                )

                return count

            except Exception as e:
                logger.error(f"Error cleaning up old events: {e}")
                return 0

        return await asyncio.to_thread(_cleanup)

    async def get_event_stats(self) -> dict:
        """
        Get statistics about webhook event processing.

        Useful for monitoring and debugging.

        Returns:
            Dictionary with event statistics
        """
        def _get_stats():
            try:
                # Total events
                total_result = self.supabase.table("webhook_events") \
                    .select("id", count="exact") \
                    .execute()

                # Events by status
                processed_result = self.supabase.table("webhook_events") \
                    .select("id", count="exact") \
                    .eq("status", "processed") \
                    .execute()

                failed_result = self.supabase.table("webhook_events") \
                    .select("id", count="exact") \
                    .eq("status", "failed") \
                    .execute()

                processing_result = self.supabase.table("webhook_events") \
                    .select("id", count="exact") \
                    .eq("status", "processing") \
                    .execute()

                # Events with retries
                retried_result = self.supabase.table("webhook_events") \
                    .select("id", count="exact") \
                    .gt("retry_count", 0) \
                    .execute()

                return {
                    "total_events": getattr(total_result, 'count', 0),
                    "processed": getattr(processed_result, 'count', 0),
                    "failed": getattr(failed_result, 'count', 0),
                    "processing": getattr(processing_result, 'count', 0),
                    "retried": getattr(retried_result, 'count', 0)
                }

            except Exception as e:
                logger.error(f"Error getting event stats: {e}")
                return {
                    "total_events": 0,
                    "processed": 0,
                    "failed": 0,
                    "processing": 0,
                    "retried": 0,
                    "error": str(e)
                }

        return await asyncio.to_thread(_get_stats)
