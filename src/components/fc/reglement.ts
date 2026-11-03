// ─────────────────────────────────────────────────────────────────────────────
// RÈGLEMENT DE LA CANTINE — Famille.Mbeutetsa
//
// TOUT le paramétrage décidé par le bureau (président en tête) :
//   · cotisations & réunion (montants réels via TONTINE / saveMontants)
//   · impayés & recouvrement (grâce, échelons, sanctions, paiements, encaisseur)
//   · prêts & garanties (taux, plafond, durée, avalistes, garanties, carence)
//   · solidarité — caisse de secours (cotisation, plafond, événements, majorité)
//   · épargne (taux, préavis, dépôt minimum, plafond de retrait)
//
// Le président (et le bureau) réglent ces valeurs dans l'onglet « Paramètres »
// du poste de commandement ; « Publier » les rend VISIBLES À TOUS LES MEMBRES
// (lecture seule) — la page Tontine les affiche alors à la cantine entière.
//
// Persistance locale (gratuit, hors ligne, zéro serveur) : clé fc_reglement_v1.
// ─────────────────────────────────────────────────────────────────────────────

export type Reglement = {
  /** Version incrémentée à chaque publication aux membres. */
  version: number;
  /** Date de la dernière publication (ISO) — null = jamais publié. */
  publieLe: string | null;
  /** Par qui la dernière publication a été faite (libellé libre). */
  publiePar: string;

  /* — réunion & quorum (les MONTANTS vivent dans TONTINE / saveMontants) — */
  quorumMembres: number; // minimum de membres présents pour délibérer
  reportsMax: number; // reports de réunion tolérés consécutivement

  /* — impayés & recouvrement — */
  impayes: {
    delaiGraceJours: number; // jours avant la 1ʳᵉ relance
    relancesAvantEscalade: number; // relances amiables avant l'échelon suivant
    echelons: {
      relance: boolean; // 1 — Relance amiable (push + SMS)
      miseEnDemeure: boolean; // 2 — Mise en demeure écrite
      convocation: boolean; // 3 — Convocation par le bureau
      garants: boolean; // 4 — Recours aux garants & avalistes
    };
    delaiEntreEtapesJours: number; // délai entre deux échelons
    amendeAuto: boolean; // pénalité de retard appliquée automatiquement
    niveauAmende: 1 | 2 | 3; // à quel échelon la pénalité s'applique d'office
    apresNImpayes: number; // nombre d'impayés consécutifs avant sanction
    sanction: "aucune" | "vote" | "prets" | "exclusion"; // sanction décidée
    paiements: {
      especes: boolean;
      orangeMoney: boolean;
      mtnMoMo: boolean;
      wave: boolean;
      virement: boolean;
    };
    encaisseur: "tresorier" | "president" | "deux"; // qui reçoit les recouvrements
  };

  /* — prêts & garanties — */
  prets: {
    tauxMensuel: number; // % par mois (3 par défaut)
    plafondFcfa: number; // montant maximal d'un prêt
    dureeMaxMois: number; // durée maximale de remboursement
    avalisteObligatoire: boolean;
    nbAvalistes: 1 | 2; // nombre d'avalistes exigés
    cosignTresorier: boolean; // co-signature du trésorier requise
    garanties: {
      commerce: boolean; // fond de commerce
      salaire: boolean; // salaire / revenu déclaré
      terrain: boolean; // terrain / parcelle
      materiel: boolean; // matériel & équipement
      epargne: boolean; // épargne bloquée
    };
    carenceMois: number; // ancienneté minimale avant droit au prêt
    majorityPresident: "tiers" | "deuxtiers" | "unanime"; // vote quand le président est récusé
  };

  /* — solidarité (caisse de secours) — */
  solidarite: {
    cotisationMensuelle: number; // FCFA par membre pour alimenter la caisse
    plafondAideFcfa: number; // aide maximale par événement
    events: {
      deuil: boolean;
      mariage: boolean;
      naissance: boolean;
      maladie: boolean;
      sinistre: boolean; // incendie, inondation…
    };
    carenceMois: number; // ancienneté minimale avant droit à l'aide
    majority: "moitie" | "troisquarts" | "unanime"; // majorité du bureau pour approuver
    delaiVersementJours: number; // délai de versement après approbation
  };

  /* — épargne — */
  epargne: {
    tauxMensuel: number; // % par mois
    preavisJours: number; // préavis avant tout retrait
    depotMinFcfa: number; // dépôt minimum
    retraitMaxMois: number; // retrait maximal par mois (% du solde)
  };
};

export const REGLEMENT_DEFAUT: Reglement = {
  version: 1,
  publieLe: null,
  publiePar: "Bureau — Président",
  quorumMembres: 6,
  reportsMax: 2,
  impayes: {
    delaiGraceJours: 3,
    relancesAvantEscalade: 2,
    echelons: { relance: true, miseEnDemeure: true, convocation: true, garants: true },
    delaiEntreEtapesJours: 7,
    amendeAuto: true,
    niveauAmende: 2,
    apresNImpayes: 3,
    sanction: "prets",
    paiements: { especes: true, orangeMoney: true, mtnMoMo: true, wave: false, virement: false },
    encaisseur: "tresorier",
  },
  prets: {
    tauxMensuel: 3,
    plafondFcfa: 300_000,
    dureeMaxMois: 6,
    avalisteObligatoire: true,
    nbAvalistes: 1,
    cosignTresorier: true,
    garanties: { commerce: true, salaire: true, terrain: true, materiel: true, epargne: true },
    carenceMois: 3,
    majorityPresident: "deuxtiers",
  },
  solidarite: {
    cotisationMensuelle: 1_000,
    plafondAideFcfa: 50_000,
    events: { deuil: true, mariage: true, naissance: true, maladie: true, sinistre: false },
    carenceMois: 2,
    majority: "troisquarts",
    delaiVersementJours: 3,
  },
  epargne: {
    tauxMensuel: 3,
    preavisJours: 7,
    depotMinFcfa: 5_000,
    retraitMaxMois: 50,
  },
};

const CLE = "fc_reglement_v1";

/** Lit le règlement enregistré (sinon les valeurs par défaut). */
export function loadReglement(): Reglement {
  if (typeof window === "undefined") return { ...REGLEMENT_DEFAUT };
  try {
    const raw = window.localStorage.getItem(CLE);
    if (!raw) return { ...REGLEMENT_DEFAUT };
    const p = JSON.parse(raw) as Partial<Reglement>;
    // Fusion tolérante : chaque groupe absent garde sa valeur par défaut.
    return {
      ...REGLEMENT_DEFAUT,
      ...p,
      impayes: { ...REGLEMENT_DEFAUT.impayes, ...(p.impayes ?? {}) },
      prets: { ...REGLEMENT_DEFAUT.prets, ...(p.prets ?? {}) },
      solidarite: { ...REGLEMENT_DEFAUT.solidarite, ...(p.solidarite ?? {}) },
      epargne: { ...REGLEMENT_DEFAUT.epargne, ...(p.epargne ?? {}) },
    };
  } catch {
    return { ...REGLEMENT_DEFAUT };
  }
}

/** Enregistre le règlement (brouillon du bureau — pas encore publié). */
export function saveReglement(r: Reglement): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(r));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

/** Publie le règlement aux membres : version +1, horodatage, notification. */
export function publierReglement(r: Reglement, par: string): Reglement {
  const publie: Reglement = {
    ...r,
    version: r.version + 1,
    publieLe: new Date().toISOString(),
    publiePar: par || "Bureau — Président",
  };
  saveReglement(publie);
  return publie;
}

/* ─── libellés & aides d'affichage — partagés maquette ⇄ page membres ─── */

export const ECHELONS_LABELS: Record<keyof Reglement["impayes"]["echelons"], string> = {
  relance: "Relance amiable",
  miseEnDemeure: "Mise en demeure",
  convocation: "Convocation par le bureau",
  garants: "Garants & avalistes",
};

export const SANCTIONS_LABELS: Record<Reglement["impayes"]["sanction"], string> = {
  aucune: "Aucune sanction automatique",
  vote: "Suspension du droit de vote",
  prets: "Suspension des prêts",
  exclusion: "Exclusion après vote du bureau",
};

export const PAIEMENTS_LABELS: Record<keyof Reglement["impayes"]["paiements"], string> = {
  especes: "Espèces",
  orangeMoney: "Orange Money",
  mtnMoMo: "MTN MoMo",
  wave: "Wave",
  virement: "Virement bancaire",
};

export const ENCAISSEUR_LABELS: Record<Reglement["impayes"]["encaisseur"], string> = {
  tresorier: "Le trésorier seul",
  president: "Le président seul",
  deux: "Président + Trésorier (à deux)",
};

export const MAJORITES_LABELS: Record<string, string> = {
  moitie: "Majorité simple (1/2)",
  troisquarts: "Majorité des 3/4",
  unanime: "Unanimité",
  tiers: "Majorité simple des votants",
  deuxtiers: "Majorité des 2/3",
};

export const GARANTIES_LABELS: Record<keyof Reglement["prets"]["garanties"], string> = {
  commerce: "Fond de commerce",
  salaire: "Salaire / revenu déclaré",
  terrain: "Terrain / parcelle",
  materiel: "Matériel & équipement",
  epargne: "Épargne bloquée",
};

export const EVENTS_SOLIDAIRES_LABELS: Record<keyof Reglement["solidarite"]["events"], string> = {
  deuil: "Deuil",
  mariage: "Mariage",
  naissance: "Naissance",
  maladie: "Maladie / hospitalisation",
  sinistre: "Incendie & sinistres",
};

/** `fcfa` local (le module est aussi importé par la page membres). */
export const fmtFcfa = (n: number) =>
  `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
