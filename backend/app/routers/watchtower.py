from __future__ import annotations

import asyncio
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Query

from ..meta import envelope
from ..services import places, scoring, sky, weather

router = APIRouter(prefix="/api")

MODES = tuple(scoring.WEIGHTS)


def _day(d: str | None) -> date:
    return date.fromisoformat(d) if d else date.today()


@router.get("/geocode")
async def geocode(q: str = Query(min_length=2), lang: str = "en"):
    try:
        res = await weather.geocode(q, lang)
    except Exception as e:
        raise HTTPException(502, f"Place search is unavailable right now ({type(e).__name__}).")
    return envelope(res, source="Open-Meteo Geocoding", status="live")


@router.get("/sky/moon")
async def moon(lat: float, lon: float):
    return envelope(sky.moon_info(lat, lon), source="astronomy-engine", status="computed")


@router.get("/score")
async def score(lat: float, lon: float, date: str | None = None, mode: str = "casual"):
    if mode not in MODES:
        raise HTTPException(400, f"mode must be one of {MODES}")
    day = _day(date)
    try:
        locs, cached = await weather.forecast([(lat, lon)], day)
    except Exception as e:
        raise HTTPException(502, f"Weather forecast is unavailable right now ({type(e).__name__}).")
    loc = locs[0]
    sunset, sunrise = sky.night_window(lat, lon, datetime(day.year, day.month, day.day), loc.get("utc_offset_seconds", 0))
    _, towns, _ = await places.fetch_places(lat, lon)
    lp_pen, lp_near = places.light_pollution_penalty((lat, lon), towns)
    res = await asyncio.to_thread(scoring.score_location, loc, lat, lon, sunset, sunrise, mode, lp_pen)
    res["lp_near"] = lp_near
    res["night"] = {"sunset": sunset.isoformat(), "sunrise": sunrise.isoformat()}
    return envelope(res, source="Open-Meteo + astronomy-engine", status="cached" if cached else "live",
                    formula_version=scoring.VERSION)


@router.get("/watchtower")
async def watchtower(lat: float, lon: float, date: str | None = None, mode: str = "casual", radius_km: int = 40):
    if mode not in MODES:
        raise HTTPException(400, f"mode must be one of {MODES}")
    day = _day(date)
    warnings: list[str] = []

    found, towns, warn = await places.fetch_places(lat, lon, radius_km)
    if warn:
        warnings.append(warn)
    candidates = places.pick_candidates(found, towns, (lat, lon))
    here_pen, here_near = places.light_pollution_penalty((lat, lon), towns)
    here = {"id": "here", "name": "Selected point", "type": "here", "lat": lat, "lon": lon,
            "dist_km": 0.0, "lp_penalty": here_pen, "lp_near": here_near, "osm_url": None}
    allpts = [here] + candidates

    try:
        locs, cached = await weather.forecast([(p["lat"], p["lon"]) for p in allpts], day)
    except Exception as e:
        raise HTTPException(502, f"Weather forecast is unavailable right now ({type(e).__name__}).")

    offset = locs[0].get("utc_offset_seconds", 0)
    sunset, sunrise = sky.night_window(lat, lon, datetime(day.year, day.month, day.day), offset)

    def score_all():
        return [p | {"score": scoring.score_location(loc, p["lat"], p["lon"], sunset, sunrise, mode, p["lp_penalty"])}
                for p, loc in zip(allpts, locs)]

    out = await asyncio.to_thread(score_all)  # CPU-heavy: keep the server responsive
    here_scored = out[0]
    spots = sorted(out[1:], key=lambda x: x["score"]["headline"], reverse=True)

    return envelope(
        {
            "here": here_scored,
            "spots": spots,
            "night": {"sunset": sunset.isoformat(), "sunrise": sunrise.isoformat(),
                      "utc_offset_seconds": offset, "timezone": locs[0].get("timezone")},
            "mode": mode,
            "date": day.isoformat(),
            "warnings": warnings,
        },
        source="Open-Meteo + OpenStreetMap + astronomy-engine",
        status="cached" if cached else "live",
        formula_version=scoring.VERSION,
    )
