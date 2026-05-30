"""
Kronos predictor backend implementation.
Downloads model weights from Hugging Face Hub at startup.
"""

import logging
import os
from typing import Dict

import pandas as pd
import torch

logger = logging.getLogger(__name__)


class KronosPredictorBackend:
    """
    Production Kronos predictor that downloads models from Hugging Face Hub.
    
    Model Registry Pattern:
    - Model weights stored in Hugging Face Hub
    - Downloaded automatically at service startup
    - Cached locally for faster subsequent loads
    """

    def __init__(self):
        """
        Initialize Kronos predictor with models from Hugging Face Hub.
        
        Environment Variables:
            KRONOS_MODEL_ID: HuggingFace model ID (default: NeoQuasar/Kronos-small)
            KRONOS_TOKENIZER_ID: HuggingFace tokenizer ID (default: NeoQuasar/Kronos-Tokenizer-base)
            KRONOS_DEVICE: Device to run on (default: cpu, options: cpu, cuda, cuda:0)
            KRONOS_MAX_CONTEXT: Maximum context length (default: 512)
            KRONOS_CLIP: Clipping value for normalization (default: 5)
        """
        self.model_id = os.getenv("KRONOS_MODEL_ID", "NeoQuasar/Kronos-small")
        self.tokenizer_id = os.getenv("KRONOS_TOKENIZER_ID", "NeoQuasar/Kronos-Tokenizer-base")
        self.device = os.getenv("KRONOS_DEVICE", "cpu")
        self.max_context = int(os.getenv("KRONOS_MAX_CONTEXT", "512"))
        self.clip = int(os.getenv("KRONOS_CLIP", "5"))

        logger.info(f"Initializing Kronos predictor with model={self.model_id}, tokenizer={self.tokenizer_id}")
        logger.info(f"Device: {self.device}, Max context: {self.max_context}, Clip: {self.clip}")

        try:
            # Import Kronos modules (these should be in ai-service/kronos_integration/model/)
            from .model import Kronos, KronosTokenizer, KronosPredictor

            # Download models from Hugging Face Hub
            logger.info(f"Downloading tokenizer from {self.tokenizer_id}...")
            tokenizer = KronosTokenizer.from_pretrained(self.tokenizer_id)
            
            logger.info(f"Downloading model from {self.model_id}...")
            model = Kronos.from_pretrained(self.model_id)

            # Initialize predictor
            self.predictor = KronosPredictor(
                model=model,
                tokenizer=tokenizer,
                device=self.device,
                max_context=self.max_context,
                clip=self.clip
            )
            
            logger.info("✅ Kronos predictor initialized successfully")

        except Exception as e:
            logger.error(f"❌ Failed to initialize Kronos predictor: {e}")
            raise

    def predict(self, isin: str, horizon_days: int) -> Dict:
        """
        Generate price prediction using Kronos model with REAL market data.

        Args:
            isin: Security identifier (fetches real data from Yahoo Finance)
            horizon_days: Number of days to predict

        Returns:
            Dict with prediction data including real historical prices
        """
        logger.info(f"Generating Kronos prediction for {isin} with horizon {horizon_days} days")

        try:
            # Import market data module
            import sys
            from pathlib import Path
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from market_data import get_historical_data, generate_future_timestamps, get_current_price

            # Fetch REAL historical data from Yahoo Finance
            pred_len = horizon_days * 78  # Assuming 78 5-minute intervals per day
            lookback = 400  # Historical context length

            logger.info(f"📊 Fetching real market data for {isin}...")
            x_df, x_timestamp = get_historical_data(
                isin=isin,
                lookback=lookback,
                interval='5m'
            )

            # Generate future timestamps
            y_timestamp = generate_future_timestamps(
                last_timestamp=x_timestamp[-1],
                pred_len=pred_len,
                interval='5m'
            )

            logger.info(f"✅ Using REAL data: {len(x_df)} historical points from {x_timestamp[0]} to {x_timestamp[-1]}")

            # Generate prediction using Kronos
            pred_df = self.predictor.predict(
                df=x_df,
                x_timestamp=x_timestamp,
                y_timestamp=y_timestamp,
                pred_len=pred_len,
                T=1.0,
                top_p=0.9,
                sample_count=1,
                verbose=False
            )

            # Extract daily prediction (last value of each day)
            daily_predictions = []
            base_date = pd.Timestamp.now()
            
            for day in range(horizon_days):
                day_end_idx = (day + 1) * 78 - 1
                if day_end_idx < len(pred_df):
                    prediction_date = (base_date + pd.Timedelta(days=day + 1)).strftime('%Y-%m-%d')
                    daily_predictions.append({
                        'date': prediction_date,
                        'day': day + 1,
                        'predicted_price': float(pred_df.iloc[day_end_idx]['close']),
                        'confidence': 0.85  # TODO: Calculate real confidence from model
                    })

            # Get current price from real market data
            current_price = get_current_price(isin)

            result = {
                'isin': isin,
                'model': 'kronos',
                'model_version': self.model_id,
                'prediction_horizon_days': horizon_days,
                'current_price': current_price,
                'predictions': daily_predictions,
                'historical_data': {
                    'timestamps': [ts.isoformat() for ts in x_timestamp[-20:]],  # Last 20 points for chart
                    'prices': x_df['close'].tail(20).tolist()
                },
                'metadata': {
                    'device': self.device,
                    'max_context': self.max_context,
                    'lookback_periods': lookback,
                    'prediction_periods': pred_len,
                    'data_source': 'Yahoo Finance (yfinance)',
                    'data_start': x_timestamp[0].isoformat(),
                    'data_end': x_timestamp[-1].isoformat()
                }
            }

            logger.info(f"✅ Kronos prediction completed for {isin}")
            return result

        except Exception as e:
            logger.error(f"❌ Kronos prediction failed: {e}")
            raise
