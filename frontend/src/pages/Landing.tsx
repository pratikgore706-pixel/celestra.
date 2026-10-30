import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import { LANDING } from "../i18n/landing";

/**
 * Scroll story. A sticky stage holds three layers:
 *   1. a galaxy that rotates with scroll (behind everything),
 *   2. the mountains + samurai cut from the photo (sky removed),
 *   3. his raised arm and the red ribbon as separate pieces, animated by scroll.
 * Left: the CELESTRA mark. Right: five chapters that arrive as you scroll.
 * Everything is driven from one rAF loop writing CSS variables / styles (no re-renders).
 */
const SRC = "/landing/";
const ARM_PIVOT = "50.6% 55.4%";     // shoulder (846, 521) on the 1674x940 canvas
const RIBBON_PIVOT = "47.7% 49.6%";  // knot at the hat (798, 466)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function Landing() {
  const { lang } = useI18n();
  const L = LANDING[lang];
  const N = L.chapters.length;
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const dots = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const el = root.current, st = stage.current;
    if (!el || !st) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let target = 0, cur = 0, raf = 0;
    const t0 = performance.now();

    const read = () => {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    const frame = (now: number) => {
      cur += (target - cur) * (reduce ? 1 : 0.09);
      const p = cur;
      const idle = reduce ? 0 : Math.sin((now - t0) / 900) * 1.5; // tiny breath while idle
      st.style.setProperty("--p", p.toFixed(4));
      st.style.setProperty("--rot", reduce ? "0deg" : `${(p * 230).toFixed(2)}deg`);
      st.style.setProperty("--gscale", (1.05 + p * 0.18).toFixed(3));
      st.style.setProperty("--arm", reduce ? "0deg" : `${(Math.sin(p * Math.PI * 2 * 6) * 16 - 2 + idle).toFixed(2)}deg`);
      st.style.setProperty("--rib", reduce ? "0deg" : `${(Math.sin(p * Math.PI * 2 * 4 + 0.8) * 3 + idle).toFixed(2)}deg`);
      st.style.setProperty("--ribs", reduce ? "1" : (1 + Math.sin(p * Math.PI * 2 * 4) * 0.04).toFixed(3));
      st.style.setProperty("--scene", (1.06 - p * 0.06).toFixed(3));
      const pos = p * N;
      const active = Math.min(N - 1, Math.max(0, Math.floor(pos)));
      chapters.current.forEach((c, i) => {
        if (!c) return;
        const local = pos - i;
        const fadeIn = i === 0 ? 1 : smooth(0, 0.14, local);
        const fadeOut = i === N - 1 ? 1 : 1 - smooth(0.86, 1, local);
        const a = fadeIn * fadeOut;
        c.style.opacity = a.toFixed(3);
        c.style.transform = `translateY(${((0.5 - Math.min(1, Math.max(0, local))) * 36).toFixed(1)}px)`;
        c.style.visibility = a < 0.01 ? "hidden" : "visible";
        c.setAttribute("aria-hidden", a < 0.5 ? "true" : "false");
      });
      dots.current.forEach((d, i) => d?.setAttribute("data-on", i === active ? "1" : i < active ? "past" : "0"));
      raf = requestAnimationFrame(frame);
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, [N]);

  const jump = (i: number) => {
    const el = root.current; if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + span * ((i + 0.5) / N), behavior: "smooth" });
  };

  return (
    <section className="lp" ref={root} style={{ height: `${N * 110 + 100}vh` }}>
      <div className="lp-stage" ref={stage}>
        <div className="lp-sky" aria-hidden="true"><img src={`${SRC}galaxy.webp`} alt="" draggable={false} /></div>
        <div className="lp-glow" aria-hidden="true" />
        <div className="lp-scene" aria-hidden="true">
          <img className="lp-fg" src={`${SRC}fg.webp`} alt="" draggable={false} />
          <div className="lp-rib" style={{ transformOrigin: RIBBON_PIVOT }}>
            <img src={`${SRC}ribbon.webp`} alt="" draggable={false} style={{ transformOrigin: RIBBON_PIVOT }} />
          </div>
          <img className="lp-arm" src={`${SRC}arm.webp`} alt="" draggable={false} style={{ transformOrigin: ARM_PIVOT }} />
        </div>
        <div className="lp-shade" aria-hidden="true" />

        {/* left: the mark */}
        <div className="lp-brand">
          <div className="lp-seal" aria-hidden="true"><span>月</span><span>読</span></div>
          <h1 className="lp-name" aria-label="Celestra">
            {"CELESTRA".split("").map((ch, i) => <span key={i} style={{ animationDelay: `${0.15 + i * 0.07}s` }} aria-hidden="true">{ch}</span>)}
          </h1>
          <svg className="lp-stroke" viewBox="0 0 420 26" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 16 C 70 6, 150 22, 230 12 S 360 6, 416 14" />
          </svg>
          <p className="lp-tag">{L.tag}</p>
        </div>

        {/* right: the story */}
        <div className="lp-story">
          {L.chapters.map((c, i) => (
            <article key={i} className="lp-ch" ref={(e) => { chapters.current[i] = e; }}>
              <div className="lp-ch-head"><span className="lp-ch-kj">{c.kj}</span><span className="lp-ch-n">0{i + 1} / 0{N}</span></div>
              <div className="lp-eyebrow">{c.eyebrow}</div>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
              {i === N - 1 && (
                <>
                  <dl className="lp-stats">{L.stats.map(([n, s]) => <div key={s}><dt>{n}</dt><dd>{s}</dd></div>)}</dl>
                  <div className="lp-cta">
                    <Link className="btn" to="/dojo">{L.enter} →</Link>
                    <Link className="btn ghost" to="/guide">{L.guide}</Link>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        <nav className="lp-rail" aria-label="Chapters">
          {L.chapters.map((c, i) => (
            <button key={i} type="button" ref={(e) => { dots.current[i] = e; }} onClick={() => jump(i)} aria-label={c.eyebrow} data-on={i === 0 ? "1" : "0"}><i /></button>
          ))}
        </nav>
        <div className="lp-cue" aria-hidden="true"><span>{L.scroll}</span><i /></div>
      </div>
    </section>
  );
}
