"""Fallback cache: remember the last good answer for each data request and serve it
(marked status "cached") if the live service fails later."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qsl

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .config import FALLBACK_DIR as DIR

DIR.mkdir(parents=True, exist_ok=True)
PATHS = re.compile(r"^/api/(watchtower|score|geocode|sky/(moon|month|upcoming|iss|launches))$")


def _key(request: Request) -> Path:
    q = []
    for k, v in sorted(parse_qsl(request.url.query)):
        if k in ("lat", "lon"):
            try:
                v = f"{float(v):.2f}"
            except ValueError:
                pass
        q.append(f"{k}={v}")
    raw = request.url.path + "?" + "&".join(q)
    return DIR / (hashlib.sha1(raw.encode()).hexdigest()[:20] + ".json")


class DemoCache(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method != "GET" or not PATHS.match(request.url.path):
            return await call_next(request)
        f = _key(request)
        try:
            resp = await call_next(request)
        except Exception:
            resp = None
        if resp is not None and resp.status_code == 200:
            body = b"".join([chunk async for chunk in resp.body_iterator])
            try:
                f.write_bytes(body)
            except OSError:
                pass
            return Response(body, status_code=200, media_type="application/json", headers={"x-celestra": "live"})
        if f.exists():
            data = json.loads(f.read_text())
            if isinstance(data, dict) and "meta" in data:
                data["meta"]["status"] = "cached"
                data["meta"]["note"] = "Live service unavailable; showing the last good answer."
            return JSONResponse(data, headers={"x-celestra": "cached"})
        return resp if resp is not None else JSONResponse({"detail": "Service unavailable and nothing cached yet."}, status_code=503)
