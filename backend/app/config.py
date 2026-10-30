"""Runtime settings, read from environment variables (all optional)."""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

# Where Celestra keeps its database, HTTP cache, fallback responses and image jobs.
DATA_DIR = Path(os.getenv("CELESTRA_DATA_DIR", str(BACKEND_DIR))).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "celestra.db"
CACHE_DIR = DATA_DIR / ".cache"
FALLBACK_DIR = DATA_DIR / "demo-cache"
JOBS_DIR = DATA_DIR / "storage" / "jobs"

# Comma-separated list of allowed browser origins, or "*" for any.
CORS_ORIGINS = [o.strip() for o in os.getenv("CELESTRA_CORS_ORIGINS", "*").split(",") if o.strip()]

# Built website (npm run build). When present, the API server also serves it.
FRONTEND_DIST = Path(os.getenv("CELESTRA_FRONTEND_DIST", str(ROOT_DIR / "frontend" / "dist"))).resolve()

USER_AGENT = os.getenv("CELESTRA_USER_AGENT", "Celestra/1.0 (+https://github.com/celestra)")
