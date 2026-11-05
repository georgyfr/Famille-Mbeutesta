"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CODES D'INVITATION — créer un membre de la réunion et lui remettre son code
//
// Demande de l'administrateur (Task 67) : « désormais tu donneras la
// possibilité à la secrétaire comme au président et comme à l'administrateur
// du site de créer des membres de la réunion […] la secrétaire pourra générer
// un code avec lequel il pourra partager le code via WhatsApp ou via un autre
// élément ou copier-coller le code généré et l'envoyer à un utilisateur. »
//
// Le BUREAU (président ou secrétaire) crée le membre AVANT son arrivée :
//   · le numéro de téléphone de la personne ;
//   · le type de cotisation qu'elle effectuera (selon les paramétrages faits
//     par le bureau — types de cotisations mensuelles ou cotisation de base) ;
//   · son type de membre : MEMBRE SIMPLE ou MEMBRE DU BUREAU — dans ce cas une
//     seconde liste déroulante choisit le poste exact (président,
//     vice-président, secrétaire, trésorier, censeur, commissaire).
//
// La personne s'inscrit ensuite avec SON numéro, colle le code reçu : SA page
// s'ouvre directement avec le rôle attribué (assistant « votre rôle » sauté)
// et sa cotisation du type choisi est enregistrée.
//
// RÈGLE DE VIE D'UN CODE (demande explicite) : « il faut éviter que la personne
// se désactive de façon régulière » → un code N'EXPIRE JAMAIS. Il reste « en
// attente » tant que personne ne l'a utilisé ; une fois utilisé il est marqué
// « utilisé » (pour empêcher un double compte) mais reste dans la liste, sans
// aucune date de péremption.
//
// Persistance locale (gratuit, hors ligne) : clé fc_codes_membres_v1.
// Le code en attente d'une inscription, côté visiteur : fc_code_invite_v1.
// ─────────────────────────────────────────────────────────────────────────────

import { loadTypesCotisation, saveTypesCotisation } from "./cotisations-types";
import type { RoleKey } from "./tontine-data";
import { VILLE_DEFAUT } from "./villes";

export type TypeMembreCode = "simple" | "bureau";

/** Un code d'invitation généré par le bureau. */
export type CodeMembre = {
  id: string;
  /** Code lisible — ex. « FCM-K7M2PD » (sans O/I/0/1, jamais confondus). */
  code: string;
  /** Téléphone en international — ex. « +237690000064 ». */
  telephone: string;
  /** Nom laissé par le bureau — facultatif ; la personne confirme à l'inscription. */
  nomOptionnel: string;
  /** Type de cotisation attribué — null = cotisation de base de la Tontine. */
  cotisationTypeId: string | null;
  cotisationNom: string;
  cotisationMontant: number;
  typeMembre: TypeMembreCode;
  /** Poste du bureau si typeMembre === "bureau" (sinon null). */
  bureauRole: RoleKey | null;
  /** VILLE de la tontine (v27) : la personne rejoint la tontine de SA ville —
   *  Yaoundé par défaut, nouvelle ville ajoutable par le bureau. */
  ville: string;
  creePar: "president" | "secretariat";
  creeParNom: string;
  /** ISO — date de création (information, jamais une date d'expiration). */
  creeLe: string;
  /** ISO — rempli quand la personne s'est inscrite avec ce code. */
  utiliseLe: string | null;
  utiliseNom: string | null;
};

const CLE = "fc_codes_membres_v1";
const PENDING_KEY = "fc_code_invite_v1";

/** Alphabet sans caractères ambigus (pas de O/I/0/1) — dicté au téléphone sans erreur. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Génère un code lisible « FCM-XXXXXX » (6 caractères). */
export function nouveauCodeMembre(): string {
  let corps = "";
  for (let i = 0; i < 6; i++) corps += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `FCM-${corps}`;
}

/* ═══ CODE SEMÉ DANS L'APPLICATION — LE TOUT PREMIER UTILISATEUR (v27) ═══
 * « Tu vas générer un utilisateur avec les informations suivantes… Ce sera le
 * tout premier utilisateur qui ajoutera tous les autres sans exception. »
 * Ce code est EMBARQUÉ dans l'application : il fonctionne sur N'IMPORTE
 * QUEL appareil (pas besoin de le générer au préalable) — la personne colle
 * le code, donne son nom, et SA page s'ouvre en SECRTAIRE du bureau.
 *   · téléphone : +237 699 613 226 ;  · ville : Yaoundé ;
 *   · cotisation : 50 000 FCFA/mois (type créé automatiquement à l'activation).
 * Un seul compte peut le consommer — ensuite il est marqué « utilisé ». */
export const CODE_SEED_PREMIER: CodeMembre = {
  id: "cm-seed-premier",
  code: "FCM-K7M2PV",
  telephone: "+237699613226",
  nomOptionnel: "",
  cotisationTypeId: "tc-seed-50000",
  cotisationNom: "Cotisation mensuelle — 50 000 FCFA",
  cotisationMontant: 50000,
  typeMembre: "bureau",
  bureauRole: "secretariat",
  ville: VILLE_DEFAUT,
  creePar: "president",
  creeParNom: "Bureau de la Tontine",
  creeLe: "2026-11-01T00:00:00.000Z",
  utiliseLe: null,
  utiliseNom: null,
};

/** Codes SEMÉS dans l'application (fonctionnent sur tout appareil). */
const CODES_SEED: CodeMembre[] = [CODE_SEED_PREMIER];

/** Complète un code lu du stockage : les codes créés avant la v27 n'ont pas
 *  de ville — Yaoundé (la ville par défaut) leur est attribuée. */
function completeVille(c: CodeMembre): CodeMembre {
  return { ...c, ville: typeof c.ville === "string" && c.ville.trim() ? c.ville : VILLE_DEFAUT };
}

/** Lit tous les codes : ceux générés par le bureau (stockage local) PLUS les
 *  codes semés dans l'application (v27 — le tout premier utilisateur). Le plus
 *  récent d'abord ; les semés n'y figurent qu'une fois (jamais en double). */
export function chargerCodes(): CodeMembre[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(CLE);
    const stockes: CodeMembre[] = brut
      ? (() => {
          const l = JSON.parse(brut) as CodeMembre[];
          return Array.isArray(l) ? l.filter((c) => typeof c?.code === "string" && typeof c?.id === "string") : [];
        })()
      : [];
    const manquants = CODES_SEED.filter((s) => !stockes.some((c) => c.code === s.code));
    const tout = [...stockes.map(completeVille), ...manquants];
    return tout.sort((a, b) => (b.creeLe ?? "").localeCompare(a.creeLe ?? ""));
  } catch {
    return CODES_SEED.map(completeVille);
  }
}

/** Enregistre tous les codes. */
export function sauverCodes(liste: CodeMembre[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    /* stockage indisponible — la maquette continue en mémoire */
  }
}

/** Normalise une saisie tolérante : « fcm ab12cd », « FCM-AB12CD », « fcm-ab12cd » … */
export function normaliserCode(saisi: string): string {
  const brut = (saisi ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const corps = brut.startsWith("FCM") ? brut.slice(3) : brut;
  return corps ? `FCM-${corps}` : "";
}

/** Retrouve un code d'après la saisie de la personne (null si inconnu). */
export function trouverCode(saisi: string): CodeMembre | null {
  const c = normaliserCode(saisi);
  if (!c) return null;
  return chargerCodes().find((x) => x.code === c) ?? null;
}

/** Le bureau génère un code pour un futur membre — ajouté en tête de liste. */
export function genererCodeMembre(
  opts: Omit<CodeMembre, "id" | "code" | "creeLe" | "utiliseLe" | "utiliseNom">,
): CodeMembre {
  const liste = chargerCodes();
  let code = nouveauCodeMembre();
  while (liste.some((x) => x.code === code)) code = nouveauCodeMembre(); // jamais deux codes identiques
  const c: CodeMembre = {
    ...opts,
    id: `cm-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    code,
    creeLe: new Date().toISOString(),
    utiliseLe: null,
    utiliseNom: null,
  };
  sauverCodes([c, ...liste]);
  return c;
}

/** Le type de cotisation référencé par un code existe-t-il dans le stockage ?
 *  Si absent (ex. le type 50 000 FCFA du code SEMÉ), il est CRÉÉ à la volée —
 *  la cotisation promise par le code est toujours exacte. */
function assureTypeCotisation(id: string, nom: string, montant: number): void {
  const types = loadTypesCotisation();
  if (types.some((t) => t.id === id)) return;
  saveTypesCotisation([...types, { id, nom, montant, membreIds: [], valideLe: new Date().toISOString() }]);
}

/** La personne s'est inscrite avec le code : il est marqué « utilisé » (plus
 *  réutilisable par un autre) mais reste dans la liste — JAMAIS supprimé ni
 *  expiré. Retourne le code consommé, ou null si déjà utilisé. Les codes
 *  semés (v27) sont PERSISTÉS au moment de la consommation : le marqueur
 *  « utilisé » survit sur l'appareil qui l'a consommé. */
export function consommerCode(code: string, nomPersonne: string): CodeMembre | null {
  const liste = chargerCodes();
  const cible = liste.find((x) => x.code === normaliserCode(code));
  if (!cible || cible.utiliseLe) return null;
  if (cible.cotisationTypeId) {
    assureTypeCotisation(cible.cotisationTypeId, cible.cotisationNom, cible.cotisationMontant);
  }
  const maj: CodeMembre = { ...cible, utiliseLe: new Date().toISOString(), utiliseNom: nomPersonne };
  sauverCodes(liste.map((x) => (x.id === cible.id ? maj : x)));
  return maj;
}

/* ─── code en attente, côté visiteur (entre la saisie et la création du compte) ─── */

/** Le code collé à l'inscription (null = inscription sans invitation). */
export function codeInviteEnAttente(): string | null {
  try {
    return window.localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

/** Mémorise (ou efface avec "") le code collé avant la création du compte. */
export function poserCodeInvite(code: string): void {
  try {
    if (code) window.localStorage.setItem(PENDING_KEY, code);
    else window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* rien */
  }
}

/** Efface le code en attente (après consommation, ou code invalide). */
export function retirerCodeInvite(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* rien */
  }
}

/** Attribue le type de cotisation prévu par le code au compte qui vient d'être
 *  créé (id « app-… » de l'annuaire). Règle de la maison : une personne ne
 *  cotise qu'UNE seule somme — elle est retirée de tous les autres types.
 *  v27 — PRÉ-ALLOCATION : si le code ne porte AUCUN type mais que le bureau
 *  avait déjà attribué une cotisation au futur membre (avant inscription),
 *  cette attribution est CONSERVÉE. Le type référencé par un code semé est
 *  créé à la volée (ex. « Cotisation mensuelle — 50 000 FCFA »). */
export function appliquerCotisationCode(cotisationTypeId: string | null, idApp: string): void {
  const types = loadTypesCotisation();
  if (cotisationTypeId) {
    // Le type du code fait foi : une personne ne cotise qu'UNE seule somme.
    assureTypeCotisation(cotisationTypeId, "Cotisation mensuelle", 0);
    const maj = types.map((t) => ({ ...t, membreIds: t.membreIds.filter((m) => m !== idApp) }));
    const idx = maj.findIndex((t) => t.id === cotisationTypeId);
    if (idx >= 0) maj[idx] = { ...maj[idx], membreIds: [...maj[idx].membreIds, idApp] };
    saveTypesCotisation(maj);
  } else {
    // Aucun type dans le code : l'attribution PRÉ-FAITE par le bureau (avant
    // l'inscription, sur l'id téléphone, remappée vers l'id du compte par
    // remapperAllocationsApresActivation) est CONSERVÉE telle quelle.
    saveTypesCotisation(types);
  }
}

/** Message WhatsApp prêt à envoyer (lien wa.me côté interface). */
export function messageWhatsApp(c: CodeMembre): string {
  const qui = c.creePar === "president" ? "le président" : "la secrétaire";
  const role =
    c.typeMembre === "bureau" && c.bureauRole
      ? ` Votre poste : ${LIBELLES_BUREAU[c.bureauRole] ?? c.bureauRole}.`
      : "";
  const ville = c.ville ? ` Votre tontine : celle de ${c.ville}.` : "";
  const cotis = c.cotisationMontant > 0 ? ` Votre cotisation : ${c.cotisationMontant.toLocaleString("fr-FR")} FCFA/mois (${c.cotisationNom}).` : "";
  return (
    `Bonjour${c.nomOptionnel ? ` ${c.nomOptionnel}` : ""} ! Voici votre code d'invitation de la Tontine Mbeutetsa : ${c.code}.` +
    ` Ouvrez l'application Famille.Mbeutetsa et collez ce code : on vous demandera votre nom, puis votre page s'ouvrira avec le rôle qui vous a été attribué.` +
    ville + role + cotis + ` — envoyé par ${qui}.`
  );
}

/** Libellés des postes du bureau pour la liste déroulante (membre du bureau). */
export const LIBELLES_BUREAU: Record<RoleKey, string> = {
  president: "Président",
  vice_president: "Vice-président(e)",
  secretariat: "Secrétaire",
  tresorier: "Trésorier",
  censeur: "Censeur",
  commissaire: "Commissaire aux comptes",
  membre: "Membre simple",
};

/** Les postes proposables dans la liste déroulante « membre du bureau ». */
export const POSTES_BUREAU_CODES: RoleKey[] = [
  "president",
  "vice_president",
  "secretariat",
  "tresorier",
  "censeur",
  "commissaire",
];
