import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Score } from "../api/types";
import { useI18n } from "../i18n/I18n";
import { fmtHour, fmtTime } from "../lib/format";

export default function HonorCurve({ score, height = 220 }: { score: Score; height?: number }) {
  const { lang, t } = useI18n();
  const data = score.hours.map((h) => ({ ...h, x: h.t }));
  const w = score.window;
  // The window's end is one hour past its last sample; shade the sampled hours.
  const wEnd = w ? data.filter((d) => d.x >= w.start && d.x < w.end).at(-1)?.x : undefined;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#e3b04b" fillOpacity="0.10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#e3b04b" strokeOpacity="0.25" strokeWidth="2" />
          </pattern>
        </defs>
        <CartesianGrid stroke="#2e2a3a" vertical={false} />
        <XAxis dataKey="x" tickFormatter={(v) => fmtHour(v, lang)} tick={{ fill: "#a59cae", fontSize: 11 }} stroke="#4a4358" interval="preserveStartEnd" minTickGap={18} />
        <YAxis domain={[0, 100]} ticks={[0, 40, 60, 80, 100]} tick={{ fill: "#a59cae", fontSize: 11 }} stroke="#4a4358" />
        {w && wEnd && <ReferenceArea x1={w.start} x2={wEnd} fill="url(#hatch)" stroke="#e3b04b" strokeOpacity={0.6} label={{ value: t("watch.best"), fill: "#e3b04b", fontSize: 11, position: "top" }} />}
        <Tooltip
          contentStyle={{ background: "#10131a", border: "1px solid #2b3140", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#efe6d4" }}
          labelFormatter={(v) => fmtTime(String(v), lang)}
          formatter={(v: number) => [Math.round(v), t("watch.score")]}
        />
        <Area type="monotone" dataKey="score" stroke="#e3b04b" strokeWidth={2} fill="#e3b04b" fillOpacity={0.08} dot={{ r: 2, fill: "#e3b04b" }} activeDot={{ r: 4 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
