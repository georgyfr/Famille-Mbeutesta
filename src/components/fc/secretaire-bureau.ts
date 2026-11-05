// ─────────────────────────────────────────────────────────────────────────────
// REGISTRES DE LA SECRÉTAIRE (v22) — Famille.Mbeutetsa
//
// Tout ce que la secrétaire enregistre est ÉCRIT AUTOMATIQUEMENT dans le
// localStorage — aucun bouton « enregistrer » : le clic EST l'enregistrement.
// Les trois stores majeurs restent partagés avec le président :
//   · fc_epargnes_reunion_v1 / fc_prets_reunion_v1 (registres-bureau.ts) ;
//   · fc_reglement_v2 (reglement.ts) — le taux co-signé.
// Stores propres au secrétariat (créés v22) :
//   · fc_secretaire_params_v1 — le PARAMÉTRAGE du secrétariat (présences &
//     amendes, types de décisions & d'archives, convocations & sanctions) ;
//   · fc_presences_v1      — l'HISTORIQUE des appels, mois par mois ;
//   · fc_pvs_v1            — les procès-verbaux (brouillon → finalisé → archivé) ;
//   · fc_seances_v1        — les ordres du jour des séances ;
//   · fc_decisions_v1      — le journal des décisions (avec suivi d'actions) ;
//   · fc_convocations_v1   — les convocations (destinataires, confirmations,
//                            justifications texte + message vocal) ;
//   · fc_amendes_v1        — les amendes AUTOMATIQUES générées par le moteur ;
//   · fc_notifications_v1  — le journal des notifications (membres + bureau) ;
//   · fc_epargnes_visas_v1 — les visas de la secrétaire sur le registre.
//
// LE MOTEUR (v22, demande du président) : à chaque changement d'appel, les
// compteurs de chaque membre sont recalculés (absences consécutives, sur 6
// mois, sur l'année, excusés consécutifs) et les RÈGLES configurées dans
// Paramètres s'appliquent TOUTES SEULES : avertissement au membre dès le
// seuil de notification, AMENDE automatique au-delà, rachat automatique des
// absences du mois passé si le membre est présent ce mois, amende
// « convocation confirmée puis absent ». Chaque amende et chaque notification
// porte un ID DÉTERMINISTE (membre + règle + mois) : réévaluer deux fois ne
// duplique rien — le moteur est idempotent.
// ─────────────────────────────────────────────────────────────────────────────

import { MOIS_FR } from "./tontine-data";
import { dateCourte } from "./maquette-ui";

/* ─── états de présence ─── */
export type PresenceEtat = "attente" | "present" | "excuse" | "absent";

export const ETATS_PRESENCE: { cle: PresenceEtat; label: string }[] = [
  { cle: "present", label: "Présent" },
  { cle: "excuse", label: "Excusé" },
  { cle: "absent", label: "Absent" },
  { cle: "attente", label: "Attente" },
];

/* ─── clés du stockage ─── */
const CLE_PARAMS = "fc_secretaire_params_v1";
const CLE_PVS = "fc_pvs_v1";
const CLE_PRES = "fc_presences_v1";
const CLE_SEANCES = "fc_seances_v1";
const CLE_DECISIONS = "fc_decisions_v1";
const CLE_CONVOS = "fc_convocations_v1";
const CLE_AMENDES = "fc_amendes_v1";
const CLE_NOTIFS = "fc_notifications_v1";
const CLE_VISAS = "fc_epargnes_visas_v1";

/* ═══════════════════ mois : clés "2026-10", précédent, libellé ═════════════ */

export function moisKeyOf(annee: number, moisIdx: number): string {
  /* Convention des clés : mois 1-12 (01 = janvier … 12 = décembre) — les
   * seeds d'historique et labelMoisKey sont dans cette convention ; l'appelant
   * passe le mois getMonth() (0-11) d'où le +1. */
  return `${annee}-${String(Math.min(11, Math.max(0, moisIdx)) + 1).padStart(2, "0")}`;
}

/** Clé du mois précédent ("2026-01" → "2025-12"). */
export function moisKeyPrecedent(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  const annee = Number(m[1]);
  const mois = Number(m[2]);
  return mois <= 1 ? `${annee - 1}-12` : `${annee}-${String(mois - 1).padStart(2, "0")}`;
}

/** Libellé humain d'une clé de mois ("2026-10" → "octobre 2026"). */
export function labelMoisKey(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return key;
  return `${MOIS_FR[Number(m[2]) - 1]} ${m[1]}`;
}

/** Les n derniers mois, du plus ancien au mois courant inclus. */
export function derniersMoisKeys(moisCourant: string, n: number): string[] {
  const out: string[] = [moisCourant];
  for (let i = 1; i < Math.max(1, n); i++) out.unshift(moisKeyPrecedent(out[0]));
  return out;
}

/* ═══════════════════ paramétrage du secrétariat ═══════════════════ */

export type ParamsPresences = {
  activer: boolean;
  /** Absences CONSÉCUTIVES → amende. */
  absConsSeuil: number;
  amendeAbsCons: number;
  /** Absences sur les 6 derniers mois (fenêtre glissante) → amende. */
  abs6Seuil: number;
  amendeAbs6: number;
  /** Absences sur les 12 derniers mois (excédent annuel) → amende. */
  absAnneeSeuil: number;
  amendeAbsAnnee: number;
  /** Excusés consécutifs → amende (la famille exige la présence réelle). */
  excuseConsSeuil: number;
  amendeExcuseCons: number;
  /** Présent ce mois ⇒ les absences du mois passé sont AUTOMATIQUEMENT annulées. */
  rachatAuto: boolean;
  /** Le membre est prévenu dès N absences consécutives. */
  notifierDes: number;
};

export type ParamsDecisions = {
  types: string[];
  typesArchives: string[];
};

export type ParamsConvocations = {
  types: string[];
  /** Rappel automatique N jours avant la réunion. */
  rappelJours: number;
  /** Amende « a confirmé la convocation puis absent ». */
  sanctionActif: boolean;
  amendeConfirmeAbsent: number;
};

export type ParamsSecretaire = {
  presences: ParamsPresences;
  decisions: ParamsDecisions;
  convocations: ParamsConvocations;
};

export const PARAMS_DEFAUT: ParamsSecretaire = {
  presences: {
    activer: true,
    absConsSeuil: 3,
    amendeAbsCons: 7500,
    abs6Seuil: 3,
    amendeAbs6: 5000,
    absAnneeSeuil: 4,
    amendeAbsAnnee: 10000,
    excuseConsSeuil: 3,
    amendeExcuseCons: 3000,
    rachatAuto: true,
    notifierDes: 2,
  },
  decisions: {
    types: ["Financière", "Organisation", "Discipline", "Solidarité", "Événement", "Autre"],
    typesArchives: ["Procès-verbal", "Liste de présence", "Convocation", "Rapport", "Courrier", "Pièce comptable", "Autre"],
  },
  convocations: {
    types: ["Réunion ordinaire", "Réunion extraordinaire", "Assemblée générale", "Information"],
    rappelJours: 3,
    sanctionActif: true,
    amendeConfirmeAbsent: 5000,
  },
};

function lireObj<T>(cle: string, defaut: T, valide: (x: unknown) => x is T): T {
  if (typeof window === "undefined") return defaut;
  try {
    const raw = window.localStorage.getItem(cle);
    if (!raw) return defaut;
    const data: unknown = JSON.parse(raw);
    return valide(data) ? data : defaut;
  } catch {
    return defaut;
  }
}

function ecrireObj(cle: string, valeur: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

const estParams = (x: unknown): x is ParamsSecretaire =>
  !!x && typeof x === "object" && "presences" in x && "decisions" in x && "convocations" in x;

export function loadParamsSecretaire(): ParamsSecretaire {
  const p = lireObj(CLE_PARAMS, PARAMS_DEFAUT, estParams);
  /* fusion défensive : les nouveaux champs des versions à venir héritent du défaut */
  return {
    presences: { ...PARAMS_DEFAUT.presences, ...(p.presences ?? {}) },
    decisions: { ...PARAMS_DEFAUT.decisions, ...(p.decisions ?? {}) },
    convocations: { ...PARAMS_DEFAUT.convocations, ...(p.convocations ?? {}) },
  };
}

export function saveParamsSecretaire(p: ParamsSecretaire): void {
  ecrireObj(CLE_PARAMS, p);
}

export function reinitialiserParams(): ParamsSecretaire {
  ecrireObj(CLE_PARAMS, PARAMS_DEFAUT);
  return PARAMS_DEFAUT;
}

/* ═══════════════════ procès-verbaux ═══════════════════ */

export type StatutPV = "brouillon" | "finalise" | "archive";
export type PV = {
  id: string;
  titre: string;
  le: string;
  statut: StatutPV;
  contenu: string;
  /** Type d'archive choisi au moment de l'archivage (Paramètres → types d'archives). */
  archiveType?: string;
};

const PV_DEMO: PV[] = [
  {
    id: "pv-sep", titre: "Procès-verbal — réunion de septembre", le: "14 sept.", statut: "archive",
    archiveType: "Procès-verbal",
    contenu: "Réunion tenue le 2ᵉ dimanche de septembre au domicile de la famille Mbeutetsa, Douala. "
      + "Appel : 10 membres, 8 présents, 1 absent (Hervé Fotso — retenu à Yaoundé). "
      + "Cotisations encaissées par le trésorier Émile Tchoumi. "
      + "Décision du bureau : le taux mensuel des épargnes et prêts est MAINTENU à 3 %. "
      + "Prochaine réunion : 2ᵉ dimanche d'octobre — collation assurée par la famille Talla.",
  },
  {
    id: "pv-oct", titre: "Procès-verbal — réunion d'octobre", le: "12 oct.", statut: "finalise",
    contenu: "Réunion tenue le 2ᵉ dimanche d'octobre. Appel : 10 membres, 8 présents, 1 excusé (Roger Ndoumbe), 1 absent (Hervé Fotso — deuxième absence consécutive). "
      + "Remise de la somme du mois au bénéficiaire Aurélie Simo — accusé de remise signé devant témoin. "
      + "Deux signalements examinés (épargne d'octobre mal montée, dette de P. Talla corrigée au registre). "
      + "La cotation de novembre est rappelée à tous : aucune exception, président compris.",
  },
  {
    id: "pv-nov", titre: "Procès-verbal — réunion de novembre", le: "—", statut: "brouillon",
    contenu: "Appel : (à compléter après la séance).\n\nPoint 1 — Cotisations du mois : …\n\nPoint 2 — Remise au bénéficiaire : …\n\nPoint 3 — Divers : …",
  },
];

const estPVs = (x: unknown): x is PV[] =>
  Array.isArray(x) && x.every((p) => p && typeof (p as PV).id === "string" && typeof (p as PV).titre === "string");

export function loadPVs(): PV[] {
  return lireObj(CLE_PVS, PV_DEMO, estPVs);
}
export function savePVs(liste: PV[]): void {
  ecrireObj(CLE_PVS, liste);
}

/* ═══════════════════ historique des présences ═══════════════════ */

export type HistoriquePresences = Record<string, Record<string, PresenceEtat>>;

/** Seed de démonstration : août–octobre sont FIGÉS (l'histoire de la famille),
 *  novembre démarre comme l'appel de la v19 — f09 déjà absent, quelques
 *  attente. L'histoire rend les fenêtres 6 mois / année et les absences
 *  consécutives IMMÉDIATEMENT démontrables. */
const PRES_DEMO: HistoriquePresences = {
  "2026-08": {
    f01: "present", f02: "present", f03: "present", f04: "present", f05: "present",
    f06: "present", f07: "present", f08: "present", f09: "absent", f10: "present",
  },
  "2026-09": {
    f01: "present", f02: "present", f03: "present", f04: "present", f05: "present",
    f06: "excuse", f07: "present", f08: "present", f09: "absent", f10: "present",
  },
  "2026-10": {
    f01: "present", f02: "present", f03: "present", f04: "present", f05: "excuse",
    f06: "present", f07: "present", f08: "present", f09: "absent", f10: "present",
  },
  "2026-11": {
    f01: "present", f02: "present", f03: "attente", f04: "present", f05: "excuse",
    f06: "present", f07: "attente", f08: "present", f09: "absent", f10: "attente",
  },
};

const estHist = (x: unknown): x is HistoriquePresences =>
  !!x && typeof x === "object" && !Array.isArray(x);

export function loadPresences(): HistoriquePresences {
  return lireObj(CLE_PRES, PRES_DEMO, estHist);
}
export function savePresences(h: HistoriquePresences): void {
  ecrireObj(CLE_PRES, h);
}

/* ═══════════════════ séances & ordres du jour ═══════════════════ */

export type StatutPoint = "en_attente" | "traite";
export type PointODJ = {
  id: string;
  titre: string;
  detail: string;
  responsable: string;
  statut: StatutPoint;
};

export type Seance = {
  id: string;
  /** Clé de mois ("2026-11") — une séance par réunion mensuelle. */
  moisKey: string;
  points: PointODJ[];
};

const SEANCE_DEMO: Seance[] = [
  {
    id: "seance-nov",
    moisKey: "2026-11",
    points: [
      { id: "oj1", titre: "Appel des membres & lecture du PV d'octobre", detail: "L'appel ouvre la séance ; le PV finalisé est lu puis approuvé.", responsable: "Secrétaire", statut: "en_attente" },
      { id: "oj2", titre: "Collecte des cotisations & collations", detail: "Encaissement par le trésorier — reçus à l'appui.", responsable: "Trésorier", statut: "en_attente" },
      { id: "oj3", titre: "Remise au bénéficiaire du mois", detail: "Somme du pot remise au bénéficiaire — accusé de remise signé.", responsable: "Président", statut: "en_attente" },
      { id: "oj4", titre: "Divers & question d'actualité", detail: "Point libre où chaque membre s'exprime.", responsable: "Bureau", statut: "en_attente" },
    ],
  },
];

const estSeances = (x: unknown): x is Seance[] =>
  Array.isArray(x) && x.every((s) => s && typeof (s as Seance).moisKey === "string" && Array.isArray((s as Seance).points));

export function loadSeances(): Seance[] {
  return lireObj(CLE_SEANCES, SEANCE_DEMO, estSeances);
}
export function saveSeances(liste: Seance[]): void {
  ecrireObj(CLE_SEANCES, liste);
}

/* ═══════════════════ journal des décisions ═══════════════════ */

export type StatutDecision = "inscrite" | "en_cours" | "realisee" | "archivee";
export type ActionSuivi = { le: string; action: string; note?: string };
export type DecisionJ = {
  id: string;
  type: string;
  point: string;
  texte: string;
  responsable: string;
  le: string;
  echeance?: string | null;
  statut: StatutDecision;
  /** Journal d'actions : chaque action émise sur la décision est tracée. */
  suivi: ActionSuivi[];
};

const DECISIONS_DEMO: DecisionJ[] = [
  {
    id: "d1", type: "Financière", point: "Taux des épargnes & prêts",
    texte: "Taux mensuel fixé à 3 % pour toute l'année — décision conjointe président + secrétaire, publiée au registre.",
    responsable: "Président + Secrétaire", le: "09:12", statut: "realisee",
    suivi: [{ le: "09:12", action: "Décision inscrite au journal" }, { le: "12 oct.", action: "Marquée réalisée — taux publié aux membres" }],
  },
  {
    id: "d2", type: "Financière", point: "Épargne d'octobre (Bernadette Kamga)",
    texte: "Montant erroné au registre : corrigé à 25 000 FCFA après vérification du reçu.",
    responsable: "Trésorier", le: "08:47", statut: "realisee",
    suivi: [{ le: "08:47", action: "Décision inscrite au journal" }, { le: "08:58", action: "Marquée réalisée — registre corrigé et visé" }],
  },
  {
    id: "d3", type: "Discipline", point: "Dette de Patrick Talla",
    texte: "Dette mal insérée au registre — réécrite et validée par le bureau.",
    responsable: "Bureau", le: "08:47", statut: "en_cours",
    suivi: [{ le: "08:47", action: "Décision inscrite au journal" }, { le: "15 oct.", action: "Relance envoyée au trésorier" }],
  },
  {
    id: "d4", type: "Solidarité", point: "Caisse de secours — juin",
    texte: "Aide de 45 000 FCFA décaissée pour la naissance chez la famille Fotso — reçu archivé.",
    responsable: "Trésorier", le: "Hier", echeance: null, statut: "archivee",
    suivi: [{ le: "Hier", action: "Décision inscrite au journal" }, { le: "Hier", action: "Archivée — reçu classé (Pièce comptable)" }],
  },
];

const estDecisions = (x: unknown): x is DecisionJ[] =>
  Array.isArray(x) && x.every((d) => d && typeof (d as DecisionJ).id === "string" && Array.isArray((d as DecisionJ).suivi));

export function loadDecisions(): DecisionJ[] {
  return lireObj(CLE_DECISIONS, DECISIONS_DEMO, estDecisions);
}
export function saveDecisions(liste: DecisionJ[]): void {
  ecrireObj(CLE_DECISIONS, liste);
}

/* ═══════════════════ convocations (v2 : destinataires + réponses) ═════════════ */

export type ReponseConvocation = {
  statut: "envoyee" | "confirmee" | "absence";
  confirmeeLe?: string;
  reponduLe?: string;
  justificationTexte?: string;
  /** Message vocal en dataURL (courts messages < ~30 s) — null si aucun. */
  justificationVocal?: string | null;
};

export type ConvocationV2 = {
  id: string;
  type: string;
  objet: string;
  message: string;
  le: string;
  /** Clé de mois de la réunion convoquée ("2026-11"). */
  moisKey: string;
  /** memberId → réponse du membre. */
  destinataires: Record<string, ReponseConvocation>;
};

const CONVOS_DEMO: ConvocationV2[] = [
  {
    id: "c1", type: "Réunion ordinaire",
    objet: "Réunion d'octobre — cotisation & remise du mois",
    message: "Chers membres, la réunion se tiendra le 2ᵉ dimanche d'octobre à 14 h au domicile de la famille. Merci d'amener votre cotisation et votre contribution collation.",
    le: "5 oct.", moisKey: "2026-10",
    destinataires: {
      f01: { statut: "confirmee", confirmeeLe: "6 oct." },
      f02: { statut: "confirmee", confirmeeLe: "6 oct." },
      f03: { statut: "confirmee", confirmeeLe: "7 oct." },
      f04: { statut: "confirmee", confirmeeLe: "6 oct." },
      f05: { statut: "absence", reponduLe: "9 oct.", justificationTexte: "Déplacement professionnel à Bafoussam — je m'excuse et régulariserai ma cotisation." },
      f06: { statut: "confirmee", confirmeeLe: "6 oct." },
      /* f07 (Patrick, l'aperçu de l'Espace Membre) n'a PAS encore répondu :
       * l'onglet Convocations du membre présente le vrai parcours —
       * confirmer la réception ou notifier son absence (texte + vocal). */
      f07: { statut: "envoyee" },
      f08: { statut: "confirmee", confirmeeLe: "6 oct." },
      f09: { statut: "confirmee", confirmeeLe: "7 oct." },
      f10: { statut: "confirmee", confirmeeLe: "6 oct." },
    },
  },
];

const estConvos = (x: unknown): x is ConvocationV2[] =>
  Array.isArray(x) && x.every((c) => c && typeof (c as ConvocationV2).id === "string" && typeof (c as ConvocationV2).objet === "string" && typeof (c as ConvocationV2).destinataires === "object");

export function loadConvocations(): ConvocationV2[] {
  return lireObj(CLE_CONVOS, CONVOS_DEMO, estConvos);
}
export function saveConvocations(liste: ConvocationV2[]): void {
  ecrireObj(CLE_CONVOS, liste);
}

/* ═══════════════════ amendes automatiques ═══════════════════ */

export type MotifAmende =
  | "absences_consecutives"
  | "absences_6_mois"
  | "absences_annee"
  | "excuses_consecutives"
  | "convocation_confirmee_absent";

export type Amende = {
  /** ID déterministe (membre + règle + mois) : le moteur est idempotent. */
  id: string;
  membreId: string;
  moisKey: string;
  moisLabel: string;
  motif: MotifAmende;
  libelle: string;
  montant: number;
  le: string;
  statut: "due" | "transmise" | "payee";
};

const estAmendes = (x: unknown): x is Amende[] =>
  Array.isArray(x) && x.every((a) => a && typeof (a as Amende).id === "string" && typeof (a as Amende).membreId === "string");

export function loadAmendes(): Amende[] {
  return lireObj(CLE_AMENDES, [], estAmendes);
}
export function saveAmendes(liste: Amende[]): void {
  ecrireObj(CLE_AMENDES, liste);
}

/* ═══════════════════ notifications du bureau ═══════════════════ */

export type TypeNotif = "absence" | "excuse" | "amende" | "rachat" | "visa" | "convocation" | "decision" | "rappel" | "courrier";
export type NotifBureau = {
  /** ID déterministe : upsert, jamais de doublon. */
  id: string;
  le: string;
  /** memberId du roster, ou "president", ou "tous". */
  destinataire: string;
  destinataireNom: string;
  type: TypeNotif;
  titre: string;
  message: string;
  lu: boolean;
};

const estNotifs = (x: unknown): x is NotifBureau[] =>
  Array.isArray(x) && x.every((n) => n && typeof (n as NotifBureau).id === "string" && typeof (n as NotifBureau).message === "string");

export function loadNotifs(): NotifBureau[] {
  return lireObj(CLE_NOTIFS, [], estNotifs);
}
export function saveNotifs(liste: NotifBureau[]): void {
  ecrireObj(CLE_NOTIFS, liste);
}

/** Upsert : la même notification (même id déterministe) est mise à jour, pas dupliquée. */
export function pushNotif(n: Omit<NotifBureau, "lu">): void {
  const liste = loadNotifs();
  const i = liste.findIndex((x) => x.id === n.id);
  if (i >= 0) liste[i] = { ...n, lu: liste[i].lu };
  else liste.unshift({ ...n, lu: false });
  saveNotifs(liste);
}

/* ═══════════════════ visas du registre des épargnes ═══════════════════ */

export type VisaEpargne = { le: string; par: string };
export type VisasEpargnes = Record<string, VisaEpargne>;

const estVisas = (x: unknown): x is VisasEpargnes =>
  !!x && typeof x === "object" && !Array.isArray(x);

export function loadVisas(): VisasEpargnes {
  return lireObj(CLE_VISAS, {}, estVisas);
}
export function saveVisas(v: VisasEpargnes): void {
  ecrireObj(CLE_VISAS, v);
}

/* ═════════════════════════════════════════════════════════════════════════════
   LE MOTEUR — compteurs, rachat automatique, amendes & notifications
   ═════════════════════════════════════════════════════════════════════════════ */

export type StatsPresenceMembre = {
  /** Absences CONSÉCUTIVES à compter du mois courant (l'attente du mois courant
   *  n'interrompt pas la série des mois précédents — l'appel n'est pas fini). */
  absCons: number;
  /** Absences effectives sur les 6 derniers mois (après rachat). */
  abs6: number;
  /** Absences effectives sur les 12 derniers mois (après rachat). */
  absAnnee: number;
  /** Excusés consécutifs (même logique que absCons). */
  excuseCons: number;
  /** Absences du mois précédent. */
  absMoisPrecedent: number;
  /** true si le rachat automatique vient d'annuler les absences du mois passé. */
  rachatApplique: boolean;
  /** Nombre d'absences annulées par le rachat. */
  rachatNb: number;
};

function statutDans(h: HistoriquePresences, moisKey: string, membreId: string): PresenceEtat | null {
  return h?.[moisKey]?.[membreId] ?? null;
}

/** Compte les absences CONSÉCUTIVES en reculant depuis le mois courant.
 *  · "absent" compte ; "present"/"excuse" cassent la série ;
 *  · le mois courant en "attente" est transparent (l'appel n'est pas fini) ;
 *  · un mois sans donnée est transparent. */
function serieConsecutive(h: HistoriquePresences, membreId: string, moisCourant: string, etat: "absent" | "excuse"): number {
  const oppose = etat === "absent" ? "excuse" : "absent";
  let n = 0;
  let mk = moisCourant;
  for (let i = 0; i < 24; i++) {
    const st = statutDans(h, mk, membreId);
    if (st === etat) {
      n++;
    } else if (st === "present" || st === oppose) {
      break; /* état résolu opposé : la série est cassée */
    } else if (i === 0) {
      /* mois courant non appelé (attente / sans donnée) : transparent — la
         série des mois précédents reste visible tant que l'appel est ouvert */
    } else {
      break; /* mois passé jamais appelé : série indéterminée */
    }
    mk = moisKeyPrecedent(mk);
  }
  return n;
}

/** Absences d'un mois donné pour un membre (0 si présent/excusé/attente). */
export function absencesDuMois(h: HistoriquePresences, membreId: string, moisKey: string): number {
  return statutDans(h, moisKey, membreId) === "absent" ? 1 : 0;
}

/** Statistiques COMPLÈTES d'un membre au mois courant — avec rachat automatique :
 *  si le membre est PRÉSENT ce mois et que le rachat est activé, ses absences
 *  du mois précédent sont ANNULÉES (retirées des fenêtres 6 mois / année). */
export function statsPresence(
  h: HistoriquePresences,
  membreId: string,
  moisCourant: string,
  rachatAuto: boolean,
): StatsPresenceMembre {
  const absCons = serieConsecutive(h, membreId, moisCourant, "absent");
  const excuseCons = serieConsecutive(h, membreId, moisCourant, "excuse");
  const moisPasse = moisKeyPrecedent(moisCourant);
  const absMoisPrecedent = absencesDuMois(h, membreId, moisPasse);
  const stCourant = statutDans(h, moisCourant, membreId);
  const rachatApplique = rachatAuto && stCourant === "present" && absMoisPrecedent > 0;

  const compterFenetre = (nMois: number): number => {
    let total = 0;
    for (const mk of derniersMoisKeys(moisCourant, nMois)) {
      if (rachatApplique && mk === moisPasse) continue; /* absences annulées */
      total += absencesDuMois(h, membreId, mk);
    }
    return total;
  };

  return {
    absCons,
    abs6: compterFenetre(6),
    absAnnee: compterFenetre(12),
    excuseCons,
    absMoisPrecedent,
    rachatApplique,
    rachatNb: rachatApplique ? absMoisPrecedent : 0,
  };
}

/** Libellé humain d'un motif d'amende. */
export const MOTIFS_LABELS: Record<MotifAmende, string> = {
  absences_consecutives: "Absences consécutives",
  absences_6_mois: "Absences sur 6 mois",
  absences_annee: "Excédent d'absences annuel",
  excuses_consecutives: "Excusés consécutifs",
  convocation_confirmee_absent: "Convocation confirmée puis absent",
};

export type ResultatEvaluation = {
  stats: StatsPresenceMembre;
  /** Amendes que la configuration PRODUIT pour ce membre au mois courant. */
  amendes: { motif: MotifAmende; libelle: string; montant: number }[];
  /** Avertissement à envoyer au membre (sous les seuils d'amende). */
  avertissement: string | null;
  /** Message de rachat à envoyer au membre. */
  rachat: string | null;
};

/** Évalue UN membre contre la configuration — pur, sans effet de bord. */
export function evaluerMembre(
  h: HistoriquePresences,
  membreId: string,
  nom: string,
  moisCourant: string,
  p: ParamsPresences,
): ResultatEvaluation {
  const st = statsPresence(h, membreId, moisCourant, p.rachatAuto);
  const amendes: { motif: MotifAmende; libelle: string; montant: number }[] = [];
  const moisCourantNom = labelMoisKey(moisCourant);

  if (p.activer && st.absCons >= p.absConsSeuil && p.absConsSeuil > 0) {
    amendes.push({
      motif: "absences_consecutives",
      libelle: `${st.absCons} absences consécutives (seuil : ${p.absConsSeuil})`,
      montant: p.amendeAbsCons,
    });
  }
  if (p.activer && p.abs6Seuil > 0 && st.abs6 >= p.abs6Seuil) {
    amendes.push({
      motif: "absences_6_mois",
      libelle: `${st.abs6} absences sur les 6 derniers mois (seuil : ${p.abs6Seuil})`,
      montant: p.amendeAbs6,
    });
  }
  if (p.activer && p.absAnneeSeuil > 0 && st.absAnnee >= p.absAnneeSeuil) {
    amendes.push({
      motif: "absences_annee",
      libelle: `${st.absAnnee} absences sur l'année — excédent annuel (seuil : ${p.absAnneeSeuil})`,
      montant: p.amendeAbsAnnee,
    });
  }
  if (p.activer && p.excuseConsSeuil > 0 && st.excuseCons >= p.excuseConsSeuil) {
    amendes.push({
      motif: "excuses_consecutives",
      libelle: `${st.excuseCons} excusés consécutifs (seuil : ${p.excuseConsSeuil})`,
      montant: p.amendeExcuseCons,
    });
  }

  /* Avertissement : dès notifierDes absences consécutives, tant qu'aucune
     amende « consécutives » n'est atteinte — le membre sait où il va. */
  let avertissement: string | null = null;
  if (p.activer && p.notifierDes > 0 && amendes.length === 0 && st.absCons >= p.notifierDes) {
    avertissement =
      `Vous avez ${st.absCons} absences consécutives enregistrées par la secrétaire (${moisCourantNom}). `
      + `À ${p.absConsSeuil} absences consécutives, vous serez soumis à une pénalité de ${p.amendeAbsCons.toLocaleString("fr-FR")} FCFA. `
      + `Sur 6 mois : ${st.abs6} absence(s) — seuil ${p.abs6Seuil} (pénalité ${p.amendeAbs6.toLocaleString("fr-FR")} FCFA).`;
  }

  const rachat =
    st.rachatApplique && p.activer
      ? `Bonne nouvelle : votre présence de ${moisCourantNom} annule automatiquement vos ${st.rachatNb} absence(s) de ${labelMoisKey(moisKeyPrecedent(moisCourant))} (rachat automatique activé par le bureau).`
      : null;

  return { stats: st, amendes, avertissement, rachat };
}

/** SYNCHRONISE amendes + notifications d'un membre avec la configuration —
 *  appelée après CHAQUE changement d'appel et au chargement. Idempotent :
 *  les ids sont déterministes (règle + membre + mois). Les amendes « due » du
 *  mois courant qui ne sont plus justifiées par les compteurs sont RETIRÉES ;
 *  celles déjà « transmise »/« payée » (décisions humaines) sont conservées. */
export function syncMembre(
  h: HistoriquePresences,
  membreId: string,
  nom: string,
  moisCourant: string,
  p: ParamsPresences,
): void {
  const { amendes, avertissement, rachat } = evaluerMembre(h, membreId, nom, moisCourant, p);
  const heureActuelle = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const moisCourantNom = labelMoisKey(moisCourant);

  /* — amendes : upsert des justifiées, retrait des « due » non justifiées — */
  const toutes = loadAmendes();
  const justifiees = new Set(amendes.map((a) => a.motif));
  const conserves = toutes.filter((a) => {
    if (a.membreId !== membreId || a.moisKey !== moisCourant) return true;
    if (a.statut !== "due") return true; /* transmise / payée : décision humaine */
    return justifiees.has(a.motif);
  });
  const avec = [...conserves];
  for (const a of amendes) {
    const id = `${a.motif}:${membreId}:${moisCourant}`;
    if (!avec.some((x) => x.id === id)) {
      avec.push({
        id,
        membreId,
        moisKey: moisCourant,
        moisLabel: moisCourantNom,
        motif: a.motif,
        libelle: a.libelle,
        montant: a.montant,
        le: `${dateCourte()} ${heureActuelle}`,
        statut: "due",
      });
    }
  }
  saveAmendes(avec);

  /* — notifications — */
  if (avertissement) {
    pushNotif({
      id: `abs-warn:${membreId}:${moisCourant}`,
      le: `${dateCourte()} ${heureActuelle}`,
      destinataire: membreId,
      destinataireNom: nom,
      type: "absence",
      titre: `Suivi de vos absences — ${nom}`,
      message: avertissement,
    });
  }
  for (const a of amendes) {
    pushNotif({
      id: `abs-amende:${a.motif}:${membreId}:${moisCourant}`,
      le: `${dateCourte()} ${heureActuelle}`,
      destinataire: membreId,
      destinataireNom: nom,
      type: "amende",
      titre: `Amende automatique — ${MOTIFS_LABELS[a.motif]}`,
      message: `${nom} : ${a.libelle}. Une amende de ${a.montant.toLocaleString("fr-FR")} FCFA est enregistrée au ${moisCourantNom} (règle du bureau — Paramètres du secrétariat). Elle sera transmise au trésorier avec la liste de présence.`,
    });
    pushNotif({
      id: `abs-amende-bureau:${a.motif}:${membreId}:${moisCourant}`,
      le: `${dateCourte()} ${heureActuelle}`,
      destinataire: "president",
      destinataireNom: "Président",
      type: "amende",
      titre: `Amende automatique — ${nom}`,
      message: `La secrétaire a enregistré automatiquement : ${a.libelle} — amende de ${a.montant.toLocaleString("fr-FR")} FCFA (${moisCourantNom}).`,
    });
  }
  if (rachat) {
    pushNotif({
      id: `rachat:${membreId}:${moisCourant}`,
      le: `${dateCourte()} ${heureActuelle}`,
      destinataire: membreId,
      destinataireNom: nom,
      type: "rachat",
      titre: `Absences annulées — ${nom}`,
      message: rachat,
    });
  }
}

/** Amende « a confirmé la convocation puis absent » — appelée par le moteur
 *  quand l'appel marque ABSENT un membre qui avait CONFIRMÉ la convocation
 *  du mois courant. */
export function sanctionnerConvocationManquee(
  membreId: string,
  nom: string,
  moisCourant: string,
  p: ParamsConvocations,
  objetConvocation: string,
): void {
  if (!p.sanctionActif || p.amendeConfirmeAbsent <= 0) return;
  const heureActuelle = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const id = `convocation_confirmee_absent:${membreId}:${moisCourant}`;
  const toutes = loadAmendes();
  if (!toutes.some((a) => a.id === id)) {
    toutes.push({
      id,
      membreId,
      moisKey: moisCourant,
      moisLabel: labelMoisKey(moisCourant),
      motif: "convocation_confirmee_absent",
      libelle: `A confirmé « ${objetConvocation} » puis absent à la réunion`,
      montant: p.amendeConfirmeAbsent,
      le: `${dateCourte()} ${heureActuelle}`,
      statut: "due",
    });
    saveAmendes(toutes);
  }
  pushNotif({
    id: `conv-sanction:${membreId}:${moisCourant}`,
    le: `${dateCourte()} ${heureActuelle}`,
    destinataire: membreId,
    destinataireNom: nom,
    type: "amende",
    titre: `Convocation confirmée puis absent — ${nom}`,
    message: `Vous aviez confirmé la convocation « ${objetConvocation} » et vous êtes absent(e) à la réunion : une amende de ${p.amendeConfirmeAbsent.toLocaleString("fr-FR")} FCFA est enregistrée (règle du bureau — Paramètres du secrétariat).`,
  });
  pushNotif({
    id: `conv-sanction-bureau:${membreId}:${moisCourant}`,
    le: `${dateCourte()} ${heureActuelle}`,
    destinataire: "president",
    destinataireNom: "Président",
    type: "amende",
    titre: `Convocation non honorée — ${nom}`,
    message: `${nom} avait confirmé la convocation « ${objetConvocation} » et est absent(e) : amende de ${p.amendeConfirmeAbsent.toLocaleString("fr-FR")} FCFA enregistrée automatiquement.`,
  });
}

/* petite note d'horodatage : la date courte vient de maquette-ui (partagée) */

/** Réinitialise TOUTES les données du secrétariat (Paramètres → zone de démo). */
export function reinitialiserDonneesSecretariat(): void {
  for (const cle of [CLE_PARAMS, CLE_PVS, CLE_PRES, CLE_SEANCES, CLE_DECISIONS, CLE_CONVOS, CLE_AMENDES, CLE_NOTIFS, CLE_VISAS]) {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(cle); } catch { /* rien */ }
    }
  }
}
