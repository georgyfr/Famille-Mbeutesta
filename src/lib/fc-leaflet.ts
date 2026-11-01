"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet partagé — chargement différé (CDN public, gratuit, sans clé API)
//
// Utilisé par la carte famille (family-tab.tsx), la carte interne de la
// fiche réunion (fc-route-map.tsx) et le guidage IA (fc-guide-map.tsx) :
// un seul chargement de Leaflet par page, mêmes pins aux couleurs
// Famille.Mbeutetsa.
//
// FONDS DE CARTE (tous gratuits, sans clé, illimités en usage normal) :
//  • HOT (OpenStreetMap Humanitarian) — montre les QUARTIERS et petits
//    lieux mieux que le style standard, idéal pour Yaoundé ;
//  • Voyager (CARTO) — plan clair et lisible ;
//  • OSM standard — les rues ;
//  • Satellite (Esri World Imagery) — vue aérienne pour reconnaître la maison.
// Plus NOS ÉTIQUETTES DE QUARTIERS posées par-dessus (fc-geo.ts) : le nom du
// quartier reste lisible même si les tuiles ne l'affichent pas.
// ─────────────────────────────────────────────────────────────────────────────

import { QUARTIERS_YAOUNDE } from "./fc-geo";

export type MkrLike = {
  addTo: (m: LMapLike) => MkrLike;
  bindPopup: (html: string) => MkrLike;
  bindTooltip: (html: string, opts?: Record<string, unknown>) => MkrLike;
  setLatLng: (ll: [number, number]) => MkrLike;
  remove: () => void;
};

export type PolylineLike = {
  addTo: (m: LMapLike) => PolylineLike;
  remove: () => void;
};

export type TTileLike = {
  addTo: (m: LMapLike) => TTileLike;
  remove: () => void;
};

export type CircleLike = {
  addTo: (m: LMapLike) => CircleLike;
  setLatLng: (ll: [number, number]) => CircleLike;
  remove: () => void;
};

export type LayerGroupLike = {
  addTo: (m: LMapLike) => LayerGroupLike;
  addLayer: (l: unknown) => LayerGroupLike;
  clearLayers: () => LayerGroupLike;
  remove: () => void;
};

export type LMapLike = {
  setView: (c: [number, number], z?: number) => LMapLike;
  remove: () => void;
  fitBounds: (b: [number, number][], opts?: Record<string, unknown>) => void;
  removeLayer: (layer: unknown) => LMapLike;
  on: (event: string, cb: () => void) => LMapLike;
  getZoom: () => number;
};

export type LeafletLike = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LMapLike;
  tileLayer: (url: string, opts: Record<string, unknown>) => TTileLike;
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => MkrLike;
  polyline: (pts: [number, number][], opts?: Record<string, unknown>) => PolylineLike;
  rectangle: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => {
    addTo: (m: LMapLike) => { bindTooltip: (html: string, opts?: Record<string, unknown>) => void };
  };
  circleMarker: (latlng: [number, number], opts?: Record<string, unknown>) => CircleLike;
  layerGroup: (layers?: unknown[]) => LayerGroupLike;
  control: {
    layers: (
      base: Record<string, unknown>,
      overlays?: Record<string, unknown>,
      opts?: Record<string, unknown>
    ) => { addTo: (m: LMapLike) => void };
  };
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

/* ─── Fonds de carte gratuits (sans clé, sans carte bancaire) ─── */
export const BASEMAPS = {
  hot: {
    label: "Quartiers ✓",
    url: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap · style Humanitarian (HOT)",
    maxZoom: 19,
  },
  voyager: {
    label: "Plan clair",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap · CARTO",
    maxZoom: 20,
  },
  osm: {
    label: "Rues (OSM)",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagerie © Esri, Maxar",
    maxZoom: 19,
  },
} as const;

export type BasemapKey = keyof typeof BASEMAPS;

/** Pose le fond de carte par défaut + un sélecteur de couches sur la carte.
 *  Retourne la couche posée (pour un éventuel retrait). */
export function addBasemapSwitcher(L: LeafletLike, map: LMapLike, defaut: BasemapKey = "hot"): TTileLike | null {
  try {
    const layers: Record<string, TTileLike> = {};
    const controls: Record<string, unknown> = {};
    for (const [k, b] of Object.entries(BASEMAPS)) {
      const tl = L.tileLayer(b.url, { maxZoom: b.maxZoom, attribution: b.attribution });
      layers[k] = tl;
      controls[b.label] = tl;
    }
    const base = layers[defaut] ?? layers.hot;
    base.addTo(map);
    L.control.layers(controls).addTo(map);
    return base;
  } catch {
    /* sélecteur indisponible — la carte reste fonctionnelle */
    return null;
  }
}

/** Étiquettes de quartiers/arrondissements de Yaoundé posées SUR la carte
 *  (nos données intégrées — lisibles même quand les tuiles n'affichent pas
 *  les petits lieux). Apparaissent à partir du zoom 12 (arrondissements)
 *  et 13 (quartiers). Retourne une fonction de nettoyage. */
export function addQuartierLabels(L: LeafletLike, map: LMapLike): () => void {
  const group = L.layerGroup().addTo(map);
  const render = () => {
    group.clearLayers();
    const z = map.getZoom();
    if (z < 12) return;
    for (const q of QUARTIERS_YAOUNDE) {
      if (q.arr && z < 12) continue;
      if (!q.arr && z < 13) continue;
      const mk = L.marker([q.lat, q.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          html: `<span>${escapeHtml(q.nom)}</span>`,
          className: q.arr ? "fc-quartier-label fc-quartier-arr" : "fc-quartier-label",
          iconSize: [0, 0],
        }),
      });
      group.addLayer(mk);
    }
  };
  render();
  map.on("zoomend", render);
  return () => group.remove();
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
