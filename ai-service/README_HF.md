---
title: StockWin Prediction API
emoji: 📈
colorFrom: green
colorTo: blue
sdk: docker
app_port: 8000
---

# StockWin Prediction API

AI-powered cryptocurrency prediction API using Kronos foundation model from Tsinghua University.

## Features
- 24-hour price forecasts for BTC, ETH, XRP
- Confidence intervals (25th-75th percentile)
- Hourly automatic updates
- Real-time market data from Binance

## API Endpoints
- `GET /v1/predictions` - Get all predictions
- `GET /v1/predictions/{symbol}` - Get specific prediction
- `GET /v1/health` - Health check

## Model
- **Kronos-mini** (4.1M parameters)
- Trained on 45+ global exchanges
- Transformer architecture for time series
