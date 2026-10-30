"""Real candidate observing spots from OpenStreetMap (Overpass API).

Markers in the UI are typed by what the place really is: viewpoint (torii),
peak (mountain), notable place of worship (shrine), observatory (pagoda), park.
"""
from __future__ import annotations

import math

from ..cache import cached_get

MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    r = 6371.0
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def _query(lat: float, lon: float, radius_m: int) -> str:
    a = f"(around:{radius_m},{lat:.4f},{lon:.4f})"
    big = f"(around:{radius_m + 30000},{lat:.4f},{lon:.4f})"
    # "wikidata" filters to notable temples/parks; otherwise Indian cities return thousands.
    return f"""[out:json][timeout:25];
node["tourism"="viewpoint"]{a};out 25;
node["natural"="peak"]["name"]{a};out 25;
nwr["man_made"="observatory"]{a};out center 10;
nwr["amenity"="place_of_worship"]["name"]["wikidata"]{a};out center 25;
nwr["leisure"="park"]["name"]["wikidata"]{a};out center 15;
node["place"~"^(city|town)$"]{big};out 60;"""


TYPE_OF = [
    ("tourism", "viewpoint", "viewpoint"),
    ("natural", "peak", "peak"),
    ("man_made", "observatory", "observatory"),
    ("amenity", "place_of_worship", "shrine"),
    ("leisure", "park", "park"),
]


PHOTON = "https://photon.komoot.io/api/"
PHOTON_QUERIES = [
    # (marker type, search word, OSM tag) - several words per type because Photon matches names
    ("viewpoint", "point", "tourism:viewpoint"), ("viewpoint", "view", "tourism:viewpoint"), ("viewpoint", "viewpoint", "tourism:viewpoint"),
    ("peak", "hill", "natural:peak"), ("peak", "peak", "natural:peak"), ("peak", "mount", "natural:peak"),
    ("peak", "fort", "historic:fort"), ("peak", "killa", "historic:fort"),
    ("shrine", "temple", "amenity:place_of_worship"), ("shrine", "mandir", "amenity:place_of_worship"),
    ("shrine", "gurudwara", "amenity:place_of_worship"), ("shrine", "monastery", "amenity:place_of_worship"),
    ("observatory", "observatory", "man_made:observatory"),
    ("park", "national park", "boundary:national_park"), ("park", "lake", "natural:water"),
]
BUDGET = 5.0  # seconds for all live place searches together
GENERIC = {"park", "temple", "point", "hill", "peak", "view", "viewpoint", "lake", "fort", "mandir"}


async def _nearest_city(lat: float, lon: float) -> list[dict]:
    """Reverse-geocode the point, then look the city up to get its centre and population."""
    from .weather import GEO_URL
    rev, _ = await cached_get(PHOTON.replace("/api/", "/reverse"), {"lat": round(lat, 3), "lon": round(lon, 3), "lang": "en"}, ttl=86400)
    feats = rev.get("features") or []
    if not feats:
        return []
    pr = feats[0]["properties"]
    name = pr.get("city") or pr.get("county") or pr.get("district") or pr.get("name")
    if not name:
        return []
    geo, _ = await cached_get(GEO_URL, {"name": name, "count": 5, "language": "en", "format": "json"}, ttl=86400)
    out = []
    for g in geo.get("results", []) or []:
        d = haversine_km((lat, lon), (g["latitude"], g["longitude"]))
        if d < 80:
            out.append({"name": g["name"], "kind": "city" if (g.get("population") or 0) >= 100000 else "town",
                        "lat": g["latitude"], "lon": g["longitude"], "population": g.get("population")})
    return out[:1]


async def _photon(lat: float, lon: float, radius_km: int) -> tuple[list[dict], list[dict]]:
    """Real OSM features via the Photon search API (fast, no heavy server-side query)."""
    import asyncio

    sem = asyncio.Semaphore(16)  # all searches in parallel; results are cached for a week

    async def q(text: str, tag: str, limit: int = 25):
        params = {"q": text, "lat": round(lat, 3), "lon": round(lon, 3), "osm_tag": tag, "limit": limit, "lang": "en"}
        async with sem:
            data, _ = await cached_get(PHOTON, params, ttl=7 * 86400)
        return data.get("features", [])

    tasks = [asyncio.ensure_future(q(t, tag)) for _, t, tag in PHOTON_QUERIES] + [asyncio.ensure_future(_nearest_city(lat, lon))]
    # total budget: whatever has arrived after BUDGET seconds is used; the rest is cancelled
    done, pending = await asyncio.wait(tasks, timeout=BUDGET)
    for t in pending:
        t.cancel()
    res = [t.result() if t in done and not t.exception() else TimeoutError() for t in tasks]
    towns = res[-1] if isinstance(res[-1], list) else []
    spots, seen = [], set()
    for (kind, _, _), feats in zip(PHOTON_QUERIES, res[:-1]):
        if isinstance(feats, Exception):
            continue
        for f in feats:
            pr = f.get("properties", {})
            name = (pr.get("name") or "").strip()
            if not name or name.lower() in GENERIC or len(name) < 4:
                continue
            lo, la = f["geometry"]["coordinates"]
            if haversine_km((lat, lon), (la, lo)) > radius_km:
                continue
            key = (round(la, 3), round(lo, 3))
            if key in seen:
                continue
            seen.add(key)
            ot = {"N": "node", "W": "way", "R": "relation"}.get(pr.get("osm_type"), "node")
            spots.append({"id": f"{ot[0]}{pr.get('osm_id')}", "name": name, "type": kind, "lat": la, "lon": lo,
                          "osm_url": f"https://www.openstreetmap.org/{ot}/{pr.get('osm_id')}"})
    return spots, towns


def curated_cities() -> list[dict]:
    from ..data.curated_places import CITIES
    return [{"name": n, "kind": "city" if pop >= 0.1 else "town", "lat": la, "lon": lo} for n, la, lo, pop in CITIES]


def curated_spots(lat: float, lon: float, radius_km: float = 160) -> list[dict]:
    from ..data.curated_places import SITES
    out = []
    for i, (name, kind, la, lo) in enumerate(SITES):
        if haversine_km((lat, lon), (la, lo)) <= radius_km:
            out.append({"id": f"c{i}", "name": name, "type": kind, "lat": la, "lon": lo, "curated": True,
                        "osm_url": f"https://www.openstreetmap.org/?mlat={la}&mlon={lo}#map=13/{la}/{lo}"})
    return out


async def fetch_places(lat: float, lon: float, radius_km: int = 40) -> tuple[list[dict], list[dict], str | None]:
    """Returns (spots, settlements, warning).
    Live: Photon (fast OSM search) then one quick Overpass try. Always merged with the curated
    list of notable sites within 160 km, so the map is never empty when the free services are down."""
    import asyncio
    spots, towns, live = [], [], "none"
    try:
        spots, towns = await _photon(lat, lon, radius_km)
        live = "photon" if spots else live
    except Exception:
        pass
    if len(spots) < 6:
        try:  # one quick Overpass attempt; public Overpass servers are often overloaded
            data, _ = await asyncio.wait_for(cached_get(MIRRORS[0], {"data": _query(lat, lon, radius_km * 1000)}, ttl=7 * 86400), timeout=4)
            ov_spots, ov_towns = _parse_overpass(data)
            spots += ov_spots
            towns += ov_towns
            live = "overpass" if ov_spots else live
        except Exception:
            pass
    cur = curated_spots(lat, lon)
    seen = {(round(s["lat"], 2), round(s["lon"], 2)) for s in spots}
    spots += [c for c in cur if (round(c["lat"], 2), round(c["lon"], 2)) not in seen]
    towns += curated_cities()
    warn = None
    if live == "none":
        warn = ("Live OpenStreetMap search is slow right now, so spots come from Celestra's curated list of notable sites "
                "(approximate locations)." if cur else "Live OpenStreetMap search is slow right now and no curated sites are nearby; "
                "showing your point only. Click the map to score any place.")
    return spots, towns, warn


def _parse_overpass(data: dict) -> tuple[list[dict], list[dict]]:
    spots, towns = [], []
    seen = set()
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        la = el.get("lat") or (el.get("center") or {}).get("lat")
        lo = el.get("lon") or (el.get("center") or {}).get("lon")
        if la is None or lo is None:
            continue
        if tags.get("place") in ("city", "town"):
            towns.append({"name": tags.get("name"), "kind": tags["place"], "lat": la, "lon": lo})
            continue
        kind = next((t for k, v, t in TYPE_OF if tags.get(k) == v), None)
        if not kind:
            continue
        name = tags.get("name:en") or tags.get("name")
        if not name:
            name = {"viewpoint": "Unnamed viewpoint", "peak": "Unnamed peak"}.get(kind, kind.title())
        key = (round(la, 3), round(lo, 3))
        if key in seen:
            continue
        seen.add(key)
        spots.append({"id": f"{el['type'][0]}{el['id']}", "name": name, "type": kind, "lat": la, "lon": lo,
                      "osm_url": f"https://www.openstreetmap.org/{el['type']}/{el['id']}"})
    return spots, towns


def light_pollution_penalty(pt: tuple[float, float], towns: list[dict]) -> tuple[float, str | None]:
    """Estimated from distance to the nearest city/town. Labelled as an estimate in the UI."""
    best_pen, near = 0.0, None
    for t in towns:
        d = haversine_km(pt, (t["lat"], t["lon"]))
        if t["kind"] == "city":
            pen = 40 if d < 10 else 20 if d < 25 else 8 if d < 45 else 0
        else:
            pen = 10 if d < 8 else 4 if d < 15 else 0
        if pen > best_pen:
            best_pen, near = pen, f"{t['name']} ({d:.0f} km)"
    return best_pen, near


def pick_candidates(spots: list[dict], towns: list[dict], here: tuple[float, float], limit: int = 30) -> list[dict]:
    """Prefer variety of types and darker (farther from city) places."""
    for s in spots:
        s["dist_km"] = round(haversine_km(here, (s["lat"], s["lon"])), 1)
        s["lp_penalty"], s["lp_near"] = light_pollution_penalty((s["lat"], s["lon"]), towns)
    order = sorted(spots, key=lambda s: (s["lp_penalty"], s["dist_km"]))
    by_type: dict[str, list[dict]] = {}
    for s in order:
        by_type.setdefault(s["type"], []).append(s)
    picked: list[dict] = []
    while len(picked) < limit and any(by_type.values()):
        for k in list(by_type):
            if by_type[k]:
                picked.append(by_type[k].pop(0))
                if len(picked) >= limit:
                    break
    return picked
