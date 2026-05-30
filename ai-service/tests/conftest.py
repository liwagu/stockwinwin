"""
Pytest configuration and shared fixtures for StockWin AI Service tests.
"""

import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Set test environment variables
os.environ["TESTING"] = "true"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "test_service_key"
os.environ["STRIPE_SECRET_KEY"] = "stripe_test_secret"
os.environ["STRIPE_WEBHOOK_SECRET"] = "stripe_webhook_test"
os.environ["STRIPE_PRICE_ID"] = "price_test"


@pytest.fixture(scope="session")
def test_app():
    """FastAPI test client for the entire test session."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing."""
    mock_client = Mock()
    mock_client.auth.get_user.return_value = Mock(
        user=Mock(
            id="test-user-id",
            email="test@example.com",
            aud="authenticated",
            role="authenticated"
        )
    )
    return mock_client


@pytest.fixture
def valid_jwt_token():
    """Valid JWT token for testing."""
    return "test.jwt.token"


@pytest.fixture
def test_user_data():
    """Test user data."""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "tier": "free",
        "status": "active"
    }


@pytest.fixture
def test_pro_user_data():
    """Test professional user data."""
    return {
        "id": "test-pro-user-id",
        "email": "pro@example.com",
        "tier": "professional",
        "status": "active"
    }


@pytest.fixture
def stripe_webhook_headers():
    """Stripe webhook headers."""
    return {
        "stripe-signature": "t=1234567890,v1=test_signature,v0=test_signature_v0"
    }


@pytest.fixture
def stripe_subscription_payload():
    """Sample Stripe subscription webhook payload."""
    return {
        "id": "evt_test_webhook",
        "object": "event",
        "api_version": "2023-10-16",
        "created": 1234567890,
        "type": "customer.subscription.created",
        "data": {
            "object": {
                "id": "sub_test123",
                "object": "subscription",
                "customer": "cus_test123",
                "status": "active",
                "items": {
                    "data": [{
                        "price": {
                            "id": "price_test"
                        }
                    }]
                },
                "current_period_end": 1735689600
            }
        }
    }
