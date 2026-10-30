import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STRINGS, type Key, type Lang } from "./strings";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key | string) => string };
const I18nCtx = createContext<Ctx | null>(null);

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem("celestra.lang") as Lang | null;
    if (saved && saved in STRINGS) return saved;
  } catch { /* storage unavailable */ }
  const nav = navigator.language.slice(0, 2);
  return nav === "hi" || nav === "ja" || nav === "pa" ? nav : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem("celestra.lang", lang); } catch { /* ignore */ }
  }, [lang]);
  const t = (k: Key | string) => (STRINGS[lang] as Record<string, string>)[k] ?? (STRINGS.en as Record<string, string>)[k] ?? k;
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}
