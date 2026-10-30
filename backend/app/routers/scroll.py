from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db import get_session
from ..meta import envelope
from ..models import Alert
from ..services import events, iss, launches, sky

router = APIRouter(prefix="/api/sky")


@router.get("/month")
def month(lat: float, lon: float, year: int, month: int, tz_offset_min: int = 330):
    """Calendar days + computed events for one month. tz_offset_min = browser UTC offset (IST = 330)."""
    off = tz_offset_min * 60
    start = datetime(year, month, 1, tzinfo=timezone.utc) - timedelta(seconds=off)
    end = start + timedelta(days=calendar.monthrange(year, month)[1])
    days = events.month_days(lat, lon, year, month, off)
    evs = events.moon_phase_events(start, end) + events.meteor_events(lat, lon, start, end, off) + events.eclipse_events(lat, lon, start, end)
    # planets for tonight, if tonight falls in this month
    today = (datetime.now(timezone.utc) + timedelta(seconds=off)).date()
    if today.year == year and today.month == month:
        ss, sr = sky.night_window(lat, lon, datetime(today.year, today.month, today.day), off)
        evs += events.planet_events(lat, lon, ss, sr)
    evs.sort(key=lambda e: e["start"])
    return envelope({"days": days, "events": evs}, source="astronomy-engine + IMO list", status="computed")


@router.get("/upcoming")
def upcoming(lat: float, lon: float, days: int = 400):
    """Next eclipses and meteor peaks for the Dojo's 'coming up' card."""
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=days)
    evs = events.meteor_events(lat, lon, now, end, 0) + events.eclipse_events(lat, lon, now, end) + events.moon_phase_events(now, now + timedelta(days=30))
    evs = [e for e in evs if e["start"] >= now.isoformat()]
    evs.sort(key=lambda e: e["start"])
    return envelope(evs, source="astronomy-engine + IMO list", status="computed")


@router.get("/iss")
async def iss_passes(lat: float, lon: float, days: int = 7):
    try:
        res, warns = await iss.passes(lat, lon, days)
    except Exception as e:
        raise HTTPException(502, f"ISS orbit data is unavailable right now ({type(e).__name__}).")
    for p in res:
        p["start_dir"] = iss.compass(p["start_az"])
        p["end_dir"] = iss.compass(p["end_az"])
    return envelope({"passes": res, "warnings": warns}, source="CelesTrak + skyfield", status="computed")


@router.get("/launches")
async def upcoming_launches():
    try:
        res, cached = await launches.upcoming()
    except Exception as e:
        raise HTTPException(502, f"Launch data is unavailable right now ({type(e).__name__}).")
    return envelope(res, source=launches.SOURCE, status="cached" if cached else "live")


# ---------- reminders ----------
class AlertIn(BaseModel):
    event_id: str
    kind: str
    title: str
    at: str
    lat: float | None = None
    lon: float | None = None


@router.get("/alerts")
def list_alerts(s: Session = Depends(get_session)):
    rows = s.exec(select(Alert).order_by(Alert.at)).all()
    return envelope([r.model_dump() for r in rows], source="celestra", status="computed")


@router.post("/alerts")
def add_alert(a: AlertIn, s: Session = Depends(get_session)):
    existing = s.exec(select(Alert).where(Alert.event_id == a.event_id)).first()
    if existing:
        return envelope(existing.model_dump(), source="celestra", status="computed")
    row = Alert(**a.model_dump())
    s.add(row)
    s.commit()
    s.refresh(row)
    return envelope(row.model_dump(), source="celestra", status="computed")


@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, s: Session = Depends(get_session)):
    row = s.get(Alert, alert_id)
    if row:
        s.delete(row)
        s.commit()
    return envelope({"deleted": alert_id}, source="celestra", status="computed")
