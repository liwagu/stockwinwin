"""
Cryptocurrency market data fetching using Binance API.

This module provides functions to fetch historical OHLCV data from Binance
with TTL caching to minimize API calls.
"""

import os
import time
from typing import Tuple, List, Dict
import pandas as pd
from binance.client import Client
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


class CryptoDataProvider(MarketDataProvider):
    """
    Cryptocurrency market data provider using Binance API.
    """

    def __init__(self):
        # Crypto uses smaller cache size (10 vs 20 for stocks)
        super().__init__(cache_size=10)
        default_symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT',
                           'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'MATICUSDT']
        self._supported_symbols = _configured_symbols("CRYPTO_SYMBOLS", default_symbols)
        self._display_names = {
            'BTCUSDT': 'Bitcoin',
            'ETHUSDT': 'Ethereum',
            'SOLUSDT': 'Solana',
            'XRPUSDT': 'Ripple',
            'BNBUSDT': 'Binance Coin',
            'DOGEUSDT': 'Dogecoin',
            'ADAUSDT': 'Cardano',
            'AVAXUSDT': 'Avalanche',
            'LINKUSDT': 'Chainlink',
            'MATICUSDT': 'Polygon'
        }
        self._client: Client | None = None

    def _get_client(self) -> Client:
        if self._client is None:
            self._client = Client(
                ping=False,
                requests_params={"timeout": 20},
            )
        return self._client

    def get_historical_data(
        self,
        symbol: str,
        lookback: int = 360,
        interval: str = '1h'
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Fetch historical OHLCV data from Binance API with caching.

        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT', 'ETHUSDT', 'XRPUSDT')
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

        print(f"Fetching fresh data from Binance for {symbol}...")

        for attempt in range(1, 4):
            try:
                client = self._get_client()
                klines = client.get_klines(symbol=symbol, interval=interval, limit=lookback)

                df = pd.DataFrame(klines, columns=[
                    'timestamp', 'open', 'high', 'low', 'close', 'volume',
                    'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                    'taker_buy_quote', 'ignore'
                ])

                df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms', utc=True)
                x_timestamp = df['timestamp'].copy()
                df = df[['open', 'high', 'low', 'close', 'volume', 'quote_volume']].astype(float)
                df = df.rename(columns={'quote_volume': 'amount'})

                # Validate data quality
                if len(df) < lookback:
                    print(f"Warning: Only fetched {len(df)} candles, expected {lookback}")

                if df.isnull().any().any() or x_timestamp.isnull().any():
                    print(f"Warning: Data contains NaN values for {symbol}")
                    df.ffill(inplace=True)
                    df.bfill(inplace=True)
                    x_timestamp = x_timestamp.ffill().bfill()
                    if df.isnull().any().any() or x_timestamp.isnull().any():
                        raise Exception(f"Unfillable NaN values present in fetched data for {symbol}")

                self.market_data_cache[cache_key] = (df, x_timestamp)
                print(f"Successfully fetched {len(df)} candles for {symbol}")
                return df, x_timestamp

            except Exception as e:
                self._client = None
                if attempt == 3:
                    print(f"Error fetching data from Binance for {symbol}: {e}")
                    raise

                sleep_seconds = 2 * attempt
                print(f"Warning: Binance fetch failed for {symbol} on attempt {attempt}/3: {e}")
                print(f"Retrying {symbol} in {sleep_seconds}s...")
                time.sleep(sleep_seconds)

    def get_current_price(self, symbol: str) -> float:
        """Get the current price for a cryptocurrency from Binance."""
        try:
            client = self._get_client()
            ticker = client.get_symbol_ticker(symbol=symbol)
            return float(ticker['price'])
        except Exception as e:
            print(f"Error fetching current price for {symbol}: {e}")
            raise

    def validate_symbol(self, symbol: str) -> bool:
        """Validate that a symbol is supported by Binance."""
        try:
            client = self._get_client()
            exchange_info = client.get_exchange_info()
            symbols = [s['symbol'] for s in exchange_info['symbols']]
            return symbol in symbols
        except Exception as e:
            print(f"Error validating symbol {symbol}: {e}")
            return False

    def get_supported_symbols(self) -> List[str]:
        """Get list of supported cryptocurrency symbols."""
        return self._supported_symbols

    def get_symbol_display_names(self) -> Dict[str, str]:
        """Get mapping of symbols to display names."""
        return self._display_names


# Singleton instance for backward compatibility
_provider = CryptoDataProvider()

# Module-level variables for backward compatibility
SUPPORTED_SYMBOLS = _provider.get_supported_symbols()
SYMBOL_DISPLAY_NAMES = _provider.get_symbol_display_names()
market_data_cache = _provider.market_data_cache


# Module-level functions for backward compatibility
def get_historical_data(symbol: str, lookback: int = 360, interval: str = '1h') -> Tuple[pd.DataFrame, pd.Series]:
    """Fetch historical OHLCV data from Binance API with caching."""
    return _provider.get_historical_data(symbol, lookback, interval)


def get_current_price(symbol: str) -> float:
    """Get the current price for a cryptocurrency from Binance."""
    return _provider.get_current_price(symbol)


def validate_symbol(symbol: str) -> bool:
    """Validate that a symbol is supported by Binance."""
    return _provider.validate_symbol(symbol)


def get_supported_assets() -> list[dict]:
    """Get list of supported cryptocurrency assets for predictions."""
    return _provider.get_supported_assets()
