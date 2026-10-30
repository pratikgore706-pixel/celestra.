"""Visible ISS passes: CelesTrak orbit data (TLE) + skyfield.

A pass is "visible" only when the station is sunlit AND the observer's sky is dark
(Sun below -6 deg). Many apps skip this and list passes you cannot actually see.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import astronomy as ae

from ..cache import cached_text
from .sky import altaz, observer

TLE_URL = "https://celestrak.org/NORAD/elements/gp.php"
from ..config import DATA_DIR as _DATA

DATA_DIR = _DATA / ".skyfield"

_eph = None


def _ephemeris():
    """de421.bsp (~17 MB, downloaded once) is needed for the sunlit check."""
    global _eph
    if _eph is None:
        from skyfield.api import Loader
        _eph = Loader(str(DATA_DIR))("de421.bsp")
    return _eph


async def passes(lat: float, lon: float, days: int = 7, min_alt: float = 10.0) -> tuple[list[dict], list[str]]:
    """Fetch the TLE (async), then do the orbit maths and the one-time ephemeris download in a
    worker thread so the server keeps answering other requests meanwhile."""
    import asyncio
    text = await cached_text(TLE_URL, {"CATNR": "25544", "FORMAT": "TLE"}, ttl=6 * 3600)
    return await asyncio.to_thread(_compute, text, lat, lon, days, min_alt)


def _compute(text: str, lat: float, lon: float, days: int, min_alt: float) -> tuple[list[dict], list[str]]:
    from skyfield.api import EarthSatellite, load, wgs84

    warnings: list[str] = []
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    if len(lines) < 3:
        raise ValueError("CelesTrak returned no orbit data")
    ts = load.timescale()
    sat = EarthSatellite(lines[1], lines[2], lines[0], ts)
    topos = wgs84.latlon(lat, lon)
    now = datetime.now(timezone.utc)
    t0, t1 = ts.from_datetime(now), ts.from_datetime(now + timedelta(days=days))
    times, events = sat.find_events(topos, t0, t1, altitude_degrees=min_alt)

    try:
        eph = _ephemeris()
    except Exception as e:
        eph = None
        warnings.append(f"Sunlit check unavailable ({type(e).__name__}); showing passes during darkness only.")

    obs = observer(lat, lon)
    out: list[dict] = []
    cur: dict = {}
    for ti, ev in zip(times, events):
        dt = ti.utc_datetime()
        alt, az, _ = (sat - topos).at(ti).altaz()
        if ev == 0:
            cur = {"start": dt.isoformat(), "start_az": int(round(float(az.degrees)))}
        elif ev == 1 and cur:
            cur.update({"peak": dt.isoformat(), "max_alt": round(float(alt.degrees), 1), "peak_az": int(round(float(az.degrees)))})
            cur["_peak_t"] = ti
        elif ev == 2 and cur.get("peak"):
            cur.update({"end": dt.isoformat(), "end_az": int(round(float(az.degrees)))})
            pk = cur.pop("_peak_t")
            sun_alt, _ = altaz(ae.Body.Sun, datetime.fromisoformat(cur["peak"]), obs)
            sunlit = bool(sat.at(pk).is_sunlit(eph)) if eph is not None else None
            dark = sun_alt < -6
            cur["sun_alt"] = round(sun_alt, 1)
            cur["sunlit"] = sunlit
            cur["visible"] = dark and (sunlit is not False)
            cur["duration_s"] = int((datetime.fromisoformat(cur["end"]) - datetime.fromisoformat(cur["start"])).total_seconds())
            if cur["visible"]:
                out.append(cur)
            cur = {}
    return out, warnings


def compass(az: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[int(((az + 22.5) % 360) // 45)]
