import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { LensResult, Source } from "../api/types";
import { useI18n } from "../i18n/I18n";
import { apiUrl } from "../api/client";

/**
 * Before/after viewer. Both images and the overlay share one transform, so zoom and pan
 * move them together; the split line stays in screen space.
 */
export default function CompareViewer({ r, overlay, mist, selected, onSelect, maxHeight = 560 }: {
  r: LensResult; overlay: boolean; mist: boolean; selected: number | null;
  onSelect?: (id: number) => void; maxHeight?: number;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ mode: "split" | "pan"; x: number; y: number; px: number; py: number } | null>(null);

  const clampPan = useCallback((p: { x: number; y: number }, zoom: number) => {
    const el = box.current; if (!el) return p;
    const w = el.clientWidth, h = el.clientHeight;
    return { x: Math.min(0, Math.max(w * (1 - zoom), p.x)), y: Math.min(0, Math.max(h * (1 - zoom), p.y)) };
  }, []);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const el = box.current!; const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const nz = Math.min(12, Math.max(1, z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
    const np = { x: cx - (cx - pan.x) * (nz / z), y: cy - (cy - pan.y) * (nz / z) };
    setZ(nz); setPan(clampPan(np, nz));
  };
  const zoomBy = (f: number) => {
    const el = box.current!; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    const nz = Math.min(12, Math.max(1, z * f));
    setZ(nz); setPan(clampPan({ x: cx - (cx - pan.x) * (nz / z), y: cy - (cy - pan.y) * (nz / z) }, nz));
  };
  const down = (e: PointerEvent, mode: "split" | "pan") => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const rect = box.current!.getBoundingClientRect();
    if (d.mode === "split") setSplit(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
    else if (z > 1) setPan(clampPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }, z));
    else setSplit(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };
  const up = () => { drag.current = null; };

  const tf = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${z})` };
  const right = mist ? r.files.mist : r.files.restored;
  const invented = r.seal.invented ?? [];

  return (
    <div>
      <div
        ref={box} className="cv" style={{ aspectRatio: `${r.width} / ${r.height}`, maxHeight, cursor: z > 1 ? "grab" : "ew-resize" }}
        onWheel={onWheel} onPointerDown={(e) => down(e, "pan")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        role="slider" aria-label="Compare original and restored" aria-valuenow={Math.round(split * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 0.05)); if (e.key === "ArrowRight") setSplit((s) => Math.min(1, s + 0.05)); }}
      >
        <div className="cv-layer" style={tf}><img src={apiUrl(r.files.original)} alt={t("lens.orig")} draggable={false} /></div>
        <div className="cv-clip" style={{ clipPath: `inset(0 0 0 ${split * 100}%)` }}>
          <div className="cv-layer" style={tf}><img src={apiUrl(right)} alt={mist ? t("lens.mistlabel") : t("lens.rest")} draggable={false} /></div>
        </div>
        <div className="cv-layer" style={{ ...tf, pointerEvents: "none" }}>
          <svg viewBox={`0 0 ${r.width} ${r.height}`} preserveAspectRatio="none" className="cv-svg">
            {overlay && r.sources.map((s) => <Mark key={s.id} s={s} sel={s.id === selected} onSelect={onSelect} />)}
            {invented.map((p, i) => (
              <g key={`inv${i}`}>
                <circle cx={p.x} cy={p.y} r={10} className="mk-invented" vectorEffect="non-scaling-stroke" />
                <text x={p.x + 13} y={p.y + 4} className="mk-label">INVENTED</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="cv-handle" style={{ left: `${split * 100}%` }} onPointerDown={(e) => down(e, "split")}><span>◀ ▶</span></div>
        <span className="cv-tag" style={{ left: 8 }}>{t("lens.orig")}</span>
        <span className="cv-tag" style={{ right: 8 }}>{mist ? t("lens.mistlabel") : t("lens.rest")}</span>
      </div>
      <div className="row small" style={{ marginTop: 8, justifyContent: "space-between" }}>
        <div className="row">
          <button className="btn ghost sm" onClick={() => zoomBy(1.5)} aria-label="Zoom in">+</button>
          <button className="btn ghost sm" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
          <button className="btn ghost sm" onClick={() => { setZ(1); setPan({ x: 0, y: 0 }); }}>{t("lens.reset")}</button>
          <span className="mono faint">{z.toFixed(1)}×</span>
        </div>
        <span className="faint">{t("lens.processed")}</span>
      </div>
    </div>
  );
}

function Mark({ s, sel, onSelect }: { s: Source; sel: boolean; onSelect?: (id: number) => void }) {
  const cls = `mk ${s.class === "star" ? "mk-star" : "mk-ext"} ${sel ? "mk-sel" : ""}`;
  const handle = onSelect ? { onPointerDown: (e: PointerEvent) => { e.stopPropagation(); onSelect(s.id); }, style: { pointerEvents: "all" as const, cursor: "pointer" } } : {};
  if (s.class === "extended") {
    const a = Math.max(Math.sqrt(s.area / Math.PI) * 1.4, 6);
    const b = a * Math.max(1 - s.ellipticity, 0.35);
    return <ellipse cx={s.x} cy={s.y} rx={a} ry={b} transform={`rotate(${s.orientation} ${s.x} ${s.y})`} className={cls} vectorEffect="non-scaling-stroke" {...handle} />;
  }
  return <circle cx={s.x} cy={s.y} r={Math.max(s.fwhm * 1.6, 4)} className={cls} vectorEffect="non-scaling-stroke" {...handle} />;
}
