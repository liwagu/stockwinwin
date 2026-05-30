"""
Unified prediction engine for both crypto and stock predictions.

This module provides a generic prediction engine that works with any
MarketDataProvider, eliminating code duplication between crypto and stock
prediction engines.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Dict, Optional, List
import pandas as pd

from market_data_provider import MarketDataProvider
from kronos_backend import predictor_backend
from models.prediction_models import (
    CryptoPrediction,
    PredictionPoint,
    HistoricalDataPoint,
    PredictionForecast
)

logger = logging.getLogger(__name__)


class UnifiedPredictionEngine:
    """
    Unified prediction engine that works with any market data provider.

    This class eliminates duplication between crypto and stock prediction engines
    by accepting a MarketDataProvider as a dependency.
    """

    def __init__(self, data_provider: MarketDataProvider, asset_type: str = "asset"):
        """
        Initialize the prediction engine.

        Args:
            data_provider: MarketDataProvider instance for fetching market data
            asset_type: Description of asset type for logging (e.g., "crypto", "stock")
        """
        self.data_provider = data_provider
        self.asset_type = asset_type
        self.latest_predictions: Dict[str, CryptoPrediction] = {}

        # Runtime-configurable parameters from environment
        self.prediction_horizon_hours = int(os.getenv("PREDICTION_HORIZON_HOURS", "24"))
        self.prediction_samples = int(os.getenv("PREDICTION_SAMPLES", "30"))
        self.temperature = float(os.getenv("TEMPERATURE", "1.0"))
        self.top_p = float(os.getenv("TOP_P", "0.95"))

    def generate_prediction_for_symbol(
        self,
        symbol: str,
        pred_len: int = 24,
        temperature: float = 1.0,
        top_p: float = 0.95,
        sample_count: int = 30
    ) -> CryptoPrediction:
        """
        Generate prediction for a single asset symbol.

        Args:
            symbol: Asset symbol (e.g., 'BTCUSDT', 'AAPL')
            pred_len: Number of hours to predict (default: 24)
            temperature: Sampling temperature (default: 1.0)
            top_p: Nucleus sampling parameter (default: 0.95)
            sample_count: Monte Carlo samples (default: 30)

        Returns:
            CryptoPrediction object with predictions

        Raises:
            ValueError: If symbol not supported
            Exception: If prediction generation fails
        """
        supported_symbols = self.data_provider.get_supported_symbols()
        if symbol not in supported_symbols:
            raise ValueError(f"Unsupported symbol: {symbol}. Must be one of {supported_symbols}")

        logger.info(f"Generating {self.asset_type} prediction for {symbol}...")

        try:
            # Step 1: Fetch historical data
            df, x_timestamp = self.data_provider.get_historical_data(
                symbol=symbol,
                lookback=360,
                interval='1h'
            )

            # Step 2: Get current price
            current_price = float(df['close'].iloc[-1])

            # Step 3: Generate predictions using Kronos
            close_preds, volume_preds = predictor_backend.predict(
                df=df,
                x_timestamp=x_timestamp,
                pred_len=pred_len,
                temperature=temperature,
                top_p=top_p,
                sample_count=sample_count
            )

            # Step 4: Compute confidence intervals
            p50_prices, lower_bounds, upper_bounds = predictor_backend.compute_confidence_intervals(
                predictions=close_preds,
                lower_percentile=25.0,
                upper_percentile=75.0
            )

            # Step 5: Format predictions
            forecast_timestamp = datetime.now(timezone.utc)
            prediction_points = []

            for hour_offset in range(1, pred_len + 1):
                idx = hour_offset - 1
                prediction_points.append(
                    PredictionPoint(
                        hour_offset=hour_offset,
                        timestamp=x_timestamp.iloc[-1] + pd.Timedelta(hours=hour_offset),
                        predicted_price=float(p50_prices[idx]),
                        confidence_lower=float(lower_bounds[idx]),
                        confidence_upper=float(upper_bounds[idx])
                    )
                )

            # Step 6: Prepare historical data for visualization (last 48 hours)
            historical_window = min(48, len(df))
            historical_data = []
            for i in range(-historical_window, 0):
                historical_data.append(
                    HistoricalDataPoint(
                        timestamp=x_timestamp.iloc[i],
                        price=float(df['close'].iloc[i])
                    )
                )

            # Step 7: Calculate overall confidence score
            normalized_variance = close_preds.var(axis=1).mean() / current_price
            confidence_score = max(0.0, min(1.0, 1.0 - normalized_variance))

            # Step 8: Get model version
            model_info = predictor_backend.get_model_info()
            model_version = model_info.get('model_name', 'unknown')

            # Step 9: Get display name
            display_names = self.data_provider.get_symbol_display_names()

            # Step 10: Create prediction object
            prediction = CryptoPrediction(
                symbol=symbol,
                display_name=display_names.get(symbol, symbol),
                current_price=current_price,
                forecast_timestamp=forecast_timestamp,
                prediction_horizon_hours=pred_len,
                predictions=prediction_points,
                historical_data=historical_data,
                model_version=model_version,
                confidence_score=round(confidence_score, 2)
            )

            logger.info(
                f"✅ Generated {self.asset_type} prediction for {symbol}: "
                f"current={current_price:.2f}, confidence={confidence_score:.2f}"
            )
            return prediction

        except Exception as e:
            logger.exception(f"❌ Failed to generate {self.asset_type} prediction for {symbol}: {e}")
            raise

    def generate_all_predictions(self) -> PredictionForecast:
        """
        Generate predictions for all supported assets.

        Returns:
            PredictionForecast with predictions for all supported assets

        Raises:
            Exception: If prediction generation fails for all assets
        """
        supported_symbols = self.data_provider.get_supported_symbols()
        logger.info(f"Generating {self.asset_type} predictions for {len(supported_symbols)} symbols...")

        predictions = []
        generated_at = datetime.now(timezone.utc)

        if not supported_symbols:
            logger.info(f"No {self.asset_type} symbols configured; skipping prediction generation.")
            return PredictionForecast(predictions=predictions, generated_at=generated_at)

        for symbol in supported_symbols:
            try:
                prediction = self.generate_prediction_for_symbol(
                    symbol,
                    pred_len=self.prediction_horizon_hours,
                    temperature=self.temperature,
                    top_p=self.top_p,
                    sample_count=self.prediction_samples,
                )
                predictions.append(prediction)

                # Cache prediction
                self.latest_predictions[symbol] = prediction
                logger.info(f"✅ Cached {self.asset_type} prediction for {symbol}")

            except Exception as e:
                logger.exception(f"❌ Failed to generate {self.asset_type} prediction for {symbol}: {e}")
                continue

        if not predictions:
            raise RuntimeError(f"Failed to generate any {self.asset_type} predictions")

        return PredictionForecast(
            predictions=predictions,
            generated_at=generated_at
        )

    def get_cached_prediction(self, symbol: str) -> Optional[CryptoPrediction]:
        """
        Retrieve cached prediction for a symbol.

        Args:
            symbol: Asset symbol

        Returns:
            Prediction if cached, None otherwise
        """
        return self.latest_predictions.get(symbol)

    def get_all_cached_predictions(self) -> Optional[PredictionForecast]:
        """
        Retrieve all cached predictions.

        Returns:
            PredictionForecast with all cached predictions, or None if cache empty
        """
        if not self.latest_predictions:
            return None

        generated_at = min(pred.forecast_timestamp for pred in self.latest_predictions.values())

        return PredictionForecast(
            predictions=list(self.latest_predictions.values()),
            generated_at=generated_at
        )

    def is_prediction_stale(self, prediction: CryptoPrediction, max_age_hours: int = 1) -> bool:
        """
        Check if a prediction is stale.

        Args:
            prediction: Prediction to check
            max_age_hours: Maximum age in hours (default: 1)

        Returns:
            True if prediction is stale, False otherwise
        """
        now = datetime.now(timezone.utc)
        age = (now - prediction.forecast_timestamp).total_seconds() / 3600
        return age > max_age_hours

    def clear_cache(self):
        """Clear all cached predictions."""
        self.latest_predictions = {}
        logger.info(f"{self.asset_type.capitalize()} prediction cache cleared")
