FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    KRONOS_DEVICE=cpu \
    KRONOS_MODEL_NAME=NeoQuasar/Kronos-base \
    KRONOS_TOKENIZER_NAME=NeoQuasar/Kronos-Tokenizer-base \
    KRONOS_MAX_CONTEXT=512 \
    KRONOS_CLIP=5 \
    MODEL_CACHE_DIR=./models/cache

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

# Install Python dependencies (includes torch and huggingface_hub for Model Registry pattern)
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Model Registry Pattern:
# - Inference code is shipped in the container (kronos_integration/)
# - Model weights are downloaded from Hugging Face Hub at startup

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
