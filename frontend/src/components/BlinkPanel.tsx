import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18n";
import { api, apiUrl } from "../api/client";
import type { BlinkResult } from "../api/types";
import { Panel, Slot } from "./Panel";

const KIND_COLOR: Record<string, string> = { new: "#e2452f", vanished: "#8fa6dc", brightened: "#e3b04b", faded: "#a59cae" };

export default function BlinkPanel() {
  const { t } = useI18n();
  const [target, setTarget] = useState("");
  const [res, setRes] = useState<BlinkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [play, setPlay] = useState(true);
  const [diff, setDiff] = useState(false);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    if (!res || !play || diff) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setFrame((f) => 1 - f), 500); // 2 Hz, like a blink comparator
    return () => clearInterval(id);
  }, [res, play, diff]);

  const run = (sample: boolean) => {
    setBusy(true); setErr(null); setRes(null);
    api<BlinkResult>("/api/lens/blink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sample ? { sample: true } : { target }) })
      .then((r) => { setRes(r.data); setSel(null); }).catch((e) => setErr(String(e.message))).finally(() => setBusy(false));
  };

  const img = res ? (diff ? res.files.diff : frame === 0 ? res.files.a : res.files.b) : null;
  return (
    <Panel className="span-12" kj="明滅" title={t("blink.title")}>
      <p className="small muted" style={{ marginTop: -6 }}>{t("blink.sub")}</p>
      <div className="row">
        <input id="blink-target" className="field" style={{ flex: "1 1 240px" }} value={target} placeholder={t("blink.target")} onChange={(e) => setTarget(e.target.value)} />
        <button className="btn" disabled={busy || !target.trim()} onClick={() => run(false)}>{t("blink.go")}</button>
        <button className="btn ghost" disabled={busy} onClick={() => run(true)}>{t("blink.sample")}</button>
      </div>
      {err && <div className="notice bad">{err}</div>}
      <div className="blink" style={{ marginTop: 14 }}>
        <div style={{ minWidth: 0 }}>
          {res && img ? (
            <>
              <div className="blink-view" style={{ aspectRatio: `${res.width} / ${res.height}` }}>
                <img src={apiUrl(img)} alt="" draggable={false} />
                <svg viewBox={`0 0 ${res.width} ${res.height}`} preserveAspectRatio="none">
                  {res.candidates.map((c, i) => (
                    <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                      <circle cx={c.x} cy={c.y} r={14} fill="none" stroke={KIND_COLOR[c.kind]} strokeWidth={sel === i ? 3 : 2} vectorEffect="non-scaling-stroke" />
                      <text x={c.x + 17} y={c.y + 4} className="mk-label" style={{ fill: KIND_COLOR[c.kind] }}>{i + 1}</text>
                    </g>
                  ))}
                </svg>
                <span className="cv-tag" style={{ left: 8 }}>{diff ? t("blink.diff") : res.labels[frame]}</span>
              </div>
              <div className="row small" style={{ marginTop: 8 }}>
                <button className="btn ghost sm" onClick={() => setPlay((p) => !p)} disabled={diff}>{play ? t("blink.pause") : t("blink.play")}</button>
                <div className="seg">
                  <button aria-pressed={!diff && frame === 0} onClick={() => { setDiff(false); setPlay(false); setFrame(0); }}>{res.labels[0]}</button>
                  <button aria-pressed={!diff && frame === 1} onClick={() => { setDiff(false); setPlay(false); setFrame(1); }}>{res.labels[1]}</button>
                  <button aria-pressed={diff} onClick={() => setDiff((d) => !d)}>{t("blink.diff")}</button>
                </div>
                <span className="mono faint">shift {res.shift_px.join(", ")} px · flux ×{res.flux_scale} · {res.seconds}s</span>
              </div>
            </>
          ) : <Slot body={busy ? t("blink.working") : t("blink.sub")} h={280} />}
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("blink.cands")} {res ? `· ${res.candidates.length}` : ""}</div>
          {res && res.candidates.length === 0 && <p className="small faint">{t("blink.none")}</p>}
          <ol className="cand-list">
            {res?.candidates.map((c, i) => (
              <li key={i}>
                <button aria-pressed={sel === i} onClick={() => setSel(i)}>
                  <span className="mono" style={{ color: KIND_COLOR[c.kind] }}>{i + 1}</span>
                  <span><b>{t(`blink.k.${c.kind}`)}</b><br /><span className="small faint mono">x {c.x.toFixed(0)}, y {c.y.toFixed(0)}</span></span>
                  <span className="mono num small">{c.change_sigma > 0 ? "+" : ""}{c.change_sigma}σ{c.flux_ratio ? ` · ×${c.flux_ratio}` : ""}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
