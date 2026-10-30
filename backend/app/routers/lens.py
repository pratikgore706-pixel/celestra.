from __future__ import annotations

import csv
import io

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from ..meta import envelope
from pydantic import BaseModel

from ..services.lens import archive, pipeline, sample

router = APIRouter(prefix="/api/lens")


def _opts(strength: int, deblur: bool, inject_fake: bool) -> dict:
    return {"strength": strength, "deblur": deblur, "inject_fake": inject_fake}


@router.post("/jobs")
async def create_job(bg: BackgroundTasks, file: UploadFile = File(...), strength: int = Form(85),
                     deblur: bool = Form(True), inject_fake: bool = Form(False)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "The file is empty.")
    jid = pipeline.new_job(file.filename or "upload", _opts(strength, deblur, inject_fake))
    bg.add_task(pipeline.run, jid, data)
    return envelope({"id": jid}, source="celestra", status="computed")


@router.post("/sample")
async def sample_job(bg: BackgroundTasks, strength: int = Form(85), deblur: bool = Form(True), inject_fake: bool = Form(False)):
    jid = pipeline.new_job("Synthetic test field", _opts(strength, deblur, inject_fake))
    bg.add_task(pipeline.run, jid, sample.make())
    return envelope({"id": jid}, source="celestra", status="demo")


class ArchiveIn(BaseModel):
    target: str
    survey: str = "DSS2 Red"
    size_deg: float = 0.4
    strength: int = 85
    deblur: bool = True
    add_noise: bool = False


@router.post("/skyview")
async def skyview_job(a: ArchiveIn, bg: BackgroundTasks):
    """Summon an archival survey image from NASA SkyView and run it through the Spirit Lens."""
    if not a.target.strip():
        raise HTTPException(400, "Enter a target such as M42 or 'Andromeda Galaxy'.")
    opts = {"strength": a.strength, "deblur": a.deblur, "inject_fake": False, "gaia": True,
            "source": {"kind": "skyview", "target": a.target, "survey": a.survey, "url": archive.SOURCE_URL}}
    jid = pipeline.new_job(f"{a.target} · {a.survey}", opts)

    def fetch():
        data = archive.fetch_fits(a.target, a.survey, a.size_deg)
        if a.add_noise:
            data = _noisy(data)
        return data

    bg.add_task(pipeline.run, jid, None, fetch)
    return envelope({"id": jid}, source="NASA SkyView", status="live")


def _noisy(fits_bytes: bytes) -> bytes:
    """Demo helper: add Gaussian noise to an archive image (labelled in the job name)."""
    import numpy as np
    from astropy.io import fits
    with fits.open(io.BytesIO(fits_bytes)) as h:
        d = h[0].data.astype("float32")
        rng = np.random.default_rng(3)
        h[0].data = d + rng.normal(0, 0.025 * float(np.percentile(d, 99.5) - np.median(d)), d.shape).astype("float32")
        b = io.BytesIO()
        h.writeto(b)
        return b.getvalue()


class BlinkIn(BaseModel):
    target: str | None = None      # fetch DSS1 + DSS2 from SkyView
    sample: bool = False           # synthetic two-epoch field


@router.post("/blink")
def blink_run(b: BlinkIn):
    from ..services.lens import blink
    from ..services.honor import award
    try:
        if b.sample or not b.target:
            a_bytes, b_bytes = blink.sample_epochs()
            res = blink.run(a_bytes, b_bytes, "Epoch A", "Epoch B", "Synthetic two-epoch field")
            status = "demo"
        else:
            a_bytes = archive.fetch_fits(b.target, "DSS1 Red", 0.3, 700)
            b_bytes = archive.fetch_fits(b.target, "DSS2 Red", 0.3, 700)
            res = blink.run(a_bytes, b_bytes, "DSS1 Red (1950s)", "DSS2 Red (1990s)", b.target)
            status = "live"
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"Blink failed: {type(e).__name__}: {e}"[:300])
    if res["candidates"]:
        award("blink", res["id"])
    return envelope(res, source="NASA SkyView" if status == "live" else "celestra", status=status)


@router.get("/jobs/latest")
def latest():
    jid = pipeline.latest()
    return envelope({"id": jid}, source="celestra", status="computed")


@router.get("/jobs/{jid}")
def job(jid: str):
    j = pipeline.get(jid)
    if not j:
        raise HTTPException(404, "Job not found.")
    return envelope(j, source="celestra", status="computed")


@router.get("/jobs/{jid}/catalog.csv")
def catalog_csv(jid: str):
    j = pipeline.get(jid)
    if not j or not j.get("result"):
        raise HTTPException(404, "Result not ready.")
    rows = j["result"]["sources"]
    buf = io.StringIO()
    cols = ["id", "class", "x", "y", "inst_mag", "flux", "snr", "fwhm", "area", "ellipticity", "saturated", "ra", "dec", "size_arcsec"]
    wr = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    wr.writeheader()
    wr.writerows(rows)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="celestra_{jid}_objects.csv"'})


@router.get("/files/{jid}/{name}")
def files(jid: str, name: str):
    if name not in ("original.png", "restored.png", "mist.png", "result.json", "a.png", "b.png", "diff.png") or not jid.isalnum():
        raise HTTPException(404)
    p = pipeline.STORAGE / jid / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p)
