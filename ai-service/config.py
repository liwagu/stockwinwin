"""
Configuration management for StockWin AI Service.

Loads and validates environment variables required for the application.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Determine environment and load appropriate .env file
ENV = os.getenv("ENV", "development")  # Defaults to development

# Get the directory where this config.py file is located
CONFIG_DIR = Path(__file__).parent.resolve()
env_file = CONFIG_DIR / f".env.{ENV}"

# Load the environment-specific file with absolute path
load_dotenv(env_file)

# Log which environment file was loaded
print(f"[Config] Loaded environment: {ENV} (from {env_file})")
print(f"[Config] SUPABASE_URL loaded: {bool(os.getenv('SUPABASE_URL'))}")
print(f"[Config] SUPABASE_SERVICE_KEY loaded: {bool(os.getenv('SUPABASE_SERVICE_KEY'))}")


class ConfigurationError(Exception):
    """Raised when required configuration is missing or invalid."""
    pass


class Config:
    """Application configuration loaded from environment variables."""

    # Environment
    ENV: str = ENV  # Store the current environment

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_JWT_AUD: str = os.getenv("SUPABASE_JWT_AUD", "authenticated")

    # Stripe Configuration
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_ID: str = os.getenv("STRIPE_PRICE_ID", "")
    STRIPE_PORTAL_CONFIGURATION_ID: str = os.getenv("STRIPE_PORTAL_CONFIGURATION_ID", "")

    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Existing Model Configuration
    MODEL_CACHE_DIR: str = os.getenv("MODEL_CACHE_DIR", "./models/cache")
    KRONOS_MODEL_NAME: str = os.getenv("KRONOS_MODEL_NAME", "NeoQuasar/Kronos-base")
    KRONOS_TOKENIZER_NAME: str = os.getenv("KRONOS_TOKENIZER_NAME", "NeoQuasar/Kronos-Tokenizer-base")
    KRONOS_DEVICE: str = os.getenv("KRONOS_DEVICE", "cpu")
    KRONOS_MAX_CONTEXT: int = int(os.getenv("KRONOS_MAX_CONTEXT", "512"))
    KRONOS_CLIP: int = int(os.getenv("KRONOS_CLIP", "5"))

    # Prediction Settings
    PREDICTION_HORIZON_HOURS: int = int(os.getenv("PREDICTION_HORIZON_HOURS", "24"))
    PREDICTION_SAMPLES: int = int(os.getenv("PREDICTION_SAMPLES", "30"))
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "1.0"))
    TOP_P: float = float(os.getenv("TOP_P", "0.95"))

    # Binance API
    BINANCE_API_TIMEOUT: int = int(os.getenv("BINANCE_API_TIMEOUT", "30"))
    DATA_CACHE_TTL_MINUTES: int = int(os.getenv("DATA_CACHE_TTL_MINUTES", "55"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate_required_keys(cls, require_stripe: bool = False) -> None:
        """
        Validate that all required configuration keys are present.

        Args:
            require_stripe: If True, validate Stripe keys. Set to False during
                          development to allow the service to start without Stripe.

        Raises:
            ConfigurationError: If required configuration is missing.
        """
        required_keys = {
            "SUPABASE_URL": cls.SUPABASE_URL,
            "SUPABASE_SERVICE_KEY": cls.SUPABASE_SERVICE_KEY,
        }

        if require_stripe:
            required_keys.update({
                "STRIPE_SECRET_KEY": cls.STRIPE_SECRET_KEY,
                "STRIPE_WEBHOOK_SECRET": cls.STRIPE_WEBHOOK_SECRET,
                "STRIPE_PRICE_ID": cls.STRIPE_PRICE_ID,
                "STRIPE_PORTAL_CONFIGURATION_ID": cls.STRIPE_PORTAL_CONFIGURATION_ID,
            })

        missing_keys = [key for key, value in required_keys.items() if not value]

        if missing_keys:
            raise ConfigurationError(
                f"Missing required environment variables: {', '.join(missing_keys)}. "
                f"Please check your .env file."
            )

    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development mode."""
        return cls.ENV == "development"

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode."""
        return cls.ENV == "production"

    @classmethod
    def is_stripe_configured(cls) -> bool:
        """Check if Stripe is fully configured."""
        return bool(
            cls.STRIPE_SECRET_KEY and
            cls.STRIPE_WEBHOOK_SECRET and
            cls.STRIPE_PRICE_ID and
            cls.STRIPE_PORTAL_CONFIGURATION_ID
        )


# Singleton instance
config = Config()
