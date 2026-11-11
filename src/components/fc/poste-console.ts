"use client";

// ─────────────────────────────────────────────────────────────────────────────
// POSTE → PAGE — la console qui appartient à CHAQUE poste du bureau (v34)
//
// Demande de l'administrateur : « lorsqu'une personne finit son inscription et
// sa géolocalisation, la page qui suit est la page propre au statut qu'il
// occupe. Et aucun membre ne devrait voir la page du statut d'un autre membre
// dans l'entreprise. Tu ne vois que ton statut. »
//
//   · Le poste vient UNIQUEMENT du code d'invitation remis par le bureau
//     (fc_tontine_role_v1, posé par le code à l'inscription) ;
//   · après la géolocalisation, l'application ouvre DIRECTEMENT la console du
//     poste : président → #president, secrétaire → #secretaire, commissaire →
//     #commissaire, simple membre (et vice-président / trésorier / censeur,
//     qui n'ont pas de console dédiée) → #membre (Espace Membre) ;
//   · les consoles des AUTRES postes sont INTERDITES : le gate redirige vers
//     l'Espace Membre. Chacun ne voit que son propre statut — les autres
//     membres restent visibles dans l'annuaire, avec LEURS données à eux.
// ─────────────────────────────────────────────────────────────────────────────

import type { RoleKey } from "./tontine-data";
import { loadVousRole } from "./tontine-bureau";

/** Les consoles à accès restreint du bureau (le hash correspondant). */
export type ConsoleBureau = "president" | "secretaire" | "commissaire" | "membre";

/** La console qui appartient à CE rôle — aucune autre n'est ouverte. */
export const CONSOLE_DU_ROLE: Record<RoleKey, ConsoleBureau> = {
  president: "president",
  vice_president: "membre", // pas de console dédiée — outils dans Finances
  secretariat: "secretaire",
  commissaire: "commissaire",
  tresorier: "membre",
  censeur: "membre",
  membre: "membre",
};

/** Libellé humain d'une console (messages et pastilles). */
export const LIBELLE_CONSOLE: Record<ConsoleBureau, string> = {
  president: "Président",
  secretaire: "Secrétaire",
  commissaire: "Commissaire aux comptes",
  membre: "Espace Membre",
};

/** La console visée par un hash (« #secretaire/convocations » → secretaire) —
 *  null si le hash ne vise aucune console de la famille. */
export function consoleDuHash(): ConsoleBureau | null {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#president")) return "president";
    if (h.startsWith("#secretaire")) return "secretaire";
    if (h.startsWith("#commissaire")) return "commissaire";
    if (h.startsWith("#membre")) return "membre";
  } catch {
    /* rien */
  }
  return null;
}

/** Le poste du compte connecté — "pas-de-compte" si aucun compte n'est
 *  connecté sur cet appareil (validation sans session : toutes les consoles
 *  restent ouvertes) ; "membre" si le compte n'a pas encore de rôle posé. */
export function roleDuCompteConnecte(): RoleKey | "pas-de-compte" {
  try {
    const uid = window.localStorage.getItem("fc_uid");
    if (!uid) return "pas-de-compte";
  } catch {
    return "pas-de-compte";
  }
  return loadVousRole() ?? "membre";
}

/** Change le hash en notifiant même à valeur identique : au retour d'une
 *  console le hash peut déjà être #president — le hashchange natif ne se
 *  déclenche pas alors, il faut prévenir la porte maquette à la main. */
export function naviguerHash(cible: string): void {
  try {
    if ((window.location.hash || "").toLowerCase() === `#${cible}`) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = cible;
    }
  } catch {
    try {
      window.location.hash = cible;
    } catch {
      /* rien */
    }
  }
}
