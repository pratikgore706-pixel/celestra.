import { useEffect, useRef, useState, type DragEvent } from "react";
import { useI18n } from "../i18n/I18n";
import Scene from "../components/Scene";
import { Panel, Slot, PageScene } from "../components/Panel";
import CompareViewer from "../components/CompareViewer";
import SealPanel from "../components/SealPanel";
import BlinkPanel from "../components/BlinkPanel";
import { api, apiUrl } from "../api/client";
import type { LensJob, LensResult, Source } from "../api/types";

const LAST = "celestra.lastJob";
const getLast = () => { try { return localStorage.getItem(LAST); } catch { return null; } };
const setLast = (id: string) => { try { localStorage.setItem(LAST, id); } catch { /* ignore */ } };

function SourceCard({ s, r }: { s: Source; r: LensResult }) {
  const { t } = useI18n();
  const rows: [string, string][] = [
    [t("lens.o.type"), s.class === "star" ? t("lens.o.star") : t("lens.o.extended")],
    [t("lens.o.pos"), `x ${s.x.toFixed(1)}, y ${s.y.toFixed(1)} px`],
    [t("lens.o.mag"), `${s.inst_mag.toFixed(2)} (inst. mag)`],
    [t("lens.o.snr"), String(Math.round(s.snr))],
    [t("lens.o.fwhm"), `${s.fwhm.toFixed(2)} px`],
    [t("lens.o.area"), `${Math.round(s.area)} px²`],
    [t("lens.o.ell"), s.ellipticity.toFixed(2)],
  ];
  if (s.ra != null && s.dec != null) rows.push([t("lens.o.radec"), `RA ${s.ra.toFixed(4)}°, Dec ${s.dec.toFixed(4)}°`]);
  if (s.size_arcsec != null) rows.push([t("lens.o.ang"), `${s.size_arcsec}″`]);
  if (s.gaia_id) rows.push([t("lens.o.gaia"), `${s.gaia_id} (${s.match_arcsec}″)`]);
  if (s.g_mag != null) rows.push([t("lens.o.gmag"), String(s.g_mag)]);
  if (s.bp_rp != null) rows.push([t("lens.o.color"), String(s.bp_rp)]);
  return (
    <div className="src-card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b className="stamp-t">#{s.id}</b>
        <span className={`chip ${s.class === "star" ? "chip-star" : "chip-ext"}`}>{s.class === "star" ? t("lens.stars") : t("lens.ext")}</span>
      </div>
      <dl className="ev-dl" style={{ gridTemplateColumns: "1fr" }}>
        {rows.map(([k, v]) => <div key={k} className="kv"><dt>{k}</dt><dd className="num mono">{v}</dd></div>)}
      </dl>
      {s.saturated && <div className="small" style={{ color: "var(--warn)" }}>{t("lens.o.sat")}</div>}
      <p className="small faint" style={{ marginBottom: 0 }}>{t("lens.o.hint")}{r.info.has_wcs ? "" : ""}</p>
    </div>
  );
}

export default function Lens() {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [strength, setStrength] = useState(85);
  const [deblur, setDeblur] = useState(true);
  const [fake, setFake] = useState(false);
  const [job, setJob] = useState<LensJob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(true);
  const [mist, setMist] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const [arcTarget, setArcTarget] = useState("M42");
  const [survey, setSurvey] = useState("DSS2 Red");
  const [arcNoise, setArcNoise] = useState(true);

  const poll = (id: string) => {
    const tick = () => api<LensJob>(`/api/lens/jobs/${id}`).then((r) => {
      setJob(r.data);
      if (r.data.status === "done") { setLast(id); setSel(r.data.result?.sources[0]?.id ?? null); }
      else if (r.data.status === "error") setErr(r.data.error);
      else setTimeout(tick, 700);
    }).catch((e) => setErr(String(e.message)));
    tick();
  };
  useEffect(() => { const id = getLast(); if (id) poll(id); }, []);

  const start = (useSample: boolean) => {
    setErr(null); setMist(false);
    const fd = new FormData();
    fd.append("strength", String(strength)); fd.append("deblur", String(deblur)); fd.append("inject_fake", String(fake));
    if (!useSample) { if (!file) return; fd.append("file", file); }
    setJob({ id: "", status: "queued", step: "queued", progress: 0, error: null, result: null });
    api<{ id: string }>(useSample ? "/api/lens/sample" : "/api/lens/jobs", { method: "POST", body: fd })
      .then((r) => poll(r.data.id)).catch((e) => { setErr(String(e.message)); setJob(null); });
  };
  const startArchive = () => {
    setErr(null); setMist(false);
    setJob({ id: "", status: "queued", step: "fetch", progress: 1, error: null, result: null });
    api<{ id: string }>("/api/lens/skyview", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: arcTarget, survey, strength, deblur, add_noise: arcNoise }) })
      .then((r) => poll(r.data.id)).catch((e) => { setErr(String(e.message)); setJob(null); });
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const r = job?.status === "done" ? job.result : null;
  const busy = job && (job.status === "queued" || job.status === "running");
  const selected = r?.sources.find((s) => s.id === sel) ?? null;

  return (
    <>
      <PageScene kanji="霊眼" title={t("lens.title")} sub={t("lens.sub")}><Scene variant="lens" moonX={760} /></PageScene>
      <div className="page">
        <div className="grid g-12">
          <Panel className="span-12" kj="入" title={t("lens.upload")}>
            <div className="lens-in">
              <div className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
                onClick={() => fileRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
                <input ref={fileRef} id="file" type="file" hidden accept=".png,.jpg,.jpeg,.tif,.tiff,.fits,.fit,.fts" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <b>{file ? file.name : t("lens.upload")}</b>
                <span className="small faint">{file ? `${(file.size / 1048576).toFixed(1)} MB` : t("lens.drop")}</span>
              </div>
              <div className="lens-opts">
                <label className="opt"><span>{t("lens.strength")} <b className="mono num">{strength}%</b></span>
                  <input id="strength" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(Number(e.target.value))} /></label>
                <label className="opt chk-opt"><input id="deblur" type="checkbox" checked={deblur} onChange={(e) => setDeblur(e.target.checked)} />{t("lens.deblur")}</label>
                <label className="opt chk-opt"><input id="fake" type="checkbox" checked={fake} onChange={(e) => setFake(e.target.checked)} />
                  <span>{t("lens.fake")}<br /><span className="small faint">{t("lens.fake.help")}</span></span></label>
              </div>
              <div className="lens-go">
                <button className="btn" disabled={!file || !!busy} onClick={() => start(false)}>{t("lens.run")}</button>
                <button className="btn ghost" disabled={!!busy} onClick={() => start(true)}>{t("lens.sample")}</button>
              </div>
            </div>
            <div className="arc">
              <div><b className="arc-t">{t("arc.title")}</b><div className="small faint">{t("arc.sub")}</div></div>
              <input id="arc-target" className="field" value={arcTarget} placeholder={t("arc.target")} onChange={(e) => setArcTarget(e.target.value)} />
              <select id="arc-survey" className="field" value={survey} onChange={(e) => setSurvey(e.target.value)} aria-label={t("arc.survey")}>
                {["DSS2 Red", "DSS2 Blue", "DSS1 Red", "DSS", "2MASS-J"].map((x) => <option key={x}>{x}</option>)}
              </select>
              <label className="opt chk-opt"><input id="arc-noise" type="checkbox" checked={arcNoise} onChange={(e) => setArcNoise(e.target.checked)} />{t("arc.noise")}</label>
              <button className="btn ghost" disabled={!!busy || !arcTarget.trim()} onClick={startArchive}>{t("arc.go")}</button>
            </div>
            {busy && (
              <div className="progress" aria-live="polite">
                <div className="progress-bar"><i style={{ width: `${Math.max(job!.progress, 4)}%` }} /></div>
                <span className="small muted">{t(`lens.step.${job!.step ?? "queued"}`)}…</span>
              </div>
            )}
            {err && <div className="notice bad">{err}</div>}
          </Panel>

          <Panel className="span-8" kj="比較" title={r ? r.name : t("lens.compare")}
            right={r && (
              <div className="seg" role="group">
                <button aria-pressed={overlay} onClick={() => setOverlay((v) => !v)}>{t("lens.overlay")}</button>
                <button aria-pressed={mist} onClick={() => setMist((v) => !v)}>{t("lens.mist")}</button>
              </div>
            )}>
            {r ? <CompareViewer r={r} overlay={overlay} mist={mist} selected={sel} onSelect={setSel} /> : <Slot body={busy ? t("lens.working") + "…" : t("lens.empty")} h={420} />}
            {r?.source?.kind === "skyview" && (
              <p className="small muted" style={{ marginBottom: 0 }}>
                <span className="chip">{t("arc.label")}</span>{" "}
                {r.gaia?.error ? t("lens.gaia.err") : t("lens.gaia.n").replace("{n}", String(r.gaia?.matched ?? 0))}
                {r.info.arcsec_per_px ? ` · ${r.info.arcsec_per_px}″/px` : ""}
              </p>
            )}
          </Panel>

          <div className="span-4 stack">
            <Panel kj="印" title={t("lens.seal")}>{r ? <SealPanel r={r} /> : <Slot body={t("lens.seal.empty")} h={180} />}</Panel>
            <Panel kj="天体" title={t("lens.objects")}
              right={r && <span className="small mono"><span style={{ color: "var(--gold)" }}>● {r.counts.stars}</span> <span style={{ color: "var(--sakura)" }}>◯ {r.counts.extended}</span></span>}>
              {r ? (
                <>
                  {selected ? <SourceCard s={selected} r={r} /> : <p className="small faint">{t("lens.o.pick")}</p>}
                  <div className="src-list">
                    {r.sources.slice(0, 40).map((s) => (
                      <button key={s.id} aria-pressed={s.id === sel} onClick={() => setSel(s.id)}>
                        <i className="dot" style={{ background: s.class === "star" ? "var(--gold)" : "var(--sakura)" }} />
                        <span className="mono">#{s.id}</span><span className="mono num">{s.inst_mag.toFixed(1)}</span><span className="mono num faint">{s.fwhm.toFixed(1)}px</span>
                      </button>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 10 }}>
                    <span className="eyebrow">{t("lens.export")}</span>
                    <a className="btn ghost sm" href={apiUrl(`/api/lens/jobs/${r.id}/catalog.csv`)}>CSV</a>
                    <a className="btn ghost sm" href={apiUrl(`/api/lens/files/${r.id}/result.json`)} target="_blank" rel="noreferrer">JSON</a>
                    <a className="btn ghost sm" href={r.files.restored} download={`celestra_${r.id}_restored.png`}>PNG</a>
                  </div>
                </>
              ) : <Slot body={t("lens.objects.empty")} h={180} />}
            </Panel>
          </div>
          <BlinkPanel />
        </div>
      </div>
    </>
  );
}
