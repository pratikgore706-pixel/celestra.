"""Spirit Lens job: load -> noise -> detect -> denoise (star-protected) -> PSF -> deblur
-> Seal of Truth (auto-soften on fail) -> classify -> export."""
from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path

import numpy as np

from . import detect as D
from . import imageio as io
from . import restore as R
from . import seal as S

from ...config import JOBS_DIR as STORAGE
STORAGE.mkdir(parents=True, exist_ok=True)

JOBS: dict[str, dict] = {}
_lock = threading.Lock()

STEPS = ["load", "noise", "detect", "denoise", "psf", "deblur", "seal", "classify", "export"]


def new_job(name: str, opts: dict) -> str:
    jid = uuid.uuid4().hex[:12]
    (STORAGE / jid).mkdir(parents=True, exist_ok=True)
    with _lock:
        JOBS[jid] = {"id": jid, "name": name, "status": "queued", "step": None, "progress": 0,
                     "options": opts, "created": time.time(), "result": None, "error": None}
    return jid


def _set(jid: str, **kw) -> None:
    with _lock:
        JOBS[jid].update(kw)


def get(jid: str) -> dict | None:
    with _lock:
        j = JOBS.get(jid)
        if j:
            return dict(j)
    f = STORAGE / jid / "result.json"
    if f.exists():
        return {"id": jid, "status": "done", "progress": 100, "result": json.loads(f.read_text())}
    return None


def latest() -> str | None:
    dirs = sorted((d for d in STORAGE.iterdir() if (d / "result.json").exists() and (d / "restored.png").exists()),
                  key=lambda d: d.stat().st_mtime, reverse=True)
    return dirs[0].name if dirs else None


def _plant_fake_star(rest_lum: np.ndarray, orig_lum: np.ndarray, bkg: np.ndarray, rms: float, cat: list[dict], fwhm: float):
    """Integrity test: add one star that is NOT in the original, to prove the Seal catches it."""
    h, w = rest_lum.shape
    rng = np.random.default_rng(7)
    pts = np.array([[s["x"], s["y"]] for s in cat]) if cat else np.zeros((0, 2))
    from .seal import _local_snr
    data = orig_lum - bkg
    for _ in range(800):
        x, y = rng.uniform(0.15 * w, 0.85 * w), rng.uniform(0.15 * h, 0.85 * h)
        far = len(pts) == 0 or np.min(np.hypot(pts[:, 0] - x, pts[:, 1] - y)) > 8 * fwhm
        if far and abs(_local_snr(data, x, y, 2 * fwhm, rms)) < 1.0:  # truly empty sky
            break
    s = fwhm / 2.355
    yy, xx = np.mgrid[0:h, 0:w]
    star = 25 * rms * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * s * s))
    return star.astype(np.float32), {"x": round(float(x), 1), "y": round(float(y), 1)}


def run(jid: str, data: bytes | None = None, fetch=None) -> None:
    opts = JOBS[jid]["options"]
    out = STORAGE / jid
    t0 = time.time()
    try:
        step = lambda name: _set(jid, status="running", step=name, progress=int(100 * STEPS.index(name) / len(STEPS)))  # noqa: E731

        step("load")
        if data is None and fetch is not None:
            _set(jid, status="running", step="fetch", progress=2)
            data = fetch()
        arr, info = io.load(data)
        lum = io.luminance(arr)

        step("noise")
        bkg, rms = D.background(lum)

        step("detect")
        cat_o = D.detect(lum, bkg, rms, limit=D.FULL)  # full list for the Seal; UI shows the brightest 600

        step("psf")
        psf, psf_fwhm, n_psf = D.measure_psf(lum - bkg, cat_o)
        fwhm_ref = psf_fwhm or (float(np.median([s["fwhm"] for s in cat_o])) if cat_o else 3.0)
        D.classify(cat_o, psf_fwhm)

        strength = max(0, min(100, int(opts.get("strength", 85)))) / 100
        want_deblur = bool(opts.get("deblur", True)) and psf is not None
        iters = 12
        attempts = []
        report = None
        method = "none"
        den_full = None
        fake = None
        for attempt in range(3):
            step("denoise")
            if den_full is None:
                den_full, method = R.denoise(arr, rms)
            mask = R.star_mask(lum.shape, cat_o, fwhm_ref)
            den = R.protect(arr, den_full, mask)
            # sharpen point sources only: deconvolving nebulae/galaxies invents knots
            star_only = R.star_mask(lum.shape, [x for x in cat_o if x.get("class") == "star"], fwhm_ref)
            rest = arr + strength * (den - arr)

            step("deblur")
            if want_deblur and iters > 0:
                rest = R.deblur(rest, bkg, rms, psf, iters, star_only)

            rest_lum = io.luminance(rest)
            if opts.get("inject_fake"):
                star, fake = _plant_fake_star(rest_lum, lum, bkg, rms, cat_o, fwhm_ref)
                rest_lum = rest_lum + star
                rest = rest + (star if rest.ndim == 2 else star[..., None])

            step("seal")
            report, cat_r = S.check(lum, rest_lum, bkg, rms, cat_o, fwhm_ref)
            attempts.append({"strength": round(strength * 100), "deblur_iters": iters if want_deblur else 0, "sealed": report["sealed"],
                             "failed": [f"{c['key']} {c['value']}" for c in report["checks"] if not c["pass"]]})
            if report["sealed"] or opts.get("inject_fake"):
                break
            strength *= 0.7
            iters = max(0, iters - 6)

        step("classify")
        D.classify(cat_r, psf_fwhm)
        resid = (lum - rest_lum) / rms

        step("export")
        lo, hi = io.stretch_params(lum, float(np.median(bkg)))
        io.to_png(lum if arr.ndim == 2 else arr, lo, hi, out / "original.png") if arr.ndim == 2 else _rgb_png(arr, lo, hi, out / "original.png")
        if rest.ndim == 2:
            io.to_png(rest, lo, hi, out / "restored.png")
        else:
            _rgb_png(rest, lo, hi, out / "restored.png")
        io.heat_png(resid, out / "mist.png")

        sources = []
        for s in cat_o[: D.MAX_SOURCES]:
            sources.append({k: s[k] for k in ("id", "x", "y", "flux", "inst_mag", "snr", "fwhm", "area", "ellipticity", "orientation", "saturated", "class")})
        _add_sky_coords(sources, info, psf_fwhm)
        gaia = {"requested": bool(opts.get("gaia")), "matched": 0, "error": None}
        if opts.get("gaia") and any("ra" in x for x in sources):
            try:
                from .archive import gaia_match
                gaia["matched"] = gaia_match(sources)
            except Exception as e:
                gaia["error"] = f"{type(e).__name__}: {e}"[:200]

        result = {
            "id": jid,
            "name": JOBS[jid]["name"],
            "width": int(lum.shape[1]), "height": int(lum.shape[0]),
            "info": {k: v for k, v in info.items() if k not in ("header", "wcs_header")},
            "noise_sigma": round(rms, 6),
            "background": round(float(np.median(bkg)), 6),
            "method": method,
            "drunet_available": R.drunet_available(),
            "star_protection": True,
            "psf": {"fwhm_px": psf_fwhm, "n_stars": n_psf, "used_for_deblur": want_deblur},
            "attempts": attempts,
            "final": attempts[-1],
            "seal": report,
            "fake_star": fake,
            "sources": sources,
            "counts": {"stars": sum(s["class"] == "star" for s in sources), "extended": sum(s["class"] == "extended" for s in sources)},
            "files": {"original": f"/api/lens/files/{jid}/original.png", "restored": f"/api/lens/files/{jid}/restored.png",
                      "mist": f"/api/lens/files/{jid}/mist.png"},
            "gaia": gaia,
            "source": opts.get("source"),
            "seconds": round(time.time() - t0, 1),
        }
        if report["sealed"] and not opts.get("inject_fake"):
            try:
                from ..honor import award
                result["honor"] = bool(award("sealed", jid))
            except Exception:
                pass
        (out / "result.json").write_text(json.dumps(result))
        _set(jid, status="done", step="export", progress=100, result=result)
    except ValueError as e:
        _set(jid, status="error", error=str(e))
    except Exception as e:  # keep the server alive, report the reason
        _set(jid, status="error", error=f"Processing failed: {type(e).__name__}: {e}")


def _rgb_png(arr: np.ndarray, lo: float, hi: float, path) -> None:
    from PIL import Image
    x = np.clip((arr - lo) / (hi - lo), 0, None)
    y = np.arcsinh(10 * x) / np.arcsinh(10)
    Image.fromarray((np.clip(y, 0, 1) * 255).astype(np.uint8)).save(path, optimize=True)


def _add_sky_coords(sources: list[dict], info: dict, psf_fwhm: float | None) -> None:
    """For FITS with WCS: RA/Dec and angular size per source."""
    hdr = info.get("wcs_header")
    if not hdr:
        return
    try:
        from astropy.io.fits import Header
        from astropy.wcs import WCS
        from astropy.wcs.utils import proj_plane_pixel_scales
        w = WCS(Header.fromstring(hdr))
        h = info.get("downscaled_to", info["original_size"])[1]
        scale = info["original_size"][0] / info.get("downscaled_to", info["original_size"])[0]
        arcsec_px = float(np.mean(proj_plane_pixel_scales(w))) * 3600 * scale
        for s in sources:
            # undo display flip and downscale to get original FITS pixel coords
            px, py = s["x"] * scale, (h - 1 - s["y"]) * scale
            ra, dec = w.all_pix2world([[px, py]], 0)[0]
            s["ra"], s["dec"] = round(float(ra), 6), round(float(dec), 6)
            s["size_arcsec"] = round(s["fwhm"] * arcsec_px, 2)
        info["arcsec_per_px"] = round(arcsec_px, 3)
    except Exception:
        pass
