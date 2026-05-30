"""
Cryptocurrency prediction engine using Kronos model.

This module provides a backward-compatible interface to the unified prediction
engine for cryptocurrency predictions.
"""

from typing import Optional
from crypto_data import CryptoDataProvider, SUPPORTED_SYMBOLS, SYMBOL_DISPLAY_NAMES
from unified_prediction_engine import UnifiedPredictionEngine
from models.prediction_models import CryptoPrediction, PredictionForecast

# Create singleton instances
_data_provider = CryptoDataProvider()
_engine = UnifiedPredictionEngine(_data_provider, asset_type="crypto")

# Re-export data provider symbols for backward compatibility
__all__ = [
    'SUPPORTED_SYMBOLS',
    'SYMBOL_DISPLAY_NAMES',
    'PREDICTION_HORIZON_HOURS',
    'PREDICTION_SAMPLES',
    'TEMPERATURE',
    'TOP_P',
    'latest_predictions',
    'generate_prediction_for_symbol',
    'generate_all_predictions',
    'get_cached_prediction',
    'get_all_cached_predictions',
    'is_prediction_stale',
    'clear_cache'
]

# Expose engine configuration for backward compatibility
PREDICTION_HORIZON_HOURS = _engine.prediction_horizon_hours
PREDICTION_SAMPLES = _engine.prediction_samples
TEMPERATURE = _engine.temperature
TOP_P = _engine.top_p

# Expose cache for backward compatibility
latest_predictions = _engine.latest_predictions


def generate_prediction_for_symbol(
    symbol: str,
    pred_len: int = 24,
    temperature: float = 1.0,
    top_p: float = 0.95,
    sample_count: int = 30
) -> CryptoPrediction:
    """
    Generate 24-hour price prediction for a cryptocurrency.

    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        pred_len: Number of hours to predict (default: 24)
        temperature: Sampling temperature (default: 1.0)
        top_p: Nucleus sampling parameter (default: 0.95)
        sample_count: Monte Carlo samples (default: 30)

    Returns:
        CryptoPrediction object with 24 hourly predictions

    Raises:
        ValueError: If symbol not supported
        Exception: If prediction generation fails
    """
    return _engine.generate_prediction_for_symbol(
        symbol, pred_len, temperature, top_p, sample_count
    )


def generate_all_predictions() -> PredictionForecast:
    """
    Generate predictions for all supported cryptocurrencies.

    Returns:
        PredictionForecast with predictions for all supported cryptos

    Raises:
        Exception: If any prediction generation fails
    """
    return _engine.generate_all_predictions()


def get_cached_prediction(symbol: str) -> Optional[CryptoPrediction]:
    """
    Retrieve cached prediction for a symbol.

    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')

    Returns:
        CryptoPrediction if cached, None otherwise
    """
    return _engine.get_cached_prediction(symbol)


def get_all_cached_predictions() -> Optional[PredictionForecast]:
    """
    Retrieve all cached predictions.

    Returns:
        PredictionForecast with all cached predictions, or None if cache empty
    """
    return _engine.get_all_cached_predictions()


def is_prediction_stale(prediction: CryptoPrediction, max_age_hours: int = 1) -> bool:
    """
    Check if a prediction is stale (older than max_age_hours).

    Args:
        prediction: CryptoPrediction to check
        max_age_hours: Maximum age in hours (default: 1)

    Returns:
        True if prediction is stale, False otherwise
    """
    return _engine.is_prediction_stale(prediction, max_age_hours)


def clear_cache():
    """Clear all cached predictions."""
    _engine.clear_cache()
