import type { ReactNode } from "react";
import Enso from "./Enso";
import { useI18n } from "../i18n/I18n";

export function Panel({ kj, title, right, children, className = "" }: {
  kj?: string; title: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-h">
        <h2>{kj && <span className="hanko-kj" aria-hidden="true">{kj}</span>}<span className="panel-title">{title}</span></h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Slot({ title, body, h = 140 }: { title?: string; body: string; h?: number }) {
  return (
    <div className="slot" style={{ minHeight: h }}>
      <div className="slot-in">
        {h >= 180 && <Enso size={Math.min(110, h * 0.42)} color="rgba(227,176,75,.28)" />}
        <div>{title && <b>{title}</b>}{body}</div>
      </div>
    </div>
  );
}

export function PageScene({ kanji, title, sub, children }: { kanji: string; title: string; sub: string; children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <header className="scene">
      {children}
      <div className="mist m1" aria-hidden="true" /><div className="mist m2" aria-hidden="true" />
      <div className="seigaiha" aria-hidden="true" />
      <div className="scene-text">
        <div className="scene-kanji" aria-hidden="true">{kanji}</div>
        {lang === "ja" && <div className="kanji">{kanji}</div>}
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </header>
  );
}
