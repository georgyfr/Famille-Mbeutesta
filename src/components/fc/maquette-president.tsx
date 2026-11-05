"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETTE v1 — POSTE DE COMMANDEMENT DU PRÉSIDENT (cantine Mbeutetsa)
//
// Proposition soumise à validation (novembre 2026) : transformer la « fiche »
// du président en véritable table de gestion opérationnelle — conduite de
// réunion en direct, impayés & recouvrement, supervision des prêts, caisse de
// secours, adhésions, journal des décisions — le tout interactif avec les
// autres acteurs du bureau et les membres simples.
//
// ⚠ Maquette de démonstration : données fictives en mémoire, NON connectée
// aux registres réels (localStorage / serveur). Aucune action n'a d'effet
// hors de cette page. Après validation, ces outils remplaceront la fiche
// actuelle dans le projet Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, BadgeCheck, Ban,
  BellRing, CalendarCheck, CalendarClock, Check, CheckCircle2, CheckSquare, ChevronDown, ChevronRight, ChevronUp,
  ClipboardList, Coins, Coffee, Eye, FileText, Gavel, Hand, HandCoins, HandHeart,
  HeartHandshake, Hourglass, Landmark, Layers, ListChecks, Lock, MessageSquarePlus,
  Mic, Pause, Percent, PiggyBank, Play, Plus, ReceiptText, RotateCcw, Scale, ScrollText, Send,
  ShieldCheck, Search, SlidersHorizontal, Sparkles, Square, Tag, ThumbsDown, ThumbsUp, Timer, TrendingUp,
  Trash2, Undo2, UserCheck, UserPlus, Users, Vote, Wallet, XCircle,
} from "lucide-react";
import { FcCard } from "./ui";
import {
  MEMBRES_FICTIFS, MOIS_FR, ROLE_META, TONTINE, TAUX_DEFAUT, loadMontants, saveMontants,
  detteParPersonne, potMensuelDynamique, secondSunday,
  type Member, type ReglagesTontine,
} from "./tontine-data";
import { estMembreApp, loadMembresApplication } from "./membres-app";
import {
  COLLECTE_INTERETS_LABELS, COLLECTE_INTERETS_NOTES, EVENTS_SOLIDAIRES_LABELS,
  INTERETS_EPARGNE_LABELS, MAJORITES_LABELS, METHODES_SOLIDARITE,
  REGLEMENT_DEFAUT, TYPES_EPARGNE_CATALOGUE, TYPES_PRET_CATALOGUE,
  loadReglement, publierReglement, saveReglement,
  type Reglement, type TypeEpargneConfig,
} from "./reglement";
import {
  evolutionPretReunion, interetsAttribution, loadEpargnesReunion, loadPretsReunion, saveEpargnesReunion, savePretsReunion,
  type AttributionReunion, type RemboursementPret,
} from "./registres-bureau";
import {
  loadTypesCotisation, nouveauTypeCotisation, saveTypesCotisation,
  typeDuMembre, cotisationDuMembre, fmtMontant,
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
import { POSTES_BUREAU, POSTES_DEFAUT, loadPostes, savePostes, posteDeMembre, type PosteKey, type PostesMap } from "./postes-bureau";

/* ══════════════════════════ aides ══════════════════════════ */

const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fcfa = (n: number) => `${fmt(n)} FCFA`;
/** Heure HH:MM — appelée UNIQUEMENT dans les gestionnaires d'événements
 *  (jamais au rendu initial) pour éviter tout mismatch d'hydratation. */
const heure = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
let seq = 0;
const nid = () => `mk-${Date.now().toString(36)}-${seq++}`;

/** SÉANCE EN DIRECT — masquée à la demande de l'administrateur (novembre 2026) :
 *  « Les éléments comme séance du jour, ouvrir la séance et autres, pour
 *  l'instant ce n'est pas nécessaire… Nous allons les utiliser peut-être une
 *  autre fois. » → passer à true pour tout réactiver (onglet Réunion en
 *  direct, bloc Séance du jour du cockpit, file de parole, simulation). */
const SEANCE_ACTIVE = false;

/** RÉUNION & QUORUM — masqué à la demande de l'administrateur (novembre 2026) :
 *  « Au niveau des réunions et quorum, honnêtement, je ne sais pas ce que
 *  c'est. » → le bloc est caché dans Paramètres ; passer à true pour le
 *  réafficher (quorum des délibérations, reports tolérés). */
const QUORUM_ACTIVE = false;

/** COCKPIT / JOURNAL / ADHÉSIONS — masqués à la demande de l'administrateur
 *  (novembre 2026) : « Masque les pages suivantes : cockpit, journal,
 *  adhesions. Ajoutez plutôt une page appelée Cotisations et collations. »
 *  → passer à true pour réafficher un onglet (bouton + contenu) ; les anciens
 *  liens #president/cockpit… retombent alors sur la page d'accueil tant que
 *  l'onglet est masqué. */
const COCKPIT_ACTIVE = false;
const JOURNAL_ACTIVE = false;
const ADHESIONS_ACTIVE = false;

/* — sous-onglets de PARAMÈTRES : chaque section tient sur UN écran, avec son
 *  propre bouton « Enregistrer » — plus besoin de scroller jusqu'en bas —
 *  et chaque section a SON URL (#president/parametres/cotisations…).
 *  v11 : « Impayés & recouvrement » quitte les Paramètres (la supervision reste
 *  dans l'onglet Impayés) ; « Épargnes » devient le miroir de l'espace membre. */
type SousParamKey = "cotisations" | "prets" | "solidarite" | "epargne" | "publication";
const SOUS_PARAMS: { key: SousParamKey; label: string; icon: ReactNode }[] = [
  { key: "cotisations", label: "Cotisations & collations", icon: <Coins className="h-3.5 w-3.5" /> },
  { key: "prets", label: "Prêts", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "solidarite", label: "Solidarité", icon: <HandHeart className="h-3.5 w-3.5" /> },
  { key: "epargne", label: "Épargnes", icon: <PiggyBank className="h-3.5 w-3.5" /> },
  { key: "publication", label: "Publication", icon: <Send className="h-3.5 w-3.5" /> },
];
const SOUS_PARAM_KEYS = SOUS_PARAMS.map((s) => s.key);

/** Clés d'onglets autorisées dans l'URL — liens directs partageables :
 *  famille-mbeutetsa.pages.dev/#president/epargnes, /prets, /parametres…
 *  v12 : « impayes » quitte les clés (page supprimée — l'URL #president/impayes
 *  retombe sur l'accueil) ; « epargnes » la remplace (gestion des épargnes). */
const TAB_KEYS: TabKey[] = [
  "cotisations", "cockpit", "reunion", "epargnes", "prets", "solidarite", "adhesions", "postes",
  "journal", "parametres", "m-cotis", "m-epargne", "m-prets",
];

function tabFromHash(): { tab: TabKey; sous: SousParamKey | null } {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#president/")) {
      const rest = h.slice("#president/".length).replace(/\/+$/, "");
      const [seg1, seg2] = rest.split("/");
      if ((TAB_KEYS as string[]).includes(seg1)) {
        const tab = seg1 as TabKey;
        /* onglets masqués (cockpit, journal, adhésions, réunion) → accueil */
        const masque =
          (!COCKPIT_ACTIVE && tab === "cockpit") ||
          (!JOURNAL_ACTIVE && tab === "journal") ||
          (!ADHESIONS_ACTIVE && tab === "adhesions") ||
          (!SEANCE_ACTIVE && tab === "reunion");
        if (masque) return { tab: "cotisations", sous: null };
        if (tab === "parametres" && seg2 && (SOUS_PARAM_KEYS as string[]).includes(seg2)) {
          return { tab, sous: seg2 as SousParamKey };
        }
        return { tab, sous: null };
      }
    } else if (h === "#president" || h === "#president/") {
      return { tab: "cotisations", sous: null };
    }
  } catch {
    /* rien */
  }
  return { tab: "cotisations", sous: null };
}

type Puce = { children: ReactNode; cls?: string };
const P = ({ children, cls = "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" }: Puce) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>
    {children}
  </span>
);

const OK_CLS = "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30";
const OR_CLS = "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45";
const RJ_CLS = "bg-[#A5473D]/10 text-[#A5473D] border-[#A5473D]/30";
const TE_CLS = "bg-[#3D6B72]/10 text-[#3D6B72] border-[#3D6B72]/30";

/** Taux d'ÉPARGNE en vigueur pour les membres : si le bureau a fixé son propre
 *  taux (tauxFixe — même à 0, c'est une décision : « intérêts retirés »), c'est
 *  lui qui s'applique partout ; sinon le taux par défaut de la maison
 *  (TAUX_DEFAUT = 3 %/mois) reste en vigueur. Le président peut donc MODIFIER
 *  le pourcentage, le RETIRER (0 %) ou le RÉTABLIR au défaut — v11. */
const tauxEpargneVigueur = (r: Reglement) => (r.epargne.tauxFixe ? r.epargne.tauxMensuel : TAUX_DEFAUT);

function Btn({ children, onClick, tone = "vert", disabled, small }: {
  children: ReactNode; onClick?: () => void; tone?: "vert" | "or" | "rouge" | "neutre" | "teal";
  disabled?: boolean; small?: boolean;
}) {
  const tones = {
    vert: "bg-[#1F5B3F] text-white hover:bg-[#184a33]",
    or: "bg-[#C89F62] text-[#2B2416] hover:bg-[#b98f50]",
    rouge: "bg-[#A5473D] text-white hover:bg-[#8f3c33]",
    neutre: "bg-[#2A4A3A]/8 text-[#2B3530] hover:bg-[#2A4A3A]/14",
    teal: "bg-[#3D6B72] text-white hover:bg-[#31565c]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "min-h-[34px] px-2.5 text-[11.5px]" : "min-h-[42px] px-3.5 text-[13px]"
      } ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════ données de démonstration ══════════════════════════ */

type PresenceEtat = "attente" | "present" | "excuse" | "absent";
type OJStatut = "en_attente" | "en_cours" | "cloture";
type OJPoint = {
  id: string; titre: string; detail: string; genre: "appel" | "pv" | "collecte" | "remise" | "dossiers" | "divers";
  statut: OJStatut;
};
type Parole = { id: string; membreId: string; sujet: string; statut: "demande" | "accordee" | "traitee" };
type Decision = { id: string; point: string; texte: string; responsable: string; echeance: string; le: string };
type Retard = {
  id: string; membreId: string; mois: string; montant: number; jours: number;
  niveau: 0 | 1 | 2 | 3; relances: number; amende: boolean; recouvre: boolean;
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
/** Prêt PERSONNEL du président à un membre (hors caisse, inscrit au registre). */
type MouvementCotisMois = { cotisation: boolean; collation: boolean };
/** Mouvement d'épargne personnelle du président (démo). */
type EpargneOp = { id: string; type: "depot" | "retrait"; montant: number; le: string; note: string; moisIdx: number };
type VoteBureau = { vice: boolean | null; secretariat: boolean | null; tresorier: boolean | null; censeur: boolean | null };
type EvVie = {
  id: string; membreId: string; type: "deuil" | "mariage" | "naissance" | "maladie"; label: string;
  statut: "signale" | "en_vote" | "approuve" | "decaisse"; montant: number | null; votes: VoteBureau;
};
type Candidat = {
  id: string; nom: string; ville: string; parrain: string;
  etapes: { identite: boolean; moralite: boolean; solvabilite: boolean; accord: boolean };
  statut: "instruction" | "vote" | "admis";
};
type JournalEntry = { id: string; le: string; texte: string; acteur: string };
type TabKey = "cotisations" | "cockpit" | "reunion" | "epargnes" | "prets" | "solidarite" | "adhesions" | "postes" | "journal"
  | "parametres" | "m-cotis" | "m-epargne" | "m-prets";

const SUJETS_PAROLE = [
  "Échange de tour avec une cousine de Bafoussam",
  "Retard de paiement — explication et délai demandé",
  "Proposition pour la caisse de secours",
  "Question sur le taux des épargnes",
  "Invitation d'un nouveau membre de la famille",
  "Lieu de la prochaine réunion",
];

/** Voteurs du bureau quand le président est partie prenante (récusation). */
const VOTEURS_PRET: { qui: "vice" | "tresorier" | "censeur"; nom: string; role: string }[] = [
  { qui: "vice", nom: "Marie-Louise Nguetsop", role: "Vice-présidente" },
  { qui: "tresorier", nom: "Émile Tchoumi", role: "Trésorier" },
  { qui: "censeur", nom: "Roger Ndoumbe", role: "Censeur" },
];

/** Identifiant du président dans le registre fictif — c'est AUSSI un membre. */
const MOI = "f01";

const initPresences = (): Record<string, PresenceEtat> => {
  const seed: Record<string, PresenceEtat> = {
    f01: "present", f02: "present", f03: "attente", f04: "present", f05: "excuse",
    f06: "attente", f07: "attente", f08: "present", f09: "absent", f10: "attente",
  };
  MEMBRES_FICTIFS.forEach((m) => { if (!(m.id in seed)) seed[m.id] = "attente"; });
  return seed;
};

const initJournal = (): JournalEntry[] => [
  { id: nid(), le: "09:12", acteur: "Secrétaire", texte: "Le taux mensuel des épargnes et prêts est fixé à 3 % (décision du bureau, publiée au registre)." },
  { id: nid(), le: "08:47", acteur: "Bureau", texte: "2 signalements ouverts : épargne d’octobre (montant erroné) et dette de P. Talla (mal insérée)." },
  { id: nid(), le: "Hier", acteur: "Trésorier", texte: "Caisse de secours : 45 000 FCFA après l’aide décaissée en juin (naissance — famille Fotso)." },
];

/** COTISATIONS & COLLATIONS DU MOIS, membre par membre — état de démonstration :
 *  7 cotisations et 5 collations déjà encaissées par le trésorier (le président
 *  n’a pas encore cotisé — cohérent avec le bandeau « cotisation à faire »). */
const initCotisMois = (): Record<string, MouvementCotisMois> => {
  const seed: Record<string, MouvementCotisMois> = {};
  MEMBRES_FICTIFS.forEach((m) => { seed[m.id] = { cotisation: false, collation: false }; });
  ["f02", "f03", "f04", "f05", "f06", "f07", "f08"].forEach((id) => { if (seed[id]) seed[id].cotisation = true; });
  ["f02", "f03", "f04", "f05", "f06"].forEach((id) => { if (seed[id]) seed[id].collation = true; });
  return seed;
};

/* ══════════════════════════ maquette ══════════════════════════ */

export function MaquettePresident() {
  /* — état global de la maquette — */
  const [tab, setTab] = useState<TabKey>("cotisations");
  const [sousParam, setSousParam] = useState<SousParamKey>("cotisations");
  const [seance, setSeance] = useState<"fermee" | "ouverte" | "cloturee">("fermee");
  /* — RÈGLEMENT DE LA CANTINE : paramétrage complet du bureau (impayés,
   *    recouvrements, prêts, solidarité, épargne) — publié et visible par
   *    tous les membres. Initialisé sur les défauts (hydratation sûre), puis
   *    chargé du stockage local après peinture. — */
  const [reglement, setReglement] = useState<Reglement>(REGLEMENT_DEFAUT);
  /* — TYPES DE COTISATIONS MENSUELLES : sommes créées par le président et
   *    attribuées aux membres ; chaque membre sélectionné voit CE montant sur
   *    sa page, avec une notification. — */
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  /* — COLLATIONS : créées par le président (autant que souhaité) ; chaque
   *    personne désignée paie la somme de CHAQUE collation qui lui est
   *    attribuée — sa part = la somme de ses collations. — */
  const [collations, setCollations] = useState<Collation[]>([]);
  /* — montants de base (TONTINE) : servent de référence à la cotisation de
   *    base ; les sommes spécifiques passent par les types de cotisations et
   *    les collations créées dans Paramètres. — */
  const [montants, setMontants] = useState<ReglagesTontine>({ ...TONTINE });
  /* — MEMBRES AJOUTÉS VIA L'APPLICATION : les personnes inscrites ou
   *    pré-enregistrées depuis l'espace famille (annuaire réel de l'app)
   *    rejoignent TOUTES les listes du président — habilitations de cotisation,
   *    collations, présences, encaissements… — à côté des 10 membres de
   *    démonstration (Task 55 : « où sont les membres que j'ai ajoutés ? »). — */
  const [membresApp, setMembresApp] = useState<Member[]>([]);
  const [presences, setPresences] = useState<Record<string, PresenceEtat>>(initPresences);
  const [oj, setOj] = useState<OJPoint[]>([
    { id: "oj1", titre: "Appel des membres & quorum", detail: "Présences, excuses et absences du jour", genre: "appel", statut: "en_attente" },
    { id: "oj2", titre: "Lecture du PV de la dernière réunion", detail: "Lu par la secrétaire — observations des membres", genre: "pv", statut: "en_attente" },
    { id: "oj3", titre: "Collecte des cotisations & collations", detail: "Encaissement par le trésorier — reçus à l’appui", genre: "collecte", statut: "en_attente" },
    { id: "oj4", titre: "Remise de la somme au bénéficiaire du mois", detail: "Bénéficiaire : Chantal Djuidje (donnée de démonstration)", genre: "remise", statut: "en_attente" },
    { id: "oj5", titre: "Dossiers en attente du bureau", detail: "Prêts, aide de solidarité, adhésions", genre: "dossiers", statut: "en_attente" },
    { id: "oj6", titre: "Divers & observations des membres", detail: "Parole libre — suggestions et réclamations", genre: "divers", statut: "en_attente" },
  ]);
  const [paroles, setParoles] = useState<Parole[]>([
    { id: nid(), membreId: "f07", sujet: "Calendrier des échanges de tours de novembre", statut: "demande" },
  ]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [retards, setRetards] = useState<Retard[]>([
    { id: "r1", membreId: "f07", mois: "Septembre + Octobre", montant: detteParPersonne() * 2, jours: 41, niveau: 1, relances: 2, amende: false, recouvre: false },
    { id: "r2", membreId: "f09", mois: "Octobre", montant: detteParPersonne(), jours: 12, niveau: 0, relances: 1, amende: false, recouvre: false },
    { id: "r3", membreId: "f10", mois: "Septembre", montant: detteParPersonne(), jours: 34, niveau: 0, relances: 0, amende: false, recouvre: false },
  ]);
  const [prets, setPrets] = useState<PretDemande[]>([
    { id: "p1", membreId: "f08", montant: 150_000, motif: "Rentrée scolaire des enfants", garanties: "Fond de commerce au marché B", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
    { id: "p2", membreId: "f07", montant: 80_000, motif: "Soins médicaux de sa mère", garanties: "Rémunération mensuelle déclarée", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
  ]);
  const [caisseSecours, setCaisseSecours] = useState(45_000);
  const [evs, setEvs] = useState<EvVie[]>([
    { id: "e1", membreId: "f08", type: "deuil", label: "Décès de la grand-mère de Chantal Djuidje (Bafoussam)", statut: "signale", montant: null, votes: { vice: null, secretariat: null, tresorier: null, censeur: null } },
  ]);
  const [candidats, setCandidats] = useState<Candidat[]>([
    { id: "c1", nom: "Samuel Nkoulou", ville: "Douala — quartier Nkolbisson", parrain: "Patrick Talla", etapes: { identite: false, moralite: false, solvabilite: false, accord: false }, statut: "instruction" },
  ]);
  const [journal, setJournal] = useState<JournalEntry[]>(initJournal);
  const [decForm, setDecForm] = useState<{ pointId: string; texte: string; resp: string; echeance: string } | null>(null);
  const [aujourdhuiInfo, setAujourdhuiInfo] = useState<{ jReste: number; mois: string } | null>(null);

  /* — espace membre du président : D'ABORD membre, ensuite président — il cotise,
   *    épargne, emprunte et prête exactement comme tout le monde. — */
  const [moisCourant, setMoisCourant] = useState<string | null>(null);
  const [cotisCeMois, setCotisCeMois] = useState(false);
  /* — cotisations & collations DU MOIS, membre par membre — le président coche
   *    ce que le trésorier a encaissé ; le nombre de cotisations déclarées est
   *    DÉRIVÉ de cet état (source unique, cohérente partout). — */
  const [cotisMois, setCotisMois] = useState<Record<string, MouvementCotisMois>>(initCotisMois);
  const cotisDeclarees = Object.values(cotisMois).filter((x) => x.cotisation).length;
  const [historiqueCotis, setHistoriqueCotis] = useState<{ mois: string; paye: boolean }[]>([
    { mois: "Juillet", paye: true }, { mois: "Août", paye: true }, { mois: "Septembre", paye: true }, { mois: "Octobre", paye: true },
  ]);
  /* v18 : le compte d'épargne personnel n'a plus de dépôt local — l'épargne du
   * président s'inscrit au REGISTRE DU BUREAU (page « Épargnes », comme chaque
   * membre) et remonte ici ; ne restent que ses opérations (retraits…). */
  const [epargneOps, setEpargneOps] = useState<EpargneOp[]>([
    { id: "eo1", type: "depot", montant: 60_000, le: "14 sept.", note: "Épargne mensuelle", moisIdx: 8 },
    { id: "eo2", type: "depot", montant: 60_000, le: "12 oct.", note: "Épargne mensuelle + intérêts du mois", moisIdx: 9 },
  ]);
  /* Mois choisi pour la DEMANDE DE PRÊT en cours (le prêt démarre ce mois). */
  const [pretMoisChoisi, setPretMoisChoisi] = useState<number | null>(null);
  const [moisCourantIdx, setMoisCourantIdx] = useState<number | null>(null);
  const [mesPretsForm, setMesPretsForm] = useState({ montant: "", motif: "", garanties: "", avalisteId: "" });

  /* — REGISTRES DU BUREAU : les prêts FAITS À LA RÉUNION par les membres
   *    (la réunion emprunte aux membres) et les épargnes des membres — le
   *    prêt / l'épargne est manuel : c'est le président qui l'inscrit dans la
   *    machine (page Prêts / page Épargnes, section « Attribution »). — */
  const [pretsReunion, setPretsReunion] = useState<AttributionReunion[]>([]);
  const [epargnesReunion, setEpargnesReunion] = useState<AttributionReunion[]>([]);

  /* — SOLIDARITÉ (v14) : types de solidarité (avec leurs variables membre →
   *    somme et leurs délais), types de mains levées et calendrier de visites
   *    — le président ajoute tout cela lui-même dans l'onglet Solidarité. — */
  const [typesSolidarite, setTypesSolidarite] = useState<TypeSolidarite[]>([]);
  const [mainsLevees, setMainsLevees] = useState<MainLevee[]>([]);
  const [visitesSolidarite, setVisitesSolidarite] = useState<VisiteSolidarite[]>([]);

  /* — POSTES DU BUREAU (v14) : le titulaire de chaque poste — le président
   *    attribue un poste à n'importe quel membre simple et le retire. — */
  const [postes, setPostes] = useState<PostesMap>({ ...POSTES_DEFAUT });

  /* — dérivés —
   *    Effectif complet : les 10 membres de démonstration + les membres AJOUTÉS
   *    via l'application (inscrits / pré-enregistrés dans l'espace famille). */
  const roster = useMemo(() => [...MEMBRES_FICTIFS, ...membresApp], [membresApp]);
  const parMembre = useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster]);
  /* — v18 : COMPTE D'ÉPARGNE PERSONNEL DU PRÉSIDENT — le bloc « Déposer ou
   *    retirer » de « Mes épargnes » a été SUPPRIMÉ (demande du président : il
   *    ne sert plus, l'épargne s'attribue au registre du bureau). Le compte
   *    personnel est désormais la FUSION de deux sources :
   *    1) SES épargnes inscrites au registre du bureau (page « Épargnes »,
   *       membreId = MOI) — les dépôts réels, avec leur mois rattaché ;
   *    2) ses opérations personnelles (dépôts historiques, retraits faits
   *       via « Retirer cette épargne » dans les mouvements).
   *    Le solde se DÉduit des mouvements (dépôts − retraits) : une seule
   *    source de vérité, plus d'état solde séparé à synchroniser. — */
  const opsEpargneMoi = useMemo<EpargneOp[]>(() => [
    ...epargnesReunion.filter((e) => e.membreId === MOI).map((e) => ({
      id: e.id, type: "depot" as const, montant: e.montant,
      le: "registre du bureau", note: "Épargne inscrite au registre du bureau",
      moisIdx: Math.min(11, Math.max(0, e.moisIdx)),
    })),
    ...epargneOps,
  ], [epargnesReunion, epargneOps]);
  const soldeEpargneMoi = useMemo(
    () => opsEpargneMoi.reduce((s, o) => s + (o.type === "depot" ? o.montant : -o.montant), 0),
    [opsEpargneMoi],
  );
  const nbPresent = roster.filter((m) => presences[m.id] === "present").length;
  const nbExcuse = roster.filter((m) => presences[m.id] === "excuse").length;
  const nbAbsent = roster.filter((m) => presences[m.id] === "absent").length;
  const totalRetards = retards.filter((r) => !r.recouvre).reduce((s, r) => s + r.montant, 0);
  const nbRetards = retards.filter((r) => !r.recouvre).length;
  const parolesAttente = paroles.filter((x) => x.statut === "demande").length;
  const pretsAttente = prets.filter((x) => x.statut === "en_attente").length;
  const votesEnCours = evs.filter((x) => x.statut === "signale" || x.statut === "en_vote").length;
  const candidatsEnCours = candidats.filter((x) => x.statut !== "admis").length;
  const pointsClotures = oj.filter((x) => x.statut === "cloture").length;
  /* POT DU MOIS — addition des cotisations de TOUS les membres : chacun verse
   * SON taux (type attribué par le bureau ou cotisation de base), TOUTE
   * L'ANNÉE, bénéficiaire INCLUS — le mois de sa levée, il cotise aussi.
   * Réactif aux types de cotisations et au montant de base. */
  const pot = potMensuelDynamique(roster, { types: typesCotis, base: montants.montantCotisation });

  /* — date : calculée côté client uniquement (hydratation sûre) — */
  useEffect(() => {
    const t = setTimeout(() => {
      setReglement(loadReglement());
      setTypesCotis(loadTypesCotisation());
      setCollations(loadCollations());
      setPretsReunion(loadPretsReunion()); // prêts faits à la réunion (registre du bureau)
      setEpargnesReunion(loadEpargnesReunion()); // épargnes des membres (registre du bureau)
      setTypesSolidarite(loadTypesSolidarite()); // types de solidarité + variables (v14)
      setMainsLevees(loadMainsLevees()); // types de mains levées (v14)
      setVisitesSolidarite(loadVisitesSolidarite()); // calendrier de visites (v14)
      setPostes(loadPostes()); // titulaires des postes du bureau (v14)
      setMembresApp(loadMembresApplication()); // membres ajoutés via l'application (annuaire réel)
      loadMontants(); // applique les montants persistés (cotisation de base…) à TONTINE
      setMontants({ ...TONTINE });
      const n = new Date();
      let y = n.getFullYear();
      let m = n.getMonth();
      let d = secondSunday(y, m);
      if (new Date(y, m, d).getTime() < new Date(y, m, n.getDate()).getTime()) {
        const y2 = m === 11 ? y + 1 : y;
        const m2 = (m + 1) % 12;
        y = y2; m = m2; d = secondSunday(y2, m2);
      }
      const jReste = Math.round((new Date(y, m, d).getTime() - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86_400_000);
      setAujourdhuiInfo({ jReste, mois: MOIS_FR[m] });
      setMoisCourant(MOIS_FR[n.getMonth()]);
      setMoisCourantIdx(n.getMonth());
      setPretMoisChoisi(n.getMonth());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* — onglets = URL partageable : #president/<onglet> — chaque sous-onglet du
   *    président a sa propre adresse (collable, rafraîchissable, partageable),
   *    y compris les sections de Paramètres : #president/parametres/prets. */
  useEffect(() => {
    const sync = () => {
      const x = tabFromHash();
      setTab(x.tab);
      if (x.tab === "parametres" && x.sous) setSousParam(x.sous);
    };
    const t0 = setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  const goTab = (t: TabKey) => {
    setTab(t);
    try {
      const h = t === "parametres" ? `#president/parametres/${sousParam}` : `#president/${t}`;
      if (window.location.hash !== h) window.history.replaceState(null, "", h);
    } catch {
      /* rien */
    }
  };
  const goSousParam = (s: SousParamKey) => {
    setSousParam(s);
    try {
      const h = `#president/parametres/${s}`;
      if (window.location.hash !== h) window.history.replaceState(null, "", h);
    } catch {
      /* rien */
    }
  };

  /* — règlement : chaque modification est enregistrée (brouillon du bureau) —
   *    la PUBLICATION aux membres est un geste séparé (onglet Paramètres). */
  const [reglSale, setReglSale] = useState(false);
  const majReglement = (patch: (r: Reglement) => Reglement) => {
    setReglement((prev) => {
      const next = patch(prev);
      saveReglement(next);
      return next;
    });
    setReglSale(true);
  };
  const publierReglementAuxMembres = () => {
    const p = publierReglement(reglement, "Président Joseph Mbeutetsa");
    setReglement(p);
    setReglSale(false);
    toast.success(`Règlement publié — version ${p.version}`, {
      description: "Tous les membres le voient désormais en lecture seule dans la page Tontine, bloc « Règlement de la cantine ».",
    });
    journalAdd(`Règlement de la cantine publié (version ${p.version}) — visible par tous les membres.`, "Président (paramétrage)");
  };
  const reinitialiserReglement = () => {
    const r = { ...REGLEMENT_DEFAUT };
    saveReglement(r);
    setReglement(r);
    setReglSale(false);
    toast("Paramètres réinitialisés sur les valeurs d'origine");
    journalAdd("Paramètres de la cantine réinitialisés sur les valeurs d'origine.", "Président (paramétrage)");
  };

  /* — types de cotisations : toute validation d'attribution est enregistrée
   *    aussitôt — les membres sélectionnés voient le montant sur leur page. — */
  const majTypesCotis = (next: TypeCotisation[], message?: string) => {
    setTypesCotis(next);
    saveTypesCotisation(next);
    if (message) {
      toast.success("Attribution validée", { description: message });
      journalAdd(message, "Président (paramétrage)");
    }
  };

  /* — collations : même mécanique — la part collation de chaque personne
   *    désignée est mise à jour aussitôt dans la page Cotisations & collations. — */
  const majCollations = (next: Collation[], message?: string) => {
    setCollations(next);
    saveCollations(next);
    if (message) {
      toast.success("Attribution validée", { description: message });
      journalAdd(message, "Président (paramétrage)");
    }
  };

  /* — REGISTRES : toute attribution ou suppression est enregistrée aussitôt —
   *    les sommes, mois et intérêts restent d'une session à l'autre. — */
  const majPretsReunion = (next: AttributionReunion[], message?: string) => {
    setPretsReunion(next);
    savePretsReunion(next);
    if (message) {
      toast.success("Registre des prêts à la réunion mis à jour", { description: message });
      journalAdd(message, "Président (registre des prêts)");
    }
  };
  const majEpargnesReunion = (next: AttributionReunion[], message?: string) => {
    setEpargnesReunion(next);
    saveEpargnesReunion(next);
    if (message) {
      toast.success("Registre des épargnes mis à jour", { description: message });
      journalAdd(message, "Président (registre des épargnes)");
    }
  };

  /* — SOLIDARITÉ (v14) : chaque ajout/retrait de type, de variable, de main
   *    levée ou de visite est enregistré aussitôt — d'une session à l'autre. — */
  const majTypesSolidarite = (next: TypeSolidarite[], message?: string) => {
    setTypesSolidarite(next);
    saveTypesSolidarite(next);
    if (message) {
      toast.success("Types de solidarité mis à jour", { description: message });
      journalAdd(message, "Président (solidarité)");
    }
  };
  const majMainsLevees = (next: MainLevee[], message?: string) => {
    setMainsLevees(next);
    saveMainsLevees(next);
    if (message) {
      toast.success("Mains levées mises à jour", { description: message });
      journalAdd(message, "Président (solidarité)");
    }
  };
  const majVisitesSolidarite = (next: VisiteSolidarite[], message?: string) => {
    setVisitesSolidarite(next);
    saveVisitesSolidarite(next);
    if (message) {
      toast.success("Calendrier des visites mis à jour", { description: message });
      journalAdd(message, "Président (solidarité)");
    }
  };

  /* — POSTES (v14) : attribuer un poste à un membre (même occupant d'un autre
   *    poste — l'ancien devient alors vacant) ou le retirer. Chaque changement
   *    annonce IMMÉDIATEMENT ce que le membre voit : sa page du poste arrive,
   *    disparaît, ou remplace l'ancienne. — */
  const attribuerPoste = (poste: PosteKey, membreId: string) => {
    const ancien = posteDeMembre(postes, membreId);
    const next: PostesMap = { ...postes, [poste]: membreId };
    if (ancien && ancien !== poste) next[ancien] = null;
    setPostes(next);
    savePostes(next);
    const m = parMembre.get(membreId);
    const L = POSTES_BUREAU.find((x) => x.key === poste)!;
    if (ancien && ancien !== poste) {
      const A = POSTES_BUREAU.find((x) => x.key === ancien)!;
      toast.success(`${m?.name} change de poste`, {
        description: `La page « ${A.label} » disparaît de son espace — il voit désormais SA page « ${L.label} ».`,
      });
      journalAdd(`${m?.name} est déplacé du poste ${A.label} vers ${L.label} — la page ${A.label} disparaît, remplacée par la page ${L.label}.`, "Président (postes)");
    } else {
      toast.success(`${m?.name} rejoint le bureau`, {
        description: `La page spéciale « ${L.label} » lui est présentée IMMÉDIATEMENT — aux côtés de ses pages membre.`,
      });
      journalAdd(`${m?.name} est nommé ${L.label} — la page spéciale du poste lui est présentée immédiatement.`, "Président (postes)");
    }
  };
  const retirerPoste = (poste: PosteKey) => {
    const membreId = postes[poste];
    if (!membreId) return;
    const next: PostesMap = { ...postes, [poste]: null };
    setPostes(next);
    savePostes(next);
    const m = parMembre.get(membreId);
    const L = POSTES_BUREAU.find((x) => x.key === poste)!;
    toast(`${m?.name} redevient membre simple`, {
      description: `La page « ${L.label} » disparaît de son espace — il ne voit désormais QUE ses pages membre, plus aucune page du bureau.`,
    });
    journalAdd(`${m?.name} est retiré du poste ${L.label} — il ne voit désormais que ses pages membre.`, "Président (postes)");
  };

  /* — COTISATION DE BASE : fixée depuis la page d'accueil (bloc « Ajouter ») —
   *    elle s'applique à tous les membres sans type particulier et est visible
   *    aussitôt partout (accueil, fiche membre, espace membre du président). — */
  const majMontantBase = (n: number) => {
    saveMontants({ montantCotisation: n });
    setMontants({ ...TONTINE });
  };

  /* — simulation : les membres demandent la parole pendant la séance —
   *    (désactivée tant que la séance en direct est masquée) — */
  useEffect(() => {
    if (!SEANCE_ACTIVE || seance !== "ouverte") return;
    const t = setInterval(() => {
      setParoles((prev) => {
        const enAttente = prev.filter((x) => x.statut === "demande").length;
        if (enAttente >= 3) return prev;
        const deja = new Set(prev.filter((x) => x.statut !== "traitee").map((x) => x.membreId));
        const candidatsId = MEMBRES_FICTIFS.filter((m) => m.role === "membre" && !deja.has(m.id));
        if (candidatsId.length === 0) return prev;
        const m = candidatsId[Math.floor(Math.random() * candidatsId.length)];
        const sujet = SUJETS_PAROLE[Math.floor(Math.random() * SUJETS_PAROLE.length)];
        toast(`${m.name} demande la parole`, { description: sujet });
        return [{ id: nid(), membreId: m.id, sujet, statut: "demande" }, ...prev];
      });
    }, 16_000);
    return () => clearInterval(t);
  }, [seance]);

  /* — journal — */
  const journalAdd = (texte: string, acteur = "Président") =>
    setJournal((prev) => [{ id: nid(), le: heure(), texte, acteur }, ...prev]);

  /* — actions : séance — */
  const ouvrirSeance = () => {
    setSeance("ouverte");
    const p1 = oj.find((x) => x.genre === "appel");
    if (p1 && p1.statut === "en_attente") setOj((prev) => prev.map((x) => (x.id === p1.id ? { ...x, statut: "en_cours" } : x)));
    toast.success("Séance ouverte — l’appel des membres est lancé");
    journalAdd("Ouverture de la séance mensuelle de la cantine.");
  };
  const marquerPresence = (id: string) => {
    setPresences((prev) => {
      const cycle: PresenceEtat[] = ["attente", "present", "excuse", "absent"];
      const cur = cycle.indexOf(prev[id] ?? "attente");
      return { ...prev, [id]: cycle[(cur + 1) % cycle.length] };
    });
  };
  const toutPresent = () => {
    setPresences((prev) => {
      const next = { ...prev };
      /* ?? "attente" : les membres ajoutés via l'application n'ont pas encore
       * d'entrée — ils comptent comme « en attente » comme pour tous. */
      roster.forEach((m) => { if ((next[m.id] ?? "attente") === "attente") next[m.id] = "present"; });
      return next;
    });
    toast("Tous les membres en attente sont marqués présents");
  };
  const demarrerPoint = (id: string) =>
    setOj((prev) => prev.map((x) => (x.id === id ? { ...x, statut: "en_cours" } : x)));
  const enregistrerDecision = () => {
    if (!decForm) return;
    const point = oj.find((x) => x.id === decForm.pointId);
    if (!point) return;
    const texte = decForm.texte.trim();
    if (!texte) { toast.error("Saisissez la décision avant de clôturer le point"); return; }
    setDecisions((prev) => [{
      id: nid(), point: point.titre, texte,
      responsable: decForm.resp || "Bureau", echeance: decForm.echeance || "Prochaine réunion", le: heure(),
    }, ...prev]);
    setOj((prev) => prev.map((x) => (x.id === point.id ? { ...x, statut: "cloture" } : x)));
    setDecForm(null);
    toast.success("Décision enregistrée", { description: "Transmise à la secrétaire pour le procès-verbal · notifiée aux membres concernés." });
    journalAdd(`Décision — ${point.titre} : ${texte} (responsable : ${decForm.resp || "Bureau"} · échéance : ${decForm.echeance || "prochaine réunion"}).`);
  };
  const validerAppel = () => {
    const t = `Quorum : ${nbPresent} présents, ${nbExcuse} excusés, ${nbAbsent} absents sur ${roster.length}.`;
    setDecisions((prev) => [{ id: nid(), point: "Appel des membres & quorum", texte: t, responsable: "Secrétaire", echeance: "Immédiat", le: heure() }, ...prev]);
    setOj((prev) => prev.map((x) => (x.genre === "appel" ? { ...x, statut: "cloture" } : x)));
    if (nbAbsent > 0) {
      const pen = nbAbsent * TONTINE.penaliteAbsence;
      toast(`Quorum atteint — ${nbAbsent} absence(s)`, { description: `Pénalités d’absence à enregistrer par le trésorier : ${fcfa(pen)}.` });
      journalAdd(`Appel validé : ${t} Pénalités d’absence : ${fcfa(pen)} (transmises au trésorier).`);
    } else {
      toast.success("Quorum atteint — aucun absent");
      journalAdd(`Appel validé : ${t}`);
    }
  };
  const notifierCollecte = () => {
    toast.success("Trésorier notifié", { description: "Émile Tchoumi encaisse les cotisations — les reçus s’inscrivent au journal de caisse." });
    journalAdd("Collecte des cotisations confiée au trésorier (notification en direct).", "Président → Trésorier");
  };
  const confirmerRemise = () => {
    toast.success("Remise confirmée devant témoin", { description: `${fcfa(pot)} remis au bénéficiaire du mois — accusé signé, copie au vice-président.` });
    journalAdd(`Remise de la somme au bénéficiaire : ${fcfa(pot)} — accusé de remise signé (témoin : vice-président).`, "Président → Trésorier");
  };
  const cloturerSeance = () => {
    setSeance("cloturee");
    setOj((prev) => prev.map((x) => (x.statut === "en_cours" ? { ...x, statut: "cloture" } : x)));
    toast.success("Séance clôturée", { description: "Synthèse transmise à la secrétaire pour le procès-verbal." });
    journalAdd(`Clôture de la séance — ${pointsClotures + oj.filter((x) => x.statut === "en_cours").length} points traités, ${decisions.length} décision(s) enregistrée(s). PV confié à la secrétaire.`);
  };

  /* — actions : parole — */
  const accorderParole = (id: string) => {
    setParoles((prev) => prev.map((x) => (x.id === id ? { ...x, statut: "accordee" } : x)));
    const p = paroles.find((x) => x.id === id);
    if (p) toast("Parole accordée", { description: `${parMembre.get(p.membreId)?.name} — micro ouvert pour le membre.` });
  };
  const terminerParole = (id: string) => {
    setParoles((prev) => prev.map((x) => (x.id === id ? { ...x, statut: "traitee" } : x)));
    const p = paroles.find((x) => x.id === id);
    if (p) journalAdd(`Intervention traitée — ${parMembre.get(p.membreId)?.name} : « ${p.sujet} ».`);
  };
  const differerParole = (id: string) => {
    setParoles((prev) => prev.filter((x) => x.id !== id));
    const p = paroles.find((x) => x.id === id);
    if (p) toast("Intervention différée à la fin du point en cours");
    if (p) journalAdd(`Intervention différée — ${parMembre.get(p.membreId)?.name}.`);
  };

  /* — actions : prêts — */
  const majPret = (id: string, patch: Partial<PretDemande>) =>
    setPrets((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const accorderPret = (p: PretDemande) => {
    if (p.president) { toast.error("Conflit d’intérêts", { description: "Votre propre dossier est statué par le bureau sans votre voix — voyez le vote 2/3 ci-dessous." }); return; }
    if (!p.avalisteId) { toast.error("Désignez d’abord un avaliste fiable"); return; }
    if (!p.cosignTresorier) { toast.error("La co-signature du trésorier est requise (supervision à deux)"); return; }
    majPret(p.id, { statut: "accorde" });
    const m = parMembre.get(p.membreId);
    const av = parMembre.get(p.avalisteId);
    toast.success("Prêt accordé", { description: `${fcfa(p.montant)} à ${m?.name} — avaliste : ${av?.name}. Décaissement par le trésorier, au taux de ${TAUX_DEFAUT} %/mois.` });
    journalAdd(`Prêt de ${fcfa(p.montant)} accordé à ${m?.name} — avaliste ${av?.name}, co-signé par le trésorier, taux ${reglement.prets.tauxMensuel || TAUX_DEFAUT} %/mois.`, "Président + Trésorier");
  };
  const refuserPret = (p: PretDemande) => {
    if (!p.motifRefus.trim()) { toast.error("Indiquez le motif du refus (transparence envers le membre)"); return; }
    majPret(p.id, { statut: "refuse" });
    const m = parMembre.get(p.membreId);
    toast("Prêt refusé", { description: `${m?.name} est notifié avec le motif — possibilité de réintroduire le dossier.` });
    journalAdd(`Prêt de ${fcfa(p.montant)} refusé à ${m?.name} — motif : ${p.motifRefus.trim()}.`);
  };

  /* — actions : solidarité — */
  const proposerAide = (e: EvVie, montant: number) => {
    setEvs((prev) => prev.map((x) => (x.id === e.id ? { ...x, statut: "en_vote", montant } : x)));
    toast("Aide soumise au vote du bureau", { description: `${fcfa(montant)} proposés — les 4 membres votants sont notifiés.` });
    journalAdd(`Caisse de secours : aide de ${fcfa(montant)} proposée (${parMembre.get(e.membreId)?.name}) — vote du bureau ouvert.`);
  };
  const voter = (e: EvVie, qui: keyof VoteBureau, pour: boolean) => {
    setEvs((prev) => prev.map((x) => {
      if (x.id !== e.id) return x;
      const votes = { ...x.votes, [qui]: pour } as VoteBureau;
      const pourCount = Object.values(votes).filter((v) => v === true).length;
      const statut = pourCount >= 3 ? "approuve" : x.statut;
      if (pourCount >= 3 && x.statut !== "approuve") toast.success("Majorité atteinte (3/4)", { description: "L’aide est approuvée — décaissement possible via le trésorier." });
      return { ...x, votes, statut };
    }));
  };
  const decaisser = (e: EvVie) => {
    setEvs((prev) => prev.map((x) => (x.id === e.id ? { ...x, statut: "decaisse" } : x)));
    setCaisseSecours((c) => c - (e.montant ?? 0));
    const m = parMembre.get(e.membreId);
    toast.success(`${fcfa(e.montant ?? 0)} décaissés`, { description: `Le trésorier remet l’aide à ${m?.name} — reçu archivé.` });
    journalAdd(`Caisse de secours : ${fcfa(e.montant ?? 0)} décaissés au profit de ${m?.name} (${e.type}) — solde restant ${fcfa(caisseSecours - (e.montant ?? 0))}.`, "Président + Trésorier");
  };

  /* — actions : adhésions — */
  const cocherEtape = (c: Candidat, cle: keyof Candidat["etapes"]) =>
    setCandidats((prev) => prev.map((x) => (x.id === c.id ? { ...x, etapes: { ...x.etapes, [cle]: !x.etapes[cle] } } : x)));
  const convoquerVote = (c: Candidat) => {
    setCandidats((prev) => prev.map((x) => (x.id === c.id ? { ...x, statut: "vote" } : x)));
    toast("Vote d’admission convoqué", { description: "Le bureau statuera à la prochaine séance — dossier complet." });
    journalAdd(`Dossier d’admission de ${c.nom} complet — vote du bureau convoqué.`);
  };
  const publierAdmission = (c: Candidat) => {
    setCandidats((prev) => prev.map((x) => (x.id === c.id ? { ...x, statut: "admis" } : x)));
    toast.success(`${c.nom} est admis(e) dans la cantine`, { description: "Notification à tous les membres — frais d’adhésion à percevoir par le trésorier." });
    journalAdd(`Admission publiée : ${c.nom} (${c.ville}) — parrain ${c.parrain}. Frais d’adhésion ${fcfa(TONTINE.fraisAdhesion)} confiés au trésorier.`);
  };
  const docOfficiel = (label: string) => {
    toast.success(`${label} — généré (maquette)`, { description: "À l’intégration : document PDF signé, partageable par WhatsApp." });
    journalAdd(`Document officiel généré : ${label}.`);
  };

  /* — actions : espace membre (cotiser, épargner, emprunter, prêter) — */
  const cotiserMoi = () => {
    if (cotisCeMois) { toast("Votre cotisation du mois est déjà enregistrée"); return; }
    /* mêmes règles que tous : ma cotisation (type attribué ou base) + la somme
     * de MES collations — aucune exception. */
    const maCotis = cotisationDuMembre(MOI, typesCotis, TONTINE.montantCotisation);
    const mesCollations = collationDuMembre(MOI, collations);
    const total = maCotis + mesCollations;
    setCotisCeMois(true);
    setHistoriqueCotis((prev) => [...prev, { mois: moisCourant ?? "ce mois", paye: true }]);
    setCotisMois((prev) => ({ ...prev, [MOI]: { cotisation: true, collation: mesCollations > 0 } }));
    toast.success("Votre cotisation est enregistrée", { description: `${fcfa(total)}${mesCollations > 0 ? " (cotisation + collation)" : " (cotisation)"} — reçu immédiat. Le total du mois monte à ${Math.min(cotisDeclarees + 1, roster.length)}/${roster.length} pour le trésorier.` });
    journalAdd(`Le président a cotisé comme membre : ${fcfa(total)} pour ${moisCourant ?? "ce mois"} — mêmes règles que tous, aucune exception.`, "Président (membre)");
  };
  /* v18 : le dépôt d'épargne personnel (« epargnerMoi ») a été SUPPRIMÉ avec le
   * bloc « Déposer ou retirer » — l'épargne du président s'inscrit au registre
   * du bureau (page « Épargnes ») et remonte dans son compte via opsEpargneMoi. */
  const retirerEpargneMoi = (montant: number, moisIdx: number) => {
    if (!montant || montant <= 0) { toast.error("Indiquez un montant valide"); return; }
    if (montant > soldeEpargneMoi) { toast.error(`Solde insuffisant — votre épargne est de ${fcfa(soldeEpargneMoi)}`); return; }
    if (moisCourantIdx != null && moisIdx > moisCourantIdx) { toast.error("Le retrait se rattache au mois réel (en retard, c'est permis)"); return; }
    const solde = soldeEpargneMoi - montant;
    setEpargneOps((prev) => [{ id: nid(), type: "retrait", montant, le: heure(), note: "Retrait sur demande", moisIdx }, ...prev]);
    toast.success(`${fcfa(montant)} retirés (${MOIS_FR[moisIdx]})`, { description: `Nouveau solde : ${fcfa(solde)} — le trésorier prépare le versement.` });
    journalAdd(`Retrait d’épargne du président : −${fcfa(montant)} rattaché à ${MOIS_FR[moisIdx]} — solde ${fcfa(solde)}.`, "Président (membre)");
  };
  const demanderPretMoi = () => {
    const montant = Number(mesPretsForm.montant);
    if (!montant || montant <= 0) { toast.error("Indiquez le montant souhaité"); return; }
    if (!mesPretsForm.avalisteId) { toast.error("Désignez un avaliste — règle identique pour tous"); return; }
    const moisIdx = pretMoisChoisi ?? moisCourantIdx ?? 0;
    /* nature et garanties ne sont plus demandées dans le formulaire : la nature
     * du règlement s’applique (motif), les garanties restent libres côté bureau. */
    const motif = TYPES_PRET_CATALOGUE.find((t) => t.id === reglement.prets.typeChoisi)?.nom ?? "Prêt à la caisse de la cantine";
    setPrets((prev) => [{
      id: nid(), membreId: MOI, montant, motif, garanties: "",
      avalisteId: mesPretsForm.avalisteId, cosignTresorier: false, statut: "en_attente" as const, motifRefus: "", president: true,
      moisIdx,
    }, ...prev]);
    setMesPretsForm({ montant: "", motif: "", garanties: "", avalisteId: "" });
    toast("Demande déposée — vous repassez côté membre", { description: `Prêt rattaché à ${MOIS_FR[moisIdx]} — calendrier de remboursement mois par mois visible ci-dessous. Récusation automatique : le bureau statue SANS votre voix.` });
    journalAdd(`Le président a demandé un prêt de ${fcfa(montant)} rattaché à ${MOIS_FR[moisIdx]} — dossier soumis au bureau, président récusé.`, "Président (membre)");
  };
  const voterPretBureau = (id: string, qui: "vice" | "tresorier" | "censeur", pour: boolean) => {
    setPrets((prev) => prev.map((x) => {
      if (x.id !== id) return x;
      const votes = { vice: null, tresorier: null, censeur: null, ...(x.votesBureau ?? {}), [qui]: pour } as NonNullable<PretDemande["votesBureau"]>;
      const pourCount = Object.values(votes).filter((v) => v === true).length;
      if (pourCount >= 2 && x.statut === "en_attente") {
        toast.success("Majorité du bureau atteinte (2/3)", { description: `${fcfa(x.montant)} accordés au président-membre — décaissement par le trésorier, taux ${TAUX_DEFAUT} %/mois.` });
        journalAdd(`Prêt du président (comme membre) : ${fcfa(x.montant)} accordé par le bureau (2/3) — le président était récusé.`, "Bureau");
        return { ...x, votesBureau: votes, statut: "accorde" as const };
      }
      return { ...x, votesBureau: votes };
    }));
  };
  /* — cotisations & collations du mois : encaissement (cochage trésorier) — */
  const encaisserCotis = (membreId: string, quoi: "cotisation" | "collation", recu: boolean) => {
    setCotisMois((prev) => ({
      ...prev,
      [membreId]: { ...(prev[membreId] ?? { cotisation: false, collation: false }), [quoi]: recu },
    }));
    const m = parMembre.get(membreId);
    if (recu) {
      toast.success(`${quoi === "cotisation" ? "Cotisation" : "Collation"} encaissée — ${m?.name}`, { description: "Reçu immédiat, inscrit au journal de caisse du trésorier." });
      journalAdd(`Trésorerie : ${quoi} de ${m?.name} encaissée pour ${moisCourant ?? "ce mois"}.`, "Président → Trésorier");
    } else {
      toast(`${m?.name} — ${quoi} remise en attente`);
      journalAdd(`Trésorerie : ${quoi} de ${m?.name} repassée en attente (${moisCourant ?? "mois en cours"}).`, "Président → Trésorier");
    }
  };
  const toutEncaisser = () => {
    setCotisMois((prev) => {
      const next = { ...prev };
      roster.forEach((m) => { next[m.id] = { cotisation: true, collation: true }; });
      return next;
    });
    toast.success("Tout le mois est marqué encaissé", { description: `Cotisations et collations de ${moisCourant ?? "ce mois"} réglées pour les ${roster.length} membres — journal de caisse mis à jour.` });
    journalAdd(`Trésorerie : cotisations et collations de ${moisCourant ?? "ce mois"} marquées encaissées pour tous les membres.`, "Président → Trésorier");
  };

  /* — badges des onglets — */
  const mesPrets = prets.filter((x) => x.president);
  const badges: Partial<Record<TabKey, number>> = {
    cotisations: Math.max(0, roster.length - cotisDeclarees),
    reunion: parolesAttente + oj.filter((x) => x.statut === "en_cours").length,
    prets: pretsAttente,
    solidarite: votesEnCours,
    adhesions: candidatsEnCours,
    journal: decisions.length,
    "m-cotis": cotisCeMois ? 0 : 1,
    "m-prets": mesPrets.filter((x) => x.statut === "en_attente").length,
  };

  const TABS: { key: TabKey; label: string; icon: ReactNode; membre?: boolean }[] = [
    { key: "cotisations", label: "Cotisations & collations", icon: <Coins className="h-3.5 w-3.5" /> },
    { key: "cockpit", label: "Cockpit", icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: "reunion", label: "Réunion en direct", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "epargnes", label: "Épargnes", icon: <PiggyBank className="h-3.5 w-3.5" /> },
    { key: "prets", label: "Prêts & garanties", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "solidarite", label: "Solidarité", icon: <HandHeart className="h-3.5 w-3.5" /> },
    { key: "adhesions", label: "Adhésions", icon: <UserPlus className="h-3.5 w-3.5" /> },
    { key: "postes", label: "Autres postes", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "journal", label: "Journal des décisions", icon: <ScrollText className="h-3.5 w-3.5" /> },
    { key: "parametres", label: "Paramètres", icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
    { key: "m-cotis", label: "Mes cotisations", icon: <CalendarCheck className="h-3.5 w-3.5" />, membre: true },
    { key: "m-epargne", label: "Mes épargnes", icon: <PiggyBank className="h-3.5 w-3.5" />, membre: true },
    { key: "m-prets", label: "Mes prêts", icon: <HandCoins className="h-3.5 w-3.5" />, membre: true },
  ];
  /* Onglets masqués à la demande de l’administrateur (novembre 2026) : séance
   * en direct (SEANCE_ACTIVE=false) puis cockpit, journal et adhésions
   * (COCKPIT_ACTIVE / JOURNAL_ACTIVE / ADHESIONS_ACTIVE = false). */
  const tabsVisibles = TABS.filter((t) =>
    (SEANCE_ACTIVE || t.key !== "reunion") &&
    (COCKPIT_ACTIVE || t.key !== "cockpit") &&
    (JOURNAL_ACTIVE || t.key !== "journal") &&
    (ADHESIONS_ACTIVE || t.key !== "adhesions")
  );
  const tabsGestion = tabsVisibles.filter((t) => !t.membre);
  const tabsMembre = tabsVisibles.filter((t) => t.membre);
  const renderTab = (t: (typeof TABS)[number]) => {
    const actif = tab === t.key;
    const badge = badges[t.key] ?? 0;
    return (
      <button
        key={t.key}
        type="button"
        onClick={() => goTab(t.key)}
        aria-current={actif ? "page" : undefined}
        className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-[13px] font-bold transition-all sm:min-h-[48px] sm:text-[14px] ${
          actif
            ? t.membre ? "border-[#22484F] bg-[#3D6B72] text-white shadow-[0_6px_18px_rgba(61,107,114,0.5)]" : "border-[#153D22] bg-[#1E4D2B] text-white shadow-[0_6px_18px_rgba(30,77,43,0.45)]"
            : t.membre ? "border-[#8FB5BA] bg-[#EDF4F3] text-[#2A5259] hover:border-[#3D6B72] hover:bg-[#DFEDEB]" : "border-[#C4AE85] bg-white text-[#463C28] hover:border-[#C89F62] hover:bg-[#F7EFDB]"
        }`}
      >
        {t.icon}
        {t.label}
        {badge > 0 && (
          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${actif ? "bg-[#C89F62] text-[#2B2416]" : "bg-[#A5473D] text-white"}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-10 pt-3 sm:px-4">
      {/* ── en-tête du poste ── */}
      <FcCard className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#1E4D2B] to-[#2F6B45] px-4 py-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Gavel className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#C89F62]">Table de gestion opérationnelle</p>
              <p className="fc-serif text-[19px] font-bold leading-tight">Poste de commandement — Président</p>
              <p className="mt-0.5 text-[12px] text-white/85">Joseph Mbeutetsa (vous) · Cantine Mbeutetsa · {TONTINE.jourLabel}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <P cls="border-white/25 bg-white/10 text-white"><Users className="h-3 w-3" /> {roster.length} membres</P>
            <P cls="border-white/25 bg-white/10 text-white"><UserCheck className="h-3 w-3" /> {nbPresent} présents</P>
            <P cls={cotisCeMois ? "border-white/25 bg-white/10 text-white" : "border-[#C89F62] bg-[#C89F62]/25 text-[#FFEBD2]"}>
              <CheckCircle2 className="h-3 w-3" /> Membre n°1 — {cotisCeMois ? "cotisation à jour" : "cotisation du mois à faire"}
            </P>
            {seance === "ouverte" && <P cls="border-[#C89F62] bg-[#C89F62] text-[#2B2416]"><Timer className="h-3 w-3" /> Séance en cours</P>}
          </div>
        </div>
      </FcCard>

      {/* ── onglets — TOUS visibles (pas de coupure), GRANDS et CONTRASTÉS :
              arrière-plan blanc, bordure épaisse, texte 14px — chaque onglet a
              son URL : #president/<onglet> — partageable, rafraîchissable ── */}
      <nav aria-label="Sections du poste de commandement" className="sticky top-0 z-20 -mx-3 mt-3 bg-[#F6EFE2]/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="rounded-2xl border-2 border-[#B8A87E] bg-white p-2.5 shadow-[0_10px_30px_rgba(42,74,58,0.14)]">
          {/* v17 : DEUX FAMILLES DE COULEURS — vert = gestion du bureau,
           *    sarcelle = espace membre personnel ; le président voit du premier
           *    coup d’œil à quelle section appartient chaque onglet. — */}
          <p className="flex items-center gap-1.5 px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#1E4D2B]">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[#1E4D2B]" /> Gestion de la cantine
          </p>
          <div className="flex flex-wrap gap-2">{tabsGestion.map(renderTab)}</div>
          <p className="flex items-center gap-1.5 px-1 pb-2 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#2A5259]">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[#3D6B72]" /> Espace membre — le président cotise, épargne et emprunte comme tous
          </p>
          <div className="flex flex-wrap gap-2">{tabsMembre.map(renderTab)}</div>
        </div>
      </nav>

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {COCKPIT_ACTIVE && tab === "cockpit" && (
          <CockpitSection
            aujourdhuiInfo={aujourdhuiInfo}
            cotisAttendues={roster.length}
            cotisDeclarees={cotisDeclarees}
            nbRetards={nbRetards}
            totalRetards={totalRetards}
            caisseSecours={caisseSecours}
            caisseSociale={85_000}
            pretsAttente={pretsAttente}
            votesEnCours={votesEnCours}
            candidatsEnCours={candidatsEnCours}
            parolesAttente={parolesAttente}
            seance={seance}
            nbPresent={nbPresent}
            pointsClotures={pointsClotures}
            nbDecisions={decisions.length}
            decisions={decisions}
            onGo={goTab}
            onOuvrir={ouvrirSeance}
          />
        )}
        {tab === "cotisations" && (
          <CotisationsCollationsSection
            mois={moisCourant}
            roster={roster}
            parMembre={parMembre}
            typesCotis={typesCotis}
            collations={collations}
            montants={montants}
            cotisMois={cotisMois}
            onEncaisser={encaisserCotis}
            onToutEncaisser={toutEncaisser}
            onNotifierTresorier={notifierCollecte}
          />
        )}
        {SEANCE_ACTIVE && tab === "reunion" && (
          <ReunionSection
            seance={seance}
            oj={oj}
            presences={presences}
            roster={roster}
            paroles={paroles}
            decisions={decisions}
            decForm={decForm}
            setDecForm={setDecForm}
            penAbsence={TONTINE.penaliteAbsence}
            penRetard={TONTINE.penaliteRetard}
            pot={pot}
            onOuvrir={ouvrirSeance}
            onCloturer={cloturerSeance}
            onPresence={marquerPresence}
            onToutPresent={toutPresent}
            onDemarrer={demarrerPoint}
            onValiderAppel={validerAppel}
            onNotifierCollecte={notifierCollecte}
            onConfirmerRemise={confirmerRemise}
            onEnregistrerDecision={enregistrerDecision}
            onAccorder={accorderParole}
            onTerminer={terminerParole}
            onDifferer={differerParole}
            parMembre={parMembre}
          />
        )}
        {tab === "epargnes" && (
          <EpargnesGestionSection
            epargnes={epargnesReunion}
            parMembre={parMembre}
            roster={roster}
            regl={reglement}
            moisCourantIdx={moisCourantIdx}
            onAttribuer={(membreId, montant, moisIdx) => {
              const m = parMembre.get(membreId);
              const next = [...epargnesReunion, { id: nid(), membreId, montant, moisIdx }];
              majEpargnesReunion(next, `Épargne de ${fcfa(montant)} attribuée à ${m?.name} — rattachée à ${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}.`);
            }}
            onRetirer={(id) => {
              const e = epargnesReunion.find((x) => x.id === id);
              if (!e) return;
              /* v16 : le toast cite le MOIS de l’épargne retirée — quand un membre
               *    a plusieurs versements, on sait exactement laquelle a disparu. — */
              majEpargnesReunion(epargnesReunion.filter((x) => x.id !== id), `Épargne de ${parMembre.get(e.membreId)?.name} retirée du registre (${fcfa(e.montant)} — rattachée à ${MOIS_FR[Math.min(11, Math.max(0, e.moisIdx))]}).`);
            }}
          />
        )}
        {tab === "prets" && (
          <PretsSection
            prets={prets}
            parMembre={parMembre}
            roster={roster}
            regl={reglement}
            moisCourantIdx={moisCourantIdx}
            pretsReunion={pretsReunion}
            onAttribuerPret={(membreId, montant, moisIdx) => {
              const m = parMembre.get(membreId);
              const next = [...pretsReunion, { id: nid(), membreId, montant, moisIdx }];
              majPretsReunion(next, `Prêt de ${fcfa(montant)} à la réunion attribué à ${m?.name} — rattaché à ${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}.`);
            }}
            onRetirerPret={(id) => {
              const pr = pretsReunion.find((x) => x.id === id);
              if (!pr) return;
              majPretsReunion(pretsReunion.filter((x) => x.id !== id), `Prêt de ${parMembre.get(pr.membreId)?.name} retiré du registre (${fcfa(pr.montant)} — rattaché à ${MOIS_FR[Math.min(11, Math.max(0, pr.moisIdx))]}).`);
            }}
            /* — v13 : avances de remboursement + remboursement définitif — */
            onAjouterAvancePret={(id, montant, moisIdx) => {
              const pr = pretsReunion.find((x) => x.id === id);
              if (!pr) return;
              const m = parMembre.get(pr.membreId);
              const next = pretsReunion.map((x) =>
                x.id === id ? { ...x, avances: [...(x.avances ?? []), { id: nid(), montant, moisIdx: Math.min(11, Math.max(0, moisIdx)) }] } : x,
              );
              majPretsReunion(next, `Avance de remboursement de ${fcfa(montant)} versée à ${m?.name} (${MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}).`);
            }}
            onRetirerAvancePret={(id, avanceId) => {
              const pr = pretsReunion.find((x) => x.id === id);
              const av = pr?.avances?.find((a) => a.id === avanceId);
              if (!pr || !av) return;
              const next = pretsReunion.map((x) => (x.id === id ? { ...x, avances: (x.avances ?? []).filter((a) => a.id !== avanceId) } : x));
              majPretsReunion(next, `Avance de ${fcfa(av.montant)} retirée du prêt de ${parMembre.get(pr.membreId)?.name}.`);
            }}
            onConfirmerRemboursementPret={(id, rembourse) => {
              const pr = pretsReunion.find((x) => x.id === id);
              if (!pr) return;
              const m = parMembre.get(pr.membreId);
              const next = pretsReunion.map((x) => (x.id === id ? { ...x, rembourse } : x));
              const totalR = (pr.avances ?? []).filter((a) => a.moisIdx <= rembourse.moisIdx).reduce((s, a) => s + a.montant, 0) + rembourse.montant;
              majPretsReunion(next, `Remboursement confirmé — le prêt de ${m?.name} (${fcfa(pr.montant)}, rattaché à ${MOIS_FR[Math.min(11, Math.max(0, pr.moisIdx))]}) quitte le registre actif. Total rendu : ${fcfa(totalR)} ; visible dans « Prêts remboursés ».`);
            }}
            onAnnulerRemboursementPret={(id) => {
              const pr = pretsReunion.find((x) => x.id === id);
              if (!pr) return;
              const next = pretsReunion.map((x) => (x.id === id ? { ...x, rembourse: null } : x));
              majPretsReunion(next, `Remboursement annulé — le prêt de ${parMembre.get(pr.membreId)?.name} revient dans le registre actif.`);
            }}
            onMaj={majPret}
            onAccorder={accorderPret}
            onRefuser={refuserPret}
            onVoterBureau={voterPretBureau}
          />
        )}
        {tab === "solidarite" && (
          <SolidariteSection
            evs={evs}
            parMembre={parMembre}
            roster={roster}
            caisseSecours={caisseSecours}
            regl={reglement}
            moisCourantIdx={moisCourantIdx}
            onProposer={proposerAide}
            onVoter={voter}
            onDecaisser={decaisser}
            /* — v14 : types de solidarité, mains levées, calendrier de visites — */
            typesSolidarite={typesSolidarite}
            majTypesSolidarite={majTypesSolidarite}
            mainsLevees={mainsLevees}
            majMainsLevees={majMainsLevees}
            visites={visitesSolidarite}
            majVisites={majVisitesSolidarite}
          />
        )}
        {ADHESIONS_ACTIVE && tab === "adhesions" && (
          <AdhesionsSection
            candidats={candidats}
            onCocher={cocherEtape}
            onConvoquer={convoquerVote}
            onPublier={publierAdmission}
            onDoc={docOfficiel}
          />
        )}
        {tab === "postes" && (
          <PostesSection
            postes={postes}
            roster={roster}
            parMembre={parMembre}
            onAttribuer={attribuerPoste}
            onRetirer={retirerPoste}
          />
        )}
        {JOURNAL_ACTIVE && tab === "journal" && <JournalSection journal={journal} />}
        {tab === "parametres" && (
          <ParametresSection
            regl={reglement}
            sale={reglSale}
            maj={majReglement}
            typesCotis={typesCotis}
            majTypesCotis={majTypesCotis}
            collations={collations}
            majCollations={majCollations}
            montants={montants}
            majMontantBase={majMontantBase}
            roster={roster}
            sous={sousParam}
            goSous={goSousParam}
            onPublier={publierReglementAuxMembres}
            onReinitialiser={reinitialiserReglement}
          />
        )}
        {tab === "m-cotis" && (
          <MesCotisationsSection
            moisCourant={moisCourant}
            cotisCeMois={cotisCeMois}
            historique={historiqueCotis}
            declarees={cotisDeclarees}
            attendues={roster.length}
            typesCotis={typesCotis}
            collations={collations}
            penRetard={TONTINE.penaliteRetard}
            onCotiser={cotiserMoi}
          />
        )}
        {tab === "m-epargne" && (
          <MesEpargnesSection
            /* v18 : solde et mouvements DÉRIVÉS — les épargnes du président
             * inscrites au registre du bureau (page « Épargnes ») remontent
             * automatiquement dans son compte personnel. */
            solde={soldeEpargneMoi}
            ops={opsEpargneMoi}
            taux={tauxEpargneVigueur(reglement)}
            preavisJours={reglement.epargne.preavisJours}
            typeEpargneNom={reglement.epargne.typeChoisi ? TYPES_EPARGNE_CATALOGUE.find((t) => t.id === reglement.epargne.typeChoisi)?.nom ?? null : null}
            collecte={reglement.epargne.collecteInterets}
            moisCourantIdx={moisCourantIdx}
            onRetrait={retirerEpargneMoi}
          />
        )}
        {tab === "m-prets" && (
          <MesPretsSection
            mesPrets={mesPrets}
            parMembre={parMembre}
            roster={roster}
            regl={reglement}
            form={mesPretsForm}
            setForm={setMesPretsForm}
            moisChoisi={pretMoisChoisi}
            setMoisChoisi={setPretMoisChoisi}
            moisCourantIdx={moisCourantIdx}
            onDemander={demanderPretMoi}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ COCKPIT ══════════════════════════ */

function CockpitSection(p: {
  aujourdhuiInfo: { jReste: number; mois: string } | null;
  cotisAttendues: number; cotisDeclarees: number;
  nbRetards: number; totalRetards: number; caisseSecours: number; caisseSociale: number;
  pretsAttente: number; votesEnCours: number; candidatsEnCours: number; parolesAttente: number;
  seance: "fermee" | "ouverte" | "cloturee"; nbPresent: number; pointsClotures: number; nbDecisions: number;
  decisions: Decision[];
  onGo: (t: TabKey) => void; onOuvrir: () => void;
}) {
  const urgentes: { texte: string; cta: string; tab: TabKey; cls: string; icon: ReactNode }[] = [];
  if (p.pretsAttente > 0) urgentes.push({ texte: `${p.pretsAttente} demande(s) de prêt à statuer (avaliste + co-signature)`, cta: "Statuer", tab: "prets", cls: OR_CLS, icon: <ShieldCheck className="h-3.5 w-3.5" /> });
  if (p.votesEnCours > 0) urgentes.push({ texte: `Caisse de secours — ${p.votesEnCours} dossier(s) à proposer / faire voter`, cta: "Ouvrir", tab: "solidarite", cls: TE_CLS, icon: <HeartHandshake className="h-3.5 w-3.5" /> });
  if (p.candidatsEnCours > 0) urgentes.push({ texte: `${p.candidatsEnCours} candidature(s) à instruire (moralité, solvabilité)`, cta: "Instruire", tab: "adhesions", cls: "bg-[#2F6B45]/10 text-[#2F6B45] border-[#2F6B45]/25", icon: <UserPlus className="h-3.5 w-3.5" /> });
  if (SEANCE_ACTIVE && p.parolesAttente > 0) urgentes.push({ texte: `${p.parolesAttente} demande(s) de parole en attente`, cta: "Séance", tab: "reunion", cls: TE_CLS, icon: <Hand className="h-3.5 w-3.5" /> });

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Prochaine réunion"
          value={p.aujourdhuiInfo ? `2ᵉ dim. ${p.aujourdhuiInfo.mois}` : "…"}
          sub={p.aujourdhuiInfo ? (p.aujourdhuiInfo.jReste === 0 ? "C’est aujourd’hui" : `dans ${p.aujourdhuiInfo.jReste} jour(s)`) : " "}
          tone="#1E4D2B" />
        <KpiCard icon={<Coins className="h-4 w-4" />} label="Cotisations du mois"
          value={`${p.cotisDeclarees}/${p.cotisAttendues}`}
          sub="déclarées par le trésorier"
          tone="#8A6420"
          barre={{ pct: Math.round((p.cotisDeclarees / p.cotisAttendues) * 100) }} />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Impayés"
          value={fcfa(p.totalRetards)}
          sub={`${p.nbRetards} membre(s) en retard`}
          tone="#A5473D" />
        <KpiCard icon={<PiggyBank className="h-4 w-4" />} label="Caisses"
          value={fcfa(p.caisseSociale + p.caisseSecours)}
          sub={`sociale ${fmt(p.caisseSociale)} · secours ${fmt(p.caisseSecours)}`}
          tone="#3D6B72" />
      </div>

      {/* Séance du jour — MASQUÉE pour l'instant (SEANCE_ACTIVE = false, demande
          de l'administrateur : « on les utilisera peut-être une autre fois »). */}
      {SEANCE_ACTIVE && (
      <Block title="Séance du jour" icon={<Timer className="h-4.5 w-4.5" />}>
        {p.seance === "fermee" && (
          <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-bold text-[#2B3530]">La séance mensuelle n’est pas encore ouverte</p>
              <p className="text-[12px] text-[#8A9288]">Ouvrez la séance pour lancer l’appel, la file de parole et les décisions.</p>
            </div>
            <Btn onClick={p.onOuvrir}><Play className="h-4 w-4" /> Ouvrir la séance</Btn>
          </div>
        )}
        {p.seance === "ouverte" && (
          <div className="flex flex-col items-start gap-3 bg-[#2F6B45]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-bold text-[#2F6B45]"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#2F6B45]" /> Séance en cours</p>
              <p className="text-[12px] text-[#5C6B60]">{p.nbPresent} présents · {p.pointsClotures} point(s) clôturé(s) · {p.nbDecisions} décision(s)</p>
            </div>
            <Btn tone="neutre" onClick={() => p.onGo("reunion")}>Reprendre la séance <ArrowRight className="h-4 w-4" /></Btn>
          </div>
        )}
        {p.seance === "cloturee" && (
          <div className="flex flex-col items-start gap-3 bg-[#1E4D2B]/8 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[14px] font-bold text-[#1E4D2B]"><CheckCircle2 className="h-4 w-4" /> Séance clôturée</p>
              <p className="text-[12px] text-[#5C6B60]">{p.nbDecisions} décision(s) enregistrée(s) · PV transmis à la secrétaire.</p>
            </div>
            <Btn tone="neutre" onClick={() => p.onGo("journal")}>Voir le journal <ArrowRight className="h-4 w-4" /></Btn>
          </div>
        )}
      </Block>
      )}

      <Block title="Actions urgentes" icon={<AlertTriangle className="h-4.5 w-4.5" />} note="Chaque action est interactive : elle notifie l’acteur concerné (trésorier, secrétaire, vice-président, membre) et s’inscrit au journal.">
        {urgentes.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-[#5C6B60]"><CheckCircle2 className="h-4 w-4 text-[#2F6B45]" /> Rien d’urgent — la cantine tourne rondement.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {urgentes.map((u) => (
              <li key={u.texte} className="flex items-center gap-3 px-4 py-3">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${u.cls}`}>{u.icon}</span>
                <p className="flex-1 text-[13px] font-semibold text-[#2B3530]">{u.texte}</p>
                <Btn small tone="neutre" onClick={() => p.onGo(u.tab)}>{u.cta} <ChevronRight className="h-3.5 w-3.5" /></Btn>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {p.decisions.length > 0 && (
        <Block title="Dernières décisions de la séance" icon={<Gavel className="h-4.5 w-4.5" />} note="Chaque décision porte un responsable et une échéance — le secrétaire les reçoit pour le procès-verbal.">
          <ul className="space-y-2 p-3">
            {p.decisions.slice(0, 3).map((d) => (
              <li key={d.id} className="rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2.5">
                <p className="text-[12.5px] font-bold text-[#1E4D2B]">{d.point}</p>
                <p className="text-[12.5px] text-[#2B3530]">{d.texte}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <P cls={TE_CLS}><UserCheck className="h-3 w-3" /> {d.responsable}</P>
                  <P cls={OR_CLS}><Hourglass className="h-3 w-3" /> {d.echeance}</P>
                  <P>{d.le}</P>
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  );
}

function KpiCard({ icon, label, value, sub, tone, barre }: {
  icon: ReactNode; label: string; value: string; sub: string; tone: string; barre?: { pct: number };
}) {
  return (
    <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3 shadow-[0_4px_14px_rgba(42,74,58,0.08)]">
      <div className="flex items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${tone}18`, color: tone }}>{icon}</span>
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">{label}</p>
      </div>
      <p className="mt-1.5 text-[17px] font-black leading-none text-[#2B3530]">{value}</p>
      <p className="mt-1 truncate text-[10.5px] text-[#8A9288]">{sub}</p>
      {barre && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E5DCC0]">
          <div className="h-full rounded-full bg-[#C89F62] transition-all" style={{ width: `${barre.pct}%` }} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ RÉUNION EN DIRECT ══════════════════════════ */

function ReunionSection(p: {
  seance: "fermee" | "ouverte" | "cloturee";
  oj: OJPoint[];
  presences: Record<string, PresenceEtat>;
  roster: typeof MEMBRES_FICTIFS;
  paroles: Parole[];
  decisions: Decision[];
  decForm: { pointId: string; texte: string; resp: string; echeance: string } | null;
  setDecForm: (f: { pointId: string; texte: string; resp: string; echeance: string } | null) => void;
  penAbsence: number; penRetard: number; pot: number;
  onOuvrir: () => void; onCloturer: () => void;
  onPresence: (id: string) => void; onToutPresent: () => void;
  onDemarrer: (id: string) => void; onValiderAppel: () => void;
  onNotifierCollecte: () => void; onConfirmerRemise: () => void;
  onEnregistrerDecision: () => void;
  onAccorder: (id: string) => void; onTerminer: (id: string) => void; onDifferer: (id: string) => void;
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
}) {
  const statutChip = (s: OJStatut) =>
    s === "en_attente" ? <P><Hourglass className="h-3 w-3" /> En attente</P>
      : s === "en_cours" ? <P cls={OR_CLS}><Timer className="h-3 w-3" /> En cours</P>
        : <P cls={OK_CLS}><CheckCircle2 className="h-3 w-3" /> Clôturé</P>;

  const presenceChip = (etat: PresenceEtat) =>
    etat === "present" ? <P cls={OK_CLS}><Check className="h-3 w-3" /> Présent</P>
      : etat === "excuse" ? <P cls={OR_CLS}><FileText className="h-3 w-3" /> Excusé</P>
        : etat === "absent" ? <P cls={RJ_CLS}><Ban className="h-3 w-3" /> Absent</P>
          : <P><Hourglass className="h-3 w-3" /> En attente</P>;

  return (
    <>
      {/* — barre de conduite de la séance — */}
      <FcCard className="p-4">
        {p.seance === "fermee" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#5C6B60]">Préparez-vous : ordre du jour chargé, l’appel se fera en direct.</p>
            <Btn onClick={p.onOuvrir}><Play className="h-4 w-4" /> Ouvrir la séance</Btn>
          </div>
        )}
        {p.seance === "ouverte" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#2F6B45]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#2F6B45]" />
              Séance en cours — les membres reçoivent vos notifications en temps réel.
            </p>
            <Btn tone="rouge" onClick={p.onCloturer}><Pause className="h-4 w-4" /> Clôturer la séance</Btn>
          </div>
        )}
        {p.seance === "cloturee" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#1E4D2B]">
              <CheckCircle2 className="h-4.5 w-4.5" /> Séance clôturée — synthèse envoyée à la secrétaire ({p.decisions.length} décision(s)).
            </p>
            <Btn tone="neutre" onClick={p.onOuvrir}><Play className="h-4 w-4" /> Rouvrir</Btn>
          </div>
        )}
      </FcCard>

      {/* — appel des présences — */}
      <Block title="Appel des membres — en direct" icon={<UserCheck className="h-4.5 w-4.5" />}
        note="Touchez un membre pour changer son état : en attente → présent → excusé → absent. Chaque absence génère automatiquement la pénalité pour le trésorier.">
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          <P cls={OK_CLS}><Check className="h-3 w-3" /> {p.roster.filter((m) => p.presences[m.id] === "present").length} présents</P>
          <P cls={OR_CLS}><FileText className="h-3 w-3" /> {p.roster.filter((m) => p.presences[m.id] === "excuse").length} excusés</P>
          <P cls={RJ_CLS}><Ban className="h-3 w-3" /> {p.roster.filter((m) => p.presences[m.id] === "absent").length} absents</P>
          {p.seance === "ouverte" && <Btn small tone="neutre" onClick={p.onToutPresent}>Tout marquer présent</Btn>}
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {p.roster.map((m) => {
            const etat = p.presences[m.id] ?? "attente";
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => p.seance === "ouverte" ? p.onPresence(m.id) : undefined}
                disabled={p.seance !== "ouverte"}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all ${
                  etat === "present" ? "border-[#2F6B45]/40 bg-[#2F6B45]/8"
                    : etat === "absent" ? "border-[#A5473D]/35 bg-[#A5473D]/6"
                      : etat === "excuse" ? "border-[#C89F62]/45 bg-[#C89F62]/8"
                        : "border-[#E5DCC0] bg-[#FFFDF6]"
                } ${p.seance === "ouverte" ? "active:scale-[0.98] hover:border-[#2A4A3A]/40" : "opacity-70"}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black text-white" style={{ background: m.role === "president" ? "#1E4D2B" : "#5C6B60" }}>
                  {m.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#2B3530]">{m.name}{m.role === "president" ? " (vous)" : ""}</span>
                  <span className="block truncate text-[10.5px] text-[#8A9288]">
                    {m.city}
                    {etat === "absent" ? ` · pénalité ${fcfa(p.penAbsence)}` : ""}
                  </span>
                </span>
                {presenceChip(etat)}
              </button>
            );
          })}
        </div>
      </Block>

      {/* — ordre du jour — */}
      <Block title="Ordre du jour — conduite point par point" icon={<ClipboardList className="h-4.5 w-4.5" />}
        note="Démarrez un point, menez-le, puis clôturez-le par une décision : responsable + échéance. La décision part au secrétaire (PV) et aux membres concernés.">
        <ol className="space-y-2.5 p-3">
          {p.oj.map((pt, i) => (
            <li key={pt.id} className={`rounded-2xl border px-3.5 py-3 ${
              pt.statut === "en_cours" ? "border-[#C89F62]/60 bg-[#C89F62]/8" : pt.statut === "cloture" ? "border-[#2F6B45]/25 bg-[#2F6B45]/5" : "border-[#E5DCC0] bg-[#FFFDF6]"
            }`}>
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  pt.statut === "cloture" ? "bg-[#2F6B45] text-white" : pt.statut === "en_cours" ? "bg-[#C89F62] text-[#2B2416]" : "bg-[#E5DCC0] text-[#5C6B60]"
                }`}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-[#2B3530]">{pt.titre}</p>
                  <p className="text-[11.5px] text-[#8A9288]">{pt.detail}</p>
                  <div className="mt-1.5">{statutChip(pt.statut)}</div>
                </div>
                {p.seance === "ouverte" && pt.statut === "en_attente" && (
                  <Btn small onClick={() => p.onDemarrer(pt.id)}><Play className="h-3.5 w-3.5" /> Démarrer</Btn>
                )}
              </div>

              {/* actions spécifiques du point en cours */}
              {p.seance === "ouverte" && pt.statut === "en_cours" && (
                <div className="mt-2.5 space-y-2.5 border-t border-[#C89F62]/30 pt-2.5">
                  {pt.genre === "appel" && (
                    <div className="flex flex-wrap gap-2">
                      <Btn small onClick={p.onValiderAppel}><CheckCircle2 className="h-3.5 w-3.5" /> Valider l’appel & le quorum</Btn>
                    </div>
                  )}
                  {pt.genre === "collecte" && (
                    <div className="flex flex-wrap gap-2">
                      <Btn small tone="or" onClick={p.onNotifierCollecte}><Send className="h-3.5 w-3.5" /> Notifier le trésorier d’encaisser</Btn>
                    </div>
                  )}
                  {pt.genre === "remise" && (
                    <div className="flex flex-wrap gap-2">
                      <Btn small tone="or" onClick={p.onConfirmerRemise}><Wallet className="h-3.5 w-3.5" /> Confirmer la remise de {fcfa(p.pot)} devant témoin</Btn>
                    </div>
                  )}
                  {pt.genre === "dossiers" && (
                    <p className="text-[11.5px] text-[#8A6420]">Traitez les dossiers depuis les onglets Prêts · Solidarité · Adhésions — puis clôturez ce point par une synthèse.</p>
                  )}
                  {p.decForm?.pointId !== pt.id && (
                    <Btn small tone="neutre" onClick={() => p.setDecForm({ pointId: pt.id, texte: "", resp: "", echeance: "Prochaine réunion" })}>
                      <Gavel className="h-3.5 w-3.5" /> Clôturer le point par une décision
                    </Btn>
                  )}
                  {p.decForm?.pointId === pt.id && (
                    <div className="space-y-2 rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A6420]">Décision du point {i + 1}</p>
                      <textarea
                        value={p.decForm.texte}
                        onChange={(e) => p.setDecForm({ ...p.decForm, texte: e.target.value })}
                        rows={2}
                        placeholder="Ex. : L’échange de tour entre P. Talla et H. Fotso est accepté, effectif dès janvier."
                        className="w-full rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] text-[#2B3530] placeholder:text-[#8A9288] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={p.decForm.resp}
                          onChange={(e) => p.setDecForm({ ...p.decForm, resp: e.target.value })}
                          className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none"
                        >
                          <option value="">Responsable…</option>
                          {p.roster.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                        <select
                          value={p.decForm.echeance}
                          onChange={(e) => p.setDecForm({ ...p.decForm, echeance: e.target.value })}
                          className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none"
                        >
                          <option>Immédiat</option>
                          <option>Sous 7 jours</option>
                          <option>Prochaine réunion</option>
                          <option>À l’assemblée générale</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Btn small onClick={p.onEnregistrerDecision}><CheckCircle2 className="h-3.5 w-3.5" /> Enregistrer & clôturer</Btn>
                        <Btn small tone="neutre" onClick={() => p.setDecForm(null)}>Annuler</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Block>

      {/* — file de parole — */}
      <Block title={`File de parole${p.parolesAttente > 0 ? ` — ${p.parolesAttente} en attente` : ""}`} icon={<Hand className="h-4.5 w-4.5" />}
        note="En séance, les membres demandent la parole depuis leur téléphone (bouton « Demander la parole »). Vous accordez, surveillez, différerez — l’ordre est respecté, personne ne coupe personne.">
        {p.paroles.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-[#8A9288]">Aucune demande — la parole est à vous.</p>
        ) : (
          <ul className="space-y-2 p-3">
            {p.paroles.map((par) => {
              const m = p.parMembre.get(par.membreId);
              return (
                <li key={par.id} className={`rounded-xl border px-3 py-2.5 ${par.statut === "accordee" ? "border-[#3D6B72]/45 bg-[#3D6B72]/8" : "border-[#E5DCC0] bg-[#FFFDF6]"}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${par.statut === "accordee" ? "bg-[#3D6B72] text-white" : "bg-[#E5DCC0] text-[#5C6B60]"}`}>
                      {par.statut === "accordee" ? <Mic className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#2B3530]">{m?.name}</p>
                      <p className="text-[12px] text-[#5C6B60]">{par.sujet}</p>
                    </div>
                    {par.statut === "demande" && p.seance === "ouverte" && (
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                        <Btn small tone="teal" onClick={() => p.onAccorder(par.id)}><Mic className="h-3.5 w-3.5" /> Accorder</Btn>
                        <Btn small tone="neutre" onClick={() => p.onDifferer(par.id)}><Pause className="h-3.5 w-3.5" /> Différer</Btn>
                      </div>
                    )}
                    {par.statut === "accordee" && (
                      <Btn small tone="neutre" onClick={() => p.onTerminer(par.id)}><CheckCircle2 className="h-3.5 w-3.5" /> Terminer</Btn>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </>
  );
}


function PretsSection(p: {
  prets: PretDemande[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: typeof MEMBRES_FICTIFS;
  regl: Reglement;
  moisCourantIdx: number | null;
  /** REGISTRE des prêts FAITS À LA RÉUNION par les membres (v12) — le prêt est
   *  manuel : le président l'inscrit dans la machine (section Attribution). */
  pretsReunion: AttributionReunion[];
  onAttribuerPret: (membreId: string, montant: number, moisIdx: number) => void;
  onRetirerPret: (id: string) => void;
  /* — v13 : avances de remboursement + confirmation du remboursement — */
  onAjouterAvancePret: (id: string, montant: number, moisIdx: number) => void;
  onRetirerAvancePret: (id: string, avanceId: string) => void;
  onConfirmerRemboursementPret: (id: string, rembourse: RemboursementPret) => void;
  onAnnulerRemboursementPret: (id: string) => void;
  onMaj: (id: string, patch: Partial<PretDemande>) => void;
  onAccorder: (x: PretDemande) => void; onRefuser: (x: PretDemande) => void;
  onVoterBureau: (id: string, qui: "vice" | "tresorier" | "censeur", pour: boolean) => void;
}) {
  const taux = p.regl.prets.tauxMensuel || TAUX_DEFAUT;
  const duree = p.regl.prets.dureeMaxMois > 0 ? p.regl.prets.dureeMaxMois : 6;
  const periode = p.regl.prets.reconductionCapital ? (p.regl.prets.periodeCapitalisationMois > 0 ? p.regl.prets.periodeCapitalisationMois : 3) : 0;
  return (
    <>
      <FcCard className="p-4">
        <p className="text-[13px] leading-relaxed text-[#5C6B60]">
          <strong className="text-[#1E4D2B]">Prêts faits à la réunion :</strong> la liste de toutes les personnes qui ont prêté de l’argent à la réunion — le mois, la somme, les intérêts produits au taux en vigueur ({taux} %/mois, décidé dans Paramètres → Prêts) et les sommes globales. Chaque ligne se déplie ({""}
          <ChevronDown className="inline h-3.5 w-3.5" />
          {" "}) en l’<strong className="text-[#1E4D2B]">évolution mois par mois</strong> du prêt — intérêts, avances de remboursement, total dû — avec la reconduction du capital non remboursé au bout de {duree} mois ; le bouton « Remboursé » clôt le prêt et l’envoie dans la section « Prêts remboursés ». Le prêt est manuel : c’est vous qui l’inscrivez dans la machine (section « Attribution » ci-dessous). Puis les dossiers de prêt des membres — emprunts à la caisse, supervision à deux (votre validation + co-signature du trésorier).
        </p>
      </FcCard>

      {/* — REGISTRE + ATTRIBUTION + SUIVI des prêts faits à la réunion (v13) — */}
      <RegistreReunionSection
        genre="prets"
        items={p.pretsReunion}
        parMembre={p.parMembre}
        roster={p.roster}
        taux={taux}
        moisCourantIdx={p.moisCourantIdx}
        duree={duree}
        periode={periode}
        onAttribuer={p.onAttribuerPret}
        onRetirer={p.onRetirerPret}
        onAjouterAvance={p.onAjouterAvancePret}
        onRetirerAvance={p.onRetirerAvancePret}
        onConfirmerRemboursement={p.onConfirmerRemboursementPret}
        onAnnulerRemboursement={p.onAnnulerRemboursementPret}
      />

      <Block
        title="Dossiers de prêt des membres — emprunts à la caisse"
        icon={<ShieldCheck className="h-4.5 w-4.5" />}
        note="Les demandes déposées par les membres : décision du bureau, avaliste, co-signature — le calendrier d’évolution de CHAQUE prêt (intérêts, mensualité, reste dû) s’affiche sous le dossier, comme dans l’espace membre, avec la reconduction du capital non remboursé si elle est activée."
      >
        <div className="space-y-3.5 p-4">
      {p.prets.map((pr) => {
        const m = p.parMembre.get(pr.membreId);
        const av = pr.avalisteId ? p.parMembre.get(pr.avalisteId) : null;
        const moisIdx = pr.moisIdx ?? p.moisCourantIdx ?? 0;
        return (
          <FcCard key={pr.id} className={`p-4 ${pr.statut === "refuse" ? "opacity-75" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-[#2B3530]">{m?.name}{pr.president ? " (vous — récusé)" : ""} — {fcfa(pr.montant)}</p>
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

            {/* — ÉVOLUTION DU PRÊT, mois par mois : intérêts produits,
             *    mensualité, reste dû — exactement comme dans l’espace membre.
             *    Visible dès la demande : on voit ce que le prêt coûtera AVANT
             *    de l’accorder. Les NOMS des personnes concernées (membre +
             *    avaliste) s’affichent au-dessus du tableau, en grand. — */}
            {pr.statut !== "refuse" && (
              <div className="mt-3 border-t border-[#E5DCC0] pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-black text-[#1E4D2B]">Calendrier de remboursement — évolution du prêt</p>
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
                  Votre propre dossier — récusation : le bureau statue sans votre voix. Majorité de 2/3 (vice-présidente, trésorier, censeur).
                </p>
                <div className="space-y-1.5">
                  {VOTEURS_PRET.map((v) => {
                    const val = pr.votesBureau?.[v.qui] ?? null;
                    return (
                      <div key={v.qui} className="flex items-center gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-[#2B3530]">{v.nom}</p>
                          <p className="text-[10.5px] text-[#8A9288]">{v.role}</p>
                        </div>
                        <Btn small tone={val === true ? "vert" : "neutre"} onClick={() => p.onVoterBureau(pr.id, v.qui, true)}><ThumbsUp className="h-3.5 w-3.5" /> Pour</Btn>
                        <Btn small tone={val === false ? "rouge" : "neutre"} onClick={() => p.onVoterBureau(pr.id, v.qui, false)}><ThumbsDown className="h-3.5 w-3.5" /> Contre</Btn>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {pr.statut === "en_attente" && !pr.president && (
              <div className="mt-3 space-y-2.5 border-t border-[#E5DCC0] pt-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#8A6420]">Avaliste (garant du remboursement)</span>
                  <select
                    value={pr.avalisteId ?? ""}
                    onChange={(e) => p.onMaj(pr.id, { avalisteId: e.target.value || null })}
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
                    onChange={(e) => p.onMaj(pr.id, { cosignTresorier: e.target.checked })}
                    className="h-4.5 w-4.5 accent-[#1F5B3F]"
                  />
                  <span className="text-[12.5px] font-semibold text-[#2B3530]">Co-signature du trésorier obtenue (contrôle du duo)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Btn small onClick={() => p.onAccorder(pr)}><BadgeCheck className="h-3.5 w-3.5" /> Accorder le prêt</Btn>
                </div>
                <div className="flex gap-2">
                  <input
                    value={pr.motifRefus}
                    onChange={(e) => p.onMaj(pr.id, { motifRefus: e.target.value })}
                    placeholder="Motif d’un éventuel refus (transmis au membre)…"
                    className="min-w-0 flex-1 rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[12.5px] placeholder:text-[#8A9288] focus:outline-none"
                  />
                  <Btn small tone="rouge" onClick={() => p.onRefuser(pr)}><XCircle className="h-3.5 w-3.5" /> Refuser</Btn>
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
    </>
  );
}

/* ══════════════════════════ REGISTRES & SUIVI — PRÊTS / ÉPARGNES À LA RÉUNION ══════════════════════════
 *
 * Demande du président (v13) — le tableau des prêts devient un VRAI suivi :
 *   · « On devrait voir pour chaque mois l'évolution des intérêts ainsi que
 *     les sommes totales de chaque mois » → chaque ligne se DÉPLIE en un
 *     calendrier mois par mois (capital, intérêts du mois, avances, total dû)
 *     et une table « Sommes totales mois par mois » additionne tous les prêts ;
 *   · « après le nombre de mois fixé dans les paramètres, si l'intérêt n'a pas
 *     été remboursé, la somme totale de ce mois devient l'élément sur lequel
 *     le pourcentage est de nouveau recalculé » → la reconduction du capital
 *     (Paramètres → Prêts) s'applique aussi aux prêts faits à la réunion ;
 *   · « lorsque cela a été remboursé… un champ qui permet de confirmer… il
 *     disparaît de la liste des personnes ayant prêté » → bouton « Confirmer
 *     le remboursement » + section PRÊTS REMBOURSÉS (intérêts produits +
 *     somme totale remboursée) ;
 *   · « un autre champ pour les avances de remboursement des prêts » → chaque
 *     prêt accepte des AVANCES (paie d'abord les intérêts, puis le capital).
 *
 * Demande du président (v12) :
 *   · « Cette page doit présenter la liste de toutes les personnes qui ont eu
 *     à prêter de l'argent à la réunion, les mois, les intérêts et les sommes
 *     globales. Si durant un mois quatre personnes ont fait des prêts à la
 *     réunion, les quatre apparaissent avec les sommes, le mois et les
 *     intérêts » → le REGISTRE (page Prêts) ;
 *   · « le prêt est manuel : il faut un tableau de tous les membres — le
 *     président sélectionne le membre approprié et lui attribue le prêt » →
 *     la section ATTRIBUTION (le taux configuré s'applique, et le président
 *     voit à la fin de l'année combien d'intérêts ces prêts ont produits) ;
 *   · « la même section d'attribution des épargnes doit se faire dans la
 *     nouvelle page des épargnes » → même composant, genre "epargnes".
 *
 * Un SEUL composant sert les deux pages (prêts / épargnes) : seuls les
 * libellés et le taux changent — le taux des prêts (Paramètres → Prêts) ou
 * celui des épargnes (Paramètres → Épargnes, modifiable/retirable). Les
 * nouveautés v13 (détail mois par mois, avances, remboursement, totaux
 * mensuels) ne s'affichent que pour les PRÊTS — les épargnes gardent leur
 * tableau simple.
 * ═══════════════════════════════════════════════════════════════════════════ */

const LIBELLES_REGISTRE = {
  prets: {
    registre: "Prêts faits à la réunion — registre du bureau",
    attrib: "Attribution des prêts à la réunion",
    nom: "prêt",
    nomPluriel: "prêts",
    action: "Attribuer le prêt",
    icone: <HandCoins className="h-4.5 w-4.5" />,
    noteRegistre: "Chaque ligne = un membre qui a prêté de l'argent à la réunion : le mois réel auquel le prêt est rattaché, la somme, les intérêts au taux en vigueur, réalisés jusqu'au mois courant et la projection au 31 décembre. Dépliez la ligne (chevron Détail) pour voir l'ÉVOLUTION MOIS PAR MOIS du prêt — capital, intérêts, avances, total dû — avec la reconduction du capital non remboursé à l'échéance. Quand la réunion rend son argent, confirmez le remboursement : le prêt rejoint la section « Prêts remboursés ».",
    noteAttrib: "Le prêt est manuel — c'est vous qui l'inscrivez dans la machine. Dans le tableau, repérez le membre approprié, tapez la somme qu'il a prêtée à la réunion, choisissez le mois réel (même un mois passé, si l'inscription arrive tard) puis attribuez : le pourcentage configuré dans Paramètres → Prêts s'applique aussitôt.",
  },
  epargnes: {
    registre: "Épargnes des membres — registre du bureau",
    attrib: "Attribution des épargnes",
    nom: "épargne",
    nomPluriel: "épargnes",
    action: "Attribuer l'épargne",
    icone: <PiggyBank className="h-4.5 w-4.5" />,
    noteRegistre: "Chaque ligne = UN membre, TOUTES ses épargnes regroupées (plusieurs versements ne créent jamais de doublon) : la somme totale épargnée, les mois réels des versements, les intérêts produits chaque mois au taux en vigueur et la projection au 31 décembre. Dépliez la ligne (chevron Détail) pour voir l'ÉVOLUTION MOIS PAR MOIS de toutes ses épargnes : le capital n'apparaît QUE les mois où l'argent a été versé — les autres mois restent vides — tandis que les intérêts, eux, évoluent chaque mois jusqu'au DERNIER MOIS DE L'ANNÉE (décembre). Une épargne attribuée PAR ERREUR (confusion de membre, mauvais montant, mauvais mois) se retire d'un geste : chaque versement porte sa poubelle (sur la ligne même quand il y en a plusieurs, sur la ligne entière pour un versement unique) — une CONFIRMATION est demandée avant toute suppression.",
    noteAttrib: "Comme pour les prêts : cherchez le membre dans le tableau (recherche dynamique en haut), tapez la somme de son épargne, choisissez le mois réel du dépôt puis attribuez — le taux configuré dans Paramètres → Épargnes (modifiable ou retirable) s'applique aussitôt, avec la manière de collecter les intérêts décidée par le bureau.",
  },
} as const;

/* — DÉTAIL D'UN PRÊT FAIT À LA RÉUNION (v13) : le panneau déplié sous une
 *    ligne du registre — l'évolution MOIS PAR MOIS (capital, intérêts du
 *    mois, avances, total dû), les badges d'échéance / nouveau capital, le
 *    formulaire des AVANCES DE REMBOURSEMENT et la CONFIRMATION du
 *    remboursement définitif. Pour un prêt clos : lecture seule, l'évolution
 *    s'arrête au mois du remboursement. — */
function PanneauDetailPret(p: {
  it: AttributionReunion;
  nom: string;
  taux: number;
  duree: number;
  periode: number;
  moisCourantIdx: number | null;
  /** true = prêt clos (remboursé) : lecture seule, plus d’avances ni de confirmation. */
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
   *    verser (total dû ce mois-là, avances déduites) ; le président peut
   *    l’ajuster à la main (arrangement à l’amiable). — */
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
        <p className="text-[13px] font-black uppercase tracking-wide text-[#1E4D2B]">
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
        {p.periode === 0 && " La reconduction répétée est désactivée (Paramètres → Prêts)."}
      </p>

      {/* — tableau d’évolution mois par mois — */}
      <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
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
            Quand la réunion rend une partie de l’argent avant le solde final, inscrivez l’avance ici — elle paie d’abord les intérêts courus, puis réduit le capital.
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
              className="w-44 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
            />
            <select
              value={avMois ?? moisAvanceDefaut}
              onChange={(e) => setAvMois(Number(e.target.value))}
              aria-label="Mois de l’avance de remboursement"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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
        <div className="rounded-2xl border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wide text-[#1F5B3F]">
            <BadgeCheck className="h-3.5 w-3.5" /> Confirmer le remboursement définitif
          </p>
          <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-[#3E5A4C]">
            Reste dû en {MOIS_FR[moisConfirm]} après déduction des avances : <strong>{fcfa(totalDuAuMois(moisConfirm))}</strong> — avances déjà versées : <strong className="text-[#255C3A]">{fcfa(evo.totalAvances)}</strong> au total. Une fois confirmé, le prêt quitte la liste des personnes ayant prêté et rejoint « Prêts remboursés ».
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={moisConfirm}
              onChange={(e) => { setRmMois(Number(e.target.value)); setRmMontant(null); }}
              aria-label="Mois du remboursement définitif"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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
              className="w-44 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
            />
            <Btn small onClick={confirmer}>
              <BadgeCheck className="h-3.5 w-3.5" /> Confirmer le remboursement
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}


/* — BOUTON « RETIRER » À DOUBLE CLIC (v16, demande du président) : une
 *    épargne (ou un prêt) attribué(e) PAR ERREUR — confusion de membre,
 *    mauvais montant, mauvais mois — doit pouvoir se supprimer SANS ambiguïté
 *    et SANS partir sur un clic malheureux : le premier clic ARME la
 *    confirmation (la poubelle passe en rouge plein, « Confirmer ? »), le
 *    second retire réellement ; sans second clic, tout rentre dans l’ordre
 *    après quelques secondes. Deux variantes : « ligne » (poubelle 8×8 des
 *    lignes du registre) et « pastille » (croix compacte des pastilles). — */
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

/* — DÉTAIL DES ÉPARGNES D’UN MEMBRE (v15, demande du président) : le panneau
 *    déplié sous la ligne (unique) du membre du registre — TOUTES ses épargnes
 *    sont regroupées ici. L’évolution court mois par mois, du mois du PREMIER
 *    versement jusqu’au DERNIER MOIS DE L’ANNÉE (décembre) :
 *      · « Épargne (capital) » n’apparaît QUE le mois où l’argent a été versé
 *        — les autres mois restent vides (« — ») : on voit les VRAIS
 *        versements, pas la même somme répétée chaque mois (fini l’effet
 *        « Bernadette a cotisé toute l’année ») ;
 *      · les intérêts, eux, évoluent CHAQUE mois (produits du mois, cumulés)
 *        au taux en vigueur, et « Épargne + intérêts » donne la somme totale
 *        atteinte à la fin de chaque mois.
 *    Le mois courant est marqué « réalisé », les suivants « à venir ». — */
function PanneauDetailEpargne(p: {
  /** TOUTES les épargnes du membre (v15 : regroupées sur une seule ligne). */
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
  /* — versements regroupés par mois : « Épargne (capital) » ne s’allume que là — */
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
        <p className="text-[13px] font-black uppercase tracking-wide text-[#1E4D2B]">
          Évolution mois par mois — épargnes de {p.nom}
        </p>
        <span className="rounded-full border border-[#B8A87E] bg-white px-2 py-0.5 text-[11px] font-black text-[#4A554E]">{p.taux} %/mois</span>
      </div>
      <p className="text-[12px] font-semibold leading-relaxed text-[#4A554E]">
        {versements.length} versement{versements.length > 1 ? "s" : ""} au registre — {fcfa(capitalTotal)} épargné{versements.length > 1 ? "s au total" : ""}. L’évolution court du mois du premier versement ({MOIS_FR[depart]}) jusqu’au DERNIER MOIS DE L’ANNÉE (décembre) : le capital n’apparaît QUE les mois où l’argent a été versé — les autres mois restent vides — tandis que les intérêts, eux, évoluent chaque mois au taux de {p.taux} %.
      </p>
      {/* — les versements RÉELS du membre : chaque pastille porte sa poubelle — */}
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
            <tr className="bg-[#3D6B72] text-white">
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
            <tr className="bg-[#3D6B72]/14">
              <td className="px-3 py-2.5 font-black text-[#243B41]">Au 31 décembre</td>
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

function RegistreReunionSection(p: {
  genre: "prets" | "epargnes";
  items: AttributionReunion[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: typeof MEMBRES_FICTIFS;
  /** Taux en vigueur (%/mois) — prêts ou épargnes, selon la page. */
  taux: number;
  moisCourantIdx: number | null;
  /* — v13, PRÊTS uniquement : suivi mois par mois, avances, remboursement — */
  /** Durée maximale de remboursement (mois) — échéance du capital. */
  duree?: number;
  /** Reconduction du capital : mois entre deux capitalisations (0 = jamais). */
  periode?: number;
  onAttribuer: (membreId: string, montant: number, moisIdx: number) => void;
  onRetirer: (id: string) => void;
  onAjouterAvance?: (id: string, montant: number, moisIdx: number) => void;
  onRetirerAvance?: (id: string, avanceId: string) => void;
  onConfirmerRemboursement?: (id: string, rembourse: RemboursementPret) => void;
  onAnnulerRemboursement?: (id: string) => void;
}) {
  const L = LIBELLES_REGISTRE[p.genre];
  const estPrets = p.genre === "prets";
  const dureeEff = p.duree && p.duree > 0 ? p.duree : 6;
  const periodeEff = p.periode ?? 0;
  /* — formulaire d'attribution : montant + mois par ligne du tableau — */
  const [form, setForm] = useState<Record<string, { montant: string; mois: number | null }>>({});
  const majForm = (id: string, patch: Partial<{ montant: string; mois: number }>) =>
    setForm((x) => ({ ...x, [id]: { montant: "", mois: null, ...x[id], ...patch } }));
  /* — détail déplié (prêts) : l'id du prêt dont on voit l'évolution mois par mois — */
  const [ouvert, setOuvert] = useState<string | null>(null);
  /* — v14 : RECHERCHE DYNAMIQUE des noms dans la section Attribution —
   *    insensible à la casse et aux accents (« aurelie » trouve Aurélie). — */
  const [recherche, setRecherche] = useState("");
  const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const q = sansAccent(recherche.trim());
  const rosterFiltre = q ? p.roster.filter((m) => sansAccent(m.name).includes(q)) : p.roster;

  /* — ÉVOLUTION d'un prêt (v13) : mois par mois, avances, reconduction du
   *    capital, arrêt au mois du remboursement. Les ÉPARGNES gardent le
   *    calcul simple (interetsAttribution) — pas d'avances ni d'échéance. — */
  const evoDe = (it: AttributionReunion) =>
    evolutionPretReunion(it.montant, p.taux, it.moisIdx, dureeEff, periodeEff, it.avances, estPrets ? it.rembourse ?? null : null, p.moisCourantIdx);


  /* — lignes du registre ACTIF : chaque prêt + ses intérêts (le prêt
   *    REMBOURSÉ quitte cette liste — il vit dans la section « Prêts
   *    remboursés », plus bas). v15 : les ÉPARGNES ne passent plus par
   *    `lignes` pour le tableau — elles sont REGROUPÉES PAR MEMBRE
   *    (groupesEpargne, plus bas), une seule ligne par personne. — */
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


  /* — v15, ÉPARGNES : UNE SEULE LIGNE PAR MEMBRE — toutes ses épargnes
   *    regroupées (Bernadette ne doit plus apparaître deux fois). La ligne
   *    porte le total épargné, les mois réels des versements, les intérêts
   *    du mois (cumul de toutes ses épargnes), les réalisés et la projection ;
   *    le détail déplié montre l’évolution de l’ensemble — capital versé
   *    SEULEMENT les mois de versement, intérêts évolutifs chaque mois. — */
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

  /* — PRÊTS REMBOURSÉS (v13) : le mois par mois s'arrête au remboursement — */
  const rembourses = itemsRembourses
    .map((it) => ({ it, evo: evoDe(it), m: p.parMembre.get(it.membreId) }))
    .sort((a, b) => (a.it.rembourse?.moisIdx ?? 0) - (b.it.rembourse?.moisIdx ?? 0) || a.it.moisIdx - b.it.moisIdx);

  /* — SOMMES TOTALES MOIS PAR MOIS (v13) : chaque mois additionne les prêts
   *    actifs — intérêts produits, avances versées, total dû fin de mois. — */
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
      {/* — 1. REGISTRE : les personnes, les mois, les intérêts, les sommes globales — */}
      <Block title={L.registre} icon={L.icone} note={L.noteRegistre}>
        <div className="p-4">
          {/* — sommes globales : ce que ces {nomPluriel} auront produit — */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Somme globale {p.genre === "prets" ? "prêtée à la réunion" : "épargnée"}</p>
              <p className="text-[20px] font-black leading-tight text-[#1E4D2B]">{fcfa(totalMontant)}</p>
              <p className="mt-0.5 text-[10px] text-[#8A9288]">{lignes.length} enregistrement(s) actif(s) au registre{estPrets && itemsRembourses.length > 0 ? ` — ${itemsRembourses.length} remboursé(s)` : ""}</p>
            </div>
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Intérêts produits — réalisés</p>
              <p className="text-[20px] font-black leading-tight text-[#2F6B45]">{fcfa(totalRealise)}</p>
              <p className="mt-0.5 text-[10px] text-[#8A9288]">au taux de {p.taux} %/mois, du mois rattaché jusqu’au mois en cours</p>
            </div>
            <div className="rounded-2xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3.5 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A6420]">Projection au 31 décembre</p>
              <p className="text-[20px] font-black leading-tight text-[#8A6420]">{fcfa(totalAnnee)}</p>
              <p className="mt-0.5 text-[10px] text-[#8A9288]">ce que ces {L.nomPluriel} auront produit sur l’année entière</p>
            </div>
          </div>

          {/* — le registre lui-même : membre, mois, somme, intérêts — */}
          {lignes.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
              Aucun {L.nom} enregistré pour l’instant — attribuez le premier dans la section « {L.attrib} » ci-dessous.
            </p>
          ) : (
            <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white">
              <table className="w-full min-w-[620px] border-collapse text-[12px]">
                <thead className="sticky top-0">
                  <tr className="bg-[#1E4D2B] text-white">
                    <th className="px-2.5 py-2 text-left font-black">Membre</th>
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
                    lignes.map(({ it, moisDepart, interetMois, realise, totalAnnee }) => {
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
                            <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(totalAnnee)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setOuvert((x) => (x === it.id ? null : it.id))}
                                aria-expanded={detailOuvert}
                                aria-label={`Voir l’évolution mois par mois du prêt de ${m?.name ?? it.membreId}`}
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 text-[#1F5B3F] transition hover:bg-[#1F5B3F]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {/* v16 : confirmation à double clic avant de retirer */}
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
                    /* — v15 : ÉPARGNES REGROUPÉES PAR MEMBRE — une seule ligne par
                     *    personne, toutes ses épargnes réunies ; le détail déplié
                     *    montre l’évolution de l’ensemble (capital versé seulement
                     *    les mois de versement, intérêts évolutifs chaque mois). — */
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
                                  {g.items.length} versements regroupés — la poubelle d’un mois retire CETTE épargne
                                </p>
                              )}
                            </td>
                            {/* v16 : quand le membre a PLUSIEURS épargnes, chaque versement
                             *    devient une pastille avec SA poubelle — supprimer UNE épargne
                             *    parmi les autres (erreur de confusion) est visible d’un coup
                             *    d’œil, sans déplier le détail. Une confirmation est demandée. — */}
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
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 text-[#1F5B3F] transition hover:bg-[#1F5B3F]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {/* v16 : poubelle de ligne pour un versement UNIQUE —
                               *    plusieurs versements = poubelle sur chaque pastille de mois. — */}
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
                              <td colSpan={8} className="px-3 pb-3 pt-1">
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
                    <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={2}>Sommes globales</td>
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

          {/* — SOMMES TOTALES MOIS PAR MOIS (v13) : chaque mois additionne tous
           *    les prêts actifs — l'évolution des intérêts et les sommes du mois. — */}
          {estPrets && totauxMois.length > 0 && (
            <div className="mt-4">
              <p className="text-[11.5px] font-black uppercase tracking-wide text-[#1E4D2B]">Sommes totales mois par mois — tous les prêts actifs</p>
              <p className="mt-0.5 mb-2 text-[10.5px] leading-snug text-[#8A9288]">
                Chaque ligne additionne les prêts du registre : intérêts produits ce mois, avances versées ce mois et somme totale due à la fin du mois (reconductions du capital comprises). Les prêts remboursés n’y figurent plus — ils sont soldés.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#E5DCC0] bg-white">
                <table className="w-full min-w-[420px] border-collapse text-[12px]">
                  <thead className="sticky top-0">
                    <tr className="bg-[#1E4D2B] text-white">
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

      {/* — 1-bis. PRÊTS REMBOURSÉS (v13) : confirmés par le président, sortis du
       *    registre actif — preuve des intérêts et de la somme totale rendue. — */}
      {estPrets && (
        <Block
          title="Prêts remboursés"
          icon={<BadgeCheck className="h-4.5 w-4.5" />}
          note="Ici reposent les prêts que la réunion a rendus à leurs prêteurs : le mois du prêt, la somme initiale, les intérêts produits, les avances versées et la somme totale remboursée. Un prêt remboursé quitte la liste des personnes ayant prêté — un mauvais clic ? « Annuler le remboursement » le remet dans le registre actif."
        >
          <div className="p-4">
            {rembourses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
                Aucun prêt remboursé pour l’instant — quand la réunion rend son argent à un prêteur, dépliez sa ligne dans le registre (chevron « Détail ») puis cliquez « Confirmer le remboursement » : le prêt vient se ranger ici, avec ses intérêts et le total versé.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Prêts soldés</p>
                    <p className="text-[20px] font-black leading-tight text-[#1E4D2B]">{rembourses.length}</p>
                    <p className="mt-0.5 text-[10px] text-[#8A9288]">{fmt(rembourses.reduce((s, r) => s + r.it.montant, 0))} FCFA de prêts initiaux rendus</p>
                  </div>
                  <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Intérêts versés aux prêteurs</p>
                    <p className="text-[20px] font-black leading-tight text-[#2F6B45]">{fcfa(rembourses.reduce((s, r) => s + r.evo.totalInterets, 0))}</p>
                    <p className="mt-0.5 text-[10px] text-[#8A9288]">intérêts produits jusqu’au remboursement, reconductions comprises</p>
                  </div>
                  <div className="rounded-2xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3.5 py-2.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A6420]">Total remboursé</p>
                    <p className="text-[20px] font-black leading-tight text-[#8A6420]">{fcfa(rembourses.reduce((s, r) => s + r.evo.totalAvances + (r.it.rembourse?.montant ?? 0), 0))}</p>
                    <p className="mt-0.5 text-[10px] text-[#8A9288]">avances + soldes finaux — la dette de la réunion est éteinte</p>
                  </div>
                </div>
                <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white">
                  <table className="w-full min-w-[760px] border-collapse text-[12px]">
                    <thead className="sticky top-0">
                      <tr className="bg-[#1E4D2B] text-white">
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
                                  className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 text-[#1F5B3F] transition hover:bg-[#1F5B3F]/18"
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

      {/* — 2. ATTRIBUTION : le tableau de TOUS les membres — le prêt / l'épargne
       *    est manuel : le président sélectionne le membre et l'inscrit.
       *    v14 : RECHERCHE DYNAMIQUE des noms pour retrouver vite la bonne
       *    personne dans la liste (insensible aux accents et à la casse). — */}
      <Block title={L.attrib} icon={L.icone} note={L.noteAttrib}>
        <div className="px-4 pt-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FFFDF6] p-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#1E4D2B]">
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
                  className="w-full rounded-xl border-2 border-[#C9B98A] bg-white py-2.5 pl-9 pr-3 text-[14px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
                />
              </span>
            </label>
            {q && (
              <p className="mt-1.5 text-[11.5px] font-bold text-[#4A554E]">
                {rosterFiltre.length === 0
                  ? `Aucun membre ne correspond à « ${recherche.trim()} »`
                  : `${rosterFiltre.length} membre${rosterFiltre.length > 1 ? "s" : ""} trouvé${rosterFiltre.length > 1 ? "s" : ""}`}
                {rosterFiltre.length !== p.roster.length && rosterFiltre.length > 0 && (
                  <button type="button" onClick={() => setRecherche("")} className="ml-2 underline decoration-dotted underline-offset-2 hover:text-[#1E4D2B]">
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
              <tr className="bg-[#1E4D2B] text-white">
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
                        className="w-28 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        value={mois ?? ""}
                        onChange={(e) => majForm(m.id, { mois: Number(e.target.value) })}
                        aria-label={`Mois réel du ${L.nom} de ${m.name}`}
                        className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2 py-1.5 text-[12px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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
                      <Btn small disabled={!montant || montant <= 0} onClick={() => attribuer(m.id)}>
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
    </>
  );
}

/* ══════════════════════════ ÉPARGNES — GESTION DU BUREAU (nouvelle page v12) ══════════════════════════
 *
 * Remplace la page « Impayés & recouvrement » supprimée — nouvelle URL :
 * #president/epargnes. La CONFIGURATION (taux modifiable/retirable, manière
 * de collecter les intérêts, type d'épargne) vit dans Paramètres → Épargnes,
 * le miroir de l'espace membre ; CETTE page est la GESTION : registre des
 * épargnes des membres (mois, sommes, intérêts, totaux) + ATTRIBUTION membre
 * par membre — la même section que celle des prêts.
 * ═══════════════════════════════════════════════════════════════════════════ */

function EpargnesGestionSection(p: {
  epargnes: AttributionReunion[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: typeof MEMBRES_FICTIFS;
  regl: Reglement;
  moisCourantIdx: number | null;
  onAttribuer: (membreId: string, montant: number, moisIdx: number) => void;
  onRetirer: (id: string) => void;
}) {
  const taux = tauxEpargneVigueur(p.regl);
  /* v14 : le bloc d'intro (taux en vigueur, manière de collecter, longue
   * explication) est RETIRÉ à la demande du président — la configuration
   * reste dans Paramètres → Épargnes, cette page ne montre que le registre. */
  return (
    <RegistreReunionSection
      genre="epargnes"
      items={p.epargnes}
      parMembre={p.parMembre}
      roster={p.roster}
      taux={taux}
      moisCourantIdx={p.moisCourantIdx}
      onAttribuer={p.onAttribuer}
      onRetirer={p.onRetirer}
    />
  );
}

/* ══════════════════════════ SOLIDARITÉ ══════════════════════════ */

const TYPE_EV: Record<EvVie["type"], { label: string; cls: string }> = {
  deuil: { label: "Deuil", cls: RJ_CLS },
  mariage: { label: "Mariage", cls: OR_CLS },
  naissance: { label: "Naissance", cls: OK_CLS },
  maladie: { label: "Maladie / hospitalisation", cls: TE_CLS },
};

/* — CHAMP DE RECHERCHE DYNAMIQUE DES MEMBRES (v14) — réutilisé partout où le
 *    président doit retrouver un membre : attribution d'un type de solidarité,
 *    calendrier de visites, postes du bureau. Insensible à la casse et aux
 *    accents ; la liste se réduit au fil de la frappe, et chaque ligne porte
 *    l'action prévue par la page (render prop). — */
function ChampRechercheMembres(p: {
  roster: (typeof MEMBRES_FICTIFS)[number][];
  libelle: string;
  note?: string;
  placeholder?: string;
  /** Membres à cacher de la liste (déjà attribués, président…). */
  idsMasques?: Set<string>;
  /** Rend l'action d'une ligne de résultat (bouton d'attribution…). */
  rendreResultat: (m: (typeof MEMBRES_FICTIFS)[number]) => ReactNode;
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
        <span className="flex items-center gap-1.5 text-[12.5px] font-black uppercase tracking-wide text-[#1E4D2B]">
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
            className="w-full rounded-xl border-2 border-[#C9B98A] bg-white py-2.5 pl-9 pr-3 text-[14px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
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

function SolidariteSection(p: {
  evs: EvVie[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: (typeof MEMBRES_FICTIFS)[number][];
  caisseSecours: number;
  regl: Reglement;
  moisCourantIdx: number | null;
  onProposer: (e: EvVie, montant: number) => void;
  onVoter: (e: EvVie, qui: keyof VoteBureau, pour: boolean) => void;
  onDecaisser: (e: EvVie) => void;
  /* — v14 : types de solidarité + variables + délais — */
  typesSolidarite: TypeSolidarite[];
  majTypesSolidarite: (next: TypeSolidarite[], message?: string) => void;
  /* — v14 : types de mains levées — */
  mainsLevees: MainLevee[];
  majMainsLevees: (next: MainLevee[], message?: string) => void;
  /* — v14 : calendrier des visites de solidarité — */
  visites: VisiteSolidarite[];
  majVisites: (next: VisiteSolidarite[], message?: string) => void;
}) {
  const votants: { qui: keyof VoteBureau; nom: string; role: string }[] = [
    { qui: "vice", nom: "Marie-Louise Nguetsop", role: "Vice-présidente" },
    { qui: "secretariat", nom: "Françoise Mbeutetsa", role: "Secrétaire" },
    { qui: "tresorier", nom: "Émile Tchoumi", role: "Trésorier" },
    { qui: "censeur", nom: "Roger Ndoumbe", role: "Censeur" },
  ];

  /* — état du formulaire d'ajout d'un type de solidarité — */
  const [nomType, setNomType] = useState("");
  const [sommeType, setSommeType] = useState("");
  const [delaiType, setDelaiType] = useState("1");
  /* — état du formulaire d'ajout d'une main levée — */
  const [nomMain, setNomMain] = useState("");
  const [noteMain, setNoteMain] = useState("");
  /* — état du formulaire d'ajout d'une visite — */
  const [visMembreId, setVisMembreId] = useState<string | null>(null);
  const [visType, setVisType] = useState("");
  const [visMois, setVisMois] = useState<number | null>(null);
  const [visDelegation, setVisDelegation] = useState("");
  const [visNote, setVisNote] = useState("");

  const moisVisite = visMois ?? Math.max(0, Math.min(11, p.moisCourantIdx ?? 0));

  const ajouterType = () => {
    const nom = nomType.trim();
    if (!nom) { toast.error("Donnez d’abord un nom au type de solidarité"); return; }
    const somme = Math.max(0, Number(sommeType || 0));
    const delai = Math.max(0, Math.round(Number(delaiType || 0)));
    const next = [...p.typesSolidarite, { id: nid(), nom, somme, delaiMois: delai, variables: [] }];
    p.majTypesSolidarite(next, `Type de solidarité « ${nom} » créé — somme de base ${fcfa(somme)}, à jour (ou remboursé) sous ${delai} mois. Attribuez-le aux membres avec la recherche ci-dessous.`);
    setNomType(""); setSommeType(""); setDelaiType("1");
  };
  const retirerType = (t: TypeSolidarite) => {
    p.majTypesSolidarite(p.typesSolidarite.filter((x) => x.id !== t.id), `Type de solidarité « ${t.nom} » retiré — les visites rattachées restent au calendrier, sans type.`);
  };
  const attribuerMembreType = (t: TypeSolidarite, m: (typeof MEMBRES_FICTIFS)[number]) => {
    if (t.variables.some((v) => v.membreId === m.id)) {
      toast(`${m.name} est déjà attribué à « ${t.nom} »`, { description: "Ajustez sa somme dans les variables du type ci-dessous." });
      return;
    }
    const next = p.typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: [...x.variables, { id: nid(), membreId: m.id, montant: x.somme }] } : x,
    );
    p.majTypesSolidarite(next, `${m.name} est attribué au type « ${t.nom} » — somme préremplie à ${fcfa(t.somme)}, ajustable dans les variables.`);
  };
  const majMontantVariable = (t: TypeSolidarite, v: VariableSolidarite, montant: number) => {
    const next = p.typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: x.variables.map((y) => (y.id === v.id ? { ...y, montant: Math.max(0, Math.round(montant)) } : y)) } : x,
    );
    p.majTypesSolidarite(next);
  };
  const retirerVariable = (t: TypeSolidarite, v: VariableSolidarite) => {
    const m = p.parMembre.get(v.membreId);
    const next = p.typesSolidarite.map((x) =>
      x.id === t.id ? { ...x, variables: x.variables.filter((y) => y.id !== v.id) } : x,
    );
    p.majTypesSolidarite(next, `${m?.name ?? "Le membre"} n’est plus attribué au type « ${t.nom} ».`);
  };

  const ajouterMain = () => {
    const nom = nomMain.trim();
    if (!nom) { toast.error("Donnez d’abord un nom à cette main levée"); return; }
    const next = [...p.mainsLevees, { id: nid(), nom, note: noteMain.trim() }];
    p.majMainsLevees(next, `Type de main levée « ${nom} » ajouté — utilisable en réunion.`);
    setNomMain(""); setNoteMain("");
  };
  const retirerMain = (ml: MainLevee) => {
    p.majMainsLevees(p.mainsLevees.filter((x) => x.id !== ml.id), `Type de main levée « ${ml.nom} » retiré.`);
  };

  const ajouterVisite = () => {
    if (!visMembreId) { toast.error("Choisissez d’abord le membre à visiter (recherche dynamique)"); return; }
    const m = p.parMembre.get(visMembreId);
    const t = p.typesSolidarite.find((x) => x.id === visType) ?? null;
    const delegation = visDelegation.trim();
    const next = [...p.visites, { id: nid(), membreId: visMembreId, typeId: t?.id ?? null, moisIdx: moisVisite, delegation, note: visNote.trim() }];
    p.majVisites(next, `Visite de solidarité planifiée en ${MOIS_FR[moisVisite]} chez ${m?.name}${t ? ` (${t.nom})` : ""}${delegation ? ` — délégation : ${delegation}` : ""}.`);
    setVisMembreId(null); setVisType(""); setVisDelegation(""); setVisNote("");
  };
  const retirerVisite = (v: VisiteSolidarite) => {
    p.majVisites(p.visites.filter((x) => x.id !== v.id), `Visite de ${MOIS_FR[Math.min(11, Math.max(0, v.moisIdx))]} retirée du calendrier des visites.`);
  };

  const visitesTriees = [...p.visites].sort((a, b) => a.moisIdx - b.moisIdx);

  return (
    <>
      <FcCard className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Caisse de secours</p>
          <p className="text-[20px] font-black text-[#1E4D2B]">{fcfa(p.caisseSecours)}</p>
        </div>
        <P cls={TE_CLS}><HeartHandshake className="h-3 w-3" /> Mariages · naissances · deuils · maladies</P>
      </FcCard>

      {/* ══════ v14 : TYPES DE SOLIDARITÉ — sommes, variables, délais, attribution ══════ */}
      <Block
        title="Types de solidarité — autant que vous voulez"
        icon={<HandHeart className="h-4.5 w-4.5" />}
        note="Créez autant de types de solidarité que la cantine en pratique, chacun avec sa somme. À chaque type vous associez autant de VARIABLES que nécessaire — le membre attribué et la somme QU'IL paie, car tout le monde ne paie pas la solidarité de la même manière —, un DÉLAI (en mois) pour être à jour de cette solidarité ou la rembourser, et une RECHERCHE DYNAMIQUE pour trouver vite les membres à attribuer."
      >
        <div className="space-y-3 p-4">
          {/* — formulaire d'ajout d'un type — */}
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#1E4D2B]">Ajouter un type de solidarité</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={nomType}
                onChange={(e) => setNomType(e.target.value)}
                placeholder="Nom du type — ex. : Participation aux deuils, Cadeau de mariage…"
                aria-label="Nom du nouveau type de solidarité"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
              />
              <div className="flex gap-2">
                <input
                  value={sommeType}
                  onChange={(e) => setSommeType(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Somme (FCFA)"
                  aria-label="Somme de base du type de solidarité en FCFA"
                  className="w-36 rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
                />
                <input
                  value={delaiType}
                  onChange={(e) => setDelaiType(e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Délai (mois)"
                  aria-label="Délai en mois pour être à jour ou rembourser"
                  className="w-28 rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
                />
              </div>
            </div>
            <div className="mt-2">
              <Btn onClick={ajouterType}><Plus className="h-4 w-4" /> Ajouter ce type de solidarité</Btn>
            </div>
          </div>

          {/* — les types créés : somme, délai, variables, attribution — */}
          {p.typesSolidarite.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold leading-relaxed text-[#4A554E]">
              Aucun type de solidarité pour l’instant — ajoutez le premier ci-dessus, puis attribuez-le aux membres.
            </p>
          ) : (
            p.typesSolidarite.map((t) => {
              const totalVariables = t.variables.reduce((s, v) => s + v.montant, 0);
              return (
                <div key={t.id} className="rounded-2xl border-2 border-[#E5DCC0] bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E5DCC0] bg-[#1E4D2B]/6 px-3.5 py-3">
                    <div className="min-w-0">
                      <p className="fc-serif text-[15px] font-black text-[#1E4D2B]">{t.nom}</p>
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
                    {/* — attribution avec recherche dynamique — */}
                    <ChampRechercheMembres
                      roster={p.roster}
                      libelle={`Attribuer « ${t.nom} » à un membre`}
                      note="Tapez un nom : la recherche filtre la liste au fil de la frappe. Chaque membre attribué paie par défaut la somme de base — ajustez-la dans ses variables."
                      idsMasques={new Set(t.variables.map((v) => v.membreId))}
                      rendreResultat={(m) => (
                        <Btn small onClick={() => attribuerMembreType(t, m)}>
                          <UserPlus className="h-3.5 w-3.5" /> Attribuer
                        </Btn>
                      )}
                    />

                    {/* — variables : le membre + la somme QU'IL paie — */}
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
                                    className="w-28 rounded-lg border border-[#C9B98A] bg-white px-2.5 py-1.5 text-[12.5px] font-black text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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

      {/* ══════ v14 : TYPES DE MAINS LEVÉES ══════ */}
      <Block
        title="Types de mains levées"
        icon={<Hand className="h-4.5 w-4.5" />}
        note="Les décisions votées à main levée en réunion : nommez autant de types de mains levées que la cantine en pratique — l'aide de solidarité, l'échange de tour, l'admission d'un membre…"
      >
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#1E4D2B]">Ajouter un type de main levée</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr]">
              <input
                value={nomMain}
                onChange={(e) => setNomMain(e.target.value)}
                placeholder="Nom — ex. : Main levée pour l'aide de deuil…"
                aria-label="Nom du nouveau type de main levée"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
              />
              <input
                value={noteMain}
                onChange={(e) => setNoteMain(e.target.value)}
                placeholder="À quoi sert-elle ? (facultatif)"
                aria-label="Rôle de la main levée"
                className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
              />
            </div>
            <div className="mt-2">
              <Btn tone="teal" onClick={ajouterMain}><Plus className="h-4 w-4" /> Ajouter cette main levée</Btn>
            </div>
          </div>
          {p.mainsLevees.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12.5px] font-semibold text-[#4A554E]">
              Aucun type de main levée — ajoutez le premier ci-dessus.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {p.mainsLevees.map((ml) => (
                <li key={ml.id} className="flex items-start gap-2 rounded-2xl border border-[#E5DCC0] bg-white px-3 py-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3D6B72]/12 text-[#3D6B72]"><Hand className="h-3.5 w-3.5" /></span>
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

      {/* ══════ v14 : CALENDRIER DE VISITES DE SOLIDARITÉ ══════ */}
      <Block
        title="Calendrier de visites de solidarité"
        icon={<CalendarCheck className="h-4.5 w-4.5" />}
        note="Pour chaque type de solidarité : planifiez les visites — le membre concerné (recherche dynamique), le type, le mois, qui représente la cantine (délégation) et une note. La cantine se déplace auprès des siens."
      >
        <div className="space-y-3 p-4">
          <div className="rounded-2xl border-2 border-[#B8A87E] bg-[#FBF7EA] p-3">
            <p className="text-[12.5px] font-black uppercase tracking-wide text-[#1E4D2B]">Planifier une visite</p>
            <div className="mt-2">
              {visMembreId && p.parMembre.get(visMembreId) ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#2F6B45]/40 bg-[#2F6B45]/10 px-3 py-2.5">
                  <p className="text-[13px] font-black text-[#1E4D2B]">
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
                    <Btn small tone="teal" onClick={() => setVisMembreId(m.id)}>
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
                className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
              >
                <option value="">Type de solidarité…</option>
                {p.typesSolidarite.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
              <select
                value={moisVisite}
                onChange={(e) => setVisMois(Number(e.target.value))}
                aria-label="Mois de la visite"
                className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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
                aria-label="Qui représente la cantine lors de la visite"
                className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
              />
            </div>
            <input
              value={visNote}
              onChange={(e) => setVisNote(e.target.value)}
              placeholder="Note — lieu, appui prévu, frais…"
              aria-label="Note de la visite"
              className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[12.5px] text-[#2B3530] outline-none placeholder:font-semibold placeholder:text-[#8A9288] focus:border-[#1F5B3F]"
            />
            <div className="mt-2">
              <Btn onClick={ajouterVisite}><Plus className="h-4 w-4" /> Ajouter au calendrier des visites</Btn>
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
                const t = p.typesSolidarite.find((x) => x.id === v.typeId) ?? null;
                return (
                  <li key={v.id} className="flex items-start gap-2.5 rounded-2xl border border-[#E5DCC0] bg-white px-3 py-2.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-[#3D6B72] text-white">
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

      {p.evs.map((e) => {
        const m = p.parMembre.get(e.membreId);
        const pourCount = Object.values(e.votes).filter((v) => v === true).length;
        const contreCount = Object.values(e.votes).filter((v) => v === false).length;
        return (
          <FcCard key={e.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2"><P cls={TYPE_EV[e.type].cls}>{TYPE_EV[e.type].label}</P><P>{e.statut === "signale" ? "À traiter" : e.statut === "en_vote" ? `Vote en cours (${pourCount}/4)` : e.statut === "approuve" ? "Approuvé" : "Décaissé"}</P></div>
                <p className="mt-1.5 text-[14px] font-bold text-[#2B3530]">{e.label}</p>
                <p className="text-[11.5px] text-[#8A9288]">Membre concerné : {m?.name}</p>
              </div>
              {e.montant != null && <p className="text-[15px] font-black text-[#8A6420]">{fcfa(e.montant)}</p>}
            </div>

            {e.statut === "signale" && (
              <div className="mt-3 space-y-2 border-t border-[#E5DCC0] pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A6420]">Proposer une aide au vote du bureau</p>
                <div className="flex flex-wrap gap-2">
                  {[10_000, 20_000, 30_000].map((mt) => (
                    <Btn key={mt} small tone="or" onClick={() => p.onProposer(e, mt)} disabled={mt > p.caisseSecours}>
                      Proposer {fmt(mt)} FCFA
                    </Btn>
                  ))}
                </div>
              </div>
            )}

            {e.statut === "en_vote" && (
              <div className="mt-3 space-y-2 border-t border-[#E5DCC0] pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A6420]">Vote du bureau — majorité 3/4</p>
                <div className="space-y-1.5">
                  {votants.map((v) => {
                    const val = e.votes[v.qui];
                    return (
                      <div key={v.qui} className="flex items-center gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-[#2B3530]">{v.nom}</p>
                          <p className="text-[10.5px] text-[#8A9288]">{v.role}</p>
                        </div>
                        <Btn small tone={val === true ? "vert" : "neutre"} onClick={() => p.onVoter(e, v.qui, true)}><ThumbsUp className="h-3.5 w-3.5" /> Pour</Btn>
                        <Btn small tone={val === false ? "rouge" : "neutre"} onClick={() => p.onVoter(e, v.qui, false)}><ThumbsDown className="h-3.5 w-3.5" /> Contre</Btn>
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
                  <Btn small onClick={() => p.onDecaisser(e)}><Wallet className="h-3.5 w-3.5" /> Décaisser {e.montant != null ? fcfa(e.montant) : ""} via le trésorier</Btn>
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

/* ══════════════════════════ ADHÉSIONS & REPRÉSENTATION ══════════════════════════ */

function AdhesionsSection(p: {
  candidats: Candidat[];
  onCocher: (c: Candidat, cle: keyof Candidat["etapes"]) => void;
  onConvoquer: (c: Candidat) => void; onPublier: (c: Candidat) => void;
  onDoc: (label: string) => void;
}) {
  const etapes: { cle: keyof Candidat["etapes"]; label: string }[] = [
    { cle: "identite", label: "Identité vérifiée (pièce + famille)" },
    { cle: "moralite", label: "Moralité — entretien du président" },
    { cle: "solvabilite", label: "Solvabilité — garant désigné" },
    { cle: "accord", label: "Accord du bureau réuni" },
  ];
  return (
    <>
      {p.candidats.map((c) => {
        const complet = Object.values(c.etapes).every(Boolean);
        return (
          <FcCard key={c.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-[#2B3530]">{c.nom}</p>
                <p className="text-[11.5px] text-[#8A9288]">{c.ville} · parrain : {c.parrain}</p>
              </div>
              {c.statut === "admis" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Admis</P>
                : c.statut === "vote" ? <P cls={OR_CLS}><Vote className="h-3 w-3" /> En vote</P>
                  : <P><Hourglass className="h-3 w-3" /> Instruction</P>}
            </div>
            <div className="mt-3 space-y-1.5">
              {etapes.map((e) => (
                <label key={e.cle} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${c.etapes[e.cle] ? "border-[#2F6B45]/40 bg-[#2F6B45]/8" : "border-[#E5DCC0] bg-[#FFFDF6]"}`}>
                  <input type="checkbox" checked={c.etapes[e.cle]} onChange={() => p.onCocher(c, e.cle)} disabled={c.statut === "admis"} className="h-4.5 w-4.5 accent-[#1F5B3F]" />
                  <span className={`text-[12.5px] font-semibold ${c.etapes[e.cle] ? "text-[#2F6B45]" : "text-[#2B3530]"}`}>{e.label}</span>
                </label>
              ))}
            </div>
            {c.statut === "instruction" && (
              <div className="mt-3">
                <Btn small disabled={!complet} onClick={() => p.onConvoquer(c)}>
                  {complet ? <Vote className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {complet ? "Convoquer le vote d’admission" : "Dossier incomplet — complétez les 4 étapes"}
                </Btn>
              </div>
            )}
            {c.statut === "vote" && (
              <div className="mt-3">
                <Btn small onClick={() => p.onPublier(c)}><BadgeCheck className="h-3.5 w-3.5" /> Publier la décision d’admission</Btn>
              </div>
            )}
          </FcCard>
        );
      })}

      <Block title="Représentation extérieure" icon={<Landmark className="h-4.5 w-4.5" />}
        note="Le président est l’interlocuteur officiel : banques, autorités, autres associations. Documents générés avec les informations du registre.">
        <div className="flex flex-wrap gap-2 p-3">
          <Btn small tone="teal" onClick={() => p.onDoc("Attestation de membre en règle")}><FileText className="h-3.5 w-3.5" /> Attestation de membre</Btn>
          <Btn small tone="teal" onClick={() => p.onDoc("Courrier officiel à la banque")}><Landmark className="h-3.5 w-3.5" /> Courrier banque</Btn>
          <Btn small tone="teal" onClick={() => p.onDoc("Convocation officielle de réunion")}><ScrollText className="h-3.5 w-3.5" /> Convocation officielle</Btn>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ AUTRES POSTES ══════════════════════════ */

/* v14 — LA PAGE POSTES DEVIENT UN ORGANIGRAMME VIVANT (demande du président) :
 *  · « Donne la possibilité au président d'attribuer un poste à n'importe quel
 *    membre simple et de retirer un membre du bureau d'un poste » → chaque
 *    carte de poste porte une RECHERCHE DYNAMIQUE (nommer un membre) et un
 *    bouton « Retirer du poste » ;
 *  · « Immédiatement, la page spéciale attribuée à ce poste lui est présentée »
 *    → la nomination (et chaque retrait/changement) est annoncée en direct :
 *    le titulaire voit SA page du poste apparaître, disparaître ou remplacer
 *    l'ancienne — et le tableau « Qui voit quoi » le reflète aussitôt ;
 *  · « Si un membre du bureau change… un commissaire aux comptes en
 *    trésorier, la page du commissaire aux comptes disparaît et il a
 *    désormais la page du trésorier » → nommer sur un poste déjà occupé
 *    DÉPLACE le membre : son ancien poste redevient vacant. */
function PostesSection(p: {
  postes: PostesMap;
  roster: (typeof MEMBRES_FICTIFS)[number][];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  onAttribuer: (poste: PosteKey, membreId: string) => void;
  onRetirer: (poste: PosteKey) => void;
}) {
  /* habillage & outils de chaque poste (clés alignées sur PosteKey) */
  const cartes: Record<PosteKey, { accent: string; icon: ReactNode; outils: string[] }> = {
    vice_president: {
      accent: "#2F6B45", icon: <Users className="h-4.5 w-4.5" />,
      outils: [
        "Checklist des préparatifs (lieu chez le bénéficiaire, collation, sièges, sonorisation) partagée en direct",
        "Délégation de séance : remplace le président en un clic (tous les outils basculent)",
        "Co-écrit l’ordre du jour avec le président avant chaque réunion",
        "Reçoit les suggestions des membres et les remonte au bureau",
      ],
    },
    secretariat: {
      accent: "#6E4B71", icon: <ScrollText className="h-4.5 w-4.5" />,
      outils: [
        "Éditeur de procès-verbal alimenté automatiquement par les décisions de la séance",
        "Liste de présence officielle : appels, excuses, absences — horodatés",
        "Co-règle le taux et les montants avec le président (double signature)",
        "Archives consultables par tous : PV, décisions, taux, montants",
      ],
    },
    tresorier: {
      accent: "#8A6420", icon: <Wallet className="h-4.5 w-4.5" />,
      outils: [
        "Encaissement en direct, membre par membre (reçu numérique immédiat)",
        "Remise au bénéficiaire avec accusé signé devant témoin",
        "Journal de caisse temps réel : cotisations, collations, pénalités, aides",
        "Co-signature des prêts + décaissement des aides de solidarité",
      ],
    },
    commissaire: {
      accent: "#3D6B72", icon: <ClipboardList className="h-4.5 w-4.5" />,
      outils: [
        "Assistant d’audit trimestriel guidé : rapprochement reçus ↔ journal de caisse",
        "Contrôle des caisses (sociale, secours) avec relevés horodatés",
        "Alerte directe au président et au censeur en cas d’anomalie",
        "Rapport de l’assemblée générale généré à partir des audits",
      ],
    },
    censeur: {
      accent: "#B85C33", icon: <Scale className="h-4.5 w-4.5" />,
      outils: [
        "Boîte confidentielle : les membres lui écrivent en privé",
        "Médiation des litiges — suivi jusqu’à résolution",
        "Contrôle d’équité : vérifie que tours, aides et sanctions suivent les mêmes règles pour tous",
        "Peut convoquer le bureau si une règle n’est plus respectée",
      ],
    },
  };

  const titulaires = new Set(Object.values(p.postes).filter((x): x is string => typeof x === "string"));
  const presidentId = p.roster.find((m) => m.role === "president")?.id ?? "";
  const membresSimples = p.roster.filter((m) => m.role !== "president" && !titulaires.has(m.id));

  return (
    <>
      <FcCard className="p-4">
        <p className="text-[13px] leading-relaxed text-[#5C6B60]">
          <strong className="text-[#1E4D2B]">Attribuez et retirez les postes du bureau.</strong> Nommez n’importe quel
          membre simple (recherche dynamique dans chaque carte) : <strong className="text-[#1E4D2B]">immédiatement, la page
          spéciale du poste lui est présentée</strong>, aux côtés de ses pages membre. Retirez un membre du bureau :
          il redevient membre simple et <strong className="text-[#1E4D2B]">ne voit plus que ses pages membre</strong>.
          Nommez quelqu’un qui occupe déjà un autre poste : <strong className="text-[#1E4D2B]">son ancienne page disparaît</strong> —
          par exemple un commissaire aux comptes nommé trésorier voit désormais la page Trésorier, et le poste de
          commissaire redevient vacant.
        </p>
      </FcCard>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {POSTES_BUREAU.map((pB) => {
          const c = cartes[pB.key];
          const titulaireId = p.postes[pB.key];
          const titulaire = titulaireId ? p.parMembre.get(titulaireId) : null;
          return (
            <FcCard key={pB.key} className="overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ background: c.accent }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">{c.icon}</span>
                <div className="min-w-0">
                  <p className="fc-serif truncate text-[14.5px] font-bold">{pB.label}</p>
                  <p className="truncate text-[11px] opacity-85">{titulaire ? titulaire.name : "Poste vacant — à attribuer"}</p>
                </div>
              </div>
              <ul className="space-y-2 px-4 py-3">
                {c.outils.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: c.accent }} />
                    {o}
                  </li>
                ))}
              </ul>

              {/* — zone d'action : titulaire + retrait — */}
              <div className="space-y-2 border-t border-[#E5DCC0] px-4 py-3">
                {titulaire ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2F6B45]/40 bg-[#2F6B45]/8 px-3 py-2">
                      <p className="min-w-0 text-[12.5px] font-black text-[#1E4D2B]">
                        <UserCheck className="mr-1 inline h-4 w-4" /> Titulaire : {titulaire.name}
                        {estMembreApp(titulaire) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                      </p>
                      <Btn small tone="rouge" onClick={() => p.onRetirer(pB.key)}>
                        <XCircle className="h-3.5 w-3.5" /> Retirer du poste
                      </Btn>
                    </div>
                    <p className="flex items-start gap-1.5 text-[11.5px] font-semibold leading-snug text-[#4A554E]">
                      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3D6B72]" />
                      Le membre voit IMMÉDIATEMENT sa page « {pB.page} » — en plus de ses pages membre. En le retirant, la page disparaît : il ne voit plus que ses pages membre.
                    </p>
                  </>
                ) : (
                  <p className="rounded-xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2 text-[12px] font-semibold text-[#4A554E]">
                    Poste vacant — nommez un membre ci-dessous : sa page « {pB.page} » s’affiche aussitôt dans son espace.
                  </p>
                )}

                {/* — attribution avec recherche dynamique — */}
                <ChampRechercheMembres
                  roster={p.roster}
                  libelle={`Nommer au poste : ${pB.label}`}
                  note="Tapez un nom (recherche dynamique). Nommer quelqu’un qui occupe déjà un autre poste le DÉPLACE : son ancienne page disparaît, remplacée par celle-ci — l’ancien poste redevient vacant."
                  idsMasques={new Set([presidentId])}
                  rendreResultat={(m) =>
                    m.id === titulaireId ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#2F6B45]/40 bg-[#2F6B45]/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide text-[#2F6B45]">
                        <BadgeCheck className="h-3 w-3" /> titulaire
                      </span>
                    ) : (
                      <Btn small onClick={() => p.onAttribuer(pB.key, m.id)}>
                        <UserPlus className="h-3.5 w-3.5" /> Nommer
                      </Btn>
                    )
                  }
                />
              </div>
            </FcCard>
          );
        })}

        {/* — carte « membre simple » : ceux qui n'ont aucun poste — */}
        <FcCard className="overflow-hidden">
          <div className="flex items-center gap-2.5 bg-[#5C6B60] px-4 py-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><UserCheck className="h-4.5 w-4.5" /></span>
            <div className="min-w-0">
              <p className="fc-serif text-[14.5px] font-bold">Membres simples — uniquement les pages membre</p>
              <p className="text-[11px] opacity-85">{membresSimples.length} membre(s) sans poste de bureau</p>
            </div>
          </div>
          <ul className="space-y-2 px-4 py-3">
            <li className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5C6B60]" />
              « Mes cotisations » : déclarer, payer, suivre ses dettes et soldes
            </li>
            <li className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5C6B60]" />
              « Mes épargnes » et « Mes prêts » — l’espace membre de base
            </li>
            <li className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5C6B60]" />
              Demander la parole en séance · déclarer un événement de vie · se porter avaliste
            </li>
            <li className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5C6B60]" />
              AUCUNE page du bureau : nommé à un poste, la page du poste s’ajoute — retiré du poste, elle disparaît
            </li>
          </ul>
          {membresSimples.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-2.5">
              {membresSimples.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full border border-[#E5DCC0] bg-white px-2 py-0.5 text-[11px] font-bold text-[#2B3530]">
                  {m.name}{estMembreApp(m) && <span className="text-[9px] font-black uppercase text-[#3D6B72]"> · app</span>}
                </span>
              ))}
            </div>
          )}
        </FcCard>
      </div>

      {/* — tableau récapitulatif : qui voit quelle page, en direct — */}
      <Block
        title="Qui voit quoi — l’organigramme en direct"
        icon={<Eye className="h-4.5 w-4.5" />}
        note="Le reflet instantané de vos nominations : chaque membre du bureau voit SA page de poste en plus des pages membre ; les membres simples ne voient que les pages membre. Changez un poste ci-dessus et ce tableau se met à jour aussitôt."
      >
        <div className="overflow-x-auto rounded-2xl border border-[#E5DCC0] bg-white mx-4 mb-4">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
            <thead className="sticky top-0">
              <tr className="bg-[#1E4D2B] text-white">
                <th className="px-2.5 py-2 text-left font-black">Poste</th>
                <th className="px-2.5 py-2 text-left font-black">Titulaire</th>
                <th className="px-2.5 py-2 text-left font-black">Page présentée au membre</th>
              </tr>
            </thead>
            <tbody>
              {POSTES_BUREAU.map((pB) => {
                const titulaireId = p.postes[pB.key];
                const titulaire = titulaireId ? p.parMembre.get(titulaireId) : null;
                return (
                  <tr key={pB.key} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                    <td className="px-2.5 py-2 font-bold text-[#2B3530]">{pB.label}</td>
                    <td className={`px-2.5 py-2 font-bold ${titulaire ? "text-[#1E4D2B]" : "text-[#A5473D]"}`}>
                      {titulaire?.name ?? "vacant"}
                    </td>
                    <td className="px-2.5 py-2 font-semibold text-[#4A554E]">
                      {titulaire ? `${pB.page} + pages membre` : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-[#3D6B72]/10">
                <td className="px-2.5 py-2 font-black text-[#243B41]" colSpan={2}>Membres simples (sans poste)</td>
                <td className="px-2.5 py-2 font-bold text-[#243B41]">Pages membre UNIQUEMENT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ JOURNAL ══════════════════════════ */

function JournalSection({ journal }: { journal: JournalEntry[] }) {
  return (
    <FcCard className="overflow-hidden">
      <div className="border-b border-[#E5DCC0] bg-[#1E4D2B] px-4 py-3 text-white">
        <p className="fc-serif text-[15px] font-bold">Journal des décisions & des actions</p>
        <p className="text-[11.5px] opacity-85">Traçabilité complète — visible par tout le bureau, consultable par les membres.</p>
      </div>
      <ul className="divide-y divide-[#E5DCC0]">
        {journal.map((j) => (
          <li key={j.id} className="flex items-start gap-3 px-4 py-3">
            <span className="w-11 shrink-0 pt-0.5 text-right text-[10.5px] font-bold text-[#8A9288]">{j.le}</span>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E4D2B]/10 text-[#1E4D2B]">
              <ScrollText className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-relaxed text-[#2B3530]">{j.texte}</p>
              <p className="mt-1"><P cls={TE_CLS}>{j.acteur}</P></p>
            </div>
          </li>
        ))}
      </ul>
    </FcCard>
  );
}

/* ══════════════════════════ ESPACE MEMBRE — MES COTISATIONS ══════════════════════════ */

function MesCotisationsSection(p: {
  moisCourant: string | null;
  cotisCeMois: boolean;
  historique: { mois: string; paye: boolean }[];
  declarees: number; attendues: number;
  /** Types de cotisations mensuelles fixés par le président — le président
   *  membre est traité EXACTEMENT comme un membre : s'il est sélectionné dans
   *  un type, c'est CETTE somme qu'il doit verser. */
  typesCotis: TypeCotisation[];
  /** Collations fixées par le président — sa part = la somme de celles où
   *  il est désigné, comme pour chaque membre. */
  collations: Collation[];
  penRetard: number;
  onCotiser: () => void;
}) {
  /* Ma cotisation : celle fixée par le bureau pour MOI (type attribué), sinon
   * la cotisation de base — comme pour chaque membre de la cantine. */
  const monType = typeDuMembre(MOI, p.typesCotis);
  const maCotis = cotisationDuMembre(MOI, p.typesCotis, TONTINE.montantCotisation);
  const mesCollations = collationDuMembre(MOI, p.collations);
  const total = maCotis + mesCollations;
  return (
    <>
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-[#3D6B72] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><UserCheck className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">D’abord membre de la cantine — ensuite président</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Vous cotisez comme tout le monde : mêmes montants, mêmes pénalités, même ordre des tours (votre levée a eu lieu au tour n°1).
              Votre cotisation rejoint le total que le trésorier encaisse — aucune exception, c’est la règle de la maison.
            </p>
          </div>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3.5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma cotisation {p.moisCourant ? `— ${p.moisCourant}` : "du mois"}</p>
              <p className="text-[19px] font-black text-[#2B3530]">{fcfa(maCotis)}{mesCollations > 0 && <span className="text-[12px] font-semibold text-[#8A9288]"> + {fcfa(mesCollations)} de collation</span>}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#8A6420]">
                {monType ? `Type attribué par le bureau : ${monType.nom}` : "Cotisation de base de la cantine"}
              </p>
            </div>
            {p.cotisCeMois
              ? <P cls={OK_CLS}><CheckCircle2 className="h-3.5 w-3.5" /> Cotisation à jour</P>
              : <Btn onClick={p.onCotiser}><Wallet className="h-4 w-4" /> Cotiser {fcfa(total)}</Btn>}
          </div>
          {/* Notification — le bureau a fixé MA cotisation : je le vois comme un membre quelconque */}
          {monType && (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-2xl border-2 border-[#C89F62]/60 bg-[#C89F62]/12 px-3.5 py-3">
              <BellRing className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#8A6420]" />
              <p className="text-[12px] leading-relaxed text-[#7A5B2E]">
                <strong>Notification du bureau — votre cotisation a été fixée à {fmtMontant(monType.montant)} par mois</strong> (« {monType.nom} »).
                Comme chaque membre sélectionné dans ce type, vous devez désormais verser cette somme — la collation reste à part.
              </p>
            </div>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Pénalités éventuelles</p>
              <p className="text-[13.5px] font-black text-[#2B3530]">{fcfa(0)} <span className="text-[11px] font-semibold text-[#8A9288]">— aucun retard enregistré à mon nom</span></p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">En cas de retard : {fcfa(p.penRetard)} par incidence (même règle que pour tous).</p>
            </div>
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Reçu de cotisation</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#2F6B45]"><ReceiptText className="h-4 w-4" /> Reçu remis par le trésorier</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Chaque versement est encaissé et inscrit au journal de caisse — comme pour tous les membres.</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#5C6B60]">
              <span>Cotisations déclarées par le trésorier ce mois</span>
              <span className="font-black text-[#1E4D2B]">{p.declarees}/{p.attendues}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#E5DCC0]">
              <div className="h-full rounded-full bg-[#2F6B45] transition-all" style={{ width: `${Math.round((p.declarees / Math.max(1, p.attendues)) * 100)}%` }} />
            </div>
          </div>
        </div>
      </FcCard>

      <Block title="Mon historique de cotisations" icon={<CalendarCheck className="h-4.5 w-4.5" />}
        note="Le censeur vérifie que le président suit exactement les mêmes règles que les membres — y compris les pénalités de retard.">
        <div className="flex flex-wrap gap-1.5 p-3.5">
          {p.historique.map((h) => (
            <P key={h.mois} cls={h.paye ? OK_CLS : RJ_CLS}>
              {h.paye ? <Check className="h-3 w-3" /> : <Ban className="h-3 w-3" />} {h.mois}
            </P>
          ))}
          {!p.cotisCeMois && p.moisCourant && <P cls={OR_CLS}><Hourglass className="h-3 w-3" /> {p.moisCourant} — à cotiser</P>}
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ ESPACE MEMBRE — MES ÉPARGNES ══════════════════════════ */

/** Phrase affichée au membre selon la manière de collecter les intérêts
 *  décidée par le bureau (miroir exact de la configuration du président). */
const PHRASE_COLLECTE: Record<Reglement["epargne"]["collecteInterets"], string> = {
  capitalise: "Les intérêts sont crédités en fin de mois par le trésorier — le tableau ci-dessous les montre mois par mois, réalisés et projetés.",
  reunion: "À chaque réunion, le trésorier remet les intérêts du mois en espèces — le solde, lui, ne bouge que par vos dépôts.",
  finAnnee: "Les intérêts s'accumulent au registre et vous sont versés en une seule fois à la réunion de décembre.",
  caisse: "Vos intérêts alimentent la caisse sociale : vous récupérez votre capital intégralement, la rémunération profite à toute la famille.",
};

/* — MOUVEMENTS D'ÉPARGNE INTERACTIFS (v17, demande du président) : le relevé
 *    du compte d'épargne personnel — la liste des dépôts et retraits, comme
 *    les inscrit le trésorier. Chaque ligne est DÉPLIABLE : détail complet
 *    (mois rattaché, date, effet sur le solde, intérêts produits par CE dépôt)
 *    + ACTION RÉELLE — « Retirer cette épargne » relance le flux de retrait
 *    avec le montant du dépôt (solde et erreurs gérés par le flux). — */
function MouvementsEpargne(p: {
  ops: EpargneOp[];
  taux: number;
  moisCourantIdx: number | null;
  onRetirer: (montant: number, moisIdx: number) => void;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  if (p.ops.length === 0) {
    return (
      <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">
        Aucun mouvement pour l’instant — vos dépôts et retraits s’inscrivent ici, comme dans le registre du trésorier.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[#E5DCC0]">
      {p.ops.map((o) => {
        const depot = o.type === "depot";
        const mi = Math.min(11, Math.max(0, o.moisIdx));
        const estOuvert = ouvert === o.id;
        const mc = p.moisCourantIdx;
        /* Intérêts produits PAR CE DÉPÔT, du mois rattaché (inclus) au mois
         * courant : N mois × montant × taux. Un retrait ne produit rien. */
        const moisProduits = depot ? (mc != null ? Math.max(1, Math.min(12, mc - mi + 1)) : 1) : 0;
        const interetMensuel = Math.round(o.montant * (p.taux / 100));
        const interetsProduits = depot ? interetMensuel * moisProduits : 0;
        return (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => setOuvert(estOuvert ? null : o.id)}
              aria-expanded={estOuvert}
              aria-label={`Détail du mouvement « ${o.note} » — ${depot ? "dépôt" : "retrait"} de ${fcfa(o.montant)} rattaché à ${MOIS_FR[mi]}`}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${estOuvert ? "bg-[#FBF7EA]" : "hover:bg-[#FBF7EA]/70"}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${depot ? "bg-[#2F6B45]/12 text-[#2F6B45]" : "bg-[#A5473D]/10 text-[#A5473D]"}`}>
                {depot ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-[#2B3530]">{o.note}</span>
                <span className="block text-[10.5px] text-[#8A9288]">{MOIS_FR[mi]} · {o.le} · {depot ? "dépôt" : "retrait"}</span>
              </span>
              <span className={`shrink-0 text-[13px] font-black ${depot ? "text-[#2F6B45]" : "text-[#A5473D]"}`}>
                {depot ? "+" : "−"}{fcfa(o.montant)}
              </span>
              {estOuvert ? <ChevronUp className="h-4 w-4 shrink-0 text-[#8A9288]" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[#8A9288]" />}
            </button>
            {estOuvert && (
              <div className="space-y-2 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 pb-3.5 pt-2.5">
                <p className="text-[11.5px] leading-relaxed text-[#4A554E]">
                  {depot
                    ? <>Dépôt d’épargne : cette somme a été PLACÉE sur votre compte et rapporte {p.taux} %/mois depuis {MOIS_FR[mi]} — c’est ce que le trésorier a inscrit à votre nom.</>
                    : <>Retrait d’épargne : cette somme vous a été VERSEND — elle est déduite de votre solde et ne produit plus d’intérêts.</>}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E5DCC0] bg-white px-3 py-2">
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Mois rattaché</p>
                    <p className="text-[12.5px] font-black text-[#2B3530]">{MOIS_FR[mi]}</p>
                  </div>
                  <div className="rounded-xl border border-[#E5DCC0] bg-white px-3 py-2">
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Effet sur le solde</p>
                    <p className={`text-[12.5px] font-black ${depot ? "text-[#2F6B45]" : "text-[#A5473D]"}`}>{depot ? "+" : "−"}{fcfa(o.montant)}</p>
                  </div>
                  <div className="rounded-xl border border-[#E5DCC0] bg-white px-3 py-2">
                    <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Enregistré le</p>
                    <p className="text-[12.5px] font-black text-[#2B3530]">{o.le}</p>
                  </div>
                  {depot && (
                    <div className="rounded-xl border border-[#E5DCC0] bg-white px-3 py-2">
                      <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Intérêts produits par CE dépôt</p>
                      <p className="text-[12.5px] font-black text-[#2F6B45]">+{fcfa(interetsProduits)} <span className="text-[10px] font-bold text-[#8A9288]">({moisProduits} mois × {fcfa(interetMensuel)})</span></p>
                    </div>
                  )}
                </div>
                {depot && (
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      small
                      tone="or"
                      onClick={() => { p.onRetirer(o.montant, mc ?? mi); setOuvert(null); }}
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" /> Retirer cette épargne ({fcfa(o.montant)})
                    </Btn>
                    <p className="self-center text-[10px] leading-snug text-[#8A9288]">Le retrait est rattaché au mois en cours — votre solde doit couvrir la somme.</p>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MesEpargnesSection(p: {
  solde: number; ops: EpargneOp[]; taux: number; preavisJours: number;
  /** Nom du type d'épargne choisi par le bureau (null = aucun). */
  typeEpargneNom: string | null;
  /** Manière de collecter les intérêts décidée par le bureau — v11. */
  collecte: Reglement["epargne"]["collecteInterets"];
  /** Mois courant (0-11) — v18 : plus AUCUN dépôt local ici ; l'épargne du
   *  président s'inscrit au registre du bureau (page « Épargnes ») et remonte
   *  dans `ops` ; restent les retraits via les mouvements interactifs. */
  moisCourantIdx: number | null;
  onRetrait: (montant: number, moisIdx: number) => void;
}) {
  const taux = p.taux;
  const mCourant = p.moisCourantIdx;

  /* — MES INTÉRÊTS MOIS PAR MOIS (cette année) —
   * Chaque dépôt est rattaché à SON mois ; un mois où l'épargne est en place
   * rapporte taux % (crédités en fin de mois, intérêt simple). Les mois déjà
   * passés donnent des intérêts RÉALISÉS, les mois à venir une PROJECTION. */
  const lignes = useMemo(() => {
    const parMois: { depots: number; retraits: number }[] = Array.from({ length: 12 }, () => ({ depots: 0, retraits: 0 }));
    p.ops.forEach((o) => {
      const m = Math.min(11, Math.max(0, o.moisIdx));
      if (o.type === "depot") parMois[m].depots += o.montant; else parMois[m].retraits += o.montant;
    });
    type Ligne = { mois: string; m: number; depots: number; retraits: number; enPlace: number; interet: number; cumul: number; avenir: boolean; courant: boolean };
    return MOIS_FR.reduce<Ligne[]>((acc, nom, m) => {
      const prec = acc[acc.length - 1];
      const enPlace = (prec?.enPlace ?? 0) + parMois[m].depots - parMois[m].retraits;
      const interet = Math.round(enPlace * (taux / 100));
      const avenir = mCourant != null && m > mCourant;
      acc.push({
        mois: nom, m, depots: parMois[m].depots, retraits: parMois[m].retraits,
        enPlace, interet,
        cumul: (prec?.cumul ?? 0) + (avenir ? 0 : interet), // les mois à venir ne sont pas encore crédités
        avenir, courant: m === mCourant,
      });
      return acc;
    }, []);
  }, [p.ops, taux, mCourant]);
  const cumulRealise = lignes.filter((l) => !l.avenir).reduce((s, l) => s + l.interet, 0);
  const projectionAnnee = lignes.reduce((s, l) => s + l.interet, 0);

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Mon épargne personnelle</p>
            <p className="text-[26px] font-black leading-none text-[#1E4D2B]">{fcfa(p.solde)}</p>
          </div>
          <P cls={TE_CLS}><Coins className="h-3 w-3" /> Rémunérée à {taux} %/mois — comme chaque membre</P>
        </div>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Type d’épargne fixé par le bureau</p>
            <p className="text-[13px] font-black text-[#2B3530]">{p.typeEpargneNom ?? "Aucun type défini — à fixer par le bureau"}</p>
          </div>
          <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Intérêts de l’année</p>
            <p className="text-[13px] font-black text-[#2F6B45]">Réalisés : {fcfa(cumulRealise)}</p>
            <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Projection au 31 décembre : {fcfa(projectionAnnee)} · préavis de retrait : {p.preavisJours} jour(s)</p>
          </div>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-[#5C6B60]">
          Le taux est le même pour tous : c’est le bureau qui le fixe. {PHRASE_COLLECTE[p.collecte]}
        </p>
        {/* — v18 : le bloc « Déposer ou retirer » a été SUPPRIMÉ (demande du
         *    président : il ne sert plus). L'épargne s'inscrit au registre du
         *    bureau — page « Épargnes » — comme pour chaque membre, puis
         *    remonte automatiquement dans ce compte et ses mouvements. — */}
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#EDF4F3] px-3 py-2 text-[11.5px] font-semibold leading-snug text-[#2E5F6B]">
          <PiggyBank className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Pour épargner, inscrivez votre versement au <strong>registre du bureau — page « Épargnes »</strong>, comme chaque membre : il remonte automatiquement dans ce compte et dans vos mouvements.
          </span>
        </p>
      </FcCard>

      {/* — TABLEAU DES INTÉRÊTS MOIS PAR MOIS — */}
      <Block
        title={`Mes intérêts mois par mois — ${new Date().getFullYear()}`}
        icon={<TrendingUp className="h-4.5 w-4.5" />}
        note={`Chaque mois où votre épargne est en place rapporte ${taux} % : intérêts RÉALISÉS jusqu’au mois en cours, PROJECTION pour les mois à venir (ligne « à venir »). Un dépôt rattaché à un mois passé rapporte depuis CE mois.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1E4D2B] text-white">
                <th className="px-2.5 py-2 text-left font-black">Mois</th>
                <th className="px-2.5 py-2 text-right font-black">Dépôts du mois</th>
                <th className="px-2.5 py-2 text-right font-black">Épargne en place</th>
                <th className="px-2.5 py-2 text-right font-black">Intérêts du mois</th>
                <th className="px-2.5 py-2 text-right font-black">Intérêts cumulés</th>
              </tr>
            </thead>
            <tbody>
              {lignes.filter((l) => l.depots > 0 || l.retraits > 0 || l.enPlace > 0 || !l.avenir).map((l) => (
                <tr key={l.mois} className={`${l.avenir ? "bg-[#FBF7EA] text-[#8A9288]" : "bg-[#FFFDF6]"} border-b border-[#E5DCC0]`}>
                  <td className="px-2.5 py-2 font-bold">
                    {l.mois}
                    {l.courant && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">en cours</span>}
                    {l.avenir && <span className="ml-1.5 rounded-full border border-[#C9D2CB] px-1.5 py-0.5 text-[9px] font-black text-[#8A9288]">à venir</span>}
                  </td>
                  <td className="px-2.5 py-2 text-right font-semibold">{l.depots > 0 ? `+${fmt(l.depots)}` : l.retraits > 0 ? `−${fmt(l.retraits)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right">{l.enPlace > 0 ? fcfa(l.enPlace) : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{l.enPlace > 0 ? `+${fmt(l.interet)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fcfa(l.cumul)}</td>
                </tr>
              ))}
              <tr className="bg-[#C89F62]/15">
                <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={3}>Projection au 31 décembre</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">+{fmt(projectionAnnee)}</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fcfa(projectionAnnee)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="Mouvements d’épargne" icon={<ReceiptText className="h-4.5 w-4.5" />}
        note="Le relevé de votre compte d’épargne personnel — ce que le trésorier inscrit pour vous dans son registre : chaque ligne est un DÉPÔT (vous placez de l’argent) ou un RETRAIT (vous en reprenez). Touchez un mouvement pour voir son détail et agir.">
        <MouvementsEpargne ops={p.ops} taux={taux} moisCourantIdx={mCourant} onRetirer={p.onRetrait} />
      </Block>
    </>
  );
}

/* ══════════════════════════ ESPACE MEMBRE — MES PRÊTS ══════════════════════════ */

/** Échéancier d'un prêt : mois par mois à partir du mois auquel il est
 *  rattaché — intérêts (montant × taux), mensualité (capital + intérêts
 *  totaux / durée), reste dû (clampé à 0). Bascule {année+1} après décembre.
 *  RECONDUCTION DU CAPITAL (v12, demande du président) : si `periodeReconduction`
 *  > 0, le calendrier continue APRÈS l'échéance — la somme due (capital +
 *  intérêts) devient un NOUVEAU CAPITAL et les intérêts repartent de cette
 *  nouvelle somme, tous les {periode} mois, l'évolution restant visible MOIS
 *  PAR MOIS. Exemple du président : 10 000 en janvier à 3 %/mois sur 3 mois →
 *  mars : 10 900 ; si non remboursé, 10 900 devient le nouveau capital →
 *  juin : ≈ 11 881 — et le processus suit tant que ce n'est pas remboursé.
 *  Deux cycles de reconduction sont montrés. Utilisé par l'aperçu en direct
 *  de « Mes prêts », par chaque dossier de « Prêts & garanties » et par
 *  l'aperçu de reconduction des Paramètres. */
function lignesCalendrierPret(montant: number, taux: number, duree: number, moisIdx: number, periodeReconduction = 0) {
  const interetMois = Math.round(montant * (taux / 100));
  const mensu = Math.round((montant + interetMois * duree) / duree);
  const annee = new Date().getFullYear();
  type LignePret = {
    mois: string; annee: number; interet: number; mensu: number; reste: number;
    /** Ligne d'échéance — la somme due devient un nouveau capital si non remboursée. */
    echeance?: boolean;
    /** Mois d'une reconduction en cours (capital reconduit, plus de mensualité). */
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
    /* Capital reconduit = TOUTE la somme due à l'échéance (capital + intérêts
     * courus) — comme l'exemple du président : 10 000 + 3 × 300 = 10 900.
     * Les mois de reconduction repartent du mois SUIVANT l'échéance
     * (échéance en mars → avril = 1ᵉʳ mois du nouveau capital). */
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

/** Table du calendrier de remboursement — utilisée TROIS fois : pour l'aperçu
 *  EN DIRECT du formulaire (comme le tableau d'intérêts de l'épargne, les
 *  calculs apparaissent dès qu'on tape un montant), sous chaque demande
 *  déposée et dans l'aperçu de reconduction des Paramètres. Mêmes colonnes,
 *  même ligne Total — et, si la reconduction est activée, les lignes après
 *  l'échéance sont marquées « capital reconduit ».
 *  v14 — lisible en grand : les NOMS des personnes concernées (membre +
 *  avaliste) s'affichent au-dessus du tableau, les textes passent en 13-14 px
 *  et les gris clairs sont remplacés par des contrastes plus forts pour ceux
 *  qui ont des difficultés visuelles. */
function TableCalendrierPret(p: {
  lignes: { mois: string; annee: number; interet: number; mensu: number; reste: number; echeance?: boolean; reconduit?: boolean }[];
  montant: number;
  /** NOM de la personne concernée par ce calendrier (le membre emprunteur). */
  nomMembre?: string;
  /** Ligne d'information supplémentaire (avaliste, mois, garanties…). */
  infoMembre?: string;
}) {
  const anneeCourante = new Date().getFullYear();
  const totalInterets = p.lignes.reduce((s, l) => s + l.interet, 0);
  const avecReconduction = p.lignes.some((l) => l.reconduit || l.echeance);
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
      {(p.nomMembre || p.infoMembre) && (
        <div className="border-b-2 border-[#B8A87E] bg-[#2A4A3A]/8 px-3 py-2.5">
          {p.nomMembre && (
            <p className="flex items-center gap-1.5 text-[14px] font-black text-[#1E4D2B]">
              <UserCheck className="h-4 w-4 shrink-0" /> Personne concernée : {p.nomMembre}
            </p>
          )}
          {p.infoMembre && <p className="mt-0.5 text-[12.5px] font-bold text-[#2B3530]">{p.infoMembre}</p>}
        </div>
      )}
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="bg-[#1E4D2B] text-white">
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

function MesPretsSection(p: {
  mesPrets: PretDemande[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: typeof MEMBRES_FICTIFS;
  regl: Reglement;
  form: { montant: string; motif: string; garanties: string; avalisteId: string };
  setForm: (f: { montant: string; motif: string; garanties: string; avalisteId: string }) => void;
  /** Mois (0-11) auquel rattacher le prêt en cours + mois courant — comme pour
   *  l'épargne, le mois réel n'est pas toujours le mois en cours. */
  moisChoisi: number | null;
  setMoisChoisi: (m: number) => void;
  moisCourantIdx: number | null;
  onDemander: () => void;
}) {
  const taux = p.regl.prets.tauxMensuel || TAUX_DEFAUT;
  const duree = p.regl.prets.dureeMaxMois > 0 ? p.regl.prets.dureeMaxMois : 6;
  /* Reconduction du capital non remboursé (v12) : la configuration du bureau
   * s'applique aussi à l'espace membre — le calendrier montre l'évolution
   * mensuelle APRÈS l'échéance si le prêt n'est pas remboursé. */
  const periode = p.regl.prets.reconductionCapital ? p.regl.prets.periodeCapitalisationMois : 0;
  const demandeMontant = Number(p.form.montant) || 0;
  /* Mois de départ du calendrier EN DIRECT : celui choisi dans le formulaire,
   * sinon le mois en cours — comme l'épargne, les calculs suivent le mois. */
  const moisDepart = p.moisChoisi ?? p.moisCourantIdx ?? 0;
  const mensualite = demandeMontant > 0
    ? Math.round((demandeMontant * (1 + (taux / 100) * duree)) / duree)
    : 0;

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B]/10 text-[#1E4D2B]"><Landmark className="h-4 w-4" /></span>
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Emprunter à la caisse de la cantine — les mêmes règles pour vous.</strong>
            Choisissez un montant, un avaliste et le mois du prêt, taux {taux} %/mois. Et parce que c’est votre caisse,
            <strong className="text-[#1E4D2B]"> vous êtes récusé</strong> : le bureau statue sans votre voix (vote {MAJORITES_LABELS[p.regl.prets.majorityPresident]}).
          </p>
        </div>
        {mensualite > 0 && (
          <p className="mt-2 rounded-2xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3 py-2 text-[11.5px] font-semibold text-[#8A6420]">
            Vos calculs, en direct — {fcfa(demandeMontant)} sur {duree} mois à {taux} %/mois : mensualité ≈ {fcfa(mensualite)}, intérêts totaux ≈ {fcfa(Math.round(demandeMontant * (taux / 100) * duree))}. Le calendrier détaillé est juste en dessous : changez le montant ou le mois, tout se recalcule aussitôt.
          </p>
        )}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input value={p.form.montant} onChange={(e) => p.setForm({ ...p.form, montant: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" placeholder="Montant (FCFA)" className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
          <select value={p.form.avalisteId} onChange={(e) => p.setForm({ ...p.form, avalisteId: e.target.value })} className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none">
            <option value="">Avaliste (garant)…</option>
            {p.roster.filter((x) => x.id !== MOI).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </div>
        {/* — mois du prêt : le mois réel, pas forcément le mois en cours — */}
        <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
          <p className="text-[11.5px] font-bold text-[#2B3530]">Mois du prêt</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">Le calendrier de remboursement démarre à CE mois — pratique si le prêt correspond à un besoin d’un mois passé ou à venir.</p>
          <select
            value={p.moisChoisi ?? ""}
            onChange={(e) => p.setMoisChoisi(Number(e.target.value))}
            aria-label="Mois auquel rattacher le prêt"
            className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
          >
            {MOIS_FR.map((nom, m) => (
              <option key={nom} value={m}>
                {nom}{p.moisCourantIdx != null && m === p.moisCourantIdx ? " — mois en cours" : m > (p.moisCourantIdx ?? 11) ? " — à venir" : ""}
              </option>
            ))}
          </select>
        </div>
        {/* — CALENDRIER EN DIRECT : comme pour l'épargne, les calculs sont
         *    visibles IMMÉDIATEMENT (pas besoin de déposer la demande) — ils
         *    démarrent au mois choisi et se recalculent à chaque frappe. — */}
        {demandeMontant > 0 && (
          <div className="mt-3 rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
            <p className="text-[13px] font-black text-[#1E4D2B]">Calendrier de remboursement — mois par mois</p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#4A554E]">
              Il démarre en {MOIS_FR[Math.min(11, Math.max(0, moisDepart))]} (le mois choisi ci-dessus) et court sur {duree} mois — intérêts de {fcfa(Math.round(demandeMontant * (taux / 100)))} par mois. S’il déborde sur l’année suivante, c’est marqué.
              {periode > 0 && ` Et s’il n’est pas remboursé à l’échéance : la somme due devient un nouveau capital (reconduction tous les ${periode} mois) — c’est visible mois par mois dans le tableau.`}
            </p>
            <div className="mt-2">
              <TableCalendrierPret
                lignes={lignesCalendrierPret(demandeMontant, taux, duree, moisDepart, periode)}
                montant={demandeMontant}
                nomMembre="Vous"
                infoMembre={p.form.avalisteId ? `Avaliste choisi : ${p.parMembre.get(p.form.avalisteId)?.name ?? "—"}` : undefined}
              />
            </div>
          </div>
        )}
        <div className="mt-2.5">
          <Btn onClick={p.onDemander}><Send className="h-4 w-4" /> Déposer ma demande de prêt</Btn>
        </div>
      </FcCard>

      {p.mesPrets.length > 0 && (
        <Block title="Mes demandes de prêt (caisse de la cantine)" icon={<ScrollText className="h-4.5 w-4.5" />}
          note="Suivez la décision du bureau dans l’onglet « Prêts & garanties » — votre voix y est désactivée. Le calendrier de remboursement s’affiche sous chaque dossier.">
          <ul className="divide-y divide-[#E5DCC0]">
            {p.mesPrets.map((pr) => {
              const av = pr.avalisteId ? p.parMembre.get(pr.avalisteId) : null;
              const moisIdx = pr.moisIdx ?? p.moisCourantIdx ?? 0;
              const lignes = lignesCalendrierPret(pr.montant, taux, duree, moisIdx, periode);
              return (
                <li key={pr.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-[#2B3530]">{fcfa(pr.montant)}{pr.motif ? ` — ${pr.motif}` : ""}</p>
                      <p className="text-[11.5px] text-[#8A9288]">
                        Rattaché à {MOIS_FR[Math.min(11, Math.max(0, moisIdx))]}{pr.garanties ? ` · garanties : ${pr.garanties}` : ""}{av ? ` · avaliste : ${av.name}` : ""}
                      </p>
                    </div>
                    {pr.statut === "en_attente" ? <P cls={OR_CLS}><Vote className="h-3 w-3" /> Vote bureau</P>
                      : pr.statut === "accorde" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Accordé</P>
                        : <P cls={RJ_CLS}><XCircle className="h-3 w-3" /> Refusé</P>}
                  </div>
                  {pr.statut !== "refuse" && (
                    <div className="mt-2.5">
                      <TableCalendrierPret
                        lignes={lignes}
                        montant={pr.montant}
                        nomMembre="Vous"
                        infoMembre={av ? `Avaliste (garant du remboursement) : ${av.name}` : undefined}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>
      )}

    </>
  );
}

/* ══════════════════════════ COTISATIONS & COLLATIONS DU MOIS ══════════════════════════
 *
 * La page demandée par l'administrateur (novembre 2026) : « Ajoutez plutôt une
 * page appelée Cotisations et collations dans laquelle le président peut voir
 * toutes les cotisations et collations du mois. » — remplace le cockpit comme
 * page d'accueil du poste de commandement.
 * ═════════════════════════════════════════════════════════════ */

function CotisationsCollationsSection(p: {
  mois: string | null;
  roster: typeof MEMBRES_FICTIFS;
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  typesCotis: TypeCotisation[];
  /** Collations créées par le président — la part d'un membre = la somme
   *  des collations qui lui sont attribuées (autant de collations que
   *  souhaité, chacune avec ses personnes). */
  collations: Collation[];
  montants: ReglagesTontine;
  cotisMois: Record<string, MouvementCotisMois>;
  onEncaisser: (membreId: string, quoi: "cotisation" | "collation", recu: boolean) => void;
  onToutEncaisser: () => void;
  onNotifierTresorier: () => void;
}) {
  const cotisBase = p.montants.montantCotisation;
  /* — par membre : sa cotisation attendue (type attribué par le bureau, sinon
   *    le montant de base) + sa part collation (somme de ses collations) —
   *    0 = « à fixer par le bureau » — */
  const lignes = p.roster.map((m) => {
    const t = typeDuMembre(m.id, p.typesCotis);
    const attenduCotis = t ? t.montant : cotisBase;
    const attenduColl = collationDuMembre(m.id, p.collations);
    const st = p.cotisMois[m.id] ?? { cotisation: false, collation: false };
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
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Collecte du mois{p.mois ? ` — ${p.mois}` : ""}</p>
            <p className="text-[26px] font-black leading-none text-[#1E4D2B]">{fcfa(totalRecu)}</p>
            <p className="mt-0.5 text-[11px] text-[#8A9288]">encaissés — cotisations {fcfa(totalCotisRecu)} · collations {fcfa(totalCollRecu)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <P cls={nbCotis >= p.roster.length ? OK_CLS : OR_CLS}><CheckCircle2 className="h-3 w-3" /> Cotisations {nbCotis}/{p.roster.length}</P>
            <P cls={nbColl >= p.roster.length ? OK_CLS : TE_CLS}><ReceiptText className="h-3 w-3" /> Collations {nbColl}/{p.roster.length}</P>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Cotisations du mois</p>
            <p className="text-[14px] font-black text-[#2B3530]">{fcfa(totalCotisRecu)} <span className="text-[11px] font-semibold text-[#8A9288]">encaissées</span></p>
            <p className="text-[11px] text-[#8A9288]">attendu : {fcfa(totalCotisAttendu)} — montant fixé par le bureau pour chaque membre</p>
          </div>
          <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Collations du mois</p>
            <p className="text-[14px] font-black text-[#2B3530]">{fcfa(totalCollRecu)} <span className="text-[11px] font-semibold text-[#8A9288]">encaissées</span></p>
            <p className="text-[11px] text-[#8A9288]">{totalCollAttendu > 0 ? `attendu : ${fcfa(totalCollAttendu)} — ${p.collations.length} collation${p.collations.length > 1 ? "s" : ""} fixée${p.collations.length > 1 ? "s" : ""} par le bureau` : "à fixer par le bureau — Paramètres → Cotisations & collations"}</p>
          </div>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-[#5C6B60]">
          Toutes les cotisations et toutes les collations du mois, membre par membre : cochez « Reçu » quand le trésorier encaisse — les totaux se mettent à jour aussitôt, et chaque action s’inscrit au journal.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Btn small tone="or" onClick={p.onToutEncaisser}><CheckSquare className="h-3.5 w-3.5" /> Tout marquer encaissé</Btn>
          <Btn small tone="teal" onClick={p.onNotifierTresorier}><Send className="h-3.5 w-3.5" /> Notifier le trésorier</Btn>
        </div>
      </FcCard>

      <Block title={`Membre par membre — ${p.mois ?? "mois en cours"}`} icon={<Users className="h-4.5 w-4.5" />}
        note="Cotisation = le montant fixé pour CE membre par le bureau (ou le montant de base). Collation = la somme des collations fixées pour CE membre. Cliquez à nouveau pour corriger une erreur de saisie.">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#1E4D2B] text-white">
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
                    <p className="font-bold text-[#2B3530]">{l.m.name}{l.m.id === MOI ? " (vous)" : ""}</p>
                    <p className="text-[10.5px] text-[#8A9288]">
                      {ROLE_META[l.m.role]?.short ?? l.m.role}{estMembreApp(l.m) ? " · via l’app" : ""}{l.typeNom ? ` · ${l.typeNom}` : l.attenduCotis > 0 ? " · montant de base" : " · à fixer par le bureau"}
                    </p>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <p className="text-[11.5px] font-semibold text-[#2B3530]">{l.attenduCotis > 0 ? fmt(l.attenduCotis) : "—"}</p>
                    <Btn small tone={l.st.cotisation ? "vert" : "neutre"} disabled={l.attenduCotis <= 0} onClick={() => p.onEncaisser(l.m.id, "cotisation", !l.st.cotisation)}>
                      {l.st.cotisation ? <><CheckCircle2 className="h-3.5 w-3.5" /> Reçue</> : <><Hourglass className="h-3.5 w-3.5" /> En attente</>}
                    </Btn>
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <p className="text-[11.5px] font-semibold text-[#2B3530]">{l.attenduColl > 0 ? fmt(l.attenduColl) : "—"}</p>
                    <Btn small tone={l.st.collation ? "or" : "neutre"} disabled={l.attenduColl <= 0} onClick={() => p.onEncaisser(l.m.id, "collation", !l.st.collation)}>
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
    </>
  );
}

/* ══════════════════════════ PARAMÈTRES DE LA CANTINE ══════════════════════════
 *
 * Le centre de paramétrage du président — TOUT ce qui se règle pour une
 * réunion : montants réels (visibles aussitôt par tous), impayés &
 * recouvrements (grâce, échelons, sanctions, paiements, encaisseur), prêts &
 * garanties (taux, plafond, avalistes, garanties acceptées, vote du dossier
 * du président), solidarité — caisse de secours (cotisation, plafond,
 * événements, majorité, versement), épargne (taux, préavis, minimums) et
 * réunion (quorum, reports). Chaque règle modifiée devient un BROUILLON ;
 * « Publier » la rend visible par TOUS les membres (lecture seule, page
 * Tontine, bloc « Règlement de la cantine »).
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Champ numérique avec prévisualisation FCFA (les montants en FCFA s'y
 *  prévisualisent en dessous ; les unités libres affichent leur unité). */
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
          className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F] focus:ring-2 focus:ring-[#1F5B3F]/20"
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
        actif ? "border-[#2F6B45]/35 bg-[#2F6B45]/8" : "border-[#E5DCC0] bg-[#FBF7EA]"
      }`}
    >
      <span className="min-w-0">
        <span className={`block text-[11.5px] font-bold ${actif ? "text-[#2F6B45]" : "text-[#5C6B60]"}`}>{label}</span>
        {note && <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{note}</span>}
      </span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${actif ? "bg-[#2F6B45]" : "bg-[#C9D2CB]"}`}>
        <span className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/** Contrôle segmenté — choix parmi des options fermées (majorité, encaisseur…). */
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
                actif ? "border-transparent bg-[#1E4D2B] text-white shadow" : "border-[#E5DCC0] bg-white text-[#5C6B60] hover:border-[#C89F62]/60"
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

/** APERÇU EN DIRECT — le tableau « Mes intérêts mois par mois » TEL QUE LE
 *  MEMBRE le voit dans « Mes épargnes » : un dépôt d'exemple (modifiable) posé
 *  en janvier et laissé toute l'année, rémunéré au taux EN VIGUEUR, avec la
 *  manière de collecter les intérêts choisie par le bureau. Calculs IDENTIQUES
 *  à ceux de l'espace membre (intérêts simples : montant × taux, chaque mois). */
function ApercuEpargneMembre({ taux, collecte, preavisJours }: {
  taux: number; collecte: Reglement["epargne"]["collecteInterets"]; preavisJours: number;
}) {
  const [depot, setDepot] = useState(10_000);
  const interetMois = Math.round(depot * (taux / 100));
  const totalAnnee = interetMois * 12;
  const COLONNE_CUMUL: Record<Reglement["epargne"]["collecteInterets"], string> = {
    capitalise: "Intérêts cumulés",
    reunion: "Remis à la réunion",
    finAnnee: "En attente au registre",
    caisse: "Versés à la caisse sociale",
  };
  const NOTE_COLLECTE: Record<Reglement["epargne"]["collecteInterets"], string> = {
    capitalise: `Les intérêts s'ajoutent au solde chaque mois — le membre les touche quand il retire${preavisJours > 0 ? ` (préavis de ${preavisJours} jour(s) avant tout retrait)` : ""}.`,
    reunion: `Chaque réunion, le trésorier remet l'intérêt du mois en espèces au membre — le cumul ci-dessus est ce qu'il a perçu${preavisJours > 0 ? ` · préavis de ${preavisJours} jour(s) avant tout retrait du capital` : ""}.`,
    finAnnee: `Rien ne sort de la caisse avant décembre : les intérêts sont versés EN UNE FOIS à la réunion de décembre${preavisJours > 0 ? ` · préavis de ${preavisJours} jour(s) avant tout retrait du capital` : ""}.`,
    caisse: `Le membre ne perçoit PAS ces intérêts : ils alimentent la caisse sociale — il récupère son capital intact${preavisJours > 0 ? ` (préavis de ${preavisJours} jour(s) avant tout retrait)` : ""}.`,
  };
  const libelleTotal: Record<Reglement["epargne"]["collecteInterets"], string> = {
    capitalise: "Au 31 décembre — intérêts crédités au membre",
    reunion: "Au 31 décembre — intérêts remis au fil des réunions",
    finAnnee: "Versement unique de décembre — intérêts versés au membre",
    caisse: "Au 31 décembre — intérêts reçus par la caisse sociale",
  };
  return (
    <div className="rounded-2xl border-2 border-[#3D6B72]/40 bg-[#3D6B72]/6 p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#3D6B72]"><Eye className="h-3.5 w-3.5" /> Aperçu en direct — ce que voit le membre dans « Mes épargnes »</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-[#5C6B60]">
        Le tableau « Mes intérêts mois par mois » de l&apos;espace membre, avec un dépôt d&apos;exemple posé en janvier et laissé toute l&apos;année — mêmes calculs, même taux ({taux} %/mois), même manière de collecter les intérêts.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {[5_000, 10_000, 25_000, 50_000].map((mt) => (
          <Btn key={mt} small tone={depot === mt ? "teal" : "neutre"} onClick={() => setDepot(mt)}>{fmt(mt)}</Btn>
        ))}
        <label className="flex items-center gap-1 rounded-lg border border-[#C9B98A] bg-white px-2 py-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1_000}
            value={depot}
            aria-label="Dépôt d'exemple en FCFA"
            onChange={(e) => setDepot(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 bg-transparent text-right text-[12.5px] font-bold text-[#2B3530] outline-none"
          />
          <span className="text-[10.5px] font-bold text-[#8A9288]">FCFA</span>
        </label>
      </div>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#E5DCC0] bg-white">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0">
            <tr className="bg-[#1E4D2B] text-white">
              <th className="px-2.5 py-2 text-left font-black">Mois</th>
              <th className="px-2.5 py-2 text-right font-black">Épargne en place</th>
              <th className="px-2.5 py-2 text-right font-black">Intérêts du mois</th>
              <th className="px-2.5 py-2 text-right font-black">{COLONNE_CUMUL[collecte]}</th>
            </tr>
          </thead>
          <tbody>
            {MOIS_FR.map((nom, m) => (
              <tr key={nom} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                <td className="px-2.5 py-1.5 font-bold text-[#2B3530]">{nom}{m === 0 && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">dépôt</span>}</td>
                <td className="px-2.5 py-1.5 text-right text-[#2B3530]">{fcfa(depot)}</td>
                <td className="px-2.5 py-1.5 text-right font-bold text-[#2F6B45]">{interetMois > 0 ? `+${fmt(interetMois)}` : "0"}</td>
                <td className="px-2.5 py-1.5 text-right font-black text-[#1E4D2B]">{fcfa(interetMois * (m + 1))}</td>
              </tr>
            ))}
            <tr className="bg-[#C89F62]/15">
              <td className="px-2.5 py-2 font-black text-[#2B2416]" colSpan={2}>{libelleTotal[collecte]}</td>
              <td className="px-2.5 py-2 text-right font-black text-[#8A6420]">+{fmt(totalAnnee)}</td>
              <td className="px-2.5 py-2 text-right font-black text-[#2B2416]">{fcfa(totalAnnee)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
        {NOTE_COLLECTE[collecte]} Changez le taux ou la manière de collecter ci-dessus : ce tableau — et la page de chaque membre — suivent aussitôt.
      </p>
    </div>
  );
}

/** APERÇU EN DIRECT — la reconduction du capital non remboursé avec
 *  l'évolution MENSUELLE (demande du président, v12) : un prêt d'exemple
 *  (modifiable) posé en janvier au taux configuré ; à l'échéance, s'il n'est
 *  pas remboursé, la somme due devient le NOUVEAU capital — deux cycles de
 *  reconduction sont montrés, calculs identiques à lignesCalendrierPret. */
function ApercuReconductionPret({ taux, periode, duree }: { taux: number; periode: number; duree: number }) {
  const [capital, setCapital] = useState(10_000);
  if (periode <= 0) {
    return (
      <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3 text-[11.5px] leading-relaxed text-[#5C6B60]">
        <p className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[#8A9288]"><Eye className="h-3.5 w-3.5" /> Aperçu — reconduction désactivée</p>
        <p className="mt-1">Le prêt suit le calendrier normal et s’arrête à son échéance. Activez la reconduction et fixez la période (l’exemple du bureau : 3 mois) pour que la somme due devienne un nouveau capital.</p>
      </div>
    );
  }
  const lignes = lignesCalendrierPret(capital, taux, duree, 0, periode);
  const sommeDue = capital + Math.round(capital * (taux / 100)) * duree;
  return (
    <div className="mt-2 rounded-2xl border-2 border-[#3D6B72]/40 bg-[#3D6B72]/6 p-3">
      <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#3D6B72]"><Eye className="h-3.5 w-3.5" /> Aperçu en direct — l’évolution MENSUELLE, échéance puis reconductions</p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-[#5C6B60]">
        Un prêt d’exemple posé en janvier, au taux de {taux} %/mois sur {duree} mois. À l’échéance ({MOIS_FR[Math.min(11, Math.max(0, duree - 1))]}), s’il n’est pas remboursé, la somme due devient le NOUVEAU capital et les intérêts repartent de là — tout se voit mois par mois.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {[5_000, 10_000, 50_000, 100_000].map((mt) => (
          <Btn key={mt} small tone={capital === mt ? "teal" : "neutre"} onClick={() => setCapital(mt)}>{fmt(mt)}</Btn>
        ))}
        <label className="flex items-center gap-1 rounded-lg border border-[#C9B98A] bg-white px-2 py-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={5_000}
            value={capital}
            aria-label="Capital d'exemple en FCFA"
            onChange={(e) => setCapital(Math.max(0, Number(e.target.value) || 0))}
            className="w-28 bg-transparent text-right text-[12.5px] font-bold text-[#2B3530] outline-none"
          />
          <span className="text-[10.5px] font-bold text-[#8A9288]">FCFA</span>
        </label>
      </div>
      <div className="mt-2">
        <TableCalendrierPret lignes={lignes} montant={capital} />
      </div>
      <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
        Les {duree} premières lignes = le remboursement normal (mensualités). À l’échéance, si le prêt n’est pas remboursé, la somme due ({fcfa(sommeDue)}) devient le nouveau capital — deux cycles de reconduction ({periode} mois chacun) sont montrés, les intérêts étant recalculés sur la nouvelle somme. Changez le taux, la durée ou la période ci-dessus : cet aperçu — et le calendrier de chaque prêt — suivent aussitôt.
      </p>
    </div>
  );
}

function ParametresSection(p: {
  regl: Reglement;
  /** Brouillon modifié mais pas encore publié aux membres. */
  sale: boolean;
  maj: (patch: (r: Reglement) => Reglement) => void;
  typesCotis: TypeCotisation[];
  majTypesCotis: (next: TypeCotisation[], message?: string) => void;
  collations: Collation[];
  majCollations: (next: Collation[], message?: string) => void;
  /** Montants de la tontine — la cotisation mensuelle de base y est éditée
   *  dans la sous-section Cotisations (champ « Cotisation mensuelle de base »). */
  montants: ReglagesTontine;
  /** Fixe la cotisation mensuelle de base (membres sans type particulier) —
   *  appliqué aussitôt, visible partout (accueil, membres, collecte du mois). */
  majMontantBase: (n: number) => void;
  roster: typeof MEMBRES_FICTIFS;
  sous: SousParamKey;
  goSous: (s: SousParamKey) => void;
  onPublier: () => void;
  onReinitialiser: () => void;
}) {
  /* — BROUILLON LOCAL — chaque section tient sur UN écran et s'enregistre par
   *    son propre bouton « Enregistrer » ; si vous quittez l'onglet sans
   *    enregistrer, rien n'est perdu (voir l'effet de sécurité plus bas). — */
  const [brouillon, setBrouillon] = useState<Reglement>(p.regl);
  const [typesLocaux, setTypesLocaux] = useState<TypeCotisation[]>(p.typesCotis);
  const [collationsLocales, setCollationsLocales] = useState<Collation[]>(p.collations);
  /* — formulaire de création d'un type de cotisation : ouvert par le bouton
   *    « Ajouter une somme de cotisation mensuelle » — on y renseigne le TYPE,
   *    la SOMME et les PERSONNES HABILITÉES à payer, puis on crée. — */
  const [formCotisOpen, setFormCotisOpen] = useState(false);
  const [formCotis, setFormCotis] = useState<{ nom: string; montant: number; membreIds: string[] }>({ nom: "", montant: 0, membreIds: [] });
  /* — formulaire de création d'une collation : même principe — on en crée
   *    AUTANT qu'on veut : nom, somme par personne et par réunion, personnes
   *    qui la paient. — */
  const [formCollOpen, setFormCollOpen] = useState(false);
  const [formColl, setFormColl] = useState<{ nom: string; montant: number; membreIds: string[] }>({ nom: "", montant: 0, membreIds: [] });
  const [sales, setSales] = useState<Record<string, boolean>>({});
  const marquerSale = (s: string) => setSales((x) => ({ ...x, [s]: true }));

  /* Resynchronisation quand le règlement change ailleurs (publication,
   * réinitialisation, enregistrement d'une autre section…) — pattern React
   * « ajuster l'état pendant le rendu quand une prop change ». */
  const [dernierRegl, setDernierRegl] = useState(p.regl);
  const [derniersTypes, setDerniersTypes] = useState(p.typesCotis);
  const [dernieresColls, setDernieresColls] = useState(p.collations);
  if (dernierRegl !== p.regl || derniersTypes !== p.typesCotis || dernieresColls !== p.collations) {
    setDernierRegl(p.regl);
    setDerniersTypes(p.typesCotis);
    setDernieresColls(p.collations);
    setBrouillon(p.regl);
    setTypesLocaux(p.typesCotis);
    setCollationsLocales(p.collations);
  }

  /* — sécurité : en quittant l'onglet Paramètres, ce qui n'a pas été
   *    enregistré par bouton est conservé comme brouillon du bureau (sans
   *    notification — la publication reste un geste séparé). — */
  const refs = useRef({ brouillon, typesLocaux, collationsLocales, sales, maj: p.maj, majTypes: p.majTypesCotis, majColl: p.majCollations });
  useEffect(() => {
    refs.current = { brouillon, typesLocaux, collationsLocales, sales, maj: p.maj, majTypes: p.majTypesCotis, majColl: p.majCollations };
  });
  useEffect(() => () => {
    const s = refs.current.sales;
    if (s.prets || s.solidarite || s.epargne) refs.current.maj(() => ({ ...refs.current.brouillon }));
    if (s.cotisations) refs.current.majTypes(refs.current.typesLocaux);
    if (s.collations) refs.current.majColl(refs.current.collationsLocales);
  }, []);

  const r = brouillon;
  const majPrets = (patch: Partial<Reglement["prets"]>) => { setBrouillon((x) => ({ ...x, prets: { ...x.prets, ...patch } })); marquerSale("prets"); };
  const majTypePret = (id: string, patch: Partial<TypePretConfig>) => { setBrouillon((x) => ({ ...x, prets: { ...x.prets, types: { ...x.prets.types, [id]: { ...x.prets.types[id], ...patch } } } })); marquerSale("prets"); };
  const majSol = (patch: Partial<Reglement["solidarite"]>) => { setBrouillon((x) => ({ ...x, solidarite: { ...x.solidarite, ...patch } })); marquerSale("solidarite"); };
  const majEvent = (cle: keyof Reglement["solidarite"]["events"]) => { setBrouillon((x) => ({ ...x, solidarite: { ...x.solidarite, events: { ...x.solidarite.events, [cle]: !x.solidarite.events[cle] } } })); marquerSale("solidarite"); };
  const majEp = (patch: Partial<Reglement["epargne"]>) => { setBrouillon((x) => ({ ...x, epargne: { ...x.epargne, ...patch } })); marquerSale("epargne"); };
  const majTypeEpargne = (id: string, patch: Partial<TypeEpargneConfig>) => { setBrouillon((x) => ({ ...x, epargne: { ...x.epargne, types: { ...x.epargne.types, [id]: { ...x.epargne.types[id], ...patch } } } })); marquerSale("epargne"); };

  /* — Enregistrer : la section devient le brouillon du bureau — la
   *    publication aux membres reste un geste séparé (section Publication). — */
  const enregistrer = (s: SousParamKey, label: string) => {
    p.maj(() => ({ ...brouillon }));
    setSales((x) => ({ ...x, [s]: false }));
    toast.success(`« ${label} » enregistré`, { description: "Réglage conservé par le bureau — publiez-le pour que les membres le voient." });
  };
  const enregistrerTypes = () => {
    p.majTypesCotis(typesLocaux);
    setSales((x) => ({ ...x, cotisations: false }));
    toast.success("Types de cotisations enregistrés", { description: "Validez l'attribution d'un type pour notifier les membres concernés." });
  };
  const enregistrerCollations = () => {
    p.majCollations(collationsLocales);
    setSales((x) => ({ ...x, collations: false }));
    toast.success("Collations enregistrées", { description: "La part collation de chaque personne désignée est aussitôt mise à jour dans la page Cotisations & collations." });
  };

  /* — RÈGLE DE LA CANTINE : un membre ne cotise qu'UNE seule somme mensuelle —
   *    typeOccupant(membreId, editeId?) retourne le type (autre que celui en
   *    cours d'édition) auquel la personne est DÉJÀ attribuée, pour le CITER
   *    à l'écran (« déjà dans « X » ») et bloquer son cochage ailleurs. */
  const typeOccupant = (membreId: string, editeId?: string): TypeCotisation | null =>
    typesLocaux.find((t) => t.id !== editeId && t.membreIds.includes(membreId)) ?? null;

  /* — MEMBRES AJOUTÉS VIA L'APPLICATION (annuaire réel de l'app, fusionné dans
   *    le roster par le composant parent) — repérés par leur identifiant pour
   *    la pastille « via l’app » et la carte d'information ci-dessous. — */
  const membresApp = p.roster.filter(estMembreApp);

  /* — types de cotisations : le bouton OUVRIT un formulaire (type + somme +
   *    personnes habilitées) ; à la création, le type apparaît rempli ci-
   *    dessous — la validation (« Valider l'attribution ») notifie ensuite les
   *    membres, qui voient la somme sur leur page avec une notification. — */
  const basculerFormCotis = () => {
    if (formCotisOpen) { setFormCotisOpen(false); return; }
    setFormCotis({ nom: "", montant: 0, membreIds: [] });
    setFormCotisOpen(true);
  };
  const creerTypeCotis = () => {
    const nom = formCotis.nom.trim() || `Cotisation ${typesLocaux.length + 1}`;
    const t: TypeCotisation = { ...nouveauTypeCotisation(nom), montant: formCotis.montant, membreIds: [...formCotis.membreIds] };
    setTypesLocaux((x) => [...x, t]);
    setFormCotisOpen(false);
    marquerSale("cotisations");
    toast.success(`Type « ${nom} » créé`, { description: `${t.membreIds.length} membre(s) habilité(s) — « Valider l'attribution » ci-dessous notifiera chaque membre concerné.` });
  };
  const validerTypeCotis = (t: TypeCotisation) => {
    if (t.montant <= 0) { toast.error("Fixez d'abord la somme de ce type (aujourd'hui à 0)"); return; }
    if (t.membreIds.length === 0) { toast.error("Sélectionnez au moins un membre qui doit cotiser cette somme"); return; }
    const next = typesLocaux.map((x) => {
      if (x.id === t.id) return { ...x, valideLe: new Date().toISOString() };
      /* un membre ne cotise qu'UNE somme : on le retire des autres types */
      return { ...x, membreIds: x.membreIds.filter((id) => !t.membreIds.includes(id)) };
    });
    setTypesLocaux(next);
    p.majTypesCotis(next, `${fmtMontant(t.montant)} par mois (« ${t.nom} ») attribués à ${t.membreIds.length} membre(s) — ils voient cette somme sur leur page avec une notification.`);
  };
  const supprimerTypeCotis = (t: TypeCotisation) => {
    const next = typesLocaux.filter((x) => x.id !== t.id);
    setTypesLocaux(next);
    p.majTypesCotis(next);
    marquerSale("cotisations");
    toast(`Type « ${t.nom} » supprimé`, { description: "Les membres concernés repassent à la cotisation de base." });
  };

  /* — collations : le bouton « Ajouter une collation » OUVRIT un formulaire
   *    (nom + somme par personne + personnes qui la paient) — on en crée
   *    AUTANT qu'on veut ; la part d'un membre = la somme de ses collations. — */
  const basculerFormColl = () => {
    if (formCollOpen) { setFormCollOpen(false); return; }
    setFormColl({ nom: "", montant: 0, membreIds: [] });
    setFormCollOpen(true);
  };
  const creerCollation = () => {
    const nom = formColl.nom.trim() || `Collation ${collationsLocales.length + 1}`;
    const c: Collation = { ...nouvelleCollation(nom), montant: formColl.montant, membreIds: [...formColl.membreIds] };
    setCollationsLocales((x) => [...x, c]);
    setFormCollOpen(false);
    marquerSale("collations");
    toast.success(`Collation « ${nom} » créée`, { description: `${c.membreIds.length} personne(s) désignée(s) — « Valider l'attribution » ci-dessous notifiera chaque personne concernée.` });
  };
  const validerCollation = (c: Collation) => {
    if (c.montant <= 0) { toast.error("Fixez d'abord la somme de cette collation (aujourd'hui à 0)"); return; }
    if (c.membreIds.length === 0) { toast.error("Sélectionnez au moins une personne qui doit payer cette collation"); return; }
    const next = collationsLocales.map((x) => (x.id === c.id ? { ...x, valideLe: new Date().toISOString() } : x));
    setCollationsLocales(next);
    p.majCollations(next, `${fmtMontant(c.montant)} par réunion (« ${c.nom} ») attribués à ${c.membreIds.length} personne(s) — elles voient cette somme sur leur page avec une notification.`);
  };
  const supprimerCollation = (c: Collation) => {
    const next = collationsLocales.filter((x) => x.id !== c.id);
    setCollationsLocales(next);
    p.majCollations(next);
    marquerSale("collations");
    toast(`Collation « ${c.nom} » supprimée`, { description: "La part collation des personnes désignées est mise à jour aussitôt." });
  };

  const publieLe = r.publieLe
    ? (() => { try { return new Date(r.publieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return null; } })()
    : null;

  const typeEpargne = r.epargne.typeChoisi ? TYPES_EPARGNE_CATALOGUE.find((t) => t.id === r.epargne.typeChoisi) ?? null : null;

  return (
    <>
      {/* — bandeau du centre de paramétrage — */}
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-gradient-to-br from-[#1E4D2B] to-[#2F6B45] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><SlidersHorizontal className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">Paramètres de la cantine — c&apos;est vous qui paramétrez</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Une section = un écran = un bouton « Enregistrer ». Tous les chiffres démarrent à 0 et toutes les options à désactivées : c&apos;est VOUS qui décidez de chaque valeur.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <P cls="border-white/25 bg-white/10 text-white"><ScrollText className="h-3 w-3" /> Version {r.version}</P>
              {publieLe && <P cls="border-white/25 bg-white/10 text-white"><CheckCircle2 className="h-3 w-3" /> Publiée le {publieLe}</P>}
              {p.sale
                ? <P cls="border-[#C89F62] bg-[#C89F62]/25 text-[#FFEBD2]"><AlertTriangle className="h-3 w-3" /> Modifications non publiées</P>
                : <P cls="border-white/25 bg-white/10 text-white"><CheckCircle2 className="h-3 w-3" /> Règlement publié à jour</P>}
            </div>
          </div>
        </div>
      </FcCard>

      {/* — sous-onglets de paramétrage : une section par écran, chaque section
       *    a SON URL (#president/parametres/<section>) et SON bouton
       *    « Enregistrer » — plus besoin de scroller jusqu'en bas. — */}
      <div className="rounded-2xl border-2 border-[#B8A87E] bg-white p-2.5 shadow-[0_10px_30px_rgba(42,74,58,0.12)]">
        <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6E7A70]">Sections du paramétrage — cliquez, réglez, enregistrez</p>
        <div className="flex flex-wrap gap-2">
          {SOUS_PARAMS.map((s) => {
            const actif = p.sous === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => p.goSous(s.key)}
                aria-current={actif ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 text-[12.5px] font-bold transition-all sm:text-[13px] ${
                  actif ? "border-[#153D22] bg-[#1E4D2B] text-white shadow-lg" : "border-[#C4AE85] bg-white text-[#463C28] hover:border-[#C89F62] hover:bg-[#F7EFDB]"
                }`}
              >
                {s.icon}{s.label}
                {(sales[s.key] || (s.key === "cotisations" && sales.collations)) && <span className="h-2 w-2 shrink-0 rounded-full bg-[#C89F62]" aria-label="modifications non enregistrées" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════ SECTION COTISATIONS & COLLATIONS ══════════════════
       *  L'ancienne section « Montants de la cantine » (5 champs) a été retirée
       *  à la demande de l'administrateur : les sommes passent DÉSORMAIS par les
       *  types de cotisations ci-dessous, et les collations par la section
       *  « Collations » — on en crée autant qu'on veut. Les champs d'ajout
       *  vivent UNIQUEMENT ici, dans Paramètres (retour de l'administrateur :
       *  rien à ajouter depuis la page d'accueil « Cotisations & collations »). — */}
      {p.sous === "cotisations" && (
        <>
          {/* — MEMBRES AJOUTÉS VIA L'APPLICATION : l'annuaire réel de l'app
           *    (inscrits / pré-enregistrés) est fusionné dans toutes les listes
           *    — réponse directe à « où sont les membres que j'ai ajoutés ? ». — */}
          <FcCard className="border-[#3D6B72]/30 bg-[#3D6B72]/6 p-4">
            <div className="flex items-start gap-2.5">
              <UserPlus className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#3D6B72]" />
              <div className="min-w-0">
                {membresApp.length > 0 ? (
                  <>
                    <p className="text-[13px] font-bold text-[#2B3530]">
                      {membresApp.length} membre{membresApp.length > 1 ? "s" : ""} ajouté{membresApp.length > 1 ? "s" : ""} via l’application — présent{membresApp.length > 1 ? "s" : ""} dans toutes les listes
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[#8A9288]">
                      {membresApp.map((m) => m.name).join(" · ")} — inscrits ou pré-enregistrés depuis l’espace famille, ils participent aux cotisations, collations, présences et encaissements comme les autres (repérables à la pastille « via l’app »).
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-[#2B3530]">Les membres ajoutés via l’application apparaissent automatiquement ici</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[#8A9288]">
                      Toute personne inscrite avec son code d’accès ou pré-enregistrée par le secrétariat rejoint aussitôt ces listes (habilitations, collations, présences, encaissements), marquée « via l’app ». Aucun membre ajouté sur cet appareil pour l’instant.
                    </p>
                  </>
                )}
              </div>
            </div>
          </FcCard>
          {/* — COTISATION DE BASE : la somme de TOUS les membres sans type
           *    particulier — réglage ramené ICI depuis l'accueil (les réglages
           *    de cotisation vivent UNIQUEMENT dans Paramètres). 0 = « à fixer
           *    par le bureau » sur la page des membres. — */}
          <FcCard className="p-4">
            <NumField
              label="Cotisation mensuelle de base — pour les membres sans type particulier"
              note="Cette somme s'applique aussitôt à tous les membres sans type particulier (les types créés ci-dessous la remplacent pour leurs membres)."
              value={p.montants.montantCotisation}
              fcfaPreview
              step={500}
              onChange={p.majMontantBase}
            />
          </FcCard>
          <Block
            title="Types de cotisations mensuelles"
            icon={<Layers className="h-4 w-4" />}
            note="Tout le monde ne cotise pas la même somme. Ajoutez une somme (ex. 50 000 FCFA), sélectionnez les membres qui doivent cotiser cette somme, validez — ils la verront sur leur page avec une notification. Un membre non choisi reste sur la cotisation de base. RÈGLE DES CALCULS : le type attribué est la somme que le membre verse TOUS LES MOIS DE L'ANNÉE, quel que soit le bénéficiaire — et quand vient SON tour, il cotise aussi : la somme remise est l'addition des taux de tous (ex. Aurélie 50 000 + Patrick 30 000 → chez Aurélie, Patrick verse 30 000 et elle encaisse tout)."
          >
            <div className="space-y-3 p-4">
              <Btn tone="or" onClick={basculerFormCotis} aria-expanded={formCotisOpen}><Plus className="h-4 w-4" /> Ajouter une somme de cotisation mensuelle</Btn>
              {/* — FORMULAIRE DE CRÉATION : type + somme + personnes habilitées — */}
              {formCotisOpen && (
                <div className="rounded-2xl border-2 border-[#C89F62] bg-[#FFF9EC] p-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#8A6420]"><Layers className="h-3.5 w-3.5" /> Nouveau type de cotisation mensuelle</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8A9288]">Renseignez le type, la somme et les personnes habilitées à la payer — puis créez : le type apparaît rempli ci-dessous (il reste à valider pour notifier les membres).</p>
                  <div className="mt-2.5 space-y-2.5">
                    <div>
                      <label htmlFor="fc-cotis-nom" className="text-[11.5px] font-bold text-[#2B3530]">Type de cotisation mensuelle</label>
                      <input
                        id="fc-cotis-nom"
                        value={formCotis.nom}
                        onChange={(e) => setFormCotis((x) => ({ ...x, nom: e.target.value }))}
                        autoFocus
                        placeholder="Ex. Cotisation des fondateurs"
                        className="mt-1 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] font-semibold text-[#2B3530] placeholder:font-normal placeholder:text-[#8A9288] outline-none focus:border-[#1F5B3F]"
                      />
                    </div>
                    <NumField label="Somme mensuelle que ces membres verseront" note="Le montant démarre à 0 — c'est vous qui décidez" value={formCotis.montant} fcfaPreview step={5_000}
                      onChange={(n) => setFormCotis((x) => ({ ...x, montant: n }))} />
                    <div className="rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                          <ListChecks className="h-3.5 w-3.5 text-[#1E4D2B]" /> Personnes habilitées à payer cela — {formCotis.membreIds.length} sélectionnée(s)
                        </p>
                        <div className="flex gap-1.5">
                          <Btn small tone="neutre" onClick={() => {
                            const libres = p.roster.filter((m) => !typeOccupant(m.id));
                            const exclus = p.roster.length - libres.length;
                            setFormCotis((x) => ({ ...x, membreIds: libres.map((m) => m.id) }));
                            if (exclus > 0) toast(`${exclus} personne(s) non cochée(s)`, { description: "Elles cotisent déjà une autre somme — un membre ne cotise qu'une seule somme mensuelle." });
                          }}>Tout cocher</Btn>
                          <Btn small tone="neutre" onClick={() => setFormCotis((x) => ({ ...x, membreIds: [] }))}>Tout décocher</Btn>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[10.5px] leading-snug text-[#8A9288]">Règle de la cantine : un membre ne cotise qu&apos;une seule somme mensuelle — une personne déjà attribuée à un autre type est signalée « déjà dans… » et ne peut pas être cochée ici.</p>
                      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                        {p.roster.map((m) => {
                          const coche = formCotis.membreIds.includes(m.id);
                          const occupant = typeOccupant(m.id);
                          const bloque = !!occupant && !coche;
                          return (
                            <label key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#1E4D2B]/8" : bloque ? "cursor-not-allowed bg-[#C05146]/4" : "cursor-pointer hover:bg-white"}`}>
                              {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#1E4D2B]" /> : bloque ? <Ban className="h-4 w-4 shrink-0 text-[#C05146]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={coche}
                                aria-disabled={bloque}
                                onChange={() => {
                                  if (bloque) {
                                    toast.error("Cette personne cotise déjà ailleurs", { description: `${m.name} est déjà attribué(e) au type « ${occupant!.nom} ». Un membre ne cotise qu'une seule somme mensuelle — décochez-la d'abord dans ce type pour pouvoir la cocher ici.` });
                                    return;
                                  }
                                  setFormCotis((x) => ({ ...x, membreIds: coche ? x.membreIds.filter((id) => id !== m.id) : [...x.membreIds, m.id] }));
                                }}
                              />
                              <span className={`text-[12px] font-semibold ${coche ? "text-[#1E4D2B]" : bloque ? "text-[#A5473D]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                              {estMembreApp(m) && (
                                <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>
                              )}
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
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn onClick={creerTypeCotis}><CheckCircle2 className="h-4 w-4" /> Créer ce type de cotisation</Btn>
                    <Btn tone="neutre" onClick={() => setFormCotisOpen(false)}>Annuler</Btn>
                  </div>
                </div>
              )}
              {typesLocaux.length === 0 && (
                <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8A9288]">
                  Aucun type créé pour l&apos;instant — tout le monde cotise la cotisation de base. Créez un premier type pour les membres qui cotisent une autre somme.
                </p>
              )}
              {typesLocaux.map((t) => (
                <div key={t.id} className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 shrink-0 text-[#8A6420]" />
                    <input
                      value={t.nom}
                      onChange={(e) => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, nom: e.target.value } : y))); marquerSale("cotisations"); }}
                      aria-label="Nom du type de cotisation"
                      className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
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
                    <NumField label="Somme que ces membres devront verser" note="Le montant démarre à 0 — c'est vous qui décidez" value={t.montant} fcfaPreview step={5_000}
                      onChange={(n) => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, montant: n } : y))); marquerSale("cotisations"); }} />
                  </div>
                  <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#1E4D2B]" /> {t.membreIds.length} membre(s) doit(vent) cotiser {fmtMontant(t.montant)}
                      </p>
                      <div className="flex gap-1.5">
                        <Btn small tone="neutre" onClick={() => {
                          const libres = p.roster.filter((m2) => !typeOccupant(m2.id, t.id));
                          const exclus = p.roster.length - libres.length;
                          setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: libres.map((m2) => m2.id) } : y)));
                          marquerSale("cotisations");
                          if (exclus > 0) toast(`${exclus} personne(s) non cochée(s)`, { description: "Elles cotisent déjà une autre somme — un membre ne cotise qu'une seule somme mensuelle." });
                        }}>Tout cocher</Btn>
                        <Btn small tone="neutre" onClick={() => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: [] } : y))); marquerSale("cotisations"); }}>Tout décocher</Btn>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-snug text-[#8A9288]">Un membre ne cotise qu&apos;une seule somme — une personne déjà attribuée à un autre type est signalée « déjà dans… » et ne peut pas être cochée ici.</p>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                      {p.roster.map((m) => {
                        const coche = t.membreIds.includes(m.id);
                        const occupant = typeOccupant(m.id, t.id);
                        const bloque = !!occupant && !coche;
                        return (
                          <label key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#1E4D2B]/8" : bloque ? "cursor-not-allowed bg-[#C05146]/4" : "cursor-pointer hover:bg-white"}`}>
                            {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#1E4D2B]" /> : bloque ? <Ban className="h-4 w-4 shrink-0 text-[#C05146]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={coche}
                              aria-disabled={bloque}
                              onChange={() => {
                                if (bloque) {
                                  toast.error("Cette personne cotise déjà ailleurs", { description: `${m.name} est déjà attribué(e) au type « ${occupant!.nom} ». Un membre ne cotise qu'une seule somme mensuelle — décochez-la d'abord dans ce type pour pouvoir la cocher ici.` });
                                  return;
                                }
                                setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: coche ? y.membreIds.filter((id) => id !== m.id) : [...y.membreIds, m.id] } : y)));
                                marquerSale("cotisations");
                              }}
                            />
                            <span className={`text-[12px] font-semibold ${coche ? "text-[#1E4D2B]" : bloque ? "text-[#A5473D]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                            {estMembreApp(m) && (
                              <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>
                            )}
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
                    <Btn small onClick={() => validerTypeCotis(t)}><CheckCircle2 className="h-3.5 w-3.5" /> Valider l&apos;attribution</Btn>
                    {t.valideLe && <P cls={OK_CLS}><Check className="h-3 w-3" /> Attribution validée — les membres sont notifiés</P>}
                  </div>
                </div>
              ))}
              <PiedSection sale={!!sales.cotisations} onClick={enregistrerTypes} label="Enregistrer les types de cotisations" />
            </div>
          </Block>

          <Block
            title="Collations"
            icon={<Coffee className="h-4 w-4" />}
            note="Ajoutez AUTANT de collations que la cantine en décide : chaque collation a son nom, sa somme par personne et par réunion, et les personnes qui la paient. La part d'un membre = la somme des collations qui lui sont attribuées."
          >
            <div className="space-y-3 p-4">
              <Btn tone="or" onClick={basculerFormColl} aria-expanded={formCollOpen}><Plus className="h-4 w-4" /> Ajouter une collation</Btn>
              {/* — FORMULAIRE DE CRÉATION : nom + somme + personnes qui la paient —
                  autant de collations que souhaité : créez, puis recommencez. — */}
              {formCollOpen && (
                <div className="rounded-2xl border-2 border-[#C89F62] bg-[#FFF9EC] p-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#8A6420]"><Coffee className="h-3.5 w-3.5" /> Nouvelle collation</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#8A9288]">Renseignez le nom de la collation, la somme par personne et les personnes qui la paient — puis créez. Vous pouvez ajouter autant de collations que vous voulez, l&apos;une après l&apos;autre.</p>
                  <div className="mt-2.5 space-y-2.5">
                    <div>
                      <label htmlFor="fc-coll-nom" className="text-[11.5px] font-bold text-[#2B3530]">Nom de la collation</label>
                      <input
                        id="fc-coll-nom"
                        value={formColl.nom}
                        onChange={(e) => setFormColl((x) => ({ ...x, nom: e.target.value }))}
                        autoFocus
                        placeholder="Ex. Collation ordinaire"
                        className="mt-1 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] font-semibold text-[#2B3530] placeholder:font-normal placeholder:text-[#8A9288] outline-none focus:border-[#1F5B3F]"
                      />
                    </div>
                    <NumField label="Somme par personne et par réunion" note="Le montant démarre à 0 — c'est vous qui décidez" value={formColl.montant} fcfaPreview step={250}
                      onChange={(n) => setFormColl((x) => ({ ...x, montant: n }))} />
                    <div className="rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                          <ListChecks className="h-3.5 w-3.5 text-[#1E4D2B]" /> Personnes qui paient cette collation — {formColl.membreIds.length} sélectionnée(s)
                        </p>
                        <div className="flex gap-1.5">
                          <Btn small tone="neutre" onClick={() => setFormColl((x) => ({ ...x, membreIds: p.roster.map((m) => m.id) }))}>Tout cocher</Btn>
                          <Btn small tone="neutre" onClick={() => setFormColl((x) => ({ ...x, membreIds: [] }))}>Tout décocher</Btn>
                        </div>
                      </div>
                      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                        {p.roster.map((m) => {
                          const coche = formColl.membreIds.includes(m.id);
                          return (
                            <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#1E4D2B]/8" : "hover:bg-white"}`}>
                              {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#1E4D2B]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={coche}
                                onChange={() => setFormColl((x) => ({ ...x, membreIds: coche ? x.membreIds.filter((id) => id !== m.id) : [...x.membreIds, m.id] }))}
                              />
                              <span className={`text-[12px] font-semibold ${coche ? "text-[#1E4D2B]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                              {estMembreApp(m) && (
                                <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Btn onClick={creerCollation}><CheckCircle2 className="h-4 w-4" /> Créer cette collation</Btn>
                    <Btn tone="neutre" onClick={() => setFormCollOpen(false)}>Annuler</Btn>
                  </div>
                </div>
              )}
              {collationsLocales.length === 0 && (
                <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#8A9288]">
                  Aucune collation pour l&apos;instant — cliquez sur « Ajouter une collation » pour créer la première. Ajoutez-en autant que la cantine en décide.
                </p>
              )}
              {collationsLocales.map((c) => (
                <div key={c.id} className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 shrink-0 text-[#8A6420]" />
                    <input
                      value={c.nom}
                      onChange={(e) => { setCollationsLocales((x) => x.map((y) => (y.id === c.id ? { ...y, nom: e.target.value } : y))); marquerSale("collations"); }}
                      aria-label="Nom de la collation"
                      className="min-w-0 flex-1 rounded-lg border border-[#E5DCC0] bg-white px-2.5 py-1.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
                    />
                    <button
                      type="button"
                      onClick={() => supprimerCollation(c)}
                      aria-label={`Supprimer ${c.nom}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <NumField label="Somme par personne et par réunion" note="Le montant démarre à 0 — c'est vous qui décidez" value={c.montant} fcfaPreview step={250}
                      onChange={(n) => { setCollationsLocales((x) => x.map((y) => (y.id === c.id ? { ...y, montant: n } : y))); marquerSale("collations"); }} />
                  </div>
                  <div className="mt-2 rounded-2xl border border-[#E5DCC0] bg-white p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
                        <ListChecks className="h-3.5 w-3.5 text-[#1E4D2B]" /> {c.membreIds.length} personne(s) doit(vent) payer {fmtMontant(c.montant)} par réunion
                      </p>
                      <div className="flex gap-1.5">
                        <Btn small tone="neutre" onClick={() => { setCollationsLocales((x) => x.map((y) => (y.id === c.id ? { ...y, membreIds: p.roster.map((m) => m.id) } : y))); marquerSale("collations"); }}>Tout cocher</Btn>
                        <Btn small tone="neutre" onClick={() => { setCollationsLocales((x) => x.map((y) => (y.id === c.id ? { ...y, membreIds: [] } : y))); marquerSale("collations"); }}>Tout décocher</Btn>
                      </div>
                    </div>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                      {p.roster.map((m) => {
                        const coche = c.membreIds.includes(m.id);
                        return (
                          <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#1E4D2B]/8" : "hover:bg-white"}`}>
                            {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#1E4D2B]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={coche}
                              onChange={() => { setCollationsLocales((x) => x.map((y) => (y.id === c.id ? { ...y, membreIds: coche ? y.membreIds.filter((id) => id !== m.id) : [...y.membreIds, m.id] } : y))); marquerSale("collations"); }}
                            />
                            <span className={`text-[12px] font-semibold ${coche ? "text-[#1E4D2B]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
                            {estMembreApp(m) && (
                              <span className="shrink-0 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Btn small onClick={() => validerCollation(c)}><CheckCircle2 className="h-3.5 w-3.5" /> Valider l&apos;attribution</Btn>
                    {c.valideLe && <P cls={OK_CLS}><Check className="h-3 w-3" /> Attribution validée — les personnes sont notifiées</P>}
                  </div>
                </div>
              ))}
              <PiedSection sale={!!sales.collations} onClick={enregistrerCollations} label="Enregistrer les collations" />
            </div>
          </Block>
        </>
      )}

      {/* ══════════════════ SECTION PRÊTS ══════════════════
       *  v12 (demande du président) — MASQUÉ : avaliste obligatoire, toute la
       *  section « Garanties acceptées pour un prêt » (salaire…), le vote des
       *  dossiers du président et la nature du prêt. AJOUTÉ : la règle de
       *  RECONDUCTION du capital non remboursé, avec l'évolution MENSUELLE. */}
      {p.sous === "prets" && (
        <Block
          title="Prêts"
          icon={<ShieldCheck className="h-4 w-4" />}
          note="Les règles communes d'abord (taux, plafond, durée, carence, co-signature), puis la règle de RECONDUCTION du capital non remboursé. Chaque chiffre démarre à 0."
        >
          <div className="space-y-2 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <NumField label="Taux mensuel des prêts" note="Règle commune (0 = à décider)" unite="% / mois" step={0.5} value={r.prets.tauxMensuel}
                onChange={(n) => majPrets({ tauxMensuel: n })} />
              <NumField label="Plafond d'un prêt" note="Somme maximale pouvant être accordée" value={r.prets.plafondFcfa} fcfaPreview step={25_000}
                onChange={(n) => majPrets({ plafondFcfa: n })} />
              <NumField label="Durée maximale de remboursement" unite="mois" value={r.prets.dureeMaxMois}
                onChange={(n) => majPrets({ dureeMaxMois: n })} />
              <NumField label="Ancienneté requise (carence)" note="Mois de cotisation avant le 1ᵉʳ prêt" unite="mois" value={r.prets.carenceMois}
                onChange={(n) => majPrets({ carenceMois: n })} />
            </div>
            <ToggleRow
              label="Co-signature du trésorier"
              note="Désactivée par défaut : activez pour exiger le visa du trésorier sur chaque accord"
              actif={r.prets.cosignTresorier}
              onToggle={() => majPrets({ cosignTresorier: !r.prets.cosignTresorier })}
            />

            {/* — RECONDUCTION DU CAPITAL NON REMBOURSÉ (v12, demande du
             *    président) : un prêt non remboursé à sa date constitue un
             *    NOUVEAU capital — et l'évolution se voit MOIS PAR MOIS. — */}
            <div className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-[#8A6420]"><TrendingUp className="h-3.5 w-3.5" /> Reconduction du capital non remboursé</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#5C6B60]">
                <strong className="text-[#1E4D2B]">La règle :</strong> si un prêt n’est pas remboursé après sa date (la durée maximale de remboursement ci-dessus), la somme due — capital + intérêts courus — constitue cette fois-ci un <strong className="text-[#1E4D2B]">NOUVEAU CAPITAL</strong> : c’est ce nouveau capital qui devient la nouvelle dette, et le pourcentage configuré est désormais calculé sur lui pendant une nouvelle période. Et ainsi de suite tant que ce n’est pas remboursé. Bien évidemment, quand bien même c’est sur plusieurs mois, l’évolution se voit <strong className="text-[#1E4D2B]">de façon mensuelle</strong> dans le calendrier de chaque prêt.
              </p>
              <p className="mt-1.5 rounded-xl bg-[#2A4A3A]/5 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
                <strong className="text-[#1E4D2B]">L’exemple du bureau :</strong> une personne prête 10 000 FCFA en janvier à 3 %/mois → en mars elle doit rembourser 10 900 (10 000 + 3 × 300). Si à mars elle n’a pas remboursé les 10 900, cette nouvelle somme devient le capital : les 3 % sont désormais calculés sur 10 900 pendant 3 nouveaux mois → juin : ≈ 11 881. Si après ce n’est toujours pas remboursé, le processus suit.
              </p>
              <div className="mt-2 space-y-2">
                <ToggleRow
                  label="Reconduire le capital non remboursé en nouveau prêt"
                  note={r.prets.reconductionCapital
                    ? `Active — tous les ${r.prets.periodeCapitalisationMois || "…"} mois, la somme due devient le nouveau capital et les intérêts repartent de là`
                    : "Désactivée — le prêt suit le calendrier normal et s’arrête à l’échéance"}
                  actif={r.prets.reconductionCapital}
                  onToggle={() => majPrets({ reconductionCapital: !r.prets.reconductionCapital, ...(!r.prets.reconductionCapital && r.prets.periodeCapitalisationMois === 0 ? { periodeCapitalisationMois: 3 } : {}) })}
                />
                <NumField
                  label="Période de reconduction — la nouvelle dette est recalculée tous les N mois"
                  note="Mois qui séparent chaque reconstitution du capital (l’exemple du bureau : 3 mois). 0 = jamais."
                  unite="mois"
                  value={r.prets.periodeCapitalisationMois}
                  onChange={(n) => majPrets({ periodeCapitalisationMois: n })}
                />
              </div>
              <ApercuReconductionPret
                taux={r.prets.tauxMensuel || TAUX_DEFAUT}
                periode={r.prets.reconductionCapital ? r.prets.periodeCapitalisationMois : 0}
                duree={r.prets.dureeMaxMois > 0 ? r.prets.dureeMaxMois : 3}
              />
            </div>
          </div>
          <PiedSection sale={!!sales.prets} onClick={() => enregistrer("prets", "Prêts")} label="Enregistrer les prêts" />
        </Block>
      )}

      {/* ══════════════════ SECTION SOLIDARITÉ ══════════════════ */}
      {p.sous === "solidarite" && (
        <Block
          title="Solidarité"
          icon={<HandHeart className="h-4 w-4" />}
          note="Choisissez d'abord la MÉTHODE de solidarité qui arrange la cantine — les champs propres à la méthode choisie apparaissent ensuite. Chaque chiffre démarre à 0."
        >
          <div className="space-y-2 p-4">
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="text-[11.5px] font-bold text-[#2B3530]">Méthode de solidarité — plusieurs méthodes possibles, choisissez celle qui arrange la cantine</p>
              <div role="radiogroup" aria-label="Méthode de solidarité" className="mt-2 space-y-1.5">
                {METHODES_SOLIDARITE.map((m) => {
                  const actif = r.solidarite.methode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      onClick={() => majSol({ methode: m.id })}
                      className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left transition-all ${actif ? "border-[#1E4D2B] bg-[#1E4D2B]/8" : "border-[#E5DCC0] bg-white hover:border-[#C89F62]/60"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-bold ${actif ? "text-[#1E4D2B]" : "text-[#2B3530]"}`}>{m.nom}</span>
                        {actif && <Check className="h-4 w-4 shrink-0 text-[#1E4D2B]" />}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{m.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {r.solidarite.methode === "caisse" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <NumField label="Cotisation de solidarité" note="Par membre et par mois — alimente la caisse" value={r.solidarite.cotisationMensuelle} fcfaPreview step={250}
                  onChange={(n) => majSol({ cotisationMensuelle: n })} />
                <NumField label="Aide maximale par événement" note="Plafond décaissable du bureau" value={r.solidarite.plafondAideFcfa} fcfaPreview step={5_000}
                  onChange={(n) => majSol({ plafondAideFcfa: n })} />
                <NumField label="Ancienneté requise" note="Mois avant droit à l'aide" unite="mois" value={r.solidarite.carenceMois}
                  onChange={(n) => majSol({ carenceMois: n })} />
                <NumField label="Délai de versement" note="Après l'accord du bureau" unite="jours" value={r.solidarite.delaiVersementJours}
                  onChange={(n) => majSol({ delaiVersementJours: n })} />
              </div>
            )}
            {r.solidarite.methode === "speciale" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <NumField label="Somme suggérée à chacun" note="Appel à contribution ponctuel" value={r.solidarite.montantSuggere} fcfaPreview step={1_000}
                  onChange={(n) => majSol({ montantSuggere: n })} />
                <NumField label="Délai de collecte" note="Après l'annonce de l'événement" unite="jours" value={r.solidarite.delaiCollecteJours}
                  onChange={(n) => majSol({ delaiCollecteJours: n })} />
              </div>
            )}
            {r.solidarite.methode === "mutualisation" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <NumField label="Part de chaque membre" note="Versée directement à la famille" value={r.solidarite.montantParMembre} fcfaPreview step={1_000}
                  onChange={(n) => majSol({ montantParMembre: n })} />
                <NumField label="Délai de collecte" note="Pour que chacun verse sa part" unite="jours" value={r.solidarite.delaiCollecteJours}
                  onChange={(n) => majSol({ delaiCollecteJours: n })} />
              </div>
            )}
            {r.solidarite.methode === "assurance" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <NumField label="Montant du fonds bloqué" note="Réservé aux sinistres" value={r.solidarite.montantFonds} fcfaPreview step={5_000}
                  onChange={(n) => majSol({ montantFonds: n })} />
                <NumField label="Cotisation d'entretien du fonds" note="Par membre et par mois" value={r.solidarite.cotisationEntretien} fcfaPreview step={250}
                  onChange={(n) => majSol({ cotisationEntretien: n })} />
              </div>
            )}
            {r.solidarite.methode === "nature" && (
              <p className="rounded-2xl border border-[#3D6B72]/30 bg-[#3D6B72]/8 px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3D6B72]">
                Aide en nature : aucune somme n&apos;est décaissée — le bureau organise la présence, la corvée, la main-d&apos;œuvre ou le transport. Aucun champ chiffré pour cette méthode.
              </p>
            )}
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="text-[11.5px] font-bold text-[#2B3530]">Événements couverts par la solidarité</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Tous désactivés par défaut — cochez ceux que la solidarité couvre.</p>
              <div className="mt-2 space-y-1.5">
                {(Object.keys(EVENTS_SOLIDAIRES_LABELS) as (keyof Reglement["solidarite"]["events"])[]).map((k) => (
                  <ToggleRow key={k} label={EVENTS_SOLIDAIRES_LABELS[k]} actif={r.solidarite.events[k]} onToggle={() => majEvent(k)} />
                ))}
              </div>
            </div>
            <Seg
              legende="Majorité du bureau pour approuver une aide (aucune par défaut)"
              value={r.solidarite.majority}
              onChange={(v) => majSol({ majority: v as Reglement["solidarite"]["majority"] })}
              options={[
                { v: "aucun", label: "Aucune" },
                { v: "moitie", label: MAJORITES_LABELS.moitie },
                { v: "troisquarts", label: MAJORITES_LABELS.troisquarts },
                { v: "unanime", label: MAJORITES_LABELS.unanime },
              ]}
            />
          </div>
          <PiedSection sale={!!sales.solidarite} onClick={() => enregistrer("solidarite", "Solidarité")} label="Enregistrer la solidarité" />
        </Block>
      )}

      {/* ══════════════════ SECTION ÉPARGNES — MIROIR DE L'ESPACE MEMBRE ══════════════════ */}
      {p.sous === "epargne" && (
        <Block
          title="Épargnes — la configuration de l'espace membre"
          icon={<PiggyBank className="h-4 w-4" />}
          note="Ce panneau est le MIROIR de « Mes épargnes » que vit chaque membre : le taux en vigueur (modifiable ou retirable — 3 %/mois par défaut), la manière de collecter les intérêts, le type d'épargne et les règles de dépôt/retrait. Le membre voit tout cela en lecture seule — c'est le bureau qui décide et peut changer à tout moment."
        >
          <div className="space-y-3 p-4">

            {/* — A. CE QUE VOIT LE MEMBRE : les 3 cartes de « Mes épargnes », en direct — */}
            <div className="rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider text-[#8A6420]"><Eye className="h-3.5 w-3.5" /> Ce que voit chaque membre dans « Mes épargnes » — en direct</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Taux en vigueur</p>
                  <p className="text-[22px] font-black leading-tight text-[#1E4D2B]">{tauxEpargneVigueur(r)} %<span className="text-[11px] font-bold text-[#8A9288]">/mois</span></p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[#8A9288]">
                    {r.epargne.tauxFixe
                      ? "Décision du bureau — remplace le défaut de la maison"
                      : `Taux par défaut de la maison (${TAUX_DEFAUT} %/mois) — le bureau ne l'a pas encore remplacé`}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Type d’épargne fixé par le bureau</p>
                  <p className="text-[13px] font-black text-[#2B3530]">{typeEpargne?.nom ?? "Aucun type défini — à fixer ci-dessous"}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[#8A9288]">{typeEpargne?.description ?? "Sans type, le membre voit « Aucun type défini — à fixer par le bureau » sur sa page."}</p>
                </div>
                <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Règles de dépôt & de retrait</p>
                  <p className="text-[13px] font-black text-[#2B3530]">Préavis {r.epargne.preavisJours} j · min. {fcfa(r.epargne.depotMinFcfa)}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-[#8A9288]">Retrait maximal : {r.epargne.retraitMaxMois} % du solde par mois{r.epargne.preavisJours > 0 ? " — annoncé à l'avance" : ""}.</p>
                </div>
              </div>
              <p className="mt-2 rounded-xl bg-[#2A4A3A]/5 px-3 py-2 text-[11px] leading-relaxed text-[#5C6B60]">
                <strong className="text-[#1E4D2B]">Comment fonctionne l'épargne pour un membre simple :</strong> il ne peut NI fixer le taux NI choisir le type — c'est le bureau (vous) qui décide de tout. Il dépose son épargne et la rattache à un mois réel (même un mois passé, s'il a oublié) ; chaque mois où son épargne est en place rapporte {tauxEpargneVigueur(r)} % — intérêts simples, crédités selon la manière choisie ci-dessous — et il suit tout dans le tableau « Mes intérêts mois par mois ». Pour retirer, il respecte le préavis ({r.epargne.preavisJours} jour(s)) et le plafond mensuel ({r.epargne.retraitMaxMois} % du solde).
              </p>
            </div>

            {/* — B. LE POURCENTAGE : modifier, retirer, rétablir — */}
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]"><Percent className="h-3.5 w-3.5" /> Le pourcentage des épargnes — modifiable, retirable</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">
                La maison démarre à {TAUX_DEFAUT} %/mois. Le bureau peut le REMPLACER par sa propre décision (tapez la valeur puis activez l'application), le RETIRER complètement (0 % — l'épargne ne rapporte plus rien) ou le RÉTABLIR au défaut.
              </p>
              <div className="mt-2">
                <NumField label="Taux mensuel de l'épargne" note={r.epargne.tauxFixe ? "Ce taux est la décision du bureau : il s'applique à tous les membres" : `Préparé mais non appliqué — tant que la décision n'est pas activée, le défaut (${TAUX_DEFAUT} %/mois) reste en vigueur`} unite="% / mois" step={0.5} value={r.epargne.tauxMensuel}
                  onChange={(n) => majEp({ tauxMensuel: n })} />
              </div>
              <div className="mt-2">
                <ToggleRow
                  label="Appliquer ce taux comme décision du bureau"
                  note={r.epargne.tauxFixe
                    ? `En vigueur : ${r.epargne.tauxMensuel} %/mois — remplace le défaut (${TAUX_DEFAUT} %) pour tous les membres`
                    : `Désactivé — le défaut de la maison (${TAUX_DEFAUT} %/mois) reste en vigueur`}
                  actif={r.epargne.tauxFixe}
                  onToggle={() => majEp({ tauxFixe: !r.epargne.tauxFixe })}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Btn small tone="rouge" onClick={() => majEp({ tauxMensuel: 0, tauxFixe: true })}><XCircle className="h-3.5 w-3.5" /> Retirer les intérêts (0 %)</Btn>
                <Btn small tone="neutre" onClick={() => majEp({ tauxMensuel: TAUX_DEFAUT, tauxFixe: false })}><RotateCcw className="h-3.5 w-3.5" /> Rétablir le défaut ({TAUX_DEFAUT} %/mois)</Btn>
              </div>
            </div>

            {/* — C. LA MANIÈRE DE COLLECTER LES INTÉRÊTS — */}
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]"><HandCoins className="h-3.5 w-3.5" /> Manière de collecter les intérêts</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">
                La base de calcul ne bouge pas (taux × épargne en place, chaque mois) — ce qui change, c'est QUAND et À QUI les intérêts sont remis. Le bureau peut changer cette manière en cours d'année : tous les membres en sont informés.
              </p>
              <div role="radiogroup" aria-label="Manière de collecter les intérêts" className="mt-2 space-y-1.5">
                {(Object.keys(COLLECTE_INTERETS_LABELS) as Reglement["epargne"]["collecteInterets"][]).map((k) => {
                  const actif = r.epargne.collecteInterets === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={actif}
                      onClick={() => majEp({ collecteInterets: k })}
                      className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left transition-all ${actif ? "border-[#1E4D2B] bg-[#1E4D2B]/8" : "border-[#E5DCC0] bg-white hover:border-[#C89F62]/60"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-bold ${actif ? "text-[#1E4D2B]" : "text-[#2B3530]"}`}>{COLLECTE_INTERETS_LABELS[k]}</span>
                        {actif && <Check className="h-4 w-4 shrink-0 text-[#1E4D2B]" />}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{COLLECTE_INTERETS_NOTES[k]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* — D. RÈGLES COMMUNES : préavis, minimums, plafond de retrait — */}
            <div className="grid gap-2 sm:grid-cols-2">
              <NumField label="Préavis de retrait" note="Jours de préavis avant tout retrait" unite="jours" value={r.epargne.preavisJours}
                onChange={(n) => majEp({ preavisJours: n })} />
              <NumField label="Dépôt minimum" value={r.epargne.depotMinFcfa} fcfaPreview step={1_000}
                onChange={(n) => majEp({ depotMinFcfa: n })} />
              <NumField label="Retrait maximal par mois" note="En pourcentage du solde" unite="% du solde" value={r.epargne.retraitMaxMois}
                onChange={(n) => majEp({ retraitMaxMois: n })} />
            </div>

            {/* — E. TYPE D'ÉPARGNE : le type choisi dévoile ses champs — */}
            <label className="block rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
              <span className="block text-[11.5px] font-bold text-[#2B3530]">Type d'épargne proposé par la cantine</span>
              <span className="mt-0.5 block text-[10.5px] text-[#8A9288]">Choisissez dans la liste : le type d&apos;intérêt et les champs propres à ce type apparaissent ensuite.</span>
              <select
                value={r.epargne.typeChoisi ?? ""}
                onChange={(e) => majEp({ typeChoisi: e.target.value || null })}
                className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
              >
                <option value="">— Aucun type choisi pour l&apos;instant —</option>
                {TYPES_EPARGNE_CATALOGUE.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </label>
            {typeEpargne && r.epargne.types[typeEpargne.id] && (
              <div className="rounded-2xl border-2 border-[#C89F62] bg-[#C89F62]/10 p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[12px] font-black text-[#8A6420]"><Sparkles className="h-3.5 w-3.5" /> Épargne choisie : {typeEpargne.nom}</p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A6420]/85">{typeEpargne.description}</p>
                <div className="mt-2 space-y-2">
                  <Seg
                    legende="Type d'intérêt de cette épargne"
                    value={r.epargne.types[typeEpargne.id].interet}
                    onChange={(v) => majTypeEpargne(typeEpargne.id, { interet: v as TypeEpargneConfig["interet"] })}
                    options={(Object.keys(INTERETS_EPARGNE_LABELS) as TypeEpargneConfig["interet"][]).map((k) => ({ v: k, label: INTERETS_EPARGNE_LABELS[k] }))}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <NumField label="Taux de cette épargne" unite="% / mois" step={0.5} value={r.epargne.types[typeEpargne.id].tauxMensuel}
                      onChange={(n) => majTypeEpargne(typeEpargne.id, { tauxMensuel: n })} />
                    <NumField label="Durée de blocage" note="0 = pas de blocage" unite="mois" value={r.epargne.types[typeEpargne.id].blocageMois}
                      onChange={(n) => majTypeEpargne(typeEpargne.id, { blocageMois: n })} />
                    <NumField label="Dépôt minimum de cette épargne" value={r.epargne.types[typeEpargne.id].depotMinFcfa} fcfaPreview step={1_000}
                      onChange={(n) => majTypeEpargne(typeEpargne.id, { depotMinFcfa: n })} />
                  </div>
                </div>
              </div>
            )}

            {/* — F. APERÇU EN DIRECT : le tableau d'intérêts TEL QUE LE MEMBRE le voit — */}
            <ApercuEpargneMembre taux={tauxEpargneVigueur(r)} collecte={r.epargne.collecteInterets} preavisJours={r.epargne.preavisJours} />
          </div>
          <PiedSection sale={!!sales.epargne} onClick={() => enregistrer("epargne", "Épargnes")} label="Enregistrer les épargnes" />
        </Block>
      )}

      {/* ══════════════════ SECTION PUBLICATION ══════════════════ */}
      {p.sous === "publication" && (
        <Block
          title="Publier le règlement aux membres"
          icon={<Send className="h-4 w-4" />}
          note={`Le règlement est en version ${r.version}. ${p.sale ? "Vos dernières modifications attendent la publication." : "Tout ce que vous avez réglé est déjà visible par les membres."} Une fois publié, le bloc « Règlement de la cantine » de la page Tontine affiche ces règles à tous — lecture seule.`}
        >
          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            <Btn onClick={p.onPublier} tone="vert"><Send className="h-4 w-4" /> Publier la version {p.sale ? r.version + 1 : r.version} aux membres</Btn>
            <Btn onClick={p.onReinitialiser} tone="neutre"><RotateCcw className="h-4 w-4" /> Réinitialiser</Btn>
          </div>
        </Block>
      )}
    </>
  );
}

/** Pied de section : le bouton « Enregistrer » propre à CHAQUE section du
 *  paramétrage — plus besoin de scroller jusqu'en bas pour trouver le geste. */
function PiedSection({ onClick, label, sale }: { onClick: () => void; label: string; sale: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <Btn onClick={onClick}><CheckCircle2 className="h-4 w-4" /> {label}</Btn>
      <p className="text-[10.5px] font-semibold leading-snug text-[#8A6420] sm:max-w-[55%] sm:text-right">
        {sale ? "Modifications en attente — cliquez sur « Enregistrer »." : "Section à jour — la « Publication » la rend visible aux membres."}
      </p>
    </div>
  );
}

/* ══════════════════════════ bloc commun ══════════════════════════ */

function Block({ title, icon, note, children }: { title: string; icon: ReactNode; note?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-[0_8px_30px_rgba(42,74,58,0.10)]">
      <div className="flex items-center gap-2 border-b border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E4D2B]/10 text-[#1E4D2B]">{icon}</span>
        <h2 className="fc-serif flex-1 text-[14.5px] font-bold text-[#1E4D2B]">{title}</h2>
      </div>
      {note && <p className="border-b border-[#E5DCC0] bg-[#FBF7EA]/60 px-4 py-2 text-[11.5px] leading-relaxed text-[#5C6B60]">{note}</p>}
      {children}
    </section>
  );
}
