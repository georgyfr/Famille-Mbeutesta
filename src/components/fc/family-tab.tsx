"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Onglet « Famille » — annuaire localisé & rencontres
//
// CARTE CENTRÉE SUR LE DÉPARTEMENT DU MFOUNDI (Yaoundé, Centre — Cameroun) :
//  • le cadre vert délimite le Mfoundi — zone de vie de la majorité de la famille ;
//  • chaque membre localisé DANS le Mfoundi apparaît sur la carte ; en zoomant
//    (tuiles libres OpenStreetMap, jusqu'au niveau 19) on descend jusqu'au
//    quartier et à l'emplacement de la maison ;
//  • les membres HORS du Mfoundi ne surchargent pas la carte : ils sont listés
//    à part (« Hors du Mfoundi ») — un clic sur « Voir » vole vers leur position
//    avec un bandeau explicatif et un bouton « Retour au Mfoundi ».
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
import {
  estDansMfoundi, formatDistance, googleMapsDirectionsUrl, haversineKm, MFOUNDI, osmDirectionsUrl,
} from "@/lib/fc-geo";
import { FcButton, FcCard } from "./ui";
import {
  ArrowLeft, Copy, Crosshair, LocateFixed, MapPin, MapPinned, Navigation, PencilLine, RefreshCw, Route, Users,
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
  rectangle: (bounds: [[number, number], [number, number]], opts?: Record<string, unknown>) => {
    addTo: (m: LMapLike) => { bindTooltip: (html: string, opts?: Record<string, unknown>) => void };
  };
};
type LMapLike = {
  setView: (c: [number, number], z?: number) => LMapLike;
  remove: () => void;
  fitBounds: (b: [number, number][], opts?: Record<string, unknown>) => void;
  removeLayer: (layer: unknown) => LMapLike;
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
const PIN_HORS = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#B85C33"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>`;

type PinKind = "me" | "other" | "hors";

function pinIcon(L: LeafletLike, kind: PinKind) {
  const svg = kind === "me" ? PIN_ME : kind === "hors" ? PIN_HORS : PIN_OTHER;
  return L.divIcon({
    html: `<img src="data:image/svg+xml;utf8,${encodeURIComponent(svg)}" style="width:30px;height:42px" alt=""/>`,
    className: "fc-pin",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
}

/* Vue de la carte : vue famille (Mfoundi) ou position d'un membre précis. */
type Vue = { type: "famille" } | { type: "membre"; membre: FamilyLocation };

export function FamilyTab({ onEditLocation }: { onEditLocation: () => void }) {
  const [members, setMembers] = useState<FamilyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [vue, setVue] = useState<Vue>({ type: "famille" });
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<LMapLike | null>(null);
  const marqueurTemp = useRef<unknown>(null);

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
  const dansZone = useMemo(() => members.filter((m) => estDansMfoundi(m)), [members]);
  const horsZone = useMemo(() => members.filter((m) => !estDansMfoundi(m)), [members]);
  const moiDansZone = me ? estDansMfoundi(me) : false;

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
  const othersDans = useMemo(() => others.filter((m) => estDansMfoundi(m)), [others]);
  const othersHors = useMemo(() => others.filter((m) => !estDansMfoundi(m)), [others]);

  /* ─── Carte Leaflet — créée une fois, centrée sur le Mfoundi ─── */
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

        // Cadre du département du Mfoundi — la zone de vie de la famille.
        const cadre = L.rectangle(
          [[MFOUNDI.south, MFOUNDI.west], [MFOUNDI.north, MFOUNDI.east]],
          { color: "#1E4D2B", weight: 2, dashArray: "8 8", fillColor: "#2A4A3A", fillOpacity: 0.05 }
        ).addTo(map);
        cadre.bindTooltip(`${MFOUNDI.label} — Yaoundé`, { permanent: true, direction: "center", className: "fc-zone-label" });

        // Marqueurs : uniquement les membres situés DANS le Mfoundi.
        for (const m of members) {
          if (!estDansMfoundi(m)) continue;
          const mk = L.marker([m.latitude, m.longitude], { icon: pinIcon(L, m.isMe ? "me" : "other") }).addTo(map);
          mk.bindPopup(
            `<strong>${m.isMe ? "Vous" : escapeHtml(m.fullName)}</strong><br/><span style="font-size:12px">${escapeHtml(
              [m.quartier, m.arrondissement, m.city].filter(Boolean).join(", ")
            )}</span>`
          );
        }

        // Traits pointillés entre moi et les membres proches (dans la zone).
        if (me && estDansMfoundi(me)) {
          for (const o of othersDans) {
            L.polyline([[me.latitude, me.longitude], [o.latitude, o.longitude]], {
              color: "#C89F62",
              weight: 2,
              opacity: 0.55,
              dashArray: "6 8",
            }).addTo(map);
          }
        }

        // Vue initiale : les membres du Mfoundi (ou tout le département si aucun).
        const pts = dansZone.map((m) => [m.latitude, m.longitude] as [number, number]);
        if (pts.length > 0) {
          map.fitBounds(pts, { padding: [45, 45], maxZoom: 16 });
        } else {
          map.fitBounds([[MFOUNDI.south, MFOUNDI.west], [MFOUNDI.north, MFOUNDI.east]], { padding: [15, 15] });
        }
        mapObj.current = map;
        // Une reconfiguration des données ramène à la vue famille.
        setVue((v) => (v.type === "famille" ? v : { type: "famille" }));
      })
      .catch(() => setMapError(true));
    return () => {
      cancelled = true;
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
      marqueurTemp.current = null;
    };
  }, [loading, mapError, members, me, othersDans, dansZone]);

  /* ─── Vue courante : retour famille ou position d'un membre précis ─── */
  useEffect(() => {
    const L = (window as unknown as { L?: LeafletLike }).L;
    const map = mapObj.current;
    if (!L || !map) return;

    if (marqueurTemp.current) {
      map.removeLayer(marqueurTemp.current);
      marqueurTemp.current = null;
    }

    if (vue.type === "famille") {
      const pts = dansZone.map((m) => [m.latitude, m.longitude] as [number, number]);
      if (pts.length > 0) {
        map.fitBounds(pts, { padding: [45, 45], maxZoom: 16 });
      } else {
        map.fitBounds([[MFOUNDI.south, MFOUNDI.west], [MFOUNDI.north, MFOUNDI.east]], { padding: [15, 15] });
      }
      return;
    }

    const m = vue.membre;
    map.setView([m.latitude, m.longitude], 16);
    // Marqueur temporaire réservé aux membres HORS du Mfoundi (absents de la
    // carte par défaut) — orange, avec un bandeau explicatif au-dessus.
    if (!estDansMfoundi(m)) {
      const mk = L.marker([m.latitude, m.longitude], { icon: pinIcon(L, m.isMe ? "me" : "hors") }).addTo(map);
      mk.bindPopup(
        `<strong>${m.isMe ? "Vous" : escapeHtml(m.fullName)}</strong><br/><span style="font-size:12px">Hors du Mfoundi — ${escapeHtml(
          [m.city, m.region, m.country].filter(Boolean).join(", ")
        )}</span>`
      );
      marqueurTemp.current = mk;
    }
  }, [vue, dansZone]);

  const voirSurCarte = useCallback((m: FamilyLocation) => {
    setVue({ type: "membre", membre: m });
  }, []);

  const retourFamille = useCallback(() => {
    setVue({ type: "famille" });
  }, []);

  const copyCoords = async (m: FamilyLocation) => {
    const text = `${m.fullName} — ${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Coordonnées copiées — collez-les dans n'importe quelle application GPS.");
  };

  const membreVue = vue.type === "membre" ? vue.membre : null;
  const membreVueHors = membreVue && !estDansMfoundi(membreVue) ? membreVue : null;

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
              {" · "}
              {moiDansZone ? (
                <span className="font-semibold text-[#1E4D2B]">dans le Mfoundi ✓</span>
              ) : (
                <span className="font-semibold text-[#B85C33]">hors du Mfoundi</span>
              )}
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

      {/* Carte — centrée sur le département du Mfoundi */}
      <FcCard className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <MapPinned className="h-4.5 w-4.5 shrink-0 text-[#C89F62]" />
            <p className="truncate text-[11.5px] font-bold uppercase tracking-wide text-[#8A9288]">
              Carte de la famille — Mfoundi
            </p>
          </div>
          {me && !mapError && members.length > 0 && (
            <button onClick={retourFamille} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-[#2A4A3A] hover:bg-[#2A4A3A]/5" aria-label="Revenir à la vue du Mfoundi">
              <Crosshair className="h-3.5 w-3.5" /> Vue famille
            </button>
          )}
        </div>

        {/* Bandeau explicatif quand on regarde un membre hors du Mfoundi */}
        {membreVueHors && (
          <div className="flex flex-wrap items-center gap-2 border-y border-[#B85C33]/25 bg-[#B85C33]/10 px-4 py-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#B85C33]" />
            <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#7A4526]">
              <strong className="font-bold">{membreVueHors.isMe ? "Vous" : membreVueHors.fullName}</strong>{" "}
              n&apos;est pas dans le département du Mfoundi — position :{" "}
              <strong className="font-semibold">
                {[membreVueHors.city, membreVueHors.region, membreVueHors.country].filter(Boolean).join(", ") || "hors zone"}
              </strong>.
            </p>
            <button
              onClick={retourFamille}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#1E4D2B] px-2.5 py-1.5 text-[11.5px] font-bold text-white hover:bg-[#184a33]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour au Mfoundi
            </button>
          </div>
        )}

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
          <>
            <div
              ref={mapRef}
              className="h-[320px] w-full bg-[#E8E4D8] sm:h-[400px]"
              role="application"
              aria-label="Carte de la famille centrée sur le département du Mfoundi (Yaoundé)"
            />
            <p className="border-t border-[#E5DCC0] px-4 py-2 text-[11px] leading-relaxed text-[#8A9288]">
              <span className="font-bold text-[#1E4D2B]">Cadre vert :</span> département du Mfoundi (Yaoundé).
              Zoomez jusqu&apos;au quartier et à la maison — cartes libres OpenStreetMap, gratuites.
            </p>
          </>
        )}
      </FcCard>

      {/* Membres localisés */}
      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">
            Membres localisés ({members.length})
          </h3>
        </div>

        {loading ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">
            Personne pour l&apos;instant. Chaque membre qui enregistre sa position apparaîtra ici.
          </p>
        ) : (
          <>
            {/* ── Dans le Mfoundi ── */}
            {dansZone.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#1E4D2B]">
                  <MapPin className="h-3.5 w-3.5" /> Dans le Mfoundi ({dansZone.length})
                </p>
                <ul className="fc-scroll max-h-96 space-y-2.5 overflow-y-auto pr-1">
                  {me && moiDansZone && (
                    <MemberRow m={me} distanceLabel="Vous êtes ici" onCopy={copyCoords} onVoir={() => voirSurCarte(me)} highlight />
                  )}
                  {othersDans.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      distanceLabel={m.distanceKm !== null ? `à ${formatDistance(m.distanceKm)} de vous` : undefined}
                      showRoute={!!me}
                      from={me ? { latitude: me.latitude, longitude: me.longitude } : undefined}
                      onCopy={copyCoords}
                      onVoir={() => voirSurCarte(m)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* ── Hors du Mfoundi ── */}
            {horsZone.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#B85C33]">
                  <MapPin className="h-3.5 w-3.5" /> Hors du Mfoundi ({horsZone.length})
                </p>
                <ul className="fc-scroll max-h-96 space-y-2.5 overflow-y-auto pr-1">
                  {me && !moiDansZone && (
                    <MemberRow m={me} distanceLabel="Vous êtes ici" onCopy={copyCoords} onVoir={() => voirSurCarte(me)} highlight />
                  )}
                  {othersHors.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      distanceLabel={m.distanceKm !== null ? `à ${formatDistance(m.distanceKm)} de vous` : undefined}
                      showRoute={!!me}
                      from={me ? { latitude: me.latitude, longitude: me.longitude } : undefined}
                      onCopy={copyCoords}
                      onVoir={() => voirSurCarte(m)}
                      horsZone
                    />
                  ))}
                </ul>
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#8A9288]">
                  Ces membres habitent en dehors du département du Mfoundi (Yaoundé) — touchez « Voir » pour
                  les localiser sur la carte, puis « Retour au Mfoundi » pour revenir.
                </p>
              </div>
            )}
          </>
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
  m, distanceLabel, showRoute, from, onCopy, onVoir, highlight, horsZone,
}: {
  m: FamilyLocation;
  distanceLabel?: string;
  showRoute?: boolean;
  from?: { latitude: number; longitude: number };
  onCopy: (m: FamilyLocation) => void;
  onVoir?: (m: FamilyLocation) => void;
  highlight?: boolean;
  horsZone?: boolean;
}) {
  return (
    <li
      className={`rounded-2xl border p-3 ${
        highlight ? "border-[#C89F62]/60 bg-[#C89F62]/10" : "border-[#E5DCC0] bg-[#FFFDF6]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-bold text-[#1E4D2B]">
            <span className="truncate">{m.isMe ? `${m.fullName} (vous)` : m.fullName}</span>
            {horsZone && (
              <span className="shrink-0 rounded-full border border-[#B85C33]/40 bg-[#B85C33]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#B85C33]">
                Hors Mfoundi
              </span>
            )}
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
        <div className="flex shrink-0 items-start gap-0.5">
          {onVoir && (
            <button
              onClick={() => onVoir(m)}
              className="rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10"
              aria-label={`Voir ${m.fullName} sur la carte`}
              title="Voir sur la carte"
            >
              <Crosshair className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onCopy(m)}
            className="rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10"
            aria-label={`Copier les coordonnées de ${m.fullName}`}
            title="Copier les coordonnées GPS"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
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
