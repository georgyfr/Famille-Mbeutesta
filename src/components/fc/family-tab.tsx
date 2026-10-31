"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Onglet « Famille » — annuaire localisé & rencontres
//
// Tout est gratuit et sans clé API :
//  • Carte : OpenStreetMap (tuiles libres) + Leaflet (CDN public, sans compte)
//  • Distances : calcul Haversine local (dans le téléphone, pas de serveur)
//  • Itinéraires : liens profonds Google Maps / OpenStreetMap — gratuits,
//    ils ouvrent directement l'application de navigation du téléphone.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/fc-client";
import { formatDistance, googleMapsDirectionsUrl, haversineKm, osmDirectionsUrl } from "@/lib/fc-geo";
import { FcButton, FcCard } from "./ui";
import {
  Copy, Crosshair, LocateFixed, MapPin, MapPinned, Navigation, PencilLine, RefreshCw, Route, Users,
} from "lucide-react";

export type FamilyLocation = {
  id: string;
  fullName: string;
  phone?: string | null;
  isMe: boolean;
  role: string;
  city: string | null;
  region: string | null;
  department: string | null;
  arrondissement: string | null;
  quartier: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  updatedAt?: string | null;
};

/* ─── Chargement différé de Leaflet (CDN public, gratuit) ─── */
type LeafletLike = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LMapLike;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LMapLike) => void };
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (latlng: [number, number], opts?: Record<string, unknown>) => {
    addTo: (m: LMapLike) => { bindPopup: (html: string) => void };
  };
  polyline: (pts: [number, number][], opts?: Record<string, unknown>) => { addTo: (m: LMapLike) => void };
};
type LMapLike = {
  setView: (c: [number, number], z?: number) => LMapLike;
  remove: () => void;
  fitBounds: (b: [number, number][], opts?: Record<string, unknown>) => void;
};

function loadLeaflet(): Promise<LeafletLike> {
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
      existing.addEventListener("load", () => w.L ? resolve(w.L) : reject(new Error("Leaflet absent")));
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

const PIN_ME = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#C89F62"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;
const PIN_OTHER = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#1E4D2B"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;

function pinIcon(L: LeafletLike, me: boolean) {
  return L.divIcon({
    html: `<img src="data:image/svg+xml;utf8,${encodeURIComponent(me ? PIN_ME : PIN_OTHER)}" style="width:30px;height:42px" alt=""/>`,
    className: "fc-pin",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}

export function FamilyTab({ onEditLocation }: { onEditLocation: () => void }) {
  const [members, setMembers] = useState<FamilyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<LMapLike | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ members: FamilyLocation[] }>("/api/family/locations");
    if (res.ok) setMembers(res.members);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const me = useMemo(() => members.find((m) => m.isMe) ?? null, [members]);
  const others = useMemo(
    () =>
      members
        .filter((m) => !m.isMe)
        .map((m) => ({
          ...m,
          distanceKm: me ? haversineKm({ latitude: me.latitude, longitude: me.longitude }, m) : null,
        }))
        .sort((a, b) => {
          if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
          return a.fullName.localeCompare(b.fullName, "fr");
        }),
    [members, me]
  );

  /* ─── Carte Leaflet ─── */
  useEffect(() => {
    if (loading || mapError || members.length === 0) return;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapRef.current || mapObj.current) return;
        const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(map);
        const pts: [number, number][] = [];
        for (const m of members) {
          const mk = L.marker([m.latitude, m.longitude], { icon: pinIcon(L, m.isMe) }).addTo(map);
          mk.bindPopup(
            `<strong>${m.isMe ? "Vous" : escapeHtml(m.fullName)}</strong><br/><span style="font-size:12px">${escapeHtml(
              [m.city, m.region, m.country].filter(Boolean).join(", ")
            )}</span>`
          );
          pts.push([m.latitude, m.longitude]);
        }
        if (me && others.length > 0) {
          for (const o of others) {
            if (o.distanceKm !== null && o.distanceKm < 300) {
              L.polyline([[me.latitude, me.longitude], [o.latitude, o.longitude]], {
                color: "#C89F62",
                weight: 2,
                opacity: 0.55,
                dashArray: "6 8",
              }).addTo(map);
            }
          }
        }
        map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
        mapObj.current = map;
      })
      .catch(() => setMapError(true));
    return () => {
      cancelled = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [loading, mapError, members, me, others]);

  const recenterMap = () => {
    if (!mapObj.current || !me) return;
    mapObj.current.setView([me.latitude, me.longitude], 14);
  };

  const copyCoords = async (m: FamilyLocation) => {
    const text = `${m.fullName} — ${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Coordonnées copiées — collez-les dans n'importe quelle application GPS.");
  };

  return (
    <div className="space-y-4">
      {/* Ma localisation */}
      <FcCard className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <LocateFixed className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Ma localisation</h3>
          <button onClick={load} className="ml-auto rounded-lg p-1.5 text-[#2A4A3A] hover:bg-[#2A4A3A]/5" aria-label="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <p className="py-2 text-[13px] text-[#8A9288]">Chargement…</p>
        ) : me ? (
          <>
            <p className="text-[15px] font-semibold text-[#2B3530]">
              {[me.quartier, me.arrondissement].filter(Boolean).join(", ") || "—"}
            </p>
            <p className="text-[13px] text-[#5C6B60]">
              {[me.city, me.department, me.region, me.country].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#8A9288]">
              GPS : {me.latitude.toFixed(5)}, {me.longitude.toFixed(5)}
            </p>
            <FcButton variant="outline" onClick={onEditLocation} className="mt-3">
              <PencilLine className="h-4 w-4" /> Corriger ma localisation
            </FcButton>
          </>
        ) : (
          <>
            <p className="text-[13px] text-[#5C6B60]">
              Vous n&apos;avez pas encore enregistré votre position — la famille ne peut pas encore vous trouver.
            </p>
            <FcButton onClick={onEditLocation} className="mt-3">
              <MapPinned className="h-4 w-4" /> Indiquer ma localisation
            </FcButton>
          </>
        )}
      </FcCard>

      {/* Carte */}
      <FcCard className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4.5 w-4.5 text-[#C89F62]" />
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A9288]">
              Carte de la famille
            </p>
          </div>
          {me && !mapError && members.length > 0 && (
            <button onClick={recenterMap} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-[#2A4A3A] hover:bg-[#2A4A3A]/5" aria-label="Recentrer sur ma position">
              <Crosshair className="h-3.5 w-3.5" /> Recentrer
            </button>
          )}
        </div>
        {loading ? (
          <p className="py-8 text-center text-[13px] text-[#8A9288]">Chargement de la carte…</p>
        ) : members.length === 0 ? (
          <p className="px-4 pb-5 pt-1 text-center text-[13px] text-[#8A9288]">
            Aucun membre localisé pour l&apos;instant — soyez le premier : votre position servira de point de rendez-vous.
          </p>
        ) : mapError ? (
          <p className="px-4 pb-5 pt-1 text-[12.5px] text-[#8A9288]">
            La carte interactive n&apos;a pas pu charger (connexion limitée). La liste ci-dessous reste pleinement
            fonctionnelle avec les liens d&apos;itinéraire.
          </p>
        ) : (
          <div ref={mapRef} className="h-[300px] w-full bg-[#E8E4D8]" role="application" aria-label="Carte des membres de la famille" />
        )}
      </FcCard>

      {/* Membres localisés */}
      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">
            Membres localisés ({others.length + (me ? 1 : 0)})
          </h3>
        </div>
        {loading ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">
            Personne pour l&apos;instant. Chaque membre qui enregistre sa position apparaîtra ici.
          </p>
        ) : (
          <ul className="fc-scroll max-h-96 space-y-2.5 overflow-y-auto pr-1">
            {me && (
              <MemberRow
                m={me}
                distanceLabel="Vous êtes ici"
                onCopy={copyCoords}
                highlight
              />
            )}
            {others.map((m) => (
              <MemberRow
                key={m.id}
                m={m}
                distanceLabel={m.distanceKm !== null ? `à ${formatDistance(m.distanceKm)} de vous` : undefined}
                showRoute={!!me}
                from={me ? { latitude: me.latitude, longitude: me.longitude } : undefined}
                onCopy={copyCoords}
              />
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#8A9288]">
          « Y aller » ouvre gratuitement Google Maps (ou OpenStreetMap) avec la position du membre comme
          destination — le guidage se fait comme pour n&apos;importe quelle adresse.
        </p>
      </FcCard>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function MemberRow({
  m, distanceLabel, showRoute, from, onCopy, highlight,
}: {
  m: FamilyLocation;
  distanceLabel?: string;
  showRoute?: boolean;
  from?: { latitude: number; longitude: number };
  onCopy: (m: FamilyLocation) => void;
  highlight?: boolean;
}) {
  return (
    <li
      className={`rounded-2xl border p-3 ${
        highlight ? "border-[#C89F62]/60 bg-[#C89F62]/10" : "border-[#E5DCC0] bg-[#FFFDF6]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-[#1E4D2B]">
            {m.isMe ? `${m.fullName} (vous)` : m.fullName}
          </p>
          <p className="text-[12.5px] text-[#5C6B60]">
            {[m.quartier, m.arrondissement].filter(Boolean).join(", ")}
            {m.quartier || m.arrondissement ? " — " : ""}
            {[m.city, m.region, m.country].filter(Boolean).join(", ")}
          </p>
          {distanceLabel && (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[#2A4A3A]">
              <MapPin className="h-3 w-3" /> {distanceLabel}
            </p>
          )}
        </div>
        <button
          onClick={() => onCopy(m)}
          className="shrink-0 rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10"
          aria-label={`Copier les coordonnées de ${m.fullName}`}
          title="Copier les coordonnées GPS"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {showRoute && from && (
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={googleMapsDirectionsUrl(m)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#1F5B3F] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#184a33]"
          >
            <Navigation className="h-3.5 w-3.5" /> Y aller (Google Maps)
          </a>
          <a
            href={osmDirectionsUrl(from, m)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#C9B98A] px-3 py-1.5 text-[12.5px] font-semibold text-[#2A4A3A] hover:bg-[#C89F62]/10"
          >
            <Route className="h-3.5 w-3.5" /> Itinéraire OSM
          </a>
        </div>
      )}
    </li>
  );
}
