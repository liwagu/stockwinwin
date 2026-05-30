"""
Kronos model integration package.
Provides inference code for the Kronos time-series prediction model.
Model weights are loaded from Hugging Face Hub.
"""

from .predictor import KronosPredictorBackend

__all__ = ['KronosPredictorBackend']
