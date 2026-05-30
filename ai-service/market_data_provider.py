"""
Abstract base class for market data providers.

This module defines the interface that all market data providers (crypto, stocks, etc.)
must implement to ensure consistency across the application.
"""

from abc import ABC, abstractmethod
from typing import Tuple, Dict, List
import pandas as pd
from cachetools import TTLCache
import os


class MarketDataProvider(ABC):
    """
    Abstract base class for fetching market data from various sources.

    All market data providers must implement this interface to ensure
    consistency in how data is fetched and cached.
    """

    def __init__(self, cache_ttl_minutes: int = None, cache_size: int = 20):
        """
        Initialize the market data provider with caching.

        Args:
            cache_ttl_minutes: Cache time-to-live in minutes (default: from env or 55)
            cache_size: Maximum number of items in cache (default: 20)
        """
        if cache_ttl_minutes is None:
            cache_ttl_minutes = int(os.getenv("DATA_CACHE_TTL_MINUTES", "55"))

        self.cache_ttl_minutes = cache_ttl_minutes
        self.market_data_cache = TTLCache(maxsize=cache_size, ttl=cache_ttl_minutes * 60)

    @abstractmethod
    def get_historical_data(
        self,
        symbol: str,
        lookback: int = 360,
        interval: str = '1h'
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Fetch historical OHLCV data with caching.

        Args:
            symbol: Asset symbol (e.g., 'BTCUSDT', 'AAPL')
            lookback: Number of candles to fetch (default: 360)
            interval: Candle interval (default: '1h')

        Returns:
            Tuple of (DataFrame with OHLCV columns, Series of timestamps)

            DataFrame must have these columns:
            - open: Opening price
            - high: Highest price
            - low: Lowest price
            - close: Closing price
            - volume: Trading volume
            - amount: Dollar/quote volume

        Raises:
            Exception: If data fetching fails
        """
        pass

    @abstractmethod
    def get_current_price(self, symbol: str) -> float:
        """
        Get the current price for an asset.

        Args:
            symbol: Asset symbol

        Returns:
            Current price as float

        Raises:
            Exception: If price fetching fails
        """
        pass

    @abstractmethod
    def validate_symbol(self, symbol: str) -> bool:
        """
        Validate that a symbol is supported by the data provider.

        Args:
            symbol: Asset symbol

        Returns:
            True if symbol exists, False otherwise
        """
        pass

    @abstractmethod
    def get_supported_symbols(self) -> List[str]:
        """
        Get list of supported asset symbols.

        Returns:
            List of supported symbol strings
        """
        pass

    @abstractmethod
    def get_symbol_display_names(self) -> Dict[str, str]:
        """
        Get mapping of symbols to display names.

        Returns:
            Dictionary mapping symbol to display name
        """
        pass

    def get_supported_assets(self) -> List[Dict]:
        """
        Get list of supported assets with metadata.

        This method provides a default implementation that generates
        asset metadata from supported symbols and display names.
        Subclasses can override if custom behavior is needed.

        Returns:
            List of asset dictionaries with symbol, display_name, etc.
        """
        symbols = self.get_supported_symbols()
        display_names = self.get_symbol_display_names()

        assets = []
        for symbol in symbols:
            # Determine base and quote currency
            base_currency = symbol
            quote_currency = ""

            # Extract base/quote for crypto pairs
            if "USDT" in symbol:
                base_currency = symbol.replace("USDT", "")
                quote_currency = "USDT"
            # For stocks, just use the ticker as base
            else:
                base_currency = symbol
                quote_currency = "USD"

            assets.append({
                'symbol': symbol,
                'display_name': display_names.get(symbol, symbol),
                'base_currency': base_currency,
                'quote_currency': quote_currency,
                'is_active': True
            })

        return assets

    def clear_cache(self):
        """Clear the market data cache."""
        self.market_data_cache.clear()
