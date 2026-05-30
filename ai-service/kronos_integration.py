"""
Kronos model integration for cryptocurrency price predictions.

This module provides a singleton wrapper around the Kronos foundation model
for generating 24-hour price forecasts with confidence intervals.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
import pandas as pd
import numpy as np
from models import KronosTokenizer, Kronos


class KronosPredictorBackend:
    """
    Singleton class for managing Kronos model lifecycle and predictions.

    The Kronos model is loaded once at startup and reused for all predictions
    to avoid repeated model loading overhead (~30MB download + initialization).

    Attributes:
        _instance: Singleton instance
        _predictor: Loaded KronosPredictor instance
        model_name: HuggingFace model identifier
        tokenizer_name: HuggingFace tokenizer identifier
        cache_dir: Directory for model cache
    """

    _instance = None
    _predictor = None

    def __new__(cls):
        """Ensure only one instance exists (Singleton pattern)."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize predictor (only once due to singleton)."""
        if self._predictor is None:
            self._load_model()

    def _load_model(self):
        """
        Load Kronos model and tokenizer from HuggingFace Hub.

        Downloads models on first run (~30MB), subsequent runs load from cache.
        Uses Kronos-mini (4.1M params) with Tokenizer-2k (2048 context).
        """
        self.model_name = os.getenv('KRONOS_MODEL_NAME', 'NeoQuasar/Kronos-base')
        self.tokenizer_name = os.getenv('KRONOS_TOKENIZER_NAME', 'NeoQuasar/Kronos-Tokenizer-base')
        self.cache_dir = os.getenv('MODEL_CACHE_DIR', './models/cache')

        print(f"Loading Kronos model from {self.model_name}...")
        print(f"Cache directory: {self.cache_dir}")

        try:
            # Load tokenizer
            tokenizer = KronosTokenizer.from_pretrained(
                self.tokenizer_name,
                cache_dir=self.cache_dir
            )
            print(f"✅ Tokenizer loaded: {self.tokenizer_name}")

            # Load model
            model = Kronos.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir
            )
            print(f"✅ Model loaded: {self.model_name}")

            # Initialize predictor
            from models import KronosPredictor
            self._predictor = KronosPredictor(model, tokenizer)
            print(f"✅ KronosPredictor initialized successfully")

        except Exception as e:
            print(f"❌ Failed to load Kronos model: {e}")
            raise

    def predict(
        self,
        df: pd.DataFrame,
        x_timestamp: pd.Series,
        pred_len: int = 24,
        temperature: float = 1.0,
        top_p: float = 0.95,
        sample_count: int = 30
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Generate price predictions using Kronos model.

        Args:
            df: Historical OHLCV data (columns: open, high, low, close, volume, amount)
            x_timestamp: Timestamps for historical data
            pred_len: Number of hours to predict (default: 24)
            temperature: Sampling temperature (default: 1.0, higher = more random)
            top_p: Nucleus sampling parameter (default: 0.95)
            sample_count: Monte Carlo samples for uncertainty quantification (default: 30)

        Returns:
            Tuple of (close_predictions, volume_predictions)
            Each is a DataFrame with shape (pred_len, sample_count)

        Raises:
            Exception: If model inference fails

        Example:
            >>> backend = KronosPredictorBackend()
            >>> df, x_timestamp = get_historical_data('BTCUSDT', lookback=360)
            >>> close_preds, vol_preds = backend.predict(df, x_timestamp)
            >>> print(close_preds.mean(axis=1))  # Mean prediction per hour
        """
        if self._predictor is None:
            raise RuntimeError("Kronos model not loaded. Call _load_model() first.")

        try:
            # Generate y_timestamp (future timestamps for predictions)
            last_timestamp = x_timestamp.iloc[-1]
            y_timestamp = pd.date_range(
                start=last_timestamp + timedelta(hours=1),
                periods=pred_len,
                freq='H'
            )

            print(f"Generating {pred_len}-hour prediction with {sample_count} samples...")
            print(f"Historical data: {len(df)} candles, from {x_timestamp.iloc[0]} to {x_timestamp.iloc[-1]}")
            print(f"Prediction range: {y_timestamp[0]} to {y_timestamp[-1]}")

            # Call Kronos predictor
            close_preds, volume_preds = self._predictor.predict(
                df=df,
                x_timestamp=x_timestamp,
                y_timestamp=y_timestamp,
                pred_len=pred_len,
                T=temperature,
                top_p=top_p,
                sample_count=sample_count,
                verbose=False
            )

            print(f"✅ Prediction complete: shape {close_preds.shape}")
            return close_preds, volume_preds

        except Exception as e:
            print(f"❌ Prediction failed: {e}")
            raise

    def compute_confidence_intervals(
        self,
        predictions: pd.DataFrame,
        lower_percentile: float = 25.0,
        upper_percentile: float = 75.0
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Compute mean and confidence intervals from Monte Carlo samples.

        Args:
            predictions: DataFrame with shape (pred_len, sample_count)
            lower_percentile: Lower confidence bound percentile (default: 25th)
            upper_percentile: Upper confidence bound percentile (default: 75th)

        Returns:
            Tuple of (mean, lower_bound, upper_bound) as numpy arrays

        Example:
            >>> mean, lower, upper = backend.compute_confidence_intervals(close_preds)
            >>> print(f"Hour 1 prediction: {mean[0]:.2f} [{lower[0]:.2f}, {upper[0]:.2f}]")
        """
        mean = predictions.mean(axis=1).values
        lower = np.percentile(predictions.values, lower_percentile, axis=1)
        upper = np.percentile(predictions.values, upper_percentile, axis=1)
        return mean, lower, upper

    def is_loaded(self) -> bool:
        """Check if Kronos model is successfully loaded."""
        return self._predictor is not None

    def get_model_info(self) -> dict:
        """
        Get information about the loaded model.

        Returns:
            Dictionary with model_name, tokenizer_name, cache_dir, is_loaded
        """
        return {
            'model_name': self.model_name if hasattr(self, 'model_name') else None,
            'tokenizer_name': self.tokenizer_name if hasattr(self, 'tokenizer_name') else None,
            'cache_dir': self.cache_dir if hasattr(self, 'cache_dir') else None,
            'is_loaded': self.is_loaded()
        }


# Singleton instance (auto-initialized on first import)
# Usage: from kronos_integration import predictor_backend
predictor_backend = KronosPredictorBackend()
