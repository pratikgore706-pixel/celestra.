from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from ..db import get_session
from ..meta import envelope
from ..models import Observation
from ..services import honor, scoring, sky, weather

router = APIRouter(prefix="/api/honor")


class ObsIn(BaseModel):
    lat: float
    lon: float
    place_name: str = ""
    event_type: str = "sky"
    event_id: str | None = None
    event_title: str | None = None
    event_start: str | None = None
    note: str = ""


async def _score_now(lat: float, lon: float) -> float | None:
    """Night Honor Score at this place for the current hour (None if the forecast is unreachable)."""
    try:
        now = datetime.now(timezone.utc)
        locs, _ = await weather.forecast([(lat, lon)], (now - timedelta(hours=12)).date())
        loc = locs[0]
        off = loc.get("utc_offset_seconds", 0)
        local_day = (now + timedelta(seconds=off) - timedelta(hours=12)).date()
        ss, sr = sky.night_window(lat, lon, datetime(local_day.year, local_day.month, local_day.day), off)
        res = scoring.score_location(loc, lat, lon, min(ss, now - timedelta(hours=1)), max(sr, now + timedelta(hours=1)), "casual")
        hours = sorted(res["hours"], key=lambda h: abs(datetime.fromisoformat(h["t"]) - now))
        return hours[0]["score"] if hours else None
    except Exception:
        return None


@router.post("/observations")
async def log_observation(o: ObsIn, s: Session = Depends(get_session)):
    score = await _score_now(o.lat, o.lon)
    row = Observation(**o.model_dump(exclude={"event_start"}), sky_score=score, sky_verified=bool(score is not None and score >= 60))
    s.add(row)
    s.commit()
    s.refresh(row)
    obs = row.model_dump()
    awarded = []
    for action, ok in (("log", True), ("verified", obs["sky_verified"])):
        if ok and (tx := honor.award(action, f"obs-{obs['id']}", s)):
            awarded.append(tx.model_dump())
    if o.event_id and o.event_start:
        dt = abs(datetime.fromisoformat(o.event_start) - datetime.now(timezone.utc))
        if dt <= timedelta(hours=3) and (tx := honor.award("event", o.event_id, s)):
            awarded.append(tx.model_dump())
    return envelope({"observation": obs, "awarded": awarded}, source="celestra", status="computed")


class PlanIn(BaseModel):
    spot_id: str
    date: str | None = None


@router.post("/plan")
def plan(p: PlanIn, s: Session = Depends(get_session)):
    tx = honor.award("plan", f"{p.spot_id}-{p.date or date.today().isoformat()}", s)
    return envelope({"awarded": [tx.model_dump()] if tx else []}, source="celestra", status="computed")


@router.get("")
def get_honor(s: Session = Depends(get_session)):
    return envelope(honor.summary(s), source="celestra", status="computed")
