"""Sun and Moon geometry, computed locally with astronomy-engine (no network)."""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

import astronomy as ae

from ..data.lunar_days import lunar_day_name

SYNODIC = 29.530588


def to_time(dt: datetime) -> ae.Time:
    dt = dt.astimezone(timezone.utc)
    return ae.Time.Make(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)


def to_dt(t: ae.Time | None) -> datetime | None:
    if t is None:
        return None
    return t.Utc().replace(tzinfo=timezone.utc)


def observer(lat: float, lon: float, elev: float = 0.0) -> ae.Observer:
    return ae.Observer(lat, lon, elev)


def altaz(body: ae.Body, dt: datetime, obs: ae.Observer) -> tuple[float, float]:
    t = to_time(dt)
    eq = ae.Equator(body, t, obs, True, True)
    hor = ae.Horizon(t, obs, eq.ra, eq.dec, ae.Refraction.Normal)
    return hor.altitude, hor.azimuth


def moon_illum(dt: datetime) -> float:
    return ae.Illumination(ae.Body.Moon, to_time(dt)).phase_fraction


def rise_set(body: ae.Body, obs: ae.Observer, start: datetime, direction: str, days: float = 1.5) -> datetime | None:
    d = ae.Direction.Rise if direction == "rise" else ae.Direction.Set
    return to_dt(ae.SearchRiseSet(body, obs, d, to_time(start), days))


def night_window(lat: float, lon: float, local_date: datetime, utc_offset_s: int) -> tuple[datetime, datetime]:
    """Sunset on local_date to the next sunrise, as UTC datetimes.

    local_date is a naive date at 00:00 local. Search starts at local noon.
    Polar edge cases fall back to 18:00-06:00 local.
    """
    obs = observer(lat, lon)
    noon_utc = (local_date + timedelta(hours=12) - timedelta(seconds=utc_offset_s)).replace(tzinfo=timezone.utc)
    sunset = rise_set(ae.Body.Sun, obs, noon_utc, "set", 1.0)
    sunrise = rise_set(ae.Body.Sun, obs, sunset or noon_utc, "rise", 1.0) if sunset else None
    if not sunset or not sunrise:
        sunset = noon_utc + timedelta(hours=6)
        sunrise = noon_utc + timedelta(hours=18)
    return sunset, sunrise


def phase_name(angle: float) -> str:
    # angle: 0 new, 90 first quarter, 180 full, 270 last quarter
    names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
             "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"]
    return names[int(((angle + 22.5) % 360) // 45)]


def moon_info(lat: float, lon: float, at: datetime | None = None) -> dict:
    at = at or datetime.now(timezone.utc)
    obs = observer(lat, lon)
    t = to_time(at)
    angle = ae.MoonPhase(t)
    illum = moon_illum(at)
    alt, az = altaz(ae.Body.Moon, at, obs)
    age_days = angle / 360.0 * SYNODIC
    day = int(age_days) + 1
    start = at - timedelta(hours=12)
    rise = rise_set(ae.Body.Moon, obs, start, "rise", 1.5)
    set_ = rise_set(ae.Body.Moon, obs, rise or start, "set", 1.5)
    nxt = {}
    for label, lon_target in (("new", 0), ("first_quarter", 90), ("full", 180), ("last_quarter", 270)):
        nt = ae.SearchMoonPhase(lon_target, t, 40)
        nxt[label] = to_dt(nt).isoformat() if nt else None
    return {
        "phase_angle": round(angle, 2),
        "phase_name": phase_name(angle),
        "illumination": round(illum, 4),
        "waxing": angle < 180,
        "age_days": round(age_days, 2),
        "altitude": round(alt, 2),
        "azimuth": round(az, 2),
        "rise": rise.isoformat() if rise else None,
        "set": set_.isoformat() if set_ else None,
        "lunar_day": lunar_day_name(day),
        "next_phases": nxt,
    }


def sin_deg(x: float) -> float:
    return math.sin(math.radians(x))
