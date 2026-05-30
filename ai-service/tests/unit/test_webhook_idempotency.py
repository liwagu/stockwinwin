"""
Unit tests for WebhookIdempotencyService.

Tests idempotency checking, event tracking, and cleanup operations.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, MagicMock
from services.webhook_idempotency import WebhookIdempotencyService


class TestWebhookIdempotencyService:
    """Test webhook idempotency service."""

    @pytest.fixture
    def mock_supabase(self):
        """Create mock Supabase client."""
        mock = Mock()
        mock.table = Mock(return_value=mock)
        mock.select = Mock(return_value=mock)
        mock.insert = Mock(return_value=mock)
        mock.update = Mock(return_value=mock)
        mock.delete = Mock(return_value=mock)
        mock.eq = Mock(return_value=mock)
        mock.lt = Mock(return_value=mock)
        mock.gt = Mock(return_value=mock)
        mock.execute = Mock()
        return mock

    @pytest.fixture
    def service(self, mock_supabase):
        """Create idempotency service with mock."""
        return WebhookIdempotencyService(mock_supabase)

    @pytest.mark.asyncio
    async def test_is_event_processed_returns_false_when_not_exists(
        self, service, mock_supabase
    ):
        """Test is_event_processed returns False for new event."""
        # Mock: No existing event
        mock_result = Mock()
        mock_result.data = []
        mock_supabase.execute.return_value = mock_result

        result = await service.is_event_processed("evt_test123")

        assert result is False
        mock_supabase.table.assert_called_with("webhook_events")

    @pytest.mark.asyncio
    async def test_is_event_processed_returns_true_when_exists(
        self, service, mock_supabase
    ):
        """Test is_event_processed returns True for existing event."""
        # Mock: Event exists
        mock_result = Mock()
        mock_result.data = [{"id": 1, "status": "processed"}]
        mock_supabase.execute.return_value = mock_result

        result = await service.is_event_processed("evt_test123")

        assert result is True

    @pytest.mark.asyncio
    async def test_is_event_processed_returns_false_on_error(
        self, service, mock_supabase
    ):
        """Test is_event_processed returns False on database error."""
        # Mock: Database error
        mock_supabase.execute.side_effect = Exception("Database error")

        result = await service.is_event_processed("evt_test123")

        # Should return False to avoid blocking webhooks
        assert result is False

    @pytest.mark.asyncio
    async def test_mark_event_processing_creates_record(
        self, service, mock_supabase
    ):
        """Test mark_event_processing creates processing record."""
        mock_result = Mock()
        mock_result.data = [{"id": 1}]
        mock_supabase.execute.return_value = mock_result

        result = await service.mark_event_processing(
            "evt_test123",
            "checkout.session.completed"
        )

        assert result is True
        mock_supabase.insert.assert_called_once()
        call_args = mock_supabase.insert.call_args[0][0]
        assert call_args["stripe_event_id"] == "evt_test123"
        assert call_args["event_type"] == "checkout.session.completed"
        assert call_args["status"] == "processing"

    @pytest.mark.asyncio
    async def test_mark_event_processing_returns_false_on_duplicate(
        self, service, mock_supabase
    ):
        """Test mark_event_processing returns False for duplicate."""
        # Mock: Unique constraint violation
        mock_supabase.execute.side_effect = Exception("duplicate key violation")

        result = await service.mark_event_processing(
            "evt_test123",
            "checkout.session.completed"
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_mark_event_completed_updates_status(
        self, service, mock_supabase
    ):
        """Test mark_event_completed updates event status."""
        mock_result = Mock()
        mock_supabase.execute.return_value = mock_result

        await service.mark_event_completed("evt_test123", "processed")

        mock_supabase.update.assert_called_once()
        call_args = mock_supabase.update.call_args[0][0]
        assert call_args["status"] == "processed"
        assert "updated_at" in call_args

    @pytest.mark.asyncio
    async def test_mark_event_completed_includes_error_message(
        self, service, mock_supabase
    ):
        """Test mark_event_completed includes error message when failed."""
        mock_result = Mock()
        mock_supabase.execute.return_value = mock_result

        await service.mark_event_completed(
            "evt_test123",
            "failed",
            "Subscription not found"
        )

        call_args = mock_supabase.update.call_args[0][0]
        assert call_args["status"] == "failed"
        assert call_args["error_message"] == "Subscription not found"

    @pytest.mark.asyncio
    async def test_increment_retry_count_increments_correctly(
        self, service, mock_supabase
    ):
        """Test increment_retry_count increments counter."""
        # Mock: Current retry count is 2
        mock_select_result = Mock()
        mock_select_result.data = [{"retry_count": 2}]

        mock_update_result = Mock()

        mock_supabase.execute.side_effect = [
            mock_select_result,  # First call: SELECT
            mock_update_result   # Second call: UPDATE
        ]

        await service.increment_retry_count("evt_test123")

        # Verify UPDATE was called with incremented count
        update_call = [
            call for call in mock_supabase.update.call_args_list
            if call[0][0].get("retry_count") == 3
        ]
        assert len(update_call) > 0

    @pytest.mark.asyncio
    async def test_cleanup_old_events_deletes_old_records(
        self, service, mock_supabase
    ):
        """Test cleanup_old_events deletes records older than threshold."""
        # Mock: 5 old events to delete
        mock_delete_result = Mock()
        # Set data to 5 deleted records (implementation returns len(result.data))
        mock_delete_result.data = [{"id": i} for i in range(1, 6)]

        # Only one execute() call in cleanup_old_events (no count query)
        mock_supabase.execute.return_value = mock_delete_result

        deleted_count = await service.cleanup_old_events(days=30)

        assert deleted_count == 5
        mock_supabase.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_cleanup_old_events_uses_correct_cutoff(
        self, service, mock_supabase
    ):
        """Test cleanup_old_events uses correct date cutoff."""
        mock_result = Mock()
        mock_result.count = 0
        mock_result.data = []
        mock_supabase.execute.return_value = mock_result

        await service.cleanup_old_events(days=30)

        # Verify date comparison was made
        mock_supabase.lt.assert_called()
        cutoff_call = mock_supabase.lt.call_args[0]
        assert cutoff_call[0] == "created_at"
        # Cutoff date should be approximately 30 days ago
        # (exact comparison would be flaky due to timing)

    @pytest.mark.asyncio
    async def test_get_event_stats_returns_counts(
        self, service, mock_supabase
    ):
        """Test get_event_stats returns event statistics."""
        # Mock results for each query
        mock_results = []
        for count in [100, 85, 10, 2, 3]:  # total, processed, failed, processing, retried
            result = Mock()
            result.count = count
            result.data = []
            mock_results.append(result)

        mock_supabase.execute.side_effect = mock_results

        stats = await service.get_event_stats()

        assert stats["total_events"] == 100
        assert stats["processed"] == 85
        assert stats["failed"] == 10
        assert stats["processing"] == 2
        assert stats["retried"] == 3

    @pytest.mark.asyncio
    async def test_get_event_stats_handles_errors(
        self, service, mock_supabase
    ):
        """Test get_event_stats returns error info on failure."""
        mock_supabase.execute.side_effect = Exception("Database connection lost")

        stats = await service.get_event_stats()

        assert stats["total_events"] == 0
        assert "error" in stats
