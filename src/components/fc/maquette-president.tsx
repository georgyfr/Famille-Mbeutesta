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

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, BadgeCheck, Ban, BellRing, CalendarClock, Check,
  CheckCircle2, ChevronRight, ClipboardList, Coins, FileText, Gavel, Hand,
  HandHeart, HeartHandshake, Hourglass, Landmark, Lock, MessageSquarePlus,
  Mic, Pause, Phone, PiggyBank, Play, Scale, ScrollText, Send, ShieldCheck,
  Sparkles, ThumbsDown, ThumbsUp, Timer, UserCheck, UserPlus, Users, Vote,
  Wallet, XCircle,
} from "lucide-react";
import { FcCard } from "./ui";
import {
  MEMBRES_FICTIFS, MOIS_FR, TAUX_DEFAUT, TONTINE,
  detteParPersonne, potMensuel, secondSunday,
} from "./tontine-data";

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
};
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
type TabKey = "cockpit" | "reunion" | "impayes" | "prets" | "solidarite" | "adhesions" | "postes" | "journal";

const NIVEAUX = ["Relance amiable", "Mise en demeure", "Convocation par le bureau", "Garants & avalistes"] as const;

const SUJETS_PAROLE = [
  "Échange de tour avec une cousine de Bafoussam",
  "Retard de paiement — explication et délai demandé",
  "Proposition pour la caisse de secours",
  "Question sur le taux des épargnes",
  "Invitation d'un nouveau membre de la famille",
  "Lieu de la prochaine réunion",
];

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
  const [seance, setSeance] = useState<"fermee" | "ouverte" | "cloturee">("fermee");
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
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* — simulation : les membres demandent la parole pendant la séance — */
  useEffect(() => {
    if (seance !== "ouverte") return;
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
    if (!p.avalisteId) { toast.error("Désignez d’abord un avaliste fiable"); return; }
    if (!p.cosignTresorier) { toast.error("La co-signature du trésorier est requise (supervision à deux)"); return; }
    majPret(p.id, { statut: "accorde" });
    const m = parMembre.get(p.membreId);
    const av = parMembre.get(p.avalisteId);
    toast.success("Prêt accordé", { description: `${fcfa(p.montant)} à ${m?.name} — avaliste : ${av?.name}. Décaissement par le trésorier, au taux de ${TAUX_DEFAUT} %/mois.` });
    journalAdd(`Prêt de ${fcfa(p.montant)} accordé à ${m?.name} — avaliste ${av?.name}, co-signé par le trésorier, taux ${TAUX_DEFAUT} %/mois.`, "Président + Trésorier");
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

  /* — badges des onglets — */
  const badges: Partial<Record<TabKey, number>> = {
    reunion: parolesAttente + oj.filter((x) => x.statut === "en_cours").length,
    impayes: nbRetards,
    prets: pretsAttente,
    solidarite: votesEnCours,
    adhesions: candidatsEnCours,
    journal: decisions.length,
  };

  const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: "cockpit", label: "Cockpit", icon: <Gavel className="h-3.5 w-3.5" /> },
    { key: "reunion", label: "Réunion en direct", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "impayes", label: "Impayés & recouvrement", icon: <BellRing className="h-3.5 w-3.5" /> },
    { key: "prets", label: "Prêts & garanties", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: "solidarite", label: "Solidarité", icon: <HandHeart className="h-3.5 w-3.5" /> },
    { key: "adhesions", label: "Adhésions", icon: <UserPlus className="h-3.5 w-3.5" /> },
    { key: "postes", label: "Autres postes", icon: <Users className="h-3.5 w-3.5" /> },
    { key: "journal", label: "Journal des décisions", icon: <ScrollText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-10 pt-3 sm:px-4">
      {/* ── bandeau maquette ── */}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#C89F62]/50 bg-[#C89F62]/12 px-3 py-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[#8A6420]" />
        <p className="flex-1 text-[11.5px] font-semibold leading-snug text-[#7A5B2E]">
          MAQUETTE v1 à valider — données de démonstration, aucune action réelle.
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
            {seance === "ouverte" && <P cls="border-[#C89F62] bg-[#C89F62] text-[#2B2416]"><Timer className="h-3 w-3" /> Séance en cours</P>}
          </div>
        </div>
      </FcCard>

      {/* ── onglets ── */}
      <nav aria-label="Sections du poste de commandement" className="sticky top-0 z-20 -mx-3 mt-3 bg-[#F6EFE2]/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const actif = tab === t.key;
            const badge = badges[t.key] ?? 0;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-current={actif ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-bold transition-all ${
                  actif ? "border-transparent bg-[#1E4D2B] text-white shadow-md" : "border-[#E5DCC0] bg-[#FBF7EA] text-[#5C6B60] hover:border-[#C89F62]/50"
                }`}
              >
                {t.icon}
                {t.label}
                {badge > 0 && (
                  <span className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-black ${actif ? "bg-[#C89F62] text-[#2B2416]" : "bg-[#A5473D] text-white"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {tab === "cockpit" && (
          <CockpitSection
            aujourdhuiInfo={aujourdhuiInfo}
            cotisAttendues={roster.length}
            cotisDeclarees={7}
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
            onGo={setTab}
            onOuvrir={ouvrirSeance}
          />
        )}
        {tab === "reunion" && (
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
            taux={TAUX_DEFAUT}
            onMaj={majPret}
            onAccorder={accorderPret}
            onRefuser={refuserPret}
          />
        )}
        {tab === "solidarite" && (
          <SolidariteSection
            evs={evs}
            parMembre={parMembre}
            caisseSecours={caisseSecours}
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
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[#8A9288]">
        Maquette interactive — les noms, montants et situations sont fictifs.
        <br />
        Après votre validation, ces outils remplaceront la fiche actuelle de chaque acteur dans le projet Cloudflare.
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
  if (p.parolesAttente > 0) urgentes.push({ texte: `${p.parolesAttente} demande(s) de parole en attente`, cta: "Séance", tab: "reunion", cls: TE_CLS, icon: <Hand className="h-3.5 w-3.5" /> });

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
                <p className="text-[14px] font-bold text-[#2B3530]">{m?.name} — {fcfa(pr.montant)}</p>
                <p className="text-[12px] text-[#8A9288]">{pr.motif}</p>
              </div>
              {pr.statut === "en_attente" ? <P cls={OR_CLS}><Hourglass className="h-3 w-3" /> À statuer</P>
                : pr.statut === "accorde" ? <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Accordé</P>
                  : <P cls={RJ_CLS}><XCircle className="h-3 w-3" /> Refusé</P>}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <P cls={TE_CLS}><Landmark className="h-3 w-3" /> Garantie : {pr.garanties}</P>
              {av && <P cls={OK_CLS}><ShieldCheck className="h-3 w-3" /> Avaliste : {av.name}</P>}
              {pr.cosignTresorier && <P cls={OK_CLS}><Wallet className="h-3 w-3" /> Co-signé par le trésorier</P>}
            </div>

            {pr.statut === "en_attente" && (
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
