"use client";

// ─────────────────────────────────────────────────────────────────────────────
// GESTION FINANCIÈRE DU SECRÉTARIAT — Famille.Mbeutetsa (v19, accent violet)
//
// Demande du président : les QUATRE sections de gestion financière de sa
// console (Cotisations & collations, Épargnes, Prêts & garanties, Solidarité)
// sont AUSSI attribuées à la SECRÉTAIRE — qui agit POUR LE BUREAU. Ce fichier
// exporte 4 composants de section self-contained, sans toucher au fichier du
// président (qui garde ses propres copies) :
//   · SecCotisationsCollations — encaissement membre par membre pour le
//     trésorier + paramétrage (montant de base, collation, types de
//     cotisations, collations) ;
//   · SecEpargnes — registre des épargnes de la réunion + paramétrage épargne ;
//   · SecPrets — registre des prêts faits à la réunion, dossiers des membres,
//     avances & remboursements + paramétrage prêts ;
//   · SecSolidarite — votes du bureau, décaissement, types de solidarité,
//     mains levées, calendrier des visites.
//
// ⚠ MÊMES SOURCES que la console du président — les consoles montrent LA MÊME
// RÉALITÉ :
//   · fc_epargnes_reunion_v1 et fc_prets_reunion_v1 — UNIQUEMENT via
//     registres-bureau.ts (loadEpargnesReunion/saveEpargnesReunion/
//     loadPretsReunion/savePretsReunion). Le REGISTRE des épargnes et des
//     prêts reste LA MÊME SOURCE que la console du président ;
//   · fc_cotis_types_v1 (cotisations-types.ts), fc_collations_v1
//     (collations.ts), fc_solidarite_types_v1 / fc_mains_levees_v1 /
//     fc_visites_solidarite_v1 (solidarite-bureau.ts), montants via
//     loadMontants/saveMontants, règlement via saveReglement.
//
// NOUVELLES CLÉS (états du président qui n'étaient PAS persistés — mêmes
// seeds de démonstration copiés) :
//   · fc_secretaire_cotis_mois_v1 — cotisations & collations du mois ;
//   · fc_prets_demandes_v1 — dossiers de prêt des membres ;
//   · fc_solidarite_evs_v1 — évènements de solidarité (votes) ;
//   · fc_solidarite_caisse_v1 — caisse de secours.
// Load = seed si absent ; CHAQUE mutation écrit IMMÉDIATEMENT (auto-persistance,
// l'état survit au rechargement).
//
// HYDRATATION SÛRE : aucun localStorage ni Date pendant le premier rendu —
// tout est chargé dans un setTimeout(0) au montage ; tout ce qui dépend de la
// date arrive en prop (moisIdx, moisCourantIdx). Aucune écriture de
// window.location.hash. Aucune importation depuis maquette-president.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  BadgeCheck, Ban, CalendarCheck, CalendarClock, Check, CheckCircle2, CheckSquare,
  ChevronDown, ChevronUp, Coffee, Coins, Eye, Hand, HandCoins, HandHeart,
  HeartHandshake, Hourglass, Landmark, Layers, ListChecks, Percent, PiggyBank, Plus,
  ReceiptText, RotateCcw, Scale, Search, Send, ShieldCheck, Sparkles, Square, Tag,
  ThumbsDown, ThumbsUp, Trash2, TrendingUp, Undo2, UserCheck, UserPlus, Users, Vote,
  Wallet, XCircle,
} from "lucide-react";
import { FcCard } from "./ui";
import {
  Block, Btn, KpiCard, P, fmt, fcfa, nid,
  OK_CLS, OR_CLS, RJ_CLS, TE_CLS, VI_CLS,
} from "./maquette-ui";
import {
  MEMBRES_FICTIFS, MOIS_FR, ROLE_META, TAUX_DEFAUT, TONTINE,
  loadMontants, saveMontants,
  type Member, type ReglagesTontine,
} from "./tontine-data";
import { estMembreApp } from "./membres-app";
import {
  COLLECTE_INTERETS_LABELS, COLLECTE_INTERETS_NOTES, GARANTIES_LABELS,
  INTERETS_EPARGNE_LABELS, METHODES_SOLIDARITE, TYPES_EPARGNE_CATALOGUE,
  loadReglement, saveReglement,
  type Reglement, type TypeEpargneConfig,
} from "./reglement";
import {
  evolutionPretReunion, interetsAttribution,
  loadEpargnesReunion, loadPretsReunion, saveEpargnesReunion, savePretsReunion,
  type AttributionReunion, type RemboursementPret,
} from "./registres-bureau";
import {
  loadTypesCotisation, nouveauTypeCotisation, saveTypesCotisation, typeDuMembre,
  type TypeCotisation,
} from "./cotisations-types";
import {
  loadCollations, nouvelleCollation, saveCollations, collationDuMembre,
  type Collation,
} from "./collations";
import {
  loadMainsLevees, loadTypesSolidarite, loadVisitesSolidarite,
  saveMainsLevees, saveTypesSolidarite, saveVisitesSolidarite,
  type MainLevee, type TypeSolidarite, type VariableSolidarite, type VisiteSolidarite,
} from "./solidarite-bureau";

/* ══════════════════════════ types copiés du président ══════════════════════════ */

type MouvementCotisMois = { cotisation: boolean; collation: boolean };

type VoteBureau = { vice: boolean | null; secretariat: boolean | null; tresorier: boolean | null; censeur: boolean | null };

type EvVie = {
  id: string; membreId: string; type: "deuil" | "mariage" | "naissance" | "maladie"; label: string;
  statut: "signale" | "en_vote" | "approuve" | "decaisse"; montant: number | null; votes: VoteBureau;
};

type PretDemande = {
  id: string; membreId: string; montant: number; motif: string; garanties: string;
  avalisteId: string | null; cosignTresorier: boolean; statut: "en_attente" | "accorde" | "refuse"; motifRefus: string;
  /** Dossier du président lui-même : récusation — le bureau statue sans sa voix. */
  president?: boolean;
  votesBureau?: { vice: boolean | null; tresorier: boolean | null; censeur: boolean | null };
  /** Mois (0-11) auquel le prêt est rattaché — base du calendrier de remboursement. */
  moisIdx?: number;
};

const TYPE_EV: Record<EvVie["type"], { label: string; cls: string }> = {
  deuil: { label: "Deuil", cls: RJ_CLS },
  mariage: { label: "Mariage", cls: OR_CLS },
  naissance: { label: "Naissance", cls: OK_CLS },
  maladie: { label: "Maladie / hospitalisation", cls: TE_CLS },
};

/** Voteurs du bureau quand le président est partie prenante (récusation). */
const VOTEURS_PRET: { qui: "vice" | "tresorier" | "censeur"; nom: string; role: string }[] = [
  { qui: "vice", nom: "Marie-Louise Nguetsop", role: "Vice-présidente" },
  { qui: "tresorier", nom: "Émile Tchoumi", role: "Trésorier" },
  { qui: "censeur", nom: "Roger Ndoumbe", role: "Censeur" },
];

/** Taux d'ÉPARGNE en vigueur : si le bureau a fixé son propre taux (tauxFixe —
 *  même à 0, c'est une décision), c'est lui qui s'applique ; sinon le défaut de
 *  la maison (TAUX_DEFAUT = 3 %/mois) reste en vigueur. Copie du président. */
const tauxEpargneVigueur = (r: Reglement) => (r.epargne.tauxFixe ? r.epargne.tauxMensuel : TAUX_DEFAUT);

/* ══════════════════════════ NOUVEAUX STORES (états du président non persistés) ══════════════════════════ *
 * Mêmes seeds de démonstration que le président, copiés tels quels :
 * load = seed si absent, chaque mutation écrit aussitôt.                    */

const CLE_COTIS_MOIS = "fc_secretaire_cotis_mois_v1";
const CLE_PRETS_DEMANDES = "fc_prets_demandes_v1";
const CLE_EVS = "fc_solidarite_evs_v1";
const CLE_CAISSE = "fc_solidarite_caisse_v1";
const CAISSE_SECOURS_DEMO = 45_000;

/** COTISATIONS & COLLATIONS DU MOIS, membre par membre — SEED (copie du
 *  président) : 7 cotisations et 5 collations déjà encaissées par le trésorier
 *  (le président n'a pas encore cotisé — cohérent avec son bandeau). */
const initCotisMoisSeed = (): Record<string, MouvementCotisMois> => {
  const seed: Record<string, MouvementCotisMois> = {};
  MEMBRES_FICTIFS.forEach((m) => { seed[m.id] = { cotisation: false, collation: false }; });
  ["f02", "f03", "f04", "f05", "f06", "f07", "f08"].forEach((id) => { if (seed[id]) seed[id].cotisation = true; });
  ["f02", "f03", "f04", "f05", "f06"].forEach((id) => { if (seed[id]) seed[id].collation = true; });
  return seed;
};

/** Dossiers de prêt des membres — SEED (copie du président). */
const PRETS_DEMANDES_DEMO: PretDemande[] = [
  { id: "p1", membreId: "f08", montant: 150_000, motif: "Rentrée scolaire des enfants", garanties: "Fond de commerce au marché B", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
  { id: "p2", membreId: "f07", montant: 80_000, motif: "Soins médicaux de sa mère", garanties: "Rémunération mensuelle déclarée", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
];

/** Évènements de solidarité — SEED (copie du président). */
const EVS_DEMO: EvVie[] = [
  { id: "e1", membreId: "f08", type: "deuil", label: "Décès de la grand-mère de Chantal Djuidje (Bafoussam)", statut: "signale", montant: null, votes: { vice: null, secretariat: null, tresorier: null, censeur: null } },
];

function ecrireSec(cle: string, valeur: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

function lireListeSec<T>(cle: string, demo: T[], valide: (x: unknown) => x is T): T[] {
  const copieDemo = () => JSON.parse(JSON.stringify(demo)) as T[];
  if (typeof window === "undefined") return copieDemo();
  try {
    const raw = window.localStorage.getItem(cle);
    if (!raw) return copieDemo();
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return copieDemo();
    const liste = data.filter(valide);
    return liste.length > 0 ? liste : copieDemo();
  } catch {
    return copieDemo();
  }
}

const estMouvement = (x: unknown): x is MouvementCotisMois =>
  typeof x === "object" && x !== null &&
  typeof (x as MouvementCotisMois).cotisation === "boolean" &&
  typeof (x as MouvementCotisMois).collation === "boolean";

const estEvVie = (x: unknown): x is EvVie =>
  typeof x === "object" && x !== null &&
  typeof (x as EvVie).id === "string" && typeof (x as EvVie).membreId === "string" &&
  typeof (x as EvVie).statut === "string";

const estPretDemande = (x: unknown): x is PretDemande =>
  typeof x === "object" && x !== null &&
  typeof (x as PretDemande).id === "string" && typeof (x as PretDemande).membreId === "string" &&
  typeof (x as PretDemande).statut === "string";

/** Lit les cotisations & collations du mois (sinon le seed du président). */
function loadCotisMoisSec(): Record<string, MouvementCotisMois> {
  if (typeof window === "undefined") return initCotisMoisSeed();
  try {
    const raw = window.localStorage.getItem(CLE_COTIS_MOIS);
    if (!raw) return initCotisMoisSeed();
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return initCotisMoisSeed();
    const out: Record<string, MouvementCotisMois> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) if (estMouvement(v)) out[k] = v;
    return Object.keys(out).length > 0 ? out : initCotisMoisSeed();
  } catch {
    return initCotisMoisSeed();
  }
}

/** Lit les évènements de solidarité (sinon le seed du président). */
function loadEvsSec(): EvVie[] {
  return lireListeSec(CLE_EVS, EVS_DEMO, estEvVie);
}

/** Lit les dossiers de prêt des membres (sinon le seed du président). */
function loadPretsDemandesSec(): PretDemande[] {
  return lireListeSec(CLE_PRETS_DEMANDES, PRETS_DEMANDES_DEMO, estPretDemande);
}

/** Lit la caisse de secours (sinon la démo du président : 45 000). */
function loadCaisseSecoursSec(): number {
  if (typeof window === "undefined") return CAISSE_SECOURS_DEMO;
  try {
    const raw = window.localStorage.getItem(CLE_CAISSE);
    if (!raw) return CAISSE_SECOURS_DEMO;
    const v = Number(JSON.parse(raw));
    return isFinite(v) && v >= 0 ? Math.round(v) : CAISSE_SECOURS_DEMO;
  } catch {
    return CAISSE_SECOURS_DEMO;
  }
}

/* ══════════════════════════ helpers copiés du président (adaptés violet) ══════════════════════════ */

/** BOUTON « RETIRER » À DOUBLE CLIC — copie du président (v16) : une épargne
 *  (ou un prêt) attribué(e) PAR ERREUR se supprime sans ambiguïté : le premier
 *  clic ARME la confirmation, le second retire réellement. */
function BtnRetirer(p: { onRetirer: () => void; label: string; variante?: "ligne" | "pastille" }) {
  const [arme, setArme] = useState(false);
  const clic = () => {
    if (arme) { setArme(false); p.onRetirer(); return; }
    setArme(true);
    window.setTimeout(() => setArme(false), 4000);
  };
  const titre = arme ? "Cliquez encore pour confirmer la suppression" : `${p.label} — une confirmation sera demandée`;
  if (p.variante === "pastille") {
    return (
      <button
        type="button"
        onClick={clic}
        aria-label={titre}
        title={titre}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${arme ? "border-[#A5473D] bg-[#A5473D] text-white" : "border-[#A5473D]/35 bg-white text-[#A5473D] hover:bg-[#A5473D]/12"}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={clic}
      aria-label={titre}
      title={titre}
      className={`flex h-8 shrink-0 items-center justify-center rounded-lg border transition ${arme ? "gap-1 border-[#A5473D] bg-[#A5473D] px-2 text-white" : "w-8 border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] hover:bg-[#A5473D]/18"}`}
    >
      <Trash2 className="h-4 w-4" />
      {arme && <span className="text-[11px] font-black">Confirmer ?</span>}
    </button>
  );
}

/** Champ numérique avec prévisualisation FCFA — copie du président. */
function NumField({ label, note, value, onChange, min = 0, step = 1, unite, fcfaPreview }: {
  label: string; note?: string; value: number;
  onChange: (n: number) => void;
  min?: number; step?: number; unite?: string; fcfaPreview?: boolean;
}) {
  return (
    <label className="block rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
      <span className="block text-[11.5px] font-bold text-[#2B3530]">{label}</span>
      {note && <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{note}</span>}
      <span className="mt-1.5 flex items-center gap-1.5">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          step={step}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= min) onChange(n);
          }}
          className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71] focus:ring-2 focus:ring-[#6E4B71]/20"
        />
        {unite && <span className="shrink-0 text-[11px] font-bold text-[#8A9288]">{unite}</span>}
      </span>
      {fcfaPreview && <span className="mt-1 block text-[10.5px] font-semibold text-[#8A6420]">{fcfa(value)}</span>}
    </label>
  );
}

/** Ligne à bascule — une règle activée / désactivée par le bureau. */
function ToggleRow({ label, note, actif, onToggle }: { label: string; note?: string; actif: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={actif}
      className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all ${
        actif ? "border-[#6E4B71]/35 bg-[#6E4B71]/8" : "border-[#E5DCC0] bg-[#FBF7EA]"
      }`}
    >
      <span className="min-w-0">
        <span className={`block text-[11.5px] font-bold ${actif ? "text-[#6E4B71]" : "text-[#5C6B60]"}`}>{label}</span>
        {note && <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{note}</span>}
      </span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${actif ? "bg-[#6E4B71]" : "bg-[#C9D2CB]"}`}>
        <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/** Contrôle segmenté — choix parmi des options fermées. */
function Seg({ options, value, onChange, legende }: {
  options: { v: string; label: string }[]; value: string; onChange: (v: string) => void; legende?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
      {legende && <p className="text-[11.5px] font-bold text-[#2B3530]">{legende}</p>}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const actif = o.v === value;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v)}
              aria-pressed={actif}
              className={`rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                actif ? "border-transparent bg-[#6E4B71] text-white shadow" : "border-[#E5DCC0] bg-white text-[#5C6B60] hover:border-[#6E4B71]/50"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** CHAMP DE RECHERCHE DYNAMIQUE DES MEMBRES (v14) — copie du président :
 *  insensible à la casse et aux accents ; chaque ligne porte l'action prévue
 *  par la page (render prop). */
function ChampRechercheMembres(p: {
  roster: Member[];
  libelle: string;
  note?: string;
  placeholder?: string;
  /** Membres à cacher de la liste (déjà attribués…). */
  idsMasques?: Set<string>;
  /** Rend l'action d'une ligne de résultat (bouton d'attribution…). */
  rendreResultat: (m: Member) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const rq = sansAccent(q.trim());
  const resultats = p.roster
    .filter((m) => !p.idsMasques?.has(m.id))
    .filter((m) => (rq ? sansAccent(m.name).includes(rq) : true));
  return (
    <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FFFDF6] p-3">
      <label className="block">
        <span className="flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">
          <Search className="h-4 w-4" /> {p.libelle}
        </span>
        {p.note && <span className="mt-0.5 block text-[11.5px] font-semibold text-[#4A554E]">{p.note}</span>}
        <span className="relative mt-1.5 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9288]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder={p.placeholder ?? "Tapez un nom…"}
            aria-label={p.libelle}
            className="w-full rounded-xl border-2 border-[#C9B98A] bg-white py-2.5 pl-9 pr-3 text-[14px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
          />
        </span>
      </label>
      {resultats.length === 0 ? (
        <p className="mt-2 text-[12px] font-semibold text-[#4A554E]">
          Aucun membre ne correspond à « {q.trim()} » — vérifiez l’orthographe.
        </p>
      ) : (
        <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
          {resultats.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E5DCC0] bg-white px-2.5 py-1.5">
              <p className="min-w-0 truncate text-[12.5px] font-bold text-[#2B3530]">
                {m.name}
                {m.role !== "membre" ? <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-[#8A6420]"> — bureau</span> : null}
                {estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
              </p>
              {p.rendreResultat(m)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Échéancier d'un prêt — copie du président (reconduction du capital
 *  non remboursé, deux cycles affichés). Calculs identiques. */
function lignesCalendrierPret(montant: number, taux: number, duree: number, moisIdx: number, periodeReconduction = 0) {
  const interetMois = Math.round(montant * (taux / 100));
  const mensu = Math.round((montant + interetMois * duree) / duree);
  const annee = new Date().getFullYear();
  type LignePret = {
    mois: string; annee: number; interet: number; mensu: number; reste: number;
    echeance?: boolean;
    reconduit?: boolean;
  };
  const lignes: LignePret[] = Array.from({ length: duree }, (_, i) => {
    const idx = moisIdx + i;
    const reste = Math.max(0, montant + interetMois * duree - mensu * (i + 1));
    return {
      mois: MOIS_FR[idx % 12],
      annee: idx >= 12 ? annee + 1 : annee,
      interet: interetMois,
      mensu,
      reste,
      echeance: i === duree - 1,
    };
  });
  if (periodeReconduction > 0) {
    let capital = montant + interetMois * duree;
    for (let c = 0; c < 2; c++) {
      const interetCycle = Math.round(capital * (taux / 100));
      for (let j = 1; j <= periodeReconduction; j++) {
        const idx = moisIdx + duree - 1 + c * periodeReconduction + j;
        capital += interetCycle;
        lignes.push({
          mois: MOIS_FR[idx % 12],
          annee: idx >= 12 ? annee + 1 : annee,
          interet: interetCycle,
          mensu: 0,
          reste: capital,
          reconduit: true,
        });
      }
    }
  }
  return lignes;
}

/** Table du calendrier de remboursement — copie du président (entête violet). */
function TableCalendrierPret(p: {
  lignes: { mois: string; annee: number; interet: number; mensu: number; reste: number; echeance?: boolean; reconduit?: boolean }[];
  montant: number;
  nomMembre?: string;
  infoMembre?: string;
}) {
  const anneeCourante = new Date().getFullYear();
  const totalInterets = p.lignes.reduce((s, l) => s + l.interet, 0);
  const avecReconduction = p.lignes.some((l) => l.reconduit || l.echeance);
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
      {(p.nomMembre || p.infoMembre) && (
        <div className="border-b-2 border-[#B8A87E] bg-[#6E4B71]/8 px-3 py-2.5">
          {p.nomMembre && (
            <p className="flex items-center gap-1.5 text-[14px] font-black text-[#6E4B71]">
              <UserCheck className="h-4 w-4 shrink-0" /> Personne concernée : {p.nomMembre}
            </p>
          )}
          {p.infoMembre && <p className="mt-0.5 text-[12.5px] font-bold text-[#2B3530]">{p.infoMembre}</p>}
        </div>
      )}
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="bg-[#6E4B71] text-white">
            <th className="px-3 py-2.5 text-left text-[13px] font-black uppercase tracking-wide">Mois</th>
            <th className="px-3 py-2.5 text-right text-[13px] font-black uppercase tracking-wide">Intérêts</th>
            <th className="px-3 py-2.5 text-right text-[13px] font-black uppercase tracking-wide">Mensualité</th>
            <th className="px-3 py-2.5 text-right text-[13px] font-black uppercase tracking-wide">Reste dû</th>
          </tr>
        </thead>
        <tbody>
          {p.lignes.map((l, i) => (
            <tr key={`${l.mois}-${l.annee}-${i}`} className={`border-b-2 border-[#E5DCC0] ${l.reconduit ? "bg-[#C89F62]/18" : i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-white"}`}>
              <td className="px-3 py-2.5 font-bold text-[#2B3530]">
                {l.mois} {l.annee > anneeCourante ? l.annee : ""}
                {l.echeance && (
                  <span className="ml-1.5 inline-flex items-center rounded-full border border-[#A5473D]/45 bg-[#A5473D]/14 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[#8F2F26]">
                    échéance — non remboursé → nouveau capital
                  </span>
                )}
                {l.reconduit && (
                  <span className="ml-1.5 inline-flex items-center rounded-full border border-[#C89F62]/60 bg-[#C89F62]/22 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[#6E4E14]">
                    capital reconduit
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right font-bold text-[#7A5210]">{fmt(l.interet)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]">{l.mensu > 0 ? fmt(l.mensu) : "—"}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#2B3530]">{fmt(l.reste)}</td>
            </tr>
          ))}
          <tr className="bg-[#C89F62]/22">
            <td className="px-3 py-2.5 text-[13px] font-black uppercase tracking-wide text-[#2B2416]">Total{avecReconduction ? " (échéance + 2 reconductions affichées)" : ""}</td>
            <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{fmt(totalInterets)}</td>
            <td className="px-3 py-2.5 text-right font-black text-[#2B2416]" colSpan={2}>{fcfa(p.montant + totalInterets)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* — DÉTAIL D'UN PRÊT FAIT À LA RÉUNION — copie du président : l'évolution MOIS
 *    PAR MOIS, les avances de remboursement et la confirmation du
 *    remboursement définitif (entête violet). — */
function PanneauDetailPret(p: {
  it: AttributionReunion;
  nom: string;
  taux: number;
  duree: number;
  periode: number;
  moisCourantIdx: number | null;
  /** true = prêt clos (remboursé) : lecture seule. */
  clos?: boolean;
  onAjouterAvance?: (pretId: string, montant: number, moisIdx: number) => void;
  onRetirerAvance?: (pretId: string, avanceId: string) => void;
  onConfirmerRemboursement?: (pretId: string, rembourse: RemboursementPret) => void;
  onFermer?: () => void;
}) {
  const it = p.it;
  const evo = evolutionPretReunion(it.montant, p.taux, it.moisIdx, p.duree, p.periode, it.avances, it.rembourse ?? null, p.moisCourantIdx);
  const depart = Math.min(11, Math.max(0, it.moisIdx));
  const echeanceDansAnnee = evo.moisEcheance <= 11;

  /* — formulaire « avance de remboursement » — */
  const [avMontant, setAvMontant] = useState("");
  const [avMois, setAvMois] = useState<number | null>(null);
  const moisAvanceDefaut = Math.max(depart, Math.min(11, p.moisCourantIdx ?? depart));
  const enregistrerAvance = () => {
    const montant = Number(avMontant);
    if (!montant || montant <= 0) {
      toast.error("Tapez d’abord le montant de l’avance");
      return;
    }
    p.onAjouterAvance?.(it.id, montant, avMois ?? moisAvanceDefaut);
    setAvMontant("");
  };

  /* — confirmation du remboursement : le mois choisi préremplit le reste à
   *    verser (total dû ce mois-là, avances déduites), ajustable à la main. — */
  const moisConfirmDefaut = Math.min(11, Math.max(depart, p.moisCourantIdx ?? depart));
  const [rmMois, setRmMois] = useState<number | null>(null);
  const [rmMontant, setRmMontant] = useState<string | null>(null);
  const moisConfirm = rmMois ?? moisConfirmDefaut;
  const totalDuAuMois = (m: number) => evo.lignes.find((l) => l.moisIdx === m)?.totalDu ?? evo.totalDu;
  const resteConfirme = rmMontant != null ? Number(rmMontant) || 0 : totalDuAuMois(moisConfirm);
  const confirmer = () => {
    if (!resteConfirme || resteConfirme <= 0) {
      toast.error("Le reste à verser doit être supérieur à 0");
      return;
    }
    p.onConfirmerRemboursement?.(it.id, { moisIdx: moisConfirm, montant: Math.round(resteConfirme) });
    p.onFermer?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-black uppercase tracking-wide text-[#6E4B71]">
          Évolution mois par mois — prêt de {p.nom}
          {it.rembourse ? " (remboursé)" : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#B8A87E] bg-white px-2 py-0.5 text-[11px] font-black text-[#4A554E]">{p.taux} %/mois</span>
          <span className="rounded-full border border-[#B8A87E] bg-white px-2 py-0.5 text-[11px] font-black text-[#4A554E]">échéance : {p.duree} mois</span>
          {p.periode > 0 && <span className="rounded-full border border-[#C89F62]/60 bg-[#C89F62]/14 px-2 py-0.5 text-[11px] font-black text-[#6E4E14]">reconduction tous les {p.periode} mois</span>}
        </div>
      </div>
      <p className="text-[12px] font-semibold leading-relaxed text-[#4A554E]">
        {fcfa(it.montant)} rattaché à {MOIS_FR[depart]} : chaque mois, le capital produit {p.taux} % d’intérêts. Au bout de {p.duree} mois ({MOIS_FR[evo.moisEcheance % 12]}{echeanceDansAnnee ? "" : " l’an prochain"}), si l’intérêt n’a pas été remboursé, la somme due devient un NOUVEAU CAPITAL et le pourcentage repart sur lui{p.periode > 0 ? ` — et ainsi de suite tous les ${p.periode} mois tant que ce n’est pas remboursé` : ""}. Une avance paie d’abord les intérêts courus, puis réduit le capital : si les intérêts de la période sont entièrement payés, pas de capitalisation.
        {p.periode === 0 && " La reconduction répétée est désactivée (Paramétrage → Prêts)."}
      </p>

      {/* — tableau d’évolution mois par mois — */}
      <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#6E4B71] text-white">
              <th className="px-3 py-2.5 text-left text-[12.5px] font-black uppercase tracking-wide">Mois</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Capital (début du mois)</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Intérêts du mois</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Avance versée</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Total dû fin de mois</th>
            </tr>
          </thead>
          <tbody>
            {evo.lignes.map((l, i) => (
              <tr key={i} className={`border-b-2 border-[#E5DCC0] ${l.nouveauCapital ? "bg-[#C89F62]/16" : l.rembourse ? "bg-[#2F6B45]/12" : i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-white"}`}>
                <td className="px-3 py-2.5 font-bold text-[#2B3530]">
                  {MOIS_FR[l.moisIdx]}
                  {l.echeance && !l.nouveauCapital && (
                    <span className="ml-1.5 inline-flex items-center rounded-full border border-[#2F6B45]/45 bg-[#2F6B45]/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#255C3A]">échéance — intérêts payés</span>
                  )}
                  {l.echeance && l.nouveauCapital && (
                    <span className="ml-1.5 inline-flex items-center rounded-full border border-[#A5473D]/45 bg-[#A5473D]/14 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#8F2F26]">échéance — non remboursé → nouveau capital</span>
                  )}
                  {!l.echeance && l.nouveauCapital && (
                    <span className="ml-1.5 inline-flex items-center rounded-full border border-[#C89F62]/60 bg-[#C89F62]/18 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#6E4E14]">capital reconduit : {fcfa(l.nouveauCapital)}</span>
                  )}
                  {l.rembourse && (
                    <span className="ml-1.5 inline-flex items-center rounded-full border border-[#2F6B45]/45 bg-[#2F6B45]/14 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#255C3A]">remboursé — prêt soldé</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-[#2B3530]">{fmt(l.capital)}</td>
                <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{l.interet > 0 ? `+${fmt(l.interet)}` : "0"}</td>
                <td className="px-3 py-2.5 text-right font-black text-[#255C3A]">{l.avance > 0 ? `−${fmt(l.avance)}` : "—"}</td>
                <td className="px-3 py-2.5 text-right font-black text-[#2B3530]">{fmt(l.totalDu)}</td>
              </tr>
            ))}
            <tr className="bg-[#C89F62]/22">
              <td className="px-3 py-2.5 font-black text-[#2B2416]">{it.rembourse ? "Total — prêt remboursé" : "Total — au 31 décembre"}</td>
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{fmt(evo.totalInterets)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#255C3A]">{evo.totalAvances > 0 ? `−${fmt(evo.totalAvances)}` : "—"}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#2B2416]">{it.rembourse ? fmt(evo.totalAvances + (it.rembourse?.montant ?? 0)) : fmt(evo.totalDu)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px] font-semibold leading-relaxed text-[#4A554E]">
        {it.rembourse
          ? `Remboursement confirmé en ${MOIS_FR[Math.min(11, Math.max(0, it.rembourse.moisIdx))]} — solde final versé : ${fcfa(it.rembourse.montant)}. Total rendu au prêteur : avances ${fcfa(evo.totalAvances)} + solde ${fcfa(it.rembourse.montant)} = ${fcfa(evo.totalAvances + it.rembourse.montant)}.`
          : echeanceDansAnnee
            ? `Échéance en ${MOIS_FR[evo.moisEcheance % 12]} : si le prêt n’est pas remboursé, la somme due de ce mois devient le nouveau capital — le pourcentage repart sur lui, et l’on voit tout mois par mois jusqu’au remboursement.`
            : `Échéance en ${MOIS_FR[evo.moisEcheance % 12]} ${new Date().getFullYear() + 1} — au-delà du tableau de cette année : les intérêts continuent de courir mois par mois.`}
      </p>

      {/* — avances de remboursement (prêt actif uniquement) — */}
      {!p.clos && (
        <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wide text-[#8A6420]">
            <Coins className="h-3.5 w-3.5" /> Avances de remboursement
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[#4A554E]">
            Quand la réunion rend une partie de l’argent avant le solde final, la secrétaire inscrit l’avance ici — elle paie d’abord les intérêts courus, puis réduit le capital.
          </p>
          {(it.avances ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(it.avances ?? []).map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6B45]/35 bg-[#2F6B45]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#2F6B45]">
                  {fmt(a.montant)} FCFA — {MOIS_FR[Math.min(11, Math.max(0, a.moisIdx))]}
                  <button
                    type="button"
                    onClick={() => p.onRetirerAvance?.(it.id, a.id)}
                    aria-label={`Retirer l’avance de ${fmt(a.montant)} de ${MOIS_FR[Math.min(11, Math.max(0, a.moisIdx))]}`}
                    className="text-[#A5473D] transition hover:text-[#7E2F28]"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={avMontant}
              onChange={(e) => setAvMontant(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Montant de l’avance (FCFA)"
              aria-label="Montant de l’avance de remboursement en FCFA"
              className="w-44 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            />
            <select
              value={avMois ?? moisAvanceDefaut}
              onChange={(e) => setAvMois(Number(e.target.value))}
              aria-label="Mois de l’avance de remboursement"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              {MOIS_FR.slice(depart).map((nom, i) => (
                <option key={nom} value={depart + i}>{nom}</option>
              ))}
            </select>
            <Btn small tone="or" onClick={enregistrerAvance}>
              <Coins className="h-3.5 w-3.5" /> Enregistrer l’avance
            </Btn>
          </div>
        </div>
      )}

      {/* — confirmation du remboursement définitif (prêt actif uniquement) — */}
      {!p.clos && (
        <div className="rounded-2xl border border-[#6E4B71]/30 bg-[#6E4B71]/8 p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wide text-[#6E4B71]">
            <BadgeCheck className="h-3.5 w-3.5" /> Confirmer le remboursement définitif
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[#4A554E]">
            Reste dû en {MOIS_FR[moisConfirm]} après déduction des avances : <strong>{fcfa(totalDuAuMois(moisConfirm))}</strong> — avances déjà versées : <strong className="text-[#255C3A]">{fcfa(evo.totalAvances)}</strong> au total. Une fois confirmé, le prêt quitte la liste des personnes ayant prêté et rejoint « Prêts remboursés ».
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={moisConfirm}
              onChange={(e) => { setRmMois(Number(e.target.value)); setRmMontant(null); }}
              aria-label="Mois du remboursement définitif"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              {MOIS_FR.slice(depart).map((nom, i) => (
                <option key={nom} value={depart + i}>{nom}</option>
              ))}
            </select>
            <input
              value={rmMontant ?? String(totalDuAuMois(moisConfirm))}
              onChange={(e) => setRmMontant(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Solde final versé"
              aria-label="Solde final versé au prêteur en FCFA"
              className="w-44 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            />
            <Btn small tone="violet" onClick={confirmer}>
              <BadgeCheck className="h-3.5 w-3.5" /> Confirmer le remboursement
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* — DÉTAIL DES ÉPARGNES D’UN MEMBRE (v15) — copie du président : TOUTES ses
 *    épargnes regroupées, évolution mois par mois jusqu’au 31 décembre,
 *    capital versé SEULEMENT les mois de versement (entête violet). — */
function PanneauDetailEpargne(p: {
  items: AttributionReunion[];
  nom: string;
  taux: number;
  moisCourantIdx: number | null;
  /** Retire UN versement précis du registre (poubelle sur chaque pastille). */
  onRetirer?: (id: string) => void;
}) {
  const moisDe = (v: AttributionReunion) => Math.min(11, Math.max(0, v.moisIdx));
  const versements = [...p.items].sort((a, b) => a.moisIdx - b.moisIdx || a.montant - b.montant);
  const depart = versements.length > 0 ? moisDe(versements[0]) : 0;
  const interetDe = (v: AttributionReunion) => Math.round(v.montant * (p.taux / 100));
  const capitalTotal = versements.reduce((s, v) => s + v.montant, 0);
  const parMois = new Map<number, { total: number; nb: number }>();
  for (const v of versements) {
    const m = moisDe(v);
    const cur = parMois.get(m) ?? { total: 0, nb: 0 };
    parMois.set(m, { total: cur.total + v.montant, nb: cur.nb + 1 });
  }
  const lignes: { moisIdx: number; versement: number; nbVersements: number; interet: number; cumul: number; capital: number; total: number }[] = [];
  let cumul = 0;
  let capital = 0;
  for (let m = depart; m <= 11; m++) {
    const dep = parMois.get(m);
    capital += dep?.total ?? 0;
    const interet = versements.filter((v) => moisDe(v) <= m).reduce((s, v) => s + interetDe(v), 0);
    cumul += interet;
    lignes.push({ moisIdx: m, versement: dep?.total ?? 0, nbVersements: dep?.nb ?? 0, interet, cumul, capital, total: capital + cumul });
  }
  const realiseJusque = p.moisCourantIdx == null ? depart - 1 : Math.min(11, Math.max(-1, p.moisCourantIdx));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-black uppercase tracking-wide text-[#6E4B71]">
          Évolution mois par mois — épargnes de {p.nom}
        </p>
        <span className="rounded-full border border-[#B8A87E] bg-white px-2 py-0.5 text-[11px] font-black text-[#4A554E]">{p.taux} %/mois</span>
      </div>
      <p className="text-[12px] font-semibold leading-relaxed text-[#4A554E]">
        {versements.length} versement{versements.length > 1 ? "s" : ""} au registre — {fcfa(capitalTotal)} épargné{versements.length > 1 ? "s au total" : ""}. L’évolution court du mois du premier versement ({MOIS_FR[depart]}) jusqu’au DERNIER MOIS DE L’ANNÉE (décembre) : le capital n’apparaît QUE les mois où l’argent a été versé — les autres mois restent vides — tandis que les intérêts, eux, évoluent chaque mois au taux de {p.taux} %.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {versements.map((v) => {
          const mi = moisDe(v);
          return (
            <span key={v.id} className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6B45]/40 bg-[#2F6B45]/8 py-1 pl-2.5 pr-1.5 text-[11.5px] font-black text-[#255C3A]">
              <PiggyBank className="h-3.5 w-3.5 shrink-0" />
              {MOIS_FR[mi]} — {fcfa(v.montant)}
              {p.onRetirer && (
                <BtnRetirer
                  variante="pastille"
                  onRetirer={() => p.onRetirer?.(v.id)}
                  label={`Retirer le versement de ${MOIS_FR[mi]} (${fcfa(v.montant)}) du registre`}
                />
              )}
            </span>
          );
        })}
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#6E4B71] text-white">
              <th className="px-3 py-2.5 text-left text-[12.5px] font-black uppercase tracking-wide">Date (mois)</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Épargne (capital)</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Intérêts du mois</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Intérêts cumulés</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Épargne + intérêts</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => {
              const realise = l.moisIdx <= realiseJusque;
              return (
                <tr key={i} className={`border-b-2 border-[#E5DCC0] ${realise ? "bg-[#FFFDF6]" : "bg-white"}`}>
                  <td className="px-3 py-2.5 font-bold text-[#2B3530]">
                    {MOIS_FR[l.moisIdx]}
                    <span className={`ml-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${realise ? "border-[#2F6B45]/45 bg-[#2F6B45]/12 text-[#255C3A]" : "border-[#B8A87E] bg-white text-[#4A554E]"}`}>
                      {realise ? "réalisé" : "à venir"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#2B3530]">
                    {l.versement > 0 ? (
                      <>
                        +{fmt(l.versement)}
                        {l.nbVersements > 1 && <span className="ml-1 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[10px] font-black text-[#3D6B72]">×{l.nbVersements}</span>}
                      </>
                    ) : (
                      <span className="text-[#B9C0B7]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{l.interet > 0 ? `+${fmt(l.interet)}` : "0"}</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{fmt(l.cumul)}</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]">{fmt(l.total)}</td>
                </tr>
              );
            })}
            <tr className="bg-[#6E4B71]/14">
              <td className="px-3 py-2.5 font-black text-[#3E2A40]">Au 31 décembre</td>
              <td className="px-3 py-2.5 text-right font-black text-[#2B3530]">{fmt(capitalTotal)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">+{fmt(cumul)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{fmt(cumul)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]">{fmt(capitalTotal + cumul)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* — libellés du registre, ADAPTÉS AU POSTE SECRÉTAIRE — la secrétaire inscrit
 *    pour le bureau ; MÊME SOURCE que la console du président (mêmes clés
 *    fc_prets_reunion_v1 / fc_epargnes_reunion_v1 via registres-bureau.ts). — */
const LIBELLES_REGISTRE_SEC = {
  prets: {
    registre: "Prêts faits à la réunion — registre tenu par la secrétaire",
    attrib: "Attribution des prêts à la réunion — par la secrétaire",
    nom: "prêt",
    nomPluriel: "prêts",
    action: "Attribuer le prêt",
    icone: <HandCoins className="h-4.5 w-4.5" />,
    noteRegistre: "Chaque ligne = un membre qui a prêté de l’argent à la réunion : le mois réel auquel le prêt est rattaché, la somme, les intérêts au taux en vigueur, réalisés jusqu’au mois courant et la projection au 31 décembre. La secrétaire déplie la ligne (chevron Détail) pour voir l’ÉVOLUTION MOIS PAR MOIS du prêt — capital, intérêts, avances, total dû — avec la reconduction du capital non remboursé à l’échéance, confirmer le remboursement ou inscrire les avances. ⚠ MÊME SOURCE que la console du président (registre du bureau) : tout ce qui est inscrit ici s’y retrouve aussitôt.",
    noteAttrib: "Le prêt est manuel : la secrétaire l’inscrit dans la machine POUR LE BUREAU. Dans le tableau, repérez le membre (recherche dynamique), tapez la somme prêtée à la réunion, choisissez le mois réel (même un mois passé) puis attribuez : le taux configuré dans le paramétrage des prêts s’applique aussitôt.",
  },
  epargnes: {
    registre: "Registre des épargnes de la réunion — tenu par la secrétaire",
    attrib: "Attribution des épargnes — par la secrétaire",
    nom: "épargne",
    nomPluriel: "épargnes",
    action: "Attribuer l’épargne",
    icone: <PiggyBank className="h-4.5 w-4.5" />,
    noteRegistre: "Chaque ligne = UN membre, TOUTES ses épargnes regroupées : la somme totale épargnée, les mois réels des versements, les intérêts produits chaque mois au taux en vigueur et la projection au 31 décembre. La secrétaire déplie la ligne (chevron Détail) pour l’évolution mois par mois ; une épargne attribuée PAR ERREUR se retire d’un geste (poubelle à confirmation). ⚠ MÊME SOURCE que la console du président (registre du bureau) : les deux postes voient la même réalité.",
    noteAttrib: "Comme pour les prêts : cherchez le membre dans le tableau, tapez la somme de son épargne, choisissez le mois réel du dépôt puis attribuez — le taux configuré dans le paramétrage des épargnes s’applique aussitôt, avec la manière de collecter les intérêts décidée par le bureau.",
  },
} as const;

/** REGISTRE DE LA RÉUNION (prêts / épargnes) — copie du président, entêtes de
 *  table violet, actions secrétariat en violet. UN SEUL composant sert les
 *  deux genres : seuls les libellés et le taux changent. */
function RegistreReunionSection(p: {
  genre: "prets" | "epargnes";
  items: AttributionReunion[];
  parMembre: Map<string, Member>;
  roster: Member[];
  taux: number;
  moisCourantIdx: number | null;
  duree?: number;
  periode?: number;
  onAttribuer: (membreId: string, montant: number, moisIdx: number) => void;
  onRetirer: (id: string) => void;
  onAjouterAvance?: (id: string, montant: number, moisIdx: number) => void;
  onRetirerAvance?: (id: string, avanceId: string) => void;
  onConfirmerRemboursement?: (id: string, rembourse: RemboursementPret) => void;
  onAnnulerRemboursement?: (id: string) => void;
}) {
  const L = LIBELLES_REGISTRE_SEC[p.genre];
  const estPrets = p.genre === "prets";
  const dureeEff = p.duree && p.duree > 0 ? p.duree : 6;
  const periodeEff = p.periode ?? 0;
  /* — formulaire d'attribution : montant + mois par ligne du tableau — */
  const [form, setForm] = useState<Record<string, { montant: string; mois: number | null }>>({});
  const majForm = (id: string, patch: Partial<{ montant: string; mois: number }>) =>
    setForm((x) => ({ ...x, [id]: { ...(x[id] ?? { montant: "", mois: null }), ...patch } }));
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const q = sansAccent(recherche.trim());
  const rosterFiltre = q ? p.roster.filter((m) => sansAccent(m.name).includes(q)) : p.roster;

  const evoDe = (it: AttributionReunion) =>
    evolutionPretReunion(it.montant, p.taux, it.moisIdx, dureeEff, periodeEff, it.avances, estPrets ? it.rembourse ?? null : null, p.moisCourantIdx);

  const itemsActifs = estPrets ? p.items.filter((x) => !x.rembourse) : p.items;
  const itemsRembourses = estPrets ? p.items.filter((x) => x.rembourse) : [];
  const lignes = itemsActifs
    .map((it) => {
      if (estPrets) {
        const evo = evoDe(it);
        return { it, evo, moisDepart: Math.min(11, Math.max(0, it.moisIdx)), interetMois: evo.interetMoisCourant, realise: evo.realise, totalAnnee: evo.totalInterets };
      }
      const i = interetsAttribution(it.montant, p.taux, it.moisIdx, p.moisCourantIdx);
      return { it, evo: null, moisDepart: i.moisDepart, interetMois: i.interetMois, realise: i.realise, totalAnnee: i.totalAnnee };
    })
    .sort((a, b) => a.it.moisIdx - b.it.moisIdx || a.it.membreId.localeCompare(b.it.membreId));
  const totalMontant = lignes.reduce((s, l) => s + l.it.montant, 0);
  const totalRealise = lignes.reduce((s, l) => s + l.realise, 0);
  const totalAnnee = lignes.reduce((s, l) => s + l.totalAnnee, 0);

  /* — ÉPARGNES : UNE SEULE LIGNE PAR MEMBRE (toutes ses épargnes regroupées) — */
  const groupesEpargne = (() => {
    if (estPrets) return [];
    const parMembreId = new Map<string, AttributionReunion[]>();
    for (const it of itemsActifs) {
      const arr = parMembreId.get(it.membreId);
      if (arr) arr.push(it);
      else parMembreId.set(it.membreId, [it]);
    }
    return [...parMembreId.entries()]
      .map(([membreId, items]) => {
        const tries = [...items].sort((a, b) => a.moisIdx - b.moisIdx || a.montant - b.montant);
        let interetMois = 0;
        let realise = 0;
        let totalAnneeG = 0;
        let totalMontantG = 0;
        for (const it of tries) {
          const i = interetsAttribution(it.montant, p.taux, it.moisIdx, p.moisCourantIdx);
          interetMois += i.interetMois;
          realise += i.realise;
          totalAnneeG += i.totalAnnee;
          totalMontantG += it.montant;
        }
        return { membreId, items: tries, moisDepart: Math.min(11, Math.max(0, tries[0].moisIdx)), interetMois, realise, totalAnnee: totalAnneeG, totalMontant: totalMontantG };
      })
      .sort((a, b) => a.moisDepart - b.moisDepart || a.membreId.localeCompare(b.membreId));
  })();

  /* — PRÊTS REMBOURSÉS : le mois par mois s'arrête au remboursement — */
  const rembourses = itemsRembourses
    .map((it) => ({ it, evo: evoDe(it), m: p.parMembre.get(it.membreId) }))
    .sort((a, b) => (a.it.rembourse?.moisIdx ?? 0) - (b.it.rembourse?.moisIdx ?? 0) || a.it.moisIdx - b.it.moisIdx);

  /* — SOMMES TOTALES MOIS PAR MOIS : chaque mois additionne les prêts actifs — */
  const totauxMois: { moisIdx: number; interets: number; avances: number; totalDu: number }[] = [];
  if (estPrets && lignes.length > 0) {
    const departMin = Math.min(...lignes.map((l) => l.moisDepart));
    for (let mi = departMin; mi <= 11; mi++) {
      let interets = 0;
      let avances = 0;
      let totalDu = 0;
      for (const l of lignes) {
        const lg = l.evo?.lignes.find((x) => x.moisIdx === mi);
        if (lg) {
          interets += lg.interet;
          avances += lg.avance;
          totalDu += lg.totalDu;
        }
      }
      totauxMois.push({ moisIdx: mi, interets, avances, totalDu });
    }
  }

  const attribuer = (membreId: string) => {
    const ligne = form[membreId];
    const montant = Number(ligne?.montant ?? 0);
    if (!montant || montant <= 0) {
      toast.error("Tapez d'abord la somme à attribuer à ce membre");
      return;
    }
    const mois = ligne?.mois ?? p.moisCourantIdx ?? 0;
    p.onAttribuer(membreId, montant, mois);
    setForm((x) => ({ ...x, [membreId]: { montant: "", mois: ligne?.mois ?? null } }));
  };

  return (
    <>
      {/* — 1. ATTRIBUTION (v23 : l'élément le plus important — remonté au-dessus du registre) : le tableau de TOUS les membres, recherche dynamique — */}
      <Block title={L.attrib} icon={L.icone} note={L.noteAttrib} accent="#6E4B71">
        <div className="px-4 pt-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FFFDF6] p-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">
                <Search className="h-4 w-4" /> Rechercher un nom — {L.nomPluriel}
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold text-[#4A554E]">
                Tapez les premières lettres : le tableau ne garde que les membres correspondants.
              </span>
              <span className="relative mt-1.5 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9288]" />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  type="search"
                  placeholder="Ex. : Aurélie, Patrick, Marie-Louise…"
                  aria-label={`Rechercher un membre dans la section ${L.attrib}`}
                  className="w-full rounded-xl border-2 border-[#C9B98A] bg-white py-2.5 pl-9 pr-3 text-[14px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
                />
              </span>
            </label>
            {q && (
              <p className="mt-1.5 text-[11.5px] font-bold text-[#4A554E]">
                {rosterFiltre.length === 0
                  ? `Aucun membre ne correspond à « ${recherche.trim()} »`
                  : `${rosterFiltre.length} membre${rosterFiltre.length > 1 ? "s" : ""} trouvé${rosterFiltre.length > 1 ? "s" : ""}`}
                {rosterFiltre.length !== p.roster.length && rosterFiltre.length > 0 && (
                  <button type="button" onClick={() => setRecherche("")} className="ml-2 underline decoration-dotted underline-offset-2 hover:text-[#6E4B71]">
                    afficher tout le monde
                  </button>
                )}
              </p>
            )}
          </div>
        </div>
        {rosterFiltre.length === 0 ? (
          <p className="mx-4 mb-4 mt-3 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold text-[#4A554E]">
            Aucun membre ne correspond à « {recherche.trim()} » — vérifiez l’orthographe ou effacez la recherche.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-2xl border border-[#E5DCC0] bg-white mx-4 mb-4 mt-3">
            <table className="w-full min-w-[560px] border-collapse text-[12px]">
              <thead className="sticky top-0">
                <tr className="bg-[#6E4B71] text-white">
                  <th className="px-2.5 py-2 text-left font-black">Membre</th>
                  <th className="px-2.5 py-2 text-left font-black">Somme {p.genre === "prets" ? "prêtée à la réunion" : "épargnée"} (FCFA)</th>
                  <th className="px-2.5 py-2 text-left font-black">Mois réel</th>
                  <th className="px-2.5 py-2 text-left font-black">Intérêts / mois</th>
                  <th className="px-2.5 py-2" aria-label="Attribuer" />
                </tr>
              </thead>
              <tbody>
                {rosterFiltre.map((m) => {
                  const ligne = form[m.id];
                  const montant = Number(ligne?.montant ?? 0);
                  const mois = ligne?.mois ?? p.moisCourantIdx;
                  const interetMois = montant > 0 ? Math.round(montant * (p.taux / 100)) : 0;
                  const deja = itemsActifs.filter((x) => x.membreId === m.id);
                  const totalDeja = deja.reduce((s, x) => s + x.montant, 0);
                  return (
                    <tr key={m.id} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                      <td className="px-2.5 py-2">
                        <p className="font-bold text-[#2B3530]">
                          {m.name}{m.role !== "membre" ? <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-[#8A6420]"> — bureau</span> : null}
                          {estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                        </p>
                        {deja.length > 0 && (
                          <p className="text-[10px] text-[#8A9288]">
                            déjà au registre : {deja.length} {deja.length > 1 ? L.nomPluriel : L.nom} — {fcfa(totalDeja)}
                          </p>
                        )}
                      </td>
                      <td className="px-2.5 py-2">
                        <input
                          value={ligne?.montant ?? ""}
                          onChange={(e) => majForm(m.id, { montant: e.target.value.replace(/[^\d]/g, "") })}
                          inputMode="numeric"
                          placeholder="0"
                          aria-label={`Somme ${p.genre === "prets" ? "prêtée" : "épargnée"} de ${m.name} en FCFA`}
                          className="w-28 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
                        />
                      </td>
                      <td className="px-2.5 py-2">
                        <select
                          value={mois ?? ""}
                          onChange={(e) => majForm(m.id, { mois: Number(e.target.value) })}
                          aria-label={`Mois réel du ${L.nom} de ${m.name}`}
                          className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
                        >
                          {MOIS_FR.map((nom, mi) => (
                            <option key={nom} value={mi}>
                              {nom}{p.moisCourantIdx != null && mi === p.moisCourantIdx ? " — en cours" : p.moisCourantIdx != null && mi > p.moisCourantIdx ? " — à venir" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{interetMois > 0 ? `+${fmt(interetMois)}` : "—"}</td>
                      <td className="px-2.5 py-2 text-right">
                        <Btn small tone="violet" disabled={!montant || montant <= 0} onClick={() => attribuer(m.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {L.action}
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      {/* — 2. REGISTRE : les personnes, les mois, les intérêts, les sommes globales — */}
      <Block title={L.registre} icon={L.icone} note={L.noteRegistre} accent="#6E4B71">
        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <KpiCard
              icon={estPrets ? <HandCoins className="h-3.5 w-3.5" /> : <PiggyBank className="h-3.5 w-3.5" />}
              label={estPrets ? "Somme globale prêtée à la réunion" : "Somme globale épargnée"}
              value={fcfa(totalMontant)}
              sub={`${lignes.length} enregistrement(s) actif(s) au registre${estPrets && itemsRembourses.length > 0 ? ` — ${itemsRembourses.length} remboursé(s)` : ""}`}
              accent="#6E4B71"
            />
            <KpiCard
              icon={<Coins className="h-3.5 w-3.5" />}
              label="Intérêts produits — réalisés"
              value={fcfa(totalRealise)}
              sub={`au taux de ${p.taux} %/mois, jusqu’au mois en cours`}
              accent="#2F6B45"
            />
            <KpiCard
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Projection au 31 décembre"
              value={fcfa(totalAnnee)}
              sub={`ce que ces ${L.nomPluriel} auront produit sur l’année entière`}
              accent="#C89F62"
            />
          </div>

          {lignes.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
              Aucun {L.nom} enregistré pour l’instant — attribuez le premier dans la section « {L.attrib} » ci-dessus.
            </p>
          ) : (
            <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white">
              <table className="w-full min-w-[680px] border-collapse text-[12px]">
                <thead className="sticky top-0">
                  <tr className="bg-[#6E4B71] text-white">
                    <th className="px-2.5 py-2 text-left font-black">Membre</th>
                    {!estPrets && <th className="px-2.5 py-2 text-center font-black">Versements</th>}
                    <th className="px-2.5 py-2 text-left font-black">Mois</th>
                    <th className="px-2.5 py-2 text-right font-black">Somme</th>
                    <th className="px-2.5 py-2 text-right font-black">Intérêts / mois</th>
                    <th className="px-2.5 py-2 text-right font-black">Réalisés</th>
                    <th className="px-2.5 py-2 text-right font-black">Au 31 déc.</th>
                    <th className="px-2.5 py-2 text-center font-black">Détail</th>
                    <th className="px-2.5 py-2" aria-label="Retirer" />
                  </tr>
                </thead>
                <tbody>
                  {estPrets ? (
                    lignes.map(({ it, moisDepart, interetMois, realise, totalAnnee: totalAn }) => {
                      const m = p.parMembre.get(it.membreId);
                      const detailOuvert = ouvert === it.id;
                      return (
                        <Fragment key={it.id}>
                          <tr className={`border-b border-[#E5DCC0] ${detailOuvert ? "bg-[#FBF7EA]" : "bg-[#FFFDF6]"}`}>
                            <td className="px-2.5 py-2 font-bold text-[#2B3530]">
                              {m?.name ?? it.membreId}
                              {m && estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#5C6B60]">{MOIS_FR[moisDepart]}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(it.montant)}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{interetMois > 0 ? `+${fmt(interetMois)}` : "0"}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{fmt(realise)}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(totalAn)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setOuvert((x) => (x === it.id ? null : it.id))}
                                aria-expanded={detailOuvert}
                                aria-label={`Voir l’évolution mois par mois du prêt de ${m?.name ?? it.membreId}`}
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#6E4B71]/30 bg-[#6E4B71]/8 text-[#6E4B71] transition hover:bg-[#6E4B71]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <BtnRetirer
                                onRetirer={() => p.onRetirer(it.id)}
                                label={`Retirer l’enregistrement de ${m?.name ?? it.membreId}`}
                              />
                            </td>
                          </tr>
                          {detailOuvert && (
                            <tr className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                              <td colSpan={8} className="px-3 pb-3 pt-1">
                                <PanneauDetailPret
                                  it={it}
                                  nom={m?.name ?? it.membreId}
                                  taux={p.taux}
                                  duree={dureeEff}
                                  periode={periodeEff}
                                  moisCourantIdx={p.moisCourantIdx}
                                  clos={false}
                                  onAjouterAvance={p.onAjouterAvance}
                                  onRetirerAvance={p.onRetirerAvance}
                                  onConfirmerRemboursement={p.onConfirmerRemboursement}
                                  onFermer={() => setOuvert(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    groupesEpargne.map((g) => {
                      const m = p.parMembre.get(g.membreId);
                      const detailOuvert = ouvert === `e:${g.membreId}`;
                      const plusieurs = g.items.length > 1;
                      return (
                        <Fragment key={`e-${g.membreId}`}>
                          <tr className={`border-b border-[#E5DCC0] ${detailOuvert ? "bg-[#FBF7EA]" : "bg-[#FFFDF6]"}`}>
                            <td className="px-2.5 py-2 font-bold text-[#2B3530]">
                              {m?.name ?? g.membreId}
                              {m && estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                              {plusieurs && (
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8A6420]">
                                  versements regroupés — la poubelle d’un mois retire CETTE épargne
                                </p>
                              )}
                            </td>
                            {/* v23 — NOMBRE DE VERSEMENTS : à côté des noms des membres, le
                             *    nombre de versements que la personne a faits — il augmente à
                             *    chaque épargne inscrite à son nom, quel que soit le mois. */}
                            <td className="px-2.5 py-2 text-center">
                              <span
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#6E4B71]/12 px-2 text-[13px] font-black text-[#6E4B71]"
                                title={`Nombre de versements de ${m?.name ?? g.membreId} au registre`}
                              >
                                {g.items.length}
                              </span>
                              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#8A9288]">{g.items.length > 1 ? "versements" : "versement"}</p>
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#5C6B60]">
                              {plusieurs ? (
                                <div className="flex max-w-[260px] flex-wrap items-center gap-1">
                                  {g.items.map((x) => {
                                    const mi = Math.min(11, Math.max(0, x.moisIdx));
                                    return (
                                      <span key={x.id} className="inline-flex items-center gap-1 rounded-full border border-[#C89F62]/60 bg-[#C89F62]/10 py-0.5 pl-2 pr-1 text-[10.5px] font-bold text-[#6B4A12]">
                                        {MOIS_FR[mi]} · {fmt(x.montant)}
                                        <BtnRetirer
                                          variante="pastille"
                                          onRetirer={() => p.onRetirer(x.id)}
                                          label={`Retirer l’épargne de ${MOIS_FR[mi]} (${fmt(x.montant)}) de ${m?.name ?? g.membreId}`}
                                        />
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                MOIS_FR[Math.min(11, Math.max(0, g.items[0].moisIdx))]
                              )}
                            </td>
                            <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(g.totalMontant)}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{g.interetMois > 0 ? `+${fmt(g.interetMois)}` : "0"}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{fmt(g.realise)}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(g.totalAnnee)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setOuvert((x) => (x === `e:${g.membreId}` ? null : `e:${g.membreId}`))}
                                aria-expanded={detailOuvert}
                                aria-label={`Voir l’évolution mois par mois des épargnes de ${m?.name ?? g.membreId}`}
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#6E4B71]/30 bg-[#6E4B71]/8 text-[#6E4B71] transition hover:bg-[#6E4B71]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {!plusieurs && (
                                <BtnRetirer
                                  onRetirer={() => p.onRetirer(g.items[0].id)}
                                  label={`Retirer l’enregistrement de ${m?.name ?? g.membreId}`}
                                />
                              )}
                            </td>
                          </tr>
                          {detailOuvert && (
                            <tr className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                              <td colSpan={estPrets ? 8 : 9} className="px-3 pb-3 pt-1">
                                <PanneauDetailEpargne
                                  items={g.items}
                                  nom={m?.name ?? g.membreId}
                                  taux={p.taux}
                                  moisCourantIdx={p.moisCourantIdx}
                                  onRetirer={p.onRetirer}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                  <tr className="bg-[#C89F62]/15">
                    <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={estPrets ? 2 : 3}>Sommes globales</td>
                    <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fmt(totalMontant)}</td>
                    <td className="px-2.5 py-2.5" />
                    <td className="px-2.5 py-2.5 text-right font-black text-[#2F6B45]">{fmt(totalRealise)}</td>
                    <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">{fmt(totalAnnee)}</td>
                    <td className="px-2.5 py-2.5" />
                    <td className="px-2.5 py-2.5" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* — SOMMES TOTALES MOIS PAR MOIS (prêts uniquement) — */}
          {estPrets && totauxMois.length > 0 && (
            <div className="mt-4">
              <p className="text-[11.5px] font-black uppercase tracking-wide text-[#6E4B71]">Sommes totales mois par mois — tous les prêts actifs</p>
              <p className="mt-0.5 mb-2 text-[10.5px] leading-snug text-[#8A9288]">
                Chaque ligne additionne les prêts du registre : intérêts produits ce mois, avances versées ce mois et somme totale due à la fin du mois (reconductions du capital comprises). Les prêts remboursés n’y figurent plus — ils sont soldés.
              </p>
              <div className="max-h-64 overflow-y-auto overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white">
                <table className="w-full min-w-[420px] border-collapse text-[12px]">
                  <thead className="sticky top-0">
                    <tr className="bg-[#6E4B71] text-white">
                      <th className="px-2.5 py-2 text-left font-black">Mois</th>
                      <th className="px-2.5 py-2 text-right font-black">Intérêts du mois</th>
                      <th className="px-2.5 py-2 text-right font-black">Avances versées</th>
                      <th className="px-2.5 py-2 text-right font-black">Total dû fin de mois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totauxMois.map((t) => (
                      <tr key={t.moisIdx} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                        <td className="px-2.5 py-2 font-bold text-[#2B3530]">{MOIS_FR[t.moisIdx]}</td>
                        <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{t.interets > 0 ? `+${fmt(t.interets)}` : "0"}</td>
                        <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{t.avances > 0 ? `−${fmt(t.avances)}` : "—"}</td>
                        <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(t.totalDu)}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#C89F62]/15">
                      <td className="px-2.5 py-2.5 font-black text-[#2B2416]">Au 31 décembre</td>
                      <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">+{fmt(totauxMois.reduce((s, t) => s + t.interets, 0))}</td>
                      <td className="px-2.5 py-2.5 text-right font-black text-[#2F6B45]">{totauxMois.reduce((s, t) => s + t.avances, 0) > 0 ? `−${fmt(totauxMois.reduce((s, t) => s + t.avances, 0))}` : "—"}</td>
                      <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fmt(totauxMois[totauxMois.length - 1].totalDu)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Block>

      {/* — 1-bis. PRÊTS REMBOURSÉS — */}
      {estPrets && (
        <Block
          title="Prêts remboursés"
          icon={<BadgeCheck className="h-4.5 w-4.5" />}
          note="Ici reposent les prêts que la réunion a rendus à leurs prêteurs : le mois du prêt, la somme initiale, les intérêts produits, les avances versées et la somme totale remboursée. Un prêt remboursé quitte la liste des personnes ayant prêté — un mauvais clic ? « Annuler le remboursement » le remet dans le registre actif."
          accent="#6E4B71"
        >
          <div className="p-4">
            {rembourses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
                Aucun prêt remboursé pour l’instant — quand la réunion rend son argent à un prêteur, dépliez sa ligne dans le registre (chevron « Détail ») puis cliquez « Confirmer le remboursement » : le prêt vient se ranger ici, avec ses intérêts et le total versé.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <KpiCard icon={<BadgeCheck className="h-3.5 w-3.5" />} label="Prêts soldés" value={String(rembourses.length)} sub={`${fmt(rembourses.reduce((s, r) => s + r.it.montant, 0))} FCFA de prêts initiaux rendus`} accent="#6E4B71" />
                  <KpiCard icon={<Coins className="h-3.5 w-3.5" />} label="Intérêts versés aux prêteurs" value={fcfa(rembourses.reduce((s, r) => s + r.evo.totalInterets, 0))} sub="intérêts produits jusqu’au remboursement, reconductions comprises" accent="#2F6B45" />
                  <KpiCard icon={<Wallet className="h-3.5 w-3.5" />} label="Total remboursé" value={fcfa(rembourses.reduce((s, r) => s + r.evo.totalAvances + (r.it.rembourse?.montant ?? 0), 0))} sub="avances + soldes finaux — la dette de la réunion est éteinte" accent="#C89F62" />
                </div>
                <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white">
                  <table className="w-full min-w-[760px] border-collapse text-[12px]">
                    <thead className="sticky top-0">
                      <tr className="bg-[#6E4B71] text-white">
                        <th className="px-2.5 py-2 text-left font-black">Membre</th>
                        <th className="px-2.5 py-2 text-left font-black">Mois du prêt</th>
                        <th className="px-2.5 py-2 text-right font-black">Somme</th>
                        <th className="px-2.5 py-2 text-right font-black">Intérêts produits</th>
                        <th className="px-2.5 py-2 text-right font-black">Avances versées</th>
                        <th className="px-2.5 py-2 text-right font-black">Solde final versé</th>
                        <th className="px-2.5 py-2 text-right font-black">Total remboursé</th>
                        <th className="px-2.5 py-2 text-center font-black">Détail</th>
                        <th className="px-2.5 py-2" aria-label="Annuler" />
                      </tr>
                    </thead>
                    <tbody>
                      {rembourses.map(({ it, evo, m }) => {
                        const detailOuvert = ouvert === it.id;
                        const totalRembourse = evo.totalAvances + (it.rembourse?.montant ?? 0);
                        return (
                          <Fragment key={it.id}>
                            <tr className={`border-b border-[#E5DCC0] ${detailOuvert ? "bg-[#FBF7EA]" : "bg-[#FFFDF6]"}`}>
                              <td className="px-2.5 py-2 font-bold text-[#2B3530]">
                                <span className="inline-flex items-center gap-1.5">
                                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#2F6B45]" />
                                  {m?.name ?? it.membreId}
                                </span>
                              </td>
                              <td className="px-2.5 py-2 font-semibold text-[#5C6B60]">{MOIS_FR[Math.min(11, Math.max(0, it.moisIdx))]}</td>
                              <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(it.montant)}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{fmt(evo.totalInterets)}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{evo.totalAvances > 0 ? fmt(evo.totalAvances) : "—"}</td>
                              <td className="px-2.5 py-2 text-right font-bold text-[#2B3530]">{fmt(it.rembourse?.montant ?? 0)}</td>
                              <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(totalRembourse)}</td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setOuvert((x) => (x === it.id ? null : it.id))}
                                  aria-expanded={detailOuvert}
                                  aria-label={`Voir l’évolution du prêt remboursé de ${m?.name ?? it.membreId}`}
                                  className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#6E4B71]/30 bg-[#6E4B71]/8 text-[#6E4B71] transition hover:bg-[#6E4B71]/18"
                                >
                                  {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => p.onAnnulerRemboursement?.(it.id)}
                                  aria-label={`Annuler le remboursement du prêt de ${m?.name ?? it.membreId}`}
                                  title="Annuler le remboursement — remet le prêt dans le registre actif"
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                            {detailOuvert && (
                              <tr className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                                <td colSpan={9} className="px-3 pb-3 pt-1">
                                  <PanneauDetailPret
                                    it={it}
                                    nom={m?.name ?? it.membreId}
                                    taux={p.taux}
                                    duree={dureeEff}
                                    periode={periodeEff}
                                    moisCourantIdx={p.moisCourantIdx}
                                    clos={true}
                                  />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      <tr className="bg-[#C89F62]/15">
                        <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={2}>Totaux — prêts remboursés</td>
                        <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fmt(rembourses.reduce((s, r) => s + r.it.montant, 0))}</td>
                        <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">{fmt(rembourses.reduce((s, r) => s + r.evo.totalInterets, 0))}</td>
                        <td className="px-2.5 py-2.5 text-right font-black text-[#2F6B45]">{fmt(rembourses.reduce((s, r) => s + r.evo.totalAvances, 0))}</td>
                        <td className="px-2.5 py-2.5 text-right font-black text-[#2B3530]">{fmt(rembourses.reduce((s, r) => s + (r.it.rembourse?.montant ?? 0), 0))}</td>
                        <td className="px-2.5 py-2.5 text-right font-black text-[#1E4D2B]">{fmt(rembourses.reduce((s, r) => s + r.evo.totalAvances + (r.it.rembourse?.montant ?? 0), 0))}</td>
                        <td className="px-2.5 py-2.5" colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Block>
      )}

    </>
  );
}

/* ══════════════════════════ 1. COTISATIONS & COLLATIONS — poste secrétariat ══════════════════════════ */

export function SecCotisationsCollations(p: {
  /** ex. « novembre 2026 » — null avant hydratation. */
  moisLabel: string | null;
  /** 0-11, null avant hydratation. */
  moisIdx: number | null;
  /** MEMBRES_FICTIFS + membres de l'application. */
  roster: Member[];
  parMembre: Map<string, Member>;
}): ReactNode {
  /* — montants de base (TONTINE) : cotisation de base + collation de base — */
  const [montants, setMontants] = useState<ReglagesTontine>({ ...TONTINE });
  /* — types de cotisations & collations : MÊME CLÉ que le président — */
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  const [collations, setCollations] = useState<Collation[]>([]);
  /* — NOUVELLE CLÉ : le mois de la secrétaire (mêmes seeds que le président) — */
  const [cotisMois, setCotisMois] = useState<Record<string, MouvementCotisMois>>({});
  /* — formulaires de création (types de cotisations / collations) — */
  const [formCotisOpen, setFormCotisOpen] = useState(false);
  const [formCotis, setFormCotis] = useState<{ nom: string; montant: number; membreIds: string[] }>({ nom: "", montant: 0, membreIds: [] });
  const [formCollOpen, setFormCollOpen] = useState(false);
  const [formColl, setFormColl] = useState<{ nom: string; montant: number; membreIds: string[] }>({ nom: "", montant: 0, membreIds: [] });

  /* — hydratation sûre : aucun localStorage ni Date au premier rendu — */
  useEffect(() => {
    const t0 = setTimeout(() => {
      loadMontants(); // applique les montants persistés à TONTINE (même clé que le président)
      setMontants({ ...TONTINE });
      setTypesCotis(loadTypesCotisation()); // fc_cotis_types_v1 — même source que le président
      setCollations(loadCollations()); // fc_collations_v1 — même source que le président
      setCotisMois(loadCotisMoisSec()); // fc_secretaire_cotis_mois_v1 (seed = démo du président)
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  const mois = p.moisLabel ?? (p.moisIdx != null ? MOIS_FR[p.moisIdx] : null);

  /* — AUTO-PERSISTANCE : chaque mutation écrit IMMÉDIATEMENT — */
  const majMontants = (patch: Partial<ReglagesTontine>) => {
    saveMontants(patch);
    setMontants({ ...TONTINE });
    toast.success("Montant enregistré", { description: "Le réglage du bureau est aussitôt visible par la secrétaire, le président et tous les membres (même clé de stockage)." });
  };
  const majTypesCotis = (next: TypeCotisation[], message?: string) => {
    setTypesCotis(next);
    saveTypesCotisation(next);
    if (message) toast.success("Paramétrage des cotisations enregistré", { description: message });
  };
  const majCollations = (next: Collation[], message?: string) => {
    setCollations(next);
    saveCollations(next);
    if (message) toast.success("Paramétrage des collations enregistré", { description: message });
  };

  /* — encaissement (cochage) du mois — persisté à chaque geste — */
  const encaisser = (membreId: string, quoi: "cotisation" | "collation", recu: boolean) => {
    const next = {
      ...cotisMois,
      [membreId]: { ...(cotisMois[membreId] ?? { cotisation: false, collation: false }), [quoi]: recu },
    };
    setCotisMois(next);
    ecrireSec(CLE_COTIS_MOIS, next);
    const m = p.parMembre.get(membreId);
    if (recu) {
      toast.success(`${quoi === "cotisation" ? "Cotisation" : "Collation"} encaissée — ${m?.name}`, { description: "La secrétaire encaisse pour le trésorier : le reçu s’inscrit au journal de caisse du trésorier." });
    } else {
      toast(`${m?.name} — ${quoi} remise en attente`, { description: "La ligne repasse en attente, comme une correction de saisie." });
    }
  };
  const toutEncaisser = () => {
    const next: Record<string, MouvementCotisMois> = { ...cotisMois };
    p.roster.forEach((m) => { next[m.id] = { cotisation: true, collation: true }; });
    setCotisMois(next);
    ecrireSec(CLE_COTIS_MOIS, next);
    toast.success("Tout le mois est marqué encaissé", { description: `Cotisations et collations${mois ? ` de ${mois}` : ""} réglées pour les ${p.roster.length} membres — à transmettre au trésorier.` });
  };
  const notifierTresorier = () => {
    toast.success("Trésorier notifié", { description: "Émile Tchoumi reçoit l’état de la collecte tenue par la secrétaire — les reçus s’inscrivent au journal de caisse." });
  };

  /* — règles de la Tontine : un membre ne cotise qu'UNE seule somme mensuelle — */
  const typeOccupant = (membreId: string, editeId?: string): TypeCotisation | null =>
    typesCotis.find((t) => t.id !== editeId && t.membreIds.includes(membreId)) ?? null;

  const creerTypeCotis = () => {
    const nom = formCotis.nom.trim() || `Cotisation ${typesCotis.length + 1}`;
    const t: TypeCotisation = { ...nouveauTypeCotisation(nom), montant: formCotis.montant, membreIds: [...formCotis.membreIds] };
    majTypesCotis([...typesCotis, t]);
    setFormCotisOpen(false);
    toast.success(`Type « ${nom} » créé`, { description: `${t.membreIds.length} membre(s) présélectionné(s) — « Valider l’attribution » notifiera chaque membre concerné.` });
  };
  const validerTypeCotis = (t: TypeCotisation) => {
    if (t.montant <= 0) { toast.error("Fixez d'abord la somme de ce type (aujourd'hui à 0)"); return; }
    if (t.membreIds.length === 0) { toast.error("Sélectionnez au moins un membre qui doit cotiser cette somme"); return; }
    const next = typesCotis.map((x) => {
      if (x.id === t.id) return { ...x, valideLe: new Date().toISOString() };
      /* un membre ne cotise qu'UNE somme : on le retire des autres types */
      return { ...x, membreIds: x.membreIds.filter((id) => !t.membreIds.includes(id)) };
    });
    majTypesCotis(next, `${fcfa(t.montant)} par mois (« ${t.nom} ») attribués à ${t.membreIds.length} membre(s) — ils voient cette somme sur leur page avec une notification.`);
  };
  const supprimerTypeCotis = (t: TypeCotisation) => {
    majTypesCotis(typesCotis.filter((x) => x.id !== t.id));
    toast(`Type « ${t.nom} » supprimé`, { description: "Les membres concernés repassent à la cotisation de base." });
  };

  const creerCollation = () => {
    const nom = formColl.nom.trim() || `Collation ${collations.length + 1}`;
    const c: Collation = { ...nouvelleCollation(nom), montant: formColl.montant, membreIds: [...formColl.membreIds] };
    majCollations([...collations, c]);
    setFormCollOpen(false);
    toast.success(`Collation « ${nom} » créée`, { description: `${c.membreIds.length} personne(s) désignée(s) — « Valider l’attribution » notifiera chaque personne concernée.` });
  };
  const validerCollation = (c: Collation) => {
    if (c.montant <= 0) { toast.error("Fixez d'abord la somme de cette collation (aujourd'hui à 0)"); return; }
    if (c.membreIds.length === 0) { toast.error("Sélectionnez au moins une personne qui doit payer cette collation"); return; }
    const next = collations.map((x) => (x.id === c.id ? { ...x, valideLe: new Date().toISOString() } : x));
    majCollations(next, `${fcfa(c.montant)} par réunion (« ${c.nom} ») attribués à ${c.membreIds.length} personne(s) — elles voient cette somme sur leur page avec une notification.`);
  };
  const supprimerCollation = (c: Collation) => {
    majCollations(collations.filter((x) => x.id !== c.id));
    toast(`Collation « ${c.nom} » supprimée`, { description: "La part collation des personnes désignées est mise à jour aussitôt." });
  };

  /* — lignes membre par membre (même calcul que le président) — */
  const cotisBase = montants.montantCotisation;
  const lignes = p.roster.map((m) => {
    const t = typeDuMembre(m.id, typesCotis);
    const attenduCotis = t ? t.montant : cotisBase;
    const attenduColl = collationDuMembre(m.id, collations);
    const st = cotisMois[m.id] ?? { cotisation: false, collation: false };
    return {
      m,
      typeNom: t?.nom ?? null,
      attenduCotis,
      attenduColl,
      st,
      totalRecu: (st.cotisation ? attenduCotis : 0) + (st.collation ? attenduColl : 0),
    };
  });
  const totalCotisRecu = lignes.reduce((s, l) => s + (l.st.cotisation ? l.attenduCotis : 0), 0);
  const totalCotisAttendu = lignes.reduce((s, l) => s + l.attenduCotis, 0);
  const totalCollRecu = lignes.reduce((s, l) => s + (l.st.collation ? l.attenduColl : 0), 0);
  const totalCollAttendu = lignes.reduce((s, l) => s + l.attenduColl, 0);
  const nbCotis = lignes.filter((l) => l.st.cotisation).length;
  const nbColl = lignes.filter((l) => l.st.collation).length;
  const totalRecu = totalCotisRecu + totalCollRecu;

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6E4B71]">Collecte du mois{mois ? ` — ${mois}` : ""} — tenue par la secrétaire</p>
            <p className="text-[26px] font-black leading-none text-[#6E4B71]">{fcfa(totalRecu)}</p>
            <p className="mt-0.5 text-[11px] text-[#8A9288]">encaissés — cotisations {fcfa(totalCotisRecu)} · collations {fcfa(totalCollRecu)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <P cls={VI_CLS}><Users className="h-3 w-3" /> Poste secrétariat</P>
            <P cls={nbCotis >= p.roster.length ? OK_CLS : OR_CLS}><CheckCircle2 className="h-3 w-3" /> Cotisations {nbCotis}/{p.roster.length}</P>
            <P cls={nbColl >= p.roster.length ? OK_CLS : TE_CLS}><ReceiptText className="h-3 w-3" /> Collations {nbColl}/{p.roster.length}</P>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <KpiCard
            icon={<Coins className="h-3.5 w-3.5" />}
            label="Cotisations encaissées"
            value={fcfa(totalCotisRecu)}
            sub={`attendu ${fcfa(totalCotisAttendu)} — somme fixée par le bureau pour chaque membre`}
            accent="#2F6B45"
            barre={{ pct: totalCotisAttendu > 0 ? (totalCotisRecu / totalCotisAttendu) * 100 : 0 }}
          />
          <KpiCard
            icon={<ReceiptText className="h-3.5 w-3.5" />}
            label="Collations encaissées"
            value={fcfa(totalCollRecu)}
            sub={totalCollAttendu > 0 ? `attendu ${fcfa(totalCollAttendu)} — ${collations.length} collation(s) fixée(s) par le bureau` : "à fixer — voir le paramétrage ci-dessous"}
            accent="#C89F62"
            barre={{ pct: totalCollAttendu > 0 ? (totalCollRecu / totalCollAttendu) * 100 : 0 }}
          />
          <KpiCard
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Total remis au trésorier"
            value={fcfa(totalRecu)}
            sub="la secrétaire encaisse pour le trésorier — reçu à chaque geste"
            accent="#6E4B71"
          />
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-[#5C6B60]">
          Toutes les cotisations et toutes les collations du mois, membre par membre : cochez « Reçu » quand l’argent est encaissé — les totaux se mettent à jour aussitôt et l’état survit au rechargement (registre du secrétariat, miroir de la collecte du président).
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Btn small tone="violet" onClick={toutEncaisser}><CheckSquare className="h-3.5 w-3.5" /> Tout marquer encaissé</Btn>
          <Btn small tone="teal" onClick={notifierTresorier}><Send className="h-3.5 w-3.5" /> Notifier le trésorier</Btn>
        </div>
      </FcCard>

      <Block title={`Membre par membre — ${mois ?? "mois en cours"}`} icon={<Users className="h-4.5 w-4.5" />} accent="#6E4B71"
        note="Cotisation = le montant fixé pour CE membre par le bureau (ou le montant de base). Collation = la somme des collations fixées pour CE membre. Cliquez à nouveau pour corriger une erreur de saisie.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#6E4B71] text-white">
                <th className="px-2.5 py-2 text-left font-black">Membre</th>
                <th className="px-2.5 py-2 text-center font-black">Cotisation</th>
                <th className="px-2.5 py-2 text-center font-black">Collation</th>
                <th className="px-2.5 py-2 text-right font-black">Reçu du membre</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.m.id} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                  <td className="px-2.5 py-2">
                    <p className="font-bold text-[#2B3530]">{l.m.name}{l.m.isVous ? " (vous)" : ""}</p>
                    <p className="text-[10.5px] text-[#8A9288]">
                      {ROLE_META[l.m.role]?.short ?? l.m.role}{estMembreApp(l.m) ? " · via l’app" : ""}{l.typeNom ? ` · ${l.typeNom}` : l.attenduCotis > 0 ? " · montant de base" : " · à fixer par le bureau"}
                    </p>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <p className="text-[11.5px] font-semibold text-[#2B3530]">{l.attenduCotis > 0 ? fmt(l.attenduCotis) : "—"}</p>
                    <Btn small tone={l.st.cotisation ? "vert" : "violet"} disabled={l.attenduCotis <= 0} onClick={() => encaisser(l.m.id, "cotisation", !l.st.cotisation)}>
                      {l.st.cotisation ? <><CheckCircle2 className="h-3.5 w-3.5" /> Reçue</> : <><Hourglass className="h-3.5 w-3.5" /> En attente</>}
                    </Btn>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <p className="text-[11.5px] font-semibold text-[#2B3530]">{l.attenduColl > 0 ? fmt(l.attenduColl) : "—"}</p>
                    <Btn small tone={l.st.collation ? "or" : "violet"} disabled={l.attenduColl <= 0} onClick={() => encaisser(l.m.id, "collation", !l.st.collation)}>
                      {l.st.collation ? <><CheckCircle2 className="h-3.5 w-3.5" /> Reçue</> : <><Hourglass className="h-3.5 w-3.5" /> En attente</>}
                    </Btn>
                  </td>
                  <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{l.totalRecu > 0 ? fcfa(l.totalRecu) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-[#C89F62]/15">
                <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={3}>Total encaissé ce mois</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fcfa(totalRecu)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>

      {/* ══════ PARAMÉTRAGE — cotisations & collations (le paramétrage qui va avec) ══════ */}
      <Block
        title="Paramétrage — cotisations & collations"
        icon={<Layers className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="La secrétaire règle POUR LE BUREAU : montant de base de la cotisation, montant de la collation, types de cotisations mensuelles et collations — les MÊMES clés de stockage que le président (montants, fc_cotis_types_v1, fc_collations_v1) : chaque modification est enregistrée AUSSITÔT et visible dans toute l’application. « Valider l’attribution » notifie les membres concernés."
      >
        <div className="space-y-3 p-4">
          {/* — montants de base (loadMontants / saveMontants) — */}
          <div className="grid gap-2 sm:grid-cols-2">
            <NumField
              label="Cotisation mensuelle de base — membres sans type particulier"
              note="S’applique à tous les membres sans type particulier (les types créés ci-dessous la remplacent pour leurs membres)."
              value={montants.montantCotisation}
              fcfaPreview
              step={500}
              onChange={(n) => majMontants({ montantCotisation: n })}
            />
            <NumField
              label="Collation de base — par personne et par réunion"
              note="Sert quand aucune collation nominative n’est attribuée au membre (les collations créées ci-dessous s’additionnent pour leurs personnes)."
              value={montants.montantCollation}
              fcfaPreview
              step={250}
              onChange={(n) => majMontants({ montantCollation: n })}
            />
          </div>

          {/* — TYPES DE COTISATIONS (CRUD) — */}
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FFFDF6] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">Types de cotisations mensuelles</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#8A9288]">
              Tout le monde ne cotise pas la même somme : créez une somme (ex. 50 000 FCFA), sélectionnez les membres, validez. RÈGLE : un membre ne cotise qu’UNE seule somme mensuelle, TOUTE l’année, bénéficiaire inclus.
            </p>
            <div className="mt-2">
              <Btn small tone="violet" onClick={() => setFormCotisOpen((x) => !x)} aria-expanded={formCotisOpen}><Plus className="h-3.5 w-3.5" /> Ajouter une somme de cotisation mensuelle</Btn>
            </div>
            {formCotisOpen && (
              <div className="mt-2.5 rounded-2xl border-2 border-[#6E4B71]/40 bg-[#F7EFF8] p-3">
                <p className="text-[11.5px] font-black uppercase tracking-wider text-[#6E4B71]"><Layers className="mr-1 inline h-3.5 w-3.5" /> Nouveau type de cotisation mensuelle</p>
                <div className="mt-2 space-y-2.5">
                  <input
                    value={formCotis.nom}
                    onChange={(e) => setFormCotis((x) => ({ ...x, nom: e.target.value }))}
                    placeholder="Ex. Cotisation des fondateurs"
                    aria-label="Nom du nouveau type de cotisation"
                    className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] font-semibold text-[#2B3530] placeholder:font-normal placeholder:text-[#8A9288] outline-none focus:border-[#6E4B71]"
                  />
                  <NumField label="Somme mensuelle que ces membres verseront" note="Le montant démarre à 0 — c'est le bureau qui décide" value={formCotis.montant} fcfaPreview step={5_000}
                    onChange={(n) => setFormCotis((x) => ({ ...x, montant: n }))} />
                  <div className="rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#6E4B71]" /> Personnes habilitées — {formCotis.membreIds.length} sélectionnée(s)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Btn small tone="neutre" onClick={() => {
                          const libres = p.roster.filter((m) => !typeOccupant(m.id));
                          setFormCotis((x) => ({ ...x, membreIds: libres.map((m) => m.id) }));
                        }}>Tout cocher</Btn>
                        <Btn small tone="neutre" onClick={() => setFormCotis((x) => ({ ...x, membreIds: [] }))}>Tout décocher</Btn>
                      </div>
                    </div>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                      {p.roster.map((m) => {
                        const coche = formCotis.membreIds.includes(m.id);
                        const occupant = typeOccupant(m.id);
                        const bloque = !!occupant && !coche;
                        return (
                          <label key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#6E4B71]/8" : bloque ? "cursor-not-allowed bg-[#C05146]/4" : "cursor-pointer hover:bg-white"}`}>
                            {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#6E4B71]" /> : bloque ? <Ban className="h-4 w-4 shrink-0 text-[#C05146]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={coche}
                              aria-disabled={bloque}
                              onChange={() => {
                                if (bloque) {
                                  toast.error("Cette personne cotise déjà ailleurs", { description: `${m.name} est déjà attribué(e) au type « ${occupant!.nom} ». Un membre ne cotise qu'une seule somme mensuelle.` });
                                  return;
                                }
                                setFormCotis((x) => ({ ...x, membreIds: coche ? x.membreIds.filter((id) => id !== m.id) : [...x.membreIds, m.id] }));
                              }}
                            />
                            <span className={`text-[12px] font-semibold ${coche ? "text-[#6E4B71]" : bloque ? "text-[#A5473D]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                            {estMembreApp(m) && <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                            {bloque && (
                              <span className="ml-auto flex min-w-0 items-center gap-1 rounded-full bg-[#C89F62]/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8A6420]">
                                <Ban className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">déjà dans « {occupant!.nom} »</span>
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn small tone="violet" onClick={creerTypeCotis}><CheckCircle2 className="h-3.5 w-3.5" /> Créer ce type de cotisation</Btn>
                    <Btn small tone="neutre" onClick={() => setFormCotisOpen(false)}>Annuler</Btn>
                  </div>
                </div>
              </div>
            )}
            {typesCotis.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8A9288]">
                Aucun type créé pour l’instant — tout le monde cotise la cotisation de base.
              </p>
            ) : (
              <div className="mt-2.5 space-y-2.5">
                {typesCotis.map((t) => (
                  <div key={t.id} className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-[#6E4B71]" />
                      <input
                        value={t.nom}
                        onChange={(e) => majTypesCotis(typesCotis.map((y) => (y.id === t.id ? { ...y, nom: e.target.value } : y)))}
                        aria-label="Nom du type de cotisation"
                        className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
                      />
                      <button
                        type="button"
                        onClick={() => supprimerTypeCotis(t)}
                        aria-label={`Supprimer ${t.nom}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <NumField label="Somme que ces membres devront verser" value={t.montant} fcfaPreview step={5_000}
                        onChange={(n) => majTypesCotis(typesCotis.map((y) => (y.id === t.id ? { ...y, montant: n } : y)))} />
                    </div>
                    <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#6E4B71]" /> {t.membreIds.length} membre(s) doit(vent) cotiser {fcfa(t.montant)}
                      </p>
                      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                        {p.roster.map((m) => {
                          const coche = t.membreIds.includes(m.id);
                          const occupant = typeOccupant(m.id, t.id);
                          const bloque = !!occupant && !coche;
                          return (
                            <label key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#6E4B71]/8" : bloque ? "cursor-not-allowed bg-[#C05146]/4" : "cursor-pointer hover:bg-white"}`}>
                              {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#6E4B71]" /> : bloque ? <Ban className="h-4 w-4 shrink-0 text-[#C05146]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={coche}
                                aria-disabled={bloque}
                                onChange={() => {
                                  if (bloque) {
                                    toast.error("Cette personne cotise déjà ailleurs", { description: `${m.name} est déjà attribué(e) au type « ${occupant!.nom} ».` });
                                    return;
                                  }
                                  majTypesCotis(typesCotis.map((y) => (y.id === t.id ? { ...y, membreIds: coche ? y.membreIds.filter((id) => id !== m.id) : [...y.membreIds, m.id] } : y)));
                                }}
                              />
                              <span className={`text-[12px] font-semibold ${coche ? "text-[#6E4B71]" : bloque ? "text-[#A5473D]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                              {estMembreApp(m) && <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                              {bloque && (
                                <span className="ml-auto flex min-w-0 items-center gap-1 rounded-full bg-[#C89F62]/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8A6420]">
                                  <Ban className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">déjà dans « {occupant!.nom} »</span>
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Btn small tone="violet" onClick={() => validerTypeCotis(t)}><CheckCircle2 className="h-3.5 w-3.5" /> Valider l’attribution</Btn>
                      {t.valideLe && <P cls={OK_CLS}><Check className="h-3 w-3" /> Attribution validée — les membres sont notifiés</P>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* — COLLATIONS (CRUD) — */}
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FFFDF6] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">Collations</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#8A9288]">
              Ajoutez AUTANT de collations que la Tontine en décide : chaque collation a son nom, sa somme par personne et par réunion, et les personnes qui la paient. La part d’un membre = la somme des collations qui lui sont attribuées.
            </p>
            <div className="mt-2">
              <Btn small tone="violet" onClick={() => setFormCollOpen((x) => !x)} aria-expanded={formCollOpen}><Plus className="h-3.5 w-3.5" /> Ajouter une collation</Btn>
            </div>
            {formCollOpen && (
              <div className="mt-2.5 rounded-2xl border-2 border-[#6E4B71]/40 bg-[#F7EFF8] p-3">
                <p className="text-[11.5px] font-black uppercase tracking-wider text-[#6E4B71]"><Coffee className="mr-1 inline h-3.5 w-3.5" /> Nouvelle collation</p>
                <div className="mt-2 space-y-2.5">
                  <input
                    value={formColl.nom}
                    onChange={(e) => setFormColl((x) => ({ ...x, nom: e.target.value }))}
                    placeholder="Ex. Collation ordinaire"
                    aria-label="Nom de la nouvelle collation"
                    className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] font-semibold text-[#2B3530] placeholder:font-normal placeholder:text-[#8A9288] outline-none focus:border-[#6E4B71]"
                  />
                  <NumField label="Somme par personne et par réunion" note="Le montant démarre à 0 — c'est le bureau qui décide" value={formColl.montant} fcfaPreview step={250}
                    onChange={(n) => setFormColl((x) => ({ ...x, montant: n }))} />
                  <div className="rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#6E4B71]" /> Personnes qui paient cette collation — {formColl.membreIds.length} sélectionnée(s)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Btn small tone="neutre" onClick={() => setFormColl((x) => ({ ...x, membreIds: p.roster.map((m) => m.id) }))}>Tout cocher</Btn>
                        <Btn small tone="neutre" onClick={() => setFormColl((x) => ({ ...x, membreIds: [] }))}>Tout décocher</Btn>
                      </div>
                    </div>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                      {p.roster.map((m) => {
                        const coche = formColl.membreIds.includes(m.id);
                        return (
                          <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#6E4B71]/8" : "hover:bg-white"}`}>
                            {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#6E4B71]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={coche}
                              onChange={() => setFormColl((x) => ({ ...x, membreIds: coche ? x.membreIds.filter((id) => id !== m.id) : [...x.membreIds, m.id] }))}
                            />
                            <span className={`text-[12px] font-semibold ${coche ? "text-[#6E4B71]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                            {estMembreApp(m) && <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn small tone="violet" onClick={creerCollation}><CheckCircle2 className="h-3.5 w-3.5" /> Créer cette collation</Btn>
                    <Btn small tone="neutre" onClick={() => setFormCollOpen(false)}>Annuler</Btn>
                  </div>
                </div>
              </div>
            )}
            {collations.length === 0 ? (
              <p className="mt-2 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8A9288]">
                Aucune collation pour l’instant — ajoutez la première ci-dessus.
              </p>
            ) : (
              <div className="mt-2.5 space-y-2.5">
                {collations.map((c) => (
                  <div key={c.id} className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 shrink-0 text-[#6E4B71]" />
                      <input
                        value={c.nom}
                        onChange={(e) => majCollations(collations.map((y) => (y.id === c.id ? { ...y, nom: e.target.value } : y)))}
                        aria-label="Nom de la collation"
                        className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
                      />
                      <button
                        type="button"
                        onClick={() => supprimerCollation(c)}
                        aria-label={`Supprimer la collation ${c.nom}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <NumField label="Somme par personne et par réunion" value={c.montant} fcfaPreview step={250}
                        onChange={(n) => majCollations(collations.map((y) => (y.id === c.id ? { ...y, montant: n } : y)))} />
                    </div>
                    <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#6E4B71]" /> {c.membreIds.length} personne(s) paie(nt) cette collation
                      </p>
                      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                        {p.roster.map((m) => {
                          const coche = c.membreIds.includes(m.id);
                          return (
                            <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#6E4B71]/8" : "hover:bg-white"}`}>
                              {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#6E4B71]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={coche}
                                onChange={() => majCollations(collations.map((y) => (y.id === c.id ? { ...y, membreIds: coche ? y.membreIds.filter((id) => id !== m.id) : [...y.membreIds, m.id] } : y)))}
                              />
                              <span className={`text-[12px] font-semibold ${coche ? "text-[#6E4B71]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                              {estMembreApp(m) && <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Btn small tone="violet" onClick={() => validerCollation(c)}><CheckCircle2 className="h-3.5 w-3.5" /> Valider l’attribution</Btn>
                      {c.valideLe && <P cls={OK_CLS}><Check className="h-3 w-3" /> Attribution validée — les personnes sont notifiées</P>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ 2. ÉPARGNES — registre de la réunion + paramétrage ══════════════════════════ */

export function SecEpargnes(p: {
  /** Règl. du bureau — déjà chargé par le parent via loadReglement(). */
  regl: Reglement;
  moisCourantIdx: number | null;
  roster: Member[];
  parMembre: Map<string, Member>;
}): ReactNode {
  /* — MÊME SOURCE que le président : fc_epargnes_reunion_v1 — */
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  /* — paramétrage épargne : brouillon local du bloc reglement.epargne — */
  const [brouillonEp, setBrouillonEp] = useState<Reglement["epargne"]>(p.regl.epargne);
  const [dernierRegl, setDernierRegl] = useState(p.regl);

  useEffect(() => {
    const t0 = setTimeout(() => setEpargnes(loadEpargnesReunion()), 0);
    /* SYNC CROSS-ONGLET (v23) : une épargne ajoutée depuis la page du président
     * (autre onglet du navigateur) apparaît ici à la seconde — même clé de
     * stockage fc_epargnes_reunion_v1, échange via l'événement « storage ». */
    const onSync = (e: StorageEvent) => {
      if (!e.key || e.key === "fc_epargnes_reunion_v1") setEpargnes(loadEpargnesReunion());
    };
    window.addEventListener("storage", onSync);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  /* resynchronisation du brouillon quand le règlement change (pattern React :
   * ajustement de l'état AU RENDU quand une prop change — pas d'effet). */
  if (dernierRegl !== p.regl) {
    setDernierRegl(p.regl);
    setBrouillonEp(p.regl.epargne);
  }

  const taux = tauxEpargneVigueur(p.regl);

  /* — AUTO-PERSISTANCE : chaque mutation écrit IMMÉDIATEMENT — */
  const majEpargnes = (next: AttributionReunion[], message?: string) => {
    setEpargnes(next);
    saveEpargnesReunion(next);
    if (message) toast.success("Registre des épargnes mis à jour", { description: message });
  };
  const majEp = (patch: Partial<Reglement["epargne"]>) =>
    setBrouillonEp((x) => ({ ...x, ...patch }));
  const majTypeEpargne = (id: string, patch: Partial<TypeEpargneConfig>) =>
    setBrouillonEp((x) => ({ ...x, types: { ...x.types, [id]: { ...x.types[id], ...patch } } }));
  const enregistrerParamEpargne = () => {
    /* fusion au dernier moment : on relit le règlement courant pour n'écraser
     * QUE le bloc épargne (jamais les réglages faits ailleurs). */
    const courant = loadReglement();
    const next: Reglement = { ...courant, epargne: brouillonEp };
    saveReglement(next);
    toast.success("Paramétrage des épargnes enregistré", { description: `Taux en vigueur : ${tauxEpargneVigueur(next)} %/mois — le président et les membres voient le même règlement (même clé de stockage).` });
  };

  const typeEpargne = brouillonEp.typeChoisi ? TYPES_EPARGNE_CATALOGUE.find((t) => t.id === brouillonEp.typeChoisi) ?? null : null;

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6E4B71]">Poste secrétariat — épargnes</p>
            <p className="fc-serif text-[16px] font-black leading-tight text-[#2B3530]">Registre des épargnes de la réunion — tenu par la secrétaire</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
              La secrétaire inscrit les épargnes POUR LE BUREAU : mêmes mois réels, mêmes sommes, mêmes intérêts. ⚠ C’est LA MÊME SOURCE que la console du président (registre du bureau, clé fc_epargnes_reunion_v1) — les deux postes voient la même réalité.
            </p>
          </div>
          <P cls={VI_CLS}><PiggyBank className="h-3 w-3" /> Taux en vigueur : {taux} %/mois</P>
        </div>
      </FcCard>

      <RegistreReunionSection
        genre="epargnes"
        items={epargnes}
        parMembre={p.parMembre}
        roster={p.roster}
        taux={taux}
        moisCourantIdx={p.moisCourantIdx}
        onAttribuer={(membreId, montant, moisIdx) => {
          const m = p.parMembre.get(membreId);
          const next = [...epargnes, { id: nid(), membreId, montant, moisIdx }];
          majEpargnes(next, `Épargne de ${fcfa(montant)} attribuée à ${m?.name} par la secrétaire — rattachée à ${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}.`);
        }}
        onRetirer={(id) => {
          const e = epargnes.find((x) => x.id === id);
          if (!e) return;
          majEpargnes(epargnes.filter((x) => x.id !== id), `Épargne de ${p.parMembre.get(e.membreId)?.name} retirée du registre par la secrétaire (${fcfa(e.montant)} — rattachée à ${MOIS_FR[Math.min(11, Math.max(0, e.moisIdx))]}).`);
        }}
      />

      {/* ══════ PARAMÉTRAGE — épargnes (le paramétrage qui va avec) ══════ */}
      <Block
        title="Paramétrage — épargnes"
        icon={<Percent className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="La secrétaire règle POUR LE BUREAU le taux mensuel et les options du règlement (bloc « reglement.epargne », même clé que le président) : le taux peut être REMPLACÉ, RETIRÉ (0 %) ou rétabli au défaut de la maison (3 %/mois). Le membre voit tout cela en lecture seule."
      >
        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <KpiCard icon={<Percent className="h-3.5 w-3.5" />} label="Taux en vigueur" value={`${tauxEpargneVigueur({ ...p.regl, epargne: brouillonEp })} %/mois`} sub={brouillonEp.tauxFixe ? "Décision du bureau — remplace le défaut de la maison" : `Défaut de la maison (${TAUX_DEFAUT} %/mois)`} accent="#6E4B71" />
            <KpiCard icon={<Eye className="h-3.5 w-3.5" />} label="Règles de dépôt & retrait" value={`Préavis ${brouillonEp.preavisJours} j`} sub={`Dépôt min. ${fcfa(brouillonEp.depotMinFcfa)} — retrait max. ${brouillonEp.retraitMaxMois} % du solde/mois`} accent="#2F6B45" />
            <KpiCard icon={<PiggyBank className="h-3.5 w-3.5" />} label="Type d’épargne" value={typeEpargne?.nom ?? "Aucun"} sub={typeEpargne?.description ?? "Sans type, le membre voit « à fixer par le bureau »."} accent="#C89F62" />
          </div>

          <NumField
            label="Taux mensuel de l’épargne"
            note={brouillonEp.tauxFixe ? "Ce taux est la décision du bureau : il s’applique à tous les membres" : `Préparé mais non appliqué — tant que la décision n’est pas activée, le défaut (${TAUX_DEFAUT} %/mois) reste en vigueur`}
            unite="% / mois"
            step={0.5}
            value={brouillonEp.tauxMensuel}
            onChange={(n) => majEp({ tauxMensuel: n })}
          />
          <ToggleRow
            label="Appliquer ce taux comme décision du bureau"
            note={brouillonEp.tauxFixe
              ? `En vigueur : ${brouillonEp.tauxMensuel} %/mois — remplace le défaut (${TAUX_DEFAUT} %) pour tous les membres`
              : `Désactivé — le défaut de la maison (${TAUX_DEFAUT} %/mois) reste en vigueur`}
            actif={brouillonEp.tauxFixe}
            onToggle={() => majEp({ tauxFixe: !brouillonEp.tauxFixe })}
          />
          <div className="flex flex-wrap gap-2">
            <Btn small tone="rouge" onClick={() => majEp({ tauxMensuel: 0, tauxFixe: true })}><XCircle className="h-3.5 w-3.5" /> Retirer les intérêts (0 %)</Btn>
            <Btn small tone="neutre" onClick={() => majEp({ tauxMensuel: TAUX_DEFAUT, tauxFixe: false })}><RotateCcw className="h-3.5 w-3.5" /> Rétablir le défaut ({TAUX_DEFAUT} %/mois)</Btn>
          </div>

          <Seg
            legende="Manière de collecter les intérêts — décidée par le bureau"
            value={brouillonEp.collecteInterets}
            onChange={(v) => majEp({ collecteInterets: v as Reglement["epargne"]["collecteInterets"] })}
            options={(Object.keys(COLLECTE_INTERETS_LABELS) as Reglement["epargne"]["collecteInterets"][]).map((k) => ({ v: k, label: COLLECTE_INTERETS_LABELS[k] }))}
          />
          <p className="rounded-xl bg-[#2A4A3A]/5 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
            {COLLECTE_INTERETS_NOTES[brouillonEp.collecteInterets]}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <NumField label="Préavis de retrait" note="Jours de préavis avant tout retrait" unite="jours" value={brouillonEp.preavisJours}
              onChange={(n) => majEp({ preavisJours: n })} />
            <NumField label="Dépôt minimum" value={brouillonEp.depotMinFcfa} fcfaPreview step={1_000}
              onChange={(n) => majEp({ depotMinFcfa: n })} />
            <NumField label="Retrait maximal par mois" note="En pourcentage du solde" unite="% du solde" value={brouillonEp.retraitMaxMois}
              onChange={(n) => majEp({ retraitMaxMois: n })} />
          </div>

          <label className="block rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
            <span className="block text-[11.5px] font-bold text-[#2B3530]">Type d’épargne proposé par la Tontine</span>
            <span className="mt-0.5 block text-[10.5px] text-[#8A9288]">Choisissez dans la liste : le type d’intérêt et les champs propres à ce type apparaissent ensuite.</span>
            <select
              value={brouillonEp.typeChoisi ?? ""}
              onChange={(e) => majEp({ typeChoisi: e.target.value || null })}
              className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              <option value="">— Aucun type choisi pour l’instant —</option>
              {TYPES_EPARGNE_CATALOGUE.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </label>
          {typeEpargne && brouillonEp.types[typeEpargne.id] && (
            <div className="rounded-2xl border-2 border-[#6E4B71]/40 bg-[#6E4B71]/8 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-black text-[#6E4B71]"><Sparkles className="h-3.5 w-3.5" /> Épargne choisie : {typeEpargne.nom}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[#6E4B71]/85">{typeEpargne.description}</p>
              <div className="mt-2 space-y-2">
                <Seg
                  legende="Type d’intérêt de cette épargne"
                  value={brouillonEp.types[typeEpargne.id].interet}
                  onChange={(v) => majTypeEpargne(typeEpargne.id, { interet: v as TypeEpargneConfig["interet"] })}
                  options={(Object.keys(INTERETS_EPARGNE_LABELS) as TypeEpargneConfig["interet"][]).map((k) => ({ v: k, label: INTERETS_EPARGNE_LABELS[k] }))}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <NumField label="Taux de cette épargne" unite="% / mois" step={0.5} value={brouillonEp.types[typeEpargne.id].tauxMensuel}
                    onChange={(n) => majTypeEpargne(typeEpargne.id, { tauxMensuel: n })} />
                  <NumField label="Durée de blocage" note="0 = pas de blocage" unite="mois" value={brouillonEp.types[typeEpargne.id].blocageMois}
                    onChange={(n) => majTypeEpargne(typeEpargne.id, { blocageMois: n })} />
                  <NumField label="Dépôt minimum de cette épargne" value={brouillonEp.types[typeEpargne.id].depotMinFcfa} fcfaPreview step={1_000}
                    onChange={(n) => majTypeEpargne(typeEpargne.id, { depotMinFcfa: n })} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Btn tone="violet" onClick={enregistrerParamEpargne}><CheckCircle2 className="h-4 w-4" /> Enregistrer le paramétrage des épargnes</Btn>
            <p className="text-[10.5px] font-semibold leading-snug text-[#8A6420] sm:max-w-[55%] sm:text-right">
              Enregistré dans le RÈGLEMENT DU BUREAU (même clé que le président) — la publication aux membres reste un geste de la console président.
            </p>
          </div>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ 3. PRÊTS & GARANTIES — registre + dossiers + paramétrage ══════════════════════════ */

export function SecPrets(p: {
  regl: Reglement;
  moisCourantIdx: number | null;
  roster: Member[];
  parMembre: Map<string, Member>;
}): ReactNode {
  /* — MÊME SOURCE que le président : fc_prets_reunion_v1 — */
  const [pretsReunion, setPretsReunion] = useState<AttributionReunion[]>([]);
  /* — NOUVELLE CLÉ : dossiers de prêt des membres (seed = démo du président) — */
  const [pretsDemandes, setPretsDemandes] = useState<PretDemande[]>([]);
  /* — paramétrage prêts : brouillon local du bloc reglement.prets — */
  const [brouillonPr, setBrouillonPr] = useState<Reglement["prets"]>(p.regl.prets);
  const [dernierRegl, setDernierRegl] = useState(p.regl);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setPretsReunion(loadPretsReunion());
      setPretsDemandes(loadPretsDemandesSec());
    }, 0);
    /* SYNC CROSS-ONGLET (v23) : registres tenus AUSSI par le président —
     * toute modification dans un autre onglet est répercutée à la seconde. */
    const onSync = (e: StorageEvent) => {
      if (e.key === "fc_prets_reunion_v1") setPretsReunion(loadPretsReunion());
      if (e.key === "fc_prets_demandes_v1") setPretsDemandes(loadPretsDemandesSec());
    };
    window.addEventListener("storage", onSync);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  if (dernierRegl !== p.regl) {
    setDernierRegl(p.regl);
    setBrouillonPr(p.regl.prets);
  }

  const taux = p.regl.prets.tauxMensuel || TAUX_DEFAUT;
  const duree = p.regl.prets.dureeMaxMois > 0 ? p.regl.prets.dureeMaxMois : 6;
  const periode = p.regl.prets.reconductionCapital ? (p.regl.prets.periodeCapitalisationMois > 0 ? p.regl.prets.periodeCapitalisationMois : 3) : 0;

  /* — AUTO-PERSISTANCE : chaque mutation écrit IMMÉDIATEMENT — */
  const majPretsReunion = (next: AttributionReunion[], message?: string) => {
    setPretsReunion(next);
    savePretsReunion(next);
    if (message) toast.success("Registre des prêts à la réunion mis à jour", { description: message });
  };
  const majPretsDemandes = (next: PretDemande[], message?: string) => {
    setPretsDemandes(next);
    ecrireSec(CLE_PRETS_DEMANDES, next);
    if (message) toast.success("Dossiers de prêt mis à jour", { description: message });
  };
  const majPret = (id: string, patch: Partial<PretDemande>) =>
    majPretsDemandes(pretsDemandes.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const majPr = (patch: Partial<Reglement["prets"]>) =>
    setBrouillonPr((x) => ({ ...x, ...patch }));
  const majGarantie = (cle: keyof Reglement["prets"]["garanties"]) =>
    setBrouillonPr((x) => ({ ...x, garanties: { ...x.garanties, [cle]: !x.garanties[cle] } }));
  const enregistrerParamPrets = () => {
    /* fusion au dernier moment : on n'écrase QUE le bloc prêts du règlement. */
    const courant = loadReglement();
    const next: Reglement = { ...courant, prets: brouillonPr };
    saveReglement(next);
    toast.success("Paramétrage des prêts enregistré", { description: `Taux ${next.prets.tauxMensuel || TAUX_DEFAUT} %/mois · durée max ${next.prets.dureeMaxMois > 0 ? next.prets.dureeMaxMois : 6} mois — même clé de stockage que le président.` });
  };

  /* — dossiers : accorder / refuser / vote bureau (copie du président) — */
  const accorderPret = (pr: PretDemande) => {
    if (pr.president) { toast.error("Conflit d’intérêts", { description: "Le dossier du président est statué par le bureau sans sa voix — voyez le vote 2/3 ci-dessous." }); return; }
    if (!pr.avalisteId) { toast.error("Désignez d’abord un avaliste fiable"); return; }
    if (!pr.cosignTresorier) { toast.error("La co-signature du trésorier est requise (supervision à deux)"); return; }
    majPret(pr.id, { statut: "accorde" });
    const m = p.parMembre.get(pr.membreId);
    const av = pr.avalisteId ? p.parMembre.get(pr.avalisteId) : null;
    toast.success("Prêt accordé", { description: `${fcfa(pr.montant)} à ${m?.name} — avaliste : ${av?.name}. Décaissement par le trésorier, au taux de ${taux} %/mois.` });
  };
  const refuserPret = (pr: PretDemande) => {
    if (!pr.motifRefus.trim()) { toast.error("Indiquez le motif du refus (transparence envers le membre)"); return; }
    majPret(pr.id, { statut: "refuse" });
    toast("Prêt refusé", { description: `${p.parMembre.get(pr.membreId)?.name} est notifié avec le motif — possibilité de réintroduire le dossier.` });
  };
  const voterPretBureau = (id: string, qui: "vice" | "tresorier" | "censeur", pour: boolean) => {
    const next = pretsDemandes.map((x) => {
      if (x.id !== id) return x;
      const votes = { vice: null, tresorier: null, censeur: null, ...(x.votesBureau ?? {}), [qui]: pour } as NonNullable<PretDemande["votesBureau"]>;
      return { ...x, votesBureau: votes };
    });
    majPretsDemandes(next);
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6E4B71]">Poste secrétariat — prêts & garanties</p>
            <p className="fc-serif text-[16px] font-black leading-tight text-[#2B3530]">Prêts faits à la réunion — registre tenu par la secrétaire</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
              La secrétaire inscrit les prêts POUR LE BUREAU : mois réels, sommes, intérêts au taux en vigueur ({taux} %/mois), avances de remboursement et remboursements confirmés. ⚠ C’est LA MÊME SOURCE que la console du président (registre du bureau, clé fc_prets_reunion_v1) — les deux postes voient la même réalité.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <P cls={VI_CLS}><HandCoins className="h-3 w-3" /> {taux} %/mois</P>
            <P cls={TE_CLS}><Hourglass className="h-3 w-3" /> échéance {duree} mois</P>
          </div>
        </div>
      </FcCard>

      <RegistreReunionSection
        genre="prets"
        items={pretsReunion}
        parMembre={p.parMembre}
        roster={p.roster}
        taux={taux}
        moisCourantIdx={p.moisCourantIdx}
        duree={duree}
        periode={periode}
        onAttribuer={(membreId, montant, moisIdx) => {
          const m = p.parMembre.get(membreId);
          const next = [...pretsReunion, { id: nid(), membreId, montant, moisIdx }];
          majPretsReunion(next, `Prêt de ${fcfa(montant)} à la réunion attribué à ${m?.name} par la secrétaire — rattaché à ${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}.`);
        }}
        onRetirer={(id) => {
          const pr = pretsReunion.find((x) => x.id === id);
          if (!pr) return;
          majPretsReunion(pretsReunion.filter((x) => x.id !== id), `Prêt de ${p.parMembre.get(pr.membreId)?.name} retiré du registre par la secrétaire (${fcfa(pr.montant)} — rattaché à ${MOIS_FR[Math.min(11, Math.max(0, pr.moisIdx))]}).`);
        }}
        onAjouterAvance={(id, montant, moisIdx) => {
          const pr = pretsReunion.find((x) => x.id === id);
          if (!pr) return;
          const m = p.parMembre.get(pr.membreId);
          const next = pretsReunion.map((x) =>
            x.id === id ? { ...x, avances: [...(x.avances ?? []), { id: nid(), montant, moisIdx: Math.min(11, Math.max(0, moisIdx)) }] } : x,
          );
          majPretsReunion(next, `Avance de remboursement de ${fcfa(montant)} versée à ${m?.name} (${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}).`);
        }}
        onRetirerAvance={(id, avanceId) => {
          const pr = pretsReunion.find((x) => x.id === id);
          const av = pr?.avances?.find((a) => a.id === avanceId);
          if (!pr || !av) return;
          const next = pretsReunion.map((x) => (x.id === id ? { ...x, avances: (x.avances ?? []).filter((a) => a.id !== avanceId) } : x));
          majPretsReunion(next, `Avance de ${fcfa(av.montant)} retirée du prêt de ${p.parMembre.get(pr.membreId)?.name}.`);
        }}
        onConfirmerRemboursement={(id, rembourse) => {
          const pr = pretsReunion.find((x) => x.id === id);
          if (!pr) return;
          const m = p.parMembre.get(pr.membreId);
          const next = pretsReunion.map((x) => (x.id === id ? { ...x, rembourse } : x));
          const totalR = (pr.avances ?? []).filter((a) => a.moisIdx <= rembourse.moisIdx).reduce((s, a) => s + a.montant, 0) + rembourse.montant;
          majPretsReunion(next, `Remboursement confirmé par la secrétaire — le prêt de ${m?.name} (${fcfa(pr.montant)}) quitte le registre actif. Total rendu : ${fcfa(totalR)} ; visible dans « Prêts remboursés ».`);
        }}
        onAnnulerRemboursement={(id) => {
          const pr = pretsReunion.find((x) => x.id === id);
          if (!pr) return;
          const next = pretsReunion.map((x) => (x.id === id ? { ...x, rembourse: null } : x));
          majPretsReunion(next, `Remboursement annulé — le prêt de ${p.parMembre.get(pr.membreId)?.name} revient dans le registre actif.`);
        }}
      />

      {/* — DOSSIERS DE PRÊT DES MEMBRES (demandes à la caisse) — */}
      <Block
        title="Dossiers de prêt des membres — emprunts à la caisse"
        icon={<ShieldCheck className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="Les demandes déposées par les membres : décision du bureau (la secrétaire instruit pour le bureau), avaliste, co-signature — le calendrier d’évolution de CHAQUE prêt (intérêts, mensualité, reste dû) s’affiche sous le dossier, avec la reconduction du capital non remboursé si elle est activée."
      >
        <div className="space-y-3.5 p-4">
          {pretsDemandes.map((pr) => {
            const m = p.parMembre.get(pr.membreId);
            const av = pr.avalisteId ? p.parMembre.get(pr.avalisteId) : null;
            const moisIdx = pr.moisIdx ?? p.moisCourantIdx ?? 0;
            return (
              <FcCard key={pr.id} className={`p-4 ${pr.statut === "refuse" ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-[#2B3530]">{m?.name}{pr.president ? " (dossier du président — récusé)" : ""} — {fcfa(pr.montant)}</p>
                    {pr.motif && <p className="text-[12px] text-[#8A9288]">{pr.motif}</p>}
                  </div>
                  {pr.statut === "en_attente" ? (pr.president
                    ? <P cls={OR_CLS}><Vote className="h-3 w-3" /> Vote bureau 2/3</P>
                    : <P cls={OR_CLS}><Hourglass className="h-3 w-3" /> À statuer</P>)
                    : pr.statut === "accorde" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Accordé</P>
                      : <P cls={RJ_CLS}><XCircle className="h-3 w-3" /> Refusé</P>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pr.garanties && <P cls={TE_CLS}><Landmark className="h-3 w-3" /> Garantie : {pr.garanties}</P>}
                  {av && <P cls={OK_CLS}><ShieldCheck className="h-3 w-3" /> Avaliste : {av.name}</P>}
                  {pr.cosignTresorier && <P cls={OK_CLS}><Wallet className="h-3 w-3" /> Co-signé par le trésorier</P>}
                </div>

                {/* — ÉVOLUTION DU PRÊT, mois par mois — */}
                {pr.statut !== "refuse" && (
                  <div className="mt-3 border-t border-[#E5DCC0] pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-black text-[#6E4B71]">Calendrier de remboursement — évolution du prêt</p>
                      <P cls={TE_CLS}><CalendarClock className="h-3 w-3" /> Rattaché à {MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}</P>
                    </div>
                    <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#4A554E]">
                      {fcfa(pr.montant)} à {taux} %/mois sur {duree} mois — intérêts de {fcfa(Math.round(pr.montant * (taux / 100)))} par mois. S’il déborde sur l’année suivante, c’est marqué.
                      {periode > 0 && ` Si le prêt n’est pas remboursé à l’échéance, la somme due devient un NOUVEAU CAPITAL (reconduction tous les ${periode} mois) — l’évolution reste visible mois par mois.`}
                    </p>
                    <div className="mt-2">
                      <TableCalendrierPret
                        lignes={lignesCalendrierPret(pr.montant, taux, duree, moisIdx, periode)}
                        montant={pr.montant}
                        nomMembre={m?.name ?? "Membre"}
                        infoMembre={av ? `Avaliste (garant du remboursement) : ${av.name}${pr.garanties ? ` · Garantie : ${pr.garanties}` : ""}` : pr.garanties ? `Garantie : ${pr.garanties}` : undefined}
                      />
                    </div>
                  </div>
                )}

                {pr.statut === "en_attente" && pr.president && (
                  <div className="mt-3 space-y-2.5 border-t border-[#E5DCC0] pt-3">
                    <p className="flex items-start gap-2 rounded-xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#7A5B2E]">
                      <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                      Dossier du président — récusation : le bureau statue sans sa voix. Majorité de 2/3 (vice-présidente, trésorier, censeur).
                    </p>
                    <div className="space-y-1.5">
                      {VOTEURS_PRET.map((v) => {
                        const val = pr.votesBureau?.[v.qui] ?? null;
                        return (
                          <div key={v.qui} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12.5px] font-bold text-[#2B3530]">{v.nom}</p>
                              <p className="text-[10.5px] text-[#8A9288]">{v.role}</p>
                            </div>
                            <Btn small tone={val === true ? "vert" : "neutre"} onClick={() => voterPretBureau(pr.id, v.qui, true)}><ThumbsUp className="h-3.5 w-3.5" /> Pour</Btn>
                            <Btn small tone={val === false ? "rouge" : "neutre"} onClick={() => voterPretBureau(pr.id, v.qui, false)}><ThumbsDown className="h-3.5 w-3.5" /> Contre</Btn>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {pr.statut === "en_attente" && !pr.president && (
                  <div className="mt-3 space-y-2.5 border-t border-[#E5DCC0] pt-3">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#6E4B71]">Avaliste (garant du remboursement)</span>
                      <select
                        value={pr.avalisteId ?? ""}
                        onChange={(e) => majPret(pr.id, { avalisteId: e.target.value || null })}
                        className="mt-1 w-full rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2.5 text-[13px] text-[#2B3530] focus:outline-none"
                      >
                        <option value="">Choisir un membre…</option>
                        {p.roster.filter((x) => x.id !== pr.membreId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-2.5 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={pr.cosignTresorier}
                        onChange={(e) => majPret(pr.id, { cosignTresorier: e.target.checked })}
                        className="h-4.5 w-4.5 accent-[#6E4B71]"
                      />
                      <span className="text-[12.5px] font-semibold text-[#2B3530]">Co-signature du trésorier obtenue (contrôle du duo)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Btn small tone="violet" onClick={() => accorderPret(pr)}><BadgeCheck className="h-3.5 w-3.5" /> Accorder le prêt</Btn>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={pr.motifRefus}
                        onChange={(e) => majPret(pr.id, { motifRefus: e.target.value })}
                        placeholder="Motif d’un éventuel refus (transmis au membre)…"
                        className="min-w-0 flex-1 rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[12.5px] placeholder:text-[#8A9288] focus:outline-none"
                      />
                      <Btn small tone="rouge" onClick={() => refuserPret(pr)}><XCircle className="h-3.5 w-3.5" /> Refuser</Btn>
                    </div>
                  </div>
                )}
                {pr.statut === "refuse" && pr.motifRefus && (
                  <p className="mt-2 rounded-lg bg-[#A5473D]/8 px-3 py-2 text-[12px] text-[#A5473D]">Motif du refus : {pr.motifRefus}</p>
                )}
              </FcCard>
            );
          })}
        </div>
      </Block>

      {/* ══════ PARAMÉTRAGE — prêts (le paramétrage qui va avec) ══════ */}
      <Block
        title="Paramétrage — prêts & garanties"
        icon={<ShieldCheck className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="La secrétaire règle POUR LE BUREAU le bloc « reglement.prets » (même clé que le président) : taux mensuel, plafond, durée maximale, carence, co-signature, garanties acceptées — et la règle de RECONDUCTION du capital non remboursé (la somme due devient un nouveau capital, l’évolution se voit mois par mois dans les calendriers)."
      >
        <div className="space-y-2 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <NumField label="Taux mensuel des prêts" note="Règle commune (0 = à décider — le défaut de la maison s’applique)" unite="% / mois" step={0.5} value={brouillonPr.tauxMensuel}
              onChange={(n) => majPr({ tauxMensuel: n })} />
            <NumField label="Plafond d’un prêt" note="Somme maximale pouvant être accordée" value={brouillonPr.plafondFcfa} fcfaPreview step={25_000}
              onChange={(n) => majPr({ plafondFcfa: n })} />
            <NumField label="Durée maximale de remboursement" note="Échéance du capital — au-delà, reconduction si activée" unite="mois" value={brouillonPr.dureeMaxMois}
              onChange={(n) => majPr({ dureeMaxMois: n })} />
            <NumField label="Ancienneté requise (carence)" note="Mois de cotisation avant le 1ᵉʳ prêt" unite="mois" value={brouillonPr.carenceMois}
              onChange={(n) => majPr({ carenceMois: n })} />
          </div>
          <ToggleRow
            label="Co-signature du trésorier"
            note="Activez pour exiger le visa du trésorier sur chaque accord (supervision à deux)"
            actif={brouillonPr.cosignTresorier}
            onToggle={() => majPr({ cosignTresorier: !brouillonPr.cosignTresorier })}
          />

          {/* — GARANTIES ACCEPTÉES POUR UN PRÊT — */}
          <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
            <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]"><Landmark className="h-3.5 w-3.5" /> Garanties acceptées pour un prêt</p>
            <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Toutes désactivées par défaut — activez celles que la Tontine accepte.</p>
            <div className="mt-2 space-y-1.5">
              {(Object.keys(GARANTIES_LABELS) as (keyof Reglement["prets"]["garanties"])[]).map((k) => (
                <ToggleRow key={k} label={GARANTIES_LABELS[k]} actif={brouillonPr.garanties[k]} onToggle={() => majGarantie(k)} />
              ))}
            </div>
          </div>

          {/* — RECONDUCTION DU CAPITAL NON REMBOURSÉ — */}
          <div className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#8A6420]"><TrendingUp className="h-3.5 w-3.5" /> Reconduction du capital non remboursé</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#5C6B60]">
              <strong className="text-[#6E4B71]">La règle :</strong> si un prêt n’est pas remboursé après sa durée maximale, la somme due — capital + intérêts courus — constitue un <strong className="text-[#6E4B71]">NOUVEAU CAPITAL</strong> sur lequel le pourcentage est de nouveau calculé, tous les N mois, tant que ce n’est pas remboursé. L’évolution se voit MOIS PAR MOIS dans le calendrier de chaque prêt.
            </p>
            <p className="mt-1.5 rounded-xl bg-[#2A4A3A]/5 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
              <strong className="text-[#6E4B71]">L’exemple du bureau :</strong> 10 000 FCFA prêtés en janvier à 3 %/mois → mars : 10 900. Si mars passe sans remboursement, 10 900 devient le nouveau capital → juin : ≈ 11 881. Et ainsi de suite.
            </p>
            <div className="mt-2 space-y-2">
              <ToggleRow
                label="Reconduire le capital non remboursé en nouveau prêt"
                note={brouillonPr.reconductionCapital
                  ? `Active — tous les ${brouillonPr.periodeCapitalisationMois || "…"} mois, la somme due devient le nouveau capital`
                  : "Désactivée — le prêt suit le calendrier normal et s’arrête à l’échéance"}
                actif={brouillonPr.reconductionCapital}
                onToggle={() => majPr({ reconductionCapital: !brouillonPr.reconductionCapital, ...(!brouillonPr.reconductionCapital && brouillonPr.periodeCapitalisationMois === 0 ? { periodeCapitalisationMois: 3 } : {}) })}
              />
              <NumField
                label="Période de capitalisation — la nouvelle dette est recalculée tous les N mois"
                note="Mois qui séparent chaque reconstitution du capital (exemple du bureau : 3 mois). 0 = jamais."
                unite="mois"
                value={brouillonPr.periodeCapitalisationMois}
                onChange={(n) => majPr({ periodeCapitalisationMois: n })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <Btn tone="violet" onClick={enregistrerParamPrets}><CheckCircle2 className="h-4 w-4" /> Enregistrer le paramétrage des prêts</Btn>
            <p className="text-[10.5px] font-semibold leading-snug text-[#8A6420] sm:max-w-[55%] sm:text-right">
              Enregistré dans le RÈGLEMENT DU BUREAU (même clé que le président) — les calendriers du registre suivent aussitôt.
            </p>
          </div>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ 4. SOLIDARITÉ — votes, types, visites ══════════════════════════ */

export function SecSolidarite(p: {
  regl: Reglement;
  moisCourantIdx: number | null;
  roster: Member[];
  parMembre: Map<string, Member>;
}): ReactNode {
  /* — NOUVELLES CLÉS : évènements + caisse (seeds = démo du président) —
   * — MÊMES SOURCES que le président : types, mains levées, visites — */
  const [evs, setEvs] = useState<EvVie[]>([]);
  const [caisseSecours, setCaisseSecours] = useState(0);
  const [typesSolidarite, setTypesSolidarite] = useState<TypeSolidarite[]>([]);
  const [mainsLevees, setMainsLevees] = useState<MainLevee[]>([]);
  const [visites, setVisites] = useState<VisiteSolidarite[]>([]);

  /* — formulaires (copie du président) — */
  const [nomType, setNomType] = useState("");
  const [sommeType, setSommeType] = useState("");
  const [delaiType, setDelaiType] = useState("1");
  const [nomMain, setNomMain] = useState("");
  const [noteMain, setNoteMain] = useState("");
  const [visMembreId, setVisMembreId] = useState<string | null>(null);
  const [visType, setVisType] = useState("");
  const [visMois, setVisMois] = useState<number | null>(null);
  const [visDelegation, setVisDelegation] = useState("");
  const [visNote, setVisNote] = useState("");

  useEffect(() => {
    const t0 = setTimeout(() => {
      setEvs(loadEvsSec()); // fc_solidarite_evs_v1
      setCaisseSecours(loadCaisseSecoursSec()); // fc_solidarite_caisse_v1
      setTypesSolidarite(loadTypesSolidarite()); // fc_solidarite_types_v1 — même source que le président
      setMainsLevees(loadMainsLevees()); // fc_mains_levees_v1
      setVisites(loadVisitesSolidarite()); // fc_visites_solidarite_v1
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  const moisVisite = visMois ?? Math.max(0, Math.min(11, p.moisCourantIdx ?? 0));

  /* — AUTO-PERSISTANCE : chaque mutation écrit IMMÉDIATEMENT — */
  const majTypesSolidarite = (next: TypeSolidarite[], message?: string) => {
    setTypesSolidarite(next);
    saveTypesSolidarite(next);
    if (message) toast.success("Types de solidarité mis à jour", { description: message });
  };
  const majMainsLevees = (next: MainLevee[], message?: string) => {
    setMainsLevees(next);
    saveMainsLevees(next);
    if (message) toast.success("Mains levées mises à jour", { description: message });
  };
  const majVisites = (next: VisiteSolidarite[], message?: string) => {
    setVisites(next);
    saveVisitesSolidarite(next);
    if (message) toast.success("Calendrier des visites mis à jour", { description: message });
  };

  /* — votes du bureau & décaissement (copie du président, persistés) — */
  const proposerAide = (e: EvVie, montant: number) => {
    const next = evs.map((x) => (x.id === e.id ? { ...x, statut: "en_vote" as const, montant } : x));
    setEvs(next);
    ecrireSec(CLE_EVS, next);
    toast("Aide soumise au vote du bureau", { description: `${fcfa(montant)} proposés — les 4 membres votants sont notifiés.` });
  };
  const voter = (e: EvVie, qui: keyof VoteBureau, pour: boolean) => {
    const next = evs.map((x) => {
      if (x.id !== e.id) return x;
      const votes = { ...x.votes, [qui]: pour } as VoteBureau;
      const pourCount = Object.values(votes).filter((v) => v === true).length;
      const statut = pourCount >= 3 ? "approuve" as const : x.statut;
      if (pourCount >= 3 && x.statut !== "approuve") toast.success("Majorité atteinte (3/4)", { description: "L’aide est approuvée — décaissement possible via le trésorier." });
      return { ...x, votes, statut };
    });
    setEvs(next);
    ecrireSec(CLE_EVS, next);
  };
  const decaisser = (e: EvVie) => {
    const nextEvs = evs.map((x) => (x.id === e.id ? { ...x, statut: "decaisse" as const } : x));
    const nextCaisse = Math.max(0, caisseSecours - (e.montant ?? 0));
    setEvs(nextEvs);
    ecrireSec(CLE_EVS, nextEvs);
    setCaisseSecours(nextCaisse);
    ecrireSec(CLE_CAISSE, nextCaisse);
    toast.success(`${fcfa(e.montant ?? 0)} décaissés`, { description: `Le trésorier remet l’aide à ${p.parMembre.get(e.membreId)?.name} — reçu archivé par la secrétaire.` });
  };

  /* — types de solidarité (copie du président) — */
  const ajouterType = () => {
    const nom = nomType.trim();
    if (!nom) { toast.error("Donnez d’abord un nom au type de solidarité"); return; }
    const somme = Math.max(0, Number(sommeType || 0));
    const delai = Math.max(0, Math.round(Number(delaiType || 0)));
    const next = [...typesSolidarite, { id: nid(), nom, somme, delaiMois: delai, variables: [] }];
    majTypesSolidarite(next, `Type de solidarité « ${nom} » créé par la secrétaire — somme de base ${fcfa(somme)}, à jour (ou remboursé) sous ${delai} mois.`);
    setNomType(""); setSommeType(""); setDelaiType("1");
  };
  const retirerType = (t: TypeSolidarite) => {
    majTypesSolidarite(typesSolidarite.filter((x) => x.id !== t.id), `Type de solidarité « ${t.nom} » retiré — les visites rattachées restent au calendrier, sans type.`);
  };
  const attribuerMembreType = (t: TypeSolidarite, m: Member) => {
    if (t.variables.some((v) => v.membreId === m.id)) {
      toast(`${m.name} est déjà attribué à « ${t.nom} »`, { description: "Ajustez sa somme dans les variables du type ci-dessous." });
      return;
    }
    const next = typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: [...x.variables, { id: nid(), membreId: m.id, montant: x.somme }] } : x,
    );
    majTypesSolidarite(next, `${m.name} est attribué au type « ${t.nom} » — somme préremplie à ${fcfa(t.somme)}, ajustable dans les variables.`);
  };
  const majMontantVariable = (t: TypeSolidarite, v: VariableSolidarite, montant: number) => {
    const next = typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: x.variables.map((y) => (y.id === v.id ? { ...y, montant: Math.max(0, Math.round(montant)) } : y)) } : x,
    );
    majTypesSolidarite(next);
  };
  const retirerVariable = (t: TypeSolidarite, v: VariableSolidarite) => {
    const m = p.parMembre.get(v.membreId);
    const next = typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: x.variables.filter((y) => y.id !== v.id) } : x,
    );
    majTypesSolidarite(next, `${m?.name ?? "Le membre"} n’est plus attribué au type « ${t.nom} ».`);
  };

  /* — mains levées — */
  const ajouterMain = () => {
    const nom = nomMain.trim();
    if (!nom) { toast.error("Donnez d’abord un nom à cette main levée"); return; }
    const next = [...mainsLevees, { id: nid(), nom, note: noteMain.trim() }];
    majMainsLevees(next, `Type de main levée « ${nom} » ajouté — utilisable en réunion.`);
    setNomMain(""); setNoteMain("");
  };
  const retirerMain = (ml: MainLevee) => {
    majMainsLevees(mainsLevees.filter((x) => x.id !== ml.id), `Type de main levée « ${ml.nom} » retiré.`);
  };

  /* — visites — */
  const ajouterVisite = () => {
    if (!visMembreId) { toast.error("Choisissez d’abord le membre à visiter (recherche dynamique)"); return; }
    const m = p.parMembre.get(visMembreId);
    const t = typesSolidarite.find((x) => x.id === visType) ?? null;
    const delegation = visDelegation.trim();
    const next = [...visites, { id: nid(), membreId: visMembreId, typeId: t?.id ?? null, moisIdx: moisVisite, delegation, note: visNote.trim() }];
    majVisites(next, `Visite de solidarité planifiée en ${MOIS_FR[moisVisite]} chez ${m?.name}${t ? ` (${t.nom})` : ""}${delegation ? ` — délégation : ${delegation}` : ""}.`);
    setVisMembreId(null); setVisType(""); setVisDelegation(""); setVisNote("");
  };
  const retirerVisite = (v: VisiteSolidarite) => {
    majVisites(visites.filter((x) => x.id !== v.id), `Visite de ${MOIS_FR[Math.min(11, Math.max(0, v.moisIdx))]} retirée du calendrier des visites.`);
  };

  const visitesTriees = [...visites].sort((a, b) => a.moisIdx - b.moisIdx);

  const methodeSol = METHODES_SOLIDARITE.find((m) => m.id === p.regl.solidarite.methode) ?? null;

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#6E4B71]">Poste secrétariat — solidarité</p>
            <p className="fc-serif text-[16px] font-black leading-tight text-[#2B3530]">Caisse de secours & entraide — tenus par la secrétaire</p>
          </div>
          <P cls={TE_CLS}><HeartHandshake className="h-3 w-3" /> Mariages · naissances · deuils · maladies</P>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <KpiCard icon={<Coins className="h-3.5 w-3.5" />} label="Caisse de secours" value={fcfa(caisseSecours)} sub={`méthode : ${methodeSol?.nom ?? "à fixer"} · plafond d’aide ${fcfa(p.regl.solidarite.plafondAideFcfa)}`} accent="#6E4B71" />
          <KpiCard icon={<HandHeart className="h-3.5 w-3.5" />} label="Types de solidarité" value={String(typesSolidarite.length)} sub="sommes, délais et variables membre par membre" accent="#2F6B45" />
          <KpiCard icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Visites planifiées" value={String(visitesTriees.length)} sub="calendrier des visites de la Tontine" accent="#C89F62" />
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
          ⚠ Types de solidarité, mains levées et calendrier des visites sont LES MÊMES SOURCES que la console du président (clés fc_solidarite_types_v1, fc_mains_levees_v1, fc_visites_solidarite_v1) — la secrétaire les tient pour le bureau. Les évènements et la caisse vivent dans le registre du secrétariat (seeds identiques à la démo du président).
        </p>
      </FcCard>

      {/* ══════ TYPES DE SOLIDARITÉ — sommes, variables, délais, attribution ══════ */}
      <Block
        title="Types de solidarité — autant que le bureau en décide"
        icon={<HandHeart className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="La secrétaire crée et édite les types POUR LE BUREAU : chacun avec sa somme, autant de VARIABLES que nécessaire (le membre attribué et la somme QU'IL paie — tout le monde ne paie pas pareil), un DÉLAI (en mois) pour être à jour ou rembourser, et une recherche dynamique pour attribuer les membres."
      >
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">Ajouter un type de solidarité</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={nomType}
                onChange={(e) => setNomType(e.target.value)}
                placeholder="Nom du type — ex. : Participation aux deuils, Cadeau de mariage…"
                aria-label="Nom du nouveau type de solidarité"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  value={sommeType}
                  onChange={(e) => setSommeType(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Somme (FCFA)"
                  aria-label="Somme de base du type de solidarité en FCFA"
                  className="w-36 rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
                />
                <input
                  value={delaiType}
                  onChange={(e) => setDelaiType(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Délai (mois)"
                  aria-label="Délai en mois pour être à jour ou rembourser"
                  className="w-28 rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
                />
              </div>
            </div>
            <div className="mt-2">
              <Btn tone="violet" onClick={ajouterType}><Plus className="h-4 w-4" /> Ajouter ce type de solidarité</Btn>
            </div>
          </div>

          {typesSolidarite.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold leading-relaxed text-[#4A554E]">
              Aucun type de solidarité pour l’instant — ajoutez le premier ci-dessus, puis attribuez-le aux membres.
            </p>
          ) : (
            typesSolidarite.map((t) => {
              const totalVariables = t.variables.reduce((s, v) => s + v.montant, 0);
              return (
                <div key={t.id} className="rounded-2xl border-2 border-[#E5DCC0] bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E5DCC0] bg-[#6E4B71]/8 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="fc-serif text-[15px] font-black text-[#6E4B71]">{t.nom}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <P cls={OR_CLS}><Coins className="h-3 w-3" /> Somme de base : {fcfa(t.somme)}</P>
                        <P cls={TE_CLS}><Hourglass className="h-3 w-3" /> À jour (ou remboursé) sous {t.delaiMois} mois</P>
                        {t.variables.length > 0 && <P cls={OK_CLS}><Users className="h-3 w-3" /> {t.variables.length} membre(s) — {fcfa(totalVariables)}</P>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => retirerType(t)}
                      aria-label={`Retirer le type de solidarité ${t.nom}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3 p-3.5">
                    <ChampRechercheMembres
                      roster={p.roster}
                      libelle={`Attribuer « ${t.nom} » à un membre`}
                      note="Tapez un nom : la recherche filtre la liste au fil de la frappe. Chaque membre attribué paie par défaut la somme de base — ajustez-la dans ses variables."
                      idsMasques={new Set(t.variables.map((v) => v.membreId))}
                      rendreResultat={(m) => (
                        <Btn small tone="violet" onClick={() => attribuerMembreType(t, m)}>
                          <UserPlus className="h-3.5 w-3.5" /> Attribuer
                        </Btn>
                      )}
                    />

                    <div>
                      <p className="text-[12px] font-black uppercase tracking-wide text-[#8A6420]">Variables — qui paie quoi (tout le monde ne paie pas pareil)</p>
                      {t.variables.length === 0 ? (
                        <p className="mt-1.5 rounded-xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2 text-[12px] font-semibold text-[#4A554E]">
                          Aucun membre attribué à ce type — utilisez la recherche ci-dessus.
                        </p>
                      ) : (
                        <div className="mt-1.5 space-y-1.5">
                          {t.variables.map((v) => {
                            const mv = p.parMembre.get(v.membreId);
                            return (
                              <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
                                <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#2B3530]">
                                  {mv?.name ?? v.membreId}
                                  {mv && mv.role !== "membre" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide text-[#8A6420]"> — bureau</span>}
                                </p>
                                <label className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Sa somme</span>
                                  <input
                                    value={String(v.montant)}
                                    onChange={(e) => majMontantVariable(t, v, Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                                    inputMode="numeric"
                                    aria-label={`Somme de ${mv?.name ?? "membre"} pour le type ${t.nom} en FCFA`}
                                    className="w-28 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12.5px] font-black text-[#2B3530] outline-none focus:border-[#6E4B71]"
                                  />
                                  <span className="text-[11.5px] font-bold text-[#4A554E]">FCFA</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => retirerVariable(t, v)}
                                  aria-label={`Retirer ${mv?.name ?? "le membre"} du type ${t.nom}`}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Block>

      {/* ══════ TYPES DE MAINS LEVÉES ══════ */}
      <Block
        title="Types de mains levées"
        icon={<Hand className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="Les décisions votées à main levée en réunion : nommez autant de types de mains levées que la Tontine en pratique — l'aide de solidarité, l'échange de tour, l'admission d'un membre…"
      >
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">Ajouter un type de main levée</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
              <input
                value={nomMain}
                onChange={(e) => setNomMain(e.target.value)}
                placeholder="Nom — ex. : Main levée pour l'aide de deuil…"
                aria-label="Nom du nouveau type de main levée"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
              />
              <input
                value={noteMain}
                onChange={(e) => setNoteMain(e.target.value)}
                placeholder="À quoi sert-elle ? (facultatif)"
                aria-label="Rôle de la main levée"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
              />
            </div>
            <div className="mt-2">
              <Btn tone="violet" onClick={ajouterMain}><Plus className="h-4 w-4" /> Ajouter cette main levée</Btn>
            </div>
          </div>
          {mainsLevees.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold text-[#4A554E]">
              Aucun type de main levée — ajoutez le premier ci-dessus.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {mainsLevees.map((ml) => (
                <li key={ml.id} className="flex items-start gap-2 rounded-2xl border border-[#E5DCC0] bg-white px-3 py-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6E4B71]/12 text-[#6E4B71]"><Hand className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black leading-snug text-[#2B3530]">{ml.nom}</p>
                    {ml.note && <p className="mt-0.5 text-[11px] font-semibold leading-snug text-[#4A554E]">{ml.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => retirerMain(ml)}
                    aria-label={`Retirer la main levée ${ml.nom}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Block>

      {/* ══════ CALENDRIER DE VISITES DE SOLIDARITÉ ══════ */}
      <Block
        title="Calendrier de visites de solidarité"
        icon={<CalendarCheck className="h-4.5 w-4.5" />}
        accent="#6E4B71"
        note="Pour chaque type de solidarité : planifiez les visites — le membre concerné (recherche dynamique), le type, le mois, qui représente la Tontine (délégation) et une note. La Tontine se déplace auprès des siens ; la secrétaire tient le calendrier."
      >
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#6E4B71]">Planifier une visite</p>
            <div className="mt-2">
              {visMembreId && p.parMembre.get(visMembreId) ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#6E4B71]/40 bg-[#6E4B71]/10 px-3 py-2.5">
                  <p className="text-[13px] font-black text-[#6E4B71]">
                    <UserCheck className="mr-1 inline h-4 w-4" /> Membre à visiter : {p.parMembre.get(visMembreId)?.name}
                  </p>
                  <Btn small tone="neutre" onClick={() => setVisMembreId(null)}>Changer</Btn>
                </div>
              ) : (
                <ChampRechercheMembres
                  roster={p.roster}
                  libelle="Qui visiter ?"
                  note="Tapez un nom pour trouver le membre concerné par la visite."
                  rendreResultat={(m) => (
                    <Btn small tone="violet" onClick={() => setVisMembreId(m.id)}>
                      <Check className="h-3.5 w-3.5" /> Choisir
                    </Btn>
                  )}
                />
              )}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <select
                value={visType}
                onChange={(e) => setVisType(e.target.value)}
                aria-label="Type de solidarité concerné par la visite"
                className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
              >
                <option value="">Type de solidarité…</option>
                {typesSolidarite.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
              <select
                value={moisVisite}
                onChange={(e) => setVisMois(Number(e.target.value))}
                aria-label="Mois de la visite"
                className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
              >
                {MOIS_FR.map((nom, mi) => (
                  <option key={nom} value={mi}>
                    {nom}{p.moisCourantIdx != null && mi === p.moisCourantIdx ? " — en cours" : mi > (p.moisCourantIdx ?? 11) ? " — à venir" : ""}
                  </option>
                ))}
              </select>
              <input
                value={visDelegation}
                onChange={(e) => setVisDelegation(e.target.value)}
                placeholder="Délégation — ex. : Vice-présidente + 2 membres"
                aria-label="Qui représente la Tontine lors de la visite"
                className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
              />
            </div>
            <input
              value={visNote}
              onChange={(e) => setVisNote(e.target.value)}
              placeholder="Note — lieu, appui prévu, frais…"
              aria-label="Note de la visite"
              className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[12.5px] text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#6E4B71]"
            />
            <div className="mt-2">
              <Btn tone="violet" onClick={ajouterVisite}><Plus className="h-4 w-4" /> Ajouter au calendrier des visites</Btn>
            </div>
          </div>

          {visitesTriees.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold text-[#4A554E]">
              Aucune visite planifiée — la première visite se planifie ci-dessus.
            </p>
          ) : (
            <ul className="space-y-2">
              {visitesTriees.map((v) => {
                const m = p.parMembre.get(v.membreId);
                const t = typesSolidarite.find((x) => x.id === v.typeId) ?? null;
                return (
                  <li key={v.id} className="flex items-start gap-2.5 rounded-2xl border border-[#E5DCC0] bg-white px-3 py-2.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-[#6E4B71] text-white">
                      <CalendarCheck className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-black text-[#2B3530]">
                        {MOIS_FR[Math.min(11, Math.max(0, v.moisIdx))]} — visite de {m?.name ?? v.membreId}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {t && <P cls={TE_CLS}><HandHeart className="h-3 w-3" /> {t.nom}</P>}
                        {v.delegation && <P cls={OK_CLS}><Users className="h-3 w-3" /> {v.delegation}</P>}
                      </div>
                      {v.note && <p className="mt-1 text-[11.5px] font-semibold leading-snug text-[#4A554E]">{v.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => retirerVisite(v)}
                      aria-label={`Retirer la visite de ${m?.name ?? "membre"} en ${MOIS_FR[Math.min(11, Math.max(0, v.moisIdx))]}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Block>

      {/* — ÉVÈNEMENTS DE SOLIDARITÉ : signalement → vote → décaissement — */}
      {evs.map((e) => {
        const m = p.parMembre.get(e.membreId);
        const pourCount = Object.values(e.votes).filter((v) => v === true).length;
        const contreCount = Object.values(e.votes).filter((v) => v === false).length;
        const votants: { qui: keyof VoteBureau; nom: string; role: string }[] = [
          { qui: "vice", nom: "Marie-Louise Nguetsop", role: "Vice-présidente" },
          { qui: "secretariat", nom: "Françoise Mbeutetsa", role: "Secrétaire" },
          { qui: "tresorier", nom: "Émile Tchoumi", role: "Trésorier" },
          { qui: "censeur", nom: "Roger Ndoumbe", role: "Censeur" },
        ];
        return (
          <FcCard key={e.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2"><P cls={TYPE_EV[e.type].cls}>{TYPE_EV[e.type].label}</P><P>{e.statut === "signale" ? "À traiter" : e.statut === "en_vote" ? `Vote en cours (${pourCount}/4)` : e.statut === "approuve" ? "Approuvé" : "Décaissé"}</P></div>
                <p className="mt-1.5 text-[14px] font-bold text-[#2B3530]">{e.label}</p>
                <p className="text-[11.5px] text-[#8A9288]">Membre concerné : {m?.name}</p>
              </div>
              {e.montant != null && <p className="text-[15px] font-black text-[#8A6420]">{fcfa(e.montant)}</p>}
            </div>

            {e.statut === "signale" && (
              <div className="mt-3 space-y-2 border-t border-[#E5DCC0] pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6E4B71]">La secrétaire propose une aide au vote du bureau</p>
                <div className="flex flex-wrap gap-2">
                  {[10_000, 20_000, 30_000].map((mt) => (
                    <Btn key={mt} small tone="violet" onClick={() => proposerAide(e, mt)} disabled={mt > caisseSecours}>
                      Proposer {fmt(mt)} FCFA
                    </Btn>
                  ))}
                </div>
              </div>
            )}

            {e.statut === "en_vote" && (
              <div className="mt-3 space-y-2 border-t border-[#E5DCC0] pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#6E4B71]">Vote du bureau — majorité 3/4</p>
                <div className="space-y-1.5">
                  {votants.map((v) => {
                    const val = e.votes[v.qui];
                    return (
                      <div key={v.qui} className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-[#2B3530]">{v.nom}</p>
                          <p className="text-[10.5px] text-[#8A9288]">{v.role}</p>
                        </div>
                        <Btn small tone={val === true ? "vert" : "neutre"} onClick={() => voter(e, v.qui, true)}><ThumbsUp className="h-3.5 w-3.5" /> Pour</Btn>
                        <Btn small tone={val === false ? "rouge" : "neutre"} onClick={() => voter(e, v.qui, false)}><ThumbsDown className="h-3.5 w-3.5" /> Contre</Btn>
                      </div>
                    );
                  })}
                </div>
                {contreCount > 0 && <p className="text-[11px] text-[#A5473D]">{contreCount} voix contre — la majorité des 3/4 reste requise.</p>}
              </div>
            )}

            {(e.statut === "approuve" || e.statut === "decaisse") && (
              <div className="mt-3 border-t border-[#E5DCC0] pt-3">
                {e.statut === "approuve" ? (
                  <Btn small tone="violet" onClick={() => decaisser(e)}><Wallet className="h-3.5 w-3.5" /> Décaisser {e.montant != null ? fcfa(e.montant) : ""} via le trésorier</Btn>
                ) : (
                  <P cls={OK_CLS}><CheckCircle2 className="h-3 w-3" /> Aide versée — reçu archivé, solde mis à jour</P>
                )}
              </div>
            )}
          </FcCard>
        );
      })}
    </>
  );
}
