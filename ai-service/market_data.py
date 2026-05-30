"""
Market data fetching module using yfinance.

This module fetches real historical stock data from Yahoo Finance
to replace the synthetic data previously used in predictions.
"""

import logging
from datetime import datetime, timedelta
from typing import Tuple

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# Mapping from ISIN to Yahoo Finance ticker symbols
ISIN_TO_TICKER = {
    "US67066G1040": "NVDA",      # NVIDIA Corp
    "US0378331005": "AAPL",      # Apple Inc
    "US5949181045": "MSFT",      # Microsoft Corp
}


def get_historical_data(
    isin: str,
    lookback: int = 400,
    interval: str = "5m",
) -> Tuple[pd.DataFrame, pd.DatetimeIndex]:
    """
    Fetch historical stock data from Yahoo Finance.

    Args:
        isin: Security ISIN code
        lookback: Number of data points to fetch
        interval: Data interval ('1m', '5m', '15m', '1h', '1d')

    Returns:
        Tuple of (DataFrame with OHLCV data, DatetimeIndex)

    Raises:
        ValueError: If ISIN is not supported or data fetch fails
    """
    ticker_symbol = ISIN_TO_TICKER.get(isin)
    if not ticker_symbol:
        raise ValueError(
            f"ISIN {isin} not supported. Available: {list(ISIN_TO_TICKER.keys())}"
        )

    logger.info(f"Fetching {interval} data for {ticker_symbol} ({isin})")

    try:
        ticker = yf.Ticker(ticker_symbol)

        # Calculate period based on interval and lookback
        # For 5min data with 400 points: ~33 hours = ~2 days
        # For safety, fetch more than needed and trim
        period_map = {
            "1m": "7d",    # 1-minute data (max 7 days for yfinance)
            "5m": "60d",   # 5-minute data (max 60 days)
            "15m": "60d",  # 15-minute data
            "1h": "730d",  # Hourly data (max 730 days)
            "1d": "10y",   # Daily data
        }

        period = period_map.get(interval, "60d")

        # Fetch data
        df = ticker.history(period=period, interval=interval)

        if df.empty:
            raise ValueError(f"No data returned for {ticker_symbol}")

        # Rename columns to match Kronos expectations
        df = df.rename(columns={
            'Open': 'open',
            'High': 'high',
            'Low': 'low',
            'Close': 'close',
            'Volume': 'volume',
        })

        # Add 'amount' column (volume * average price)
        df['amount'] = df['volume'] * df[['open', 'high', 'low', 'close']].mean(axis=1)

        # Keep only required columns
        df = df[['open', 'high', 'low', 'close', 'volume', 'amount']]

        # Remove any NaN values
        df = df.dropna()

        if len(df) < lookback:
            logger.warning(
                f"Only {len(df)} data points available, requested {lookback}. "
                f"Using all available data."
            )

        # Take the most recent 'lookback' points
        df = df.tail(lookback)

        # Get the timestamp index
        x_timestamp = df.index

        logger.info(
            f"✅ Fetched {len(df)} data points for {ticker_symbol} "
            f"from {x_timestamp[0]} to {x_timestamp[-1]}"
        )

        return df, x_timestamp

    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker_symbol}: {e}")
        raise ValueError(f"Failed to fetch market data for {isin}: {e}") from e


def generate_future_timestamps(
    last_timestamp: pd.Timestamp,
    pred_len: int,
    interval: str = "5m",
) -> pd.DatetimeIndex:
    """
    Generate future timestamps for prediction horizon.

    Args:
        last_timestamp: Last historical timestamp
        pred_len: Number of future periods to predict
        interval: Time interval matching historical data

    Returns:
        DatetimeIndex for future predictions
    """
    # Parse interval to timedelta
    interval_map = {
        "1m": timedelta(minutes=1),
        "5m": timedelta(minutes=5),
        "15m": timedelta(minutes=15),
        "1h": timedelta(hours=1),
        "1d": timedelta(days=1),
    }

    freq = interval_map.get(interval)
    if not freq:
        raise ValueError(f"Unsupported interval: {interval}")

    # Generate future timestamps
    future_timestamps = pd.date_range(
        start=last_timestamp + freq,
        periods=pred_len,
        freq=interval,
    )

    return future_timestamps


def get_current_price(isin: str) -> float:
    """
    Get the current/latest price for a security.

    Args:
        isin: Security ISIN code

    Returns:
        Current price
    """
    ticker_symbol = ISIN_TO_TICKER.get(isin)
    if not ticker_symbol:
        raise ValueError(f"ISIN {isin} not supported")

    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.fast_info
        return float(info.last_price)
    except Exception as e:
        logger.warning(f"Could not fetch current price for {ticker_symbol}: {e}")
        # Fallback: use last close from recent data
        df, _ = get_historical_data(isin, lookback=1, interval="1d")
        return float(df['close'].iloc[-1])
