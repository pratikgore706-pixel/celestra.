---
title: Celestra
emoji: 🌙
colorFrom: indigo
colorTo: red
sdk: docker
app_port: 7860
pinned: false
short_description: Clearest sky near you, what's up tonight, honest image restoration
---

# Celestra

*Read the heavens. Honor the night.*

Celestra is a night-sky companion. It tells you **where** and **when** the sky will be clearest, **what**
you can see from your exact location, and restores your space photos while **proving** that nothing was
invented. Available in English, हिन्दी, ਪੰਜਾਬੀ and 日本語, with two themes (Night and Dawn).

| Module | What it does |
| --- | --- |
| **Watchtower** | Finds temples, peaks, viewpoints, observatories and parks near you and scores every hour from sunset to sunrise with the Night Honor Score. Four observing modes, best two-hour window, light-pollution estimate, confidence badge, map and ranked list. |
| **Celestial Scroll** | Lunar calendar with moon phases and lunar-night names, meteor showers, eclipses, planets, visible ISS passes and rocket launches, each checked against your horizon. Reminders and browser notifications. |
| **Spirit Lens** | Denoising with the measured noise level and deblurring with the blur measured from your own stars, star and galaxy detection, and the **Seal of Truth**: five measured checks that nothing was invented, lost, moved or dimmed. NASA SkyView archive images with Gaia DR3 names, and a Blink comparator for changes between epochs. |
| **Dojo** | Tonight at a glance: score, Moon, upcoming events, sky dome, top spots, latest restoration, Honor Points and the Seven Virtues. |
| **Guide** | In-app guide to every screen, in all four languages. |

No API keys are needed. All data comes from free public services or is computed locally.

---

## Quick start (Windows)

Requirements: **Python 3.12+** and **Node.js 18+**.

1. Double-click **`setup.bat`** once. It creates `backend\.venv`, installs Python and website packages, and checks the install.
2. Double-click **`start.bat`**. It opens the API (port 8000) and the website (port 5173) and launches http://localhost:5173.
3. If anything stops responding, double-click **`restart.bat`**.

## Quick start (macOS / Linux)

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt -r requirements-science.txt
# optional, better denoising (~1 GB):
# pip install torch --index-url https://download.pytorch.org/whl/cpu && pip install deepinv
uvicorn app.main:app --reload --port 8000

# second terminal
cd frontend
npm install
npm run dev            # http://localhost:5173
```

---

## Deploying

In production the API server also serves the built website, so Celestra runs as **one process on one port**.

### Option A: Docker (recommended)

```bash
docker build -t celestra .                          # add --build-arg WITH_DRUNET=0 for a smaller image
docker run -p 8000:7860 -v celestra-data:/data celestra
```

Open http://localhost:8000. The `/data` volume keeps the database, caches and image jobs between restarts.
The image works on any container host (Hugging Face Spaces, Render, Railway, Fly.io, Google Cloud Run, a VM).
It listens on `$PORT` (7860 by default) and runs as an unprivileged user.

### Free option: Vercel (website) + Render (API)

1. **Render** → New → Blueprint → pick this repo. `render.yaml` creates `celestra-api` (free, Python).
   Note its URL, e.g. `https://celestra-api.onrender.com`.
2. **Vercel** → Add New Project → this repo → Root Directory `frontend` (framework Vite).
   Add the environment variable `VITE_API_BASE` = your Render URL, then Deploy.
3. Back on Render, set `CELESTRA_CORS_ORIGINS` = your Vercel URL (e.g. `https://celestra.vercel.app`) and redeploy.

The free Render service sleeps after 15 minutes without visitors (first request then takes about a minute)
and has 512 MB of memory, so large Spirit Lens images may be slow or fail; the sample field works.

### Option B: a plain server

```bash
./serve.sh             # Linux / macOS
serve.bat              # Windows
```

Both build the website (`frontend/dist`) and start `uvicorn` on port 8000 (or `$PORT`). Put a reverse
proxy such as Nginx or Caddy in front of it for HTTPS.

### Option C: separate static site and API

Build the frontend with the API address baked in and host `frontend/dist` on any static host
(Netlify, Vercel, GitHub Pages with SPA fallback):

```bash
cd frontend
VITE_API_BASE=https://api.example.com npm run build
```

Run the backend anywhere and set `CELESTRA_CORS_ORIGINS=https://your-site.example`.

### Configuration

All settings are optional environment variables (see `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `CELESTRA_DATA_DIR` | `backend/` | Database, HTTP cache, fallback responses and image jobs |
| `CELESTRA_CORS_ORIGINS` | `*` | Allowed browser origins, comma-separated |
| `CELESTRA_FRONTEND_DIST` | `frontend/dist` | Built website served by the API |
| `PORT` | `7860` in Docker, `8000` for `serve.sh` | Port the server listens on (most hosts set this for you) |
| `VITE_API_BASE` | *(empty)* | Build-time API address when the site and API are on different domains |

Health check: `GET /api/health`. Interactive API docs: `/docs`.

---

## Data sources

| Data | Source | Status shown |
| --- | --- | --- |
| Weather forecast | Open-Meteo | live / cached |
| Observing spots | OpenStreetMap via Photon and Overpass, plus a curated list of notable sites | live / curated |
| Moon, Sun, planets, eclipses | astronomy-engine, computed locally | computed |
| Meteor showers | International Meteor Organization calendar | computed |
| ISS passes | CelesTrak TLE + skyfield (sunlit station, dark sky) | computed |
| Launches | Launch Library 2 (The Space Devs) | live / cached |
| Survey images | NASA SkyView (DSS, 2MASS) | live |
| Star names | Gaia DR3 via VizieR | live |

If a live service fails, the app shows the last good answer marked **cached**.

## Known limitations

- The Night Honor Score is Celestra's own estimate (formula `nhs-2.0`), not an official measurement.
- Light pollution is estimated from distance to cities and towns, not measured from satellite data.
- Spirit Lens brightness is relative (instrumental magnitude); sizes are in pixels unless the image has sky coordinates.
- Restoration never adds detail. Every result is checked by the Seal of Truth.

## Project structure

```
backend/    FastAPI app, services, tests
frontend/   React + Vite site (pages, components, i18n, styles, landing artwork)
docs/       Architecture and formulas (docs/ARCHITECTURE.md)
Dockerfile  Single-image build (site + API)
```

## Tests

```bash
cd backend && python -m pytest -q
```

## Credits

FastAPI, React, Vite, Leaflet, Recharts, astronomy-engine, skyfield, astropy, photutils, scikit-image,
astroquery, deepinv (DRUNet). Map tiles © Esri; map data © OpenStreetMap contributors.
