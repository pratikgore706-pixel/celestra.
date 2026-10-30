#!/usr/bin/env sh
# Celestra production mode: build the website, then serve site + API on one port.
set -e
cd "$(dirname "$0")"
(cd frontend && npm ci && npm run build)
cd backend
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers
