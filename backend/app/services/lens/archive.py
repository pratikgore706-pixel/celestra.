"""NASA SkyView archive images and Gaia DR3 star names (astroquery).

SkyView returns survey images resampled onto the grid we request, so two surveys of the
same target (e.g. DSS1 and DSS2, decades apart) come back pixel-aligned: ideal for blinking.
"""
from __future__ import annotations

import io

import numpy as np

SURVEYS = {"DSS2 Red": "DSS2 Red", "DSS2 Blue": "DSS2 Blue", "DSS1 Red": "DSS1 Red", "DSS": "DSS", "2MASS-J": "2MASS-J"}
SOURCE_URL = "https://skyview.gsfc.nasa.gov/"


def fetch_fits(target: str, survey: str = "DSS2 Red", size_deg: float = 0.4, pixels: int = 700) -> bytes:
    from astropy import units as u
    from astroquery.skyview import SkyView

    if survey not in SURVEYS:
        raise ValueError(f"Unknown survey. Choose one of: {', '.join(SURVEYS)}")
    imgs = SkyView.get_images(position=target, survey=[SURVEYS[survey]], radius=size_deg * u.deg, pixels=pixels)
    if not imgs:
        raise ValueError(f"SkyView returned no image for '{target}'.")
    buf = io.BytesIO()
    hdul = imgs[0]
    hdul[0].header["CELESTRA"] = (f"{survey} via NASA SkyView", "archival survey image")
    hdul.writeto(buf)
    return buf.getvalue()


def gaia_match(sources: list[dict], max_arcsec: float = 3.0) -> int:
    """Adds gaia_id + g_mag to sources that have ra/dec. Returns number matched."""
    from astropy import units as u
    from astropy.coordinates import SkyCoord
    from astroquery.vizier import Vizier

    pts = [s for s in sources if "ra" in s and "dec" in s]
    if not pts:
        return 0
    ra = np.array([s["ra"] for s in pts])
    dec = np.array([s["dec"] for s in pts])
    center = SkyCoord(ra.mean() * u.deg, dec.mean() * u.deg)
    radius = float(np.max(SkyCoord(ra * u.deg, dec * u.deg).separation(center).deg)) + 0.02
    res, last = None, None
    for server in ("vizier.iucaa.in", "vizier.cds.unistra.fr", "vizier.cfa.harvard.edu"):
        try:
            v = Vizier(columns=["Source", "RA_ICRS", "DE_ICRS", "Gmag", "BP-RP"], row_limit=20000,
                       column_filters={"Gmag": "<19"}, vizier_server=server, timeout=10)
            res = v.query_region(center, radius=radius * u.deg, catalog="I/355/gaiadr3")
            break
        except Exception as e:  # try the next mirror
            last = e
    if res is None and last is not None:
        raise last
    if not res:
        return 0
    t = res[0]
    cat = SkyCoord(np.array(t["RA_ICRS"]) * u.deg, np.array(t["DE_ICRS"]) * u.deg)
    mine = SkyCoord(ra * u.deg, dec * u.deg)
    idx, sep, _ = mine.match_to_catalog_sky(cat)
    n = 0
    for s, i, d in zip(pts, idx, sep.arcsec):
        if d <= max_arcsec:
            s["gaia_id"] = f"Gaia DR3 {int(t['Source'][i])}"
            s["g_mag"] = round(float(t["Gmag"][i]), 2)
            bprp = t["BP-RP"][i]
            if np.isfinite(bprp):
                s["bp_rp"] = round(float(bprp), 2)
            s["match_arcsec"] = round(float(d), 2)
            n += 1
    return n
