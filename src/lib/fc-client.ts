"use client";

// ─── Client API Famille.Mbeutetsa ───

export type FcError = { ok: false; error: string; reason?: string; attemptsLeft?: number } & Record<string, unknown>;

export async function api<T = Record<string, unknown>>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T & { ok: boolean }> {
  const res = await fetch(path, {
    method: options?.method || (options?.body ? "POST" : "GET"),
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ ok: false, error: "Réponse illisible du serveur." }));
  return data as T & { ok: boolean };
}

export function deviceName(): string {
  if (typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua)
    ? "iPhone"
    : /Android/.test(ua)
      ? "Android"
      : /Mac/.test(ua)
        ? "Mac"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Appareil";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "";
  const storage = typeof localStorage !== "undefined" ? localStorage.getItem("fc_device_suffix") : null;
  const suffix = storage ? ` ${storage}` : "";
  return `${os}${browser ? ` · ${browser}` : ""}${suffix}`;
}

// Suffixe unique par onglet/appareil pour distinguer les appareils de test
export function ensureDeviceSuffix(): string {
  if (typeof localStorage === "undefined") return "";
  let s = localStorage.getItem("fc_device_suffix");
  if (!s) {
    s = Math.random().toString(36).slice(2, 5).toUpperCase();
    localStorage.setItem("fc_device_suffix", s);
  }
  return s;
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function timeAgo(dateISO: string | Date): string {
  const d = typeof dateISO === "string" ? new Date(dateISO) : dateISO;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
