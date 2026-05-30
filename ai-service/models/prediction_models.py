"""
Pydantic models for cryptocurrency predictions and user interest submissions.

These models define the data schemas used in API requests/responses.
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

SUPPORTED_INTEREST_SYMBOLS = {
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT',
    'BABA', 'COIN', 'GLD', 'GOOGL', 'IBIT', 'MSFT', 'NVDA',
    'SPY', 'TSLA', 'UVIX',
}


class PredictionPoint(BaseModel):
    """
    Single hourly prediction point with confidence intervals.
    """
    hour_offset: int = Field(
        ...,
        ge=1,
        le=24,
        description="Hours from forecast timestamp (1-24)"
    )
    timestamp: datetime = Field(
        ...,
        description="Absolute prediction timestamp (UTC)"
    )
    predicted_price: float = Field(
        ...,
        gt=0,
        description="Mean predicted price across samples"
    )
    confidence_lower: float = Field(
        ...,
        gt=0,
        description="25th percentile confidence bound"
    )
    confidence_upper: float = Field(
        ...,
        gt=0,
        description="75th percentile confidence bound"
    )

    @field_validator('confidence_upper')
    @classmethod
    def validate_confidence_bounds(cls, v, info):
        """Ensure confidence_lower <= predicted_price <= confidence_upper (with small tolerance for floating point precision)"""
        if info.data.get('predicted_price') is not None and info.data.get('confidence_lower') is not None:
            predicted = info.data['predicted_price']
            lower = info.data['confidence_lower']
            # Allow small epsilon for floating point precision (0.1% of predicted price)
            epsilon = abs(predicted) * 0.001
            if not ((lower - epsilon) <= predicted <= (v + epsilon)):
                raise ValueError(
                    f"Confidence bounds invalid: {lower} <= {predicted} <= {v} not satisfied"
                )
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "hour_offset": 1,
                "timestamp": "2025-10-15T01:00:00Z",
                "predicted_price": 45456.78,
                "confidence_lower": 45234.12,
                "confidence_upper": 45678.34
            }
        }
    )


class HistoricalDataPoint(BaseModel):
    """
    Single historical price data point.
    """
    timestamp: datetime = Field(
        ...,
        description="Historical timestamp (UTC)"
    )
    price: float = Field(
        ...,
        gt=0,
        description="Historical price at this timestamp"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "timestamp": "2025-10-14T23:00:00Z",
                "price": 45123.45
            }
        }
    )


class CryptoPrediction(BaseModel):
    """
    24-hour price forecast for a cryptocurrency or stock with historical context.
    """
    symbol: str = Field(
        ...,
        pattern=r'^[A-Z]{2,10}(USDT)?$',
        description="Trading pair symbol (e.g., BTCUSDT for crypto, AAPL for stocks)"
    )
    display_name: str = Field(
        ...,
        description="User-friendly cryptocurrency name"
    )
    current_price: float = Field(
        ...,
        gt=0,
        description="Current price at time of forecast"
    )
    forecast_timestamp: datetime = Field(
        ...,
        description="When this prediction was generated (UTC)"
    )
    prediction_horizon_hours: int = Field(
        24,
        description="Hours ahead predicted (always 24 for MVP)"
    )
    predictions: List[PredictionPoint] = Field(
        ...,
        description="Array of 24 hourly prediction points"
    )
    historical_data: List[HistoricalDataPoint] = Field(
        default_factory=list,
        description="Historical price data points for chart visualization (last N hours)"
    )
    model_version: str = Field(
        ...,
        description="Kronos model identifier"
    )
    confidence_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Overall confidence score (0.0-1.0)"
    )

    @field_validator('predictions')
    @classmethod
    def validate_predictions_sequence(cls, v):
        """Ensure predictions have sequential hour_offset from 1 to 24"""
        if len(v) != 24:
            raise ValueError(f"Expected 24 predictions, got {len(v)}")

        for i, pred in enumerate(v, start=1):
            if pred.hour_offset != i:
                raise ValueError(
                    f"Prediction {i} has hour_offset={pred.hour_offset}, expected {i}"
                )
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "symbol": "BTCUSDT",
                "display_name": "Bitcoin",
                "current_price": 45345.20,
                "forecast_timestamp": "2025-10-15T00:00:00Z",
                "prediction_horizon_hours": 24,
                "predictions": [
                    {
                        "hour_offset": 1,
                        "timestamp": "2025-10-15T01:00:00Z",
                        "predicted_price": 45456.78,
                        "confidence_lower": 45234.12,
                        "confidence_upper": 45678.34
                    }
                ],
                "historical_data": [
                    {
                        "timestamp": "2025-10-14T23:00:00Z",
                        "price": 45123.45
                    },
                    {
                        "timestamp": "2025-10-15T00:00:00Z",
                        "price": 45345.20
                    }
                ],
                "model_version": "kronos-mini-v1",
                "confidence_score": 0.82
            }
        }
    )


class PredictionForecast(BaseModel):
    """
    Complete prediction response with metadata.
    """
    predictions: List[CryptoPrediction] = Field(
        ...,
        description="List of cryptocurrency predictions"
    )
    generated_at: datetime = Field(
        ...,
        description="When these predictions were generated"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "predictions": [
                    {
                        "symbol": "BTCUSDT",
                        "display_name": "Bitcoin",
                        "current_price": 45345.20,
                        "forecast_timestamp": "2025-10-15T00:00:00Z",
                        "prediction_horizon_hours": 24,
                        "predictions": [],
                        "model_version": "kronos-mini-v1",
                        "confidence_score": 0.82
                    }
                ],
                "generated_at": "2025-10-15T00:00:00Z"
            }
        }
    )


class InterestSubmission(BaseModel):
    """
    User interest form submission for custom predictions.
    """
    email: EmailStr = Field(
        ...,
        description="User's email address"
    )
    preferred_assets: Optional[List[str]] = Field(
        None,
        description="Asset symbols user is interested in"
    )
    consent_marketing: bool = Field(
        ...,
        description="Whether user consents to marketing emails"
    )
    source: Optional[str] = Field(
        None,
        description="Lead source such as landing, market_page, report, dashboard, or poster"
    )
    source_page: Optional[str] = Field(
        None,
        description="Path or URL where the lead was submitted"
    )
    selected_symbol: Optional[str] = Field(
        None,
        description="Primary asset symbol related to this submission"
    )
    intent: Optional[str] = Field(
        None,
        description="Optional user intent or request context"
    )
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None

    @field_validator('preferred_assets')
    @classmethod
    def validate_preferred_assets(cls, v):
        """Ensure preferred assets are valid symbols"""
        if v is not None:
            for symbol in v:
                if symbol not in SUPPORTED_INTEREST_SYMBOLS:
                    raise ValueError(
                        f"Invalid symbol '{symbol}'. Must be one of: {SUPPORTED_INTEREST_SYMBOLS}"
                    )
        return v

    @field_validator('selected_symbol')
    @classmethod
    def validate_selected_symbol(cls, v):
        """Ensure selected symbol is valid when provided."""
        if v is not None and v not in SUPPORTED_INTEREST_SYMBOLS:
            raise ValueError(
                f"Invalid selected_symbol '{v}'. Must be one of: {SUPPORTED_INTEREST_SYMBOLS}"
            )
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "preferred_assets": ["BTCUSDT", "NVDA"],
                "consent_marketing": True,
                "source": "market_page",
                "selected_symbol": "NVDA"
            }
        }
    )


class InterestSubmissionResponse(BaseModel):
    """
    Response after successful interest form submission.
    """
    submission_id: str = Field(
        ...,
        description="Unique identifier for this submission"
    )
    message: str = Field(
        ...,
        description="Success message"
    )
    email: EmailStr = Field(
        ...,
        description="Email address that was submitted"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "submission_id": "660e8400-e29b-41d4-a716-446655440001",
                "message": "Thank you! We'll notify you when custom predictions are available.",
                "email": "user@example.com"
            }
        }
    )


class CryptocurrencyAsset(BaseModel):
    """
    Available cryptocurrency asset metadata.
    """
    symbol: str = Field(..., description="Trading pair symbol")
    display_name: str = Field(..., description="User-friendly name")
    base_currency: str = Field(..., description="Base currency code")
    quote_currency: str = Field(..., description="Quote currency code")
    is_active: bool = Field(..., description="Whether predictions are generated")
    icon_url: Optional[str] = Field(None, description="URL to cryptocurrency icon")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "symbol": "BTCUSDT",
                "display_name": "Bitcoin",
                "base_currency": "BTC",
                "quote_currency": "USDT",
                "is_active": True,
                "icon_url": "https://cdn.stockwin.win/icons/btc.png"
            }
        }
    )


class HealthStatus(str, Enum):
    """Service health status enum."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthCheckResponse(BaseModel):
    """
    Health check endpoint response.
    """
    status: HealthStatus = Field(..., description="Service health status")
    model: str = Field(..., description="Currently loaded model")
    message: str = Field(..., description="Status message")
    timestamp: datetime = Field(..., description="Check timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "healthy",
                "model": "kronos-mini-v1",
                "message": "Kronos model operational",
                "timestamp": "2025-10-15T12:34:56Z"
            }
        }
    )


class SchedulerStatus(str, Enum):
    """Scheduler status enum."""
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"


class SchedulerStatusResponse(BaseModel):
    """
    Scheduler status endpoint response.
    """
    scheduler_running: bool = Field(..., description="Whether scheduler is active")
    last_run: Optional[datetime] = Field(None, description="Last execution time")
    last_success: Optional[datetime] = Field(None, description="Last successful run")
    current_status: SchedulerStatus = Field(..., description="Current scheduler status")
    next_run: Optional[datetime] = Field(None, description="Next scheduled run")
    predictions_cached: List[str] = Field(..., description="Symbols with cached predictions")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scheduler_running": True,
                "last_run": "2025-10-15T12:00:00Z",
                "last_success": "2025-10-15T12:00:00Z",
                "current_status": "idle",
                "next_run": "2025-10-15T13:00:00Z",
                "predictions_cached": ["BTCUSDT", "ETHUSDT", "XRPUSDT"]
            }
        }
    )


class ErrorResponse(BaseModel):
    """
    Standard error response.
    """
    error: str = Field(..., description="Error code or type")
    message: str = Field(..., description="Human-readable error message")
    timestamp: Optional[datetime] = Field(None, description="Error timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "SERVICE_UNAVAILABLE",
                "message": "Predictions temporarily unavailable. Please try again in a few minutes.",
                "timestamp": "2025-10-15T12:34:56Z"
            }
        }
    )


class ValidationError(BaseModel):
    """
    Validation error response with field-level details.
    """
    error: str = Field("VALIDATION_ERROR", description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: List[dict] = Field(..., description="Field-level validation errors")
    timestamp: Optional[datetime] = Field(None, description="Error timestamp")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "error": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "details": [
                    {
                        "field": "email",
                        "message": "Invalid email format"
                    }
                ],
                "timestamp": "2025-10-15T12:34:56Z"
            }
        }
    )
