import type { ReactNode } from "react";

/**
 * Zen ensō drawn as one tapered brush stroke: heavy where the brush lands,
 * thinning to a dry tail, leaving the circle open. A turbulence filter roughens
 * the edge like ink on washi.
 */
function strokePath(): string {
  const cx = 50, cy = 50, r = 38;
  const start = -60, sweep = 320; // degrees; opening at the upper right
  const n = 64;
  const outer: string[] = [], inner: string[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const a = ((start + sweep * f) * Math.PI) / 180;
    // width: quick swell, long taper, a little wobble
    const w = 1.2 + 7.5 * Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.6) * (1 - 0.75 * f) + 0.6 * Math.sin(f * 19);
    const rr = r + 1.5 * Math.sin(f * 5.3);
    outer.push(`${(cx + (rr + w / 2) * Math.cos(a)).toFixed(2)} ${(cy + (rr + w / 2) * Math.sin(a)).toFixed(2)}`);
    inner.push(`${(cx + (rr - w / 2) * Math.cos(a)).toFixed(2)} ${(cy + (rr - w / 2) * Math.sin(a)).toFixed(2)}`);
  }
  return `M${outer.join(" L")} L${inner.reverse().join(" L")} Z`;
}
const D = strokePath();

export default function Enso({ size = 120, color = "#e3b04b", children }: { size?: number; color?: string; children?: ReactNode }) {
  return (
    <div className="enso" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <filter id="enso-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
          </filter>
        </defs>
        <path d={D} fill={color} filter="url(#enso-rough)" opacity="0.92" />
      </svg>
      <div className="enso-in">{children}</div>
    </div>
  );
}
