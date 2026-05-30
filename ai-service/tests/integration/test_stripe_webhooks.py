"""
Integration tests for Stripe webhook handling.

Tests the critical path of subscription lifecycle:
- Signature verification
- Subscription created
- Subscription updated  
- Subscription deleted
- Payment succeeded/failed
- Idempotency
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient


@pytest.mark.integration
@pytest.mark.stripe
class TestStripeWebhooks:
    """Test Stripe webhook endpoints and handlers."""

    def test_webhook_missing_signature(self, test_app):
        """Test webhook rejects requests without signature."""
        response = test_app.post(
            "/v1/webhooks/stripe",
            json={"type": "customer.subscription.created"}
        )
        
        assert response.status_code == 400
        assert "Missing Stripe-Signature" in response.json()["detail"]

    def test_webhook_invalid_signature(self, test_app, stripe_subscription_payload):
        """Test webhook rejects invalid signatures."""
        with patch('services.stripe_service.stripe_service.verify_webhook_signature') as mock_verify:
            mock_verify.side_effect = Exception("Invalid signature")
            
            response = test_app.post(
                "/v1/webhooks/stripe",
                json=stripe_subscription_payload,
                headers={"Stripe-Signature": "invalid_signature"}
            )
            
            assert response.status_code == 400

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_checkout_completed_sync_payment_activates_immediately(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app
    ):
        """Test checkout with sync payment (credit card) activates immediately."""
        payload = {
            "id": "evt_test123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "payment_status": "paid",  # Sync payment (credit card)
                    "metadata": {"user_id": "test-user-id"}
                }
            }
        }

        mock_verify.return_value = payload
        mock_retrieve.return_value = {
            "id": "sub_test123",
            "status": "active",
            "cancel_at_period_end": False,
            "items": {
                "data": [{
                    "current_period_start": 1700000000,
                    "current_period_end": 1735689600
                }]
            }
        }

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200

        # Verify subscription activated immediately
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][0] == "test-user-id"
        assert call_args[0][1]["tier"] == "professional"
        assert call_args[0][1]["status"] == "active"

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_checkout_completed_async_payment_waits_for_payment(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app
    ):
        """Test checkout with async payment (ACH) waits for payment to clear."""
        payload = {
            "id": "evt_test123",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "payment_status": "unpaid",  # Async payment (ACH, SEPA)
                    "metadata": {"user_id": "test-user-id"}
                }
            }
        }

        mock_verify.return_value = payload
        mock_retrieve.return_value = {
            "id": "sub_test123",
            "status": "active",
            "cancel_at_period_end": False,
            "items": {
                "data": [{
                    "current_period_start": 1700000000,
                    "current_period_end": 1735689600
                }]
            }
        }

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200

        # Verify user stays on free tier with pending status
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][0] == "test-user-id"
        assert call_args[0][1]["tier"] == "free"  # NOT activated yet
        assert call_args[0][1]["status"] == "pending_payment"  # Waiting

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_subscription_created_success(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app,
        stripe_subscription_payload
    ):
        """Test successful subscription creation."""
        # Setup mocks
        mock_verify.return_value = stripe_subscription_payload
        mock_retrieve.return_value = {
            "id": "sub_test123",
            "status": "active",
            "cancel_at_period_end": False,
            "items": {
                "data": [{
                    "current_period_start": 1700000000,
                    "current_period_end": 1735689600
                }]
            }
        }
        mock_repo.get_user_by_stripe_customer_id.return_value = {
            "user_id": "test-user-id"
        }

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=stripe_subscription_payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["received"] is True
        assert data["event_type"] == "customer.subscription.created"

        # Verify database update was called
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][0] == "test-user-id"
        assert call_args[0][1]["tier"] == "professional"
        assert call_args[0][1]["status"] == "active"

    @patch('routers.webhooks.app_users_repo')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_subscription_deleted_downgrades_user(
        self,
        mock_verify,
        mock_repo,
        test_app
    ):
        """Test subscription deletion downgrades user to free tier."""
        # Create deletion payload
        payload = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "canceled"
                }
            }
        }
        
        mock_verify.return_value = payload
        mock_repo.get_user_by_stripe_customer_id.return_value = {
            "user_id": "test-user-id"
        }
        
        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )
        
        # Verify response
        assert response.status_code == 200
        
        # Verify user downgraded to free
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][1]["tier"] == "free"
        assert call_args[0][1]["status"] == "inactive"

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_payment_succeeded_updates_status(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app
    ):
        """Test successful payment updates subscription status."""
        payload = {
            "type": "invoice.payment_succeeded",
            "data": {
                "object": {
                    "subscription": "sub_test123",
                    "customer": "cus_test123"
                }
            }
        }
        
        mock_verify.return_value = payload
        mock_retrieve.return_value = {
            "status": "active",
            "items": {
                "data": [{
                    "current_period_start": 1700000000,
                    "current_period_end": 1735689600
                }]
            }
        }
        mock_repo.get_user_by_stripe_customer_id.return_value = {
            "user_id": "test-user-id"
        }
        
        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )
        
        # Verify
        assert response.status_code == 200
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][1]["status"] == "active"

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_payment_failed_updates_status(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app
    ):
        """Test failed payment updates subscription status."""
        payload = {
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "subscription": "sub_test123",
                    "customer": "cus_test123"
                }
            }
        }
        
        mock_verify.return_value = payload
        mock_retrieve.return_value = Mock(status="past_due")
        mock_repo.get_user_by_stripe_customer_id.return_value = {
            "user_id": "test-user-id"
        }
        
        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )
        
        # Verify
        assert response.status_code == 200
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][1]["status"] == "past_due"

    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_unhandled_event_type_acknowledged(
        self,
        mock_verify,
        test_app
    ):
        """Test unhandled event types are acknowledged without error."""
        payload = {
            "type": "some.unhandled.event",
            "data": {"object": {}}
        }

        mock_verify.return_value = payload

        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        assert response.status_code == 200
        assert response.json()["event_type"] == "some.unhandled.event"

    @patch('routers.webhooks.app_users_repo')
    @patch('routers.webhooks.stripe.Subscription.retrieve')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_async_payment_succeeded_activates_subscription(
        self,
        mock_verify,
        mock_retrieve,
        mock_repo,
        test_app
    ):
        """Test async payment success activates subscription."""
        payload = {
            "type": "checkout.session.async_payment_succeeded",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "subscription": "sub_test123",
                    "metadata": {"user_id": "test-user-id"}
                }
            }
        }

        mock_verify.return_value = payload
        mock_retrieve.return_value = {
            "id": "sub_test123",
            "status": "active",
            "cancel_at_period_end": False,
            "items": {
                "data": [{
                    "current_period_start": 1700000000,
                    "current_period_end": 1735689600
                }]
            }
        }

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200
        assert response.json()["event_type"] == "checkout.session.async_payment_succeeded"

        # Verify subscription activated
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][0] == "test-user-id"
        assert call_args[0][1]["tier"] == "professional"
        assert call_args[0][1]["status"] == "active"

    @patch('routers.webhooks.app_users_repo')
    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_async_payment_failed_keeps_user_free(
        self,
        mock_verify,
        mock_repo,
        test_app
    ):
        """Test async payment failure keeps user on free tier."""
        payload = {
            "type": "checkout.session.async_payment_failed",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "customer": "cus_test123",
                    "metadata": {"user_id": "test-user-id"}
                }
            }
        }

        mock_verify.return_value = payload

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200

        # Verify user stays on free tier
        mock_repo.update_subscription_fields.assert_called_once()
        call_args = mock_repo.update_subscription_fields.call_args
        assert call_args[0][1]["tier"] == "free"
        assert call_args[0][1]["status"] == "payment_failed"
        assert call_args[0][1]["stripe_subscription_id"] is None

    @patch('services.stripe_service.stripe_service.verify_webhook_signature')
    def test_checkout_expired_logged(
        self,
        mock_verify,
        test_app
    ):
        """Test checkout expiration is logged without errors."""
        payload = {
            "type": "checkout.session.expired",
            "data": {
                "object": {
                    "id": "cs_test123",
                    "metadata": {"user_id": "test-user-id"},
                    "created": 1700000000
                }
            }
        }

        mock_verify.return_value = payload

        # Send webhook
        response = test_app.post(
            "/v1/webhooks/stripe",
            json=payload,
            headers={"Stripe-Signature": "valid_signature"}
        )

        # Verify response
        assert response.status_code == 200
        assert response.json()["event_type"] == "checkout.session.expired"
