"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LA SECRÉTAIRE EN TANT QUE MEMBRE — v39 : PAGES IDENTIQUES AUX MEMBRES SIMPLES
//
// Demandes de l'administrateur :
//   · « je constate que ces pages ont déjà été créées — mes cotisations, mes
//     épargnes, mes prêts. Je souhaiterais que cela ressemble EXACTEMENT à
//     celui des membres simples. »
//   · « la secrétaire peut aussi faire des épargnes, car elle est d'abord
//     membre de la tontine avant d'être membre du bureau. »
//   · « tout l'espace que le membre a relativement à la cotisation, la
//     secrétaire doit l'avoir dans cette interface… qu'elle puisse aussi être
//     informée de QUAND elle reçoit la cotisation, qu'elle puisse activer sa
//     GÉOLOCALISATION pour recevoir, qu'elle puisse savoir COMBIEN elle va
//     percevoir. »
//
// SOLUTION : les pages rendent EXACTEMENT les mêmes composants que l'Espace
// Membre (MesCotisationsTab / MesEpargnesTab / MesPretsTab, exportés de
// espace-membre.tsx) — mêmes clés de stockage, mêmes calculs, mêmes couleurs —
// + une CARTE DE RÉCEPTION personnelle en tête de « Mes cotisations ».
//
// IDENTITÉ RÉELLE : le compte connecté (app-<uid>) — aperçu démo (f06) sinon.
// Hydratation sûre : tout chargement localStorage/Date/API dans setTimeout(0).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Crown, MapPin, Navigation, Wallet } from "lucide-react";
import { api } from "@/lib/fc-client";
import { FcCard } from "./ui";
import { Block, Btn, P, OK_CLS, TE_CLS, VI_CLS, fcfa, toast } from "./maquette-ui";
import {
  MOIS_FR, TONTINE, loadEpargnes, loadMontants, loadPrets, moisDuTour, secondSunday,
  type RoleKey,
} from "./tontine-data";
import { loadPostes } from "./postes-bureau";
import { loadReglement } from "./reglement";
import { chargerCompteConnecte, chargerRosterReel } from "./membres-app";
import { futursMembres } from "./premembres";
import { loadVousRole } from "./tontine-bureau";
import { loadDecisions as loadDecisionsTaux } from "./tontine-bureau";
import { loadAmendes, loadConvocations, loadNotifs, moisKeyOf } from "./secretaire-bureau";
import {
  MesCotisationsTab, MesEpargnesTab, MesPretsTab, type CtxMembre, type MouvementCotisMois,
} from "./espace-membre";
import { loadTypesCotisation, typeDuMembre, type TypeCotisation } from "./cotisations-types";
import { loadCollations, collationDuMembre, type Collation } from "./collations";

/* — même clé que la gestion du secrétariat et l'Espace Membre — */
const CLE_COTIS_MOIS = "fc_secretaire_cotis_mois_v1";

function chargerCotisMois(): Record<string, MouvementCotisMois> {
  if (typeof window === "undefined") return {};
  try {
    const brut = window.localStorage.getItem(CLE_COTIS_MOIS);
    const v = brut ? (JSON.parse(brut) as Record<string, MouvementCotisMois>) : null;
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/* ═══════════════════ le contexte « membre » de la secrétaire ═══════════════════ */

/** Construit EXACTEMENT le même contexte que l'Espace Membre — même annuaire
 *  réel (compte connecté + membres de l'application + futurs membres), même
 *  règlement, même clé de cotisations du mois. */
function useCtxSec(moisIdx: number | null): CtxMembre | null {
  const [ctx, setCtx] = useState<CtxMembre | null>(null);
  useEffect(() => {
    const t0 = setTimeout(() => {
      loadMontants();
      const d = new Date();
      const annee = d.getFullYear();
      const m0 = moisIdx ?? d.getMonth();
      const moiMembre = chargerCompteConnecte();
      const roster = [...chargerRosterReel(), ...futursMembres()];
      const moi = moiMembre
        ? {
            id: moiMembre.id,
            nom: moiMembre.name,
            phone: moiMembre.phone,
            city: moiMembre.city,
            tour: moiMembre.tour,
            role: (loadVousRole() ?? moiMembre.role) as RoleKey,
            connecte: true,
          }
        : {
            id: "f06",
            nom: "Françoise Mbeutetsa",
            phone: "+33 6 42 51 88 07",
            city: "Paris (diaspora)",
            tour: 6,
            role: "secretariat" as RoleKey,
            connecte: false,
          };
      setCtx({
        moi,
        roster,
        postes: loadPostes(),
        regl: loadReglement(),
        annee,
        moisCourantIdx: m0,
        moisKey: moisKeyOf(annee, m0),
        cotisMois: chargerCotisMois(),
        majCotisMois: (next) => setCtx((c) => (c ? { ...c, cotisMois: next } : c)),
        amendes: loadAmendes(),
        convos: loadConvocations(),
        majConvo: () => undefined,
        notifs: loadNotifs(),
        majNotifs: () => undefined,
        epargnesWorkflow: loadEpargnes(),
        majEpargnesWorkflow: () => undefined,
        decisionsTaux: loadDecisionsTaux(),
        majDecisionsTaux: () => undefined,
        tick: 0,
      });
    }, 0);
    return () => clearTimeout(t0);
  }, [moisIdx]);
  return ctx;
}

/* ═══════════════════ carte de RÉCEPTION de la secrétaire ═══════════════════ */

type PositionFamille = {
  id: string; fullName: string; isMe: boolean;
  city: string | null; latitude: number; longitude: number;
};

/** « quand est-ce que je reçois la cotisation, combien je vais percevoir, et
 *  ma géolocalisation pour recevoir » — la secrétaire, comme chaque membre. */
function CarteReception({ ctx }: { ctx: CtxMembre | null }) {
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  const [collations, setCollations] = useState<Collation[]>([]);
  const [positions, setPositions] = useState<PositionFamille[]>([]);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTypesCotis(loadTypesCotisation());
      setCollations(loadCollations());
      api<{ ok: boolean; members?: PositionFamille[] }>("/api/family/locations")
        .then((res) => setPositions(res.members ?? []))
        .catch(() => { /* hors connexion — la carte reste lisible */ });
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  const moi = ctx?.moi ?? null;
  const roster = ctx?.roster ?? [];
  const maPos = positions.find((x) => x.isMe);

  const tauxDe = (id: string) => typeDuMembre(id, typesCotis)?.montant ?? TONTINE.montantCotisation;
  /* le pot que je recevais/que je recevrai à MON tour : chaque membre cotise
   * le MINIMUM de son taux et du mien (règle du bénéficiaire) + les collations */
  const monPot = moi ? roster.reduce((s, m) => s + Math.min(tauxDe(m.id), tauxDe(moi.id)), 0) : 0;
  const mesCollations = moi
    ? roster.reduce((s, m) => s + collationDuMembre(m.id, collations), 0)
    : 0;
  const moisReception = moi ? moisDuTour(moi.tour) : "—";
  const annee = ctx?.annee ?? new Date().getFullYear();
  const jourReception = moi ? secondSunday(annee, Math.max(0, Math.min(11, moi.tour - 1))) : 0;

  const activerGeoloc = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Géolocalisation indisponible", { description: "Votre navigateur ne propose pas le GPS — ajoutez votre ville depuis Mon profil." });
      return;
    }
    setEnCours(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api("/api/me/location", {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: "gps" },
          });
          toast.success("Votre position est enregistrée", { description: "Le trajet jusqu'à vos réceptions et votre guidage GPS sont désormais disponibles." });
          const res = await api<{ ok: boolean; members?: PositionFamille[] }>("/api/family/locations");
          setPositions(res.members ?? []);
        } catch {
          toast.error("Enregistrement impossible", { description: "Vérifiez votre connexion puis réessayez." });
        }
        setEnCours(false);
      },
      () => {
        setEnCours(false);
        toast.error("Position refusée", { description: "Autorisez la localisation dans votre navigateur, ou indiquez votre ville depuis Mon profil." });
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  /* — v40 — MODIFIER sa géolocalisation : un déménagement, une position GPS
   *  imprécise ou un changement de quartier — la personne peut RE-ENREGISTRER
   *  sa position à tout moment : le nouveau point remplace l'ancien. — */
  const modifierGeoloc = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Géolocalisation indisponible", { description: "Votre navigateur ne propose pas le GPS — ajoutez votre ville depuis Mon profil." });
      return;
    }
    setEnCours(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api("/api/me/location", {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: "gps" },
          });
          toast.success("Votre position a été MODIFIÉE", { description: "Le nouveau point remplace l'ancien — trajets et guidage GPS recalculés." });
          const res = await api<{ ok: boolean; members?: PositionFamille[] }>("/api/family/locations");
          setPositions(res.members ?? []);
        } catch {
          toast.error("Modification impossible", { description: "Vérifiez votre connexion puis réessayez." });
        }
        setEnCours(false);
      },
      () => {
        setEnCours(false);
        toast.error("Position refusée", { description: "Autorisez la localisation dans votre navigateur pour modifier votre position." });
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  if (!moi) {
    return (
      <FcCard className="p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma réception de la cotisation</p>
        <p className="mt-1 text-[12px] font-semibold text-[#8A9288]">Chargement de votre espace…</p>
      </FcCard>
    );
  }

  return (
    <FcCard className="p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C89F62]/15 text-[#8A6420]"><Crown className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma réception de la cotisation — mon tour n°{moi.tour}</p>
          <p className="fc-serif text-[16px] font-bold text-[#2B3530]">Je reçois le pot en {moisReception} — le {jourReception} {MOIS_FR[Math.max(0, Math.min(11, moi.tour - 1))]}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
            À mon tour, chaque membre cotise le minimum de son taux et du mien — la réunion se tient chez moi.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">Montant que je vais percevoir</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[18px] font-black text-[#1E4D2B]"><Wallet className="h-4 w-4" /> {fcfa(monPot + mesCollations)}</p>
          <p className="mt-0.5 text-[10.5px] text-[#8A9288]">cotisations {fcfa(monPot)} · collations {fcfa(mesCollations)} — selon les taux du bureau</p>
        </div>
        <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">Ma géolocalisation pour recevoir</p>
          {maPos ? (
            <>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-black text-[#2F6B45]"><CheckCircle2 className="h-4 w-4" /> Position enregistrée{maPos.city ? ` — ${maPos.city}` : ""}</p>
              <Btn small tone="teal" disabled={enCours} onClick={modifierGeoloc} className="mt-1.5">
                <Navigation className="h-3.5 w-3.5" /> {enCours ? "Modification…" : "Modifier ma géolocalisation"}
              </Btn>
            </>
          ) : (
            <>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-bold text-[#8A6420]"><MapPin className="h-4 w-4" /> Position non enregistrée</p>
              <Btn small tone="teal" disabled={enCours} onClick={activerGeoloc} className="mt-1.5">
                <Navigation className="h-3.5 w-3.5" /> {enCours ? "Activation…" : "Activer ma géolocalisation"}
              </Btn>
            </>
          )}
        </div>
      </div>
    </FcCard>
  );
}

/* ═══════════════════ les trois pages du poste ═══════════════════ */

/** « Mes cotisations » — EXACTEMENT l'onglet membre (type de cotisation,
 *  cotisation du mois qui suit le bénéficiaire, collation, calendrier avec
 *  trajet GPS) + la carte de réception personnelle au-dessus. */
export function SecMesCotisations(p: { moisIdx: number | null; moisLabel: string | null }): ReactNode {
  const ctx = useCtxSec(p.moisIdx);
  return (
    <>
      <CarteReception ctx={ctx} />
      {ctx ? <MesCotisationsTab ctx={ctx} /> : (
        <Block title="Mes cotisations" icon={<Wallet className="h-4.5 w-4.5" />} accent="#3D6B72"
          note="Chargement de votre espace membre…">
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Un instant…</p>
        </Block>
      )}
    </>
  );
}

/** « Mes épargnes » — EXACTEMENT l'onglet membre : registre partagé
 *  fc_epargnes_reunion_v1 (même source que le bureau), intérêts mois par mois. */
export function SecMesEpargnes(p: { moisCourantIdx: number | null; regl: unknown }): ReactNode {
  const ctx = useCtxSec(p.moisCourantIdx);
  if (!ctx) {
    return (
      <Block title="Mes épargnes" icon={<Crown className="h-4.5 w-4.5" />} accent="#8A6420"
        note="Chargement de votre espace membre…">
        <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Un instant…</p>
      </Block>
    );
  }
  return <MesEpargnesTab ctx={ctx} />;
}

/** « Mes prêts » — EXACTEMENT l'onglet membre : demande de prêt à la caisse,
 *  prêts faits à la réunion, dettes — mêmes dossiers que le secrétariat. */
export function SecMesPrets(p: { moisCourantIdx: number | null; regl: unknown; roster: { id: string; name: string }[] }): ReactNode {
  const ctx = useCtxSec(p.moisCourantIdx);
  if (!ctx) {
    return (
      <Block title="Mes prêts" icon={<Crown className="h-4.5 w-4.5" />} accent="#8A6420"
        note="Chargement de votre espace membre…">
        <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Un instant…</p>
      </Block>
    );
  }
  return <MesPretsTab ctx={ctx} />;
}
