"""
Unit tests for JWT verification.

Tests the authentication layer that protects all API endpoints.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException


@pytest.mark.unit
@pytest.mark.auth
class TestJWTVerification:
    """Test JWT token verification."""

    @patch('services.supabase_client.SupabaseClientWrapper.get_client')
    async def test_valid_jwt_accepted(self, mock_get_client):
        """Test valid JWT returns user information."""
        from services.supabase_client import SupabaseClientWrapper
        
        # Mock Supabase client response
        mock_client = Mock()
        mock_response = Mock()
        mock_response.user = Mock(
            id="test-user-123",
            email="test@example.com",
            aud="authenticated",
            role="authenticated",
            user_metadata={"name": "Test User"},
            app_metadata={}
        )
        mock_client.auth.get_user.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        # Verify JWT
        result = await SupabaseClientWrapper.verify_jwt("valid.jwt.token")
        
        # Assertions
        assert result["id"] == "test-user-123"
        assert result["email"] == "test@example.com"
        assert result["role"] == "authenticated"
        assert result["aud"] == "authenticated"
        mock_client.auth.get_user.assert_called_once_with("valid.jwt.token")

    @patch('services.supabase_client.SupabaseClientWrapper.get_client')
    async def test_expired_jwt_rejected(self, mock_get_client):
        """Test expired JWT raises 401."""
        from services.supabase_client import SupabaseClientWrapper
        
        # Mock expired token response
        mock_client = Mock()
        mock_client.auth.get_user.side_effect = Exception("JWT expired")
        mock_get_client.return_value = mock_client
        
        # Should raise 401
        with pytest.raises(HTTPException) as exc_info:
            await SupabaseClientWrapper.verify_jwt("expired.jwt.token")
        
        assert exc_info.value.status_code == 401
        assert "Token verification failed" in exc_info.value.detail

    @patch('services.supabase_client.SupabaseClientWrapper.get_client')
    async def test_invalid_signature_rejected(self, mock_get_client):
        """Test invalid JWT signature raises 401."""
        from services.supabase_client import SupabaseClientWrapper
        
        # Mock invalid signature
        mock_client = Mock()
        mock_response = Mock()
        mock_response.user = None
        mock_client.auth.get_user.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        # Should raise 401
        with pytest.raises(HTTPException) as exc_info:
            await SupabaseClientWrapper.verify_jwt("invalid.jwt.token")
        
        assert exc_info.value.status_code == 401
        assert "Invalid authentication token" in exc_info.value.detail

    @patch('services.supabase_client.SupabaseClientWrapper.get_client')
    async def test_missing_session_rejected(self, mock_get_client):
        """Test JWT with missing session_id claim is rejected."""
        from services.supabase_client import SupabaseClientWrapper
        
        # Mock no user response
        mock_client = Mock()
        mock_client.auth.get_user.return_value = None
        mock_get_client.return_value = mock_client
        
        # Should raise 401
        with pytest.raises(HTTPException) as exc_info:
            await SupabaseClientWrapper.verify_jwt("jwt.without.session")
        
        assert exc_info.value.status_code == 401

    @patch('services.supabase_client.SupabaseClientWrapper.get_client')
    async def test_jwt_with_user_metadata(self, mock_get_client):
        """Test JWT properly extracts user metadata."""
        from services.supabase_client import SupabaseClientWrapper
        
        # Mock response with metadata
        mock_client = Mock()
        mock_response = Mock()
        mock_response.user = Mock(
            id="user-123",
            email="user@example.com",
            aud="authenticated",
            role="authenticated",
            user_metadata={"full_name": "John Doe", "avatar_url": "https://example.com/avatar.jpg"},
            app_metadata={"provider": "google"}
        )
        mock_client.auth.get_user.return_value = mock_response
        mock_get_client.return_value = mock_client
        
        # Verify JWT
        result = await SupabaseClientWrapper.verify_jwt("valid.jwt.token")
        
        # Check metadata extracted
        assert result["raw_user_meta_data"]["full_name"] == "John Doe"
        assert result["raw_user_meta_data"]["avatar_url"] == "https://example.com/avatar.jpg"
        assert result["app_metadata"]["provider"] == "google"
