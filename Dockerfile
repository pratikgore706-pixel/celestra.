# ---------- 1. build the website ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2. API + website on one port ----------
FROM python:3.12-slim
# 1 = include the neural denoiser (DRUNet, ~1 GB larger image). 0 = classical denoiser only.
ARG WITH_DRUNET=1
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    CELESTRA_DATA_DIR=/data CELESTRA_FRONTEND_DIST=/app/frontend/dist \
    HOME=/data/home TORCH_HOME=/data/torch PORT=7860
WORKDIR /app/backend
COPY backend/requirements.txt backend/requirements-science.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-science.txt \
 && if [ "$WITH_DRUNET" = "1" ]; then \
      pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir deepinv; \
    fi
# Run as an unprivileged user (UID 1000, as Hugging Face Spaces expects); data lives in /data.
RUN useradd -m -u 1000 user && mkdir -p /data/home /data/torch && chown -R 1000:1000 /data && chmod -R 777 /data
COPY --chown=1000:1000 backend/app ./app
COPY --chown=1000:1000 --from=web /web/dist /app/frontend/dist
USER 1000
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
