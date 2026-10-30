import type { LensResult } from "../api/types";
import { useI18n } from "../i18n/I18n";

export default function SealPanel({ r, compact = false }: { r: LensResult; compact?: boolean }) {
  const { t, lang } = useI18n();
  const s = r.seal;
  const fmt = (c: (typeof s.checks)[number]) =>
    c.key === "kept" ? `${c.value}%` : c.key === "flux" ? `×${c.value}` : c.key === "position" ? `${c.value} px` : c.key === "residual" ? `${c.value}σ${c.blobs ? ` · ${c.blobs} blob${c.blobs > 1 ? "s" : ""}` : ""}` : String(c.value);
  return (
    <div className={compact ? "seal-compact" : ""}>
      <div className={`stamp ${s.sealed ? "" : "fail"}`}>
        <div className="hanko" aria-hidden="true">{lang === "ja" ? (s.sealed ? "真" : "否") : s.sealed ? "✓" : "✕"}</div>
        <div>
          <b className="stamp-t">{s.sealed ? t("lens.sealed") : t("lens.unsealed")}</b>
          <div className="small muted">{s.sealed ? t("lens.sealed.sub") : t("lens.unsealed.sub")}</div>
        </div>
      </div>
      {s.checks.map((c) => (
        <div key={c.key} className={`chk ${c.pass ? "ok" : "no"}`}>
          <span className="chk-s">{c.pass ? "✓" : "✕"}</span>
          <span>{t(`lens.c.${c.key}`)}</span>
          <span className="chk-v mono num">{fmt(c)}<span className="faint"> {c.rule}</span></span>
        </div>
      ))}
      {!compact && (
        <div className="small muted" style={{ marginTop: 10, display: "grid", gap: 4 }}>
          {s.revealed > 0 && <div><b className="num" style={{ color: "var(--gold)" }}>{s.revealed}</b> {t("lens.revealed")}</div>}
          <div>{t("lens.method")}: <span className="mono">{r.method}</span> · {t("lens.noise")} <span className="mono">{r.noise_sigma.toPrecision(3)}</span></div>
          <div>{r.psf.fwhm_px ? t("lens.psf").replace("{n}", String(r.psf.n_stars)).replace("{f}", String(r.psf.fwhm_px)) : t("lens.nopsf")}</div>
          {r.star_protection && <div>{t("lens.protect")}</div>}
          <div className="faint mono">{t("lens.attempts")}: {r.attempts.map((a) => `${a.strength}%${a.deblur_iters ? `+RL${a.deblur_iters}` : ""} ${a.sealed ? "✓" : `✕${a.failed?.length ? ` (${a.failed.join(", ")})` : ""}`}`).join(" → ")} · {r.seconds} {t("lens.secs")}</div>
          {r.fake_star && <div style={{ color: "var(--vermilion)" }}>{t("lens.fakeat")} ({r.fake_star.x}, {r.fake_star.y})</div>}
        </div>
      )}
    </div>
  );
}
