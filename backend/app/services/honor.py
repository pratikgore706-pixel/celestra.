"""Honor Points and the Seven Virtues. Points are awarded only here, by rules, once per
qualifying action (unique action + ref), never by the browser."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlmodel import Session, select

from ..db import engine
from ..models import HonorTx, Observation

POINTS = {
    "log": 10,             # log an observation
    "verified": 15,        # ...and the sky agreed (score >= 60 at that place and hour)
    "event": 25,           # observed a listed event inside its window
    "sealed": 5,           # restored an image that earned the Seal of Truth
    "blink": 20,           # found a transient / variable candidate
    "plan": 3,             # planned a night at a scored spot
}
LABELS = {
    "log": "Observation logged", "verified": "Sky-verified observation", "event": "Event observed in its window",
    "sealed": "Sealed restoration", "blink": "Blink candidate found", "plan": "Night planned",
}
EVENT_TYPES = ["moon", "meteor", "eclipse", "iss", "planet", "launch"]


def award(action: str, ref: str, s: Session | None = None) -> HonorTx | None:
    own = s is None
    s = s or Session(engine)
    try:
        if s.exec(select(HonorTx).where(HonorTx.action == action, HonorTx.ref == ref)).first():
            return None
        tx = HonorTx(action=action, ref=ref, points=POINTS[action], label=LABELS[action])
        s.add(tx)
        s.commit()
        s.refresh(tx)
        s.expunge(tx)
        return tx
    finally:
        if own:
            s.close()


def _streak(days: set[date]) -> int:
    best = cur = 0
    prev = None
    for d in sorted(days):
        cur = cur + 1 if prev and d - prev == timedelta(days=1) else 1
        best = max(best, cur)
        prev = d
    return best


def summary(s: Session) -> dict:
    txs = s.exec(select(HonorTx).order_by(HonorTx.created_at.desc())).all()
    obs = s.exec(select(Observation).order_by(Observation.at.desc())).all()
    total = sum(t.points for t in txs)
    n_verified = sum(o.sky_verified for o in obs)
    n_brave = sum(1 for o in obs if o.sky_score is not None and o.sky_score < 40)
    n_sealed = sum(1 for t in txs if t.action == "sealed")
    n_plan = sum(1 for t in txs if t.action == "plan")
    types = {o.event_type for o in obs} & set(EVENT_TYPES)
    streak = _streak({datetime.fromisoformat(o.at).date() for o in obs})
    badges = [
        {"key": "gi", "kanji": "義", "romaji": "Gi", "virtue": "Righteousness", "rule": "First sky-verified observation", "have": n_verified, "need": 1},
        {"key": "yu", "kanji": "勇", "romaji": "Yū", "virtue": "Courage", "rule": "Observe under a Storm Banner sky (score < 40)", "have": n_brave, "need": 1},
        {"key": "jin", "kanji": "仁", "romaji": "Jin", "virtue": "Benevolence", "rule": "Plan 3 nights at scored spots", "have": n_plan, "need": 3},
        {"key": "rei", "kanji": "礼", "romaji": "Rei", "virtue": "Respect", "rule": "Observe 7 nights in a row", "have": streak, "need": 7},
        {"key": "makoto", "kanji": "誠", "romaji": "Makoto", "virtue": "Honesty", "rule": "10 restorations that earn the Seal of Truth", "have": n_sealed, "need": 10},
        {"key": "meiyo", "kanji": "名誉", "romaji": "Meiyo", "virtue": "Honour", "rule": "Reach 1,000 Honor Points", "have": total, "need": 1000},
        {"key": "chugi", "kanji": "忠義", "romaji": "Chūgi", "virtue": "Loyalty", "rule": "Log every event type", "have": len(types), "need": len(EVENT_TYPES)},
    ]
    for b in badges:
        b["earned"] = b["have"] >= b["need"]
    rank = next((name for lim, name in [(1000, "Shogun"), (500, "Daimyō"), (200, "Samurai"), (50, "Ashigaru"), (0, "Rōnin")] if total >= lim), "Rōnin")
    return {
        "total": total, "rank": rank,
        "ledger": [t.model_dump() for t in txs[:30]],
        "observations": [o.model_dump() for o in obs[:20]],
        "badges": badges,
        "points_table": POINTS,
    }
