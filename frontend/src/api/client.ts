// Empty base = same origin; Vite proxies /api to the backend (see vite.config.ts).
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Full URL for a backend path (images, downloads) when the API lives on another domain. */
export const apiUrl = (path: string) => (path.startsWith("/api") ? `${API_BASE}${path}` : path);

export type Meta = {
  source: string;
  status: "live" | "cached" | "computed" | "demo";
  fetched_at: string;
  formula_version?: string;
};
export type Envelope<T> = { data: T; meta: Meta };

export async function api<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const r = await fetch(`${API_BASE}${path}`, init);
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { const j = await r.json(); if (j?.detail) msg = j.detail; } catch { /* not json */ }
    throw new Error(msg);
  }
  return r.json();
}
