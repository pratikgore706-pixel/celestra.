import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../i18n/I18n";
import Scene from "../components/Scene";
import { Panel, PageScene } from "../components/Panel";
import HonorCurve from "../components/HonorCurve";
import Enso from "../components/Enso";
import { spotIcon } from "../components/markers";
import { api, type Meta } from "../api/client";
import type { GeoResult, Mode, Spot, WatchtowerData } from "../api/types";
import { usePlace } from "../lib/place";
import { BAND_COLOR, BAND_HEX, fmtHour, fmtTime, todayLocal } from "../lib/format";

const MODES: Mode[] = ["casual", "deep", "moon", "meteor"];
const bandOf = (v: number) => (v >= 80 ? "shogun" : v >= 60 ? "clear" : v >= 40 ? "mist" : "storm");

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], Math.max(map.getZoom(), 9)); }, [lat, lon, map]);
  return null;
}
function ClickToScore({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function PlaceSearch() {
  const { t, lang } = useI18n();
  const { setPlace } = usePlace();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) { setRes([]); return; }
    timer.current = window.setTimeout(() => {
      api<GeoResult[]>(`/api/geocode?q=${encodeURIComponent(q)}&lang=${lang}`)
        .then((r) => { setRes(r.data); setOpen(true); })
        .catch(() => setRes([]));
    }, 350);
  }, [q, lang]);
  return (
    <div className="search" style={{ flex: "1 1 280px" }}>
      <input id="place" className="field" style={{ width: "100%" }} value={q} placeholder={t("watch.search")} autoComplete="off"
        onChange={(e) => setQ(e.target.value)} onFocus={() => res.length > 0 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && res.length > 0 && (
        <ul className="search-list" role="listbox">
          {res.map((r, i) => (
            <li key={i}><button onMouseDown={() => { setPlace({ name: r.name, lat: r.lat, lon: r.lon }); setQ(r.name); setOpen(false); }}>
              <b>{r.name}</b> <span className="muted">{[r.admin, r.country].filter(Boolean).join(", ")}</span>
            </button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bars({ spot }: { spot: Spot }) {
  const { t } = useI18n();
  const b = spot.score.breakdown;
  const keys = (["C", "T", "D", "S", "M"] as const).filter((k) => k in spot.score.weights);
  const g = b.G ?? 1;
  return (
    <div className="bars">
      {keys.map((k) => (
        <div className="bar-row" key={k}>
          <span>{t(`comp.${k}`)} <span className="faint mono">×{spot.score.weights[k]}</span></span>
          <div className="bar"><i style={{ width: `${b[k] ?? 0}%` }} /></div>
          <span className="mono num">{b[k] == null ? "—" : Math.round(b[k]!)}</span>
        </div>
      ))}
      <div className="bar-row">
        <span>{t("comp.G")}</span>
        <div className="bar"><i style={{ width: `${g * 100}%`, background: g < 1 ? "var(--vermilion)" : "var(--good)" }} /></div>
        <span className="mono num">×{g.toFixed(1)}</span>
      </div>
    </div>
  );
}

function SpotDetail({ spot, meta }: { spot: Spot; meta: Meta | null }) {
  const { t, lang } = useI18n();
  const { planned, setPlanned } = usePlace();
  const s = spot.score;
  const isPlanned = planned?.id === spot.id && planned.lat === spot.lat;
  const win = s.window;
  return (
    <Panel className="span-12" kj="誉" title={spot.id === "here" ? t("type.here") : spot.name}
      right={<span className="row">{spot.curated && <span className="chip demo">{t("watch.curated")}</span>}<span className="chip">{t(`type.${spot.type}`)} · {spot.dist_km} {t("watch.km")}</span></span>}>
      <div className="detail">
        <div>
          <div className="eyebrow">{t("watch.score")}</div>
          <Enso size={132} color={BAND_HEX[s.band]}><div className="stat num" style={{ color: BAND_COLOR[s.band], fontSize: 54 }}>{Math.round(s.headline)}</div></Enso>
          <div className="band-name" style={{ color: BAND_COLOR[s.band] }}>{t(`band.${s.band}`)}</div>
          {win && <div className="muted">{t("watch.best")}: <b className="num" style={{ color: "var(--paper)" }}>{fmtTime(win.start, lang)} – {fmtTime(win.end, lang)}</b></div>}
          <div className="row" style={{ marginTop: 10 }}>
            <span className={`chip conf-${s.confidence}`}>{t(`conf.${s.confidence}`)}</span>
            {meta && <span className={`chip ${meta.status === "demo" ? "demo" : ""}`}>{meta.status}</span>}
          </div>
          {s.missing.length > 0 && <p className="small faint">{s.missing.map((k) => t(`comp.${k}`)).join(", ")}: n/a (weights renormalised)</p>}
          <p className="small muted" style={{ marginBottom: 0 }}>
            {t("watch.lp")}: {spot.lp_near ? `−${spot.lp_penalty} · ${spot.lp_near}` : t("watch.none")}
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => {
              setPlanned({ id: spot.id, name: spot.id === "here" ? t("type.here") : spot.name, type: spot.type, lat: spot.lat, lon: spot.lon });
              api("/api/honor/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spot_id: spot.id }) }).catch(() => {});
            }} disabled={isPlanned}>
              {isPlanned ? t("watch.planned") : t("watch.plan")}
            </button>
            {spot.osm_url && <a className="btn ghost" href={spot.osm_url} target="_blank" rel="noreferrer">{t("watch.source")}</a>}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{t("watch.curve")}</div>
          <HonorCurve score={s} />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("watch.best")}</div>
          <Bars spot={spot} />
          <p className="small faint mono" style={{ marginTop: 10 }}>{t("watch.formula")}: {s.formula_version}</p>
        </div>
      </div>
      <div className="hourly">
        <table className="num">
          <thead><tr><th>{t("watch.hourly")}</th>{s.hours.map((h) => <th key={h.t}>{fmtHour(h.t, lang)}</th>)}</tr></thead>
          <tbody>
            <tr><td>{t("watch.score")}</td>{s.hours.map((h) => <td key={h.t} style={{ color: BAND_COLOR[bandOf(h.score)], fontWeight: 700 }}>{Math.round(h.score)}</td>)}</tr>
            <tr><td>{t("watch.cloud")} %</td>{s.hours.map((h) => <td key={h.t}>{h.cloud ?? "—"}</td>)}</tr>
            <tr><td>{t("watch.vis")} km</td>{s.hours.map((h) => <td key={h.t}>{h.visibility_km ?? "—"}</td>)}</tr>
            <tr><td>{t("watch.wind")} km/h</td>{s.hours.map((h) => <td key={h.t}>{h.wind_kmh == null ? "—" : Math.round(h.wind_kmh)}</td>)}</tr>
            <tr><td>{t("watch.rain")} %</td>{s.hours.map((h) => <td key={h.t}>{h.rain_pct ?? "—"}</td>)}</tr>
            <tr><td>{t("watch.temp")} °C</td>{s.hours.map((h) => <td key={h.t}>{h.temp_c == null ? "—" : Math.round(h.temp_c)}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function Watchtower() {
  const { t, lang } = useI18n();
  const { place, setPlace } = usePlace();
  const [mode, setMode] = useState<Mode>("casual");
  const [date, setDate] = useState(todayLocal());
  const [data, setData] = useState<WatchtowerData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<string>("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setErr(null);
    api<WatchtowerData>(`/api/watchtower?lat=${place.lat}&lon=${place.lon}&date=${date}&mode=${mode}`, { signal: ctl.signal })
      .then((r) => {
        setData(r.data); setMeta(r.meta);
        setSel((cur) => (cur && (cur === "here" || r.data.spots.some((s) => s.id === cur)) ? cur : r.data.spots[0]?.id ?? "here"));
      })
      .catch((e) => { if (e.name !== "AbortError") setErr(String(e.message || e)); })
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [place.lat, place.lon, date, mode, nonce]);

  const all = useMemo(() => (data ? [data.here, ...data.spots] : []), [data]);
  const selected = all.find((s) => s.id === sel) ?? data?.spots[0] ?? data?.here;

  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setPlace({ name: "My location", lat: p.coords.latitude, lon: p.coords.longitude }),
    () => setErr("Location permission was denied. Search for a place instead."),
  );

  return (
    <>
      <PageScene kanji="望楼" title={t("watch.title")} sub={t("watch.sub")}><Scene variant="watchtower" moonX={900} /></PageScene>
      <div className="page">
        <div className="row" style={{ marginTop: 24 }}>
          <PlaceSearch />
          <input id="date" className="field" type="date" value={date} onChange={(e) => setDate(e.target.value || todayLocal())} />
          <button className="btn ghost" onClick={locate}>{t("watch.locate")}</button>
          <div className="seg" role="group" aria-label="Observing mode">
            {MODES.map((m) => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`watch.mode.${m}`)}</button>)}
          </div>
        </div>
        <div className="row small muted" style={{ marginTop: 10 }}>
          <span className="mono">{place.name} · {place.lat.toFixed(3)}, {place.lon.toFixed(3)}</span>
          {data && <span>· {t("watch.night")} {fmtTime(data.night.sunset, lang)} – {fmtTime(data.night.sunrise, lang)}</span>}
          <span className="faint">· {t("watch.clickmap")}</span>
        </div>
        {err && <div className="notice bad"><span>{err}</span><button className="btn ghost" onClick={() => setNonce((n) => n + 1)}>{t("watch.retry")}</button></div>}
        {data?.warnings.map((w, i) => <div className="notice" key={i}>{w}</div>)}

        <div className="grid g-12">
          <Panel className="span-8" kj="地図" title={t("watch.map")} right={loading ? <span className="chip">{t("watch.loading")}</span> : null}>
            <div className="map-frame">
              <MapContainer center={[place.lat, place.lon]} zoom={9} style={{ height: 460 }} scrollWheelZoom>
                <TileLayer
                  attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={16}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={16}
                />
                <Recenter lat={place.lat} lon={place.lon} />
                <ClickToScore onPick={(lat, lon) => setPlace({ name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`, lat, lon })} />
                {data && <Marker position={[data.here.lat, data.here.lon]} icon={spotIcon("here", data.here.score.band, sel === "here")} eventHandlers={{ click: () => setSel("here") }} />}
                {data?.spots.map((s, i) => (
                  <Marker key={s.id} position={[s.lat, s.lon]} icon={spotIcon(s.type, s.score.band, sel === s.id, i + 1)} eventHandlers={{ click: () => setSel(s.id) }} />
                ))}
              </MapContainer>
            </div>
          </Panel>
          <Panel className="span-4" kj="順位" title={t("watch.list")}>
            <ol className="rank">
              {data && all.map((s, i) => (
                <li key={s.id}>
                  <button aria-pressed={sel === s.id} onClick={() => setSel(s.id)}>
                    <span className="rank-n mono">{s.id === "here" ? "◎" : i}</span>
                    <span className="rank-name"><b>{s.id === "here" ? t("type.here") : s.name}</b><span className="faint small">{s.id === "here" ? `${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}` : `${t(`type.${s.type}`)} · ${s.dist_km} ${t("watch.km")}`}</span></span>
                    <span className="rank-score num" style={{ color: BAND_COLOR[s.score.band] }}>{Math.round(s.score.headline)}</span>
                  </button>
                </li>
              ))}
              {!data && !err && <li className="faint small" style={{ padding: 12 }}>{t("watch.loading")}</li>}
            </ol>
          </Panel>
          {selected && <SpotDetail spot={selected} meta={meta} />}
        </div>
      </div>
    </>
  );
}
