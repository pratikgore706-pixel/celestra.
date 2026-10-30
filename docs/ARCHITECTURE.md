# Celestra architecture

Celestra is two programs: a **FastAPI** backend (`backend/app`) and a **React + Vite** frontend
(`frontend/src`). In development the Vite dev server proxies `/api` to the backend; in production the
backend serves the built site itself, so everything runs on one port.

Every API response has the same shape:

```json
{ "data": { ... }, "meta": { "source": "Open-Meteo", "status": "live | cached | computed | demo", "fetched_at": "..." } }
```

## Backend layout

| Path | Purpose |
| --- | --- |
| `app/main.py` | App, CORS, fallback-cache middleware, routers, static site serving |
| `app/config.py` | Paths and settings from environment variables |
| `app/cache.py` | Disk-cached HTTP GET (`cached_get`, `cached_text`) |
| `app/demo_cache.py` | Saves the last good answer of key routes; serves it marked `cached` if a live call fails |
| `app/routers/` | `watchtower`, `scroll`, `lens`, `honor` HTTP endpoints |
| `app/services/sky.py` | Sun / Moon / planet positions, rise and set, night window (astronomy-engine) |
| `app/services/weather.py` | One Open-Meteo request for many points |
| `app/services/scoring.py` | Night Honor Score `nhs-2.0` |
| `app/services/places.py` | Spot search (Photon, Overpass, curated list), light-pollution estimate |
| `app/services/events.py` | Lunar calendar, moon phases, meteor showers, eclipses, planets |
| `app/services/iss.py` | Visible ISS passes (CelesTrak TLE + skyfield) |
| `app/services/launches.py` | Upcoming launches (Launch Library 2) |
| `app/services/honor.py` | Honor Points, ranks, Seven Virtues |
| `app/services/lens/` | Image pipeline: `imageio`, `detect`, `restore`, `seal`, `pipeline`, `archive`, `blink`, `sample` |
| `app/data/` | Curated sites and cities, meteor shower table, lunar-night names |

## Night Honor Score (`nhs-2.0`)

Per hour, five parts from 0 to 100, mixed by observing mode and multiplied by a rain gate:

| Part | Rule |
| --- | --- |
| C clear sky | effective cloud = 1 − (1−low)(1−mid)(1−0.8·high); C = 100·(1 − effective) |
| T transparency | visibility 0 → 24 km maps to 0 → 100; −25 when temperature − dew point < 2 °C |
| D darkness | Sun > −12° → 0, −12° to −18° → 50, below → 100; minus Moon glow (illumination · sin(alt) · 60) and light pollution |
| S steadiness | 100 up to 10 km/h wind, linear to 0 at 40 km/h |
| M moon height | Moon & planets mode only: 100 · sin(Moon altitude) |
| G rain gate | ×1.0 below 30 %, ×0.6 below 60 %, otherwise ×0.2 |

Weights (C/T/D/S/M): casual .50/.20/.20/.10, deep-sky .45/.20/.30/.05, moon & planets .45/.15/–/.25/.15,
meteors .50/.10/.35/.05. Missing inputs are dropped and the rest rescaled. The headline is the best
two-hour average between sunset and sunrise. Confidence: high < 24 h ahead, medium < 72 h, else low.

## Spirit Lens pipeline

`load → noise → detect → denoise → psf → deblur → seal → classify → export`

1. Read PNG / JPEG / TIFF / FITS (content-checked, 25 MB, 4096 px max); WCS read when present.
2. Background and noise σ with photutils `Background2D`.
3. Sources at a true 5σ matched-filter threshold, deblended, measured with `SourceCatalog`.
4. Denoise with the measured σ: DRUNet (deepinv, pretrained) if installed, otherwise non-local means.
   Star pixels are protected and kept as measured.
5. Empirical PSF: median stack of 10–30 clean stars, FWHM in pixels.
6. Richardson–Lucy deconvolution with that PSF, only inside the star mask.
7. **Seal of Truth** — all must pass: no invented sources (local-annulus S/N < 2 in the original),
   ≥ 95 % of sources kept, median flux ratio 0.95–1.05 (bright stars 0.8–1.2), median shift < 0.3 px,
   residual is noise (RMS ≤ 1.15σ, no blobs). On failure: strength × 0.7, 6 fewer RL iterations, up to 3 attempts.
8. Star vs extended by size and elongation against the PSF; Gaia DR3 match within 3″ for archive images.
9. Export original, restored, removed-part map, JSON report, CSV catalogue.

**Blink comparator:** DSS1 and DSS2 epochs from SkyView on the same grid → phase-correlation alignment →
PSF matching → flux scaling on shared bright stars → signed 5σ difference → new / vanished /
brightened / faded candidates.

## Frontend layout

| Path | Purpose |
| --- | --- |
| `pages/` | `Landing`, `Dojo`, `Watchtower`, `Scroll`, `Lens`, `Guide` |
| `components/` | Layout, scene art, panels, charts, compare viewer, seal, blink, honor, sky dome, map markers |
| `i18n/` | UI strings (EN / HI / PA / JA), guide and landing copy |
| `lib/` | Formatting, saved place, reminders, Punjabi date fallback |
| `styles/` | `tokens.css`, `base.css`, `theme.css`, `tsukuyomi.css` (current look, Night and Dawn themes) |
| `public/landing/` | Layered landing artwork (sky, scene, arm, ribbon) |
