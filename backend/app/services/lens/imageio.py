"""Load uploads safely (by content, not file name) and render display PNGs.

Science arrays stay linear float32. Only the PNGs shown in the browser are stretched.
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image

MAX_BYTES = 25 * 1024 * 1024
MAX_SIDE = 4096
WORK_SIDE = 2048  # processing size cap, keeps CPU jobs under a minute

Image.MAX_IMAGE_PIXELS = MAX_SIDE * MAX_SIDE * 2


def sniff(head: bytes) -> str | None:
    if head.startswith(b"\x89PNG"):
        return "png"
    if head[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if head[:4] in (b"II*\x00", b"MM\x00*"):
        return "tiff"
    if head.startswith(b"SIMPLE  ="):
        return "fits"
    return None


def load(data: bytes) -> tuple[np.ndarray, dict]:
    """Returns (array HxW or HxWx3 float32, info). Raises ValueError with a readable message."""
    if len(data) > MAX_BYTES:
        raise ValueError("File is larger than 25 MB.")
    kind = sniff(data[:16])
    if kind is None:
        raise ValueError("Unsupported file. Use PNG, JPEG, TIFF or FITS.")
    info: dict = {"format": kind}
    if kind == "fits":
        from astropy.io import fits
        with fits.open(io.BytesIO(data), memmap=False) as hdul:
            hdu = next((h for h in hdul if h.data is not None and h.data.ndim >= 2), None)
            if hdu is None:
                raise ValueError("FITS file has no 2-D image.")
            arr = np.asarray(hdu.data, dtype=np.float32)
            while arr.ndim > 2:
                arr = arr[0]
            info["header"] = {k: str(hdu.header[k]) for k in list(hdu.header.keys())[:80] if k}
            try:
                from astropy.wcs import WCS
                w = WCS(hdu.header)
                info["has_wcs"] = bool(w.has_celestial)
                info["wcs_header"] = w.to_header().tostring() if w.has_celestial else None
            except Exception:
                info["has_wcs"] = False
        arr = np.nan_to_num(arr, nan=float(np.nanmedian(arr)))
        arr = np.flipud(arr)  # FITS origin is bottom-left; display top-left
    else:
        im = Image.open(io.BytesIO(data))
        im.load()
        if im.mode in ("I;16", "I;16B", "I", "F"):
            arr = np.asarray(im, dtype=np.float32)
        else:
            arr = np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0
            if np.allclose(arr[..., 0], arr[..., 1]) and np.allclose(arr[..., 1], arr[..., 2]):
                arr = arr[..., 0]
    h, w = arr.shape[:2]
    if max(h, w) > MAX_SIDE:
        raise ValueError(f"Image is {w}x{h}; the limit is {MAX_SIDE} px per side.")
    info["original_size"] = [int(w), int(h)]
    if max(h, w) > WORK_SIDE:
        scale = WORK_SIDE / max(h, w)
        arr = resize(arr, scale)
        info["downscaled_to"] = [int(arr.shape[1]), int(arr.shape[0])]
    return np.ascontiguousarray(arr, dtype=np.float32), info


def resize(arr: np.ndarray, scale: float) -> np.ndarray:
    from skimage.transform import rescale
    return rescale(arr, scale, anti_aliasing=True, channel_axis=2 if arr.ndim == 3 else None, preserve_range=True).astype(np.float32)


def luminance(arr: np.ndarray) -> np.ndarray:
    if arr.ndim == 2:
        return arr
    return (0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]).astype(np.float32)


def stretch_params(lum: np.ndarray, bkg: float) -> tuple[float, float]:
    hi = float(np.percentile(lum, 99.85))
    return bkg, max(hi, bkg + 1e-6)


def to_png(arr: np.ndarray, lo: float, hi: float, path) -> None:
    """asinh display stretch with fixed black/white points so before/after compare fairly."""
    x = np.clip((arr - lo) / (hi - lo), 0, None)
    a = 10.0
    y = np.arcsinh(a * x) / np.arcsinh(a)
    img = (np.clip(y, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(img).save(path, optimize=True)


def heat_png(resid_sigma: np.ndarray, path) -> None:
    """Mist Map: |original - restored| in units of noise sigma. ink -> crimson -> gold."""
    # plain noise (about 1 sigma) stays dark; anything structured (>3 sigma) glows
    v = np.clip(np.abs(resid_sigma) / 6.0, 0, 1) ** 1.4
    stops = np.array([[8, 8, 14], [40, 22, 48], [140, 28, 44], [226, 69, 47], [241, 200, 120]], dtype=np.float32)
    idx = v * (len(stops) - 1)
    i0 = np.floor(idx).astype(int).clip(0, len(stops) - 2)
    f = (idx - i0)[..., None]
    rgb = stops[i0] * (1 - f) + stops[i0 + 1] * f
    Image.fromarray(rgb.astype(np.uint8)).save(path, optimize=True)
