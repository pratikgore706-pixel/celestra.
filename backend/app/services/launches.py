"""Upcoming rocket launches from Launch Library 2 (The Space Devs). Free tier is rate
limited (about 15 calls/hour), so results are cached for an hour."""
from __future__ import annotations

from ..cache import cached_get

URL = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/"
SOURCE = "Launch Library 2 (The Space Devs)"


async def upcoming(limit: int = 12) -> tuple[list[dict], bool]:
    data, cached = await cached_get(URL, {"limit": limit, "mode": "normal"}, ttl=3600)
    out = []
    for r in data.get("results", []):
        pad = r.get("pad") or {}
        loc = pad.get("location") or {}
        lsp = r.get("launch_service_provider") or {}
        status = r.get("status") or {}
        out.append({
            "id": f"launch-{r.get('id')}",
            "type": "launch",
            "title": r.get("name"),
            "start": r.get("net"),
            "visible": None,
            "detail": {
                "provider": lsp.get("name"),
                "status": status.get("abbrev") or status.get("name"),
                "pad": pad.get("name"),
                "location": loc.get("name"),
                "window_start": r.get("window_start"),
                "window_end": r.get("window_end"),
            },
            "source": SOURCE,
            "url": "https://thespacedevs.com/llapi",
            "status": "cached" if cached else "live",
        })
    return out, cached
