"""Prediction engine for Kronos integration (Kronos-only).

This module loads the Kronos predictor and exposes a stable interface for the
FastAPI service. Simulation/fallback modes have been removed to ensure we only
serve real Kronos-backed predictions.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Dict, List


logger = logging.getLogger(__name__)


# Supported securities and their display info (can be moved to DB later)
SECURITIES: Dict[str, Dict[str, object]] = {
    "US67066G1040": {
        "name": "NVIDIA Corp",
        "current_price": 100.0,
    },
    "US0378331005": {
        "name": "Apple Inc",
        "current_price": 200.0,
    },
    "US5949181045": {
        "name": "Microsoft Corp",
        "current_price": 35.5,
    },
}


@dataclass
class PredictionPoint:
    """Normalised representation of a single horizon forecast."""

    date: str
    predicted_price: float
    confidence_lower: float
    confidence_upper: float


@dataclass
class Prediction:
    """Container for a full Kronos prediction payload."""

    isin: str
    security_name: str
    current_price: float
    predictions: List[PredictionPoint]
    signal: str
    confidence: float
    trend: str
    ai_summary: str


class BasePredictor:
    """Common interface implemented by concrete predictor backends."""

    def predict(self, isin: str, horizon_days: int) -> Prediction:
        raise NotImplementedError


class KronosPredictorBackend(BasePredictor):
    """
    Adapter that loads Kronos model weights from Hugging Face Hub.
    
    Uses Model Registry pattern:
    - Model weights downloaded from HuggingFace at startup
    - Cached locally for faster subsequent loads
    - Only inference code shipped in container
    """

    def __init__(self, model_name: str | None = None, device: str | None = None):
        try:
            from kronos_integration import KronosPredictorBackend as RealKronosBackend
        except Exception as exc:  # pragma: no cover
            raise RuntimeError(
                "Kronos integration not available. Ensure ai-service dependencies are installed and model files resolve."
            ) from exc

        logger.info("Initializing Kronos predictor with Model Registry pattern (HuggingFace Hub)")
        self._backend = RealKronosBackend()

    def predict(self, isin: str, horizon_days: int) -> Prediction:
        """
        Generate prediction using Kronos model from HuggingFace Hub.
        
        The backend downloads model weights automatically and returns predictions.
        """
        raw_result = self._backend.predict(isin, horizon_days)

        # Convert backend format to our standardized Prediction format
        predictions: List[PredictionPoint] = []
        for pred_point in raw_result.get('predictions', []):
            # Calculate confidence interval from confidence score
            predicted_price = pred_point['predicted_price']
            confidence = pred_point.get('confidence', 0.85)
            confidence_width = predicted_price * (1 - confidence) * 0.5
            
            predictions.append(
                PredictionPoint(
                    date=pred_point.get('date', ''),
                    predicted_price=predicted_price,
                    confidence_lower=predicted_price - confidence_width,
                    confidence_upper=predicted_price + confidence_width,
                )
            )

        # Determine trading signal based on price movement
        current_price = raw_result.get('current_price', 100.0)
        if predictions:
            final_price = predictions[-1].predicted_price
            price_change_pct = ((final_price - current_price) / current_price) * 100
            
            if price_change_pct > 2:
                signal = "BUY"
                trend = "bullish"
                confidence_score = 0.85
            elif price_change_pct < -2:
                signal = "SELL"
                trend = "bearish"
                confidence_score = 0.82
            else:
                signal = "HOLD"
                trend = "neutral"
                confidence_score = 0.75
                
            ai_summary = (
                f"Kronos model predicts {price_change_pct:+.1f}% move in {horizon_days} days. "
                f"Model: {raw_result.get('model_version', 'unknown')}"
            )
        else:
            signal = "HOLD"
            trend = "neutral"
            confidence_score = 0.5
            ai_summary = "Insufficient data for prediction"

        security_name = SECURITIES.get(isin, {}).get("name", "Unknown Security")

        return Prediction(
            isin=isin,
            security_name=security_name,
            current_price=current_price,
            predictions=predictions,
            signal=signal,
            confidence=confidence_score,
            trend=trend,
            ai_summary=ai_summary,
        )


def _determine_backend() -> BasePredictor:
    """
    Initialize Kronos predictor backend.

    No fallback - fails visibly if Kronos model cannot be loaded.
    This ensures we only serve authentic Kronos predictions.
    """
    logger.info("Initializing Kronos predictor (no fallback mode)...")
    try:
        return KronosPredictorBackend()
    except Exception as e:
        logger.error(f"❌ Kronos initialization failed: {e}")
        logger.error("Service will not start without Kronos model. Check model files and dependencies.")
        raise RuntimeError(
            "Failed to initialize Kronos model. Service cannot start without model."
        ) from e


PREDICTOR_BACKEND: BasePredictor | None = None


def generate_prediction(isin: str, horizon_days: int) -> Prediction:
    """Facade used by the FastAPI routes."""

    if horizon_days <= 0:
        raise ValueError("horizon_days must be positive")

    global PREDICTOR_BACKEND
    if PREDICTOR_BACKEND is None:
        PREDICTOR_BACKEND = _determine_backend()
    return PREDICTOR_BACKEND.predict(isin, horizon_days)

