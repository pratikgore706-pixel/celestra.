import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Panel, PageScene } from "../components/Panel";
import Scene from "../components/Scene";
import MoonGlyph from "../components/MoonGlyph";
import MonLogo from "../components/MonLogo";
import { GLYPH } from "../components/markers";
import { BAND_HEX } from "../lib/format";
import { TYPE_COLOR } from "../lib/alerts";
import { useI18n } from "../i18n/I18n";
import { GUIDE } from "../i18n/guide";

const SECTIONS = [
  ["start", "道"], ["bar", "帯"], ["dojo", "道場"], ["watch", "望楼"], ["scroll", "天巻"],
  ["lens", "霊眼"], ["honor", "誉"], ["data", "源"], ["tips", "心得"], ["faq", "問"],
] as const;
type SectionId = (typeof SECTIONS)[number][0];

const PHASES: [number, string][] = [
  [0, "New Moon"], [45, "Waxing Crescent"], [90, "First Quarter"], [135, "Waxing Gibbous"],
  [180, "Full Moon"], [225, "Waning Gibbous"], [270, "Last Quarter"], [315, "Waning Crescent"],
];

function Glyph({ type, color }: { type: string; color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="5" fill="#0b0d12" stroke="var(--rule-strong)" />
      <g fill={color} stroke={color} dangerouslySetInnerHTML={{ __html: GLYPH[type] }} />
    </svg>
  );
}

function OpenLink({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="btn ghost sm">{label} →</Link>;
}

function Items({ items, cols = 3 }: { items: { t: string; d: string }[]; cols?: number }) {
  return (
    <div className={`g-items c${cols}`}>
      {items.map((it) => <div key={it.t} className="g-item"><b>{it.t}</b><p>{it.d}</p></div>)}
    </div>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return <ol className="g-steps">{steps.map((s) => <li key={s}>{s}</li>)}</ol>;
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="g-sub">{children}</h3>;
}

export default function Guide() {
  const { t, lang } = useI18n();
  const G = GUIDE[lang];
  const [active, setActive] = useState<SectionId>("start");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.replace("g-", "") as SectionId);
      },
      { rootMargin: "-90px 0px -60% 0px" },
    );
    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  const label: Record<SectionId, string> = {
    start: G.quick.title, bar: G.bar.title, dojo: t("nav.dojo"), watch: t("nav.watchtower"), scroll: t("nav.scroll"),
    lens: t("nav.lens"), honor: t("honor.title"), data: G.data.title, tips: G.tips.title, faq: G.faq.title,
  };
  const openLabel = (name: string) => (lang === "en" ? `${G.open} ${name}` : lang === "ja" ? `${name}を${G.open}` : `${name} ${G.open}`);
  const go = (id: SectionId) => refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const sec = (id: SectionId) => ({ id: `g-${id}`, ref: (el: HTMLElement | null) => { refs.current[id] = el; } });

  return (
    <>
      <PageScene kanji="指南" title={G.title} sub={G.sub}><Scene variant="guide" moonX={1260} /></PageScene>
      <div className="page guide">
        <nav className="g-index" aria-label={G.index}>
          <div className="eyebrow">{G.index}</div>
          {SECTIONS.map(([id, kj]) => (
            <button key={id} type="button" aria-current={active === id ? "true" : undefined} onClick={() => go(id)}>
              <span className="g-kj" aria-hidden="true">{kj}</span>{label[id]}
            </button>
          ))}
        </nav>

        <div className="g-body">
          {/* ---------------- Quick start ---------------- */}
          <section {...sec("start")} className="g-sec">
            <Panel kj="道" title={G.quick.title}>
              <p className="g-intro">{G.quick.intro}</p>
              <ol className="g-quick">
                {G.quick.steps.map((s, i) => (
                  <li key={s.t}>
                    <span className="g-num">{i + 1}</span>
                    <b>{s.t}</b>
                    <p>{s.d}</p>
                    <Link to={["/watchtower", "/watchtower", "/scroll", "/lens"][i]} className="g-quick-go">{openLabel([t("nav.watchtower"), t("nav.watchtower"), t("nav.scroll"), t("nav.lens")][i])} →</Link>
                  </li>
                ))}
              </ol>
            </Panel>
          </section>

          {/* ---------------- Top bar ---------------- */}
          <section {...sec("bar")} className="g-sec">
            <Panel kj="帯" title={G.bar.title}>
              <p className="g-intro">{G.bar.intro}</p>
              <div className="g-bar" aria-hidden="true">
                <span className="g-bar-brand"><MonLogo />Celestra</span>
                <span className="g-bar-nav"><i className="on">{t("nav.dojo")}</i><i>{t("nav.watchtower")}</i><i>{t("nav.scroll")}</i><i>{t("nav.lens")}</i><em className="pin">1</em></span>
                <span className="g-bar-right">
                  <span className="g-api"><i />API<em className="pin">2</em></span>
                  <span className="g-seg"><i className="on">{t("theme.yoru.s")}</i><i>{t("theme.akatsuki.s")}</i><em className="pin">3</em></span>
                  <span className="g-seg"><i className="on">EN</i><i>हि</i><i>ਪੰ</i><i>日</i><em className="pin">4</em></span>
                </span>
                <span className="g-bar-banner"><i>{t("omamori")}</i>{t("banner.moonup").replace("{t}", "11:01")}<em className="pin">5</em></span>
              </div>
              <ol className="g-legend">
                {G.bar.items.map((it, i) => <li key={it.t}><span className="pin">{i + 1}</span><div><b>{it.t}</b><p>{it.d}</p></div></li>)}
              </ol>
            </Panel>
          </section>

          {/* ---------------- Dojo ---------------- */}
          <section {...sec("dojo")} className="g-sec">
            <Panel kj="道場" title={G.dojo.title} right={<OpenLink to="/dojo" label={t("nav.dojo")} />}>
              <p className="g-intro">{G.dojo.intro}</p>
              <Items items={G.dojo.items} />
            </Panel>
          </section>

          {/* ---------------- Watchtower ---------------- */}
          <section {...sec("watch")} className="g-sec">
            <Panel kj="望楼" title={G.watch.title} right={<OpenLink to="/watchtower" label={t("nav.watchtower")} />}>
              <p className="g-intro">{G.watch.intro}</p>
              <div className="g-two">
                <div><Sub>{G.watch.stepsTitle}</Sub><Steps steps={G.watch.steps} /></div>
                <div>
                  <Sub>{G.watch.bandsTitle}</Sub>
                  <ul className="g-bands">
                    {(["shogun", "clear", "mist", "storm"] as const).map((b) => (
                      <li key={b}><i style={{ background: BAND_HEX[b] }} /><div><b style={{ color: BAND_HEX[b] }}>{t(`band.${b}`)}</b><span>{G.watch.bands[b]}</span></div></li>
                    ))}
                  </ul>
                </div>
              </div>
              <Sub>{G.watch.modesTitle}</Sub>
              <Items items={G.watch.modes} cols={4} />
              <Sub>{G.watch.partsTitle}</Sub>
              <Items items={G.watch.parts} />
              <div className="g-two">
                <div>
                  <Sub>{G.watch.markersTitle}</Sub>
                  <ul className="g-markers">
                    {(["shrine", "peak", "viewpoint", "observatory", "park", "here"] as const).map((k, i) => (
                      <li key={k}><Glyph type={k} color={k === "here" ? "#ebe8e3" : BAND_HEX[["shogun", "clear", "clear", "shogun", "mist", "clear"][i]]} /><span>{G.watch.markers[k]}</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Sub>{G.watch.confTitle}</Sub>
                  <ul className="g-conf">
                    {G.watch.conf.map((c, i) => (
                      <li key={c.t}><span className={`chip conf-${["high", "medium", "low"][i]}`}>{t(`conf.${["high", "medium", "low"][i]}`)}</span><span>{c.d}</span></li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          </section>

          {/* ---------------- Celestial Scroll ---------------- */}
          <section {...sec("scroll")} className="g-sec">
            <Panel kj="天巻" title={G.scroll.title} right={<OpenLink to="/scroll" label={t("nav.scroll")} />}>
              <p className="g-intro">{G.scroll.intro}</p>
              <Sub>{G.scroll.readTitle}</Sub>
              <Items items={G.scroll.read} cols={4} />
              <div className="g-two">
                <div>
                  <Sub>{G.scroll.typesTitle}</Sub>
                  <ul className="g-types">
                    {(["moon", "meteor", "eclipse", "iss", "planet", "launch"] as const).map((k) => (
                      <li key={k}><i className="dot" style={{ background: TYPE_COLOR[k] }} /><div><b>{t(`scroll.f.${k}`)}</b><span>{G.scroll.types[k]}</span></div></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Sub>{G.scroll.phasesTitle}</Sub>
                  <div className="g-phases">
                    {PHASES.map(([a, n]) => <figure key={a}><MoonGlyph angle={a} size={40} /><figcaption>{t(`moon.phase.${n}`)}</figcaption></figure>)}
                  </div>
                  <Sub>{G.scroll.remindTitle}</Sub>
                  <p className="g-p">{G.scroll.remind}</p>
                </div>
              </div>
            </Panel>
          </section>

          {/* ---------------- Spirit Lens ---------------- */}
          <section {...sec("lens")} className="g-sec">
            <Panel kj="霊眼" title={G.lens.title} right={<OpenLink to="/lens" label={t("nav.lens")} />}>
              <p className="g-intro">{G.lens.intro}</p>
              <div className="g-two">
                <div><Sub>{G.lens.stepsTitle}</Sub><Steps steps={G.lens.steps} /></div>
                <div>
                  <Sub>{G.lens.sealTitle}</Sub>
                  <p className="g-p">{G.lens.sealIntro}</p>
                  <ul className="g-checks">
                    {G.lens.checks.map((c) => <li key={c.t}><span className="g-ok">✓</span><div><b>{c.t}</b><span>{c.d}</span></div></li>)}
                  </ul>
                </div>
              </div>
              <Sub>{G.lens.viewTitle}</Sub>
              <Items items={G.lens.view} cols={4} />
              <div className="g-cards">
                <div className="g-card"><b>{G.lens.softTitle}</b><p>{G.lens.soft}</p></div>
                <div className="g-card accent"><b>{G.lens.testTitle}</b><p>{G.lens.test}</p></div>
                <div className="g-card"><b>{G.lens.arcTitle}</b><p>{G.lens.arc}</p></div>
                <div className="g-card"><b>{G.lens.blinkTitle}</b><p>{G.lens.blink}</p></div>
              </div>
            </Panel>
          </section>

          {/* ---------------- Honor ---------------- */}
          <section {...sec("honor")} className="g-sec">
            <Panel kj="誉" title={G.honor.title} right={<OpenLink to="/dojo" label={t("nav.dojo")} />}>
              <p className="g-intro">{G.honor.intro}</p>
              <div className="g-three">
                <div>
                  <Sub>{G.honor.earnTitle}</Sub>
                  <ul className="g-table">{G.honor.earn.map(([k, v]) => <li key={k}><span>{k}</span><b className="num">+{v}</b></li>)}</ul>
                </div>
                <div>
                  <Sub>{G.honor.ranksTitle}</Sub>
                  <ul className="g-table">{G.honor.ranks.map(([k, v]) => <li key={k}><span>{k}</span><b className="num">{v.toLocaleString()}+</b></li>)}</ul>
                </div>
                <div>
                  <Sub>{G.honor.virtuesTitle}</Sub>
                  <div className="g-virtues" aria-hidden="true">{["義", "勇", "仁", "礼", "誠", "名誉", "忠義"].map((v) => <span key={v}>{v}</span>)}</div>
                  <p className="g-p">{G.honor.virtues}</p>
                </div>
              </div>
            </Panel>
          </section>

          {/* ---------------- Data ---------------- */}
          <section {...sec("data")} className="g-sec">
            <Panel kj="源" title={G.data.title}>
              <p className="g-intro">{G.data.intro}</p>
              <ul className="g-badges">
                {(["live", "cached", "computed", "demo"] as const).map((k) => (
                  <li key={k}><span className={`chip ${k === "demo" ? "demo" : k === "live" ? "conf-high" : ""}`}>{k}</span><span>{G.data.badges[k]}</span></li>
                ))}
              </ul>
            </Panel>
          </section>

          {/* ---------------- Tips ---------------- */}
          <section {...sec("tips")} className="g-sec">
            <Panel kj="心得" title={G.tips.title}>
              <Items items={G.tips.items} />
            </Panel>
          </section>

          {/* ---------------- FAQ ---------------- */}
          <section {...sec("faq")} className="g-sec">
            <Panel kj="問" title={G.faq.title}>
              <div className="g-faq">
                {G.faq.items.map((f) => (
                  <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </>
  );
}
