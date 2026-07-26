FROM python:3.11-slim

# Install system dependencies required by Tesseract OCR and OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Pre-train the crop recommendation model if the .pkl is not already present
RUN python -c "import os; os.path.exists('app/ml/crop_model.pkl') or __import__('subprocess').run(['python', '-m', 'app.ml.train_crop_model'], check=True)"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
