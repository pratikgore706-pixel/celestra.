import type { Lang } from "../i18n/strings";

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", ja: "ja-JP", pa: "pa-IN" };

export function fmtTime(iso: string | null | undefined, lang: Lang) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: "numeric", minute: "2-digit" });
}
export function fmtHour(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: "numeric" });
}
export function fmtDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short" });
}
export function todayLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const BAND_COLOR: Record<string, string> = {
  shogun: "var(--gold)", clear: "var(--good)", mist: "var(--warn-2)", storm: "var(--vermilion)",
};
export const BAND_HEX: Record<string, string> = {
  shogun: "#e2b54e", clear: "#4fc27a", mist: "#d08a4a", storm: "#e0444e",
};

type T = (k: string) => string;
type Ev = { type: string; title: string; detail?: Record<string, any> };

/** Event title in the selected language (backend titles are English). */
export function evTitle(e: Ev, t: T): string {
  const d = e.detail || {};
  if (e.type === "moon" && d.quarter) return t(`ev.moon.${d.quarter}`);
  if (e.type === "meteor") return t("ev.meteor").replace("{n}", e.title.replace(/ peak$/, ""));
  if (e.type === "eclipse" && d.kind) {
    const k = t(`ev.kind.${d.kind}`);
    return t(/solar/i.test(e.title) ? "ev.solar" : "ev.lunar").replace("{k}", k);
  }
  if (e.type === "planet") { const v = t(`planet.${e.title}`); return v.startsWith("planet.") ? e.title : v; }
  return e.title;
}

/** Name of a lunar night in the selected language; Japanese kanji only in Japanese. */
export function lunarName(ld: { day: number; kanji: string; romaji: string }, t: T, lang: Lang): { name: string; sub: string } {
  if (lang === "ja") return { name: ld.kanji, sub: ld.romaji };
  const k = t(`lunar.${ld.day}`);
  const name = k.startsWith("lunar.") ? t("lunar.day").replace("{n}", String(ld.day)) : k;
  const sub = ld.romaji.startsWith("Day ") ? "" : `${t("lunar.jp")}: ${ld.romaji}`;
  return { name, sub };
}

export function locale(lang: Lang) { return LOCALE[lang]; }
