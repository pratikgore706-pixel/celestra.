"""Seal of Truth: measure that the restored image is faithful to the original.

Checks (thresholds are shown in the UI):
  invented   no restored source without a counterpart in the original (original S/N < 2 there)
  kept       >= 95 % of original 5-sigma sources still detected
  flux       median flux ratio restored/original in 0.95-1.05, bright stars within 0.8-1.2
  position   median centroid shift < 0.3 px
  residual   what was removed looks like noise: residual RMS on sky <= 1.15 sigma, and no
             source-like blobs in the residual away from known sources
"""
from __future__ import annotations

import numpy as np
from photutils.aperture import CircularAnnulus, CircularAperture, aperture_photometry

from .detect import FULL, detect

RULES = {
    "invented_max": 0,
    "kept_min_pct": 95.0,
    "flux_median": [0.95, 1.05],
    "flux_bright": [0.8, 1.2],
    "shift_max_px": 0.3,
    "residual_rms_max": 1.15,
}


def _match(a: list[dict], b: list[dict], tol: float) -> list[tuple[int, int, float]]:
    """Greedy nearest match a->b within tol px. Returns (ia, ib, dist)."""
    if not a or not b:
        return []
    bx = np.array([[s["x"], s["y"]] for s in b])
    used: set[int] = set()
    out = []
    for i, s in enumerate(a):
        d = np.hypot(bx[:, 0] - s["x"], bx[:, 1] - s["y"])
        for j in np.argsort(d):
            if d[j] > tol:
                break
            if j not in used:
                used.add(int(j))
                out.append((i, int(j), float(d[j])))
                break
    return out


def _phot(data: np.ndarray, pts: list[tuple[float, float]], r: float) -> np.ndarray:
    if not pts:
        return np.zeros(0)
    ap = CircularAperture(pts, r=r)
    return np.asarray(aperture_photometry(data, ap)["aperture_sum"], dtype=np.float64)


def _local_snr(data: np.ndarray, x: float, y: float, r: float, rms: float) -> float:
    """Aperture S/N with the sky measured in a local annulus (robust to nebula gradients)."""
    ap = CircularAperture([(x, y)], r=r)
    ann = CircularAnnulus([(x, y)], r_in=2 * r, r_out=3 * r)
    mask = ann.to_mask(method="center")[0]
    vals = mask.get_values(data)
    sky = float(np.median(vals)) if vals.size else 0.0
    tot = float(aperture_photometry(data, ap)["aperture_sum"][0]) - sky * ap.area
    return tot / (rms * np.sqrt(ap.area))


def check(orig: np.ndarray, rest: np.ndarray, bkg: np.ndarray, rms: float, cat_o: list[dict],
          psf_fwhm: float) -> tuple[dict, list[dict]]:
    r_ap = max(2.0 * psf_fwhm, 3.0)
    cat_r = detect(rest, bkg, rms, limit=FULL)  # same absolute threshold as the original, full list
    pairs = _match(cat_r, cat_o, tol=max(2.0, 0.6 * psf_fwhm))
    matched_r = {i for i, _, _ in pairs}
    matched_o = {j for _, j, _ in pairs}

    do, dr = orig - bkg, rest - bkg
    # unmatched restored sources: invented (nothing in original) vs revealed (faint but real)
    invented, revealed = [], []
    for i, s in enumerate(cat_r):
        if i in matched_r:
            continue
        snr0 = _local_snr(do, s["x"], s["y"], r_ap, rms)
        (invented if snr0 < 2.0 else revealed).append({"x": s["x"], "y": s["y"], "orig_snr": round(float(snr0), 2)})

    kept_pct = 100.0 * len(matched_o) / len(cat_o) if cat_o else 100.0

    bright = [j for j in range(len(cat_o)) if cat_o[j]["snr"] >= 20 and not cat_o[j]["saturated"]]
    pts = [(cat_o[j]["x"], cat_o[j]["y"]) for j in bright]
    fo, fr = _phot(do, pts, r_ap), _phot(dr, pts, r_ap)
    ok = fo > 0
    ratios = fr[ok] / fo[ok] if ok.any() else np.array([1.0])
    med_ratio = float(np.median(ratios))
    worst_lo, worst_hi = float(np.min(ratios)), float(np.max(ratios))

    shifts = [d for _, _, d in pairs]
    med_shift = float(np.median(shifts)) if shifts else 0.0

    resid = orig - rest
    # sky = pixels away from every original source
    sky = np.ones(orig.shape, dtype=bool)
    h, w = orig.shape
    yy, xx = np.ogrid[0:h, 0:w]
    for s in cat_o:
        rr = max(3 * r_ap, np.sqrt(s["area"] / np.pi) * 2)
        y0, y1 = int(max(s["y"] - rr, 0)), int(min(s["y"] + rr + 1, h))
        x0, x1 = int(max(s["x"] - rr, 0)), int(min(s["x"] + rr + 1, w))
        sky[y0:y1, x0:x1] &= ((xx[:, x0:x1] - s["x"]) ** 2 + (yy[y0:y1] - s["y"]) ** 2) > rr ** 2
    resid_rms = float(np.std(resid[sky])) / rms if sky.any() else 1.0
    zero = np.zeros_like(resid)
    # look for structure in BOTH directions: an added star shows as a dark hole in orig - rest
    blobs = detect(np.where(sky, np.abs(resid), 0) - np.where(sky, np.abs(resid), 0).mean(), zero, rms, nsigma=5.0, npixels=8)

    checks = [
        {"key": "invented", "pass": len(invented) <= RULES["invented_max"], "value": len(invented), "rule": "= 0"},
        {"key": "kept", "pass": kept_pct >= RULES["kept_min_pct"], "value": round(kept_pct, 1), "rule": "≥ 95%"},
        {"key": "flux", "pass": RULES["flux_median"][0] <= med_ratio <= RULES["flux_median"][1]
            and RULES["flux_bright"][0] <= worst_lo and worst_hi <= RULES["flux_bright"][1],
         "value": round(med_ratio, 3), "range": [round(worst_lo, 3), round(worst_hi, 3)], "n": int(ok.sum()), "rule": "0.95–1.05"},
        {"key": "position", "pass": med_shift < RULES["shift_max_px"], "value": round(med_shift, 3), "rule": "< 0.3 px"},
        {"key": "residual", "pass": resid_rms <= RULES["residual_rms_max"] and len(blobs) == 0,
         "value": round(resid_rms, 2), "blobs": len(blobs), "rule": "≤ 1.15σ, no blobs"},
    ]
    report = {
        "sealed": all(c["pass"] for c in checks),
        "checks": checks,
        "invented": invented,
        "revealed": len(revealed),
        "counts": {"original": len(cat_o), "restored": len(cat_r), "matched": len(pairs)},
        "rules": RULES,
    }
    return report, cat_r
