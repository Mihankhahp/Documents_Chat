# syntax=docker/dockerfile:1
FROM python:3.11-slim

# System deps for OCR/PDF and healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    tesseract-ocr \
    libglib2.0-0 \
    libgl1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first for caching
COPY requirements.txt /app/requirements.txt
COPY constraints.txt /app/constraints.txt

# Upgrade pip
RUN pip install --no-cache-dir -U pip

# Install deps with constraints (fast + deterministic)
RUN pip install --no-cache-dir -c /app/constraints.txt -r /app/requirements.txt

# Copy the backend source (expects app/, pyproject optional)
COPY . /app/

# Defaults (overridden by compose env_file)
ENV CHROMA_DIR=/data/chroma_store \
    DB_URL=sqlite:////data/app.db \
    OCR_ENABLED=true \
    ANONYMIZED_TELEMETRY=false

# Persistence
RUN mkdir -p /data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]