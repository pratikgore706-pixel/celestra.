import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { IssPass, MoonInfo } from "../api/types";
import { useI18n } from "../i18n/I18n";
import { usePlace } from "../lib/place";
import { fmtTime } from "../lib/format";

/** Polar sky chart: zenith in the centre, horizon at the rim, north up, east right (map view). */
const R = 120, C = 140;
const pos = (alt: number, az: number) => {
  const r = ((90 - Math.max(alt, 0)) / 90) * R;
  const a = (az * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};

export default function SkyDome() {
  const { lang, t } = useI18n();
  const { place } = usePlace();
  const [moon, setMoon] = useState<MoonInfo | null>(null);
  const [iss, setIss] = useState<IssPass | null>(null);
  useEffect(() => {
    api<MoonInfo>(`/api/sky/moon?lat=${place.lat}&lon=${place.lon}`).then((r) => setMoon(r.data)).catch(() => {});
    api<{ passes: IssPass[] }>(`/api/sky/iss?lat=${place.lat}&lon=${place.lon}`).then((r) => setIss(r.data.passes[0] ?? null)).catch(() => {});
  }, [place.lat, place.lon]);

  const issPath = iss ? (() => {
    const pts = [pos(0, iss.start_az), pos(iss.max_alt, iss.peak_az), pos(0, iss.end_az)];
    return `M${pts[0][0]} ${pts[0][1]} Q${2 * pts[1][0] - (pts[0][0] + pts[2][0]) / 2} ${2 * pts[1][1] - (pts[0][1] + pts[2][1]) / 2} ${pts[2][0]} ${pts[2][1]}`;
  })() : null;
  const m = moon && moon.altitude > 0 ? pos(moon.altitude, moon.azimuth) : null;

  return (
    <div className="dome">
      <svg viewBox="0 0 280 280" role="img" aria-label="Sky dome: where the Moon and the next ISS pass are">
        <circle cx={C} cy={C} r={R} fill="#0e0d16" stroke="#4a4358" />
        {[30, 60].map((a) => <circle key={a} cx={C} cy={C} r={((90 - a) / 90) * R} fill="none" stroke="#2e2a3a" strokeDasharray="3 4" />)}
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#2e2a3a" />
        <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#2e2a3a" />
        {[["N", C, C - R - 8], ["E", C + R + 9, C + 4], ["S", C, C + R + 16], ["W", C - R - 9, C + 4]].map(([l, x, y]) => (
          <text key={String(l)} x={Number(x)} y={Number(y)} textAnchor="middle" fill="#a59cae" fontSize="11" fontFamily="IBM Plex Mono, monospace">{l}</text>
        ))}
        <text x={C + 4} y={C - ((90 - 60) / 90) * R - 3} fill="#6e6679" fontSize="9" fontFamily="IBM Plex Mono, monospace">60°</text>
        {issPath && <path d={issPath} fill="none" stroke="#8fa6dc" strokeWidth="2" strokeDasharray="6 4" />}
        {iss && (() => { const [x, y] = pos(iss.max_alt, iss.peak_az); return <circle cx={x} cy={y} r="4" fill="#8fa6dc" />; })()}
        {m && <><circle cx={m[0]} cy={m[1]} r="11" fill="#f1dca6" /><circle cx={m[0]} cy={m[1]} r="15" fill="none" stroke="#e3b04b" strokeOpacity="0.5" /></>}
      </svg>
      <div className="small muted dome-legend">
        <div><i className="dot" style={{ background: "#f1dca6" }} />{moon ? (moon.altitude > 0 ? t("sky.moonup").replace("{a}", moon.altitude.toFixed(0)).replace("{z}", moon.azimuth.toFixed(0)) : t("sky.moondown").replace("{t}", fmtTime(moon.rise, lang))) : `${t("sky.moon")} …`}</div>
        <div><i className="dot" style={{ background: "#8fa6dc" }} />ISS {iss ? `${fmtTime(iss.start, lang)} · ${iss.start_dir} → ${iss.end_dir}, ${iss.max_alt}°` : t("sky.noiss")}</div>
        <div className="faint">{t("sky.help")}</div>
      </div>
    </div>
  );
}
