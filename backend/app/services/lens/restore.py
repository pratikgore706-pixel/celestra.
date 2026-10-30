"""Restoration: noise-level-aware denoising + PSF deconvolution. Nothing generative.

Denoiser chain (first that is installed wins):
  1. DRUNet (pretrained, via deepinv + torch) given the MEASURED noise level.
  2. Non-local means (scikit-image) with the same measured noise level.
Star protection: inside detected sources the measured starlight is kept as-is, so the
denoiser only works on the sky between stars. Deblur uses the PSF measured from the
image's own stars (Richardson-Lucy), so sharpening cannot add new stars.
"""
from __future__ import annotations

import numpy as np

_MODELS: dict = {}


def drunet_available() -> bool:
    try:
        import deepinv  # noqa: F401
        import torch  # noqa: F401
        return True
    except Exception:
        return False


def _drunet_model(channels: int):
    if channels not in _MODELS:
        import deepinv as dinv
        m = dinv.models.DRUNet(in_channels=channels, out_channels=channels, pretrained="download")
        m.eval()
        _MODELS[channels] = m
    return _MODELS[channels]


def _drunet(img01: np.ndarray, sigma01: float) -> np.ndarray:
    import torch
    chw = img01[None] if img01.ndim == 2 else np.moveaxis(img01, 2, 0)
    c, h, w = chw.shape
    model = _drunet_model(c)
    tile, ov = 512, 32
    out = np.zeros_like(chw)
    weight = np.zeros((h, w), dtype=np.float32)
    with torch.no_grad():
        for y0 in range(0, h, tile - ov):
            for x0 in range(0, w, tile - ov):
                y1, x1 = min(y0 + tile, h), min(x0 + tile, w)
                patch = chw[:, y0:y1, x0:x1]
                ph, pw = patch.shape[1:]
                py, px = (-ph) % 8, (-pw) % 8
                p = np.pad(patch, ((0, 0), (0, py), (0, px)), mode="reflect")
                t = torch.from_numpy(p[None].copy()).float()
                r = model(t, sigma=float(sigma01)).numpy()[0, :, :ph, :pw]
                out[:, y0:y1, x0:x1] += r
                weight[y0:y1, x0:x1] += 1
                if x1 == w:
                    break
            if y1 == h:
                break
    out /= weight[None]
    return out[0] if img01.ndim == 2 else np.moveaxis(out, 0, 2)


def _nlmeans(img01: np.ndarray, sigma01: float) -> np.ndarray:
    from skimage.restoration import denoise_nl_means
    return denoise_nl_means(img01, h=0.8 * sigma01, sigma=sigma01, fast_mode=True, patch_size=5,
                            patch_distance=6, channel_axis=2 if img01.ndim == 3 else None).astype(np.float32)


def denoise(arr: np.ndarray, rms: float) -> tuple[np.ndarray, str]:
    lo, hi = float(arr.min()), float(arr.max())
    span = max(hi - lo, 1e-9)
    x = (arr - lo) / span
    s = rms / span
    if drunet_available():
        try:
            return _drunet(x, s) * span + lo, "DRUNet (pretrained, deepinv)"
        except Exception as e:  # fall back, but say why
            return _nlmeans(x, s) * span + lo, f"Non-local means (scikit-image) · DRUNet failed: {type(e).__name__}"
    return _nlmeans(x, s) * span + lo, "Non-local means (scikit-image)"


def star_mask(shape: tuple[int, int], sources: list[dict], psf_fwhm: float) -> np.ndarray:
    """Soft mask: 1 inside each detected source, feathered to 0 outside."""
    h, w = shape
    m = np.zeros((h, w), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    for s in sources:
        r = max(2.0 * max(s["fwhm"], psf_fwhm), 3.0)
        if s.get("class") == "extended":
            r = max(r, np.sqrt(s["area"] / np.pi) * 1.3)
        x0, x1 = int(max(s["x"] - 2 * r, 0)), int(min(s["x"] + 2 * r + 1, w))
        y0, y1 = int(max(s["y"] - 2 * r, 0)), int(min(s["y"] + 2 * r + 1, h))
        d = np.hypot(xx[y0:y1, x0:x1] - s["x"], yy[y0:y1, x0:x1] - s["y"])
        v = np.clip(1.5 - d / r, 0, 1)
        m[y0:y1, x0:x1] = np.maximum(m[y0:y1, x0:x1], v)
    return m


def protect(original: np.ndarray, denoised: np.ndarray, mask: np.ndarray) -> np.ndarray:
    m = mask if original.ndim == 2 else mask[..., None]
    return denoised * (1 - m) + original * m


def deblur(arr: np.ndarray, bkg: np.ndarray, rms: float, psf: np.ndarray, iters: int, mask: np.ndarray | None = None) -> np.ndarray:
    """Richardson-Lucy with the measured PSF, applied only where known sources are (mask),
    so empty sky is never sharpened into fake points. Edges are padded to avoid ringing."""
    from skimage.restoration import richardson_lucy
    pad = psf.shape[0] * 2

    def one(ch: np.ndarray, b: np.ndarray) -> np.ndarray:
        off = 5 * rms
        x = np.clip(ch - b + off, 1e-6, None)
        x = np.pad(x, pad, mode="reflect")
        scale = float(x.max())
        r = richardson_lucy(x / scale, psf, num_iter=iters, clip=False)[pad:-pad, pad:-pad]
        return (r * scale - off + b).astype(np.float32)

    if arr.ndim == 2:
        out = one(arr, bkg)
    else:
        out = np.stack([one(arr[..., c], bkg) for c in range(arr.shape[2])], axis=2)
    if mask is not None:
        m = mask if arr.ndim == 2 else mask[..., None]
        out = arr * (1 - m) + out * m
    return out
