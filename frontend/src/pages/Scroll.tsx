import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18n";
import Scene from "../components/Scene";
import { Panel, PageScene } from "../components/Panel";
import MoonGlyph from "../components/MoonGlyph";
import { api } from "../api/client";
import type { Alert, CalDay, EventType, IssPass, SkyEvent } from "../api/types";
import { usePlace } from "../lib/place";
import { fmtTime, todayLocal, evTitle, lunarName } from "../lib/format";
import { addAlert, TYPE_COLOR } from "../lib/alerts";
import { logObservation } from "../components/HonorPanel";

const TYPES: EventType[] = ["moon", "meteor", "eclipse", "iss", "planet", "launch"];
const LOC = { en: "en-IN", hi: "hi-IN", ja: "ja-JP", pa: "pa-IN" } as const;

const localDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function issToEvent(p: IssPass): SkyEvent {
  return {
    id: `iss-${p.start}`, type: "iss", title: "ISS pass", start: p.start, visible: true,
    detail: { max_alt: p.max_alt, from: p.start_dir, to: p.end_dir, duration_s: p.duration_s, peak: p.peak },
    source: "CelesTrak + skyfield", url: "https://celestrak.org/", status: "computed",
  };
}

function ObservedButton({ ev }: { ev: SkyEvent }) {
  const { t } = useI18n();
  const { place } = usePlace();
  const [done, setDone] = useState<string | null>(null);
  return (
    <button className="btn sm" disabled={!!done} onClick={() => logObservation({
      lat: place.lat, lon: place.lon, place_name: place.name, event_type: ev.type, event_id: ev.id, event_title: evTitle(ev, t), event_start: ev.start,
    }).then((p) => setDone(t("honor.earned").replace("{p}", String(p)))).catch(() => setDone("!"))}>{done ?? t("honor.saw")}</button>
  );
}

function EventCard({ ev, reminded, onRemind }: { ev: SkyEvent; reminded: boolean; onRemind: () => void }) {
  const { t, lang } = useI18n();
  const d = ev.detail;
  const rows: [string, string][] = [];
  if (ev.type === "meteor") {
    rows.push([t("scroll.zhr"), `${d.zhr}${t("scroll.perhour")}`], [t("scroll.radiant"), `${d.radiant_alt}°`], [t("scroll.moonint"), t(`scroll.int.${d.moon_interference}`)]);
  } else if (ev.type === "planet") {
    rows.push([t("scroll.alt"), `${d.best_alt}°`], [t("scroll.mag"), String(d.magnitude)]);
  } else if (ev.type === "eclipse") {
    if (d.obscuration_pct != null) rows.push([t("scroll.obscur"), `${d.obscuration_pct}%`]);
  } else if (ev.type === "iss") {
    rows.push([t("scroll.alt"), `${d.max_alt}°`], [t("scroll.dir"), `${d.from} → ${d.to}`], [t("scroll.dur"), `${Math.round(d.duration_s / 60)} min`]);
  } else if (ev.type === "launch") {
    rows.push([t("scroll.provider"), d.provider ?? "—"], [t("scroll.status"), d.status ?? "—"]);
  }
  return (
    <article className="ev" style={{ borderLeftColor: TYPE_COLOR[ev.type] }}>
      <div className="ev-h">
        <span className="ev-type" style={{ color: TYPE_COLOR[ev.type] }}>{t(`scroll.f.${ev.type}`)}</span>
        <span className="mono small num">{fmtTime(ev.start, lang)}</span>
      </div>
      <b className="ev-title">{evTitle(ev, t)}</b>
      {ev.visible !== null && <div className={`small ${ev.visible ? "good" : "faint"}`}>{ev.visible ? t("scroll.visible") : t("scroll.notvisible")}</div>}
      {ev.type === "launch" && d.location && <div className="small muted">{d.location}</div>}
      {rows.length > 0 && <dl className="ev-dl">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>}
      <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
        <a className="small faint" href={ev.url} target="_blank" rel="noreferrer">{t("scroll.source")}: {ev.source}</a>
        {Math.abs(new Date(ev.start).getTime() - Date.now()) < 6 * 3600 * 1000 && <ObservedButton ev={ev} />}
        {new Date(ev.start).getTime() > Date.now() && (
          <button className="btn ghost sm" disabled={reminded} onClick={onRemind}>{reminded ? t("scroll.reminded") : t("scroll.remind")}</button>
        )}
      </div>
    </article>
  );
}

export default function Scroll() {
  const { t, lang } = useI18n();
  const { place } = usePlace();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const [on, setOn] = useState<Set<string>>(new Set(TYPES));
  const [days, setDays] = useState<CalDay[]>([]);
  const [evs, setEvs] = useState<SkyEvent[]>([]);
  const [iss, setIss] = useState<IssPass[] | null>(null);
  const [launches, setLaunches] = useState<SkyEvent[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sel, setSel] = useState(todayLocal());
  const [err, setErr] = useState<string[]>([]);

  const pushErr = (m: string) => setErr((e) => (e.includes(m) ? e : [...e, m]));
  useEffect(() => {
    const off = -new Date().getTimezoneOffset();
    api<{ days: CalDay[]; events: SkyEvent[] }>(`/api/sky/month?lat=${place.lat}&lon=${place.lon}&year=${ym.y}&month=${ym.m}&tz_offset_min=${off}`)
      .then((r) => { setDays(r.data.days); setEvs(r.data.events); }).catch((e) => pushErr(String(e.message)));
  }, [place.lat, place.lon, ym.y, ym.m]);
  useEffect(() => {
    api<{ passes: IssPass[] }>(`/api/sky/iss?lat=${place.lat}&lon=${place.lon}`).then((r) => setIss(r.data.passes)).catch((e) => { setIss([]); pushErr(String(e.message)); });
  }, [place.lat, place.lon]);
  useEffect(() => {
    api<SkyEvent[]>(`/api/sky/launches`).then((r) => setLaunches(r.data)).catch((e) => { setLaunches([]); pushErr(String(e.message)); });
    api<Alert[]>(`/api/sky/alerts`).then((r) => setAlerts(r.data)).catch(() => {});
  }, []);

  const all = useMemo(() => [...evs, ...(iss ?? []).map(issToEvent), ...(launches ?? [])].filter((e) => on.has(e.type)), [evs, iss, launches, on]);
  const byDay = useMemo(() => {
    const m: Record<string, SkyEvent[]> = {};
    for (const e of all) (m[localDate(e.start)] ??= []).push(e);
    return m;
  }, [all]);
  const reminded = new Set(alerts.map((a) => a.event_id));
  const remind = (ev: SkyEvent) => addAlert(ev).then((r) => setAlerts((a) => [...a.filter((x) => x.id !== r.data.id), r.data]));
  const removeAlert = (id: number) => api(`/api/sky/alerts/${id}`, { method: "DELETE" }).then(() => setAlerts((a) => a.filter((x) => x.id !== id)));

  const first = new Date(ym.y, ym.m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first grid
  const monthLabel = first.toLocaleDateString(LOC[lang], { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(LOC[lang], { weekday: "short" }));
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m - 1 + d, 1); return { y: n.getFullYear(), m: n.getMonth() + 1 }; });
  const selDay = days.find((d) => d.date === sel);
  const toggle = (k: string) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <>
      <PageScene kanji="天巻" title={t("scroll.title")} sub={t("scroll.sub")}><Scene variant="scroll" moonX={1130} /></PageScene>
      <div className="page">
        <div className="row" style={{ marginTop: 24, justifyContent: "space-between" }}>
          <div className="row">
            <button className="btn ghost sm" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
            <h2 className="month-label">{monthLabel}</h2>
            <button className="btn ghost sm" onClick={() => shift(1)} aria-label="Next month">›</button>
            <button className="btn ghost sm" onClick={() => { setYm({ y: now.getFullYear(), m: now.getMonth() + 1 }); setSel(todayLocal()); }}>{t("scroll.today")}</button>
          </div>
          <div className="row">
            <span className="eyebrow">{t("scroll.filters")}</span>
            <div className="seg" role="group" aria-label="Event types">
              {TYPES.map((k) => (
                <button key={k} aria-pressed={on.has(k)} onClick={() => toggle(k)}>
                  <i className="dot" style={{ background: TYPE_COLOR[k] }} />{t(`scroll.f.${k}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {err.map((m) => <div className="notice" key={m}>{m}</div>)}

        <div className="grid g-12">
          <Panel className="span-8" kj="月暦" title={t("scroll.cal")} right={<span className="faint small mono">{place.name}</span>}>
            <div className="cal">
              {weekdays.map((w) => <div key={w} className="cal-wd">{w}</div>)}
              {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
              {days.map((d) => {
                const dn = Number(d.date.slice(8));
                const list = byDay[d.date] ?? [];
                const types = [...new Set(list.map((e) => e.type))];
                return (
                  <button key={d.date} className={`cal-d ${d.date === sel ? "sel" : ""} ${d.date === todayLocal() ? "today" : ""}`} onClick={() => setSel(d.date)}>
                    <span className="cal-n num">{dn}</span>
                    <MoonGlyph angle={d.phase_angle} size={28} />
                    <span className={`cal-kj ${lang === "ja" ? "" : "loc"}`}>{lunarName(d.lunar_day, t, lang).name}</span>
                    <span className="cal-dots">{types.map((ty) => <i key={ty} className="dot" style={{ background: TYPE_COLOR[ty] }} />)}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="span-4 stack">
            <Panel kj="現象" title={new Date(sel + "T12:00").toLocaleDateString(LOC[lang], { weekday: "long", day: "numeric", month: "long" })}>
              {selDay && (
                <div className="moon-line">
                  <MoonGlyph angle={selDay.phase_angle} size={48} />
                  <div>
                    <b className={`moon-kanji ${lang === "ja" ? "" : "loc"}`} style={{ fontSize: 20 }}>{lunarName(selDay.lunar_day, t, lang).name}</b> <div className="small faint">{lunarName(selDay.lunar_day, t, lang).sub}</div>
                    <div className="small muted">{t(`moon.phase.${selDay.phase_name}`)} · {Math.round(selDay.illumination * 100)}%</div>
                    <div className="small faint num">{t("scroll.moonline")} {fmtTime(selDay.moonrise, lang)} · {t("scroll.moonset")} {fmtTime(selDay.moonset, lang)}</div>
                  </div>
                </div>
              )}
              <div className="stack" style={{ marginTop: 12 }}>
                {(byDay[sel] ?? []).map((e) => <EventCard key={e.id} ev={e} reminded={reminded.has(e.id)} onRemind={() => remind(e)} />)}
                {(byDay[sel] ?? []).length === 0 && <p className="small faint">{t("scroll.none")}</p>}
              </div>
            </Panel>
            <Panel kj="知らせ" title={t("scroll.alerts")}>
              {alerts.length === 0 && <p className="small faint">{t("scroll.alerts.empty")}</p>}
              <ul className="alerts">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <i className="dot" style={{ background: TYPE_COLOR[a.kind] }} />
                    <span><b>{a.title}</b><br /><span className="small muted num">{new Date(a.at).toLocaleString(LOC[lang], { dateStyle: "medium", timeStyle: "short" })}</span></span>
                    <button className="btn ghost sm" onClick={() => removeAlert(a.id)}>{t("scroll.remove")}</button>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <Panel className="span-6" kj="駅" title={t("scroll.iss")}>
            {iss === null && <p className="small faint">{t("scroll.loading")}</p>}
            {iss?.length === 0 && <p className="small faint">{t("scroll.iss.empty")}</p>}
            {iss && iss.length > 0 && (
              <table className="tbl num">
                <thead><tr><th></th><th>{t("scroll.dir")}</th><th>{t("scroll.alt")}</th><th>{t("scroll.dur")}</th><th></th></tr></thead>
                <tbody>
                  {iss.slice(0, 8).map((p) => {
                    const ev = issToEvent(p);
                    return (
                      <tr key={p.start}>
                        <td>{new Date(p.start).toLocaleString(LOC[lang], { weekday: "short", hour: "numeric", minute: "2-digit" })}</td>
                        <td className="mono">{p.start_dir} → {p.end_dir}</td>
                        <td>{p.max_alt}°</td>
                        <td>{Math.round(p.duration_s / 60)} min</td>
                        <td><button className="btn ghost sm" disabled={reminded.has(ev.id)} onClick={() => remind(ev)}>{reminded.has(ev.id) ? "✓" : t("scroll.remind")}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
          <Panel className="span-6" kj="発射" title={t("scroll.launches")}>
            {launches === null && <p className="small faint">{t("scroll.loading")}</p>}
            <ul className="launches">
              {(launches ?? []).slice(0, 6).map((l) => (
                <li key={l.id}>
                  <span className="num mono small">{new Date(l.start).toLocaleDateString(LOC[lang], { day: "numeric", month: "short" })}</span>
                  <span><b>{l.title}</b><br /><span className="small muted">{l.detail.provider} · {l.detail.location}</span></span>
                  <span className="chip">{l.detail.status}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
