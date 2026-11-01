"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Carte INTERNE de la fiche réunion — Leaflet + OpenStreetMap (gratuit).
//
// L'utilisateur ne quitte JAMAIS l'application : fini les liens externes
// vers openstreetmap.org ou Google Maps. La carte affiche :
//  • le pin du bénéficiaire avec une ÉTIQUETTE PERMANENTE « Chez X · Quartier
//    Y » — nos propres données (géocodage à l'inscription), donc le nom du
//    quartier reste lisible même quand les tuiles OSM n'affichent pas les
//    petites localités ;
//  • votre pin (or) quand votre position est enregistrée dans l'annuaire
//    famille ;
//  • le trajet réel entre vous et lui (OSRM — serveur public gratuit, sans
//    clé), tracé en vert avec la distance et la durée ; en cas d'échec,
//    ligne droite + distance « à vol d'oiseau » (Haversine local).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { api } from "@/lib/fc-client";
import { fetchRoute, formatDistance, haversineKm, type PointGeo } from "@/lib/fc-geo";
import {
  addBasemapSwitcher, addQuartierLabels, escapeHtml, loadLeaflet, pinIcon, type LMapLike,
} from "@/lib/fc-leaflet";
import { FcSpinner } from "./ui";

export type DestCarte = {
  nom: string;
  estVous: boolean;
  quartier: string | null;
  arrondissement: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
};

export function FcRouteMap({ dest, height = 250 }: { dest: DestCarte; height?: number }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [etat, setEtat] = useState<"chargement" | "prete" | "erreur">("chargement");
  const [trajet, setTrajet] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: LMapLike | null = null;
    let nettoyerQuartiers: (() => void) | null = null;

    (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapRef.current) return;
        map = L.map(mapRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
        // Fond « Quartiers » (HOT — montre mieux les petits lieux) + sélecteur
        // plan clair / rues OSM / satellite ; étiquettes de quartiers posées
        // par l'app (nos données) pour des noms TOUJOURS lisibles.
        addBasemapSwitcher(L, map, "hot");
        nettoyerQuartiers = addQuartierLabels(L, map);

        // Étiquette permanente : nom + quartier (nos données, toujours lisibles)
        const etiquette = [
          dest.estVous ? "Chez vous" : `Chez ${dest.nom}`,
          dest.quartier ? `Quartier ${dest.quartier}` : dest.arrondissement,
        ]
          .filter(Boolean)
          .join(" · ");

        const mk = L.marker([dest.latitude, dest.longitude], { icon: pinIcon(L, "other") }).addTo(map);
        mk.bindTooltip(escapeHtml(etiquette), {
          permanent: true,
          direction: "top",
          offset: [0, -40],
          className: "fc-pin-label",
        });
        mk.bindPopup(
          `<strong>${escapeHtml(etiquette)}</strong><br/><span style="font-size:12px">${escapeHtml(
            [dest.arrondissement, dest.city].filter(Boolean).join(", ")
          )}</span>`
        );

        const pts: [number, number][] = [[dest.latitude, dest.longitude]];

        // Ma position — annuaire famille (positions enregistrées par chacun)
        let moi: PointGeo | null = null;
        try {
          const res = await api<{
            ok: boolean;
            members?: { isMe: boolean; latitude: number; longitude: number }[];
          }>("/api/family/locations");
          const me = res.members?.find((m) => m.isMe);
          if (me) moi = { latitude: me.latitude, longitude: me.longitude };
        } catch {
          /* position indisponible — la carte reste utile sans trajet */
        }

        const sameSpot =
          moi && Math.abs(moi.latitude - dest.latitude) < 1e-6 && Math.abs(moi.longitude - dest.longitude) < 1e-6;

        if (moi && !sameSpot) {
          const mkMe = L.marker([moi.latitude, moi.longitude], { icon: pinIcon(L, "me") }).addTo(map);
          mkMe.bindTooltip("Vous", { permanent: true, direction: "top", offset: [0, -40], className: "fc-pin-label" });
          pts.push([moi.latitude, moi.longitude]);

          // Trajet routier réel (OSRM) — repli : ligne droite pointillée
          const route = await fetchRoute(moi, dest);
          if (cancelled) return;
          if (route) {
            L.polyline(route.points, { color: "#1E4D2B", weight: 4, opacity: 0.85 }).addTo(map);
            setTrajet(`${formatDistance(route.distanceKm)} · ~${route.minutes} min en voiture`);
          } else {
            L.polyline([[moi.latitude, moi.longitude], [dest.latitude, dest.longitude]], {
              color: "#C89F62",
              weight: 2.5,
              dashArray: "6 8",
              opacity: 0.8,
            }).addTo(map);
            setTrajet(`À vol d'oiseau : ${formatDistance(haversineKm(moi, dest))}`);
          }
        }

        map.fitBounds(pts, { padding: [42, 42], maxZoom: 16 });
        if (!cancelled) setEtat("prete");
      } catch {
        if (!cancelled) setEtat("erreur");
      }
    })();

    return () => {
      cancelled = true;
      if (nettoyerQuartiers) nettoyerQuartiers();
      if (map) map.remove();
      map = null;
    };
  }, [dest.latitude, dest.longitude, dest.nom, dest.quartier, dest.arrondissement, dest.city, dest.estVous]);

  if (etat === "erreur") {
    return (
      <p className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8A9288]">
        La carte n&apos;a pas pu se charger (connexion limitée) — les coordonnées GPS affichées
        ci-dessus restent utilisables.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5DCC0]">
      <div className="relative">
        <div
          ref={mapRef}
          style={{ height }}
          className="w-full bg-[#E8E4D8]"
          role="application"
          aria-label={`Carte interne — itinéraire jusqu'à chez ${dest.nom}`}
        />
        {etat === "chargement" && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#FFFDF6]/70 text-[12.5px] text-[#8A9288]">
            <FcSpinner className="h-4 w-4 text-[#C89F62]" /> Préparation de la carte…
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] px-3 py-1.5">
        <p className="flex min-w-0 items-center gap-1 text-[10.5px] leading-snug text-[#8A9288]">
          <MapPinned className="h-3 w-3 shrink-0" />
          <span className="truncate">Carte interne — fond au choix (en haut à droite), pincez/zoomez jusqu&apos;à la maison</span>
        </p>
        {trajet && <p className="shrink-0 text-[10.5px] font-bold text-[#1E4D2B]">{trajet}</p>}
      </div>
    </div>
  );
}
