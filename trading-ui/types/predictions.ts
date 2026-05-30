/**
 * Shared type definitions for prediction data across the application.
 * These types represent the structure of prediction data from the AI service.
 */

/**
 * A single prediction point in the forecast timeline
 */
export interface PredictionPoint {
  hour_offset: number;
  timestamp: string;
  predicted_price: number;
  confidence_lower: number;
  confidence_upper: number;
}

/**
 * A single historical data point for price history
 */
export interface HistoricalDataPoint {
  timestamp: string;
  price: number;
}

/**
 * Complete prediction data for a single asset (crypto or stock)
 */
export interface CryptoPrediction {
  symbol: string;
  display_name: string;
  current_price: number;
  forecast_timestamp: string;
  prediction_horizon_hours: number;
  predictions: PredictionPoint[];
  historical_data: HistoricalDataPoint[];
  model_version: string;
  confidence_score: number;
}

/**
 * Response containing multiple predictions and metadata
 */
export interface PredictionForecast {
  predictions: CryptoPrediction[];
  generated_at: string;
}
