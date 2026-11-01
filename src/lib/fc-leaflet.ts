"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet partagé — chargement différé (CDN public, gratuit, sans clé API)
//
// Utilisé par la carte famille (family-tab.tsx) ET la carte interne de la
// fiche réunion (fc-route-map.tsx) : un seul chargement de Leaflet par page,
// même jeu de pins aux couleurs Famille.Mbeutetsa.
// ─────────────────────────────────────────────────────────────────────────────

export type LeafletLike = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LMapLike;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LMapLike) => void };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => {
    addTo: (m: LMapLike) => {
      bindPopup: (html: string) => void;
      bindTooltip: (html: string, opts?: Record<string, unknown>) => void;
    };
  };
  polyline: (pts: [number, number][], opts?: Record<string, unknown>) => { addTo: (m: LMapLike) => void };
  rectangle: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => {
    addTo: (m: LMapLike) => { bindTooltip: (html: string, opts?: Record<string, unknown>) => void };
  };
};

export type LMapLike = {
  setView: (c: [number, number], z?: number) => LMapLike;
  remove: () => void;
  fitBounds: (b: [number, number][], opts?: Record<string, unknown>) => void;
  removeLayer: (layer: unknown) => LMapLike;
};

export function loadLeaflet(): Promise<LeafletLike> {
  const w = window as unknown as { L?: LeafletLike };
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("fc-leaflet-css")) {
      const css = document.createElement("link");
      css.id = "fc-leaflet-css";
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }
    const existing = document.getElementById("fc-leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => (w.L ? resolve(w.L) : reject(new Error("Leaflet absent"))));
      existing.addEventListener("error", () => reject(new Error("Leaflet indisponible")));
      return;
    }
    const s = document.createElement("script");
    s.id = "fc-leaflet-js";
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = () => (w.L ? resolve(w.L) : reject(new Error("Leaflet absent")));
    s.onerror = () => reject(new Error("Leaflet indisponible"));
    document.head.appendChild(s);
  });
}

/* ─── Pins Famille.Mbeutetsa — SVG inline, aucune image externe ───
   or  #C89F62 = vous · vert #1E4D2B = membre localisé ·
   orange #B85C33 = membre hors du Mfoundi */
const PIN_ME = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#C89F62"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
const PIN_OTHER = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#1E4D2B"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
const PIN_HORS = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#B85C33"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;

export type PinKind = "me" | "other" | "hors";

export function pinIcon(L: LeafletLike, kind: PinKind) {
  const svg = kind === "me" ? PIN_ME : kind === "hors" ? PIN_HORS : PIN_OTHER;
  return L.divIcon({
    html: `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" style="width:30px;height:42px" alt=""/>`,
    className: "fc-pin",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}

/** Échappe le HTML injecté dans les pop-ups / tooltips Leaflet. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}
