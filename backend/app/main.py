from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, FRONTEND_DIST

from .db import init_db
from .demo_cache import DemoCache
from .meta import envelope
from .routers import honor, lens, scroll, watchtower


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Celestra API", version="1.0.0", lifespan=lifespan)
app.add_middleware(DemoCache)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(watchtower.router)
app.include_router(scroll.router)
app.include_router(lens.router)
app.include_router(honor.router)


@app.get("/api/health")
def health():
    return envelope({"ok": True, "app": "Celestra"}, source="celestra", status="computed")


# Serve the built website from the same server (single-port deployment).
if (FRONTEND_DIST / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404)
        f = (FRONTEND_DIST / path).resolve()
        if path and f.is_file() and FRONTEND_DIST in f.parents:
            return FileResponse(f)
        return FileResponse(FRONTEND_DIST / "index.html")
