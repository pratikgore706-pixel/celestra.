"""Disk cache around httpx GET: respects upstream rate limits and keeps working on a flaky network."""
import hashlib
import json
from pathlib import Path

import diskcache
import httpx

from .config import CACHE_DIR, USER_AGENT
_cache = diskcache.Cache(str(CACHE_DIR))
_client = httpx.AsyncClient(timeout=20.0, headers={"User-Agent": USER_AGENT})


def _key(url: str, params: dict | None) -> str:
    raw = url + json.dumps(params or {}, sort_keys=True)
    return hashlib.sha1(raw.encode()).hexdigest()


async def cached_get(url: str, params: dict | None = None, ttl: int = 1800) -> tuple[dict, bool]:
    """Return (json, from_cache)."""
    key = _key(url, params)
    hit = _cache.get(key)
    if hit is not None:
        return hit, True
    r = await _client.get(url, params=params)
    r.raise_for_status()
    data = r.json()
    _cache.set(key, data, expire=ttl)
    return data, False


async def cached_text(url: str, params: dict | None = None, ttl: int = 3600) -> str:
    """Same as cached_get but for plain-text responses (e.g. TLE files)."""
    key = "txt:" + _key(url, params)
    hit = _cache.get(key)
    if hit is not None:
        return hit
    r = await _client.get(url, params=params)
    r.raise_for_status()
    _cache.set(key, r.text, expire=ttl)
    return r.text
