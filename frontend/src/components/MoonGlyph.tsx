/** Moon drawn at its real phase. angle: 0 new, 90 first quarter, 180 full, 270 last quarter. */
export default function MoonGlyph({ angle, size = 64 }: { angle: number; size?: number }) {
  const r = 30, cx = 32, cy = 32;
  const rad = (angle * Math.PI) / 180;
  const k = Math.cos(rad) * r; // terminator ellipse x-radius (signed)
  const waxing = angle < 180;
  const lit = "#f1dca6", dark = "#2a2533";
  // Lit limb: right half when waxing, left when waning (northern-hemisphere view).
  const sweepLimb = waxing ? 1 : 0;
  const sweepTerm = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const d = `M${cx} ${cy - r} A${r} ${r} 0 0 ${sweepLimb} ${cx} ${cy + r} A${Math.abs(k)} ${r} 0 0 ${sweepTerm} ${cx} ${cy - r}Z`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Moon phase">
      <circle cx={cx} cy={cy} r={r} fill={dark} />
      <path d={d} fill={lit} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#4a4358" strokeWidth="1" />
    </svg>
  );
}
