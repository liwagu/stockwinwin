# Kronos Model Integration

This package integrates the Kronos time-series prediction model using the **Model Registry pattern** (industry standard for ML operationalization).

## 🏗️ Architecture: Model Registry Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    AI Service Container                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Inference Code (kronos_integration/)          │    │
│  │  - Model architecture                          │    │
│  │  - Preprocessing logic                         │    │
│  │  - Prediction API                              │    │
│  └────────────────────────────────────────────────┘    │
│                          ↓                               │
│                   At Startup Downloads                   │
│                          ↓                               │
│  ┌────────────────────────────────────────────────┐    │
│  │       Hugging Face Hub (Model Registry)        │    │
│  │  - Model weights (NeoQuasar/Kronos-small)      │    │
│  │  - Tokenizer weights (Kronos-Tokenizer-base)   │    │
│  │  - Cached locally after first download         │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Ship only inference code in containers (smaller images)
- ✅ Version control for model weights separate from code
- ✅ Easy model updates without code changes
- ✅ Support for private models via HuggingFace tokens
- ✅ Automatic caching for faster subsequent loads

---

## 📋 What's Included

### Inference Code (Shipped in Container)
```
ai-service/kronos_integration/
├── __init__.py              # Package initialization
├── predictor.py             # Main prediction logic
├── model/                   # Kronos model architecture
│   ├── __init__.py
│   ├── kronos.py           # Model & Tokenizer classes
│   └── module.py           # Neural network modules
└── README.md               # This file
```

### Model Weights (Downloaded from HuggingFace)
- **Model**: `NeoQuasar/Kronos-small` (~150MB)
- **Tokenizer**: `NeoQuasar/Kronos-Tokenizer-base` (~50MB)
- **Cached at**: `~/.cache/huggingface/` (inside container)

---

## 🚀 Usage

### 1. Environment Variables

```bash
# Operating Mode
KRONOS_MODE=auto              # auto | kronos | simulated
                              # auto: Try Kronos, fallback to simulator
                              # kronos: Require Kronos (fail if unavailable)
                              # simulated: Always use simulator

# Device Configuration
KRONOS_DEVICE=cpu             # cpu | cuda | cuda:0

# Model Registry (HuggingFace Hub)
KRONOS_MODEL_ID=NeoQuasar/Kronos-small
KRONOS_TOKENIZER_ID=NeoQuasar/Kronos-Tokenizer-base

# Model Parameters
KRONOS_MAX_CONTEXT=512        # Maximum context length
KRONOS_CLIP=5                 # Clipping value for normalization

# Optional: Private Models
HF_TOKEN=hf_xxxxxxxxxxxxx     # HuggingFace API token
```

### 2. Docker Compose (Recommended)

```yaml
services:
  ai-service:
    build:
      context: ./ai-service
    environment:
      - KRONOS_MODE=auto
      - KRONOS_MODEL_ID=NeoQuasar/Kronos-small
    volumes:
      # Optional: Persist model cache across restarts
      - ./cache/huggingface:/root/.cache/huggingface
    ports:
      - "5001:5001"
```

```bash
docker-compose up --build
```

### 3. Local Development

```bash
cd ai-service

# Install dependencies
pip install -r requirements.txt

# Run with Kronos model
KRONOS_MODE=kronos python main.py

# Run with simulator (no model download)
KRONOS_MODE=simulated python main.py
```

---

## 🔑 HuggingFace Setup

### Option A: Use Public Pre-trained Models (Easiest)

The default models are public:
- ✅ No account needed
- ✅ No token required
- ✅ Ready to use out of the box

```bash
docker-compose up --build
# Models automatically download from HuggingFace
```

### Option B: Upload Your Own Models

If you have custom-trained Kronos weights:

1. **Install HuggingFace CLI**:
```bash
pip install huggingface_hub
huggingface-cli login
```

2. **Upload Tokenizer**:
```python
from kronos_integration.model import KronosTokenizer

# Load your trained tokenizer
tokenizer = KronosTokenizer.from_pretrained('./path/to/your/tokenizer')

# Push to HuggingFace
tokenizer.push_to_hub('YOUR_USERNAME/kronos-tokenizer-custom')
```

3. **Upload Model**:
```python
from kronos_integration.model import Kronos

# Load your trained model
model = Kronos.from_pretrained('./path/to/your/model')

# Push to HuggingFace
model.push_to_hub('YOUR_USERNAME/kronos-model-custom')
```

4. **Update Environment Variables**:
```bash
KRONOS_MODEL_ID=YOUR_USERNAME/kronos-model-custom
KRONOS_TOKENIZER_ID=YOUR_USERNAME/kronos-tokenizer-custom
```

### Option C: Private Models

For private/proprietary models:

1. **Create HuggingFace token**: https://huggingface.co/settings/tokens

2. **Set token in environment**:
```bash
export HF_TOKEN=hf_xxxxxxxxxxxxx
```

3. **Update docker-compose.yml**:
```yaml
services:
  ai-service:
    environment:
      - HF_TOKEN=${HF_TOKEN}
      - KRONOS_MODEL_ID=YOUR_ORG/private-kronos-model
```

---

## 🧪 Testing

### Test Prediction Endpoint

```bash
# Using curl
curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{"isin": "US67066G1040", "horizon_days": 5}'

# Using test script
./test-api.sh
```

### Expected Response (Kronos Mode)

```json
{
  "isin": "US67066G1040",
  "model": "kronos",
  "model_version": "NeoQuasar/Kronos-small",
  "prediction_horizon_days": 5,
  "current_price": 100.0,
  "predictions": [
    {
      "day": 1,
      "predicted_price": 101.23,
      "confidence": 0.85
    },
    ...
  ],
  "metadata": {
    "device": "cpu",
    "max_context": 512,
    "lookback_periods": 400,
    "prediction_periods": 390
  }
}
```

---

## 🔧 Troubleshooting

### Issue: Model Download Fails

```
Error: Failed to download model from NeoQuasar/Kronos-small
```

**Solutions:**
1. Check internet connection
2. Verify model ID exists on HuggingFace
3. For private models, ensure `HF_TOKEN` is set correctly
4. Try with `KRONOS_MODE=simulated` to use simulator

### Issue: Out of Memory

```
RuntimeError: CUDA out of memory
```

**Solutions:**
1. Use CPU: `KRONOS_DEVICE=cpu`
2. Reduce context: `KRONOS_MAX_CONTEXT=256`
3. Use smaller model: `KRONOS_MODEL_ID=NeoQuasar/Kronos-base`

### Issue: Slow First Startup

**Expected behavior**: First startup downloads ~200MB of model weights (1-5 min).

**Solutions:**
1. Persist cache: Mount volume `-v ./cache:/root/.cache/huggingface`
2. Pre-download models in Dockerfile (see Advanced section below)
3. Use `KRONOS_MODE=simulated` for development

---

## 🚀 Advanced: Production Deployment

### 1. Pre-download Models in Docker Image

```dockerfile
# ai-service/Dockerfile
FROM python:3.12-slim

# ... existing setup ...

# Pre-download models during build (no runtime download)
RUN python -c "
from huggingface_hub import snapshot_download
snapshot_download('NeoQuasar/Kronos-small')
snapshot_download('NeoQuasar/Kronos-Tokenizer-base')
"

COPY . .
CMD ["python", "main.py"]
```

### 2. Use MLflow Model Registry

For enterprise deployments, consider MLflow:

```python
# Alternative: MLflow registry
import mlflow

model_uri = "models:/kronos-production/latest"
model = mlflow.pytorch.load_model(model_uri)
```

### 3. GPU Deployment

```yaml
# docker-compose.gpu.yml
services:
  ai-service:
    environment:
      - KRONOS_DEVICE=cuda:0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

---

## 📚 Further Reading

- [HuggingFace Hub Documentation](https://huggingface.co/docs/hub/index)
- [PyTorch Model Hub Mixin](https://huggingface.co/docs/huggingface_hub/package_reference/mixins)
- [Kronos Model Paper](ref/Kronos/README.md)
- [Model Registry Best Practices](https://ml-ops.org/content/model-registry)

---

## 🔄 Migration Path

### Current State (Simulator)
```python
KRONOS_MODE=simulated  # Statistical simulator
```

### Testing Real Model
```python
KRONOS_MODE=auto       # Try Kronos, fallback to simulator
```

### Production with Real Model
```python
KRONOS_MODE=kronos     # Require Kronos (fail if unavailable)
HF_TOKEN=hf_xxx        # For private models
```

---

## 🤝 Contributing

To add new model versions:

1. Train model using `ref/Kronos/finetune/`
2. Push to HuggingFace: `model.push_to_hub('YOUR_USERNAME/kronos-v2')`
3. Update environment: `KRONOS_MODEL_ID=YOUR_USERNAME/kronos-v2`
4. Test with `KRONOS_MODE=kronos`
5. Update this README with new model ID
