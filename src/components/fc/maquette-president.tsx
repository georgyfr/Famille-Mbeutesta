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

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, BadgeCheck, Ban,
  BellRing, CalendarCheck, CalendarClock, Check, CheckCircle2, CheckSquare, ChevronRight,
  ClipboardList, Coins, FileText, Gavel, Hand, HandCoins, HandHeart,
  HeartHandshake, Hourglass, Landmark, Layers, ListChecks, Lock, MessageSquarePlus,
  Mic, Pause, Phone, PiggyBank, Play, Plus, ReceiptText, RotateCcw, Scale, ScrollText, Send,
  ShieldCheck, SlidersHorizontal, Sparkles, Square, Tag, ThumbsDown, ThumbsUp, Timer, TrendingUp,
  Trash2, UserCheck, UserPlus, Users, Vote, Wallet, XCircle,
} from "lucide-react";
import { FcCard } from "./ui";
import {
  MEMBRES_FICTIFS, MOIS_FR, TONTINE, saveMontants, TAUX_DEFAUT,
  detteParPersonne, potMensuel, secondSunday,
  type ReglagesTontine,
} from "./tontine-data";
import {
  ECHELONS_LABELS, ENCAISSEUR_LABELS, EVENTS_SOLIDAIRES_LABELS, GARANTIES_LABELS,
  INTERETS_EPARGNE_LABELS, INTERETS_PRET_LABELS, MAJORITES_LABELS, METHODES_SOLIDARITE,
  PAIEMENTS_LABELS, REGLEMENT_DEFAUT, SANCTIONS_LABELS, TYPES_EPARGNE_CATALOGUE,
  TYPES_PRET_CATALOGUE,
  loadReglement, publierReglement, saveReglement,
  type Reglement, type TypeEpargneConfig, type TypePretConfig,
} from "./reglement";
import {
  loadTypesCotisation, nouveauTypeCotisation, saveTypesCotisation,
  typeDuMembre, cotisationDuMembre, fmtMontant,
  type TypeCotisation,
} from "./cotisations-types";

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

/* — sous-onglets de PARAMÈTRES : chaque section tient sur UN écran, avec son
 *  propre bouton « Enregistrer » — plus besoin de scroller jusqu'en bas —
 *  et chaque section a SON URL (#president/parametres/cotisations…). — */
type SousParamKey = "cotisations" | "impayes" | "prets" | "solidarite" | "epargne" | "publication";
const SOUS_PARAMS: { key: SousParamKey; label: string; icon: ReactNode }[] = [
  { key: "cotisations", label: "Cotisations", icon: <Coins className="h-3.5 w-3.5" /> },
  { key: "impayes", label: "Impayés & recouvrement", icon: <BellRing className="h-3.5 w-3.5" /> },
  { key: "prets", label: "Prêts", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "solidarite", label: "Solidarité", icon: <HandHeart className="h-3.5 w-3.5" /> },
  { key: "epargne", label: "Épargne", icon: <PiggyBank className="h-3.5 w-3.5" /> },
  { key: "publication", label: "Publication", icon: <Send className="h-3.5 w-3.5" /> },
];
const SOUS_PARAM_KEYS = SOUS_PARAMS.map((s) => s.key);

/** Clés d'onglets autorisées dans l'URL — liens directs partageables :
 *  famille-mbeutetsa.pages.dev/#president/impayes, /prets, /parametres… */
const TAB_KEYS: TabKey[] = [
  "cockpit", "reunion", "impayes", "prets", "solidarite", "adhesions", "postes",
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
        if (tab === "parametres" && seg2 && (SOUS_PARAM_KEYS as string[]).includes(seg2)) {
          return { tab, sous: seg2 as SousParamKey };
        }
        return { tab, sous: null };
      }
    } else if (h === "#president" || h === "#president/") {
      return { tab: "cockpit", sous: null };
    }
  } catch {
    /* rien */
  }
  return { tab: "cockpit", sous: null };
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
type PretPerso = {
  id: string; membreId: string; montant: number; conditions: string;
  echeance: string; le: string; statut: "en_cours" | "rembourse";
};
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
type TabKey = "cockpit" | "reunion" | "impayes" | "prets" | "solidarite" | "adhesions" | "postes" | "journal"
  | "parametres" | "m-cotis" | "m-epargne" | "m-prets";

const NIVEAUX = ["Relance amiable", "Mise en demeure", "Convocation par le bureau", "Garants & avalistes"] as const;

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

/* ══════════════════════════ maquette ══════════════════════════ */

export function MaquettePresident() {
  /* — état global de la maquette — */
  const [tab, setTab] = useState<TabKey>("cockpit");
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
  /* — montants réels (TONTINE) : modifiés ici = modifiés pour TOUS les membres
   *    de la page Tontine (même moteur, saveMontants). — */
  const [montants, setMontants] = useState<ReglagesTontine>({ ...TONTINE });
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
  const [cotisDeclarees, setCotisDeclarees] = useState(7);
  const [historiqueCotis, setHistoriqueCotis] = useState<{ mois: string; paye: boolean }[]>([
    { mois: "Juillet", paye: true }, { mois: "Août", paye: true }, { mois: "Septembre", paye: true }, { mois: "Octobre", paye: true },
  ]);
  const [epargneSolde, setEpargneSolde] = useState(120_000);
  const [epargneOps, setEpargneOps] = useState<EpargneOp[]>([
    { id: "eo1", type: "depot", montant: 60_000, le: "14 sept.", note: "Épargne mensuelle", moisIdx: 8 },
    { id: "eo2", type: "depot", montant: 60_000, le: "12 oct.", note: "Épargne mensuelle + intérêts du mois", moisIdx: 9 },
  ]);
  /* Mois choisi pour le DÉPÔT D'ÉPARGNE en cours (0-11) — on peut avoir oublié
   * de déposer au mois d'avant : l'épargne est rattachée au mois réel, et les
   * intérêts sont calculés à partir de CE mois. null = pas encore hydraté. */
  const [epargneMoisChoisi, setEpargneMoisChoisi] = useState<number | null>(null);
  /* Mois choisi pour la DEMANDE DE PRÊT en cours (le prêt démarre ce mois). */
  const [pretMoisChoisi, setPretMoisChoisi] = useState<number | null>(null);
  const [moisCourantIdx, setMoisCourantIdx] = useState<number | null>(null);
  const [mesPretsForm, setMesPretsForm] = useState({ montant: "", motif: "", garanties: "", avalisteId: "" });
  const [pretsPersos, setPretsPersos] = useState<PretPerso[]>([
    { id: "pp1", membreId: "f07", montant: 50_000, conditions: "Sans intérêt — coup de pouce entre membres", echeance: "Après la levée du membre", le: "02 oct.", statut: "en_cours" },
  ]);
  const [pretPersoForm, setPretPersoForm] = useState({ membreId: "", montant: "", conditions: "", echeance: "Prochaine réunion" });

  /* — dérivés — */
  const roster = MEMBRES_FICTIFS;
  const parMembre = useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster]);
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
  const pot = potMensuel(roster.length);

  /* — date : calculée côté client uniquement (hydratation sûre) — */
  useEffect(() => {
    const t = setTimeout(() => {
      setReglement(loadReglement());
      setTypesCotis(loadTypesCotisation());
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
      setEpargneMoisChoisi(n.getMonth());
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
  const majMontants = (patch: Partial<ReglagesTontine>) => {
    saveMontants(patch); // applique aux règles réelles + persiste pour les membres
    setMontants({ ...TONTINE });
    const touched: string[] = [];
    if (patch.montantCotisation != null) touched.push(`cotisation ${fcfa(TONTINE.montantCotisation)}`);
    if (patch.montantCollation != null) touched.push(`collation ${fcfa(TONTINE.montantCollation)}`);
    if (patch.fraisAdhesion != null) touched.push(`adhésion ${fcfa(TONTINE.fraisAdhesion)}`);
    if (patch.penaliteRetard != null) touched.push(`pénalité de retard ${fcfa(TONTINE.penaliteRetard)}`);
    if (patch.penaliteAbsence != null) touched.push(`pénalité d'absence ${fcfa(TONTINE.penaliteAbsence)}`);
    if (touched.length > 0) journalAdd(`Montants réglés par le président : ${touched.join(" · ")} — visibles aussitôt par tous les membres.`, "Président (paramétrage)");
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
      roster.forEach((m) => { if (next[m.id] === "attente") next[m.id] = "present"; });
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

  /* — actions : impayés — */
  const relancer = (r: Retard) => {
    setRetards((prev) => prev.map((x) => (x.id === r.id ? { ...x, relances: x.relances + 1 } : x)));
    const m = parMembre.get(r.membreId);
    toast.success(`Relance envoyée à ${m?.name}`, { description: "Notification push + SMS — copie au trésorier et au censeur." });
    journalAdd(`Relance N°${r.relances + 1} envoyée à ${m?.name} — impayé de ${fcfa(r.montant)} (${r.mois}).`, "Président → membre");
  };
  const escalader = (r: Retard) => {
    if (r.niveau >= 3) return;
    const next = (r.niveau + 1) as Retard["niveau"];
    setRetards((prev) => prev.map((x) => (x.id === r.id ? { ...x, niveau: next } : x)));
    const m = parMembre.get(r.membreId);
    toast(`Escalade — ${NIVEAUX[next]}`, { description: `${m?.name} passe au niveau « ${NIVEAUX[next]} » — le bureau en est informé.` });
    journalAdd(`${m?.name} : recouvrement escaladé au niveau « ${NIVEAUX[next]} ».`);
  };
  const appliquerAmende = (r: Retard) => {
    setRetards((prev) => prev.map((x) => (x.id === r.id ? { ...x, amende: true } : x)));
    const m = parMembre.get(r.membreId);
    toast.success("Pénalité de retard appliquée", { description: `${fcfa(TONTINE.penaliteRetard)} inscrites par le trésorier — ${m?.name} en est notifié.` });
    journalAdd(`Pénalité de retard (${fcfa(TONTINE.penaliteRetard)}) appliquée à ${m?.name} — après passage au conseil.`);
  };
  const marquerRecouvre = (r: Retard) => {
    setRetards((prev) => prev.map((x) => (x.id === r.id ? { ...x, recouvre: true } : x)));
    const m = parMembre.get(r.membreId);
    toast.success(`Impayé de ${m?.name} soldé`, { description: "Le trésorier confirme l’encaissement — confiance rétablie." });
    journalAdd(`Impayé de ${m?.name} (${fcfa(r.montant)}) recouvré — soldé au journal de caisse.`);
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
    const total = TONTINE.montantCotisation + TONTINE.montantCollation;
    setCotisCeMois(true);
    setHistoriqueCotis((prev) => [...prev, { mois: moisCourant ?? "ce mois", paye: true }]);
    setCotisDeclarees((c) => Math.min(c + 1, roster.length));
    toast.success("Votre cotisation est enregistrée", { description: `${fcfa(total)} (cotisation + collation) — reçu immédiat. Le total du mois monte à ${Math.min(cotisDeclarees + 1, roster.length)}/${roster.length} pour le trésorier.` });
    journalAdd(`Le président a cotisé comme membre : ${fcfa(total)} pour ${moisCourant ?? "ce mois"} — mêmes règles que tous, aucune exception.`, "Président (membre)");
  };
  const epargnerMoi = (montant: number, moisIdx: number) => {
    if (!montant || montant <= 0) { toast.error("Indiquez un montant valide"); return; }
    if (moisCourantIdx != null && moisIdx > moisCourantIdx) { toast.error("On ne dépose pas à l'avance — choisissez le mois réel de l'épargne (en retard, c'est permis)"); return; }
    const solde = epargneSolde + montant;
    setEpargneSolde(solde);
    setEpargneOps((prev) => [{ id: nid(), type: "depot", montant, le: heure(), note: "Dépôt d’épargne", moisIdx }, ...prev]);
    const taux = reglement.epargne.tauxMensuel || TAUX_DEFAUT;
    const moisRestants = moisCourantIdx != null ? Math.max(1, moisCourantIdx - moisIdx + 1) : 1;
    const deja = Math.round(montant * (taux / 100) * moisRestants);
    toast.success(`${fcfa(montant)} déposés pour ${MOIS_FR[moisIdx]}`, { description: `Nouveau solde : ${fcfa(solde)} — à ${taux} %/mois, cette épargne rapporte déjà ≈ ${fcfa(deja)} d’intérêts (${moisRestants} mois), et les mois à venir s’ajoutent au tableau.` });
    journalAdd(`Épargne du président : +${fcfa(montant)} rattachée à ${MOIS_FR[moisIdx]} — solde ${fcfa(solde)} (taux ${taux} %/mois).`, "Président (membre)");
  };
  const retirerEpargneMoi = (montant: number, moisIdx: number) => {
    if (!montant || montant <= 0) { toast.error("Indiquez un montant valide"); return; }
    if (montant > epargneSolde) { toast.error(`Solde insuffisant — votre épargne est de ${fcfa(epargneSolde)}`); return; }
    if (moisCourantIdx != null && moisIdx > moisCourantIdx) { toast.error("Le retrait se rattache au mois réel (en retard, c'est permis)"); return; }
    const solde = epargneSolde - montant;
    setEpargneSolde(solde);
    setEpargneOps((prev) => [{ id: nid(), type: "retrait", montant, le: heure(), note: "Retrait sur demande", moisIdx }, ...prev]);
    toast.success(`${fcfa(montant)} retirés (${MOIS_FR[moisIdx]})`, { description: `Nouveau solde : ${fcfa(solde)} — le trésorier prépare le versement.` });
    journalAdd(`Retrait d’épargne du président : −${fcfa(montant)} rattaché à ${MOIS_FR[moisIdx]} — solde ${fcfa(solde)}.`, "Président (membre)");
  };
  const demanderPretMoi = () => {
    const montant = Number(mesPretsForm.montant);
    if (!montant || montant <= 0) { toast.error("Indiquez le montant souhaité"); return; }
    if (!mesPretsForm.motif.trim()) { toast.error("Indiquez le motif — comme pour tout membre"); return; }
    if (!mesPretsForm.garanties.trim()) { toast.error("Indiquez vos garanties"); return; }
    if (!mesPretsForm.avalisteId) { toast.error("Désignez un avaliste — règle identique pour tous"); return; }
    const moisIdx = pretMoisChoisi ?? moisCourantIdx ?? 0;
    setPrets((prev) => [{
      id: nid(), membreId: MOI, montant, motif: mesPretsForm.motif.trim(), garanties: mesPretsForm.garanties.trim(),
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
  const preterPerso = () => {
    const montant = Number(pretPersoForm.montant);
    if (!pretPersoForm.membreId) { toast.error("Choisissez le membre à qui vous prêtez"); return; }
    if (!montant || montant <= 0) { toast.error("Indiquez le montant prêté"); return; }
    if (!pretPersoForm.conditions.trim()) { toast.error("Précisez les conditions (intérêt, échéance…)"); return; }
    const m = parMembre.get(pretPersoForm.membreId);
    setPretsPersos((prev) => [{ id: nid(), membreId: pretPersoForm.membreId, montant, conditions: pretPersoForm.conditions.trim(), echeance: pretPersoForm.echeance, le: heure(), statut: "en_cours" as const }, ...prev]);
    setPretPersoForm({ membreId: "", montant: "", conditions: "", echeance: "Prochaine réunion" });
    toast.success(`Prêt personnel enregistré — ${fcfa(montant)} à ${m?.name}`, { description: "Inscrit au registre (consultable par le censeur en cas de litige) — rappel automatique à l’échéance." });
    journalAdd(`Prêt personnel du président : ${fcfa(montant)} à ${m?.name} (${pretPersoForm.conditions.trim()}), échéance ${pretPersoForm.echeance}.`, "Président (particulier)");
  };
  const solderPretPerso = (pp: PretPerso) => {
    setPretsPersos((prev) => prev.map((x) => (x.id === pp.id ? { ...x, statut: "rembourse" as const } : x)));
    const m = parMembre.get(pp.membreId);
    toast.success(`${m?.name} a remboursé ${fcfa(pp.montant)}`, { description: "L’inscription passe au registre des prêts soldés." });
    journalAdd(`Prêt personnel remboursé : ${m?.name} — ${fcfa(pp.montant)}.`, "Président (particulier)");
  };

  /* — badges des onglets — */
  const mesPrets = prets.filter((x) => x.president);
  const badges: Partial<Record<TabKey, number>> = {
    reunion: parolesAttente + oj.filter((x) => x.statut === "en_cours").length,
    impayes: nbRetards,
    prets: pretsAttente,
    solidarite: votesEnCours,
    adhesions: candidatsEnCours,
    journal: decisions.length,
    "m-cotis": cotisCeMois ? 0 : 1,
    "m-prets": mesPrets.filter((x) => x.statut === "en_attente").length,
  };

  const TABS: { key: TabKey; label: string; icon: ReactNode; membre?: boolean }[] = [
    { key: "cockpit", label: "Cockpit", icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: "reunion", label: "Réunion en direct", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "impayes", label: "Impayés & recouvrement", icon: <BellRing className="h-3.5 w-3.5" /> },
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
  /* La séance en direct est masquée (SEANCE_ACTIVE = false) — l'onglet
   * « Réunion en direct » disparaît jusqu'à réactivation. */
  const tabsVisibles = TABS.filter((t) => SEANCE_ACTIVE || t.key !== "reunion");
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
            ? t.membre ? "border-[#31565C] bg-[#3D6B72] text-white shadow-[0_6px_18px_rgba(61,107,114,0.45)]" : "border-[#153D22] bg-[#1E4D2B] text-white shadow-[0_6px_18px_rgba(30,77,43,0.45)]"
            : t.membre ? "border-[#9DB8A9] bg-white text-[#2E4237] hover:border-[#3D6B72] hover:bg-[#EAF2ED]" : "border-[#C4AE85] bg-white text-[#463C28] hover:border-[#C89F62] hover:bg-[#F7EFDB]"
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
      {/* ── bandeau maquette ── */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#C89F62]/50 bg-[#C89F62]/12 px-3 py-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[#8A6420]" />
        <p className="flex-1 text-[11.5px] font-semibold leading-snug text-[#7A5B2E]">
          MAQUETTE v4 — onglets grands et contrastés · Paramètres en 6 sections (une = un écran = un bouton Enregistrer) · types de cotisations mensuelles attribués aux membres (notification) · types de prêts, méthodes de solidarité, types d’épargne · tous les chiffres à 0 par défaut · données de démonstration, aucune action réelle.
        </p>
      </div>

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
            <P cls="border-white/25 bg-white/10 text-white"><AlertTriangle className="h-3 w-3" /> {nbRetards} impayés</P>
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
          <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6E7A70]">Gestion de la cantine</p>
          <div className="flex flex-wrap gap-2">{tabsGestion.map(renderTab)}</div>
          <p className="px-1 pb-2 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#3D6B72]">
            Espace membre — le président cotise, épargne et emprunte comme tous
          </p>
          <div className="flex flex-wrap gap-2">{tabsMembre.map(renderTab)}</div>
        </div>
      </nav>

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {tab === "cockpit" && (
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
        {tab === "impayes" && (
          <ImpayesSection
            retards={retards}
            parMembre={parMembre}
            regl={reglement}
            penRetard={TONTINE.penaliteRetard}
            onRelancer={relancer}
            onEscalader={escalader}
            onAmende={appliquerAmende}
            onRecouvre={marquerRecouvre}
          />
        )}
        {tab === "prets" && (
          <PretsSection
            prets={prets}
            parMembre={parMembre}
            roster={roster}
            regl={reglement}
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
            caisseSecours={caisseSecours}
            regl={reglement}
            onProposer={proposerAide}
            onVoter={voter}
            onDecaisser={decaisser}
          />
        )}
        {tab === "adhesions" && (
          <AdhesionsSection
            candidats={candidats}
            onCocher={cocherEtape}
            onConvoquer={convoquerVote}
            onPublier={publierAdmission}
            onDoc={docOfficiel}
          />
        )}
        {tab === "postes" && <PostesSection />}
        {tab === "journal" && <JournalSection journal={journal} />}
        {tab === "parametres" && (
          <ParametresSection
            regl={reglement}
            sale={reglSale}
            maj={majReglement}
            montants={montants}
            majMontants={majMontants}
            typesCotis={typesCotis}
            majTypesCotis={majTypesCotis}
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
            penRetard={TONTINE.penaliteRetard}
            onCotiser={cotiserMoi}
          />
        )}
        {tab === "m-epargne" && (
          <MesEpargnesSection
            solde={epargneSolde}
            ops={epargneOps}
            taux={reglement.epargne.tauxMensuel || TAUX_DEFAUT}
            preavisJours={reglement.epargne.preavisJours}
            typeEpargneNom={reglement.epargne.typeChoisi ? TYPES_EPARGNE_CATALOGUE.find((t) => t.id === reglement.epargne.typeChoisi)?.nom ?? null : null}
            moisChoisi={epargneMoisChoisi}
            setMoisChoisi={setEpargneMoisChoisi}
            moisCourantIdx={moisCourantIdx}
            onDepot={epargnerMoi}
            onRetrait={retirerEpargneMoi}
          />
        )}
        {tab === "m-prets" && (
          <MesPretsSection
            mesPrets={mesPrets}
            pretsPersos={pretsPersos}
            parMembre={parMembre}
            roster={roster}
            regl={reglement}
            form={mesPretsForm}
            setForm={setMesPretsForm}
            moisChoisi={pretMoisChoisi}
            setMoisChoisi={setPretMoisChoisi}
            moisCourantIdx={moisCourantIdx}
            onDemander={demanderPretMoi}
            formPerso={pretPersoForm}
            setFormPerso={setPretPersoForm}
            onPretre={preterPerso}
            onSolder={solderPretPerso}
          />
        )}
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[#8A9288]">
        Maquette interactive — les noms, montants et situations sont fictifs.
        <br />
        v4 : Paramètres réorganisés en 6 sous-sections à URL propre (#president/parametres/…) avec « Enregistrer » par section — cotisations multiples par type de membre (notification sur la page du membre), 10 natures de prêts, 5 méthodes de solidarité, 7 types d’épargne avec leur type d’intérêt, tous les chiffres à 0 par défaut.
        <br />
        v3 : le président paramètre la cantine (impayés, recouvrements, prêts, solidarité, épargne) et publie le règlement — visible par tous les membres.
        <br />
        v2 : le président est d’abord membre — il cotise, épargne, emprunte et prête comme tout le monde, sans aucun avantage.
      </p>
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
  if (p.nbRetards > 0) urgentes.push({ texte: `${p.nbRetards} retardataire(s) — ${fcfa(p.totalRetards)} d’impayés à recouvrer`, cta: "Relancer", tab: "impayes", cls: RJ_CLS, icon: <BellRing className="h-3.5 w-3.5" /> });
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

/* ══════════════════════════ IMPAYÉS & RECOUVREMENT ══════════════════════════ */

function ImpayesSection(p: {
  retards: Retard[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  penRetard: number;
  onRelancer: (r: Retard) => void; onEscalader: (r: Retard) => void;
  onAmende: (r: Retard) => void; onRecouvre: (r: Retard) => void;
}) {
  const actifs = p.retards.filter((r) => !r.recouvre);
  const soldes = p.retards.filter((r) => r.recouvre);
  const total = actifs.reduce((s, r) => s + r.montant, 0);
  return (
    <>
      <FcCard className="flex flex-wrap items-center gap-x-4 gap-y-1.5 p-4">
        <p className="flex items-center gap-2 text-[14px] font-black text-[#A5473D]"><AlertTriangle className="h-4.5 w-4.5" /> {fcfa(total)} d’impayés</p>
        <P cls={RJ_CLS}>{actifs.length} membre(s) en retard</P>
        <P cls={OR_CLS}>Pénalité de retard : {fcfa(p.penRetard)} / réunion</P>
      </FcCard>

      {actifs.length === 0 && (
        <FcCard className="p-5 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[#2F6B45]" />
          <p className="mt-2 text-[14px] font-bold text-[#2B3530]">Tous les impayés sont soldés — la confiance est intacte.</p>
        </FcCard>
      )}

      {actifs.map((r) => {
        const m = p.parMembre.get(r.membreId);
        return (
          <FcCard key={r.id} className="p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A5473D]/12 text-[13px] font-black text-[#A5473D]">
                {m?.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#2B3530]">{m?.name}</p>
                <p className="text-[11.5px] text-[#8A9288]">{m?.city} · {r.mois} · retard de {r.jours} jours</p>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-black text-[#A5473D]">{fcfa(r.montant)}</p>
                {r.amende && <p className="text-[10.5px] font-bold text-[#8A6420]">+ {fcfa(p.penRetard)} de pénalité</p>}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {[0, 1, 2, 3].map((n) => (
                <P key={n} cls={n < r.niveau ? TE_CLS : n === r.niveau ? RJ_CLS : undefined}>
                  {n < r.niveau ? <Check className="h-3 w-3" /> : null} {NIVEAUX[n]}
                </P>
              ))}
              <P>{r.relances} relance(s)</P>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn small tone="or" onClick={() => p.onRelancer(r)}><BellRing className="h-3.5 w-3.5" /> Relancer (push + SMS)</Btn>
              <Btn small tone="rouge" onClick={() => p.onEscalader(r)} disabled={r.niveau >= 3}><ArrowRight className="h-3.5 w-3.5" /> Escalader</Btn>
              <Btn small tone="neutre" onClick={() => p.onAmende(r)} disabled={r.amende}><Ban className="h-3.5 w-3.5" /> {r.amende ? "Pénalité appliquée" : `Appliquer ${fcfa(p.penRetard)}`}</Btn>
              <Btn small onClick={() => p.onRecouvre(r)}><CheckCircle2 className="h-3.5 w-3.5" /> Marquer payé</Btn>
              <Btn small tone="neutre" onClick={() => { toast(`Appel vers ${m?.name} (maquette)`); }}><Phone className="h-3.5 w-3.5" /> Appeler</Btn>
            </div>
          </FcCard>
        );
      })}

      {soldes.length > 0 && (
        <Block title="Recouvrés pendant cette session" icon={<CheckCircle2 className="h-4.5 w-4.5" />}>
          <ul className="divide-y divide-[#E5DCC0]">
            {soldes.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <p className="text-[13px] font-semibold text-[#5C6B60]">{p.parMembre.get(r.membreId)?.name} — {r.mois}</p>
                <P cls={OK_CLS}><Check className="h-3 w-3" /> {fcfa(r.montant)} soldé</P>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  );
}

/* ══════════════════════════ PRÊTS & GARANTIES ══════════════════════════ */

function PretsSection(p: {
  prets: PretDemande[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  roster: typeof MEMBRES_FICTIFS;
  taux: number;
  onMaj: (id: string, patch: Partial<PretDemande>) => void;
  onAccorder: (x: PretDemande) => void; onRefuser: (x: PretDemande) => void;
  onVoterBureau: (id: string, qui: "vice" | "tresorier" | "censeur", pour: boolean) => void;
}) {
  return (
    <>
      <FcCard className="p-4">
        <p className="text-[13px] leading-relaxed text-[#5C6B60]">
          <strong className="text-[#1E4D2B]">Supervision à deux :</strong> aucun prêt n’est décaissé sans votre validation <em>et</em> la co-signature du trésorier.
          Un avaliste fiable est obligatoire. Taux en vigueur : {p.taux} %/mois (décision du bureau).
        </p>
      </FcCard>

      {p.prets.map((pr) => {
        const m = p.parMembre.get(pr.membreId);
        const av = pr.avalisteId ? p.parMembre.get(pr.avalisteId) : null;
        return (
          <FcCard key={pr.id} className={`p-4 ${pr.statut === "refuse" ? "opacity-75" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-[#2B3530]">{m?.name}{pr.president ? " (vous — récusé)" : ""} — {fcfa(pr.montant)}</p>
                <p className="text-[12px] text-[#8A9288]">{pr.motif}</p>
              </div>
              {pr.statut === "en_attente" ? (pr.president
                ? <P cls={OR_CLS}><Vote className="h-3 w-3" /> Vote bureau 2/3</P>
                : <P cls={OR_CLS}><Hourglass className="h-3 w-3" /> À statuer</P>)
                : pr.statut === "accorde" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Accordé</P>
                  : <P cls={RJ_CLS}><XCircle className="h-3 w-3" /> Refusé</P>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <P cls={TE_CLS}><Landmark className="h-3 w-3" /> Garantie : {pr.garanties}</P>
              {av && <P cls={OK_CLS}><ShieldCheck className="h-3 w-3" /> Avaliste : {av.name}</P>}
              {pr.cosignTresorier && <P cls={OK_CLS}><Wallet className="h-3 w-3" /> Co-signé par le trésorier</P>}
            </div>

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
    </>
  );
}

/* ══════════════════════════ SOLIDARITÉ ══════════════════════════ */

const TYPE_EV: Record<EvVie["type"], { label: string; cls: string }> = {
  deuil: { label: "Deuil", cls: RJ_CLS },
  mariage: { label: "Mariage", cls: OR_CLS },
  naissance: { label: "Naissance", cls: OK_CLS },
  maladie: { label: "Maladie / hospitalisation", cls: TE_CLS },
};

function SolidariteSection(p: {
  evs: EvVie[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  caisseSecours: number;
  onProposer: (e: EvVie, montant: number) => void;
  onVoter: (e: EvVie, qui: keyof VoteBureau, pour: boolean) => void;
  onDecaisser: (e: EvVie) => void;
}) {
  const votants: { qui: keyof VoteBureau; nom: string; role: string }[] = [
    { qui: "vice", nom: "Marie-Louise Nguetsop", role: "Vice-présidente" },
    { qui: "secretariat", nom: "Françoise Mbeutetsa", role: "Secrétaire" },
    { qui: "tresorier", nom: "Émile Tchoumi", role: "Trésorier" },
    { qui: "censeur", nom: "Roger Ndoumbe", role: "Censeur" },
  ];
  return (
    <>
      <FcCard className="flex flex-wrap items-center justify-between gap-2 p-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Caisse de secours</p>
          <p className="text-[20px] font-black text-[#1E4D2B]">{fcfa(p.caisseSecours)}</p>
        </div>
        <P cls={TE_CLS}><HeartHandshake className="h-3 w-3" /> Mariages · naissances · deuils · maladies</P>
      </FcCard>

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

      <FcCard className="p-4">
        <p className="text-[13px] font-bold text-[#1E4D2B]">Visites de solidarité</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[#5C6B60]">
          À l’intégration : planning des visites (qui représente la cantine, quand, avec quel appui), délégations notifiées et frais suivis.
        </p>
      </FcCard>
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

function PostesSection() {
  const postes: { role: string; nom: string; accent: string; icon: ReactNode; outils: string[] }[] = [
    {
      role: "Vice-président", nom: "Marie-Louise Nguetsop", accent: "#2F6B45", icon: <Users className="h-4.5 w-4.5" />,
      outils: [
        "Checklist des préparatifs (lieu chez le bénéficiaire, collation, sièges, sonorisation) partagée en direct",
        "Délégation de séance : remplace le président en un clic (tous les outils basculent)",
        "Co-écrit l’ordre du jour avec le président avant chaque réunion",
        "Reçoit les suggestions des membres et les remonte au bureau",
      ],
    },
    {
      role: "Secrétaire", nom: "Françoise Mbeutetsa", accent: "#6E4B71", icon: <ScrollText className="h-4.5 w-4.5" />,
      outils: [
        "Éditeur de procès-verbal alimenté automatiquement par les décisions de la séance",
        "Liste de présence officielle : appels, excuses, absences — horodatés",
        "Co-règle le taux et les montants avec le président (double signature)",
        "Archives consultables par tous : PV, décisions, taux, montants",
      ],
    },
    {
      role: "Trésorier", nom: "Émile Tchoumi", accent: "#8A6420", icon: <Wallet className="h-4.5 w-4.5" />,
      outils: [
        "Encaissement en direct, membre par membre (reçu numérique immédiat)",
        "Remise au bénéficiaire avec accusé signé devant témoin",
        "Journal de caisse temps réel : cotisations, collations, pénalités, aides",
        "Co-signature des prêts + décaissement des aides de solidarité",
      ],
    },
    {
      role: "Commissaire aux comptes", nom: "Bernadette Kamga", accent: "#3D6B72", icon: <ClipboardList className="h-4.5 w-4.5" />,
      outils: [
        "Assistant d’audit trimestriel guidé : rapprochement reçus ↔ journal de caisse",
        "Contrôle des caisses (sociale, secours) avec relevés horodatés",
        "Alerte directe au président et au censeur en cas d’anomalie",
        "Rapport de l’assemblée générale généré à partir des audits",
      ],
    },
    {
      role: "Censeur", nom: "Roger Ndoumbe", accent: "#B85C33", icon: <Scale className="h-4.5 w-4.5" />,
      outils: [
        "Boîte confidentielle : les membres lui écrivent en privé",
        "Médiation des litiges — suivi jusqu’à résolution",
        "Contrôle d’équité : vérifie que tours, aides et sanctions suivent les mêmes règles pour tous",
        "Peut convoquer le bureau si une règle n’est plus respectée",
      ],
    },
    {
      role: "Membre simple", nom: "Les 4 autres membres", accent: "#5C6B60", icon: <UserCheck className="h-4.5 w-4.5" />,
      outils: [
        "« Mes cotisations » : déclarer, payer, suivre ses dettes et soldes",
        "Demander la parole en séance (apparaît dans la file du président)",
        "Déclarer un événement de vie (naissance, deuil…) pour l’aide de solidarité",
        "Se porter avaliste d’un prêt · proposer un candidat · signaler un problème",
      ],
    },
  ];
  return (
    <>
      <FcCard className="p-4">
        <p className="text-[13px] leading-relaxed text-[#5C6B60]">
          <strong className="text-[#1E4D2B]">Chaque acteur reçoit SA console opérationnelle</strong> — plus de « fiche descriptive ».
          Toutes les consoles se répondent : une décision du président notifie le secrétaire, un encaissement du trésorier
          met à jour le cockpit du président, un signalement du membre remonte au bureau entier.
        </p>
      </FcCard>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {postes.map((x) => (
          <FcCard key={x.role} className="overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ background: x.accent }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">{x.icon}</span>
              <div className="min-w-0">
                <p className="fc-serif truncate text-[14.5px] font-bold">{x.role}</p>
                <p className="truncate text-[11px] opacity-85">{x.nom}</p>
              </div>
            </div>
            <ul className="space-y-2 px-4 py-3">
              {x.outils.map((o) => (
                <li key={o} className="flex items-start gap-2 text-[12px] leading-relaxed text-[#5C6B60]">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: x.accent }} />
                  {o}
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-1.5 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-2 text-[10.5px] font-semibold text-[#8A9288]">
              <Lock className="h-3 w-3" /> Console opérationnelle — activée après validation de cette maquette
            </p>
          </FcCard>
        ))}
      </div>
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
  penRetard: number;
  onCotiser: () => void;
}) {
  /* Ma cotisation : celle fixée par le bureau pour MOI (type attribué), sinon
   * la cotisation de base — comme pour chaque membre de la cantine. */
  const monType = typeDuMembre(MOI, p.typesCotis);
  const maCotis = cotisationDuMembre(MOI, p.typesCotis, TONTINE.montantCotisation);
  const total = maCotis + TONTINE.montantCollation;
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
              <p className="text-[19px] font-black text-[#2B3530]">{fcfa(maCotis)} <span className="text-[12px] font-semibold text-[#8A9288]">+ {fcfa(TONTINE.montantCollation)} de collation</span></p>
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

function MesEpargnesSection(p: {
  solde: number; ops: EpargneOp[]; taux: number; preavisJours: number;
  /** Nom du type d'épargne choisi par le bureau (null = aucun). */
  typeEpargneNom: string | null;
  /** Mois choisi (0-11) pour le dépôt en cours + mois courant (0-11) — les
   *  mois FUTURS sont interdits, les mois PASSÉS permis (épargne oubliée). */
  moisChoisi: number | null;
  setMoisChoisi: (m: number) => void;
  moisCourantIdx: number | null;
  onDepot: (montant: number, moisIdx: number) => void; onRetrait: (montant: number, moisIdx: number) => void;
}) {
  const [montant, setMontant] = useState("");
  const v = Number(montant);
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
          Le taux est le même pour tous : c’est le bureau qui le fixe. Les intérêts sont crédités en fin de mois par le trésorier — le tableau ci-dessous les montre mois par mois, réalisés et projetés.
        </p>

        {/* — mois de l'épargne : on peut avoir OUBLIÉ de déposer un mois — */}
        <div className="mt-3 rounded-2xl border-2 border-[#C9B98A] bg-[#FFFDF6] p-3">
          <p className="text-[11.5px] font-bold text-[#2B3530]">Mois de l’épargne</p>
          <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">
            Ce n’est pas toujours le mois en cours : si vous avez oublié de déposer en août, rattachez ce dépôt à août — les intérêts sont calculés à partir de CE mois.
          </p>
          <select
            value={p.moisChoisi ?? ""}
            onChange={(e) => p.setMoisChoisi(Number(e.target.value))}
            aria-label="Mois auquel rattacher l'épargne"
            className="mt-2 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
          >
            {MOIS_FR.map((nom, m) => (
              <option key={nom} value={m} disabled={mCourant != null && m > mCourant}>
                {nom}{mCourant != null && m > mCourant ? " — à venir (interdit)" : m === mCourant ? " — mois en cours" : ""}
              </option>
            ))}
          </select>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[5_000, 10_000, 25_000].map((mt) => (
              <Btn key={mt} small tone="or" disabled={p.moisChoisi == null} onClick={() => p.moisChoisi != null && p.onDepot(mt, p.moisChoisi)}><ArrowDownToLine className="h-3.5 w-3.5" /> Déposer {fmt(mt)}</Btn>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <input
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Montant libre…"
              className="min-w-0 flex-1 rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
            />
            <Btn small disabled={!v || p.moisChoisi == null} onClick={() => { if (p.moisChoisi != null) { p.onDepot(v, p.moisChoisi); setMontant(""); } }}><ArrowDownToLine className="h-3.5 w-3.5" /> Épargner</Btn>
            <Btn small tone="neutre" disabled={!v || p.moisChoisi == null} onClick={() => { if (p.moisChoisi != null) { p.onRetrait(v, p.moisChoisi); setMontant(""); } }}><ArrowUpFromLine className="h-3.5 w-3.5" /> Retirer</Btn>
          </div>
        </div>
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
        note="Chaque dépôt et retrait passe par le trésorier — avec LE MOIS auquel il est rattaché : les calculs suivent.">
        <ul className="divide-y divide-[#E5DCC0]">
          {p.ops.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${o.type === "depot" ? "bg-[#2F6B45]/12 text-[#2F6B45]" : "bg-[#A5473D]/10 text-[#A5473D]"}`}>
                {o.type === "depot" ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold text-[#2B3530]">{o.note}</p>
                <p className="text-[10.5px] text-[#8A9288]">{MOIS_FR[Math.min(11, Math.max(0, o.moisIdx))]} · {o.le}</p>
              </div>
              <p className={`text-[13px] font-black ${o.type === "depot" ? "text-[#2F6B45]" : "text-[#A5473D]"}`}>
                {o.type === "depot" ? "+" : "−"}{fcfa(o.montant)}
              </p>
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}

/* ══════════════════════════ ESPACE MEMBRE — MES PRÊTS ══════════════════════════ */

/** Table du calendrier de remboursement — utilisée DEUX fois : pour l'aperçu
 *  EN DIRECT du formulaire (comme le tableau d'intérêts de l'épargne, les
 *  calculs apparaissent dès qu'on tape un montant) et sous chaque demande
 *  déposée. Mêmes colonnes, même ligne Total. */
function TableCalendrierPret(p: {
  lignes: { mois: string; annee: number; interet: number; mensu: number; reste: number }[];
  montant: number;
}) {
  const anneeCourante = new Date().getFullYear();
  const totalInterets = p.lignes.reduce((s, l) => s + l.interet, 0);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5DCC0]">
      <table className="w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="bg-[#1E4D2B] text-white">
            <th className="px-2.5 py-1.5 text-left font-black">Mois</th>
            <th className="px-2.5 py-1.5 text-right font-black">Intérêts</th>
            <th className="px-2.5 py-1.5 text-right font-black">Mensualité</th>
            <th className="px-2.5 py-1.5 text-right font-black">Reste dû</th>
          </tr>
        </thead>
        <tbody>
          {p.lignes.map((l) => (
            <tr key={l.mois + l.annee} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
              <td className="px-2.5 py-1.5 font-bold text-[#2B3530]">{l.mois} {l.annee > anneeCourante ? l.annee : ""}</td>
              <td className="px-2.5 py-1.5 text-right text-[#8A6420]">{fmt(l.interet)}</td>
              <td className="px-2.5 py-1.5 text-right font-bold text-[#2B3530]">{fmt(l.mensu)}</td>
              <td className="px-2.5 py-1.5 text-right font-semibold text-[#5C6B60]">{fmt(l.reste)}</td>
            </tr>
          ))}
          <tr className="bg-[#C89F62]/15">
            <td className="px-2.5 py-1.5 font-black text-[#2B2416]">Total</td>
            <td className="px-2.5 py-1.5 text-right font-black text-[#8A6420]">{fmt(totalInterets)}</td>
            <td className="px-2.5 py-1.5 text-right font-black text-[#2B2416]" colSpan={2}>{fcfa(p.montant + totalInterets)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function MesPretsSection(p: {
  mesPrets: PretDemande[];
  pretsPersos: PretPerso[];
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
  formPerso: { membreId: string; montant: string; conditions: string; echeance: string };
  setFormPerso: (f: { membreId: string; montant: string; conditions: string; echeance: string }) => void;
  onPretre: () => void;
  onSolder: (x: PretPerso) => void;
}) {
  const taux = p.regl.prets.tauxMensuel || TAUX_DEFAUT;
  const duree = p.regl.prets.dureeMaxMois > 0 ? p.regl.prets.dureeMaxMois : 6;
  const demandeMontant = Number(p.form.montant) || 0;
  /* Mois de départ du calendrier EN DIRECT : celui choisi dans le formulaire,
   * sinon le mois en cours — comme l'épargne, les calculs suivent le mois. */
  const moisDepart = p.moisChoisi ?? p.moisCourantIdx ?? 0;
  const mensualite = demandeMontant > 0
    ? Math.round((demandeMontant * (1 + (taux / 100) * duree)) / duree)
    : 0;

  /* — Calendrier de remboursement d'un prêt : mois par mois, à partir du mois
   *    auquel il est rattaché — intérêts, mensualité, reste dû. — */
  const calendrier = (montant: number, moisIdx: number) => {
    const interetMois = Math.round(montant * (taux / 100));
    const mensu = Math.round((montant + interetMois * duree) / duree);
    const annee = new Date().getFullYear();
    return Array.from({ length: duree }, (_, i) => {
      const idx = moisIdx + i;
      const reste = Math.max(0, montant + interetMois * duree - mensu * (i + 1));
      return {
        mois: MOIS_FR[idx % 12],
        annee: idx >= 12 ? annee + 1 : annee,
        interet: interetMois,
        mensu,
        reste,
      };
    });
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B]/10 text-[#1E4D2B]"><Landmark className="h-4 w-4" /></span>
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Emprunter à la caisse de la cantine — les mêmes règles pour vous.</strong>
            Motif, garanties, avaliste, taux {taux} %/mois. Et parce que c’est votre caisse,
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
            <p className="text-[11.5px] font-bold text-[#2B3530]">Calendrier de remboursement — mois par mois</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">
              Il démarre en {MOIS_FR[Math.min(11, Math.max(0, moisDepart))]} (le mois choisi ci-dessus) et court sur {duree} mois — intérêts de {fcfa(Math.round(demandeMontant * (taux / 100)))} par mois. S’il déborde sur l’année suivante, c’est marqué.
            </p>
            <div className="mt-2">
              <TableCalendrierPret lignes={calendrier(demandeMontant, moisDepart)} montant={demandeMontant} />
            </div>
          </div>
        )}
        <select value={p.form.motif.startsWith("*") ? p.form.motif.slice(1) : ""}
          onChange={(e) => p.setForm({ ...p.form, motif: e.target.value ? `*${e.target.value}` : p.form.motif.replace(/^\*/, "") })}
          aria-label="Nature du prêt demandé"
          className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none">
          <option value="">Nature du prêt (celle du règlement : {TYPES_PRET_CATALOGUE.find((t) => t.id === p.regl.prets.typeChoisi)?.nom ?? "libre"})…</option>
          {TYPES_PRET_CATALOGUE.map((t) => <option key={t.id} value={t.nom}>{t.nom}</option>)}
        </select>
        <input value={p.form.motif} onChange={(e) => p.setForm({ ...p.form, motif: e.target.value })} placeholder="Motif du prêt (comme pour tout membre)…" className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
        <input value={p.form.garanties} onChange={(e) => p.setForm({ ...p.form, garanties: e.target.value })} placeholder="Garanties proposées (fond de commerce, salaire…)…" className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
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
              const lignes = calendrier(pr.montant, moisIdx);
              return (
                <li key={pr.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-[#2B3530]">{fcfa(pr.montant)} — {pr.motif}</p>
                      <p className="text-[11.5px] text-[#8A9288]">
                        Rattaché à {MOIS_FR[moisIdx]} · garanties : {pr.garanties}{av ? ` · avaliste : ${av.name}` : ""}
                      </p>
                    </div>
                    {pr.statut === "en_attente" ? <P cls={OR_CLS}><Vote className="h-3 w-3" /> Vote bureau</P>
                      : pr.statut === "accorde" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Accordé</P>
                        : <P cls={RJ_CLS}><XCircle className="h-3 w-3" /> Refusé</P>}
                  </div>
                  {pr.statut !== "refuse" && (
                    <div className="mt-2.5">
                      <TableCalendrierPret lignes={lignes} montant={pr.montant} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Block>
      )}

      <Block title="Prêter mon argent personnel à un membre" icon={<HandCoins className="h-4.5 w-4.5" />}
        note="Vos prêts personnels sont hors caisse de la cantine — mais le registre les connaît : en cas de litige, le censeur s’appuie sur ces inscriptions. Rappel automatique à l’échéance.">
        <div className="grid grid-cols-1 gap-2 p-3.5 sm:grid-cols-2">
          <select value={p.formPerso.membreId} onChange={(e) => p.setFormPerso({ ...p.formPerso, membreId: e.target.value })} className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none">
            <option value="">Membre…</option>
            {p.roster.filter((x) => x.id !== MOI).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <input value={p.formPerso.montant} onChange={(e) => p.setFormPerso({ ...p.formPerso, montant: e.target.value.replace(/[^\d]/g, "") })} inputMode="numeric" placeholder="Montant (FCFA)" className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
          <input value={p.formPerso.conditions} onChange={(e) => p.setFormPerso({ ...p.formPerso, conditions: e.target.value })} placeholder="Conditions (sans intérêt, 2 %…)" className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
          <select value={p.formPerso.echeance} onChange={(e) => p.setFormPerso({ ...p.formPerso, echeance: e.target.value })} className="rounded-lg border border-[#C9B98A] bg-[#FFFDF6] px-2.5 py-2 text-[12.5px] text-[#2B3530] focus:outline-none">
            <option>Prochaine réunion</option>
            <option>Sous 1 mois</option>
            <option>Sous 3 mois</option>
            <option>Après la levée du membre</option>
          </select>
        </div>
        <div className="px-3.5 pb-3.5">
          <Btn small tone="teal" onClick={p.onPretre}><HandCoins className="h-3.5 w-3.5" /> Enregistrer le prêt personnel</Btn>
        </div>
        {p.pretsPersos.length > 0 && (
          <ul className="divide-y divide-[#E5DCC0] border-t border-[#E5DCC0]">
            {p.pretsPersos.map((pp) => {
              const m = p.parMembre.get(pp.membreId);
              return (
                <li key={pp.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3D6B72]/12 text-[11px] font-black text-[#3D6B72]">
                    {m?.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-[#2B3530]">{m?.name} — {fcfa(pp.montant)}</p>
                    <p className="truncate text-[10.5px] text-[#8A9288]">{pp.conditions} · échéance {pp.echeance}</p>
                  </div>
                  {pp.statut === "en_cours"
                    ? <Btn small tone="neutre" onClick={() => p.onSolder(pp)}><CheckCircle2 className="h-3.5 w-3.5" /> Remboursé</Btn>
                    : <P cls={OK_CLS}><Check className="h-3 w-3" /> Remboursé</P>}
                </li>
              );
            })}
          </ul>
        )}
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

function ParametresSection(p: {
  regl: Reglement;
  /** Brouillon modifié mais pas encore publié aux membres. */
  sale: boolean;
  maj: (patch: (r: Reglement) => Reglement) => void;
  montants: ReglagesTontine;
  majMontants: (patch: Partial<ReglagesTontine>) => void;
  typesCotis: TypeCotisation[];
  majTypesCotis: (next: TypeCotisation[], message?: string) => void;
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
  const [brouillonM, setBrouillonM] = useState<ReglagesTontine>({ ...p.montants });
  const [typesLocaux, setTypesLocaux] = useState<TypeCotisation[]>(p.typesCotis);
  const [sales, setSales] = useState<Record<string, boolean>>({});
  const marquerSale = (s: string) => setSales((x) => ({ ...x, [s]: true }));

  /* Resynchronisation quand le règlement change ailleurs (publication,
   * réinitialisation, enregistrement d'une autre section…) — pattern React
   * « ajuster l'état pendant le rendu quand une prop change ». */
  const [dernierRegl, setDernierRegl] = useState(p.regl);
  const [dernierMontants, setDernierMontants] = useState(p.montants);
  const [derniersTypes, setDerniersTypes] = useState(p.typesCotis);
  if (dernierRegl !== p.regl || dernierMontants !== p.montants || derniersTypes !== p.typesCotis) {
    setDernierRegl(p.regl);
    setDernierMontants(p.montants);
    setDerniersTypes(p.typesCotis);
    setBrouillon(p.regl);
    setBrouillonM({ ...p.montants });
    setTypesLocaux(p.typesCotis);
  }

  /* — sécurité : en quittant l'onglet Paramètres, ce qui n'a pas été
   *    enregistré par bouton est conservé comme brouillon du bureau (sans
   *    notification — la publication reste un geste séparé). — */
  const refs = useRef({ brouillon, brouillonM, typesLocaux, sales, maj: p.maj, majMontants: p.majMontants, majTypes: p.majTypesCotis });
  useEffect(() => {
    refs.current = { brouillon, brouillonM, typesLocaux, sales, maj: p.maj, majMontants: p.majMontants, majTypes: p.majTypesCotis };
  });
  useEffect(() => () => {
    const s = refs.current.sales;
    if (s.impayes || s.prets || s.solidarite || s.epargne) refs.current.maj(() => ({ ...refs.current.brouillon }));
    if (s.cotisations) {
      refs.current.majMontants({ ...refs.current.brouillonM });
      refs.current.majTypes(refs.current.typesLocaux);
    }
  }, []);

  const r = brouillon;
  const majImp = (patch: Partial<Reglement["impayes"]>) => { setBrouillon((x) => ({ ...x, impayes: { ...x.impayes, ...patch } })); marquerSale("impayes"); };
  const majEchelon = (cle: keyof Reglement["impayes"]["echelons"]) => { setBrouillon((x) => ({ ...x, impayes: { ...x.impayes, echelons: { ...x.impayes.echelons, [cle]: !x.impayes.echelons[cle] } } })); marquerSale("impayes"); };
  const majPaiement = (cle: keyof Reglement["impayes"]["paiements"]) => { setBrouillon((x) => ({ ...x, impayes: { ...x.impayes, paiements: { ...x.impayes.paiements, [cle]: !x.impayes.paiements[cle] } } })); marquerSale("impayes"); };
  const majPrets = (patch: Partial<Reglement["prets"]>) => { setBrouillon((x) => ({ ...x, prets: { ...x.prets, ...patch } })); marquerSale("prets"); };
  const majGarantie = (cle: keyof Reglement["prets"]["garanties"]) => { setBrouillon((x) => ({ ...x, prets: { ...x.prets, garanties: { ...x.prets.garanties, [cle]: !x.prets.garanties[cle] } } })); marquerSale("prets"); };
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
  const enregistrerMontants = () => {
    p.majMontants({ ...brouillonM });
    setSales((x) => ({ ...x, cotisations: false }));
    toast.success("Montants enregistrés", { description: "Ces montants sont aussitôt visibles par tous les membres dans la page Tontine." });
  };
  const enregistrerTypes = () => {
    p.majTypesCotis(typesLocaux);
    setSales((x) => ({ ...x, cotisations: false }));
    toast.success("Types de cotisations enregistrés", { description: "Validez l'attribution d'un type pour notifier les membres concernés." });
  };

  /* — types de cotisations : ajouter une somme, fixer le montant, sélectionner
   *    les membres, valider — les membres notifiés le voient aussitôt sur leur
   *    page avec une notification. — */
  const ajouterTypeCotis = () => {
    const t = nouveauTypeCotisation(`Cotisation ${typesLocaux.length + 1}`);
    setTypesLocaux((x) => [...x, t]);
    marquerSale("cotisations");
    toast("Somme de cotisation ajoutée", { description: "Fixez le montant (aujourd'hui à 0), sélectionnez les membres concernés, puis validez l'attribution." });
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

  const publieLe = r.publieLe
    ? (() => { try { return new Date(r.publieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); } catch { return null; } })()
    : null;

  const typePret = r.prets.typeChoisi ? TYPES_PRET_CATALOGUE.find((t) => t.id === r.prets.typeChoisi) ?? null : null;
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
                {sales[s.key] && <span className="h-2 w-2 shrink-0 rounded-full bg-[#C89F62]" aria-label="modifications non enregistrées" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════ SECTION COTISATIONS ══════════════════ */}
      {p.sous === "cotisations" && (
        <>
          <Block
            title="Montants de la cantine"
            icon={<Coins className="h-4 w-4" />}
            note="Tous les montants démarrent à 0 : c'est vous qui fixez chaque chiffre. Ces montants sont ceux de toute la cantine — chaque membre les voit dans sa page Tontine."
          >
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              <NumField label="Cotisation mensuelle de base" note="Pour les membres sans type particulier" value={brouillonM.montantCotisation} fcfaPreview
                onChange={(n) => { setBrouillonM({ ...brouillonM, montantCotisation: n }); marquerSale("cotisations"); }} step={500} />
              <NumField label="Collation" note="Par personne et par réunion" value={brouillonM.montantCollation} fcfaPreview
                onChange={(n) => { setBrouillonM({ ...brouillonM, montantCollation: n }); marquerSale("cotisations"); }} step={250} />
              <NumField label="Frais d'adhésion" note="Une seule fois — caisse sociale" value={brouillonM.fraisAdhesion} fcfaPreview
                onChange={(n) => { setBrouillonM({ ...brouillonM, fraisAdhesion: n }); marquerSale("cotisations"); }} step={500} />
              <NumField label="Pénalité de retard" note="Versée à la caisse sociale" value={brouillonM.penaliteRetard} fcfaPreview
                onChange={(n) => { setBrouillonM({ ...brouillonM, penaliteRetard: n }); marquerSale("cotisations"); }} step={100} />
              <NumField label="Pénalité d'absence non excusée" note="Versée à la caisse sociale" value={brouillonM.penaliteAbsence} fcfaPreview
                onChange={(n) => { setBrouillonM({ ...brouillonM, penaliteAbsence: n }); marquerSale("cotisations"); }} step={250} />
            </div>
            <PiedSection sale={!!sales.cotisations} onClick={enregistrerMontants} label="Enregistrer les montants" />
          </Block>

          <Block
            title="Types de cotisations mensuelles"
            icon={<Layers className="h-4 w-4" />}
            note="Tout le monde ne cotise pas la même somme. Ajoutez une somme (ex. 50 000 FCFA), sélectionnez les membres qui doivent cotiser cette somme, validez — ils la verront sur leur page avec une notification. Un membre non choisi reste sur la cotisation de base."
          >
            <div className="space-y-3 p-4">
              <Btn tone="or" onClick={ajouterTypeCotis}><Plus className="h-4 w-4" /> Ajouter une somme de cotisation mensuelle</Btn>
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
                        <Btn small tone="neutre" onClick={() => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: p.roster.map((m) => m.id) } : y))); marquerSale("cotisations"); }}>Tout cocher</Btn>
                        <Btn small tone="neutre" onClick={() => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: [] } : y))); marquerSale("cotisations"); }}>Tout décocher</Btn>
                      </div>
                    </div>
                    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-[#FBF7EA] p-2">
                      {p.roster.map((m) => {
                        const coche = t.membreIds.includes(m.id);
                        return (
                          <label key={m.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${coche ? "bg-[#1E4D2B]/8" : "hover:bg-white"}`}>
                            {coche ? <CheckSquare className="h-4 w-4 shrink-0 text-[#1E4D2B]" /> : <Square className="h-4 w-4 shrink-0 text-[#8A9288]" />}
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={coche}
                              onChange={() => { setTypesLocaux((x) => x.map((y) => (y.id === t.id ? { ...y, membreIds: coche ? y.membreIds.filter((id) => id !== m.id) : [...y.membreIds, m.id] } : y))); marquerSale("cotisations"); }}
                            />
                            <span className={`text-[12px] font-semibold ${coche ? "text-[#1E4D2B]" : "text-[#2B3530]"}`}>{m.name}{m.role !== "membre" ? " — bureau" : ""}</span>
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
        </>
      )}

      {/* ══════════════════ SECTION IMPAYÉS & RECOUVREMENT ══════════════════ */}
      {p.sous === "impayes" && (
        <Block
          title="Impayés & recouvrement"
          icon={<BellRing className="h-4 w-4" />}
          note="Tout démarre désactivé et à 0 : c'est le bureau qui décide comment les impayés sont traités, comment les recouvrements se font et qui encaisse."
        >
          <div className="space-y-2 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <NumField label="Délai de grâce" note="Jours avant la 1ʳᵉ relance (0 = à décider)" unite="jours" value={r.impayes.delaiGraceJours}
                onChange={(n) => majImp({ delaiGraceJours: n })} />
              <NumField label="Relances avant escalade" unite="relance(s)" value={r.impayes.relancesAvantEscalade}
                onChange={(n) => majImp({ relancesAvantEscalade: n })} />
              <NumField label="Délai entre deux étapes" note="Rythme de l'escalade" unite="jours" value={r.impayes.delaiEntreEtapesJours}
                onChange={(n) => majImp({ delaiEntreEtapesJours: n })} />
              <NumField label="Impayés consécutifs avant sanction" unite="impayé(s)" value={r.impayes.apresNImpayes}
                onChange={(n) => majImp({ apresNImpayes: n })} />
            </div>
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="text-[11.5px] font-bold text-[#2B3530]">Étapes de recouvrement décidées par le bureau</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Toutes désactivées par défaut — activez celles que le bureau a décidées, dans l&apos;ordre.</p>
              <div className="mt-2 space-y-1.5">
                {(Object.keys(ECHELONS_LABELS) as (keyof Reglement["impayes"]["echelons"])[]).map((k) => (
                  <ToggleRow key={k} label={ECHELONS_LABELS[k]} actif={r.impayes.echelons[k]} onToggle={() => majEchelon(k)} />
                ))}
              </div>
            </div>
            <ToggleRow
              label="Pénalité de retard automatique"
              note="Désactivée par défaut : le bureau décide si la pénalité s'applique d'office dès l'échelon choisi"
              actif={r.impayes.amendeAuto}
              onToggle={() => majImp({ amendeAuto: !r.impayes.amendeAuto })}
            />
            {r.impayes.amendeAuto && (
              <Seg
                legende="La pénalité automatique s'applique dès…"
                value={String(r.impayes.niveauAmende)}
                onChange={(v) => majImp({ niveauAmende: Number(v) as 1 | 2 | 3 })}
                options={[{ v: "1", label: "N°1 — relance" }, { v: "2", label: "N°2 — mise en demeure" }, { v: "3", label: "N°3 — convocation" }]}
              />
            )}
            <Seg
              legende="Sanction après les impayés (aucune par défaut)"
              value={r.impayes.sanction}
              onChange={(v) => majImp({ sanction: v as Reglement["impayes"]["sanction"] })}
              options={(Object.keys(SANCTIONS_LABELS) as Reglement["impayes"]["sanction"][]).map((k) => ({ v: k, label: SANCTIONS_LABELS[k] }))}
            />
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="text-[11.5px] font-bold text-[#2B3530]">Moyens de paiement acceptés pour les recouvrements</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Seules les espèces sont actives par défaut — activez les autres si la cantine les accepte.</p>
              <div className="mt-2 space-y-1.5">
                {(Object.keys(PAIEMENTS_LABELS) as (keyof Reglement["impayes"]["paiements"])[]).map((k) => (
                  <ToggleRow key={k} label={PAIEMENTS_LABELS[k]} actif={r.impayes.paiements[k]} onToggle={() => majPaiement(k)} />
                ))}
              </div>
            </div>
            <Seg
              legende="Qui encaisse les recouvrements (le trésorier par défaut)"
              value={r.impayes.encaisseur}
              onChange={(v) => majImp({ encaisseur: v as Reglement["impayes"]["encaisseur"] })}
              options={(Object.keys(ENCAISSEUR_LABELS) as Reglement["impayes"]["encaisseur"][]).map((k) => ({ v: k, label: ENCAISSEUR_LABELS[k] }))}
            />
          </div>
          <PiedSection sale={!!sales.impayes} onClick={() => enregistrer("impayes", "Impayés & recouvrement")} label="Enregistrer impayés & recouvrements" />
        </Block>
      )}

      {/* ══════════════════ SECTION PRÊTS & GARANTIES ══════════════════ */}
      {p.sous === "prets" && (
        <Block
          title="Prêts & garanties"
          icon={<ShieldCheck className="h-4 w-4" />}
          note="Les règles communes d'abord, puis la NATURE du prêt qui correspond à votre association : choisissez un type, ses champs propres apparaissent mis en valeur. Chaque chiffre démarre à 0."
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
              label="Avaliste obligatoire"
              note="Désactivé par défaut : activez si un membre fiable doit se porter garant"
              actif={r.prets.avalisteObligatoire}
              onToggle={() => majPrets({ avalisteObligatoire: !r.prets.avalisteObligatoire })}
            />
            {r.prets.avalisteObligatoire && (
              <Seg
                legende="Nombre d'avalistes exigés"
                value={String(r.prets.nbAvalistes)}
                onChange={(v) => majPrets({ nbAvalistes: Number(v) as 1 | 2 })}
                options={[{ v: "1", label: "1 avaliste" }, { v: "2", label: "2 avalistes" }]}
              />
            )}
            <ToggleRow
              label="Co-signature du trésorier"
              note="Désactivée par défaut : activez pour exiger le visa du trésorier sur chaque accord"
              actif={r.prets.cosignTresorier}
              onToggle={() => majPrets({ cosignTresorier: !r.prets.cosignTresorier })}
            />
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
              <p className="text-[11.5px] font-bold text-[#2B3530]">Garanties acceptées pour un prêt</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Toutes désactivées par défaut — activez celles que la caisse accepte.</p>
              <div className="mt-2 space-y-1.5">
                {(Object.keys(GARANTIES_LABELS) as (keyof Reglement["prets"]["garanties"])[]).map((k) => (
                  <ToggleRow key={k} label={GARANTIES_LABELS[k]} actif={r.prets.garanties[k]} onToggle={() => majGarantie(k)} />
                ))}
              </div>
            </div>
            <Seg
              legende="Vote des dossiers du président (récusation — il ne vote pas)"
              value={r.prets.majorityPresident}
              onChange={(v) => majPrets({ majorityPresident: v as Reglement["prets"]["majorityPresident"] })}
              options={[
                { v: "ok", label: "OK" },
                { v: "tiers", label: MAJORITES_LABELS.tiers },
                { v: "deuxtiers", label: MAJORITES_LABELS.deuxtiers },
                { v: "unanime", label: MAJORITES_LABELS.unanime },
              ]}
            />
            {/* — nature du prêt : le type choisi dévoile ses champs mis en valeur — */}
            <label className="block rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
              <span className="block text-[11.5px] font-bold text-[#2B3530]">Nature du prêt — le type qui correspond à votre association</span>
              <span className="mt-0.5 block text-[10.5px] text-[#8A9288]">Choisissez dans la liste : les champs propres à ce type apparaissent ensuite, mis en valeur.</span>
              <select
                value={r.prets.typeChoisi ?? ""}
                onChange={(e) => majPrets({ typeChoisi: e.target.value || null })}
                className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#1F5B3F]"
              >
                <option value="">— Aucun type choisi pour l&apos;instant —</option>
                {TYPES_PRET_CATALOGUE.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
              </select>
            </label>
            {typePret && r.prets.types[typePret.id] && (
              <div className="rounded-2xl border-2 border-[#C89F62] bg-[#C89F62]/10 p-3 shadow-sm">
                <p className="flex items-center gap-1.5 text-[12px] font-black text-[#8A6420]"><Sparkles className="h-3.5 w-3.5" /> Prêt choisi : {typePret.nom}</p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A6420]/85">{typePret.description}</p>
                <div className="mt-2 space-y-2">
                  <Seg
                    legende="Type d'intérêt de ce prêt"
                    value={r.prets.types[typePret.id].interet}
                    onChange={(v) => majTypePret(typePret.id, { interet: v as TypePretConfig["interet"] })}
                    options={(Object.keys(INTERETS_PRET_LABELS) as TypePretConfig["interet"][]).map((k) => ({ v: k, label: INTERETS_PRET_LABELS[k] }))}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <NumField label="Taux de ce prêt" unite="% / mois" step={0.5} value={r.prets.types[typePret.id].tauxMensuel}
                      onChange={(n) => majTypePret(typePret.id, { tauxMensuel: n })} />
                    <NumField label="Plafond de ce prêt" value={r.prets.types[typePret.id].plafondFcfa} fcfaPreview step={25_000}
                      onChange={(n) => majTypePret(typePret.id, { plafondFcfa: n })} />
                    <NumField label="Durée maximale de ce prêt" unite="mois" value={r.prets.types[typePret.id].dureeMaxMois}
                      onChange={(n) => majTypePret(typePret.id, { dureeMaxMois: n })} />
                  </div>
                  <Seg
                    legende="Avalistes exigés pour ce prêt"
                    value={String(r.prets.types[typePret.id].avalistes)}
                    onChange={(v) => majTypePret(typePret.id, { avalistes: Number(v) as 0 | 1 | 2 })}
                    options={[{ v: "0", label: "Aucun avaliste" }, { v: "1", label: "1 avaliste" }, { v: "2", label: "2 avalistes" }]}
                  />
                  <div className="rounded-2xl border border-[#C89F62]/40 bg-white p-3">
                    <p className="text-[11.5px] font-bold text-[#2B3530]">Garanties exigées pour ce prêt</p>
                    <div className="mt-2 space-y-1.5">
                      {(Object.keys(GARANTIES_LABELS) as (keyof Reglement["prets"]["garanties"])[]).map((k) => {
                        const actif = r.prets.types[typePret.id].garantiesExigees.includes(k);
                        return (
                          <ToggleRow key={k} label={GARANTIES_LABELS[k]} actif={actif}
                            onToggle={() => majTypePret(typePret.id, { garantiesExigees: actif ? r.prets.types[typePret.id].garantiesExigees.filter((g) => g !== k) : [...r.prets.types[typePret.id].garantiesExigees, k] })} />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <PiedSection sale={!!sales.prets} onClick={() => enregistrer("prets", "Prêts & garanties")} label="Enregistrer les prêts" />
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

      {/* ══════════════════ SECTION ÉPARGNE ══════════════════ */}
      {p.sous === "epargne" && (
        <Block
          title="Épargne"
          icon={<PiggyBank className="h-4 w-4" />}
          note="Les règles communes d'abord, puis le TYPE d'épargne : choisissez-le, et son type d'intérêt ainsi que ses propres champs apparaissent. Chaque chiffre démarre à 0."
        >
          <div className="space-y-2 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <NumField label="Taux mensuel de l'épargne" note="Intérêts crédités chaque mois (0 = à décider)" unite="% / mois" step={0.5} value={r.epargne.tauxMensuel}
                onChange={(n) => majEp({ tauxMensuel: n })} />
              <NumField label="Préavis de retrait" note="Jours de préavis avant tout retrait" unite="jours" value={r.epargne.preavisJours}
                onChange={(n) => majEp({ preavisJours: n })} />
              <NumField label="Dépôt minimum" value={r.epargne.depotMinFcfa} fcfaPreview step={1_000}
                onChange={(n) => majEp({ depotMinFcfa: n })} />
              <NumField label="Retrait maximal par mois" note="En pourcentage du solde" unite="% du solde" value={r.epargne.retraitMaxMois}
                onChange={(n) => majEp({ retraitMaxMois: n })} />
            </div>
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
          </div>
          <PiedSection sale={!!sales.epargne} onClick={() => enregistrer("epargne", "Épargne")} label="Enregistrer l'épargne" />
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
