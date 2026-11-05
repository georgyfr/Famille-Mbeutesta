// ─────────────────────────────────────────────────────────────────────────────
// RÈGLEMENT DE LA TONTINE — Famille.Mbeutetsa
//
// TOUT le paramétrage décidé par le bureau (président en tête) :
//   · cotisations & réunion (montants réels via TONTINE / saveMontants)
//   · types de cotisations mensuelles (sommes attribuées aux membres —
//     module cotisations-types.ts)
//   · impayés & recouvrement (grâce, échelons, sanctions, paiements, encaisseur)
//   · prêts & garanties (taux, plafond, durée, avalistes, garanties, carence)
//     + TYPES DE PRÊTS (natures : social, scolaire, commercial…) — le
//     président choisit la nature, les champs propres au type apparaissent
//   · solidarité — caisse de secours + MÉTHODES DE SOLIDARITÉ (caisse
//     commune, cotisation spéciale, mutualisation, assurance, aide en nature)
//   · épargne (taux, préavis, dépôt minimum, plafond de retrait)
//     + TYPES D'ÉPARGNE (libre, bloquée 3/6/12, projet, scolarité, fêtes)
//     avec leur type d'intérêt (aucun, simple, composé, bonification)
//
// PRINCIPE DES DÉFAUTS (demande de l'administrateur, novembre 2026) :
//   TOUS les chiffres démarrent à 0, toutes les options démarrent désactivées —
//   C'EST LE PRÉSIDENT qui décide de chaque valeur via les boutons
//   « Enregistrer ». Seules exceptions fixées par la maison :
//     · le moyen de paiement « Espèces » est actif par défaut ;
//     · c'est le trésorier qui encaisse les recouvrements par défaut ;
//     · le vote des dossiers du président démarre à « OK » (le bureau
//       approuve) et la majorité pour une aide à « Aucun ».
//
// Le président (et le bureau) réglent ces valeurs dans l'onglet « Paramètres »
// du poste de commandement ; « Publier » les rend VISIBLES À TOUS LES MEMBRES
// (lecture seule) — la page Tontine les affiche alors à la Tontine entière.
//
// Persistance locale (gratuit, hors ligne, zéro serveur) : clé fc_reglement_v1.
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration d'UN type de prêt — chaque valeur démarre à 0. */
export type TypePretConfig = {
  actif: boolean;
  interet: "aucun" | "simple" | "degressif";
  tauxMensuel: number; // % par mois — 0 par défaut
  plafondFcfa: number; // 0 par défaut
  dureeMaxMois: number; // 0 par défaut
  avalistes: 0 | 1 | 2; // 0 par défaut
  garantiesExigees: string[]; // ids de GARANTIES_LABELS — vide par défaut
};

/** Catalogue des types de prêts d'une association / tontine. Le président
 *  choisit LA nature qui correspond à sa Tontine ; les champs du type choisi
 *  apparaissent mis en valeur. */
export const TYPES_PRET_CATALOGUE: { id: string; nom: string; description: string }[] = [
  { id: "social", nom: "Prêt social / d'honneur", description: "Coup de pouce sans intérêt — urgence familiale, entraide" },
  { id: "scolaire", nom: "Prêt scolaire", description: "Rentrée, frais de scolarité et fournitures des enfants" },
  { id: "sante", nom: "Prêt de santé", description: "Hospitalisation, soins, médicaments, consultation" },
  { id: "commerce", nom: "Prêt commercial", description: "Fond de commerce, stock, étal au marché" },
  { id: "agricole", nom: "Prêt agricole", description: "Semences, saison culturale, élevage, récolte" },
  { id: "habitat", nom: "Prêt habitat", description: "Parcelle, construction, réparation de toit" },
  { id: "materiel", nom: "Prêt équipement", description: "Machine, moto, matériel professionnel" },
  { id: "urgence", nom: "Prêt d'urgence", description: "Sinistre immédiat — incendie, inondation, vol" },
  { id: "epargne", nom: "Prêt sur épargne", description: "Adossé à l'épargne bloquée du membre (jusqu'à 80 %)" },
  { id: "developpement", nom: "Prêt de développement (APE)", description: "Activité génératrice de revenus du membre" },
];

/** Types d'intérêt d'un prêt (libellés). */
export const INTERETS_PRET_LABELS: Record<TypePretConfig["interet"], string> = {
  aucun: "Sans intérêt",
  simple: "Intérêt simple",
  degressif: "Taux dégressif",
};

/** Configuration d'UN type d'épargne — chaque valeur démarre à 0. */
export type TypeEpargneConfig = {
  actif: boolean;
  interet: "aucun" | "simple" | "compose" | "bonification";
  tauxMensuel: number; // % par mois — 0 par défaut
  blocageMois: number; // mois de blocage — 0 par défaut
  depotMinFcfa: number; // 0 par défaut
};

/** Catalogue des types d'épargne d'une tontine. */
export const TYPES_EPARGNE_CATALOGUE: { id: string; nom: string; description: string }[] = [
  { id: "libre", nom: "Épargne libre (à vue)", description: "Dépôt et retrait à tout moment" },
  { id: "bloquee3", nom: "Épargne bloquée 3 mois", description: "Taux meilleur, retrait après 3 mois" },
  { id: "bloquee6", nom: "Épargne bloquée 6 mois", description: "Retrait après 6 mois" },
  { id: "bloquee12", nom: "Épargne bloquée 12 mois", description: "Retrait après un an" },
  { id: "projet", nom: "Épargne projet", description: "Bloquée jusqu'à l'objectif fixé (terrain, commerce…)" },
  { id: "scolarite", nom: "Épargne scolarité", description: "Retrait autorisé pour les périodes de rentrée" },
  { id: "fetes", nom: "Épargne festive", description: "Préparation des fêtes de fin d'année" },
];

/** Types d'intérêt d'une épargne (libellés). */
export const INTERETS_EPARGNE_LABELS: Record<TypeEpargneConfig["interet"], string> = {
  aucun: "Aucun intérêt",
  simple: "Intérêt simple",
  compose: "Intérêt composé",
  bonification: "Bonification de fin d'année",
};

/** Les méthodes de solidarité possibles dans une réunion — le président
 *  choisit celle qui arrange la Tontine ; les champs propres à la méthode
 *  choisie apparaissent ensuite. */
export type MethodeSolidarite = "caisse" | "speciale" | "mutualisation" | "assurance" | "nature";

export const METHODES_SOLIDARITE: { id: MethodeSolidarite; nom: string; description: string }[] = [
  { id: "caisse", nom: "Caisse de secours commune", description: "Cotisation mensuelle qui alimente une caisse ; le bureau vote l'aide" },
  { id: "speciale", nom: "Cotisation spéciale d'événement", description: "Appel à contribution ponctuel quand l'événement survient" },
  { id: "mutualisation", nom: "Mutualisation directe entre membres", description: "Chaque membre verse sa part directement à la famille concernée" },
  { id: "assurance", nom: "Fonds d'assurance mutualisé", description: "Un fonds bloqué, alimenté régulièrement, réservé aux sinistres" },
  { id: "nature", nom: "Aide en nature", description: "Présence, corvée, main-d'œuvre, transport — sans décaissement" },
];

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
    tauxMensuel: number; // % par mois (0 par défaut)
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
    majorityPresident: "ok" | "tiers" | "deuxtiers" | "unanime"; // vote quand le président est récusé
    /* — RECONDUCTION DU CAPITAL NON REMBOURSÉ (demande du président, v12) :
     *    quand un prêt n'est pas remboursé à sa date d'échéance, la somme due
     *    (capital + intérêts courus) devient un NOUVEAU CAPITAL — les intérêts
     *    repartent de cette nouvelle somme pour une nouvelle période, et ainsi
     *    de suite. L'évolution reste visible MOIS PAR MOIS dans les calendriers.
     *    Exemple : 10 000 FCFA prêtés en janvier à 3 %/mois → mars : 10 900 ;
     *    si non remboursé, 10 900 devient le nouveau capital → juin : ≈ 11 881. */
    reconductionCapital: boolean; // activer la reconduction en nouveau capital
    periodeCapitalisationMois: number; // mois entre deux reconductions (0 = jamais)
    /* — TYPES DE PRÊTS : la nature choisie + ses propres réglages — */
    typeChoisi: string | null; // id du TYPES_PRET_CATALOGUE choisi par le président
    types: Record<string, TypePretConfig>; // réglages par nature de prêt
  };

  /* — solidarité — */
  solidarite: {
    methode: MethodeSolidarite; // méthode choisie par le président
    cotisationMensuelle: number; // FCFA par membre pour alimenter (caisse)
    plafondAideFcfa: number; // aide maximale par événement
    events: {
      deuil: boolean;
      mariage: boolean;
      naissance: boolean;
      maladie: boolean;
      sinistre: boolean; // incendie, inondation…
    };
    carenceMois: number; // ancienneté minimale avant droit à l'aide
    majority: "aucun" | "moitie" | "troisquarts" | "unanime"; // majorité du bureau pour approuver
    delaiVersementJours: number; // délai de versement après approbation
    /* — champs propres à la méthode choisie (tous à 0 par défaut) — */
    montantSuggere: number; // cotisation spéciale : somme suggérée
    delaiCollecteJours: number; // cotisation spéciale / mutualisation : délai de collecte
    montantParMembre: number; // mutualisation : part de chaque membre
    montantFonds: number; // assurance : montant du fonds bloqué
    cotisationEntretien: number; // assurance : entretien du fonds
  };

  /* — épargne — */
  epargne: {
    tauxMensuel: number; // % par mois
    /** true = le bureau a FIXÉ son propre taux (même 0 = « intérêts retirés ») ;
     *  false = le taux de la maison reste en vigueur (TAUX_DEFAUT, 3 %/mois). */
    tauxFixe: boolean;
    /** COMMENT LES INTÉRÊTS SONT COLLECTÉS — peut changer par décision du bureau :
     *  capitalise = crédités chaque mois sur le solde (tableau du membre),
     *  reunion    = remis en espèces au membre à chaque réunion,
     *  finAnnee   = accumulés puis versés en une seule fois en décembre,
     *  caisse     = versés à la caisse sociale (la rémunération profite à tous). */
    collecteInterets: "capitalise" | "reunion" | "finAnnee" | "caisse";
    preavisJours: number; // préavis avant tout retrait
    depotMinFcfa: number; // dépôt minimum
    retraitMaxMois: number; // retrait maximal par mois (% du solde)
    /* — TYPES D'ÉPARGNE : le type choisi + ses propres réglages — */
    typeChoisi: string | null; // id du TYPES_EPARGNE_CATALOGUE
    types: Record<string, TypeEpargneConfig>;
  };
};

const TYPES_PRET_DEFAUT = (): Record<string, TypePretConfig> =>
  Object.fromEntries(TYPES_PRET_CATALOGUE.map((t) => [t.id, {
    actif: false, interet: "simple" as const, tauxMensuel: 0, plafondFcfa: 0,
    dureeMaxMois: 0, avalistes: 0 as const, garantiesExigees: [],
  }]));

const TYPES_EPARGNE_DEFAUT = (): Record<string, TypeEpargneConfig> =>
  Object.fromEntries(TYPES_EPARGNE_CATALOGUE.map((t) => [t.id, {
    actif: false, interet: "simple" as const, tauxMensuel: 0, blocageMois: 0, depotMinFcfa: 0,
  }]));

export const REGLEMENT_DEFAUT: Reglement = {
  version: 1,
  publieLe: null,
  publiePar: "Bureau — Président",
  quorumMembres: 0,
  reportsMax: 0,
  impayes: {
    delaiGraceJours: 0,
    relancesAvantEscalade: 0,
    echelons: { relance: false, miseEnDemeure: false, convocation: false, garants: false },
    delaiEntreEtapesJours: 0,
    amendeAuto: false,
    niveauAmende: 1,
    apresNImpayes: 0,
    sanction: "aucune",
    paiements: { especes: true, orangeMoney: false, mtnMoMo: false, wave: false, virement: false },
    encaisseur: "tresorier",
  },
  prets: {
    tauxMensuel: 0,
    plafondFcfa: 0,
    dureeMaxMois: 0,
    avalisteObligatoire: false,
    nbAvalistes: 1,
    cosignTresorier: false,
    garanties: { commerce: false, salaire: false, terrain: false, materiel: false, epargne: false },
    carenceMois: 0,
    majorityPresident: "ok",
    /* v13 — la reconduction du capital non remboursé (demande du président :
     * « si l'intérêt n'a pas été remboursé, la somme totale de ce mois devient
     * l'élément sur lequel le pourcentage est de nouveau recalculé ») est
     * ACTIVE PAR DÉFAUT, tous les 3 mois — désactivable dans Paramètres. */
    reconductionCapital: true,
    periodeCapitalisationMois: 3,
    typeChoisi: null,
    types: TYPES_PRET_DEFAUT(),
  },
  solidarite: {
    methode: "caisse",
    cotisationMensuelle: 0,
    plafondAideFcfa: 0,
    events: { deuil: false, mariage: false, naissance: false, maladie: false, sinistre: false },
    carenceMois: 0,
    majority: "aucun",
    delaiVersementJours: 0,
    montantSuggere: 0,
    delaiCollecteJours: 0,
    montantParMembre: 0,
    montantFonds: 0,
    cotisationEntretien: 0,
  },
  epargne: {
    tauxMensuel: 0,
    tauxFixe: false,
    collecteInterets: "capitalise" as const,
    preavisJours: 0,
    depotMinFcfa: 0,
    retraitMaxMois: 0,
    typeChoisi: null,
    types: TYPES_EPARGNE_DEFAUT(),
  },
};

/* Clé v2 — réinitialise l'ancien règlement sur les nouveaux défauts :
 * tout à 0 / désactivé (espèces, trésorier, OK, Aucun conservés). */
const CLE = "fc_reglement_v2";

/** Fusionne prudemment un enregistrement partiel avec les défauts — y compris
 *  les objets imbriqués (echelons, paiements, garanties, events, types…). */
function fusion(r: Partial<Reglement> | null): Reglement {
  const d = REGLEMENT_DEFAUT;
  if (!r) return { ...d };
  return {
    ...d,
    ...r,
    impayes: {
      ...d.impayes,
      ...(r.impayes ?? {}),
      echelons: { ...d.impayes.echelons, ...(r.impayes?.echelons ?? {}) },
      paiements: { ...d.impayes.paiements, ...(r.impayes?.paiements ?? {}) },
    },
    prets: {
      ...d.prets,
      ...(r.prets ?? {}),
      garanties: { ...d.prets.garanties, ...(r.prets?.garanties ?? {}) },
      types: { ...TYPES_PRET_DEFAUT(), ...(r.prets?.types ?? {}) },
    },
    solidarite: {
      ...d.solidarite,
      ...(r.solidarite ?? {}),
      events: { ...d.solidarite.events, ...(r.solidarite?.events ?? {}) },
    },
    epargne: {
      ...d.epargne,
      ...(r.epargne ?? {}),
      types: { ...TYPES_EPARGNE_DEFAUT(), ...(r.epargne?.types ?? {}) },
    },
  };
}

/** Lit le règlement enregistré (sinon les valeurs par défaut). */
export function loadReglement(): Reglement {
  if (typeof window === "undefined") return { ...REGLEMENT_DEFAUT };
  try {
    const raw = window.localStorage.getItem(CLE);
    if (!raw) return { ...REGLEMENT_DEFAUT };
    return migrerReconduction(fusion(JSON.parse(raw) as Partial<Reglement>));
  } catch {
    return { ...REGLEMENT_DEFAUT };
  }
}

/* MIGRATION v13 — la reconduction du capital non remboursé (la règle du
 * président : « après le nombre de mois fixé dans les paramètres, si l'intérêt
 * n'a pas été remboursé, la somme totale de ce mois devient l'élément sur
 * lequel le pourcentage est de nouveau recalculé ») est désormais appliquée
 * AUSSI aux prêts faits à la réunion. Pour qu'elle soit active d'emblée chez
 * les bureaux qui n'avaient pas encore touché au réglage (la v12 l'expédiait
 * à false), on l'active UNE SEULE FOIS au premier chargement, puis on note
 * la migration : si le bureau la désactive volontairement ensuite, on ne la
 * réactive jamais. */
const CLE_MIG_RECONDUCTION = "fc_reconduction_mig_v13";

function migrerReconduction(r: Reglement): Reglement {
  if (typeof window === "undefined") return r;
  if (window.localStorage.getItem(CLE_MIG_RECONDUCTION)) return r;
  try {
    window.localStorage.setItem(CLE_MIG_RECONDUCTION, "1");
  } catch {
    /* navigation privée — la migration reste en mémoire pour cette session */
  }
  if (r.prets.reconductionCapital) return r;
  const mig: Reglement = {
    ...r,
    prets: {
      ...r.prets,
      reconductionCapital: true,
      periodeCapitalisationMois: r.prets.periodeCapitalisationMois > 0 ? r.prets.periodeCapitalisationMois : 3,
    },
  };
  saveReglement(mig);
  return mig;
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
  aucun: "Aucune majorité requise",
  moitie: "Majorité simple (1/2)",
  troisquarts: "Majorité des 3/4",
  unanime: "Unanimité",
  ok: "OK — le bureau approuve",
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

/** Manières de collecter les intérêts d'épargne — libellés courts (Seg). */
export const COLLECTE_INTERETS_LABELS: Record<Reglement["epargne"]["collecteInterets"], string> = {
  capitalise: "Crédités chaque mois sur le solde",
  reunion: "Remis au membre à chaque réunion",
  finAnnee: "Versés en une fois en fin d'année",
  caisse: "Versés à la caisse sociale",
};

/** Manières de collecter les intérêts — explication complète affichée sous le choix. */
export const COLLECTE_INTERETS_NOTES: Record<Reglement["epargne"]["collecteInterets"], string> = {
  capitalise: "Le trésorier crédite les intérêts en fin de mois sur le solde de chacun : le tableau « Mes intérêts mois par mois » du membre grossit mois après mois, et l'argent reste dans la caisse jusqu'au retrait.",
  reunion: "À chaque réunion, le trésorier remet en espèces au membre les intérêts du mois : le solde d'épargne ne bouge que par les dépôts, mais le membre repart chaque fois avec sa rémunération en poche.",
  finAnnee: "Les intérêts s'accumulent au registre sans toucher au solde, puis sont versés EN UNE SEULE FOIS à la réunion de décembre — bonne surprise de fin d'année.",
  caisse: "Les intérêts de toutes les épargnes alimentent la caisse sociale : chaque membre récupère son capital intégralement, la rémunération, elle, profite à toute la famille.",
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
