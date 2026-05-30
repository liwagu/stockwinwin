# Kronos AI Prediction Service

FastAPI microservice that serves 24h cryptocurrency price predictions (BTC, ETH, XRP) using the Kronos model.

## Features

- Hourly-updated predictions with confidence intervals
- Health and assets endpoints
- CORS enabled for frontend integration

## Quick start (local Python)

1) Create a virtual environment and install deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Run the API (default port 8000)

```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000/docs and check health:

```bash
curl http://localhost:8000/v1/health
```

Note: On first run the Kronos model and tokenizer will be downloaded from Hugging Face; keep internet access enabled.

## Run with Docker

Build and run just this service:

```bash
docker build -t stockwin-ai-service .
docker run --rm -p 8000:8000 \
  -v $(pwd)/../cache/huggingface:/root/.cache/huggingface \
  -e MODEL_CACHE_DIR=./models/cache \
  -e KRONOS_MODEL_NAME=NeoQuasar/Kronos-base \
  -e KRONOS_TOKENIZER_NAME=NeoQuasar/Kronos-Tokenizer-base \
  stockwin-ai-service
```

## Run with docker compose (service only)

From the repository root:

```bash
docker compose up ai-service
```

The API will be available at http://localhost:8000

## Key environment variables

- MODEL_CACHE_DIR: Path to store model files (default: `./models/cache`)
- KRONOS_MODEL_NAME: Hugging Face model id (default: `NeoQuasar/Kronos-base`)
- KRONOS_TOKENIZER_NAME: Hugging Face tokenizer id (default: `NeoQuasar/Kronos-Tokenizer-base`)
- PREDICTION_HORIZON_HOURS: Hours to predict (default: 24)
- PREDICTION_SAMPLES: Monte Carlo samples (default: 30)
- TEMPERATURE, TOP_P: Sampling parameters

## API Endpoints (v1)

- GET `/` — Service info
- GET `/v1/health` — Health check
- GET `/v1/assets` — Supported assets
- GET `/v1/predictions` — Predictions for all assets
- GET `/v1/predictions/{symbol}` — Prediction for a symbol (BTCUSDT, ETHUSDT, XRPUSDT)

Legacy endpoints `/health` remain for backward compatibility.

