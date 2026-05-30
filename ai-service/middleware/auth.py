"""
Authentication middleware for FastAPI.

Verifies JWT tokens from Authorization header and attaches user info to request state.
"""

from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware
import logging

from services.supabase_client import SupabaseClientWrapper

logger = logging.getLogger(__name__)

# Security scheme for OpenAPI documentation
security = HTTPBearer()


# ============================================================================
# DEPRECATED: AuthMiddleware
#
# This middleware class was removed from main.py in commit 2d29842 due to
# FastAPI ExceptionGroup wrapping issues that caused 500 Internal Server Errors.
#
# Authentication is now handled via the get_current_user() dependency function.
# This code is kept temporarily as reference documentation.
#
# DO NOT RE-ENABLE THIS MIDDLEWARE WITHOUT REVIEWING THE ORIGINAL ISSUE.
# ============================================================================


class AuthMiddleware(BaseHTTPMiddleware):
    """
    DEPRECATED - DO NOT USE

    Middleware to verify JWT tokens and attach user info to request.
    This class is no longer registered in main.py.

    Public routes (health checks, predictions, webhooks, docs) are exempt.
    """

    # Routes that don't require authentication
    PUBLIC_ROUTES = {
        "/",
        "/v1/health",
        "/v1/predictions",
        "/v1/assets",
        "/docs",
        "/openapi.json",
        "/redoc",
    }

    # Route prefixes that don't require authentication
    PUBLIC_PREFIXES = (
        "/v1/predictions/",  # Individual crypto predictions
    )

    # Specific webhook routes that use signature-based authentication
    WEBHOOK_ROUTES = {
        "/v1/webhooks/stripe",  # Stripe webhooks (verified via signature)
    }

    async def dispatch(self, request: Request, call_next):
        """
        Process request and verify authentication if required.

        Args:
            request: FastAPI request object
            call_next: Next middleware/route handler

        Returns:
            Response from next handler
        """
        # Check if route is public
        if self._is_public_route(request.url.path):
            return await call_next(request)

        # Extract and verify JWT token
        try:
            logger.info(f"[MIDDLEWARE] Processing request to {request.url.path}")
            token = self._extract_token(request)
            logger.info(f"[MIDDLEWARE] Token extracted: {bool(token)}")

            if token:
                user_info = await SupabaseClientWrapper.verify_jwt(token)
                # Attach user info to request state for use in route handlers
                request.state.user = user_info
                logger.info(f"[MIDDLEWARE] User authenticated: {user_info.get('email')}")
            else:
                logger.warning("[MIDDLEWARE] No token found in request")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        except HTTPException as e:
            # Re-raise HTTP exceptions (invalid token, etc.)
            raise e
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)

    def _is_public_route(self, path: str) -> bool:
        """
        Check if route is public (doesn't require authentication).

        Args:
            path: Request path

        Returns:
            bool: True if route is public
        """
        # Exact match for general public routes
        if path in self.PUBLIC_ROUTES:
            return True

        # Exact match for webhook routes (they use signature-based auth)
        if path in self.WEBHOOK_ROUTES:
            return True

        # Prefix match for other public routes
        if path.startswith(self.PUBLIC_PREFIXES):
            return True

        return False

    def _extract_token(self, request: Request) -> Optional[str]:
        """
        Extract JWT token from Authorization header.

        Args:
            request: FastAPI request object

        Returns:
            str: JWT token without 'Bearer ' prefix, or None if not present
        """
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        if not auth_header.startswith("Bearer "):
            return None

        return auth_header.replace("Bearer ", "").strip()


async def get_current_user(request: Request) -> dict:
    """
    Dependency to get current authenticated user.

    Extracts JWT from Authorization header and validates with Supabase.
    This replaces the previous middleware-based approach.

    Usage in route handlers:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user["id"], "email": user["email"]}

    Args:
        request: FastAPI request object

    Returns:
        dict: User information from validated JWT containing:
            - id: User UUID
            - email: User email
            - aud: Audience claim
            - role: User role
            - raw_user_meta_data: OAuth profile data

    Raises:
        HTTPException 401: If token is missing, invalid, or expired
    """
    # Extract Authorization header
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        logger.warning("[AUTH] Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate Bearer token format
    if not auth_header.startswith("Bearer "):
        logger.warning(f"[AUTH] Invalid auth scheme: {auth_header[:20]}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token
    token = auth_header.replace("Bearer ", "").strip()

    if not token:
        logger.warning("[AUTH] Empty token after Bearer prefix")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate JWT with Supabase
    try:
        logger.info(f"[AUTH] Validating JWT token (length: {len(token)})")
        user_info = await SupabaseClientWrapper.verify_jwt(token)
        logger.info(f"[AUTH] User authenticated: {user_info.get('email')}")
        return user_info

    except HTTPException:
        # Re-raise HTTP exceptions from verify_jwt (already formatted)
        raise

    except Exception as e:
        logger.error(f"[AUTH] Unexpected error during token validation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_active_subscription(request: Request) -> dict:
    """
    Dependency to require an active professional subscription.

    This is a stricter version of get_current_user that also checks
    subscription status. Use this for premium features.

    Usage in route handlers:
        @app.get("/premium-feature")
        async def premium_route(user: dict = Depends(require_active_subscription)):
            return {"data": "premium content"}

    Args:
        request: FastAPI request object

    Returns:
        dict: User information from JWT

    Raises:
        HTTPException: If user doesn't have active subscription
    """
    from repositories.app_users import app_users_repo

    user = await get_current_user(request)

    try:
        status_info = app_users_repo.get_subscription_status(user["id"])

        if status_info["status"] != "active" or status_info["tier"] != "professional":
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Active professional subscription required",
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking subscription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify subscription status",
        )
