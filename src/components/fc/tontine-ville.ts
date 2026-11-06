"use client";

// ─────────────────────────────────────────────────────────────────────────────
// VILLE = TONTINE — Famille.Mbeutetsa (v27, Task 71)
//
// Demande de l'administrateur : « au niveau de la page Finances (#tontine),
// les membres d'une même ville forment UNE SEULE tontine : leurs cotisations
// s'additionnent entre eux, leurs prêts et autres sont pris en compte. Un
// membre SANS VILLE n'appartient à AUCUNE tontine et ne peut pas interagir
// avec les membres » (ex. : tous les membres de Yaoundé = la tontine de
// Yaoundé).
//
//   · MA VILLE — posée par le bureau à la génération du code (écrite sur le
//     compte à l'activation, cf. premembres.ts), ou confirmée par la
//     détection automatique de la ville (assistant de localisation) ;
//   · LA TONTINE D'UNE VILLE — ses membres (roster filtré), le total de leurs
//     cotisations (types de cotisations additionnés), leurs épargnes et
//     leurs prêts (registres de la réunion, filtrés par ville) ;
//   · SANS VILLE — aucune tontine : le bloc de la page Finances l'annonce
//     clairement et propose de choisir sa ville.
// ─────────────────────────────────────────────────────────────────────────────

import { memeVille } from "./villes";
import { MEMBRES_FICTIFS, loadMontants, TONTINE, type Member } from "./tontine-data";
import { loadTypesCotisation, typeDuMembre, sommeCotisationsDuMois } from "./cotisations-types";
import { loadEpargnesReunion, loadPretsReunion } from "./registres-bureau";
import { futursMembres } from "./premembres";
import { loadVousRole } from "./tontine-bureau";

const CLE_MA_VILLE = "fc_ma_ville_v1";

/** La ville de tontine du compte courant ("" = aucune tontine). */
export function maVille(): string {
  if (typeof window === "undefined") return "";
  try {
    const v = window.localStorage.getItem(CLE_MA_VILLE);
    if (v && v.trim()) return v.trim();
  } catch {
    /* rien */
  }
  // Repli : la ville écrite sur le compte dans l'annuaire de l'app.
  try {
    const uid = window.localStorage.getItem("fc_uid") ?? "";
    if (!uid) return "";
    const brut = window.localStorage.getItem("fc_demo_db_v2");
    if (!brut) return "";
    const db = JSON.parse(brut) as { members?: Array<{ id?: string; ville?: string }> };
    const m = (db.members ?? []).find((x) => x.id === `app-${uid}`);
    return typeof m?.ville === "string" ? m.ville.trim() : "";
  } catch {
    return "";
  }
}

/** Pose (ou change) la ville de tontine du compte courant. */
export function setMaVille(ville: string): void {
  if (typeof window === "undefined") return;
  try {
    if (ville && ville.trim()) window.localStorage.setItem(CLE_MA_VILLE, ville.trim());
    else window.localStorage.removeItem(CLE_MA_VILLE);
  } catch {
    /* stockage indisponible — la ville reste valable pour la session */
  }
}

/** Id du compte courant dans les registres partagés (app-<uid>) ou « vous ». */
export function monIdApp(): string {
  if (typeof window === "undefined") return "vous";
  try {
    const uid = window.localStorage.getItem("fc_uid") ?? "";
    return uid ? `app-${uid}` : "vous";
  } catch {
    return "vous";
  }
}

/** Roster complet de la tontine : les membres fictifs (maquette, toujours
 *  présents pour les tests) + les FUTURS membres (codes non utilisés — v27 :
 *  ils sont déjà membres de LEUR ville) + le compte courant (avec sa ville). */
export function rosterTontine(vousName?: string | null): Member[] {
  const vous: Member = {
    id: monIdApp(),
    name: (vousName ?? "").trim() || "Vous",
    role: loadVousRole() ?? "membre",
    phone: "",
    city: maVille(),
    since: String(new Date().getFullYear()),
    tour: 12,
    fictif: false,
    isVous: true,
  };
  return [...MEMBRES_FICTIFS, ...futursMembres(), vous];
}

/** Les membres d'UNE ville (la tontine de la ville) — comparaison tolérante
 *  (accents/casse) ; un membre sans ville n'appartient à aucune tontine. */
export function membresDeVille(ville: string, roster?: Member[]): Member[] {
  const r = roster ?? [...MEMBRES_FICTIFS, ...futursMembres()];
  return r.filter((m) => memeVille(m.city, ville));
}

/** Résumé de la tontine d'une ville — ce qui s'additionne ENTRE MEMBRES DE LA
 *  MÊME VILLE (page Finances) : cotisations du mois, épargnes, prêts. */
export type ResumeTontineVille = {
  ville: string;
  membres: Member[];
  cotisationsMois: number;
  epargnes: number;
  pretsEnCours: number;
  nbPretsEnCours: number;
};

export function resumeTontineVille(ville: string, roster?: Member[]): ResumeTontineVille {
  const membres = membresDeVille(ville, roster);
  const ids = new Set(membres.map((m) => m.id));
  const base = loadMontants().montantCotisation || TONTINE.montantCotisation;
  const types = loadTypesCotisation();
  // Cotisations du mois : chaque membre cotise le montant de SON type
  // (addition des taux personnels — même règle que le pot de la réunion).
  const cotisationsMois = sommeCotisationsDuMois(membres, types, base);
  // Épargnes faites à la réunion par les membres de la ville.
  const epargnes = loadEpargnesReunion()
    .filter((a) => ids.has(a.membreId))
    .reduce((s, a) => s + (Number(a.montant) || 0), 0);
  // Prêts EN COURS (non remboursés) contractés par les membres de la ville.
  const pretsVille = loadPretsReunion().filter((a) => ids.has(a.membreId) && !a.rembourse);
  return {
    ville,
    membres,
    cotisationsMois,
    epargnes,
    pretsEnCours: pretsVille.reduce((s, a) => s + (Number(a.montant) || 0), 0),
    nbPretsEnCours: pretsVille.length,
  };
}

/** Le type de cotisation porté par le compte courant ("" si aucun). */
export function monTypeCotisationLibelle(): string {
  try {
    const t = typeDuMembre(monIdApp(), loadTypesCotisation());
    return t ? `${t.montant.toLocaleString("fr-FR")} FCFA/mois` : "";
  } catch {
    return "";
  }
}
