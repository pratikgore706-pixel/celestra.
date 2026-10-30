import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18n";
import { api } from "../api/client";
import type { HonorSummary } from "../api/types";
import { usePlace } from "../lib/place";
import { Panel } from "./Panel";
import Enso from "./Enso";

const TYPES = ["sky", "moon", "meteor", "eclipse", "iss", "planet", "launch"];

export async function logObservation(body: Record<string, unknown>) {
  const r = await api<{ awarded: { points: number }[] }>("/api/honor/observations", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  window.dispatchEvent(new Event("celestra:honor"));
  return r.data.awarded.reduce((a, x) => a + x.points, 0);
}

export function useHonor() {
  const [h, setH] = useState<HonorSummary | null>(null);
  useEffect(() => {
    const load = () => api<HonorSummary>("/api/honor").then((r) => setH(r.data)).catch(() => {});
    load();
    window.addEventListener("celestra:honor", load);
    return () => window.removeEventListener("celestra:honor", load);
  }, []);
  return h;
}

export default function HonorPanel({ className = "span-12" }: { className?: string }) {
  const { t, lang } = useI18n();
  const { place, planned } = usePlace();
  const h = useHonor();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("sky");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const at = planned ?? place;

  const save = () => logObservation({ lat: at.lat, lon: at.lon, place_name: at.name, event_type: type, note })
    .then((p) => { setOpen(false); setNote(""); setToast(t("honor.earned").replace("{p}", String(p))); setTimeout(() => setToast(null), 3000); })
    .catch((e) => setToast(String(e.message)));

  return (
    <Panel className={className} kj="誉" title={t("honor.title")}
      right={<button className="btn sm" onClick={() => setOpen((o) => !o)}>{t("honor.log")}</button>}>
      {open && (
        <div className="log-form">
          <label className="opt"><span>{t("honor.type")}</span>
            <select id="obs-type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((k) => <option key={k} value={k}>{k === "sky" ? t("honor.type.sky") : t(`scroll.f.${k}`)}</option>)}
            </select></label>
          <label className="opt"><span>{t("honor.note")}</span>
            <input id="obs-note" className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={at.name} /></label>
          <div className="row"><button className="btn" onClick={save}>{t("honor.save")}</button><button className="btn ghost" onClick={() => setOpen(false)}>{t("honor.cancel")}</button></div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      {h && (
        <div className="honor">
          <div className="honor-score">
            <div className="eyebrow">{t("honor.points")}</div>
            <Enso size={120}><div className="stat num">{h.total}</div></Enso>
            <div className="band-name">{t(`rank.${h.rank}`).startsWith("rank.") ? h.rank : t(`rank.${h.rank}`)}</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("honor.badges")}</div>
            <div className="virtues">
              {h.badges.map((b) => (
                <div key={b.key} className={`virtue ${b.earned ? "earned" : ""}`} title={t(`virtue.${b.key}.rule`)}>
                  <div className="vk">{b.kanji}</div>
                  <b>{t(`virtue.${b.key}`)}</b>
                  <span className="small faint">{b.romaji}</span>
                  <div className="vbar"><i style={{ width: `${Math.min(100, (b.have / b.need) * 100)}%` }} /></div>
                  <span className="small faint num">{Math.min(b.have, b.need)}/{b.need}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{t("honor.ledger")}</div>
            {h.ledger.length === 0 && <p className="small faint">{t("honor.empty")}</p>}
            <ul className="ledger">
              {h.ledger.slice(0, 6).map((x) => <li key={x.id}><span>{t(`act.${x.action}`).startsWith("act.") ? x.label : t(`act.${x.action}`)}</span><b className="num">+{x.points}</b></li>)}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  );
}
