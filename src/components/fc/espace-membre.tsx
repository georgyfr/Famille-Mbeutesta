"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ESPACE MEMBRE (v26) — Famille.Mbeutetsa
//
// Demande de l'administrateur (Task 70) : « Regarde tout ce que nous avons
// fait. Peux-tu refaire intégralement l'espace des membres simples ? »
//
// AVANT : le membre simple n'avait qu'un tableau de bord mobile (6 modules
// « bientôt ») et une page Finances centrée sur le bureau. Pire : le
// secrétariat lui promettait de « CONFIRMER la réception de la convocation
// depuis sa page » — mais cette page n'existait nulle part. Aucun écran pour
// cotiser, demander un prêt, voir ses amendes, ses PV, la solidarité…
//
// MAINTENANT : une VÉRITABLE console dédiée, routée par hash (#membre/<onglet>),
// 15 onglets répartis en 3 SECTIONS colorées (même langage visuel que les
// consoles du bureau : boîtes teintées, badges qui disparaissent à l'ouverture,
// pastille flottante « Onglets »), agissant sur les MÊMES registres partagés
// que le président et le secrétariat — ce que le membre fait ici remonte
// instantanément dans leurs consoles, et inversement (listeners « storage »).
//
// LES 3 SECTIONS :
//   · MON ESPACE (sarcelle)   — accueil, cotisations & collations, épargnes,
//                               prêts & dettes, amendes & présences ;
//   · LA VIE DE LA TONTINE (or) — convocations (confirmation + justification
//                               TEXTE & VOCALE, la vraie cette fois), réunions
//                               & mon tour, PV & décisions, annuaire,
//                               solidarité ;
//   · MA VOIX & MON COMPTE (terracotta) — décisions à valider, signalements
//                               (motif + vocal), notifications, règlement,
//                               mon profil.
//
// IDENTITÉ : le membre connecté est reconnu par son compte (fc_uid → annuaire
// de l'application fc_demo_db_v2 → id « app-<uid> »), sinon par son nom, sinon
// l'aperçu de démonstration prend le visage de Patrick Talla (f07, membre
// simple). Aucune donnée n'est écrite dans les registres sans action du membre.
//
// HYDRATATION SÛRE : tout chargement localStorage/Date passe par setTimeout(0) ;
// jamais d'écriture de window.location.hash (pattern history.pushState du
// projet, règle React 19).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarCheck, CalendarClock, CalendarDays, CheckCircle2, ClipboardList, Coins, Coffee,
  Crown, FileText, Gavel, HandCoins, HandHeart, Landmark, Mail, MessageSquarePlus, Mic, PiggyBank,
  ReceiptText, ScrollText, Send, Square, Trash2, TrendingUp, User, UserCheck, Users, Wallet, X,
} from "lucide-react";
import { FcCard } from "./ui";
import {
  Block, Btn, BtnConfirme, EnteteConsole, KpiCard, NavOnglets, P,
  dateCourte, fcfa, fmt, heure, nid, useOngletsVus,
  OK_CLS, OR_CLS, RJ_CLS, TE_CLS, VI_CLS, toast,
} from "./maquette-ui";
import type { GroupeOnglets, OngletItem } from "./maquette-ui";
import {
  MEMBRES_FICTIFS, MOIS_FR, MOIS_FR_SHORT, ROLE_META, ROLES_BUREAU, TONTINE, buildRoster, dettePretAuMois,
  loadMontants, loadPrets, loadEpargnes, moisDuTour, saveEpargnes, savePrets, secondSunday,
  type Epargne, type Member, type Pret, type RoleKey,
} from "./tontine-data";
import { loadTypesCotisation, saveTypesCotisation, typeDuMembre, cotisationDuMembre, type TypeCotisation } from "./cotisations-types";
import { loadCollations, collationDuMembre, type Collation } from "./collations";
import {
  loadEpargnesReunion, saveEpargnesReunion, loadPretsReunion, savePretsReunion,
  interetsAttribution, type AttributionReunion,
} from "./registres-bureau";
import {
  ETATS_PRESENCE, derniersMoisKeys, labelMoisKey, loadAmendes, loadConvocations, loadDecisions,
  loadNotifs, loadParamsSecretaire, loadPresences, loadPVs, loadSeances, moisKeyOf, pushNotif,
  saveConvocations, saveNotifs, statsPresence,
  type Amende, type ConvocationV2, type DecisionJ, type HistoriquePresences, type NotifBureau,
  type PresenceEtat, type ReponseConvocation, type Seance,
} from "./secretaire-bureau";
import {
  DELAI_VALIDATION_JOURS, deposerSignalement, enAttenteMembre, loadDecisions as loadDecisionsTaux,
  loadSignalements, loadVousRole, membreValide, MOTIFS_SIGNALEMENT,
  saveDecisions as saveDecisionsTaux,
  dateCourte as dateCourteIso,
  type DecisionTaux, type MotifSignalement, type Signalement,
} from "./tontine-bureau";
import { GARANTIES_LABELS, loadReglement, type Reglement } from "./reglement";
import { loadMembresApplication } from "./membres-app";
import { loadPostes, posteDeMembre, POSTES_BUREAU, type PostesMap } from "./postes-bureau";
import { loadTypesSolidarite, loadVisitesSolidarite, type TypeSolidarite, type VisiteSolidarite } from "./solidarite-bureau";

/* ══════════════════════════════ identité & utilitaires ══════════════════════════════ */

/** Le membre du rendez-vous : un compte réel (app-<uid>) ou l'aperçu démo (f07). */
type Moi = {
  id: string;
  nom: string;
  phone: string;
  city: string;
  tour: number;
  role: RoleKey;
  /** true = compte réel reconnu ; false = aperçu de démonstration (f07). */
  connecte: boolean;
};

const DEMO_MOI: Moi = {
  id: "f07", nom: "Patrick Talla", phone: "+237 6 96 74 20 51", city: "Douala",
  tour: 7, role: "membre", connecte: false,
};

/** Nom normalisé pour les rapprochements (comme membres-app.ts). */
function nomCle(nom: string): string {
  return nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function lireJSON<T>(cle: string, demo: T): T {
  if (typeof window === "undefined") return demo;
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : demo;
  } catch {
    return demo;
  }
}

function ecrireJSON(cle: string, valeur: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota — la maquette continue en mémoire */
  }
}

const CLE_COTIS_MOIS = "fc_secretaire_cotis_mois_v1"; // même source que le secrétariat
const CLE_DEMANDES = "fc_prets_demandes_v1"; // même source que les dossiers du secrétariat
const CLE_CAISSE = "fc_solidarite_caisse_v1"; // même source que la solidarité

export type MouvementCotisMois = { cotisation: boolean; collation: boolean };

type DossierPret = {
  id: string; membreId: string; montant: number; motif: string; garanties: string;
  avalisteId: string | null; cosignTresorier: boolean;
  statut: "en_attente" | "accorde" | "refuse"; motifRefus: string;
  moisIdx?: number;
};

function chargerCotisMois(): Record<string, MouvementCotisMois> {
  const demo: Record<string, MouvementCotisMois> = {};
  for (const m of MEMBRES_FICTIFS) demo[m.id] = { cotisation: false, collation: false };
  return lireJSON<Record<string, MouvementCotisMois>>(CLE_COTIS_MOIS, demo);
}

function chargerDossiers(): DossierPret[] {
  const demo: DossierPret[] = [
    { id: "p1", membreId: "f08", montant: 150_000, motif: "Rentrée scolaire des enfants", garanties: "Fond de commerce au marché B", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
    { id: "p2", membreId: "f07", montant: 80_000, motif: "Soins médicaux de sa mère", garanties: "Rémunération mensuelle déclarée", avalisteId: "f01", cosignTresorier: false, statut: "en_attente", motifRefus: "" },
  ];
  const brut = lireJSON<DossierPret[] | null>(CLE_DEMANDES, null);
  if (!Array.isArray(brut)) return demo;
  return brut.filter((x) => x && typeof x?.id === "string" && typeof x?.membreId === "string");
}

/** Résout QUI est le membre : compte réel (fc_uid → annuaire), sinon nom,
 *  sinon l'aperçu de démonstration (Patrick Talla, membre simple). */
function resoudreMoi(): { moi: Moi; roster: Member[] } {
  const roster = [...MEMBRES_FICTIFS, ...loadMembresApplication()];
  try {
    const uid = window.localStorage.getItem("fc_uid");
    if (uid) {
      const m = roster.find((x) => x.id === `app-${uid}`);
      if (m) {
        return {
          moi: { id: m.id, nom: m.name, phone: m.phone, city: m.city, tour: m.tour, role: loadVousRole() ?? "membre", connecte: true },
          roster,
        };
      }
    }
  } catch { /* rien */ }
  return { moi: DEMO_MOI, roster };
}

/** Clés de mois → libellés des états de présence (couleurs maison). */
const COULEUR_PRESENCE: Record<PresenceEtat, string> = {
  present: OK_CLS,
  excuse: OR_CLS,
  absent: RJ_CLS,
  attente: "border-[#C9D2CB] bg-[#F3F1E9] text-[#8A9288]",
};

/* ══════════════════════════════ contexte transmis aux onglets ══════════════════════════════ */

export type CtxMembre = {
  moi: Moi;
  roster: Member[];
  postes: PostesMap;
  regl: Reglement;
  annee: number;
  moisCourantIdx: number;
  moisKey: string;
  cotisMois: Record<string, MouvementCotisMois>;
  majCotisMois: (next: Record<string, MouvementCotisMois>) => void;
  amendes: Amende[];
  convos: ConvocationV2[];
  majConvo: (c: ConvocationV2) => void;
  notifs: NotifBureau[];
  majNotifs: (next: NotifBureau[]) => void;
  epargnesWorkflow: Epargne[];
  majEpargnesWorkflow: (next: Epargne[]) => void;
  decisionsTaux: DecisionTaux[];
  majDecisionsTaux: (next: DecisionTaux[]) => void;
  tick: number;
  voirApp?: () => void;
};

/* ══════════════════════════════ enregistreur vocal (courts messages) ══════════════════════════════ */

/** Même gabarit que l'enregistreur du secrétariat : MediaRecorder → dataURL,
 *  messages courts (< ~30 s). Réutilisé par les justifications d'absence et
 *  les signalements. */
function RecorderVocal(p: { onResultat: (dataUrl: string | null) => void; accent: string }) {
  const [etat, setEtat] = useState<"idle" | "recording" | "done">("idle");
  const [duree, setDuree] = useState(0);
  const [audio, setAudio] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nettoyerTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const demarrer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        nettoyerTimer();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 600_000) {
          toast.error("Message vocal trop long", { description: "Restez sous ~30 secondes — l'application garde les messages courts en mémoire locale." });
          setEtat("idle");
          return;
        }
        const fr = new FileReader();
        fr.onload = () => {
          const url = String(fr.result || "");
          setAudio(url);
          setEtat("done");
          p.onResultat(url);
        };
        fr.readAsDataURL(blob);
      };
      recRef.current = rec;
      rec.start();
      setEtat("recording");
      setDuree(0);
      timerRef.current = setInterval(() => setDuree((d) => d + 1), 1000);
    } catch {
      toast.error("Micro indisponible", { description: "Autorisez le microphone ou utilisez la justification texte." });
    }
  };

  const arreter = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  };

  const effacer = () => {
    setAudio(null);
    setEtat("idle");
    p.onResultat(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {etat === "idle" && (
        <Btn tone="neutre" small onClick={demarrer}><Mic className="h-4 w-4" /> Enregistrer un message vocal</Btn>
      )}
      {etat === "recording" && (
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#A5473D] bg-[#A5473D]/10 px-3 py-1.5 text-[12px] font-bold text-[#A5473D]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#A5473D]" /> Enregistrement… {duree} s
          <button type="button" onClick={arreter} aria-label="Arrêter l'enregistrement" className="inline-flex items-center gap-1 rounded-full bg-[#A5473D] px-2.5 py-1 text-[11px] font-black text-white"><Square className="h-3 w-3" /> Arrêter</button>
        </span>
      )}
      {etat === "done" && audio && (
        <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#E5DCC0] bg-white px-3 py-1.5">
          <audio controls src={audio} className="h-8 max-w-[220px]" />
          <button type="button" onClick={effacer} aria-label="Supprimer le message vocal" className="rounded-full p-1.5 text-[#A5473D] hover:bg-[#A5473D]/10"><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════ onglets — clés & sections ══════════════════════════════ */

type TabKey =
  | "accueil" | "cotisations" | "epargnes" | "prets" | "amendes"
  | "convocations" | "reunions" | "pv" | "membres" | "solidarite"
  | "validations" | "signalements" | "notifications" | "reglement" | "profil";

const ONGLETS_MEMBRE: OngletItem<TabKey>[] = [
  { key: "accueil", label: "Accueil", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: "cotisations", label: "Mes cotisations", icon: <Wallet className="h-3.5 w-3.5" /> },
  { key: "epargnes", label: "Mes épargnes", icon: <PiggyBank className="h-3.5 w-3.5" /> },
  { key: "prets", label: "Mes prêts", icon: <HandCoins className="h-3.5 w-3.5" /> },
  { key: "amendes", label: "Amendes & présence", icon: <Gavel className="h-3.5 w-3.5" /> },
  { key: "convocations", label: "Convocations", icon: <Mail className="h-3.5 w-3.5" /> },
  { key: "reunions", label: "Réunions & mon tour", icon: <CalendarCheck className="h-3.5 w-3.5" /> },
  { key: "pv", label: "PV & décisions", icon: <ScrollText className="h-3.5 w-3.5" /> },
  { key: "membres", label: "Annuaire", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "solidarite", label: "Solidarité", icon: <HandHeart className="h-3.5 w-3.5" /> },
  { key: "validations", label: "À valider", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  { key: "signalements", label: "Mes signalements", icon: <MessageSquarePlus className="h-3.5 w-3.5" /> },
  { key: "notifications", label: "Notifications", icon: <ReceiptText className="h-3.5 w-3.5" /> },
  { key: "reglement", label: "Règlement", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "profil", label: "Mon profil", icon: <User className="h-3.5 w-3.5" /> },
];

const SECTIONS_MEMBRE: GroupeOnglets<TabKey>[] = [
  {
    label: "Mon espace",
    couleur: "#3D6B72",
    note: "Ma vie de membre : ce que je cotise, ce que j'épargne, ce que j'emprunte, ce que je dois.",
    onglets: ONGLETS_MEMBRE.slice(0, 5),
  },
  {
    label: "La vie de la Tontine",
    couleur: "#8A6420",
    note: "Les convocations, les réunions, les décisions du bureau, la famille et la solidarité.",
    onglets: ONGLETS_MEMBRE.slice(5, 10),
  },
  {
    label: "Ma voix & mon compte",
    couleur: "#A5473D",
    note: "Je valide les décisions du bureau, je signale, je suis les notifications et je gère mon profil.",
    onglets: ONGLETS_MEMBRE.slice(10),
  },
];

function tabFromHash(): TabKey {
  try {
    const h = (window.location.hash || "").toLowerCase();
    const m = /^#membre\/([a-z-]+)/.exec(h);
    if (m && ONGLETS_MEMBRE.some((o) => o.key === m[1])) return m[1] as TabKey;
  } catch { /* rien */ }
  return "accueil";
}

function goTab(t: TabKey): void {
  try {
    const h = (window.location.hash || "").toLowerCase();
    const cible = `#membre/${t}`;
    if (h !== cible) window.history.pushState(null, "", cible);
    else window.dispatchEvent(new HashChangeEvent("hashchange"));
  } catch { /* rien */ }
}

/* ══════════════════════════════ écran vide ══════════════════════════════ */

function Vide(p: { icon: ReactNode; texte: string; note?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-4 py-7 text-center">
      <span className="text-[#B8A87E]">{p.icon}</span>
      <p className="text-[13px] font-bold text-[#5C6B60]">{p.texte}</p>
      {p.note && <p className="max-w-md text-[11.5px] leading-snug text-[#8A9288]">{p.note}</p>}
    </div>
  );
}

/* ══════════════════════════════ ACCUEIL ══════════════════════════════ */

function MembreAccueil(p: { ctx: CtxMembre; aller: (t: TabKey) => void }): ReactNode {
  const { moi, roster, regl, moisCourantIdx, moisKey, cotisMois, convos, notifs, amendes } = p.ctx;
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  const [collations, setCollations] = useState<Collation[]>([]);
  const [presences, setPresences] = useState<HistoriquePresences>({});
  const [rachatAuto, setRachatAuto] = useState(false);
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [dossiers, setDossiers] = useState<DossierPret[]>([]);
  const [dettes, setDettes] = useState<Pret[]>([]);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTypesCotis(loadTypesCotisation());
      setCollations(loadCollations());
      setPresences(loadPresences());
      setRachatAuto(loadParamsSecretaire().presences.rachatAuto);
      setEpargnes(loadEpargnesReunion());
      setDossiers(chargerDossiers());
      setDettes(loadPrets());
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const tauxEpargne = regl.epargne.tauxFixe ? regl.epargne.tauxMensuel : 3;
  const maCotis = cotisationDuMembre(moi.id, typesCotis, TONTINE.montantCotisation);
  const mesCollations = collationDuMembre(moi.id, collations);
  const monMois = cotisMois[moi.id] ?? { cotisation: false, collation: false };
  const mesEpargnes = epargnes.filter((e) => e.membreId === moi.id);
  const soldeEpargne = mesEpargnes.reduce((s, e) => s + e.montant, 0);
  const interetsRealises = mesEpargnes.reduce((s, e) => {
    const it = interetsAttribution(e.montant, tauxEpargne, e.moisIdx, moisCourantIdx);
    return s + it.realise;
  }, 0);
  const mesDossiers = dossiers.filter((d) => d.membreId === moi.id);
  const dettesTotal = dettes
    .filter((x) => x.statut === "validée")
    .reduce((s, x) => s + (x.rembourseMois != null ? 0 : dettePretAuMois(x.capital, regl.prets.tauxMensuel || 3, x.month0, moisCourantIdx)), 0);
  const amendesDues = amendes.filter((a) => a.membreId === moi.id && a.statut === "due");
  const amendesTotal = amendesDues.reduce((s, a) => s + a.montant, 0);
  const convosMienne = convos.filter((c) => c.destinataires[moi.id]?.statut === "envoyee");
  const mesNotifs = notifs.filter((n) => (n.destinataire === moi.id || n.destinataire === "tous" || nomCle(n.destinataireNom) === nomCle(moi.nom)) && !n.lu);
  const stats = statsPresence(presences, moi.id, moisKey, rachatAuto);
  const prochainDimanche = secondSunday(p.ctx.annee, moisCourantIdx);
  const monMoisTour = moisDuTour(moi.tour);

  return (
    <>
      {/* — KPIs de ma vie de membre — */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <button type="button" onClick={() => p.aller("cotisations")} className="text-left">
          <KpiCard icon={<Wallet className="h-4 w-4" />} label="Ma cotisation du mois" value={fcfa(maCotis + mesCollations)}
            sub={monMois.cotisation ? "à jour — merci !" : "à cotiser"}
            accent={monMois.cotisation ? "#2F6B45" : "#8A6420"} />
        </button>
        <button type="button" onClick={() => p.aller("epargnes")} className="text-left">
          <KpiCard icon={<PiggyBank className="h-4 w-4" />} label="Mon épargne" value={fcfa(soldeEpargne)}
            sub={`+ ${fmt(interetsRealises)} d'intérêts réalisés`} accent="#3D6B72" />
        </button>
        <button type="button" onClick={() => p.aller("prets")} className="text-left">
          <KpiCard icon={<HandCoins className="h-4 w-4" />} label="Mes dettes & dossiers" value={fcfa(dettesTotal)}
            sub={`${mesDossiers.length} dossier(s) en instance`} accent="#B85C33" />
        </button>
        <button type="button" onClick={() => p.aller("amendes")} className="text-left">
          <KpiCard icon={<Gavel className="h-4 w-4" />} label="Mes amendes dues" value={amendesTotal > 0 ? fcfa(amendesTotal) : "0 FCFA"}
            sub={`absences consécutives : ${stats.absCons}`} accent={amendesTotal > 0 ? "#A5473D" : "#2F6B45"} />
        </button>
      </div>

      {/* — prochaine séance + mon tour — */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        <FcCard className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8A6420]/12 text-[#8A6420]"><CalendarClock className="h-4.5 w-4.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Prochaine séance</p>
              <p className="fc-serif text-[16px] font-bold text-[#2B3530]">{TONTINE.jourLabel} — {MOIS_FR[moisCourantIdx]} {p.ctx.annee}</p>
              <p className="mt-0.5 text-[11.5px] font-semibold text-[#8A6420]">Le {prochainDimanche} {MOIS_FR[moisCourantIdx]} — assiduité de rigueur : même le bénéficiaire cotise son taux.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {convosMienne.length > 0 ? (
                  <button type="button" onClick={() => p.aller("convocations")} className="inline-flex">
                    <P cls={RJ_CLS}><Mail className="h-3 w-3" /> {convosMienne.length} convocation(s) à répondre</P>
                  </button>
                ) : (
                  <P cls={OK_CLS}><CheckCircle2 className="h-3 w-3" /> Aucune convocation en attente</P>
                )}
                <P cls={TE_CLS}><Users className="h-3 w-3" /> Quorum : {regl.quorumMembres} membres</P>
              </div>
            </div>
          </div>
        </FcCard>
        <FcCard className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B]/12 text-[#1E4D2B]"><Crown className="h-4.5 w-4.5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Mon tour de bénéficiaire</p>
              <p className="fc-serif text-[16px] font-bold text-[#2B3530]">{monMoisTour.charAt(0).toUpperCase() + monMoisTour.slice(1)} — tour n°{moi.tour}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-[#5C6B60]">
                Le mois de mon tour, je reçois l&apos;addition des taux de TOUS les membres — et je cotise moi aussi, comme chacun.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <P cls={VI_CLS}><UserCheck className="h-3 w-3" /> Rôle : {ROLE_META[moi.role].short}</P>
                {stats.rachatApplique && <P cls={OK_CLS}><TrendingUp className="h-3 w-3" /> Rachat auto : {stats.rachatNb} absence(s) annulée(s)</P>}
              </div>
            </div>
          </div>
        </FcCard>
      </div>

      {/* — mes actions rapides — */}
      <Block title="Mes actions rapides" icon={<Send className="h-4.5 w-4.5" />} accent="#3D6B72"
        note="Tout ce que je fais ici rejoint les registres du bureau : la secrétaire et le président le voient aussitôt.">
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["cotisations", <Wallet key="w" className="h-4 w-4" />, "Cotiser", monMois.cotisation ? "à jour" : "à faire", monMois.cotisation ? OK_CLS : OR_CLS],
            ["convocations", <Mail key="m" className="h-4 w-4" />, "Répondre aux convocations", convosMienne.length > 0 ? `${convosMienne.length} en attente` : "rien", convosMienne.length > 0 ? RJ_CLS : OK_CLS],
            ["validations", <CheckCircle2 key="v" className="h-4 w-4" />, "Valider les décisions", "décisions du bureau", TE_CLS],
            ["signalements", <MessageSquarePlus key="s" className="h-4 w-4" />, "Signaler un problème", "motif + vocal", VI_CLS],
          ] as [TabKey, ReactNode, string, string, string][]).map(([tab, icon, titre, note, cls]) => (
            <button key={tab} type="button" onClick={() => p.aller(tab)}
              className="flex items-center gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] px-3.5 py-3 text-left transition-all hover:border-[#C89F62]/60 hover:bg-[#FBF7EA] active:scale-[0.98]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#3D6B72]/12 text-[#3D6B72]">{icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold leading-tight text-[#2B3530]">{titre}</span>
                <span className="mt-1 inline-flex"><P cls={cls}>{note}</P></span>
              </span>
            </button>
          ))}
        </div>
      </Block>

      {/* — dernières notifications — */}
      <Block title="Dernières notifications du bureau" icon={<ReceiptText className="h-4.5 w-4.5" />} accent="#A5473D"
        note={`Journal du membre — ${mesNotifs.length} non lue(s). L'onglet Notifications porte le journal complet.`}>
        {mesNotifs.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune notification non lue — vous êtes à jour.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mesNotifs.slice(0, 4).map((n) => (
              <li key={n.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#A5473D]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">{n.titre}</span>
                  <span className="block text-[11px] leading-snug text-[#8A9288]">{n.message}</span>
                </span>
                <span className="shrink-0 text-[10px] font-bold text-[#8A9288]">{n.le}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ MES COTISATIONS & COLLATIONS ══════════════════════════════ */

function MesCotisationsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, cotisMois, majCotisMois } = p.ctx;
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  const [collations, setCollations] = useState<Collation[]>([]);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTypesCotis(loadTypesCotisation());
      setCollations(loadCollations());
      loadMontants(); // applique la cotisation de base persistée à TONTINE
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const monType = typeDuMembre(moi.id, typesCotis);
  const maCotis = cotisationDuMembre(moi.id, typesCotis, TONTINE.montantCotisation);
  const mesCollations = collationDuMembre(moi.id, collations);
  const total = maCotis + mesCollations;
  const monMois = cotisMois[moi.id] ?? { cotisation: false, collation: false };
  const aJour = monMois.cotisation;
  const moisLabel = labelMoisKey(p.ctx.moisKey);

  /* — ELLE/IL CHOISIT son type de cotisation (règle de la maison : UNE seule) — */
  const choisirType = (id: string) => {
    const types = loadTypesCotisation().map((t) => ({
      ...t,
      membreIds: t.membreIds.filter((m) => m !== moi.id),
    }));
    if (id) {
      const idx = types.findIndex((t) => t.id === id);
      if (idx >= 0) types[idx] = { ...types[idx], membreIds: [...types[idx].membreIds, moi.id] };
    }
    saveTypesCotisation(types);
    setTypesCotis(types);
    const t = types.find((x) => x.id === id);
    toast.success("Votre type de cotisation est enregistré", {
      description: t
        ? `Vous cotiserez ${fcfa(t.montant)} par mois (« ${t.nom} ») — comme tout membre de ce type.`
        : `Vous revenez à la cotisation de base (${fcfa(TONTINE.montantCotisation)}/mois).`,
    });
  };

  const cotiser = () => {
    if (aJour) { toast("Votre cotisation du mois est déjà enregistrée"); return; }
    const next = { ...cotisMois, [moi.id]: { cotisation: true, collation: mesCollations > 0 } };
    majCotisMois(next);
    ecrireJSON(CLE_COTIS_MOIS, next);
    pushNotif({
      id: `cotis-membre:${moi.id}:${p.ctx.moisKey}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "rappel",
      titre: `Cotisation enregistrée — ${moi.nom}`,
      message: `${moi.nom} a enregistré sa cotisation du mois (${fcfa(total)}) depuis son Espace Membre — à encaisser et viser au registre.`,
    });
    toast.success("Votre cotisation est enregistrée", {
      description: `${fcfa(total)} — la secrétaire voit votre versement dans « Cotisations & collations » (même registre).`,
    });
  };

  return (
    <>
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-[#3D6B72] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Wallet className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">Je cotise comme tout le monde — aucun privilège</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Mêmes montants, mêmes pénalités, même ordre des tours. Ici je CHOISIS mon type de cotisation
              (une seule somme mensuelle), je cotise et ma part de collation suit.
            </p>
          </div>
        </div>
        <div className="p-4">
          <div className="rounded-2xl border-2 border-[#3D6B72]/40 bg-[#3D6B72]/8 px-3.5 py-3">
            <p className="text-[11.5px] font-black uppercase tracking-wide text-[#3D6B72]">Quel type de cotisation faites-vous ?</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-[#5C6B60]">
              Règle de la maison : un membre ne cotise qu&apos;UNE seule somme mensuelle — choisissez un type du bureau, ou restez à la cotisation de base.
            </p>
            <select
              value={monType?.id ?? ""}
              onChange={(e) => choisirType(e.target.value)}
              aria-label="Mon type de cotisation"
              className="mt-2 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#3D6B72]"
            >
              <option value="">Cotisation de base — {fcfa(TONTINE.montantCotisation)} / mois</option>
              {typesCotis.map((t) => (
                <option key={t.id} value={t.id}>{t.nom} — {fcfa(t.montant)} / mois</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3.5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma cotisation — {moisLabel}</p>
              <p className="text-[19px] font-black text-[#2B3530]">
                {fcfa(maCotis)}{mesCollations > 0 && <span className="text-[12px] font-semibold text-[#8A9288]"> + {fcfa(mesCollations)} de collation</span>}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#8A6420]">
                {monType ? `Type attribué : ${monType.nom}` : "Cotisation de base de la Tontine"}
              </p>
            </div>
            {aJour ? (
              <P cls={OK_CLS}><CheckCircle2 className="h-3.5 w-3.5" /> Cotisation à jour</P>
            ) : (
              <Btn tone="teal" onClick={cotiser}><Wallet className="h-4 w-4" /> Cotiser {fcfa(total)}</Btn>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma part de collation</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#2B3530]"><Coffee className="h-4 w-4 text-[#8A6420]" /> {fcfa(mesCollations)}</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Somme des collations où je suis désigné — la part de chaque membre, comme pour tous.</p>
            </div>
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Reçu de cotisation</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#2F6B45]"><ReceiptText className="h-4 w-4" /> Reçu remis par le trésorier</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Chaque versement est encaissé et inscrit au journal de caisse.</p>
            </div>
          </div>
        </div>
      </FcCard>

      <Block title="Mon historique du mois" icon={<CalendarCheck className="h-4.5 w-4.5" />} accent="#3D6B72"
        note="Mon encaissement apparaît dans la gestion du secrétariat, membre par membre — la même source, aucune double saisie.">
        <div className="flex flex-wrap gap-1.5 p-3.5">
          <P cls={aJour ? OK_CLS : OR_CLS}>
            {aJour ? <CheckCircle2 className="h-3 w-3" /> : <Coins className="h-3 w-3" />} {moisLabel} {aJour ? "— cotisé" : "— à cotiser"}
          </P>
          {mesCollations > 0 && (
            <P cls={monMois.collation ? OK_CLS : VI_CLS}><Coffee className="h-3 w-3" /> Collation {monMois.collation ? "encaissée" : `— ${fcfa(mesCollations)}`}</P>
          )}
          {monType?.valideLe && <P cls={TE_CLS}><CheckCircle2 className="h-3 w-3" /> Type validé par le bureau</P>}
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════════ MES ÉPARGNES ══════════════════════════════ */

function MesEpargnesTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, regl, moisCourantIdx } = p.ctx;
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [montant, setMontant] = useState("");
  const [moisChoisi, setMoisChoisi] = useState<number | null>(null);

  const taux = regl.epargne.tauxFixe ? regl.epargne.tauxMensuel : 3;

  useEffect(() => {
    const t0 = setTimeout(() => {
      setEpargnes(loadEpargnesReunion());
      setMoisChoisi(moisCourantIdx);
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick, moisCourantIdx]);

  const mes = useMemo(() => epargnes.filter((e) => e.membreId === moi.id).sort((a, b) => a.moisIdx - b.moisIdx), [epargnes, moi.id]);
  const solde = mes.reduce((s, e) => s + e.montant, 0);

  const lignes = useMemo(() => {
    const parMois: number[] = Array.from({ length: 12 }, () => 0);
    mes.forEach((e) => { parMois[Math.min(11, Math.max(0, e.moisIdx))] += e.montant; });
    type Ligne = { mois: string; m: number; depot: number; enPlace: number; interet: number; cumul: number; avenir: boolean; courant: boolean };
    return MOIS_FR.reduce<Ligne[]>((acc, nom, m) => {
      const prec = acc[acc.length - 1];
      const enPlace = (prec?.enPlace ?? 0) + parMois[m];
      const interet = Math.round(enPlace * (taux / 100));
      const avenir = moisCourantIdx != null && m > moisCourantIdx;
      acc.push({ mois: nom, m, depot: parMois[m], enPlace, interet, cumul: (prec?.cumul ?? 0) + (avenir ? 0 : interet), avenir, courant: m === moisCourantIdx });
      return acc;
    }, []);
  }, [mes, taux, moisCourantIdx]);
  const projection = lignes.reduce((s, l) => s + l.interet, 0);

  const mAttribuer = () => {
    const n = Number(montant);
    if (!n || n <= 0) { toast.error("Indiquez la somme de votre épargne"); return; }
    const mi = moisChoisi ?? moisCourantIdx ?? 0;
    const next: AttributionReunion[] = [...epargnes, { id: nid(), membreId: moi.id, montant: n, moisIdx: Math.min(11, Math.max(0, mi)) }];
    setEpargnes(next);
    saveEpargnesReunion(next);
    setMontant("");
    pushNotif({
      id: `epargne-membre:${next[next.length - 1].id}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "visa",
      titre: `Épargne inscrite — ${moi.nom}`,
      message: `${moi.nom} a inscrit ${fcfa(n)} d'épargne (${MOIS_FR[Math.min(11, Math.max(0, mi))]}) depuis son Espace Membre — à viser au registre.`,
    });
    toast.success("Votre épargne est inscrite au registre du bureau", {
      description: `${fcfa(n)} rattaché à ${MOIS_FR[Math.min(11, Math.max(0, mi))]} — visible aussi dans les registres du président et du secrétariat.`,
    });
  };

  const retirerVersement = (id: string) => {
    const e = epargnes.find((x) => x.id === id);
    if (!e) return;
    const next = epargnes.filter((x) => x.id !== id);
    setEpargnes(next);
    saveEpargnesReunion(next);
    toast.success("Versement retiré du registre", { description: `${fcfa(e.montant)} (${MOIS_FR[Math.min(11, Math.max(0, e.moisIdx))]}) — le registre partagé est mis à jour.` });
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Mon épargne personnelle</p>
            <p className="text-[26px] font-black leading-none text-[#1E4D2B]">{fcfa(solde)}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8A9288]">{mes.length} versement(s) au registre du bureau</p>
          </div>
          <P cls={TE_CLS}><Coins className="h-3 w-3" /> Rémunérée à {taux} %/mois — comme chaque membre</P>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-[#3D6B72]/35 bg-[#3D6B72]/8 p-3.5">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#3D6B72]">M&apos;attribuer une épargne</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Somme (FCFA)"
              aria-label="Somme de mon épargne en FCFA"
              className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
            />
            <select
              value={moisChoisi ?? ""}
              onChange={(e) => setMoisChoisi(Number(e.target.value))}
              aria-label="Mois réel de mon épargne"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#3D6B72]"
            >
              {MOIS_FR.map((nom, mi) => (
                <option key={nom} value={mi}>
                  {nom}{moisCourantIdx != null && mi === moisCourantIdx ? " — mois en cours" : moisCourantIdx != null && mi > moisCourantIdx ? " — à venir" : ""}
                </option>
              ))}
            </select>
            <Btn tone="teal" onClick={mAttribuer}><PiggyBank className="h-4 w-4" /> Épargner {montant ? fcfa(Number(montant)) : ""}</Btn>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-[#5C6B60]">
            Intérêts au taux en vigueur ({taux} %/mois) — collecte : {COLLECTE_COURTE(regl)}. Le registre est partagé : président et secrétariat le voient aussitôt.
          </p>
        </div>
      </FcCard>

      <Block title="Mes intérêts mois par mois" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="#3D6B72"
        note={`Chaque mois où votre épargne est en place rapporte ${taux} % : intérêts réalisés jusqu'au mois en cours, projection pour les mois à venir.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#3D6B72] text-white">
                <th className="px-2.5 py-2 text-left font-black">Mois</th>
                <th className="px-2.5 py-2 text-right font-black">Versements</th>
                <th className="px-2.5 py-2 text-right font-black">En place</th>
                <th className="px-2.5 py-2 text-right font-black">Intérêts</th>
                <th className="px-2.5 py-2 text-right font-black">Cumulés</th>
              </tr>
            </thead>
            <tbody>
              {lignes.filter((l) => l.depot > 0 || l.enPlace > 0 || !l.avenir).map((l) => (
                <tr key={l.mois} className={`border-b border-[#E5DCC0] ${l.avenir ? "bg-[#FBF7EA] text-[#8A9288]" : "bg-[#FFFDF6]"}`}>
                  <td className="px-2.5 py-2 font-bold">
                    {l.mois}
                    {l.courant && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">en cours</span>}
                    {l.avenir && <span className="ml-1.5 rounded-full border border-[#C9D2CB] px-1.5 py-0.5 text-[9px] font-black text-[#8A9288]">à venir</span>}
                  </td>
                  <td className="px-2.5 py-2 text-right font-semibold">{l.depot > 0 ? `+${fmt(l.depot)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right">{l.enPlace > 0 ? fcfa(l.enPlace) : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{l.enPlace > 0 ? `+${fmt(l.interet)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fcfa(l.cumul)}</td>
                </tr>
              ))}
              <tr className="bg-[#C89F62]/15">
                <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={3}>Projection au 31 décembre</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">+{fmt(projection)}</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fcfa(projection)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="Mes versements — registre du bureau" icon={<ReceiptText className="h-4.5 w-4.5" />} accent="#3D6B72"
        note="Chaque ligne est un de vos versements au registre partagé. Une erreur se retire d'un geste (double confirmation) — le bureau suit aussitôt.">
        {mes.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucun versement à votre nom — utilisez « M&apos;attribuer une épargne » ci-dessus.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mes.map((e) => {
              const mi = Math.min(11, Math.max(0, e.moisIdx));
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3D6B72]/12 text-[#3D6B72]"><PiggyBank className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#2B3530]">{MOIS_FR[mi]} — {fcfa(e.montant)}</span>
                    <span className="block text-[10.5px] text-[#8A9288]">intérêt du mois : +{fcfa(Math.round(e.montant * (taux / 100)))} — registre partagé</span>
                  </span>
                  <BtnConfirme tone="rouge" labelConfirmer="Confirmer ?" onConfirmer={() => retirerVersement(e.id)}>
                    Retirer ce versement
                  </BtnConfirme>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </>
  );
}

/** Libellé court de la manière de collecter les intérêts. */
function COLLECTE_COURTE(regl: Reglement): string {
  const m: Record<string, string> = {
    capitalise: "intérêts crédités chaque mois",
    reunion: "intérêts remis à chaque réunion",
    finAnnee: "intérêts versés en fin d'année",
    caisse: "intérêts versés à la caisse sociale",
  };
  return m[regl.epargne.collecteInterets] ?? "manière réglée par le bureau";
}

/* ══════════════════════════════ MES PRÊTS & DETTES ══════════════════════════════ */

function MesPretsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, regl, moisCourantIdx, roster } = p.ctx;
  const [dossiers, setDossiers] = useState<DossierPret[]>([]);
  const [pretsReunion, setPretsReunion] = useState<AttributionReunion[]>([]);
  const [dettes, setDettes] = useState<Pret[]>([]);
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [garanties, setGaranties] = useState("");
  const [moisChoisi, setMoisChoisi] = useState<number | null>(null);

  const taux = regl.prets.tauxMensuel || 3;
  const duree = regl.prets.dureeMaxMois > 0 ? regl.prets.dureeMaxMois : 6;
  const garantiesExigees = (Object.keys(GARANTIES_LABELS) as (keyof typeof GARANTIES_LABELS)[])
    .filter((k) => regl.prets.garanties?.[k]);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setDossiers(chargerDossiers());
      setPretsReunion(loadPretsReunion());
      loadMontants();
      setDettes(loadPrets());
      setMoisChoisi(moisCourantIdx);
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick, moisCourantIdx]);

  const mesDossiers = useMemo(() => dossiers.filter((x) => x.membreId === moi.id), [dossiers, moi.id]);
  const mesPretsReunion = useMemo(() => pretsReunion.filter((x) => x.membreId === moi.id).sort((a, b) => a.moisIdx - b.moisIdx), [pretsReunion, moi.id]);
  const mesDettes = useMemo(() => dettes.filter((x) => x.statut === "validée"), [dettes]);
  const dettesTotal = mesDettes.reduce((s, x) => s + (x.rembourseMois != null ? 0 : dettePretAuMois(x.capital, taux, x.month0, moisCourantIdx)), 0);

  const souscrire = () => {
    const n = Number(montant);
    if (!n || n <= 0) { toast.error("Indiquez le montant souhaité"); return; }
    if (regl.prets.plafondFcfa > 0 && n > regl.prets.plafondFcfa) {
      toast.error(`Plafond dépassé`, { description: `Le règlement limite un prêt à ${fcfa(regl.prets.plafondFcfa)}.` });
      return;
    }
    const mi = moisChoisi ?? moisCourantIdx ?? 0;
    const nd: DossierPret = {
      id: nid(), membreId: moi.id, montant: n, motif: motif.trim() || "Prêt à la caisse de la Tontine",
      garanties: garanties.trim(), avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "",
      moisIdx: Math.min(11, Math.max(0, mi)),
    };
    const next = [nd, ...dossiers];
    setDossiers(next);
    ecrireJSON(CLE_DEMANDES, next);
    pushNotif({
      id: `pret-demande:${nd.id}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "decision",
      titre: `Demande de prêt — ${moi.nom}`,
      message: `${moi.nom} demande ${fcfa(n)} (${MOIS_FR[Math.min(11, Math.max(0, mi))]}) depuis son Espace Membre — dossier à instruire : avaliste${regl.prets.cosignTresorier ? " + co-signature trésorier" : ""}, puis décision du bureau.`,
    });
    setMontant(""); setMotif(""); setGaranties("");
    toast.success("Votre demande de prêt est déposée", {
      description: `${fcfa(n)} rattaché à ${MOIS_FR[Math.min(11, Math.max(0, mi))]} — le dossier rejoint la file du secrétariat : avaliste, co-signature, décision du bureau.`,
    });
  };

  const rembourser = (id: string) => {
    const d = dettes.find((x) => x.id === id);
    if (!d) return;
    const solde = dettePretAuMois(d.capital, taux, d.month0, moisCourantIdx);
    const next = dettes.map((x) => (x.id === id ? { ...x, rembourseMois: moisCourantIdx, rembourseMontant: solde } : x));
    setDettes(next);
    savePrets(next);
    pushNotif({
      id: `pret-rembourse:${id}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "decision",
      titre: `Remboursement déclaré — ${moi.nom}`,
      message: `${moi.nom} déclare avoir remboursé ${fcfa(solde)} (prêt de ${fcfa(d.capital)}, ${MOIS_FR[Math.min(11, Math.max(0, d.month0))]}) — à confirmer au registre du bureau.`,
    });
    toast.success("Remboursement déclaré", { description: `${fcfa(solde)} — le bureau confirme et clôt la ligne au registre.` });
  };

  const STATUT: Record<DossierPret["statut"], { label: string; cls: string }> = {
    en_attente: { label: "En attente — instruit par le secrétariat", cls: OR_CLS },
    accorde: { label: "Accordé", cls: OK_CLS },
    refuse: { label: "Refusé", cls: RJ_CLS },
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#B85C33]/12 text-[#B85C33]"><Landmark className="h-4 w-4" /></span>
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#B85C33]">Emprunter à la caisse de la Tontine — les mêmes règles pour tous.</strong>{" "}
            {taux} %/mois, échéance {duree} mois{regl.prets.plafondFcfa > 0 ? `, plafond ${fcfa(regl.prets.plafondFcfa)}` : ""}.
            Votre dossier rejoint la file commune : avaliste, co-signature{regl.prets.cosignTresorier ? " du trésorier" : ""}, décision du bureau.
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={montant} onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric" placeholder="Montant souhaité (FCFA)"
            aria-label="Montant de mon prêt en FCFA"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
          />
          <select
            value={moisChoisi ?? ""} onChange={(e) => setMoisChoisi(Number(e.target.value))}
            aria-label="Mois auquel rattacher mon prêt"
            className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#B85C33]"
          >
            {MOIS_FR.map((nom, mi) => (
              <option key={nom} value={mi}>
                {nom}{moisCourantIdx != null && mi === moisCourantIdx ? " — mois en cours" : moisCourantIdx != null && mi > moisCourantIdx ? " — à venir" : ""}
              </option>
            ))}
          </select>
          <input
            value={motif} onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (ex. : rentrée scolaire)" aria-label="Motif de mon prêt"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
          />
          <input
            value={garanties} onChange={(e) => setGaranties(e.target.value)}
            placeholder="Garanties proposées (libre)" aria-label="Garanties proposées"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
          />
          <div className="sm:col-span-2">
            <Btn tone="or" onClick={souscrire}><HandCoins className="h-4 w-4" /> Souscrire ce prêt {montant ? `de ${fcfa(Number(montant))}` : ""}</Btn>
          </div>
        </div>
        {garantiesExigees.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-wide text-[#8A9288]">Garanties exigées par le règlement :</span>
            {garantiesExigees.map((k) => <P key={k} cls={TE_CLS}>{GARANTIES_LABELS[k]}</P>)}
            {regl.prets.cosignTresorier && <P cls={VI_CLS}><Wallet className="h-3 w-3" /> Co-signature du trésorier</P>}
          </div>
        )}
        {Number(montant) > 0 && (
          <p className="mt-2 rounded-2xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3 py-2 text-[11.5px] font-semibold text-[#8A6420]">
            En direct — {fcfa(Number(montant))} sur {duree} mois à {taux} %/mois : intérêts ≈ {fcfa(Math.round(Number(montant) * (taux / 100) * duree))}, mensualité ≈ {fcfa(Math.round((Number(montant) * (1 + (taux / 100) * duree)) / duree))}.
          </p>
        )}
      </FcCard>

      {/* — mes dettes — */}
      <Block title="Mes dettes envers la Tontine" icon={<Coins className="h-4.5 w-4.5" />} accent="#B85C33"
        note="Les prêts qui vous ont été accordés (registre du bureau) : la dette gagne des intérêts selon le règlement. Déclarez votre remboursement — le bureau confirme et clôt.">
        {mesDettes.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune dette à votre nom — tant mieux !</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mesDettes.map((d) => {
              const rembourse = d.rembourseMois != null;
              const solde = rembourse ? (d.rembourseMontant ?? 0) : dettePretAuMois(d.capital, taux, d.month0, moisCourantIdx);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#2B3530]">
                      Prêt de {fcfa(d.capital)} — {MOIS_FR[Math.min(11, Math.max(0, d.month0))]}
                    </span>
                    <span className="block text-[10.5px] text-[#8A9288]">
                      {rembourse ? `remboursé (${MOIS_FR[Math.min(11, Math.max(0, d.rembourseMois ?? 0))]}) — confirmation du bureau à venir` : `dette au mois en cours : ${fcfa(solde)} (${taux} %/mois)`}
                    </span>
                  </span>
                  {rembourse ? <P cls={OK_CLS}><CheckCircle2 className="h-3 w-3" /> Remboursé — à confirmer</P> : (
                    <BtnConfirme tone="or" labelConfirmer="Déclarer ?" onConfirmer={() => rembourser(d.id)}>
                      J&apos;ai remboursé {fcfa(solde)}
                    </BtnConfirme>
                  )}
                </li>
              );
            })}
            <li className="flex items-center justify-between bg-[#C89F62]/10 px-4 py-2.5 text-[12.5px] font-black text-[#2B2416]">
              <span>Total de mes dettes ouvertes</span><span>{fcfa(dettesTotal)}</span>
            </li>
          </ul>
        )}
      </Block>

      {/* — mes dossiers — */}
      <Block title="Mes demandes de prêt (caisse de la Tontine)" icon={<HandCoins className="h-4.5 w-4.5" />} accent="#B85C33"
        note="Chaque demande rejoint la file commune des dossiers : le secrétariat instruit (avaliste, garanties), le bureau statue. Suivez ici vos dossiers.">
        {mesDossiers.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune demande à votre nom — remplissez le formulaire ci-dessus.</p>
        ) : (
          <div className="space-y-2.5 p-4">
            {mesDossiers.map((d) => {
              const mi = Math.min(11, Math.max(0, d.moisIdx ?? moisCourantIdx ?? 0));
              const av = d.avalisteId ? roster.find((x) => x.id === d.avalisteId) : null;
              return (
                <div key={d.id} className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-[#2B3530]">{fcfa(d.montant)} — rattaché à {MOIS_FR[mi]}</p>
                    <P cls={STATUT[d.statut].cls}>{STATUT[d.statut].label}</P>
                  </div>
                  {d.motif && <p className="mt-0.5 text-[11.5px] text-[#8A9288]">{d.motif}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {av && <P cls={OK_CLS}><UserCheck className="h-3 w-3" /> Avaliste : {av.name}</P>}
                    {d.cosignTresorier && <P cls={OK_CLS}><Wallet className="h-3 w-3" /> Co-signé trésorier</P>}
                    {d.garanties && <P cls={TE_CLS}><Landmark className="h-3 w-3" /> Garantie : {d.garanties}</P>}
                  </div>
                  {d.statut === "refuse" && d.motifRefus && (
                    <p className="mt-2 rounded-lg bg-[#A5473D]/8 px-3 py-2 text-[12px] text-[#A5473D]">Motif du refus : {d.motifRefus}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Block>

      {/* — prêter à la réunion — */}
      <Block title="Prêter à la réunion — l'argent que la réunion me doit" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="#B85C33"
        note="Un prêt FAIT à la réunion est inscrit au registre partagé (président inclus) et produit des intérêts au taux en vigueur jusqu'au remboursement confirmé par le bureau.">
        <div className="p-4">
          {mesPretsReunion.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] text-[#8A9288]">
              Aucun prêt à la réunion à votre nom — vous pouvez en inscrire un depuis la réunion (registre du bureau) ; il apparaîtra ici aussitôt.
            </p>
          ) : (
            <ul className="divide-y divide-[#E5DCC0] rounded-2xl border border-[#E5DCC0] bg-white">
              {mesPretsReunion.map((x) => {
                const mi = Math.min(11, Math.max(0, x.moisIdx));
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-[#2B3530]">{MOIS_FR[mi]} — {fcfa(x.montant)}</span>
                      <span className="block text-[10.5px] text-[#8A9288]">intérêts du mois : +{fcfa(Math.round(x.montant * (taux / 100)))} — registre partagé</span>
                    </span>
                    <P cls={x.rembourse ? OK_CLS : VI_CLS}>{x.rembourse ? "remboursé par la réunion" : "au registre du bureau"}</P>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════════ MES AMENDES & PRÉSENCE ══════════════════════════════ */

function MesAmendesTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, amendes, moisKey } = p.ctx;
  const [presences, setPresences] = useState<HistoriquePresences>({});
  const [rachatAuto, setRachatAuto] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setPresences(loadPresences());
      setRachatAuto(loadParamsSecretaire().presences.rachatAuto);
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const mes = amendes.filter((a) => a.membreId === moi.id);
  const dues = mes.filter((a) => a.statut === "due");
  const totalDues = dues.reduce((s, a) => s + a.montant, 0);
  const stats = statsPresence(presences, moi.id, moisKey, rachatAuto);
  const fenetre = derniersMoisKeys(moisKey, 12).reverse(); // du plus ancien au courant

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<Gavel className="h-4 w-4" />} label="Amendes dues" value={fcfa(totalDues)} sub={`${dues.length} en attente`} accent={totalDues > 0 ? "#A5473D" : "#2F6B45"} />
        <KpiCard icon={<CalendarCheck className="h-4 w-4" />} label="Absences consécutives" value={String(stats.absCons)} sub="série en cours" accent={stats.absCons > 0 ? "#8A6420" : "#2F6B45"} />
        <KpiCard icon={<CalendarDays className="h-4 w-4" />} label="Absences 6 mois" value={String(stats.abs6)} sub="après rachat" accent="#3D6B72" />
        <KpiCard icon={<ScrollText className="h-4 w-4" />} label="Absences année" value={String(stats.absAnnee)} sub="12 mois glissants" accent="#8A6420" />
      </div>

      <Block title="Mon historique de présence — 12 derniers mois" icon={<CalendarCheck className="h-4.5 w-4.5" />} accent="#A5473D"
        note="L'appel est fait par la secrétaire à chaque réunion : présent, excusé (justifié), absent. Le mois en cours reste en attente tant que l'appel n'est pas clos.">
        <div className="flex flex-wrap gap-1.5 p-4">
          {fenetre.map((mk) => {
            const etat: PresenceEtat = presences?.[mk]?.[moi.id] ?? "attente";
            const etq = ETATS_PRESENCE.find((e) => e.cle === etat)?.label ?? etat;
            return <P key={mk} cls={COULEUR_PRESENCE[etat]}><CalendarDays className="h-3 w-3" /> {labelMoisKey(mk)} — {etq}</P>;
          })}
        </div>
        {stats.rachatApplique && (
          <p className="mx-4 mb-4 rounded-xl bg-[#2F6B45]/10 px-3 py-2 text-[11.5px] font-semibold text-[#2F6B45]">
            Rachat automatique : vos {stats.rachatNb} absence(s) du mois passé ont été annulées parce que vous étiez présent ce mois-ci. La Tontine récompense l&apos;assiduité.
          </p>
        )}
      </Block>

      <Block title="Mes amendes" icon={<Gavel className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Les amendes sont générées AUTOMATIQUEMENT par le moteur du secrétariat selon les règles votées (absences consécutives, sur 6 mois, sur l'année, convocation confirmée puis absent). Le paiement est constaté par la secrétaire.">
        {mes.length === 0 ? (
          <Vide icon={<Gavel className="h-6 w-6" />} texte="Aucune amende à votre nom"
            note="Restez assidu : présentez-vous ou justifiez vos absences AVANT la réunion (onglet Convocations) — c'est la meilleure façon de ne jamais voir d'amende." />
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">{a.libelle} — {fcfa(a.montant)}</span>
                  <span className="block text-[10.5px] text-[#8A9288]">{a.moisLabel} · notifiée le {a.le}</span>
                </span>
                <P cls={a.statut === "due" ? RJ_CLS : a.statut === "transmise" ? OR_CLS : OK_CLS}>
                  {a.statut === "due" ? "à régler" : a.statut === "transmise" ? "transmise au trésorier" : "payée — merci"}
                </P>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ MES CONVOCATIONS (la vraie réponse !) ══════════════════════════════ */

function MesConvocationsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, convos, majConvo } = p.ctx;
  const [reponse, setReponse] = useState<{ convoId: string; texte: string; vocal: string | null } | null>(null);

  const miennes = convos
    .filter((c) => c.destinataires[moi.id])
    .sort((a, b) => (a.le < b.le ? 1 : -1));

  const majReponse = (convoId: string, patch: Partial<ReponseConvocation>) => {
    const c = convos.find((x) => x.id === convoId);
    if (!c) return;
    const dest = { ...c.destinataires, [moi.id]: { ...c.destinataires[moi.id], ...patch } };
    const next = { ...c, destinataires: dest };
    majConvo(next);
    saveConvocations(convos.map((x) => (x.id === convoId ? next : x)));
  };

  const confirmer = (c: ConvocationV2) => {
    const le = `${dateCourte()} ${heure()}`;
    majReponse(c.id, { statut: "confirmee", confirmeeLe: le, reponduLe: le });
    pushNotif({
      id: `conv-confirmation:${c.id}:${moi.id}`, le,
      destinataire: "president", destinataireNom: "Président", type: "convocation",
      titre: `Réception confirmée — ${moi.nom}`,
      message: `${moi.nom} a confirmé la réception de la convocation « ${c.objet} » depuis son Espace Membre. Sans présence à la réunion, la sanction « confirmé puis absent » s'appliquera automatiquement.`,
    });
    toast.success("Réception confirmée — merci !", { description: "Le secrétariat est prévenu. Sans présence à la réunion, la sanction « confirmé puis absent » s'appliquera." });
  };

  const justifier = (c: ConvocationV2) => {
    if (!reponse || reponse.convoId !== c.id) { toast.error("Ouvrez d'abord le formulaire d'absence"); return; }
    if (!reponse.texte.trim() && !reponse.vocal) { toast.error("Justifiez votre absence — texte ou message vocal"); return; }
    const le = `${dateCourte()} ${heure()}`;
    majReponse(c.id, {
      statut: "absence", reponduLe: le,
      justificationTexte: reponse.texte.trim() || undefined,
      justificationVocal: reponse.vocal,
    });
    pushNotif({
      id: `conv-absence:${c.id}:${moi.id}`, le,
      destinataire: "president", destinataireNom: "Président", type: "convocation",
      titre: `Absence notifiée — ${moi.nom}`,
      message: `${moi.nom} a notifié son absence pour « ${c.objet} » depuis son Espace Membre. Justification : ${reponse.vocal ? "message vocal" : "texte"}${reponse.texte.trim() ? ` — « ${reponse.texte.trim()} »` : ""}. Absence EXCUSÉE : pas d'amende, à reporter sur la liste de présence.`,
    });
    setReponse(null);
    toast.success("Absence notifiée — merci", { description: "Justification transmise à la secrétaire et au président : absence excusée, pas d'amende." });
  };

  return (
    <>
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-[#8A6420] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><Mail className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">Mes convocations — je confirme, je m&apos;excuse, je m&apos;exprime</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Chaque convocation du secrétariat arrive ici. Confirmez votre réception OU notifiez votre absence
              avec une justification (texte ou message vocal au micro) — votre réponse rejoint aussitôt le
              secrétariat et le président.
            </p>
          </div>
        </div>
      </FcCard>

      {miennes.length === 0 ? (
        <Vide icon={<Mail className="h-6 w-6" />} texte="Aucune convocation reçue"
          note="Dès que la secrétaire vous convoque (réunion ordinaire, bureau, discipline…), elle apparaît ici avec le message complet." />
      ) : (
        miennes.map((c) => {
          const r = c.destinataires[moi.id];
          return (
            <Block key={c.id} title={`${c.type} — ${c.objet}`} icon={<Mail className="h-4.5 w-4.5" />} accent="#8A6420"
              note={`Reçue le ${c.le} — réunion convoquée : ${labelMoisKey(c.moisKey)} (${TONTINE.jourLabel}).`}>
              <div className="p-4">
                <p className="whitespace-pre-line rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#2B3530]">{c.message}</p>
                <div className="mt-3">
                  {r.statut === "confirmee" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <P cls={OK_CLS}><CheckCircle2 className="h-3.5 w-3.5" /> Réception confirmée le {r.confirmeeLe}</P>
                    </div>
                  )}
                  {r.statut === "absence" && (
                    <div className="space-y-2">
                      <P cls={OR_CLS}><CalendarClock className="h-3.5 w-3.5" /> Absence notifiée le {r.reponduLe} — excusée, pas d&apos;amende</P>
                      {r.justificationTexte && <p className="rounded-xl bg-[#FBF7EA] px-3 py-2 text-[12px] text-[#5C6B60]">« {r.justificationTexte} »</p>}
                      {r.justificationVocal && <audio controls src={r.justificationVocal} className="h-9 max-w-full" />}
                    </div>
                  )}
                  {r.statut === "envoyee" && (
                    <div className="space-y-2.5">
                      <p className="text-[12px] font-bold text-[#A5473D]">En attente de votre réponse — confirmez ou justifiez une absence :</p>
                      <div className="flex flex-wrap gap-2">
                        <Btn tone="vert" onClick={() => confirmer(c)}><CheckCircle2 className="h-4 w-4" /> Je confirme ma présence</Btn>
                        <Btn tone="or" onClick={() => setReponse({ convoId: c.id, texte: "", vocal: null })}>
                          <CalendarClock className="h-4 w-4" /> Signaler une absence
                        </Btn>
                      </div>
                      {reponse?.convoId === c.id && (
                        <div className="rounded-2xl border-2 border-[#C89F62]/50 bg-[#C89F62]/8 p-3.5">
                          <textarea
                            value={reponse.texte} onChange={(e) => setReponse({ ...reponse, texte: e.target.value })} rows={3}
                            placeholder="Expliquez votre absence (déplacement, maladie, travail…)"
                            aria-label="Justification de mon absence"
                            className="w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] text-[#2B3530] outline-none placeholder:text-[#8A9288] focus:ring-2 focus:ring-[#C89F62]/30"
                          />
                          <div className="mt-2">
                            <RecorderVocal accent="#8A6420" onResultat={(u) => setReponse((rp) => (rp && rp.convoId === c.id ? { ...rp, vocal: u } : rp))} />
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Btn tone="vert" onClick={() => justifier(c)}><Send className="h-4 w-4" /> Envoyer la justification</Btn>
                            <Btn tone="neutre" onClick={() => setReponse(null)}><X className="h-4 w-4" /> Annuler</Btn>
                          </div>
                          <p className="mt-2 text-[10.5px] text-[#8A6420]">Une absence NOTIFIÉE est excusée : pas d&apos;amende. Une absence non justifiée après confirmation sera amendée par le moteur.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Block>
          );
        })
      )}
    </>
  );
}

/* ══════════════════════════════ RÉUNIONS & MON TOUR ══════════════════════════════ */

function ReunionsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, roster, moisCourantIdx, annee, moisKey } = p.ctx;
  const [seances, setSeances] = useState<Seance[]>([]);
  const [presences, setPresences] = useState<HistoriquePresences>({});

  useEffect(() => {
    const t0 = setTimeout(() => {
      setSeances(loadSeances());
      setPresences(loadPresences());
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const jour = secondSunday(annee, moisCourantIdx);
  const seance = seances.find((s) => s.moisKey === moisKey);
  const etatMois: PresenceEtat = presences?.[moisKey]?.[moi.id] ?? "attente";

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8A6420]/12 text-[#8A6420]"><CalendarClock className="h-4.5 w-4.5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">La réunion du mois</p>
            <p className="fc-serif text-[17px] font-bold text-[#2B3530]">Le {jour} {MOIS_FR[moisCourantIdx]} {annee} — {TONTINE.jourLabel}</p>
            <p className="mt-0.5 text-[11.5px] text-[#5C6B60]">Lieu habituel : domicile de la famille. Le pot du mois = addition des taux de TOUS (bénéficiaire compris).</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <P cls={COULEUR_PRESENCE[etatMois]}>{ETATS_PRESENCE.find((e) => e.cle === etatMois)?.label ?? "Appel en attente"}</P>
              <P cls={TE_CLS}><Users className="h-3 w-3" /> {roster.length} membres convoqués</P>
            </div>
          </div>
        </div>
        {seance && seance.points.length > 0 && (
          <div className="mt-3 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
            <p className="text-[11.5px] font-black uppercase tracking-wide text-[#8A6420]">Ordre du jour</p>
            <ol className="mt-1.5 space-y-1.5">
              {seance.points.map((pt, i) => (
                <li key={pt.id} className="flex items-start gap-2 text-[12px]">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C89F62] text-[10px] font-black text-[#2B2416]">{i + 1}</span>
                  <span>
                    <span className="font-bold text-[#2B3530]">{pt.titre}</span>
                    {pt.detail && <span className="block text-[11px] text-[#8A9288]">{pt.detail} — responsable : {pt.responsable}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </FcCard>

      <Block title="Le calendrier des tours — qui reçoit quoi" icon={<Crown className="h-4.5 w-4.5" />} accent="#8A6420"
        note="L'ordre des tours suit l'ancienneté. Mon tour est surligné : le mois venu, je reçois le pot du mois — et je cotise comme tout le monde.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#8A6420] text-white">
                <th className="px-2.5 py-2 text-left font-black">Mois</th>
                <th className="px-2.5 py-2 text-left font-black">Bénéficiaire (tour)</th>
                <th className="px-2.5 py-2 text-left font-black">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {roster.slice().sort((a, b) => a.tour - b.tour).map((m) => {
                const monTour = m.id === moi.id;
                return (
                  <tr key={m.id} className={`border-b border-[#E5DCC0] ${monTour ? "bg-[#C89F62]/20 font-bold" : "bg-[#FFFDF6]"}`}>
                    <td className="px-2.5 py-2">{moisDuTour(m.tour)}</td>
                    <td className="px-2.5 py-2">
                      {m.name} <span className="text-[10px] font-black text-[#8A9288]">n°{m.tour}</span>
                      {monTour && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">MOI</span>}
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-[#5C6B60]">{ROLE_META[m.role].short}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════════ PV & DÉCISIONS ══════════════════════════════ */

function PvTab(p: { ctx: CtxMembre }): ReactNode {
  const [pvs, setPvs] = useState<ReturnType<typeof loadPVs>>([]);
  const [decisions, setDecisions] = useState<DecisionJ[]>([]);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setPvs(loadPVs().filter((x) => x.statut !== "brouillon"));
      setDecisions(loadDecisions());
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  return (
    <>
      <Block title="Les procès-verbaux de la famille" icon={<ScrollText className="h-4.5 w-4.5" />} accent="#6E4B71"
        note="Ce que la réunion DÉCIDE est écrit par la secrétaire, finalisé puis archivé. Les brouillons ne sont pas visibles — seuls les PV finalisés et archivés le sont.">
        {pvs.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucun procès-verbal publié pour le moment.</p>
        ) : (
          <div className="space-y-2.5 p-4">
            {pvs.map((pv) => (
              <details key={pv.id} className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-[#2B3530]">{pv.titre}</span>
                  <span className="flex items-center gap-1.5">
                    <P cls={pv.statut === "archive" ? TE_CLS : OR_CLS}>{pv.statut === "archive" ? `archivé — ${pv.archiveType ?? "archives"}` : "finalisé — lu en réunion"}</P>
                    <span className="text-[10px] font-bold text-[#8A9288]">{pv.le}</span>
                  </span>
                </summary>
                <p className="mt-2 whitespace-pre-line rounded-xl bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#2B3530]">{pv.contenu}</p>
              </details>
            ))}
          </div>
        )}
      </Block>

      <Block title="Le journal des décisions du bureau" icon={<ClipboardList className="h-4.5 w-4.5" />} accent="#6E4B71"
        note="Chaque décision prise en réunion (financière, discipline, solidarité…) avec son responsable et son suivi d'actions.">
        {decisions.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Le journal est vide pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {decisions.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-[#2B3530]">{d.type} — {d.point}</p>
                  <P cls={d.statut === "realisee" ? OK_CLS : d.statut === "en_cours" ? OR_CLS : TE_CLS}>
                    {d.statut === "realisee" ? "réalisée" : d.statut === "en_cours" ? "en cours" : d.statut === "archivee" ? "archivée" : "inscrite"}
                  </P>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-[#5C6B60]">{d.texte}</p>
                <p className="mt-1 text-[10px] font-bold text-[#8A9288]">Responsable : {d.responsable} · le {d.le}{d.suivi.length > 0 ? ` · ${d.suivi.length} action(s) de suivi` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ ANNUAIRE ══════════════════════════════ */

function AnnuaireTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, roster, postes } = p.ctx;
  return (
    <Block title="L'annuaire de la Tontine" icon={<Users className="h-4.5 w-4.5" />} accent="#8A6420"
      note="Tous les membres : le bureau (avec son poste) et les membres simples. Je peux joindre n'importe qui par WhatsApp ou téléphone.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#8A6420] text-white">
              <th className="px-2.5 py-2 text-left font-black">Membre</th>
              <th className="px-2.5 py-2 text-left font-black">Poste</th>
              <th className="px-2.5 py-2 text-left font-black">Téléphone</th>
              <th className="px-2.5 py-2 text-left font-black">Ville</th>
              <th className="px-2.5 py-2 text-left font-black">Tour</th>
            </tr>
          </thead>
          <tbody>
            {roster.slice().sort((a, b) => a.tour - b.tour).map((m) => {
              const poste = posteDeMembre(postes, m.id);
              const moi_ = m.id === moi.id;
              return (
                <tr key={m.id} className={`border-b border-[#E5DCC0] ${moi_ ? "bg-[#C89F62]/20 font-bold" : "bg-[#FFFDF6]"}`}>
                  <td className="px-2.5 py-2">
                    {m.name}
                    {moi_ && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">MOI</span>}
                    {!m.fictif && <span className="ml-1.5 rounded-full border border-[#C9D2CB] px-1.5 py-0.5 text-[9px] font-black text-[#8A9288]">via l&apos;app</span>}
                  </td>
                  <td className="px-2.5 py-2">
                    {m.role !== "membre" ? <span className="rounded-full bg-[#1E4D2B] px-2 py-0.5 text-[10px] font-black text-white">{ROLE_META[m.role].short}</span>
                      : poste ? <span className="text-[11px] font-semibold text-[#8A6420]">{POSTES_BUREAU.find((x) => x.key === poste)?.label}</span>
                      : <span className="text-[11px] text-[#8A9288]">membre simple</span>}
                  </td>
                  <td className="px-2.5 py-2">
                    {m.phone ? (
                      <a href={`https://wa.me/${m.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold text-[#2F6B45] underline decoration-[#2F6B45]/40 hover:decoration-[#2F6B45]">
                        {m.phone}
                      </a>
                    ) : <span className="text-[#8A9288]">—</span>}
                  </td>
                  <td className="px-2.5 py-2 text-[11px] text-[#5C6B60]">{m.city}</td>
                  <td className="px-2.5 py-2 text-[11px] font-bold text-[#8A9288]">n°{m.tour}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Block>
  );
}

/* ══════════════════════════════ SOLIDARITÉ ══════════════════════════════ */

function SolidariteTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, roster, moisCourantIdx } = p.ctx;
  const [types, setTypes] = useState<TypeSolidarite[]>([]);
  const [visites, setVisites] = useState<VisiteSolidarite[]>([]);
  const [caisse, setCaisse] = useState(0);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTypes(loadTypesSolidarite());
      setVisites(loadVisitesSolidarite());
      setCaisse(lireJSON<number>(CLE_CAISSE, 0));
    }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const nomDe = (id: string) => roster.find((m) => m.id === id)?.name ?? "—";
  const mesTypes = types.filter((t) => t.variables.some((v) => v.membreId === moi.id));
  const maPart = mesTypes.reduce((s, t) => s + (t.variables.find((v) => v.membreId === moi.id)?.montant ?? t.somme), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <KpiCard icon={<HandHeart className="h-4 w-4" />} label="Caisse de secours" value={fcfa(caisse)} sub="solidarité de la famille" accent="#A5473D" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Types actifs" value={String(types.length)} sub="deuils, mariages, naissances…" accent="#8A6420" />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Ma part de solidarité" value={fcfa(maPart)} sub={`${mesTypes.length} type(s) où je suis attribué`} accent="#3D6B72" />
      </div>

      <Block title="Les types de solidarité en vigueur" icon={<HandHeart className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Créés par le président : chacun sait ce que la famille doit quand le malheur ou la joie frappe — et ce que chacun verse.">
        {types.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucun type de solidarité défini pour le moment.</p>
        ) : (
          <div className="grid gap-2.5 p-4 sm:grid-cols-2">
            {types.map((t) => {
              const maLigne = t.variables.find((v) => v.membreId === moi.id);
              const maSomme = maLigne ? maLigne.montant : 0;
              return (
                <div key={t.id} className={`rounded-2xl border px-3.5 py-3 ${maLigne ? "border-[#A5473D]/40 bg-[#A5473D]/8" : "border-[#E5DCC0] bg-[#FFFDF6]"}`}>
                  <p className="text-[13px] font-bold text-[#2B3530]">{t.nom}</p>
                  <p className="mt-0.5 text-[11px] text-[#8A9288]">Base : {fcfa(t.somme)} · délai : {t.delaiMois} mois · {t.variables.length} membre(s) attribué(s)</p>
                  {maLigne ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-black text-[#A5473D]"><HandHeart className="h-3.5 w-3.5" /> Ma part : {fcfa(maSomme)}</p>
                  ) : (
                    <p className="mt-1.5 text-[11px] italic text-[#8A9288]">Je ne suis pas attribué à ce type.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Block>

      <Block title="Le calendrier des visites" icon={<CalendarDays className="h-4.5 w-4.5" />} accent="#A5473D"
        note="La Tontine se déplace : deuils, mariages, naissances, maladies — c'est la famille qui se voit.">
        {visites.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune visite programmée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {visites.slice().sort((a, b) => a.moisIdx - b.moisIdx).map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#A5473D]/12 text-[#A5473D]"><HandHeart className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">Visite de {nomDe(v.membreId)} — {MOIS_FR[Math.min(11, Math.max(0, v.moisIdx))]}</span>
                  <span className="block text-[10.5px] text-[#8A9288]">
                    {v.typeId ? types.find((t) => t.id === v.typeId)?.nom ?? "solidarité" : "visite libre"}
                    {v.moisIdx === moisCourantIdx ? " — ce mois-ci !" : ""}
                  </span>
                </span>
                {v.moisIdx === moisCourantIdx && <P cls={RJ_CLS}><CalendarClock className="h-3 w-3" /> à venir</P>}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ À VALIDER ══════════════════════════════ */

function ValidationsTab(p: { ctx: CtxMembre }): ReactNode {
  const { decisionsTaux, majDecisionsTaux, epargnesWorkflow, majEpargnesWorkflow } = p.ctx;
  const [prets, setPrets] = useState<Pret[]>([]);

  useEffect(() => {
    const t0 = setTimeout(() => { loadPrets(); setPrets(loadPrets()); }, 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const aValiderTaux = decisionsTaux.filter((d) => enAttenteMembre(d));
  const aValiderEpargnes = epargnesWorkflow.filter((e) => enAttenteMembre(e));
  const aValiderPrets = prets.filter((e) => enAttenteMembre(e));
  const total = aValiderTaux.length + aValiderEpargnes.length + aValiderPrets.length;

  const validerTaux = (id: string) => {
    const next = decisionsTaux.map((d) => (d.id === id ? membreValide(d) : d));
    majDecisionsTaux(next);
    saveDecisionsTaux(next);
    toast.success("Décision validée — merci !", { description: "Votre accord est enregistré : le taux s'applique à tous." });
  };

  const validerEpargne = (id: string) => {
    const next = epargnesWorkflow.map((e) => (e.id === id ? membreValide(e) : e));
    majEpargnesWorkflow(next);
    saveEpargnes(next);
    toast.success("Épargne validée", { description: "Votre accord est enregistré — la ligne rejoint définitivement le registre." });
  };

  const validerPret = (id: string) => {
    const next = prets.map((e) => (e.id === id ? membreValide(e) : e));
    setPrets(next);
    savePrets(next);
    toast.success("Dette validée", { description: "Votre accord est enregistré — la dette rejoint définitivement le registre." });
  };

  return (
    <>
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-[#A5473D] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><CheckCircle2 className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">Le bureau propose — je valide : la règle de la maison</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Toute décision du bureau (taux, épargne, dette) vous est soumise. Vous avez {DELAI_VALIDATION_JOURS} jours pour la
              valider — sans action de votre part, elle est validée par défaut (le bureau en est informé). Ici, tout est transparent.
            </p>
          </div>
        </div>
        <div className="p-4">
          <P cls={total > 0 ? RJ_CLS : OK_CLS}><CheckCircle2 className="h-3 w-3" /> {total > 0 ? `${total} décision(s) attendent votre validation` : "Tout est validé — vous êtes à jour"}</P>
        </div>
      </FcCard>

      <Block title="Décisions de taux à valider" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Le taux mensuel des épargnes et des prêts : signé par le bureau, validé par les membres.">
        {aValiderTaux.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune décision de taux en attente.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {aValiderTaux.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">Taux {d.ancienne} % → {d.valeur} %</span>
                  <span className="block text-[10.5px] text-[#8A9288]">signée par {ROLE_META[d.role].short} le {dateCourteIso(d.le)}</span>
                </span>
                <Btn tone="vert" onClick={() => validerTaux(d.id)}><CheckCircle2 className="h-4 w-4" /> Valider</Btn>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Mes lignes d'épargne à valider" icon={<PiggyBank className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Les épargnes inscrites pour vous (page Finances → Épargnes de l'application) attendent votre accord.">
        {aValiderEpargnes.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune épargne en attente.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {aValiderEpargnes.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">Épargne de {MOIS_FR[Math.min(11, Math.max(0, e.month0))]} — {fcfa(e.capital)}</span>
                  <span className="block text-[10.5px] text-[#8A9288]">proposée par {e.origine === "bureau" ? "le bureau" : "vous"}</span>
                </span>
                <Btn tone="vert" onClick={() => validerEpargne(e.id)}><CheckCircle2 className="h-4 w-4" /> Valider</Btn>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Mes dettes à valider" icon={<HandCoins className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Les prêts qui vous sont accordés attendent aussi votre accord — rien n'est inscrit sans vous.">
        {aValiderPrets.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune dette en attente.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {aValiderPrets.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-bold text-[#2B3530]">Prêt de {MOIS_FR[Math.min(11, Math.max(0, e.month0))]} — {fcfa(e.capital)}</span>
                  <span className="block text-[10.5px] text-[#8A9288]">accordé par le bureau</span>
                </span>
                <Btn tone="vert" onClick={() => validerPret(e.id)}><CheckCircle2 className="h-4 w-4" /> Valider</Btn>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ MES SIGNALEMENTS ══════════════════════════════ */

function SignalementsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi } = p.ctx;
  const [liste, setListe] = useState<Signalement[]>([]);
  const [cible, setCible] = useState<Signalement["cible"]>("autre");
  const [motif, setMotif] = useState<MotifSignalement>("montant");
  const [message, setMessage] = useState("");
  const [vocal, setVocal] = useState<string | null>(null);

  useEffect(() => {
    const t0 = setTimeout(() => setListe(loadSignalements()), 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const mesSignalements = liste.filter((s) => nomCle(s.auteur) === nomCle(moi.nom));

  const deposer = () => {
    if (!message.trim() && !vocal) { toast.error("Décrivez le problème — texte ou message vocal"); return; }
    deposerSignalement({
      cible, cibleId: null,
      cibleLabel: cible === "taux" ? "Taux appliqué" : cible === "epargne" ? "Une épargne" : cible === "pret" ? "Une dette" : "Autre",
      motif, message, vocal, auteur: moi.nom, auteurRole: moi.role,
    });
    setListe(loadSignalements());
    setMessage("");
    setVocal(null);
    pushNotif({
      id: `signalement:${moi.id}:${Date.now().toString(36)}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "rappel",
      titre: `Nouveau signalement — ${moi.nom}`,
      message: `${moi.nom} a signalé : ${MOTIFS_SIGNALEMENT[motif]} (${cible}) — à traiter sous 3 jours.`,
    });
    toast.success("Signalement déposé", { description: "Le bureau est notifié — vous suivrez ici la suite donnée (rappel automatique après 3 jours sans réponse)." });
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#A5473D]/12 text-[#A5473D]"><MessageSquarePlus className="h-4 w-4" /></span>
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#A5473D]">Ma voix compte.</strong> Un montant erroné, une dette mal insérée, un taux
            mal appliqué ? Signalez — le bureau est notifié et doit répondre ; sans réponse, un rappel part automatiquement.
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            value={cible} onChange={(e) => setCible(e.target.value as Signalement["cible"])}
            aria-label="Qu'est-ce qui est visé ?"
            className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#A5473D]"
          >
            <option value="epargne">Une épargne</option>
            <option value="pret">Une dette / un prêt</option>
            <option value="taux">Le taux appliqué</option>
            <option value="autre">Autre</option>
          </select>
          <select
            value={motif} onChange={(e) => setMotif(e.target.value as MotifSignalement)}
            aria-label="Motif du signalement"
            className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#A5473D]"
          >
            {Object.entries(MOTIFS_SIGNALEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Décrivez le problème (le mois, le montant attendu…)" aria-label="Description du signalement"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2 text-[13px] text-[#2B3530] outline-none placeholder:text-[#8A9288] focus:ring-2 focus:ring-[#A5473D]/25 sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <RecorderVocal accent="#A5473D" onResultat={setVocal} />
          </div>
          <div className="sm:col-span-2">
            <Btn tone="rouge" onClick={deposer}><Send className="h-4 w-4" /> Déposer mon signalement</Btn>
          </div>
        </div>
      </FcCard>

      <Block title="Le suivi de mes signalements" icon={<ClipboardList className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Chaque signalement déposé est suivi : le bureau marque la suite donnée (résolu ou rejeté, avec sa note).">
        {mesSignalements.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucun signalement à votre nom — utilisez le formulaire ci-dessus si quelque chose cloche.</p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mesSignalements.map((s) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-[#2B3530]">{s.cibleLabel} — {MOTIFS_SIGNALEMENT[s.motif]}</p>
                  <P cls={s.statut === "ouvert" ? OR_CLS : s.statut === "resolu" ? OK_CLS : RJ_CLS}>
                    {s.statut === "ouvert" ? "en attente du bureau" : s.statut === "resolu" ? "résolu" : "rejeté"}
                  </P>
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-[#5C6B60]">« {s.message} »</p>
                {s.resolution && <p className="mt-1.5 rounded-xl bg-[#2F6B45]/8 px-3 py-2 text-[11.5px] font-semibold text-[#2F6B45]">Suite donnée : {s.resolution}</p>}
                {s.vocal && <audio controls src={s.vocal} className="mt-1.5 h-9 max-w-full" />}
                <p className="mt-1 text-[10px] font-bold text-[#8A9288]">déposé le {dateCourteIso(s.creeLe)}{s.traiteLe ? ` · traité le ${dateCourteIso(s.traiteLe)}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ NOTIFICATIONS ══════════════════════════════ */

function NotificationsTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, notifs, majNotifs } = p.ctx;

  const mesNotifs = notifs.filter((n) =>
    n.destinataire === moi.id || n.destinataire === "tous" ||
    (n.destinataire !== "president" && nomCle(n.destinataireNom) === nomCle(moi.nom)),
  );
  const nonLues = mesNotifs.filter((n) => !n.lu);

  const marquerLu = (id: string) => {
    const next = notifs.map((n) => (n.id === id ? { ...n, lu: true } : n));
    majNotifs(next);
    saveNotifs(next);
  };

  const toutMarquerLu = () => {
    const ids = new Set(mesNotifs.map((n) => n.id));
    const next = notifs.map((n) => (ids.has(n.id) ? { ...n, lu: true } : n));
    majNotifs(next);
    saveNotifs(next);
    toast.success("Toutes vos notifications sont marquées lues");
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Journal du membre</p>
            <p className="fc-serif text-[15px] font-bold text-[#2B3530]">{nonLues.length} non lue(s) sur {mesNotifs.length}</p>
          </div>
          {nonLues.length > 0 && <Btn tone="neutre" onClick={toutMarquerLu}><CheckCircle2 className="h-4 w-4" /> Tout marquer lu</Btn>}
        </div>
      </FcCard>

      <Block title="Tout ce que le bureau m'a notifié" icon={<ReceiptText className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Absences & amendes, rachats, visas, convocations à confirmer, décisions, courriers — le journal complet de ma vie de membre.">
        {mesNotifs.length === 0 ? (
          <Vide icon={<ReceiptText className="h-6 w-6" />} texte="Aucune notification" note="Dès que le secrétariat vous notifie quelque chose, cela arrive ici (et le badge de l'onglet s'allume)." />
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mesNotifs.map((n) => (
              <li key={n.id} className={`flex items-start gap-2.5 px-4 py-3 ${n.lu ? "" : "bg-[#A5473D]/6"}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lu ? "bg-[#C9D2CB]" : "bg-[#A5473D]"}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12.5px] font-bold text-[#2B3530]">{n.titre}</p>
                    <P cls={n.type === "amende" ? RJ_CLS : n.type === "convocation" ? VI_CLS : n.type === "decision" ? TE_CLS : OR_CLS}>{n.type}</P>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[#5C6B60]">{n.message}</p>
                  <p className="mt-1 text-[10px] font-bold text-[#8A9288]">{n.le}</p>
                </div>
                {!n.lu && (
                  <button type="button" onClick={() => marquerLu(n.id)}
                    className="shrink-0 rounded-full border border-[#E5DCC0] bg-white px-2.5 py-1 text-[10.5px] font-bold text-[#5C6B60] hover:border-[#A5473D]/50 hover:text-[#A5473D]">
                    Marquer lu
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════════ RÈGLEMENT ══════════════════════════════ */

function ReglementTab(p: { ctx: CtxMembre }): ReactNode {
  const { regl } = p.ctx;
  const lignes: [string, string][] = [
    ["Cotisation de base", `${fcfa(TONTINE.montantCotisation)} / mois`],
    ["Collation", `${fcfa(TONTINE.montantCollation)} / mois par membre`],
    ["Pénalité de retard", fcfa(TONTINE.penaliteRetard)],
    ["Pénalité d'absence", fcfa(TONTINE.penaliteAbsence)],
    ["Taux épargnes & prêts", `${regl.prets.tauxMensuel || regl.epargne.tauxMensuel || 3} % / mois`],
    ["Prêt — plafond", regl.prets.plafondFcfa > 0 ? fcfa(regl.prets.plafondFcfa) : "non plafonné"],
    ["Prêt — durée max", `${regl.prets.dureeMaxMois} mois`],
    ["Avalistes exigés", regl.prets.avalisteObligatoire ? `${regl.prets.nbAvalistes}` : "non obligatoires"],
    ["Quorum des réunions", `${regl.quorumMembres} membres`],
    ["Validation des décisions", `${DELAI_VALIDATION_JOURS} jours sans action du membre = validée par défaut`],
  ];
  const echelons = [
    ["1 — Relance amiable", regl.impayes.echelons.relance],
    ["2 — Mise en demeure écrite", regl.impayes.echelons.miseEnDemeure],
    ["3 — Convocation par le bureau", regl.impayes.echelons.convocation],
    ["4 — Recours aux garants & avalistes", regl.impayes.echelons.garants],
  ] as [string, boolean][];
  const paiements = [
    ["Espèces", regl.impayes.paiements.especes], ["Orange Money", regl.impayes.paiements.orangeMoney],
    ["MTN MoMo", regl.impayes.paiements.mtnMoMo], ["Wave", regl.impayes.paiements.wave],
    ["Virement", regl.impayes.paiements.virement],
  ] as [string, boolean][];

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B]/12 text-[#1E4D2B]"><FileText className="h-4.5 w-4.5" /></span>
            <div>
              <p className="fc-serif text-[15px] font-bold text-[#2B3530]">Règlement de la Tontine — fixé par le bureau</p>
              <p className="text-[11.5px] text-[#5C6B60]">
                Version {regl.version}{regl.publieLe ? ` — publiée le ${dateCourteIso(regl.publieLe)} par ${regl.publiePar}` : " — pas encore publiée"}.
              </p>
            </div>
          </div>
          <P cls={TE_CLS}><CheckCircle2 className="h-3 w-3" /> Lecture pour tous les membres</P>
        </div>
      </FcCard>

      <Block title="Les chiffres en vigueur" icon={<Coins className="h-4.5 w-4.5" />} accent="#1E4D2B"
        note="Fixés par le bureau dans ses consoles (Paramètres) — ce que je vois ici est exactement ce que le bureau a publié.">
        <dl className="grid gap-x-4 gap-y-0 p-4 sm:grid-cols-2">
          {lignes.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-[#E5DCC0]/70 py-2">
              <dt className="text-[12px] font-semibold text-[#5C6B60]">{k}</dt>
              <dd className="text-[12.5px] font-black text-[#2B3530]">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title="Impayés & recouvrement — les échelons" icon={<Gavel className="h-4.5 w-4.5" />} accent="#A5473D"
        note="Personne n'aime parler impayés — mais tout le monde sait ainsi exactement ce qui arrive, sans surprise ni faveur.">
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          {echelons.map(([k, actif]) => (
            <P key={k} cls={actif ? OK_CLS : "border-[#C9D2CB] bg-[#F3F1E9] text-[#8A9288]"}>{actif ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />} {k}</P>
          ))}
          <P cls={TE_CLS}><Wallet className="h-3 w-3" /> Délai de grâce : {regl.impayes.delaiGraceJours} jours</P>
          <P cls={TE_CLS}><Send className="h-3 w-3" /> Relances avant escalade : {regl.impayes.relancesAvantEscalade}</P>
        </div>
      </Block>

      <Block title="Moyens de paiement acceptés" icon={<Wallet className="h-4.5 w-4.5" />} accent="#8A6420"
        note={`Encaisseur : ${regl.impayes.encaisseur === "tresorier" ? "le trésorier" : regl.impayes.encaisseur === "president" ? "le président" : "trésorier + président"}.`}>
        <div className="flex flex-wrap gap-1.5 p-4">
          {paiements.map(([k, actif]) => (
            <P key={k} cls={actif ? OK_CLS : "border-[#C9D2CB] bg-[#F3F1E9] text-[#8A9288]"}>{actif ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />} {k}</P>
          ))}
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════════ MON PROFIL ══════════════════════════════ */

function ProfilTab(p: { ctx: CtxMembre }): ReactNode {
  const { moi, roster, regl } = p.ctx;
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);

  useEffect(() => {
    const t0 = setTimeout(() => setTypesCotis(loadTypesCotisation()), 0);
    return () => clearTimeout(t0);
  }, [p.ctx.tick]);

  const monType = typeDuMembre(moi.id, typesCotis);
  const moiRoster = roster.find((m) => m.id === moi.id);

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E4D2B] to-[#2F6B45] text-[20px] font-black text-white">
            {moi.nom.split(" ").map((x) => x[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="fc-serif text-[17px] font-bold text-[#2B3530]">{moi.nom}</p>
            <p className="text-[11.5px] text-[#8A9288]">{moi.phone || "téléphone non renseigné"} · {moi.city}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <P cls={VI_CLS}><UserCheck className="h-3 w-3" /> {ROLE_META[moi.role].label}</P>
              <P cls={OR_CLS}><Crown className="h-3 w-3" /> Tour n°{moi.tour} — {moisDuTour(moi.tour)}</P>
              {monType && <P cls={TE_CLS}><Wallet className="h-3 w-3" /> {monType.nom} — {fcfa(monType.montant)}/mois</P>}
              {!monType && <P cls={TE_CLS}><Wallet className="h-3 w-3" /> Cotisation de base — {fcfa(TONTINE.montantCotisation)}/mois</P>}
            </div>
          </div>
        </div>
        {!moi.connecte && (
          <p className="mt-3 rounded-xl bg-[#C89F62]/12 px-3 py-2 text-[11.5px] font-semibold text-[#8A6420]">
            Aperçu de démonstration — connectez-vous depuis l&apos;application pour que cet espace porte VOS données
            (cotisations, épargnes, prêts, amendes, convocations).
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {p.ctx.voirApp && <Btn tone="vert" onClick={p.ctx.voirApp}><Users className="h-4 w-4" /> Ouvrir l&apos;application famille</Btn>}
          <a href="https://wa.me/?text=Je%20vous%20invite%20dans%20la%20Tontine%20Mbeutetsa%20—%20demandez%20votre%20code%20d'invitation%20au%20bureau%20!%20(FamilleConnect)"
            target="_blank" rel="noreferrer">
            <Btn tone="teal"><Send className="h-4 w-4" /> Inviter un proche par WhatsApp</Btn>
          </a>
        </div>
      </FcCard>

      <Block title="Ma fiche de membre" icon={<User className="h-4.5 w-4.5" />} accent="#3D6B72"
        note="Ce que la Tontine connaît de moi — pour corriger un détail, demandez au secrétariat (ou créez votre fiche avec un code d'invitation).">
        <dl className="grid gap-x-4 gap-y-0 p-4 sm:grid-cols-2">
          {([
            ["Identifiant", moi.id],
            ["Statut", moiRoster ? (moiRoster.fictif ? "membre de démonstration" : "membre enregistré via l'application") : "—"],
            ["Ancienneté", moiRoster?.since ? `depuis ${moiRoster.since}` : "—"],
            ["Ville", moi.city],
            ["Mon tour de bénéficiaire", `n°${moi.tour} — ${moisDuTour(moi.tour)}`],
            ["Type de cotisation", monType ? monType.nom : "cotisation de base"],
            ["Quorum des réunions", `${regl.quorumMembres} membres`],
            ["Règlement en vigueur", `version ${regl.version}`],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-[#E5DCC0]/70 py-2">
              <dt className="text-[12px] font-semibold text-[#5C6B60]">{k}</dt>
              <dd className="max-w-[60%] truncate text-[12.5px] font-black text-[#2B3530]">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>
    </>
  );
}

/* ══════════════════════════════ LA CONSOLE ESPACE MEMBRE ══════════════════════════════ */

export function EspaceMembre({ voirApp }: { voirApp?: () => void }) {
  const [tab, setTab] = useState<TabKey>("accueil");
  const [moi, setMoi] = useState<Moi>(DEMO_MOI);
  const [roster, setRoster] = useState<Member[]>(MEMBRES_FICTIFS);
  const [postes, setPostes] = useState<PostesMap>(loadPostes());
  const [regl, setRegl] = useState<Reglement>(() => loadReglement());
  const [annee, setAnnee] = useState(2026);
  const [moisCourantIdx, setMoisCourantIdx] = useState<number | null>(null);
  const [cotisMois, setCotisMois] = useState<Record<string, MouvementCotisMois>>({});
  const [convos, setConvos] = useState<ConvocationV2[]>([]);
  const [notifs, setNotifs] = useState<NotifBureau[]>([]);
  const [amendes, setAmendes] = useState<Amende[]>([]);
  const [epargnesWorkflow, setEpargnesWorkflow] = useState<Epargne[]>([]);
  const [decisionsTaux, setDecisionsTaux] = useState<DecisionTaux[]>([]);
  const [tick, setTick] = useState(0);
  const [donneesPretes, setDonneesPretes] = useState(false);

  /* — chargement initial (hydratation sûre : setTimeout 0) — */
  useEffect(() => {
    const t0 = setTimeout(() => {
      setTab(tabFromHash());
      const { moi: m, roster: r } = resoudreMoi();
      setMoi(m);
      setRoster(r);
      setPostes(loadPostes());
      loadMontants();
      setRegl(loadReglement());
      const d = new Date();
      setAnnee(d.getFullYear());
      setMoisCourantIdx(d.getMonth());
      setCotisMois(chargerCotisMois());
      setConvos(loadConvocations());
      setNotifs(loadNotifs());
      setAmendes(loadAmendes());
      setEpargnesWorkflow(loadEpargnes());
      setDecisionsTaux(loadDecisionsTaux());
      setDonneesPretes(true);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  /* — synchro cross-onglet : ce que le bureau écrit (secrétaire, président)
   *    arrive ICI aussitôt — et réciproquement. — */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const k = e.key ?? "";
      if (["fc_convocations_v1", "fc_notifications_v1", "fc_amendes_v1", "fc_secretaire_cotis_mois_v1",
        "fc_epargnes_reunion_v1", "fc_prets_reunion_v1", "fc_prets_demandes_v1", "fc_tontine_decisions_v1",
        "fc_tontine_epargnes_v1", "fc_tontine_prets_v1", "fc_demo_db_v2", "fc_tontine_role_v1"].includes(k)) {
        setTimeout(() => {
          setCotisMois(chargerCotisMois());
          setConvos(loadConvocations());
          setNotifs(loadNotifs());
          setAmendes(loadAmendes());
          setEpargnesWorkflow(loadEpargnes());
          setDecisionsTaux(loadDecisionsTaux());
          const { moi: m, roster: r } = resoudreMoi();
          setMoi(m);
          setRoster(r);
          setTick((t) => t + 1);
        }, 0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* — URL : retour navigateur / lien profond #membre/<onglet> — */
  useEffect(() => {
    const onHash = () => {
      const h = (window.location.hash || "").toLowerCase();
      if (h.startsWith("#membre")) setTab(tabFromHash());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const moisKey = useMemo(() => moisKeyOf(annee, moisCourantIdx ?? 0), [annee, moisCourantIdx]);

  /* — BADGES INTELLIGENTS (mémoire des vus, comme les consoles du bureau) :
   *    convocations à répondre, notifications non lues, amendes dues,
   *    décisions du bureau à valider. — */
  const badges = useMemo(() => {
    const aRepondre = convos.filter((c) => c.destinataires[moi.id]?.statut === "envoyee").length;
    const nNonLues = notifs.filter((n) =>
      (n.destinataire === moi.id || n.destinataire === "tous" ||
        (n.destinataire !== "president" && nomCle(n.destinataireNom) === nomCle(moi.nom))) && !n.lu,
    ).length;
    const nAmendes = amendes.filter((a) => a.membreId === moi.id && a.statut === "due").length;
    const nValidations =
      decisionsTaux.filter((d) => enAttenteMembre(d)).length +
      epargnesWorkflow.filter((e) => enAttenteMembre(e)).length;
    return {
      convocations: aRepondre,
      notifications: nNonLues,
      amendes: nAmendes,
      validations: nValidations,
    } as Partial<Record<TabKey, number>>;
  }, [convos, notifs, amendes, decisionsTaux, epargnesWorkflow, moi]);

  const vu = useOngletsVus<TabKey>("fc_onglets_vus_membre_v1", tab, badges, donneesPretes);

  const ongletsAvecBadges = useMemo(
    () => ONGLETS_MEMBRE.map((o) => ({ ...o, badge: vu(o.key) })),
    [vu],
  );

  const ctx: CtxMembre = {
    moi, roster, postes, regl, annee, moisCourantIdx: moisCourantIdx ?? 0, moisKey,
    cotisMois,
    majCotisMois: setCotisMois,
    amendes,
    convos,
    majConvo: (c) => setConvos((prev) => prev.map((x) => (x.id === c.id ? c : x))),
    notifs,
    majNotifs: setNotifs,
    epargnesWorkflow,
    majEpargnesWorkflow: setEpargnesWorkflow,
    decisionsTaux,
    majDecisionsTaux: setDecisionsTaux,
    tick,
    voirApp,
  };

  const aller = (t: TabKey) => { setTab(t); goTab(t); };

  const contenu: Record<TabKey, ReactNode> = {
    accueil: <MembreAccueil ctx={ctx} aller={aller} />,
    cotisations: <MesCotisationsTab ctx={ctx} />,
    epargnes: <MesEpargnesTab ctx={ctx} />,
    prets: <MesPretsTab ctx={ctx} />,
    amendes: <MesAmendesTab ctx={ctx} />,
    convocations: <MesConvocationsTab ctx={ctx} />,
    reunions: <ReunionsTab ctx={ctx} />,
    pv: <PvTab ctx={ctx} />,
    membres: <AnnuaireTab ctx={ctx} />,
    solidarite: <SolidariteTab ctx={ctx} />,
    validations: <ValidationsTab ctx={ctx} />,
    signalements: <SignalementsTab ctx={ctx} />,
    notifications: <NotificationsTab ctx={ctx} />,
    reglement: <ReglementTab ctx={ctx} />,
    profil: <ProfilTab ctx={ctx} />,
  };

  const groupes: GroupeOnglets<TabKey>[] = useMemo(
    () => SECTIONS_MEMBRE.map((g) => ({
      ...g,
      onglets: g.onglets.map((o) => ongletsAvecBadges.find((x) => x.key === o.key) ?? o),
    })),
    [ongletsAvecBadges],
  );

  const nbNonLues = (badges.notifications ?? 0) + (badges.convocations ?? 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 pb-10 pt-3 sm:px-4">
      <EnteteConsole
        accent="#1E4D2B" accentClair="#2F6B45"
        surtitre="Espace Membre — la Tontine au quotidien"
        titre={`Espace Membre — ${moi.nom}`}
        sousTitre={moi.connecte
          ? `${ROLE_META[moi.role].label} · tour n°${moi.tour} (${moisDuTour(moi.tour)}) · ${moi.city} — tout ce que vous faites ici rejoint les registres du bureau.`
          : "Aperçu de démonstration (Patrick Talla, membre simple) — connectez-vous pour porter vos propres données."}
        icon={<Users className="h-6 w-6" />}
        badges={
          <>
            <P cls="border-white/25 bg-white/10 text-white"><Users className="h-3 w-3" /> {roster.length} membres</P>
            <P cls={nbNonLues > 0 ? "border-[#C89F62] bg-[#C89F62] text-[#2B2416]" : "border-white/25 bg-white/10 text-white"}>
              <Mail className="h-3 w-3" /> {nbNonLues > 0 ? `${nbNonLues} action(s) attendue(s)` : "aucune action attendue"}
            </P>
            <P cls="border-white/25 bg-white/10 text-white"><Crown className="h-3 w-3" /> {TONTINE.jourLabel}</P>
            {voirApp && (
              <button type="button" onClick={voirApp}
                className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white transition hover:bg-white/20">
                <User className="h-3 w-3" /> Ouvrir l&apos;application
              </button>
            )}
          </>
        }
      />

      <NavOnglets<TabKey>
        ariaLabel="Sections de l'espace membre"
        etiquette="Espace membre — 3 sections · 15 onglets, chacun avec son URL"
        etiquetteCourte="Espace membre"
        couleurPoint="#1E4D2B"
        groupes={groupes}
        actif={tab}
        goTab={aller}
        render={(t, actif) => (
          <button
            key={t.key}
            type="button"
            onClick={() => aller(t.key)}
            aria-current={actif ? "page" : undefined}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[12.5px] font-bold transition-all active:scale-[0.97] ${
              actif
                ? "border-[#C89F62] bg-[#C89F62] text-[#2B2416] shadow-[0_4px_14px_rgba(200,159,98,0.4)]"
                : "border-[#E5DCC0] bg-white text-[#2B3530] hover:border-[#C89F62]/60 hover:bg-[#FBF7EA]"
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${actif ? "bg-[#2B2416] text-[#C89F62]" : "bg-[#A5473D] text-white"}`}>
                {t.badge}
              </span>
            )}
          </button>
        )}
      />

      <div className="mt-3 space-y-3.5">{contenu[tab]}</div>
    </div>
  );
}
