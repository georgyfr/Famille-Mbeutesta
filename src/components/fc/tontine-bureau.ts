"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Le BUREAU de la cantine — Famille.Mbeutetsa
//
// Règles posées par l'administrateur (2026-11) :
//
//   1. TAUX MENSUEL — ne doit JAMAIS être modifié par un simple membre.
//      Seuls le PRÉSIDENT et le SECRÉTAIRE règlent le pourcentage.
//   2. NOUVELLES ÉPARGNES — la validation appartient au bureau (président ou
//      secrétaire). Le membre ne peut que VALIDER ce que le bureau décide.
//   3. DÉLAI DE 7 JOURS — si le membre n'a pas validé le choix du bureau après
//      7 jours, l'épargne (ou le prêt, ou le taux) est reconnue validée par
//      défaut. Rien ne bloque jamais l'épargne du membre.
//   4. SIGNALEMENTS — chaque élément (épargne, dette, taux…) porte un bouton
//      « Signaler un problème » avec un pop-up enregistré. Tous les membres du
//      bureau sont notifiés ; si le signalement reste sans action, la
//      notification RÉAPPARAÎT TOUS LES 3 JOURS jusqu'à son traitement.
//   5. DETTES — allouées par les acteurs du bureau. Un membre ne peut ni les
//      supprimer ni les modifier : il peut les rembourser ou les signaler.
//
// Ce module tient : le rôle de la personne connectée, les permissions, les
// signalements, le journal des décisions du bureau et l'auto-validation.
// ─────────────────────────────────────────────────────────────────────────────

import {
  TAUX_DEFAUT, loadTaux, saveTaux, uid,
  type Epargne, type Pret, type RoleKey, type Workflow,
} from "./tontine-data";

/* ══════════════════════════ rôle de la personne connectée ══════════════════════════ */

const ROLE_KEY = "fc_tontine_role_v1";

/** Rôle renseigné à l'inscription (« quel rôle jouez-vous dans la cantine ? »). */
export function loadVousRole(): RoleKey | null {
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    if (!raw) return null;
    const r = raw.trim();
    const ok: RoleKey[] = ["president", "vice_president", "secretariat", "commissaire", "tresorier", "censeur", "membre"];
    return ok.includes(r as RoleKey) ? (r as RoleKey) : null;
  } catch {
    return null;
  }
}

export function saveVousRole(r: RoleKey): void {
  try {
    localStorage.setItem(ROLE_KEY, r);
  } catch {
    /* stockage indisponible — rôle gardé en mémoire pour la session */
  }
}

/* ══════════════════════════ permissions du bureau ══════════════════════════ */

/** Le taux mensuel : PRÉSIDENT et SECRÉTAIRE uniquement. */
export const peutGererTaux = (r: RoleKey | null) => r === "president" || r === "secretariat";

/** Valider les nouvelles épargnes : PRÉSIDENT et SECRÉTAIRE uniquement. */
export const peutValiderEpargnes = (r: RoleKey | null) => r === "president" || r === "secretariat";

/** Allouer / corriger les dettes (prêts) : PRÉSIDENT et SECRÉTAIRE uniquement
 *  (même règle que les épargnes — demande de l'administrateur, 2026-11). */
export const peutGererDettes = (r: RoleKey | null) => r === "president" || r === "secretariat";

/** Traiter les signalements : tout le bureau. */
export const peutTraiterSignalements = (r: RoleKey | null) => r !== null && r !== "membre";

/** Fait partie du bureau ? */
export const estBureau = (r: RoleKey | null) => r !== null && r !== "membre";

/** Durées du règlement — exprimées en jours. */
export const DELAI_VALIDATION_JOURS = 7; // sans action du membre → validée par défaut
export const RAPPEL_SIGNALEMENT_JOURS = 3; // rappel de notification aux acteurs du bureau

const JOUR_MS = 86_400_000;

/** Jours entiers écoulés depuis une date ISO (0 = aujourd'hui). */
export function joursDepuis(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!isFinite(t)) return 0;
  return Math.floor((Date.now() - t) / JOUR_MS);
}

const maintenant = () => new Date().toISOString();

/* ══════════════════════════ auto-validation à 7 jours ══════════════════════════ */

type Validable = Workflow;

/** Le bureau a validé — le membre doit confirmer dans les 7 jours. */
export const enAttenteMembre = (x: Validable) =>
  x.statut === "validée" && !x.membreConfirmeLe && !x.autoValideLe && !!x.valideLe;

/** Le membre n'a rien fait depuis 7 jours → validée par défaut. */
function appliqueAutoValidation(x: Validable): boolean {
  if (x.statut !== "validée" || x.membreConfirmeLe || x.autoValideLe || !x.valideLe) return false;
  if (joursDepuis(x.valideLe) >= DELAI_VALIDATION_JOURS) {
    x.autoValideLe = maintenant();
    return true;
  }
  return false;
}

/** Passe en revue épargnes + prêts : chaque décision du bureau non confirmée
 *  depuis 7 jours devient « validée par défaut ». Retourne le nombre d'items
 *  auto-validés (pour l'information du membre). */
export function appliqueAutoValidations(epargnes: Epargne[], prets: Pret[]): number {
  let n = 0;
  epargnes.forEach((e) => { if (appliqueAutoValidation(e)) n++; });
  prets.forEach((p) => { if (appliqueAutoValidation(p)) n++; });
  return n;
}

/** Le membre VALIDE une décision du bureau (le membre ne peut que valider). */
export function membreValide<T extends Validable>(x: T): T {
  return { ...x, membreConfirmeLe: maintenant() };
}

/** Le bureau VALIDE une proposition du membre. */
export function bureauValide<T extends Validable>(x: T, role: RoleKey): T {
  return { ...x, statut: "validée", origine: x.origine ?? "membre", valideLe: maintenant(), validePar: role };
}

/** Cette ligne peut-elle être supprimée par le MEMBRE ?
 *  Non si elle a été allouée/validée par le bureau (dette du registre). */
export const membrePeutSupprimer = (x: Validable) =>
  x.statut === "proposée" || (x.origine === "membre" && x.statut !== "validée");

/* ══════════════════════════ signalements ══════════════════════════ */

const SIGNALEMENTS_KEY = "fc_tontine_signalements_v1";

export const MOTIFS_SIGNALEMENT = {
  montant: "Montant erroné",
  mois: "Mois / période erronée",
  dette_mal_inseree: "Dette mal insérée",
  absence: "Élément manquant ou dupliqué",
  taux: "Taux appliqué incorrect",
  autre: "Autre problème",
} as const;

export type MotifSignalement = keyof typeof MOTIFS_SIGNALEMENT;

export type Signalement = {
  id: string;
  cible: "epargne" | "pret" | "taux" | "autre";
  cibleId: string | null; // identifiant de l'épargne / du prêt visé
  cibleLabel: string; // libellé lisible — « Épargne de mars · 10 000 FCFA »
  motif: MotifSignalement;
  message: string;
  vocal?: string | null; // message vocal (data URL audio, MediaRecorder) — facultatif
  auteur: string; // nom du membre qui signale
  auteurRole: RoleKey | null;
  creeLe: string; // ISO
  statut: "ouvert" | "resolu" | "rejete";
  traitePar: RoleKey | null; // rôle du bureau qui a traité
  traiteLe: string | null; // ISO
  resolution: string; // suite donnée
  rappelLe: string | null; // ISO — prochaine notification de rappel (3 jours)
};

export function loadSignalements(): Signalement[] {
  try {
    const raw = localStorage.getItem(SIGNALEMENTS_KEY);
    const list = raw ? (JSON.parse(raw) as Signalement[]) : [];
    return Array.isArray(list) ? list.filter((s) => s && !!s.id) : [];
  } catch {
    return [];
  }
}

export function saveSignalements(list: Signalement[]): void {
  try {
    localStorage.setItem(SIGNALEMENTS_KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}

/** Dépose un signalement : tous les membres du bureau en sont notifiés. */
export function deposerSignalement(input: {
  cible: Signalement["cible"];
  cibleId: string | null;
  cibleLabel: string;
  motif: MotifSignalement;
  message: string;
  vocal?: string | null;
  auteur: string;
  auteurRole: RoleKey | null;
}): Signalement {
  const s: Signalement = {
    id: uid(),
    cible: input.cible,
    cibleId: input.cibleId,
    cibleLabel: input.cibleLabel,
    motif: input.motif,
    message: input.message.trim(),
    vocal: input.vocal ?? null,
    auteur: input.auteur || "Un membre",
    auteurRole: input.auteurRole,
    creeLe: maintenant(),
    statut: "ouvert",
    traitePar: null,
    traiteLe: null,
    resolution: "",
    rappelLe: null, // premier rappel 3 jours après le dépôt
  };
  const next = [s, ...loadSignalements()];
  saveSignalements(next);
  return s;
}

/** Traitement d'un signalement par le bureau (résolu ou rejeté). */
export function traiterSignalement(id: string, statut: "resolu" | "rejete", resolution: string, role: RoleKey): Signalement[] {
  const next = loadSignalements().map((s) =>
    s.id === id
      ? { ...s, statut, traitePar: role, traiteLe: maintenant(), resolution: resolution.trim() || (statut === "resolu" ? "Corrigé par le bureau." : "Rejeté après vérification du bureau."), rappelLe: null }
      : s,
  );
  saveSignalements(next);
  return next;
}

/** Signalements ouverts (non traités). */
export const signalementsOuverts = (list: Signalement[]) => list.filter((s) => s.statut === "ouvert");

/** Prochain rappel d'un signalement ouvert : tous les 3 JOURS, la notification
 *  réapparaît pour rappeler au bureau qu'ils doivent gérer le problème. */
export function rappelDue(s: Signalement): boolean {
  if (s.statut !== "ouvert") return false;
  const base = s.rappelLe ?? s.creeLe;
  return joursDepuis(base) >= RAPPEL_SIGNALEMENT_JOURS;
}

/** Avance les horloges de rappel des signalements dus — retourne ceux dont la
 *  notification de rappel doit réapparaître MAINTENANT (toast + bannière). */
export function collecterRappels(list: Signalement[]): Signalement[] {
  const dus = list.filter(rappelDue);
  if (dus.length === 0) return [];
  const stamp = maintenant();
  saveSignalements(
    list.map((s) => (rappelDue(s) ? { ...s, rappelLe: stamp } : s)),
  );
  return dus;
}

/** Libellé du motif d'un signalement. */
export const libelleMotif = (m: MotifSignalement) => MOTIFS_SIGNALEMENT[m] ?? m;

/* ══════════════════════════ décisions du bureau — journal du taux ══════════════════════════ */

const DECISIONS_KEY = "fc_tontine_decisions_v1";

export type DecisionTaux = Workflow & {
  id: string;
  ancienne: number; // taux avant la décision
  valeur: number; // nouveau taux
  role: RoleKey; // rôle qui a signé la décision (président / secrétaire)
  le: string; // ISO — date de la décision
};

export function loadDecisions(): DecisionTaux[] {
  try {
    const raw = localStorage.getItem(DECISIONS_KEY);
    const list = raw ? (JSON.parse(raw) as DecisionTaux[]) : [];
    return Array.isArray(list) ? list.filter((d) => d && typeof d.valeur === "number") : [];
  } catch {
    return [];
  }
}

export function saveDecisions(list: DecisionTaux[]): void {
  try {
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}

/** Le bureau (président ou secrétaire) règle le taux : la valeur s'applique
 *  aussitôt aux calculs, et la décision rejoint le journal — le membre la
 *  valide (ou 7 jours plus tard, elle est validée par défaut). */
export function enregistrerDecisionTaux(ancienne: number, valeur: number, role: RoleKey): DecisionTaux[] {
  const d: DecisionTaux = {
    id: uid(),
    ancienne,
    valeur,
    role,
    le: maintenant(),
    statut: "validée",
    origine: "bureau",
    valideLe: maintenant(),
    validePar: role,
    membreConfirmeLe: null,
    autoValideLe: null,
  };
  saveTaux(valeur);
  const next = [d, ...loadDecisions()];
  saveDecisions(next);
  return next;
}

/** Passe en revue les décisions de taux : celles non confirmées depuis 7 jours
 *  deviennent validées par défaut. Retourne la liste à jour. */
export function appliqueAutoValidationsDecisions(list: DecisionTaux[]): DecisionTaux[] {
  let changed = false;
  const next = list.map((d) => {
    const copy = { ...d };
    if (appliqueAutoValidation(copy)) changed = true;
    return copy;
  });
  if (changed) saveDecisions(next);
  return next;
}

/** Journal complet du taux : l'historique des décisions + le réglage courant. */
export function journalTaux(): { valeur: number; decisions: DecisionTaux[] } {
  return { valeur: loadTaux() ?? TAUX_DEFAUT, decisions: loadDecisions() };
}

/** Rend lisible la date ISO — « 12 novembre » / « 12 novembre 2026 ». */
export function dateCourte(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}
