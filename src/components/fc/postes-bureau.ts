// ─────────────────────────────────────────────────────────────────────────────
// POSTES DU BUREAU — attribution & retrait par le président — Famille.Mbeutetsa
//
// Demande du président (v14) : « Donne la possibilité au président d'attribuer
// un poste à n'importe quel membre simple et de retirer un membre du bureau
// d'un poste. Que se passe-t-il lorsqu'un membre a la possibilité d'avoir un
// de ces postes ? Immédiatement, la page spéciale attribuée à ce poste lui est
// désormais présentée. Lorsque le président retire un membre du bureau et le
// transforme en simple membre, immédiatement, il a désormais uniquement les
// pages membres et n'a plus accès aux pages des membres du bureau. Si un
// membre du bureau change par exemple un commissaire aux comptes en
// trésorier, la page du commissaire aux comptes disparaît et il a désormais
// la page du trésorier. »
//
// Le président (f01) n'est pas dans la map : son poste est la présidence elle-
// même, non transférable depuis cette maquette. Chaque autre poste pointe vers
// le membreId de son titulaire (null = poste vacant).
//
// Persistance locale (gratuit, hors ligne, zéro serveur) : fc_postes_bureau_v1.
// ─────────────────────────────────────────────────────────────────────────────

export type PosteKey = "vice_president" | "secretariat" | "tresorier" | "commissaire" | "censeur";

/** Les cinq postes attribuables (hors présidence) — avec LA PAGE spéciale que
 *  voit le titulaire dès sa nomination. */
export const POSTES_BUREAU: { key: PosteKey; label: string; page: string; description: string }[] = [
  {
    key: "vice_president",
    label: "Vice-président(e)",
    page: "Page Vice-président",
    description: "Supplée le président, co-écrit l'ordre du jour et coordonne les préparatifs de chaque réunion.",
  },
  {
    key: "secretariat",
    label: "Secrétaire",
    page: "Page Secrétaire",
    description: "Tient les procès-verbaux, archive les décisions et co-règle le taux avec le président.",
  },
  {
    key: "tresorier",
    label: "Trésorier(ère)",
    page: "Page Trésorier",
    description: "Encaisse les cotisations, remet la somme du mois au bénéficiaire et tient le journal de caisse.",
  },
  {
    key: "commissaire",
    label: "Commissaire aux comptes",
    page: "Page Commissaire aux comptes",
    description: "Contrôle les caisses et audite le journal de caisse chaque trimestre.",
  },
  {
    key: "censeur",
    label: "Censeur",
    page: "Page Censeur",
    description: "Veille à l'équité, écoute les membres et peut convoquer le bureau.",
  },
];

/** Titulaires (membreId) par poste — null = poste vacant. */
export type PostesMap = Record<PosteKey, string | null>;

/** Titulaires de démonstration = les titulaires réels de la Tontine fictive. */
export const POSTES_DEFAUT: PostesMap = {
  vice_president: "f02", // Marie-Louise Nguetsop
  secretariat: "f06", // Françoise Mbeutetsa
  tresorier: "f03", // Émile Tchoumi
  commissaire: "f04", // Bernadette Kamga
  censeur: "f05", // Roger Ndoumbe
};

const CLE = "fc_postes_bureau_v1";

/** Lit l'organigramme enregistré (sinon les titulaires de démonstration). */
export function loadPostes(): PostesMap {
  const defaut: PostesMap = { ...POSTES_DEFAUT };
  if (typeof window === "undefined") return defaut;
  try {
    const raw = window.localStorage.getItem(CLE);
    if (!raw) return defaut;
    const data = JSON.parse(raw) as Partial<PostesMap>;
    const fusion: PostesMap = { ...defaut };
    for (const p of POSTES_BUREAU) {
      const v: unknown = data[p.key];
      fusion[p.key] = typeof v === "string" ? v : null;
    }
    return fusion;
  } catch {
    return defaut;
  }
}

/** Enregistre l'organigramme du bureau. */
export function savePostes(p: PostesMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(p));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

/** Le poste occupé par un membre (sinon null — membre simple). */
export function posteDeMembre(postes: PostesMap, membreId: string): PosteKey | null {
  for (const p of POSTES_BUREAU) {
    if (postes[p.key] === membreId) return p.key;
  }
  return null;
}
