"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GUIDAGE ASSISTÉ PAR IA — bouton « S'y rendre »
//
// L'utilisateur ne quitte JAMAIS l'application. Cette fenêtre rassemble :
//  • le trajet routier réel (OSRM, serveur public gratuit) tracé sur une carte
//    Leaflet interne, avec un fond de carte au choix (quartiers HOT, plan
//    clair, rues OSM, satellite) et les étiquettes de quartiers de Yaoundé ;
//  • les instructions françaises pas à pas (turn-by-turn), l'étape COURANTE
//    affichée en grand avec la flèche d'orientation ;
//  • le guidage automatique : la position GPS est suivie en continu, la
//    distance restante est recalculée en direct, et en cas de détour le
//    trajet est RECALCULÉ automatiquement depuis la position réelle ;
//  • l'assistant IA (GLM — modèle gratuit) : il reçoit régulièrement la
//    position, le reste du trajet et les prochaines manœuvres, puis propose
//    des conseils ; un espace de chat permet de poser des questions
//    (« Je suis perdu », « Y a-t-il un raccourci ? »…). Sans clé GLM
//    configurée côté serveur, un assistant local intelligent répond quand
//    même à partir des données du trajet (repli automatique).
//
// Tout est gratuit : OSRM + Leaflet + tuiles libres + GLM (clé gratuite).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight, CheckCircle2, Compass, LocateFixed, MapPin, Navigation,
  Play, RefreshCw, Send, Sparkles, Square, X,
} from "lucide-react";
import { api } from "@/lib/fc-client";
import {
  bearingDeg, cardinalFr, fetchRouteGuide, formatDistance, getPosition,
  haversineKm, instructionFr, progressOnRoute,
  type GuideRoute, type PointGeo,
} from "@/lib/fc-geo";
import {
  addBasemapSwitcher, addQuartierLabels, escapeHtml, loadLeaflet, pinIcon,
  type CircleLike, type LMapLike, type LeafletLike, type PolylineLike,
} from "@/lib/fc-leaflet";
import { FcSpinner } from "./ui";
import type { DestCarte } from "./fc-route-map";

type MsgChat = { de: "moi" | "ia"; texte: string; iaReel?: boolean };

const QUESTIONS_RAPIDES = [
  "Je suis perdu(e), que dois-je faire ?",
  "Y a-t-il un raccourci vers le rendez-vous ?",
  "Rappelle-moi la prochaine direction",
  "Décris-moi l'endroit du rendez-vous",
];

/** Les n prochaines manœuvres à partir de l'étape idx. */
function prochainesEtapes(route: GuideRoute, idx: number, n: number): string[] {
  const debut = Math.min(Math.max(idx, 0), route.steps.length - 1);
  return route.steps.slice(debut, debut + n).map(instructionFr);
}

export function FcGuideMap({ dest, onFermer }: { dest: DestCarte; onFermer: () => void }) {
  /* ── états ── */
  const [etat, setEtat] = useState<"chargement" | "prete" | "erreur">("chargement");
  const [route, setRoute] = useState<GuideRoute | null>(null);
  const [pos, setPos] = useState<PointGeo | null>(null);
  const [suivi, setSuivi] = useState(false);
  const [restant, setRestant] = useState<{ km: number; minutes: number; etapeIdx: number } | null>(null);
  const [arrive, setArrive] = useState(false);
  const [horsTrajet, setHorsTrajet] = useState(false);
  const [chat, setChat] = useState<MsgChat[]>([
    {
      de: "ia",
      texte: `Bonjour ! Je vous guide jusqu'à chez ${dest.nom}${dest.quartier ? ` (quartier ${dest.quartier})` : ""}. Lancez le guidage automatique : je suivrai votre position et vous dirai où tourner. Posez-moi aussi vos questions ici.`,
    },
  ]);
  const [question, setQuestion] = useState("");
  const [envoi, setEnvoi] = useState(false);

  /* ── références (carte + guidage, hors rendu) ── */
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<LMapLike | null>(null);
  const LObj = useRef<LeafletLike | null>(null);
  const ligneRoute = useRef<PolylineLike | null>(null);
  const dotMoi = useRef<CircleLike | null>(null);
  const watchId = useRef<number | null>(null);
  const recalcRef = useRef(false);
  const dernierCentre = useRef<PointGeo | null>(null);
  const routeRef = useRef<GuideRoute | null>(null);
  const envoiRef = useRef(false);
  const nettoyageQuartiers = useRef<(() => void) | null>(null);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  /* ── Échap + verrouille le défilement derrière la fenêtre ── */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onFermer]);

  /* ── Initialisation : position → trajet → carte ── */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 1. Point de départ : GPS en priorité (course contre 7,5 s — si la
      //    permission reste en attente, on repart de la position enregistrée
      //    dans l'annuaire famille pour ne JAMAIS bloquer le guidage),
      //    sinon annuaire famille.
      let origine: PointGeo | null = null;
      try {
        const p = await Promise.race([
          getPosition().catch(() => null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 7500)),
        ]);
        if (p) origine = { latitude: p.coords.latitude, longitude: p.coords.longitude };
      } catch {
        /* GPS refusé/indisponible → annuaire */
      }
      if (!origine) {
        try {
          const res = await api<{ ok: boolean; members?: { isMe: boolean; latitude: number; longitude: number }[] }>(
            "/api/family/locations"
          );
          const me = res.members?.find((m) => m.isMe);
          if (me) origine = { latitude: me.latitude, longitude: me.longitude };
        } catch {
          /* hors connexion */
        }
      }
      if (cancelled) return;
      if (!origine) {
        setEtat("erreur");
        return;
      }
      setPos(origine);
      dernierCentre.current = origine;

      // 2. Trajet routier détaillé (étapes) — repli : null → ligne droite
      const r = await fetchRouteGuide(origine, dest);
      if (cancelled) return;
      setRoute(r);

      // 3. Carte Leaflet interne
      try {
        const L = await loadLeaflet();
        if (cancelled || !mapRef.current) return;
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: false,
        });
        mapObj.current = map;
        LObj.current = L;
        addBasemapSwitcher(L, map, "hot");
        nettoyageQuartiers.current = addQuartierLabels(L, map);

        // Pin destination — étiquette permanente (nos données)
        const etiquette = [`Chez ${dest.nom}`, dest.quartier ? `Quartier ${dest.quartier}` : dest.arrondissement]
          .filter(Boolean)
          .join(" · ");
        const mk = L.marker([dest.latitude, dest.longitude], { icon: pinIcon(L, "other") }).addTo(map);
        mk.bindTooltip(escapeHtml(etiquette), {
          permanent: true,
          direction: "top",
          offset: [0, -40],
          className: "fc-pin-label",
        });

        // Position actuelle — point vert mobile
        dotMoi.current = L.circleMarker([origine.latitude, origine.longitude], {
          radius: 8,
          color: "#FFFDF6",
          weight: 3,
          fillColor: "#2F6B45",
          fillOpacity: 1,
        }).addTo(map);

        // Trajet initial
        if (r) {
          ligneRoute.current = L.polyline(r.points, { color: "#1E4D2B", weight: 5, opacity: 0.85 }).addTo(map);
        } else {
          ligneRoute.current = L.polyline(
            [[origine.latitude, origine.longitude], [dest.latitude, dest.longitude]],
            { color: "#C89F62", weight: 2.5, dashArray: "6 8", opacity: 0.8 }
          ).addTo(map);
        }

        map.fitBounds(
          [
            [origine.latitude, origine.longitude],
            [dest.latitude, dest.longitude],
          ],
          { padding: [42, 42], maxZoom: 16 }
        );
        if (!cancelled) setEtat("prete");
      } catch {
        if (!cancelled) setEtat("erreur");
      }
    })();

    return () => {
      cancelled = true;
      if (watchId.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      if (nettoyageQuartiers.current) {
        nettoyageQuartiers.current();
        nettoyageQuartiers.current = null;
      }
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
      ligneRoute.current = null;
      dotMoi.current = null;
    };
  }, [dest.latitude, dest.longitude, dest.nom, dest.quartier, dest.arrondissement]);

  /* ── Suivi de position : distance restante, étape courante, recalcul ── */
  useEffect(() => {
    if (!pos || !route) return;
    const prog = progressOnRoute(route, pos);
    const ratioKm = Math.max(route.distanceKm, 0.1);
    setRestant({
      km: prog.restantKm,
      minutes: Math.max(1, Math.round((prog.restantKm / ratioKm) * route.minutes)),
      etapeIdx: prog.etapeIdx,
    });
    setArrive(prog.restantKm < 0.05 && prog.ecartKm < 0.15);
    setHorsTrajet(prog.ecartKm > 0.08);

    // Détour détecté → recalcul automatique du trajet depuis la position réelle
    if (prog.ecartKm > 0.08 && !recalcRef.current) {
      recalcRef.current = true;
      void (async () => {
        const r2 = await fetchRouteGuide(pos, dest);
        if (r2) setRoute(r2);
        recalcRef.current = false;
      })();
    }

    // Recentrage doux pendant le guidage (si on a bougé de > 25 m)
    const m = mapObj.current;
    if (m && suivi) {
      dotMoi.current?.setLatLng([pos.latitude, pos.longitude]);
      const dernier = dernierCentre.current;
      if (!dernier || haversineKm(dernier, pos) > 0.025) {
        dernierCentre.current = pos;
        m.setView([pos.latitude, pos.longitude], Math.max(m.getZoom(), 16));
      }
    }
  }, [pos, route, suivi, dest]);

  /* ── Déplacement du point vert même sans recalcul de trajet ── */
  useEffect(() => {
    if (pos && dotMoi.current && !suivi) dotMoi.current.setLatLng([pos.latitude, pos.longitude]);
  }, [pos, suivi]);

  /* ── Redessine la polyligne quand le trajet change (recalcul) ── */
  useEffect(() => {
    const L = LObj.current;
    const m = mapObj.current;
    if (!L || !m || !route) return;
    if (ligneRoute.current) {
      ligneRoute.current.remove();
      ligneRoute.current = null;
    }
    ligneRoute.current = L.polyline(route.points, { color: "#1E4D2B", weight: 5, opacity: 0.85 }).addTo(m);
    if (pos) {
      m.fitBounds(
        [
          [pos.latitude, pos.longitude],
          [dest.latitude, dest.longitude],
        ],
        { padding: [42, 42], maxZoom: 16 }
      );
    }
  }, [route]);

  /* ── Guidage automatique — watchPosition ── */
  const arreterSuivi = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setSuivi(false);
  }, []);

  const demarrerSuivi = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Le GPS n'est pas disponible sur cet appareil — suivez les étapes affichées.");
      return;
    }
    setSuivi(true);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      },
      () => {
        /* positions imprécises intermittentes — on garde la dernière */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    toast.success("Guidage automatique activé — votre position est suivie en direct.");
  }, []);

  /* ── Assistant IA (GLM) — conseils réguliers + chat ── */
  const poserIA = useCallback(
    async (q: string | null) => {
      if (envoiRef.current) return;
      envoiRef.current = true;
      setEnvoi(true);
      if (q) setChat((c) => [...c, { de: "moi", texte: q }]);
      try {
        const r = routeRef.current;
        const etapeIdx = restant?.etapeIdx ?? 0;
        const res = await api<{ ok: boolean; reply?: string; ai?: boolean }>("/api/ai/guide", {
          body: {
            mode: q ? "question" : "conseil",
            question: q,
            destination: { nom: dest.nom, quartier: dest.quartier, arrondissement: dest.arrondissement, latitude: dest.latitude, longitude: dest.longitude },
            position: pos,
            trajet: r ? { km: Math.round(r.distanceKm * 10) / 10, minutes: r.minutes, etapes: prochainesEtapes(r, etapeIdx, 5) } : null,
            restant: restant ? { km: Math.round(restant.km * 10) / 10, minutes: restant.minutes } : null,
            horsTrajet,
            suivi,
          },
        });
        const texte =
          res.ok && res.reply
            ? res.reply
            : "Assistant momentanément indisponible — suivez les étapes affichées, elles suffisent pour arriver à bon port.";
        setChat((c) => [...c, { de: "ia", texte, iaReel: !!res.ai }]);
      } catch {
        setChat((c) => [
          ...c,
          { de: "ia", texte: "Connexion limitée — gardez les étapes affichées à l'écran, elles fonctionnent même sans réseau." },
        ]);
      } finally {
        envoiRef.current = false;
        setEnvoi(false);
      }
    },
    [dest, pos, restant, horsTrajet, suivi]
  );

  // Conseils réguliers pendant le guidage (toutes les 45 s, sans que
  // l'utilisateur ait à demander — discret, en fil de l'assistant)
  useEffect(() => {
    if (!suivi) return;
    const id = setInterval(() => {
      void poserIA(null);
    }, 45000);
    return () => clearInterval(id);
  }, [suivi, poserIA]);

  // Alerte immédiate quand on sort du trajet
  useEffect(() => {
    if (horsTrajet && suivi) void poserIA(null);
  }, [horsTrajet, suivi]);

  const envoyerQuestion = () => {
    const q = question.trim();
    if (!q || envoi) return;
    setQuestion("");
    void poserIA(q);
  };

  /* ── dérivés ── */
  const oiseauKm = pos ? haversineKm(pos, dest) : null;
  const etapeCourante = route && route.steps.length > 0 ? route.steps[Math.min(restant?.etapeIdx ?? 0, route.steps.length - 1)] : null;
  const capVersEtape = pos && etapeCourante ? bearingDeg(pos, { latitude: etapeCourante.location[0], longitude: etapeCourante.location[1] }) : null;
  const capArrivee = pos ? bearingDeg(pos, dest) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B2416]/55 p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Guidage assisté par IA jusqu'à chez ${dest.nom}`}
      onClick={onFermer}
    >
      <div
        className="fc-fade-up max-h-[93vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-[0_24px_70px_rgba(43,53,48,0.45)]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 bg-[#1E4D2B] px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/12">
                <Navigation className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide opacity-80">Guidage assisté par IA — dans l&apos;application</p>
                <p className="fc-serif mt-0.5 truncate text-[16px] font-bold">S&apos;y rendre chez {dest.nom}</p>
                <p className="mt-0.5 text-[11.5px] opacity-85">
                  {[dest.quartier, dest.arrondissement, dest.city].filter(Boolean).join(", ") || "Position GPS enregistrée"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer le guidage"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3.5 px-4 py-4">
          {etat === "chargement" && (
            <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#8A9288]" role="status">
              <FcSpinner className="h-4 w-4 text-[#C89F62]" /> Calcul de votre position et du trajet…
            </div>
          )}

          {etat === "erreur" && (
            <p className="rounded-2xl border border-[#B85C33]/30 bg-[#B85C33]/8 px-3 py-3 text-[12.5px] leading-relaxed text-[#7A4526]">
              Impossible de calculer le trajet : position indisponible (GPS refusé ou hors connexion).
              Activez le GPS ou enregistrez votre position dans l&apos;onglet Famille, puis réessayez.
            </p>
          )}

          {etat === "prete" && (
            <>
              {/* ── Cartes de synthèse ── */}
              <div className="grid grid-cols-3 divide-x divide-[#E5DCC0] rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] text-center">
                <div className="px-1.5 py-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Trajet routier</p>
                  <p className="text-[13px] font-bold text-[#1E4D2B]">
                    {route ? `${formatDistance(route.distanceKm)} · ~${route.minutes} min` : "—"}
                  </p>
                </div>
                <div className="px-1.5 py-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">À vol d&apos;oiseau</p>
                  <p className="text-[13px] font-bold text-[#2F6B45]">{oiseauKm !== null ? formatDistance(oiseauKm) : "—"}</p>
                </div>
                <div className="px-1.5 py-2.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Cap</p>
                  <p className="text-[13px] font-bold text-[#B85C33]">{capArrivee !== null ? cardinalFr(capArrivee) : "—"}</p>
                </div>
              </div>

              {/* ── Prochaine direction (grand) ── */}
              {arrive ? (
                <div className="flex items-center gap-2.5 rounded-2xl bg-[#2F6B45] p-4 text-white shadow-md">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="text-[15px] font-bold">Vous êtes arrivé 🎉</p>
                    <p className="text-[12px] opacity-90">
                      Dites bonjour de la part de la famille — tout s&apos;est passé dans l&apos;application.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#1E4D2B] p-4 text-white shadow-md">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12">
                      {capVersEtape !== null ? (
                        <Navigation className="h-5 w-5 transition-transform duration-500" style={{ transform: `rotate(${capVersEtape}deg)` }} aria-hidden />
                      ) : (
                        <Compass className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold uppercase tracking-wide opacity-75">
                        {suivi ? "Prochaine direction — position suivie en direct" : "Prochaine direction"}
                      </p>
                      <p className="mt-0.5 text-[14.5px] font-bold leading-snug">
                        {etapeCourante ? instructionFr(etapeCourante) : route ? "Suivez le trajet vert — vous êtes en route." : "Trajet routier indisponible — suivez la ligne droite et appelez le bénéficiaire si besoin."}
                      </p>
                      {restant && (
                        <p className="mt-1 text-[12px] opacity-90">
                          Reste {formatDistance(restant.km)} · ~{restant.minutes} min
                          {horsTrajet && <span className="ml-1 font-bold text-[#F5D9A8]">— hors trajet : recalcul…</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Guidage automatique ── */}
              {!suivi ? (
                <FcButtonPrimary onClick={demarrerSuivi}>
                  <Play className="h-4 w-4" /> Démarrer le guidage automatique
                </FcButtonPrimary>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-[#2F6B45]/30 bg-[#2F6B45]/8 px-3 py-2.5">
                    <LocateFixed className="h-4 w-4 shrink-0 animate-pulse text-[#2F6B45]" />
                    <p className="min-w-0 flex-1 text-[12px] leading-snug text-[#1E4D2B]">
                      <strong className="font-bold">Guidage actif</strong> — l&apos;IA recalcule votre position
                      en continu et vous oriente ; si vous vous égarez, le trajet se recalcule tout seul.
                    </p>
                  </div>
                  <FcButtonOutline onClick={arreterSuivi}>
                    <Square className="h-3.5 w-3.5" /> Arrêter le guidage
                  </FcButtonOutline>
                </div>
              )}
            </>
          )}

          {/* ── Carte interne — TOUJOURS montée (Leaflet a besoin de la div dès
              l'initialisation), fond au choix + quartiers étiquetés ── */}
          {etat !== "erreur" && (
            <div className="overflow-hidden rounded-2xl border border-[#E5DCC0]">
              <div className="relative">
                <div
                  ref={mapRef}
                  style={{ height: 250 }}
                  className="w-full bg-[#E8E4D8]"
                  role="application"
                  aria-label={`Carte de guidage vers chez ${dest.nom}`}
                />
                {etat === "chargement" && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#FFFDF6]/70 text-[12.5px] text-[#8A9288]" role="status">
                    <FcSpinner className="h-4 w-4 text-[#C89F62]" /> Préparation de la carte…
                  </div>
                )}
              </div>
              <p className="flex items-center justify-between gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] px-3 py-1.5">
                <span className="flex min-w-0 items-center gap-1 text-[10.5px] leading-snug text-[#8A9288]">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">Fond de carte au choix (en haut à droite) — quartiers, plan, satellite</span>
                </span>
              </p>
            </div>
          )}

          {etat === "prete" && (
            <>
              {/* ── Boutons d'orientation rapides ── */}
              <div>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Orientation rapide</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUESTIONS_RAPIDES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={envoi}
                      onClick={() => void poserIA(q)}
                      className="min-h-[36px] rounded-full border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[11.5px] font-semibold text-[#2A4A3A] transition hover:bg-[#C89F62]/10 disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Assistant IA — GLM ── */}
              <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6]">
                <div className="flex items-center gap-2 border-b border-[#E5DCC0] px-3 py-2.5">
                  <Sparkles className="h-4 w-4 text-[#8A6420]" />
                  <p className="text-[12.5px] font-bold text-[#2B3530]">Assistant de route — IA GLM</p>
                  {envoi && <FcSpinner className="ml-auto h-3.5 w-3.5 text-[#C89F62]" />}
                </div>
                <div className="fc-scroll max-h-56 space-y-2 overflow-y-auto px-3 py-2.5" aria-live="polite">
                  {chat.map((m, i) => (
                    <div key={i} className={m.de === "moi" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                          m.de === "moi"
                            ? "rounded-br-sm border border-[#C89F62]/40 bg-[#C89F62]/10 text-[#5A4520]"
                            : "rounded-bl-sm border border-[#E5DCC0] bg-[#FBF7EA] text-[#2B3530]"
                        }`}
                      >
                        {m.texte}
                        {m.de === "ia" && m.iaReel === false && (
                          <span className="mt-1 block text-[10px] italic text-[#8A9288]">
                            (conseil calculé hors ligne — la clé IA gratuite n&apos;est pas encore ajoutée)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-[#E5DCC0] px-3 py-2.5">
                  <input
                    value={question}
                    onChange={(ev) => setQuestion(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") envoyerQuestion();
                    }}
                    placeholder="Posez votre question d'orientation…"
                    aria-label="Question à l'assistant de route"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[13px] text-[#2B3530] placeholder:font-normal placeholder:text-[#B7B0A0] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15"
                  />
                  <button
                    type="button"
                    onClick={envoyerQuestion}
                    disabled={envoi || !question.trim()}
                    aria-label="Envoyer la question"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B] text-white transition hover:bg-[#2F6B45] disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Toutes les étapes ── */}
              {route && route.steps.length > 0 && (
                <details className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-[#1E4D2B]">
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Toutes les étapes ({route.steps.length}) — turn-by-turn
                  </summary>
                  <ol className="fc-scroll mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {route.steps.map((s, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 rounded-xl px-2 py-1.5 text-[12px] leading-snug ${
                          restant?.etapeIdx === i ? "bg-[#1E4D2B]/8 font-semibold text-[#1E4D2B]" : "text-[#5C6B60]"
                        }`}
                      >
                        <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[#1E4D2B]/10 text-[9.5px] font-bold text-[#1E4D2B]">
                          {i + 1}
                        </span>
                        {instructionFr(s)}
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {/* ── Recalcul manuel ── */}
              <FcButtonOutline
                onClick={() => {
                  if (!pos) return;
                  recalcRef.current = true;
                  void (async () => {
                    const r2 = await fetchRouteGuide(pos, dest);
                    if (r2) setRoute(r2);
                    recalcRef.current = false;
                    toast.success(r2 ? "Trajet recalculé depuis votre position." : "Recalcul impossible — vérifiez la connexion.");
                  })();
                }}
              >
                <RefreshCw className="h-4 w-4" /> Recalculer depuis ma position
              </FcButtonOutline>

              <p className="text-[10.5px] leading-relaxed text-[#8A9288]">
                100 % dans l&apos;application : trajet OSRM (gratuit), fonds de carte libres (OSM/HOT, CARTO,
                Esri) et assistant GLM (modèle gratuit). Vous ne quittez jamais Famille.Mbeutetsa.
              </p>
            </>
          )}
        </div>

        {/* Pied */}
        <div className="sticky bottom-0 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
          <button
            type="button"
            onClick={onFermer}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1E4D2B] text-[13.5px] font-bold text-white transition hover:bg-[#2F6B45]"
          >
            Fermer le guidage
          </button>
        </div>
      </div>
    </div>
  );
}

/* Petit boutons locaux — même style que la fiche, sans dépendre de props */
function FcButtonPrimary({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1E4D2B] text-[13.5px] font-bold text-white transition hover:bg-[#2F6B45]"
    >
      {children}
    </button>
  );
}

function FcButtonOutline({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[13px] font-bold text-[#2A4A3A] transition hover:bg-[#C89F62]/10"
    >
      {children}
    </button>
  );
}
