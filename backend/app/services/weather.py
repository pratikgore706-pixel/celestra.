"""Open-Meteo hourly forecast for many points in one request (free, no key)."""
from __future__ import annotations

from datetime import date, timedelta

from ..cache import cached_get

URL = "https://api.open-meteo.com/v1/forecast"
GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
HOURLY = [
    "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
    "relative_humidity_2m", "dew_point_2m", "temperature_2m", "visibility",
    "wind_speed_10m", "precipitation_probability",
]


async def forecast(points: list[tuple[float, float]], day: date) -> tuple[list[dict], bool]:
    """Returns one Open-Meteo location object per point, plus whether it came from cache."""
    params = {
        "latitude": ",".join(f"{p[0]:.4f}" for p in points),
        "longitude": ",".join(f"{p[1]:.4f}" for p in points),
        "hourly": ",".join(HOURLY),
        "timezone": "auto",
        "start_date": day.isoformat(),
        "end_date": (day + timedelta(days=1)).isoformat(),
        "wind_speed_unit": "kmh",
    }
    data, cached = await cached_get(URL, params, ttl=1800)
    locs = data if isinstance(data, list) else [data]
    return locs, cached


async def geocode(q: str, lang: str = "en") -> list[dict]:
    data, _ = await cached_get(GEO_URL, {"name": q, "count": 6, "language": lang, "format": "json"}, ttl=86400)
    out = []
    for r in data.get("results", []) or []:
        out.append({
            "name": r.get("name"),
            "admin": r.get("admin1"),
            "country": r.get("country"),
            "lat": r.get("latitude"),
            "lon": r.get("longitude"),
        })
    return out
