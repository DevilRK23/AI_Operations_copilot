# --- Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Build Backend ---
FROM python:3.10-slim
WORKDIR /app

# Install system compiler and build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend files
COPY backend/ /app/backend/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose default port (Hugging Face default)
EXPOSE 7860

# Configure environment variables
ENV PORT=7860
ENV HF_HOME=/tmp/hf_cache

# Start uvicorn server serving the entire full-stack app
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "7860"]
