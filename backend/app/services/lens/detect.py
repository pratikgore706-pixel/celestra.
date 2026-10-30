"""Background, noise and source detection (photutils), plus PSF measurement."""
from __future__ import annotations

import warnings

warnings.filterwarnings("ignore", module="photutils")
warnings.filterwarnings("ignore", message=".*deprecated.*")
warnings.filterwarnings("ignore", message=".*No sources were found.*")

import numpy as np
from astropy.convolution import convolve
from astropy.stats import SigmaClip
from photutils.background import Background2D, MedianBackground
from photutils.segmentation import SourceCatalog, deblend_sources, detect_sources, make_2dgaussian_kernel

MAX_SOURCES = 600   # for display; the Seal of Truth always uses the full lists
FULL = 20000


def background(lum: np.ndarray) -> tuple[np.ndarray, float]:
    h, w = lum.shape
    box = max(16, min(h, w) // 12)
    bkg = Background2D(lum, (box, box), filter_size=(3, 3), sigma_clip=SigmaClip(sigma=3.0), bkg_estimator=MedianBackground())
    return bkg.background.astype(np.float32), float(bkg.background_rms_median)


def detect(lum: np.ndarray, bkg: np.ndarray, rms: float, nsigma: float = 5.0, npixels: int = 6, limit: int | None = MAX_SOURCES) -> list[dict]:
    data = lum - bkg
    kernel = make_2dgaussian_kernel(2.0, size=5)
    conv = convolve(data, kernel)
    # smoothing lowers the noise by sqrt(sum k^2); scale the threshold so it is a true n-sigma cut
    conv_rms = rms * float(np.sqrt(np.sum(np.asarray(kernel.array) ** 2)))
    seg = detect_sources(conv, nsigma * conv_rms, npixels=npixels)
    if seg is None:
        return []
    try:
        seg = deblend_sources(conv, seg, npixels=npixels, nlevels=16, contrast=0.005, progress_bar=False)
    except Exception:
        pass
    cat = SourceCatalog(data, seg, convolved_data=conv)
    peak_all = float(np.max(lum))
    rows = []
    for s in cat:
        try:
            x, y = float(s.xcentroid), float(s.ycentroid)
            flux = float(s.segment_flux)
            if not np.isfinite(x) or not np.isfinite(y) or flux <= 0:
                continue
            fwhm = float(s.fwhm.value)
            ell = float(s.ellipticity.value) if hasattr(s.ellipticity, "value") else float(s.ellipticity)
            area = float(s.area.value)
            peak = float(s.max_value) + float(bkg[int(round(y)), int(round(x))])
            orient = float(s.orientation.value) if s.orientation is not None else 0.0
            rows.append({
                "x": round(x, 2), "y": round(y, 2), "flux": flux, "fwhm": round(fwhm, 2),
                "ellipticity": round(ell, 3), "area": round(area, 1), "peak": peak,
                "orientation": round(orient, 1),
                "saturated": peak >= 0.98 * peak_all,
            })
        except Exception:
            continue
    rows.sort(key=lambda r: -r["flux"])
    if limit:
        rows = rows[:limit]
    for i, r in enumerate(rows, 1):
        r["id"] = i
        r["snr"] = round(r["flux"] / (rms * np.sqrt(max(r["area"], 1.0))), 1)
        r["inst_mag"] = round(-2.5 * np.log10(r["flux"]), 2)
    return rows


def measure_psf(data: np.ndarray, sources: list[dict], half: int = 7) -> tuple[np.ndarray | None, float | None, int]:
    """Median-stack bright, isolated, unsaturated, round stars into an empirical PSF."""
    h, w = data.shape
    pts = np.array([[s["x"], s["y"]] for s in sources]) if sources else np.zeros((0, 2))
    cands = []
    for s in sources:
        if s["saturated"] or s["ellipticity"] > 0.25 or s["snr"] < 15:
            continue
        x, y = int(round(s["x"])), int(round(s["y"]))
        if x - half < 0 or y - half < 0 or x + half + 1 > w or y + half + 1 > h:
            continue
        d = np.hypot(pts[:, 0] - s["x"], pts[:, 1] - s["y"])
        if np.sum(d < 3 * half) > 1:  # a neighbour inside the stamp
            continue
        cands.append(s)
        if len(cands) >= 30:
            break
    if len(cands) < 3:
        return None, None, len(cands)
    stamps = []
    for s in cands:
        x, y = int(round(s["x"])), int(round(s["y"]))
        st = data[y - half:y + half + 1, x - half:x + half + 1].astype(np.float64)
        st = st - np.median(np.concatenate([st[0], st[-1], st[:, 0], st[:, -1]]))
        tot = st.sum()
        if tot > 0:
            stamps.append(st / tot)
    psf = np.median(np.stack(stamps), axis=0)
    psf = np.clip(psf, 0, None)
    psf /= psf.sum()
    fwhm = float(np.median([s["fwhm"] for s in cands]))
    return psf.astype(np.float32), round(fwhm, 2), len(cands)


def classify(sources: list[dict], psf_fwhm: float | None) -> None:
    ref = psf_fwhm or (float(np.median([s["fwhm"] for s in sources])) if sources else 3.0)
    for s in sources:
        point = s["fwhm"] <= 1.5 * ref and s["ellipticity"] < 0.3
        s["class"] = "star" if point else "extended"
