"""Celestial Scroll events: moon calendar, phases, meteor showers, eclipses, planets.
All computed locally with astronomy-engine. ISS and launches live in iss.py / launches.py."""
from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta, timezone

import astronomy as ae

from ..data.lunar_days import lunar_day_name
from ..data.meteor_showers import SHOWERS, SOURCE, SOURCE_URL
from .sky import SYNODIC, altaz, moon_illum, observer, phase_name, rise_set, to_dt, to_time

AE = "astronomy-engine (computed)"
AE_URL = "https://github.com/cosinekitty/astronomy"


def _local_to_utc(d: date, hour: float, offset_s: int) -> datetime:
    base = datetime(d.year, d.month, d.day, tzinfo=timezone.utc) + timedelta(hours=hour)
    return base - timedelta(seconds=offset_s)


def month_days(lat: float, lon: float, year: int, month: int, offset_s: int) -> list[dict]:
    obs = observer(lat, lon)
    out = []
    for day in range(1, calendar.monthrange(year, month)[1] + 1):
        d = date(year, month, day)
        t21 = _local_to_utc(d, 21, offset_s)
        angle = ae.MoonPhase(to_time(t21))
        lunar = int(angle / 360 * SYNODIC) + 1
        start = _local_to_utc(d, 0, offset_s)
        rise = rise_set(ae.Body.Moon, obs, start, "rise", 1.0)
        set_ = rise_set(ae.Body.Moon, obs, start, "set", 1.0)
        out.append({
            "date": d.isoformat(),
            "phase_angle": round(angle, 1),
            "illumination": round(moon_illum(t21), 3),
            "phase_name": phase_name(angle),
            "lunar_day": lunar_day_name(lunar),
            "moonrise": rise.isoformat() if rise and rise < start + timedelta(days=1) else None,
            "moonset": set_.isoformat() if set_ and set_ < start + timedelta(days=1) else None,
        })
    return out


def moon_phase_events(start: datetime, end: datetime) -> list[dict]:
    out = []
    names = {0: ("new", "New Moon"), 1: ("first_quarter", "First Quarter"), 2: ("full", "Full Moon"), 3: ("last_quarter", "Last Quarter")}
    mq = ae.SearchMoonQuarter(to_time(start - timedelta(days=8)))
    while True:
        t = to_dt(mq.time)
        if t > end:
            break
        if t >= start:
            code, label = names[mq.quarter]
            out.append({"id": f"moon-{code}-{t.date()}", "type": "moon", "title": label, "start": t.isoformat(),
                        "visible": None, "detail": {"quarter": code}, "source": AE, "url": AE_URL, "status": "computed"})
        mq = ae.NextMoonQuarter(mq)
    return out


def _radiant_altitude(ra_deg: float, dec_deg: float, when: datetime, obs: ae.Observer) -> float:
    hor = ae.Horizon(to_time(when), obs, ra_deg / 15.0, dec_deg, ae.Refraction.Normal)
    return hor.altitude


def meteor_events(lat: float, lon: float, start: datetime, end: datetime, offset_s: int) -> list[dict]:
    obs = observer(lat, lon)
    out = []
    for yr in {start.year, end.year}:
        for s in SHOWERS:
            pm, pd = s["peak"]
            peak_d = date(yr, pm, pd)
            peak_local_2am = _local_to_utc(peak_d, 2, offset_s)  # pre-dawn is usually best
            if not (start <= peak_local_2am <= end + timedelta(days=1)):
                continue
            best_alt, best_t = -90.0, peak_local_2am
            for h in range(-6, 5):
                tt = peak_local_2am + timedelta(hours=h)
                a = _radiant_altitude(s["ra"], s["dec"], tt, obs)
                sun, _ = altaz(ae.Body.Sun, tt, obs)
                if sun < -12 and a > best_alt:
                    best_alt, best_t = a, tt
            ill = moon_illum(best_t)
            m_alt, _ = altaz(ae.Body.Moon, best_t, obs)
            moon_interf = "high" if m_alt > 0 and ill > 0.6 else "medium" if m_alt > 0 and ill > 0.25 else "low"
            sy, sm = (yr - 1, s["start"][0]) if s["start"][0] > pm else (yr, s["start"][0])
            ey, em = (yr + 1, s["end"][0]) if s["end"][0] < pm else (yr, s["end"][0])
            out.append({
                "id": f"meteor-{s['code']}-{yr}", "type": "meteor", "title": f"{s['name']} peak",
                "start": best_t.isoformat(),
                "visible": best_alt > 10,
                "detail": {"zhr": s["zhr"], "radiant_alt": round(best_alt, 1), "moon_interference": moon_interf,
                           "moon_illumination": round(ill, 2),
                           "active": f"{date(sy, sm, s['start'][1]).isoformat()} to {date(ey, em, s['end'][1]).isoformat()}"},
                "source": SOURCE, "url": SOURCE_URL, "status": "computed",
            })
    return out


def eclipse_events(lat: float, lon: float, start: datetime, end: datetime) -> list[dict]:
    obs = observer(lat, lon)
    out = []
    le = ae.SearchLunarEclipse(to_time(start))
    while to_dt(le.peak) <= end:
        pk = to_dt(le.peak)
        alt, _ = altaz(ae.Body.Moon, pk, obs)
        out.append({"id": f"lunar-{pk.date()}", "type": "eclipse", "title": f"{le.kind.name.title()} lunar eclipse",
                    "start": pk.isoformat(), "visible": alt > 0,
                    "detail": {"kind": le.kind.name.lower(), "moon_alt_at_peak": round(alt, 1),
                               "duration_partial_min": round(le.sd_partial * 2, 0), "duration_total_min": round(le.sd_total * 2, 0)},
                    "source": AE, "url": AE_URL, "status": "computed"})
        le = ae.NextLunarEclipse(le.peak)
    se = ae.SearchLocalSolarEclipse(to_time(start), obs)
    while to_dt(se.peak.time) <= end:
        pk = to_dt(se.peak.time)
        out.append({"id": f"solar-{pk.date()}", "type": "eclipse", "title": f"{se.kind.name.title()} solar eclipse",
                    "start": pk.isoformat(), "visible": se.peak.altitude > 0,
                    "detail": {"kind": se.kind.name.lower(), "obscuration_pct": round(se.obscuration * 100, 1),
                               "sun_alt_at_peak": round(se.peak.altitude, 1),
                               "begins": to_dt(se.partial_begin.time).isoformat(), "ends": to_dt(se.partial_end.time).isoformat()},
                    "source": AE, "url": AE_URL, "status": "computed"})
        se = ae.NextLocalSolarEclipse(se.peak.time, obs)
    return out


PLANETS = [ae.Body.Mercury, ae.Body.Venus, ae.Body.Mars, ae.Body.Jupiter, ae.Body.Saturn]


def planet_events(lat: float, lon: float, sunset: datetime, sunrise: datetime) -> list[dict]:
    obs = observer(lat, lon)
    out = []
    for body in PLANETS:
        best_alt, best_t = -90.0, sunset
        t = sunset
        while t <= sunrise:
            a, _ = altaz(body, t, obs)
            if a > best_alt:
                best_alt, best_t = a, t
            t += timedelta(minutes=30)
        if best_alt < 8:
            continue
        mag = ae.Illumination(body, to_time(best_t)).mag
        _, az = altaz(body, best_t, obs)
        out.append({"id": f"planet-{body.name}-{sunset.date()}", "type": "planet", "title": body.name,
                    "start": best_t.isoformat(), "visible": True,
                    "detail": {"best_alt": round(best_alt, 1), "azimuth": round(az, 0), "magnitude": round(mag, 1),
                               "rise": (r.isoformat() if (r := rise_set(body, obs, sunset - timedelta(hours=12), "rise")) else None),
                               "set": (s.isoformat() if (s := rise_set(body, obs, sunset - timedelta(hours=12), "set")) else None)},
                    "source": AE, "url": AE_URL, "status": "computed"})
    return out
