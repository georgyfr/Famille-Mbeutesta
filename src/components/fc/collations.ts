// ─────────────────────────────────────────────────────────────────────────────
// COLLATIONS DE LA TONTINE — Famille.Mbeutetsa
//
// « Ajoutez autant de collations que souhaité » : le président crée une
// collation (ex. « Collation ordinaire », 2 000 FCFA par personne et par
// réunion), choisit les personnes qui la paient, puis en ajoute une autre
// (ex. « Collation spéciale »)… autant de fois que la Tontine en décide.
//
// La part collation d'un membre = la SOMME des collations qui lui sont
// attribuées (un membre peut très bien payer plusieurs collations — contrairement
// à la cotisation mensuelle où il ne cotise qu'UNE somme).
//
// Persistance locale (gratuit, hors ligne) : clé fc_collations_v1.
// ─────────────────────────────────────────────────────────────────────────────

export type Collation = {
  id: string;
  /** Libellé de la collation — ex. « Collation ordinaire ». */
  nom: string;
  /** Somme par personne et par réunion, en FCFA — démarre toujours à 0. */
  montant: number;
  /** Membres (ids du registre) habilités / tenus de payer cette collation. */
  membreIds: string[];
  /** Date de la dernière validation d'attribution (ISO). */
  valideLe: string | null;
};

const CLE = "fc_collations_v1";

let seq = 0;

/** Nouvelle collation vide — montant à 0, aucune personne désignée. */
export function nouvelleCollation(nom: string): Collation {
  seq += 1;
  return { id: `co-${Date.now().toString(36)}-${seq}`, nom, montant: 0, membreIds: [], valideLe: null };
}

/** Lit toutes les collations enregistrées. */
export function loadCollations(): Collation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLE);
    if (!raw) return [];
    const p = JSON.parse(raw) as Collation[];
    return Array.isArray(p) ? p.map((c) => ({ ...c, membreIds: Array.isArray(c.membreIds) ? c.membreIds : [] })) : [];
  } catch {
    return [];
  }
}

/** Enregistre toutes les collations. */
export function saveCollations(c: Collation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(c));
  } catch {
    /* stockage indisponible — la maquette continue en mémoire */
  }
}

/**
 * La part collation d'UN membre pour une réunion : la somme des montants des
 * collations où il est désigné (0 = aucune collation fixée pour lui).
 */
export function collationDuMembre(idMembre: string, collations: Collation[]): number {
  return collations.filter((c) => c.membreIds.includes(idMembre)).reduce((s, c) => s + (c.montant || 0), 0);
}
