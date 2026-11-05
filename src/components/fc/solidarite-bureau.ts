// ─────────────────────────────────────────────────────────────────────────────
// SOLIDARITÉ DU BUREAU — types de solidarité, mains levées & visites
// — Famille.Mbeutetsa
//
// Demande du président (v14) : « Le président peut ajouter autant de types de
// solidarité avec bien évidemment les sommes appropriées. Il peut associer
// autant de variables à ces différentes sommes car tout le monde ne paye pas
// la solidarité de la même manière. Il peut aussi ajouter des types de mains
// levées. Et lorsqu'il ajoute les types de solidarité, il peut décider à quel
// membre attribuer ce type de solidarité » — avec une RECHERCHE DYNAMIQUE
// pour trouver les membres, un DÉLAI de remboursement (ou le délai pour être
// à jour de sa solidarité) par type, et un CALENDRIER DE VISITES pour les
// types de solidarité.
//
// Modèle :
//   · TypeSolidarite  — un type (nom, somme de base, délai en mois) + ses
//     VARIABLES (membre → montant) : chaque membre attribué peut payer une
//     somme différente de la base (« tout le monde ne paie pas pareil ») ;
//   · MainLevee       — un type de main levée (vote à main levée) nommé ;
//   · VisiteSolidarite — une visite du calendrier : membre concerné, type de
//     solidarité, MOIS, délégation (qui représente la cantine), note.
//
// Persistance locale (gratuit, hors ligne, zéro serveur) :
//   · fc_solidarite_types_v1  — les types de solidarité + leurs variables ;
//   · fc_mains_levees_v1      — les types de mains levées ;
//   · fc_visites_solidarite_v1 — le calendrier des visites.
// ─────────────────────────────────────────────────────────────────────────────

/** Une « variable » d'un type de solidarité : le membre attribué + la somme
 *  QU'IL paie pour ce type (par défaut la somme de base du type — modifiable
 *  ensuite, car tout le monde ne paie pas la solidarité de la même manière). */
export type VariableSolidarite = {
  id: string;
  membreId: string;
  /** Somme que CE membre verse pour ce type (FCFA). */
  montant: number;
};

/** Un type de solidarité créé par le président : nom, somme de base, délai
 *  (mois) pour être à jour / rembourser, membres attribués avec leurs
 *  sommes individuelles (variables). */
export type TypeSolidarite = {
  id: string;
  nom: string;
  /** Somme de base du type (FCFA) — préremplit la somme de chaque membre. */
  somme: number;
  /** Délai en MOIS pour être à jour de cette solidarité (ou la rembourser). */
  delaiMois: number;
  /** Les membres attribués à ce type et ce que chacun paie. */
  variables: VariableSolidarite[];
};

/** Un type de main levée — le bureau vote certaines décisions à main levée ;
 *  le président nomme autant de types qu'il veut. */
export type MainLevee = {
  id: string;
  nom: string;
  /** À quoi sert cette main levée (libre). */
  note: string;
};

/** Une visite du calendrier de visites de solidarité : la cantine rend visite
 *  à un membre concerné par un type de solidarité (deuil, mariage, maladie…). */
export type VisiteSolidarite = {
  id: string;
  /** Membre visité / concerné. */
  membreId: string;
  /** Type de solidarité concerné (id de TypeSolidarite) — null si libre. */
  typeId: string | null;
  /** Mois (0-11) de la visite. */
  moisIdx: number;
  /** Qui représente la cantine (délégation — libellé libre). */
  delegation: string;
  /** Note libre (lieu, appui prévu…). */
  note: string;
};

/* — DONNÉES DE DÉMONSTRATION (statiques : hydratation sûre, aucun Date ici) — */
const TYPES_DEMO: TypeSolidarite[] = [
  {
    id: "ts-demo-1",
    nom: "Participation aux deuils",
    somme: 25_000,
    delaiMois: 2,
    variables: [
      { id: "ts-demo-1-v1", membreId: "f07", montant: 25_000 },
      { id: "ts-demo-1-v2", membreId: "f08", montant: 15_000 },
    ],
  },
  {
    id: "ts-demo-2",
    nom: "Cadeau de mariage",
    somme: 10_000,
    delaiMois: 1,
    variables: [],
  },
];

const MAINS_LEVEES_DEMO: MainLevee[] = [
  { id: "ml-demo-1", nom: "Main levée — aide de solidarité", note: "Pour approuver une aide de la caisse lors de la réunion" },
  { id: "ml-demo-2", nom: "Main levée — échange de tour", note: "Pour accepter un échange de tour entre deux membres" },
];

const VISITES_DEMO: VisiteSolidarite[] = [
  { id: "vs-demo-1", membreId: "f09", typeId: "ts-demo-1", moisIdx: 5, delegation: "Vice-présidente + 2 membres", note: "Domicile du membre — apporter le soutien de la cantine" },
  { id: "vs-demo-2", membreId: "f10", typeId: null, moisIdx: 8, delegation: "Secrétaire + Trésorier", note: "Visite d'encouragement après l'hospitalisation" },
];

function lire<T>(cle: string, demo: T[], valide: (x: unknown) => x is T): T[] {
  if (typeof window === "undefined") return structuredCloneDemo(demo);
  try {
    const raw = window.localStorage.getItem(cle);
    if (!raw) return structuredCloneDemo(demo);
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return structuredCloneDemo(demo);
    const liste = data.filter(valide);
    return liste.length > 0 ? liste : structuredCloneDemo(demo);
  } catch {
    return structuredCloneDemo(demo);
  }
}

/* Recopie profonde simple (les démos ne contiennent que des données JSON). */
function structuredCloneDemo<T>(demo: T[]): T[] {
  return JSON.parse(JSON.stringify(demo)) as T[];
}

function ecrire<T>(cle: string, liste: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(liste));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

const CLE_TYPES = "fc_solidarite_types_v1";
const CLE_MAINS = "fc_mains_levees_v1";
const CLE_VISITES = "fc_visites_solidarite_v1";

const estTypeSolidarite = (x: unknown): x is TypeSolidarite =>
  typeof x === "object" && x !== null &&
  typeof (x as TypeSolidarite).id === "string" &&
  typeof (x as TypeSolidarite).nom === "string" &&
  Array.isArray((x as TypeSolidarite).variables);

const estMainLevee = (x: unknown): x is MainLevee =>
  typeof x === "object" && x !== null && typeof (x as MainLevee).id === "string" && typeof (x as MainLevee).nom === "string";

const estVisite = (x: unknown): x is VisiteSolidarite =>
  typeof x === "object" && x !== null && typeof (x as VisiteSolidarite).id === "string" && typeof (x as VisiteSolidarite).membreId === "string";

/** Lit les types de solidarité (sinon la démo). */
export function loadTypesSolidarite(): TypeSolidarite[] {
  return lire(CLE_TYPES, TYPES_DEMO, estTypeSolidarite);
}

/** Enregistre les types de solidarité. */
export function saveTypesSolidarite(liste: TypeSolidarite[]): void {
  ecrire(CLE_TYPES, liste);
}

/** Lit les types de mains levées (sinon la démo). */
export function loadMainsLevees(): MainLevee[] {
  return lire(CLE_MAINS, MAINS_LEVEES_DEMO, estMainLevee);
}

/** Enregistre les types de mains levées. */
export function saveMainsLevees(liste: MainLevee[]): void {
  ecrire(CLE_MAINS, liste);
}

/** Lit le calendrier des visites de solidarité (sinon la démo). */
export function loadVisitesSolidarite(): VisiteSolidarite[] {
  return lire(CLE_VISITES, VISITES_DEMO, estVisite);
}

/** Enregistre le calendrier des visites. */
export function saveVisitesSolidarite(liste: VisiteSolidarite[]): void {
  ecrire(CLE_VISITES, liste);
}
