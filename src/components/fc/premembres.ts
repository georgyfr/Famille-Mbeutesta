"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FUTURS MEMBRES — pré-inscrits par le bureau via un code (v27, Task 71)
//
// Demande de l'administrateur : « immédiatement que le code soit généré, le
// président comme le secrétaire peut déjà allouer des cotisations, des prêts
// et autres à la personne, même si elle n'a pas encore inséré son code pour
// s'inscrire. Toutefois, lorsque cette personne s'inscrira avec le code, elle
// verra toutes les additions qui ont été faites au niveau de son compte »
// (prêts passés, épargnes, tontines…).
//
// MÉCANIQUE :
//   1. Chaque code NON UTILISÉ représente un FUTUR MEMBRE identifié par son
//      numéro de téléphone — id « tel-<chiffres> », libellé « Futur membre ».
//      Il apparaît dans les listes du bureau (attributions d'épargnes, de
//      prêts, types de cotisations, appels…) : on peut donc TRAVAILLER pour
//      lui avant son arrivée.
//   2. Quand la personne s'inscrit avec son code, les allocations faites sur
//      l'id téléphone sont REMAPPÉES vers l'id du compte réel (« app-<uid> ») :
//      épargnes à la réunion, prêts à la réunion, demandes de prêts,
//      mouvements de cotisation mensuelle, types de cotisations… RIEN ne se
//      perd — elle retrouve tout sur sa page dès la première ouverture.
//   3. La VILLE du code est écrite sur le compte : elle détermine la tontine
//      de ville visible sur la page Finances.
// ─────────────────────────────────────────────────────────────────────────────

import { chargerCodes, type CodeMembre } from "./codes-membres";
import { loadEpargnesReunion, loadPretsReunion, saveEpargnesReunion, savePretsReunion } from "./registres-bureau";
import { loadTypesCotisation, saveTypesCotisation } from "./cotisations-types";
import type { Member } from "./tontine-data";
import { LIBELLES_BUREAU } from "./codes-membres";

/** Préfixe d'identifiant des futurs membres (pré-inscrits par téléphone). */
export const PREFIXE_ID_TEL = "tel-";

/** Id stable d'un futur membre à partir de son numéro international. */
export function idTel(telephone: string): string {
  return `${PREFIXE_ID_TEL}${(telephone ?? "").replace(/\D/g, "")}`;
}

/** Affichage international lisible d'un numéro (+237699613226 → +237 6 99 61 32 26). */
export function telLisible(telephone: string): string {
  const d = (telephone ?? "").replace(/\D/g, "");
  if (d.length < 8) return telephone || "—";
  const indicatif = `+${d.slice(0, 3)}`;
  const corps = d.slice(3);
  const groupes = corps.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return `${indicatif} ${groupes}`;
}

/** Les futurs membres : chaque code non utilisé devient un membre de liste
 *  (bureau : allocations possibles AVANT l'inscription de la personne). */
export function futursMembres(): Member[] {
  try {
    const annee = String(new Date().getFullYear());
    return chargerCodes()
      .filter((c) => !c.utiliseLe)
      .map((c): Member => ({
        id: idTel(c.telephone),
        name: `Futur membre · ${telLisible(c.telephone)}`,
        role: c.bureauRole ?? "membre",
        phone: c.telephone,
        city: c.ville,
        since: annee,
        tour: 12, // hors calendrier : le tour sera fixé par le bureau après l'arrivée
        fictif: true,
        isVous: false,
      }));
  } catch {
    return [];
  }
}

/** Le libellé du poste porté par un code (pour l'interface du bureau). */
export function libellePosteCode(c: CodeMembre): string {
  if (c.typeMembre !== "bureau" || !c.bureauRole) return "Membre simple";
  return LIBELLES_BUREAU[c.bureauRole] ?? c.bureauRole;
}

/* ─── remappage à l'activation du code — rien ne se perd ─── */

/** Clés des registres qui portent un membreId (allocations pré-faites). */
const REGISTRES_MEMBRE_ID = {
  epargnes: "fc_epargnes_reunion_v1",
  prets: "fc_prets_reunion_v1",
  demandesPrets: "fc_prets_demandes_v1",
  cotisMois: "fc_secretaire_cotis_mois_v1",
} as const;

type ItemMembreId = { membreId: string };

/** Remappe un tableau d'items { membreId } : tel→app (retourne null si rien à changer). */
function remapListe<T extends ItemMembreId>(cle: string, de: string, vers: string): boolean {
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return false;
    const data = JSON.parse(brut) as unknown;
    if (Array.isArray(data)) {
      if (!data.some((x) => (x as ItemMembreId)?.membreId === de)) return false;
      const next = (data as T[]).map((x) => (x.membreId === de ? { ...x, membreId: vers } : x));
      window.localStorage.setItem(cle, JSON.stringify(next));
      return true;
    }
    if (data && typeof data === "object") {
      // registre clé→objet (ex. cotisations du mois : { "<membreId>": {...} })
      const obj = data as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(obj, de)) return false;
      const next = { ...obj, [vers]: obj[de] };
      delete next[de];
      window.localStorage.setItem(cle, JSON.stringify(next));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Écrit la VILLE du code sur le compte réel (base de l'app fc_demo_db_v2) et
 *  sur le cache « ma ville » — la page Finances groupe les tontines par ville. */
function ecrireVilleCompte(idUid: string, ville: string): void {
  try {
    // Base de l'APPLICATION (cf. demo-api.ts DB_KEY = fc_demo_db_v2).
    const cle = "fc_demo_db_v2";
    const brut = window.localStorage.getItem(cle);
    if (brut) {
      const db = JSON.parse(brut) as { members?: Array<Record<string, unknown>> };
      if (Array.isArray(db.members)) {
        let touche = false;
        for (const m of db.members) {
          if (m.id === idUid) {
            m.ville = ville;
            touche = true;
          }
        }
        if (touche) window.localStorage.setItem(cle, JSON.stringify(db));
      }
    }
  } catch {
    /* annuaire indisponible — la ville reste dans le cache ci-dessous */
  }
  try {
    window.localStorage.setItem("fc_ma_ville_v1", ville);
  } catch {
    /* rien */
  }
}

/** La personne s'est inscrite avec SON code → toutes les allocations que le
 *  bureau avait faites sur l'id TÉLÉPHONE rejoignent l'id du COMPTE RÉEL, et
 *  la ville du code est écrite sur le compte. À appeler une fois, à l'activation. */
export function remapperAllocationsApresActivation(code: CodeMembre, idUid: string): void {
  const idApp = `app-${idUid}`;
  const de = idTel(code.telephone);
  try {
    // 1. Registres { membreId } (tableaux) et registres clé→objet.
    remapListe(REGISTRES_MEMBRE_ID.epargnes, de, idApp);
    remapListe(REGISTRES_MEMBRE_ID.prets, de, idApp);
    remapListe(REGISTRES_MEMBRE_ID.demandesPrets, de, idApp);
    remapListe(REGISTRES_MEMBRE_ID.cotisMois, de, idApp);
    // 2. Types de cotisations (pré-allocation d'une cotisation mensuelle).
    const types = loadTypesCotisation();
    if (types.some((t) => t.membreIds.includes(de))) {
      saveTypesCotisation(
        types.map((t) => ({
          ...t,
          membreIds: t.membreIds.map((m) => (m === de ? idApp : m)),
        })),
      );
    }
    // 3. La ville du code rejoint le compte (tontine de ville, page Finances).
    ecrireVilleCompte(idUid, code.ville);
  } catch {
    /* stockage indisponible — l'inscription reste valable, sans le remappage */
  }
}

/** Vérifie à froid (au démarrage) que les allocations du code consommé par CE
 *  compte ont bien été remappées — filet de sécurité si l'activation avait été
 *  interrompue. Sans effet si tout était déjà en place. */
export function assuranceRemappage(): void {
  try {
    const uid = window.localStorage.getItem("fc_uid");
    if (!uid) return;
    const seed = chargerCodes().find((c) => c.id === "cm-seed-premier");
    if (seed?.utiliseLe) {
      // Le remappage complet est refait sans risque : seuls les items portant
      // ENCORE l'id téléphone sont déplacés (idempotent — si un autre compte
      // les a déjà reçus, il n'y a plus rien à déplacer).
      remapperAllocationsApresActivation(seed, uid);
    }
  } catch {
    /* rien */
  }
}
