import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Place = { name: string; lat: number; lon: number };
export type Planned = Place & { id: string; type: string };

const DEFAULT: Place = { name: "New Delhi", lat: 28.6139, lon: 77.209 };

function load<T>(k: string, fallback: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function save(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

type Ctx = {
  place: Place; setPlace: (p: Place) => void;
  planned: Planned | null; setPlanned: (p: Planned | null) => void;
};
const PlaceCtx = createContext<Ctx | null>(null);

export function PlaceProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place>(() => load("celestra.place", DEFAULT));
  const [planned, setPlanned] = useState<Planned | null>(() => load("celestra.planned", null));
  useEffect(() => save("celestra.place", place), [place]);
  useEffect(() => save("celestra.planned", planned), [planned]);
  return <PlaceCtx.Provider value={{ place, setPlace, planned, setPlanned }}>{children}</PlaceCtx.Provider>;
}

export function usePlace() {
  const c = useContext(PlaceCtx);
  if (!c) throw new Error("usePlace outside provider");
  return c;
}
