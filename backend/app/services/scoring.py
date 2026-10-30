"""Night Honor Score v2 (formula version "nhs-2.0").

Per hour, each component is 0-100:
  C  clear sky     = 100 * (1 - effective cloud), effective = 1-(1-low)(1-mid)(1-0.8*high)
  T  transparency  = visibility mapped 0 km -> 0, >=24 km -> 100; -25 if temp-dew < 2 C
  D  darkness      = 0 if sun > -12, 50 if -12..-18, 100 below; minus moon glow and light pollution
  S  steadiness    = 100 at <=10 km/h wind, linear to 0 at 40 km/h
  M  moon/planets  = (moon & planets mode only) 100*sin(moon alt) when up, 0 when down
  G  rain gate     = x1.0 if rain chance <30%, x0.6 if <60%, else x0.2

  NHS = G * sum(w_i * X_i)   weights depend on observing mode, renormalised if a value is missing.
Headline = best rolling 2-hour mean between sunset and sunrise.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import astronomy as ae

from .sky import altaz, moon_illum, observer, sin_deg

VERSION = "nhs-2.0"

WEIGHTS = {
    "deep": {"C": 0.45, "T": 0.20, "D": 0.30, "S": 0.05},
    "moon": {"C": 0.45, "T": 0.15, "S": 0.25, "M": 0.15},
    "meteor": {"C": 0.50, "T": 0.10, "D": 0.35, "S": 0.05},
    "casual": {"C": 0.50, "T": 0.20, "D": 0.20, "S": 0.10},
}

BANDS = [(80, "shogun"), (60, "clear"), (40, "mist"), (0, "storm")]


def band(score: float) -> str:
    for lo, name in BANDS:
        if score >= lo:
            return name
    return "storm"


def clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def components(h: dict, sun_alt: float, moon_alt: float, moon_ill: float, lp_pen: float) -> dict:
    out: dict = {}
    low, mid, high = h.get("cloud_cover_low"), h.get("cloud_cover_mid"), h.get("cloud_cover_high")
    if None not in (low, mid, high):
        eff = 1 - (1 - low / 100) * (1 - mid / 100) * (1 - 0.8 * high / 100)
        out["C"] = clamp(100 * (1 - eff))
    elif h.get("cloud_cover") is not None:
        out["C"] = clamp(100 - h["cloud_cover"])

    vis = h.get("visibility")
    if vis is not None:
        t = clamp(vis / 24000 * 100)
        temp, dew = h.get("temperature_2m"), h.get("dew_point_2m")
        if temp is not None and dew is not None and temp - dew < 2:
            t = clamp(t - 25)
        out["T"] = t

    d = 0.0 if sun_alt > -12 else 50.0 if sun_alt > -18 else 100.0
    if moon_alt > 0:
        d -= moon_ill * sin_deg(moon_alt) * 60
    d -= lp_pen
    out["D"] = clamp(d)

    wind = h.get("wind_speed_10m")
    if wind is not None:
        out["S"] = clamp(100 - (wind - 10) / 30 * 100) if wind > 10 else 100.0

    out["M"] = clamp(100 * sin_deg(moon_alt)) if moon_alt > 0 else 0.0

    p = h.get("precipitation_probability")
    out["G"] = 1.0 if p is None or p < 30 else 0.6 if p < 60 else 0.2
    return out


def weighted(comp: dict, mode: str) -> tuple[float, list[str]]:
    w = WEIGHTS[mode]
    have = {k: v for k, v in w.items() if k in comp}
    missing = [k for k in w if k not in comp]
    total_w = sum(have.values()) or 1
    s = sum(comp[k] * v for k, v in have.items()) / total_w
    return comp["G"] * s, missing


def score_location(loc: dict, lat: float, lon: float, sunset: datetime, sunrise: datetime,
                   mode: str, lp_pen: float = 0.0) -> dict:
    """loc is one Open-Meteo location object (timezone=auto, local times)."""
    hourly = loc["hourly"]
    offset = timedelta(seconds=loc.get("utc_offset_seconds", 0))
    obs = observer(lat, lon, loc.get("elevation") or 0)
    keys = [k for k in hourly if k != "time"]
    hours = []
    missing_all: set[str] = set()
    for i, ts in enumerate(hourly["time"]):
        t_utc = (datetime.fromisoformat(ts) - offset).replace(tzinfo=timezone.utc)
        if t_utc < sunset - timedelta(minutes=30) or t_utc > sunrise + timedelta(minutes=30):
            continue
        h = {k: hourly[k][i] for k in keys}
        sun_alt, _ = altaz(ae.Body.Sun, t_utc, obs)
        moon_alt, _ = altaz(ae.Body.Moon, t_utc, obs)
        ill = moon_illum(t_utc)
        comp = components(h, sun_alt, moon_alt, ill, lp_pen)
        sc, missing = weighted(comp, mode)
        missing_all.update(missing)
        hours.append({
            "t": t_utc.isoformat(),
            "local": ts,
            "score": round(sc, 1),
            "C": round(comp.get("C", 0), 1) if "C" in comp else None,
            "T": round(comp["T"], 1) if "T" in comp else None,
            "D": round(comp["D"], 1),
            "S": round(comp["S"], 1) if "S" in comp else None,
            "M": round(comp["M"], 1),
            "G": comp["G"],
            "sun_alt": round(sun_alt, 1),
            "moon_alt": round(moon_alt, 1),
            "cloud": h.get("cloud_cover"),
            "humidity": h.get("relative_humidity_2m"),
            "visibility_km": round(h["visibility"] / 1000, 1) if h.get("visibility") is not None else None,
            "wind_kmh": h.get("wind_speed_10m"),
            "rain_pct": h.get("precipitation_probability"),
            "temp_c": h.get("temperature_2m"),
        })

    best, best_i = -1.0, 0
    for i in range(len(hours)):
        win = hours[i:i + 2]
        m = sum(x["score"] for x in win) / len(win)
        if m > best:
            best, best_i = m, i
    window = hours[best_i:best_i + 2] if hours else []
    headline = round(max(best, 0), 1)

    def avg(k: str):
        vals = [x[k] for x in window if x.get(k) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    now = datetime.now(timezone.utc)
    lead_h = (datetime.fromisoformat(window[0]["t"]) - now).total_seconds() / 3600 if window else 999
    conf = "high" if lead_h < 24 else "medium" if lead_h < 72 else "low"
    if missing_all and conf == "high":
        conf = "medium"

    return {
        "headline": headline,
        "band": band(headline),
        "window": {"start": window[0]["t"], "end": (datetime.fromisoformat(window[-1]["t"]) + timedelta(hours=1)).isoformat()} if window else None,
        "breakdown": {k: avg(k) for k in ("C", "T", "D", "S", "M")} | {"G": avg("G")},
        "weights": WEIGHTS[mode],
        "confidence": conf,
        "missing": sorted(missing_all),
        "light_pollution_penalty": lp_pen,
        "hours": hours,
        "elevation": loc.get("elevation"),
        "formula_version": VERSION,
    }
