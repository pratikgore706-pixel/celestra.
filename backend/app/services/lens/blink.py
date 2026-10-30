"""Blink comparator: two images of the same field, aligned, matched, subtracted.

Whatever survives the subtraction above 5 sigma is a transient / variable candidate.
This is how Clyde Tombaugh found Pluto in 1930 (he flicked between two plates by eye).
"""
from __future__ import annotations

import json
import time
import uuid

import numpy as np
from scipy.ndimage import gaussian_filter, shift as nd_shift

from . import detect as D
from . import imageio as io
from .pipeline import STORAGE, _rgb_png
from .seal import _local_snr


def _prep(data: bytes):
    arr, info = io.load(data)
    lum = io.luminance(arr)
    bkg, rms = D.background(lum)
    return lum, bkg, rms, info


def run(a_bytes: bytes, b_bytes: bytes, label_a: str, label_b: str, name: str) -> dict:
    t0 = time.time()
    bid = "b" + uuid.uuid4().hex[:11]
    out = STORAGE / bid
    out.mkdir(parents=True, exist_ok=True)

    A, bA, rA, infoA = _prep(a_bytes)
    B, bB, rB, infoB = _prep(b_bytes)
    if A.shape != B.shape:
        B = io.resize(B, A.shape[1] / B.shape[1])[: A.shape[0], : A.shape[1]]
        bB, rB = D.background(B)
    # align by translation (SkyView images are already on the same grid; uploads may not be)
    from skimage.registration import phase_cross_correlation
    shift, _, _ = phase_cross_correlation(A - bA, B - bB, upsample_factor=10)
    if np.hypot(*shift) > 0.2:
        B = nd_shift(B, shift, order=1, mode="nearest").astype(np.float32)
        bB = nd_shift(bB, shift, order=1, mode="nearest").astype(np.float32)

    dA, dB = A - bA, B - bB
    catA = D.detect(A, bA, rA)
    catB = D.detect(B, bB, rB)
    fA = float(np.median([s["fwhm"] for s in catA])) if catA else 3.0
    fB = float(np.median([s["fwhm"] for s in catB])) if catB else 3.0
    # PSF-match: blur the sharper image to the blurrier one's seeing
    if fA < fB:
        dA = gaussian_filter(dA, np.sqrt(max(fB**2 - fA**2, 0)) / 2.355)
    elif fB < fA:
        dB = gaussian_filter(dB, np.sqrt(max(fA**2 - fB**2, 0)) / 2.355)
    fw = max(fA, fB)
    r = max(2 * fw, 3.0)
    # flux-scale B onto A using bright, unsaturated stars present in both
    from .seal import _match, _phot
    pairs = _match([s for s in catA if s["snr"] > 20 and not s["saturated"]], catB, tol=2.5)
    brightA = [s for s in catA if s["snr"] > 20 and not s["saturated"]]
    if pairs:
        pts = [(brightA[i]["x"], brightA[i]["y"]) for i, _, _ in pairs]
        fa, fb = _phot(dA, pts, r), _phot(dB, pts, r)
        ok = (fa > 0) & (fb > 0)
        scale = float(np.median(fa[ok] / fb[ok])) if ok.any() else 1.0
    else:
        scale = 1.0
    dB = dB * scale
    diff = dB - dA
    sig = float(np.sqrt(rA**2 + (rB * scale) ** 2))

    # candidates: blobs in |diff|, skipping saturated stars (emulsion differences)
    sat = [s for s in catA + catB if s["saturated"]]
    zero = np.zeros_like(diff)
    blobs = D.detect(diff, zero, sig, nsigma=5.0, npixels=5) + D.detect(-diff, zero, sig, nsigma=5.0, npixels=5)
    cands = []
    for bl in blobs:
        if any(np.hypot(bl["x"] - s["x"], bl["y"] - s["y"]) < 4 * fw for s in sat):
            continue
        fa = _local_snr(dA, bl["x"], bl["y"], r, rA) * rA
        fb = _local_snr(dB, bl["x"], bl["y"], r, rB * scale) * rB * scale
        snr_a = _local_snr(dA, bl["x"], bl["y"], r, rA)
        snr_b = _local_snr(dB, bl["x"], bl["y"], r, rB * scale)
        change = _local_snr(diff, bl["x"], bl["y"], r, sig)
        if abs(change) < 5:
            continue
        # a steady star whose small change is under 25% of its light is not a candidate
        base = max(abs(fa), abs(fb), 1e-9)
        if abs(fb - fa) / base < 0.25 and min(snr_a, snr_b) > 5:
            continue
        kind = "new" if snr_a < 3 <= snr_b else "vanished" if snr_b < 3 <= snr_a else ("brightened" if fb > fa else "faded")
        cands.append({"x": bl["x"], "y": bl["y"], "kind": kind, "change_sigma": round(float(change), 1),
                      "snr_a": round(float(snr_a), 1), "snr_b": round(float(snr_b), 1),
                      "flux_ratio": round(float(fb / fa), 2) if fa > 0 and snr_a > 3 else None})
    cands.sort(key=lambda c: -abs(c["change_sigma"]))
    cands = cands[:12]

    lo, hi = io.stretch_params(A, float(np.median(bA)))
    io.to_png(A, lo, hi, out / "a.png")
    io.to_png(dB + bA, lo, hi, out / "b.png")
    io.heat_png(diff / sig, out / "diff.png")
    res = {
        "id": bid, "name": name, "width": int(A.shape[1]), "height": int(A.shape[0]),
        "labels": [label_a, label_b], "shift_px": [round(float(shift[1]), 2), round(float(shift[0]), 2)],
        "flux_scale": round(scale, 3), "fwhm": [round(fA, 2), round(fB, 2)], "noise_sigma": round(sig, 6),
        "candidates": cands,
        "files": {"a": f"/api/lens/files/{bid}/a.png", "b": f"/api/lens/files/{bid}/b.png", "diff": f"/api/lens/files/{bid}/diff.png"},
        "seconds": round(time.time() - t0, 1),
    }
    (out / "result.json").write_text(json.dumps(res))
    return res


def sample_epochs() -> tuple[bytes, bytes]:
    """Two epochs of the synthetic field: one star brightens x3, one new object appears."""
    from PIL import Image
    from .sample import make
    a = make(seed=11)
    arr = np.asarray(Image.open(io_bytes(a)), dtype=np.float32)
    h, w = arr.shape
    yy, xx = np.mgrid[0:h, 0:w]
    rng = np.random.default_rng(5)
    b = arr.copy() + rng.normal(0, 0.012 * 65535, arr.shape).astype(np.float32)  # fresh noise
    star = lambda x, y, f: f * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * 1.6**2))  # noqa: E731
    b += star(0.42 * w, 0.58 * h, 0.30 * 65535 / 1.2)       # a new transient
    b += star(0.70 * w, 0.22 * h, 0.22 * 65535 / 1.2)       # brightening of an existing spot
    buf = io_bytes()
    Image.fromarray(np.clip(b, 0, 65535).astype(np.uint16)).save(buf, format="PNG")
    return a, buf.getvalue()


def io_bytes(data: bytes | None = None):
    import io as _io
    return _io.BytesIO(data) if data is not None else _io.BytesIO()


__all__ = ["run", "sample_epochs", "_rgb_png"]
