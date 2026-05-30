"""
StockWin Prediction API - Crypto and stocks price forecasting using Kronos AI.

This FastAPI service provides 24-hour predictions for BTC, ETH, and XRP
using the Tsinghua University Kronos foundation model.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import config
from crypto_data import get_supported_assets as get_supported_crypto
from crypto_prediction_engine import (
    generate_all_predictions as generate_all_crypto_predictions,
    get_cached_prediction as get_cached_crypto_prediction,
    get_all_cached_predictions as get_all_cached_crypto_predictions,
    latest_predictions as latest_crypto_predictions
)
from stock_data import get_supported_assets as get_supported_stocks
from stock_prediction_engine import (
    generate_all_predictions as generate_all_stock_predictions,
    get_cached_prediction as get_cached_stock_prediction,
    get_all_cached_predictions as get_all_cached_stock_predictions,
    latest_predictions as latest_stock_predictions
)
from kronos_backend import predictor_backend
from repositories.lead_submissions import lead_submissions_repo
from models.prediction_models import (
    CryptoPrediction,
    PredictionForecast,
    InterestSubmission,
    InterestSubmissionResponse,
    CryptocurrencyAsset,
    HealthCheckResponse,
    HealthStatus,
    ErrorResponse
)

# Background scheduler for hourly prediction updates
scheduler = BackgroundScheduler(timezone='UTC')


def update_predictions_job():
    """
    Scheduled job to update predictions every hour.

    This function is called by the scheduler at the top of each hour (00 minutes).
    It regenerates predictions for all cryptocurrencies and stocks using fresh market data.
    """
    print("\n" + "=" * 60)
    print(f"⏰ Hourly prediction update triggered at {datetime.now(timezone.utc)}")
    print("=" * 60)

    # Generate crypto predictions
    try:
        crypto_forecast = generate_all_crypto_predictions()
        print(f"✅ Crypto predictions updated for {len(crypto_forecast.predictions)} assets")
        for pred in crypto_forecast.predictions:
            print(f"   {pred.symbol}: ${pred.current_price:.2f} (confidence: {pred.confidence_score:.2f})")
    except Exception as e:
        print(f"❌ Failed to update crypto predictions: {e}")
        import traceback
        traceback.print_exc()

    # Generate stock predictions
    try:
        stock_forecast = generate_all_stock_predictions()
        print(f"✅ Stock predictions updated for {len(stock_forecast.predictions)} assets")
        for pred in stock_forecast.predictions:
            print(f"   {pred.symbol}: ${pred.current_price:.2f} (confidence: {pred.confidence_score:.2f})")
    except Exception as e:
        print(f"❌ Failed to update stock predictions: {e}")
        import traceback
        traceback.print_exc()

    print("=" * 60 + "\n")


def generate_initial_predictions_background():
    """
    Background task to generate initial predictions after server starts.

    This runs AFTER the HTTP server is ready to accept health checks,
    preventing Railway/Kubernetes deployment timeouts.
    """
    print("\n🔮 Generating initial predictions for all supported assets...")

    # Generate crypto predictions
    try:
        crypto_forecast = generate_all_crypto_predictions()
        print(f"✅ Initial crypto predictions generated for {len(crypto_forecast.predictions)} assets")
        for pred in crypto_forecast.predictions:
            print(f"   {pred.symbol}: ${pred.current_price:.2f} (confidence: {pred.confidence_score:.2f})")
    except Exception as e:
        print(f"⚠️  Failed to generate initial crypto predictions: {e}")
        import traceback
        traceback.print_exc()

    # Generate stock predictions
    try:
        stock_forecast = generate_all_stock_predictions()
        print(f"✅ Initial stock predictions generated for {len(stock_forecast.predictions)} assets")
        for pred in stock_forecast.predictions:
            print(f"   {pred.symbol}: ${pred.current_price:.2f} (confidence: {pred.confidence_score:.2f})")
    except Exception as e:
        print(f"⚠️  Failed to generate initial stock predictions: {e}")
        print("   Stock predictions will be generated on first request or next hourly update.")
        import traceback
        traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown tasks.

    Startup: Load Kronos model and start scheduler (predictions generated in background)
    Shutdown: Cleanup resources
    """
    # Startup
    print("=" * 60)
    print("StockWin Prediction Service - Starting Up")
    print("=" * 60)

    # Check if Kronos model is loaded
    if not predictor_backend.is_loaded():
        print("❌ Kronos model not loaded. Service cannot start.")
        raise RuntimeError("Kronos model initialization failed")

    model_info = predictor_backend.get_model_info()
    print(f"✅ Kronos model loaded: {model_info['model_name']}")
    print(f"   Tokenizer: {model_info['tokenizer_name']}")
    print(f"   Cache dir: {model_info['cache_dir']}")

    # Start scheduler for hourly updates
    print("\n⏰ Starting hourly prediction scheduler...")
    scheduler.add_job(
        update_predictions_job,
        trigger=CronTrigger(minute=0, timezone='UTC'),  # Run every hour at minute 0
        id='hourly_predictions',
        name='Hourly Prediction Update',
        replace_existing=True
    )
    scheduler.start()
    print(f"✅ Scheduler started - predictions will update every hour at minute :00 UTC")

    # Schedule initial predictions to run in background (after 5 seconds)
    # This allows health checks to succeed while predictions are being generated
    scheduler.add_job(
        generate_initial_predictions_background,
        trigger='date',
        run_date=None,  # Run immediately in background thread
        id='initial_predictions',
        name='Initial Prediction Generation'
    )

    print("\n" + "=" * 60)
    print("🚀 StockWin Prediction Service - Ready")
    print("   Initial predictions will be generated in background...")
    print("=" * 60)

    yield

    # Shutdown
    print("\n" + "=" * 60)
    print("StockWin Prediction Service - Shutting Down")
    print("=" * 60)

    # Stop scheduler
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("⏰ Scheduler stopped")


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="StockWin Prediction API",
    version="1.0.0",
    description="AI-powered cryptocurrency prediction API using Kronos foundation model",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - Allow frontend from localhost and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Next.js dev server
        "http://localhost:3002",       # Alternative dev port
        "https://stockwin.win",        # Production domain
        "https://www.stockwin.win"     # Production www subdomain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Restrict to necessary methods
    allow_headers=["Authorization", "Content-Type", "Stripe-Signature"],  # Specific headers only
)

# Note: Authentication is now handled via dependencies in route handlers
# See middleware/auth.py for get_current_user dependency

# Import routers
from routers import users, subscriptions, webhooks

# Register routers
app.include_router(users.router)
app.include_router(subscriptions.router)
app.include_router(webhooks.router)


@app.get("/")
async def root():
    """Root endpoint - service information."""
    return {
        "service": "StockWin Prediction API",
        "status": "online",
        "version": "1.0.0",
        "model": "Tsinghua University Kronos Model",
        "endpoints": {
            "predictions": "/v1/predictions",
            "prediction_by_symbol": "/v1/predictions/{symbol}",
            "assets": "/v1/assets",
            "health": "/v1/health",
            "interest": "/v1/interest",
            "users": "/v1/users/me",
            "subscriptions": "/v1/subscriptions",
            "webhooks": "/v1/webhooks/stripe"
        }
    }


@app.get("/v1/predictions", response_model=PredictionForecast)
@limiter.limit("30/minute")
async def get_latest_predictions(request: Request):
    """
    Get latest 24-hour predictions for all assets (10 crypto + 10 stocks).

    Returns cached predictions if available, otherwise returns error.
    Predictions are automatically refreshed hourly by the scheduler.
    """
    # Get crypto predictions
    crypto_forecast = get_all_cached_crypto_predictions()

    # Get stock predictions
    stock_forecast = get_all_cached_stock_predictions()

    # Combine both
    all_predictions = []
    generated_at = datetime.now(timezone.utc)

    if crypto_forecast:
        all_predictions.extend(crypto_forecast.predictions)
        generated_at = crypto_forecast.generated_at

    if stock_forecast:
        all_predictions.extend(stock_forecast.predictions)
        # Use earliest generated_at
        if crypto_forecast:
            generated_at = min(generated_at, stock_forecast.generated_at)
        else:
            generated_at = stock_forecast.generated_at

    if not all_predictions:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "SERVICE_UNAVAILABLE",
                "message": "Predictions not yet available. Please try again in a few moments.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    return PredictionForecast(
        predictions=all_predictions,
        generated_at=generated_at
    )


@app.get("/v1/predictions/{symbol}", response_model=CryptoPrediction)
@limiter.limit("30/minute")
async def get_prediction_by_symbol(request: Request, symbol: str):
    """
    Get latest 24-hour prediction for a specific asset (crypto or stock).

    Args:
        symbol: Symbol (BTCUSDT, ETHUSDT, etc. for crypto | AAPL, GOOGL, etc. for stocks)

    Returns:
        CryptoPrediction with 24 hourly forecast points
    """
    symbol = symbol.upper()

    # Try crypto first
    prediction = get_cached_crypto_prediction(symbol)

    # If not crypto, try stock
    if prediction is None:
        prediction = get_cached_stock_prediction(symbol)

    if prediction is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "NOT_FOUND",
                "message": f"No prediction available for {symbol}. Check /v1/assets for supported symbols.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    return prediction


@app.post("/v1/interest", response_model=InterestSubmissionResponse, status_code=201)
@limiter.limit("10/minute")
async def submit_user_interest(request: Request, submission: InterestSubmission):
    """
    Submit user interest for custom predictions.

    Captures email and cryptocurrency preferences for future follow-up.
    """
    existing = lead_submissions_repo.get_recent_by_email(submission.email, hours=24)
    if existing:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "TOO_MANY_REQUESTS",
                "message": "You have already submitted your interest. Please try again after 24 hours.",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

    submission_id = str(uuid4())
    lead_submissions_repo.create({
        "id": submission_id,
        "email": submission.email,
        "preferred_assets": submission.preferred_assets or [],
        "selected_symbol": submission.selected_symbol,
        "consent_marketing": submission.consent_marketing,
        "source": submission.source,
        "source_page": submission.source_page,
        "intent": submission.intent,
        "utm_source": submission.utm_source,
        "utm_medium": submission.utm_medium,
        "utm_campaign": submission.utm_campaign,
        "referrer": submission.referrer or request.headers.get("referer"),
        "user_agent": submission.user_agent or request.headers.get("user-agent"),
    })

    return InterestSubmissionResponse(
        submission_id=submission_id,
        message="Thank you! We'll notify you when custom predictions are available.",
        email=submission.email
    )


@app.get("/v1/assets")
async def list_assets():
    """
    List all available assets for predictions (10 crypto + 10 stocks).

    Returns metadata including display names, exchange, and status.
    """
    return {
        "crypto": get_supported_crypto(),
        "stocks": get_supported_stocks()
    }


@app.get("/v1/health", response_model=HealthCheckResponse)
async def health_check():
    """
    Health check endpoint - verify service and model status.
    """
    model_info = predictor_backend.get_model_info()
    is_healthy = predictor_backend.is_loaded()

    return HealthCheckResponse(
        status=HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY,
        model=model_info.get('model_name', 'unknown'),
        message="Kronos model operational" if is_healthy else "Kronos model not loaded",
        timestamp=datetime.now(timezone.utc)
    )


# Legacy endpoints (for backward compatibility with old system)
# These will be deprecated once frontend is fully migrated

from prediction_engine import Prediction, generate_prediction

class PredictionRequest:
    """Legacy prediction request (old ISIN-based system)."""
    pass


@app.get("/health")
async def legacy_health():
    """Legacy health endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
