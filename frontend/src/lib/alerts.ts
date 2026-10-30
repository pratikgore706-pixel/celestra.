import { api } from "../api/client";
import type { Alert } from "../api/types";

/** Browser notifications for reminders while the tab is open. */
const scheduled = new Set<number>();

export function scheduleNotifications(alerts: Alert[], fmt: (iso: string) => string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const now = Date.now();
  for (const a of alerts) {
    const ms = new Date(a.at).getTime() - 10 * 60 * 1000 - now; // 10 minutes before
    if (ms < 0 || ms > 24 * 3600 * 1000 || scheduled.has(a.id)) continue;
    scheduled.add(a.id);
    window.setTimeout(() => new Notification("Celestra", { body: `${a.title} · ${fmt(a.at)}`, icon: "/moon.svg" }), ms);
  }
}

export async function addAlert(ev: { id: string; type: string; title: string; start: string }) {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch { /* ignore */ }
  }
  return api<Alert>("/api/sky/alerts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: ev.id, kind: ev.type, title: ev.title, at: ev.start }),
  });
}

export const TYPE_COLOR: Record<string, string> = {
  moon: "#efe6d4", meteor: "#e9a3b6", eclipse: "#e2452f", iss: "#8fa6dc", planet: "#e3b04b", launch: "#9fc7a8",
};
