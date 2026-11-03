// ─────────────────────────────────────────────────────────────────────────────
// TYPES DE COTISATIONS MENSUELLES — Famille.Mbeutetsa
//
// « Tout le monde ne cotise pas toujours la même somme dans une réunion » :
// le président crée une somme de cotisation mensuelle (ex. 50 000 FCFA), puis
// sélectionne les personnes qui doivent cotiser cette somme ; aussitôt validé,
// chaque membre sélectionné voit CE montant sur sa page membre, avec une
// notification. Il peut ensuite créer un deuxième type (ex. 30 000 FCFA) pour
// d'autres personnes.
//
// Le membre non attribué reste sur la cotisation de base (TONTINE.montantCotisation).
//
// Persistance locale (gratuit, hors ligne) : clé fc_cotis_types_v1.
// ─────────────────────────────────────────────────────────────────────────────

export type TypeCotisation = {
  id: string;
  /** Libellé du type — ex. « Cotisation des fondateurs ». */
  nom: string;
  /** Somme mensuelle en FCFA — commence toujours à 0, le président décide. */
  montant: number;
  /** Membres (ids du registre) qui doivent cotiser cette somme. */
  membreIds: string[];
  /** Date de la dernière validation d'attribution (ISO). */
  valideLe: string | null;
};

const CLE = "fc_cotis_types_v1";

let seq = 0;

/** Nouveau type vide — montant à 0, aucun membre. */
export function nouveauTypeCotisation(nom: string): TypeCotisation {
  seq += 1;
  return { id: `tc-${Date.now().toString(36)}-${seq}`, nom, montant: 0, membreIds: [], valideLe: null };
}

/** Lit tous les types de cotisations enregistrés. */
export function loadTypesCotisation(): TypeCotisation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLE);
    if (!raw) return [];
    const p = JSON.parse(raw) as TypeCotisation[];
    return Array.isArray(p) ? p.map((t) => ({ ...t, membreIds: Array.isArray(t.membreIds) ? t.membreIds : [] })) : [];
  } catch {
    return [];
  }
}

/** Enregistre tous les types de cotisations. */
export function saveTypesCotisation(t: TypeCotisation[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(t));
  } catch {
    /* stockage indisponible — la maquette continue en mémoire */
  }
}

/** Le type de cotisation d'un membre — null = il reste sur la cotisation de base. */
export function typeDuMembre(idMembre: string, types: TypeCotisation[]): TypeCotisation | null {
  return types.find((t) => t.membreIds.includes(idMembre)) ?? null;
}

/** Somme que CE membre doit cotiser chaque mois (hors collation). */
export function cotisationDuMembre(idMembre: string, types: TypeCotisation[], base: number): number {
  const t = typeDuMembre(idMembre, types);
  return t ? t.montant : base;
}

export const fmtMontant = (n: number) =>
  `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
