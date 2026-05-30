"""
Stock market data fetching using yfinance.

This module provides functions to fetch historical OHLCV data for US stocks
with TTL caching to minimize API calls.
"""

import os
from typing import Tuple, List, Dict
import pandas as pd
import yfinance as yf
from market_data_provider import MarketDataProvider


def _configured_symbols(env_name: str, default_symbols: List[str]) -> List[str]:
    raw_value = os.getenv(env_name)
    if raw_value is None:
        return default_symbols

    requested_symbols = [symbol.strip().upper() for symbol in raw_value.split(",") if symbol.strip()]
    invalid_symbols = [symbol for symbol in requested_symbols if symbol not in default_symbols]
    if invalid_symbols:
        print(f"Warning: ignoring unsupported symbols in {env_name}: {', '.join(invalid_symbols)}")

    return [symbol for symbol in requested_symbols if symbol in default_symbols]


class StockDataProvider(MarketDataProvider):
    """
    Stock market data provider using Yahoo Finance.
    """

    def __init__(self):
        # Stocks use larger cache size (20 vs 10 for crypto)
        super().__init__(cache_size=20)
        default_symbols = ['BABA', 'COIN', 'GLD', 'GOOGL', 'IBIT',
                           'MSFT', 'NVDA', 'SPY', 'TSLA', 'UVIX']
        self._supported_symbols = _configured_symbols("STOCK_SYMBOLS", default_symbols)
        self._display_names = {
            'BABA': 'Alibaba Group Holding',
            'SPY': 'S&P 500 ETF',
            'GLD': 'SPDR Gold Shares',
            'GOOGL': 'Alphabet Inc Class A',
            'IBIT': 'iShares Bitcoin Trust',
            'MSFT': 'Microsoft Corporation',
            'NVDA': 'NVIDIA Corporation',
            'TSLA': 'Tesla Inc',
            'COIN': 'Coinbase',
            'UVIX': 'VS 2x VIX Futures ETF'
        }

    def get_historical_data(
        self,
        symbol: str,
        lookback: int = 360,
        interval: str = '1h'
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Fetch historical OHLCV data from Yahoo Finance with caching.

        Args:
            symbol: Stock ticker symbol (e.g., 'AAPL', 'GOOGL', 'MSFT')
            lookback: Number of candles to fetch (default: 360 for 15 days of hourly data)
            interval: Candle interval (default: '1h' for hourly)

        Returns:
            Tuple of (DataFrame with OHLCV columns, Series of timestamps)
        """
        cache_key = (symbol, lookback, interval)

        # Check cache first
        if cache_key in self.market_data_cache:
            print(f"Cache hit for {symbol} (TTL cache)")
            return self.market_data_cache[cache_key]

        print(f"Fetching fresh data from Yahoo Finance for {symbol}...")

        try:
            ticker = yf.Ticker(symbol)

            # Calculate period based on interval and lookback
            if interval == '1h':
                period = '60d'
            elif interval == '1d':
                period = f'{lookback}d'
            else:
                period = '60d'

            hist = ticker.history(period=period, interval=interval)

            if hist.empty:
                raise Exception(f"No data returned for {symbol}")

            hist = hist.tail(lookback)
            hist.reset_index(inplace=True)

            # Handle different timestamp column names
            if 'timestamp' not in hist.columns:
                for candidate in ('Date', 'Datetime', 'index'):
                    if candidate in hist.columns:
                        hist.rename(columns={candidate: 'timestamp'}, inplace=True)
                        break
            if 'timestamp' not in hist.columns:
                raise Exception(f"Could not determine timestamp column for {symbol}")

            x_timestamp = pd.to_datetime(hist['timestamp'], utc=True, errors='coerce')

            df = hist[['Open', 'High', 'Low', 'Close', 'Volume']].copy()
            df.columns = ['open', 'high', 'low', 'close', 'volume']
            df = df.astype(float)
            df['amount'] = df['volume'] * ((df['high'] + df['low']) / 2)

            # Validate data quality
            if len(df) < lookback * 0.8:
                print(f"Warning: Only fetched {len(df)} candles for {symbol}, expected {lookback}")

            if df.isnull().any().any() or x_timestamp.isnull().any():
                print(f"Warning: Data contains NaN values for {symbol}")
                df.ffill(inplace=True)
                df.bfill(inplace=True)

                valid_mask = (~df.isnull().any(axis=1)) & (~x_timestamp.isnull())
                if not valid_mask.all():
                    df = df.loc[valid_mask].reset_index(drop=True)
                    x_timestamp = x_timestamp.loc[valid_mask].reset_index(drop=True)

                if df.empty:
                    raise Exception(f"All fetched rows contained NaN values for {symbol}")

            self.market_data_cache[cache_key] = (df, x_timestamp)
            print(f"Successfully fetched {len(df)} candles for {symbol}")
            return df, x_timestamp

        except Exception as e:
            print(f"Error fetching data from Yahoo Finance for {symbol}: {e}")
            raise

    def get_current_price(self, symbol: str) -> float:
        """Get the current price for a stock from Yahoo Finance."""
        try:
            ticker = yf.Ticker(symbol)
            price = ticker.fast_info.get('lastPrice', None)
            if price is None:
                hist = ticker.history(period='1d', interval='1m')
                if not hist.empty:
                    price = hist['Close'].iloc[-1]
                else:
                    raise Exception(f"No price data available for {symbol}")
            return float(price)
        except Exception as e:
            print(f"Error fetching current price for {symbol}: {e}")
            raise

    def validate_symbol(self, symbol: str) -> bool:
        """Validate that a stock symbol exists on Yahoo Finance."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            return info is not None
        except Exception as e:
            print(f"Error validating symbol {symbol}: {e}")
            return False

    def get_supported_symbols(self) -> List[str]:
        """Get list of supported stock symbols."""
        return self._supported_symbols

    def get_symbol_display_names(self) -> Dict[str, str]:
        """Get mapping of symbols to display names."""
        return self._display_names


# Singleton instance for backward compatibility
_provider = StockDataProvider()

# Module-level variables for backward compatibility
SUPPORTED_SYMBOLS = _provider.get_supported_symbols()
SYMBOL_DISPLAY_NAMES = _provider.get_symbol_display_names()
market_data_cache = _provider.market_data_cache


# Module-level functions for backward compatibility
def get_historical_data(symbol: str, lookback: int = 360, interval: str = '1h') -> Tuple[pd.DataFrame, pd.Series]:
    """Fetch historical OHLCV data from Yahoo Finance with caching."""
    return _provider.get_historical_data(symbol, lookback, interval)


def get_current_price(symbol: str) -> float:
    """Get the current price for a stock from Yahoo Finance."""
    return _provider.get_current_price(symbol)


def validate_symbol(symbol: str) -> bool:
    """Validate that a stock symbol exists on Yahoo Finance."""
    return _provider.validate_symbol(symbol)


def get_supported_assets() -> list[dict]:
    """Get list of supported stock assets for predictions."""
    return _provider.get_supported_assets()
