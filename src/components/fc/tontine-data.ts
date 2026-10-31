// ─────────────────────────────────────────────────────────────────────────────
// Moteur de la TONTINE FAMILIALE — Famille.Mbeutetsa
//
// Une seule tontine, présente par défaut (pas de création, pas de liste).
// Effectif : 10 personnes fictives « en attente d'activation » (elles jouent
// les rôles du bureau et les simples membres) + « Vous » (membre connecté).
// Calendrier : réunion le 2ᵉ dimanche de chaque mois ; 11 tours
// (janvier → novembre, chacun reçoit la somme une fois) puis assemblée
// générale en décembre. Tous les montants affichés dans la page sont
// DÉRIVÉS de ces données — rien n'est codé en dur dans l'interface.
// ─────────────────────────────────────────────────────────────────────────────

/* ══════════════════════════ règles de la tontine ══════════════════════════ */

export const TONTINE = {
  montantCotisation: 10_000, // FCFA par membre et par réunion
  montantCollation: 2_000, // FCFA par personne et par réunion
  fraisAdhesion: 5_000, // une seule fois — alimente la caisse sociale
  penaliteRetard: 500,
  penaliteAbsence: 1_000,
  jourLabel: "2ᵉ dimanche du mois",
} as const;

export const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
export const MOIS_FR_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/** Somme remise au bénéficiaire : tout le monde cotise sauf le bénéficiaire. */
export const potMensuel = (effectif: number) => (effectif - 1) * TONTINE.montantCotisation;
/** Collation : tout le monde y contribue, y compris le bénéficiaire. */
export const collationMensuelle = (effectif: number) => effectif * TONTINE.montantCollation;

/* ══════════════════════════ rôles du bureau ══════════════════════════ */

export type RoleKey = "president" | "vice_president" | "commissaire" | "tresorier" | "censeur" | "membre";

export type RoleMeta = {
  label: string;
  short: string;
  badge: string; // classes du badge de rôle
  accent: string; // couleur d'accent (icônes, bordures)
  summary: string;
};

export const ROLE_META: Record<RoleKey, RoleMeta> = {
  president: {
    label: "Président(e)", short: "Président",
    badge: "bg-[#1E4D2B] text-white border-transparent", accent: "#1E4D2B",
    summary: "Conduit les réunions, représente la tontine et veille au règlement.",
  },
  vice_president: {
    label: "Vice-président(e)", short: "Vice-prés.",
    badge: "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30", accent: "#2F6B45",
    summary: "Supplée le président et coordonne les préparatifs de chaque réunion.",
  },
  commissaire: {
    label: "Commissaire aux comptes", short: "Commissaire",
    badge: "bg-[#3D6B72]/10 text-[#3D6B72] border-[#3D6B72]/30", accent: "#3D6B72",
    summary: "Contrôle les caisses et audite le journal de caisse chaque trimestre.",
  },
  tresorier: {
    label: "Trésorier(ère)", short: "Trésorier",
    badge: "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45", accent: "#8A6420",
    summary: "Encaisse les cotisations, remet la somme du mois au bénéficiaire et tient le journal de caisse.",
  },
  censeur: {
    label: "Censeur", short: "Censeur",
    badge: "bg-[#B85C33]/10 text-[#B85C33] border-[#B85C33]/30", accent: "#B85C33",
    summary: "Veille à l'équité, écoute les membres et protège leur dignité.",
  },
  membre: {
    label: "Membre", short: "Membre",
    badge: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]", accent: "#5C6B60",
    summary: "Cotise chaque mois et participe aux réunions du 2ᵉ dimanche.",
  },
};

export const ROLES_BUREAU: RoleKey[] = ["president", "vice_president", "commissaire", "tresorier", "censeur"];

/* ══════════════════════════ membres ══════════════════════════ */

export type Member = {
  id: string;
  name: string;
  role: RoleKey;
  phone: string;
  city: string;
  since: string; // année d'adhésion
  tour: number; // 1..11 → mois de réception de la somme (1 = janvier)
  fictif: boolean; // personne fictive en attente d'activation
  isVous: boolean;
};

/** Les 10 personnes fictives — simples membres et titulaires du bureau. */
export const MEMBRES_FICTIFS: Member[] = [
  { id: "f01", name: "Joseph Mbeutetsa", role: "president", phone: "+237 6 99 41 27 08", city: "Douala", since: "2015", tour: 1, fictif: true, isVous: false },
  { id: "f02", name: "Marie-Louise Nguetsop", role: "vice_president", phone: "+237 6 77 85 30 12", city: "Bafoussam", since: "2015", tour: 2, fictif: true, isVous: false },
  { id: "f03", name: "Émile Tchoumi", role: "tresorier", phone: "+237 6 55 62 14 90", city: "Douala", since: "2016", tour: 3, fictif: true, isVous: false },
  { id: "f04", name: "Bernadette Kamga", role: "commissaire", phone: "+237 6 91 08 47 35", city: "Yaoundé", since: "2016", tour: 4, fictif: true, isVous: false },
  { id: "f05", name: "Roger Ndoumbe", role: "censeur", phone: "+237 6 78 33 91 26", city: "Douala", since: "2017", tour: 5, fictif: true, isVous: false },
  { id: "f06", name: "Françoise Mbeutetsa", role: "membre", phone: "+33 6 42 51 88 07", city: "Paris (diaspora)", since: "2018", tour: 6, fictif: true, isVous: false },
  { id: "f07", name: "Patrick Talla", role: "membre", phone: "+237 6 96 74 20 51", city: "Douala", since: "2019", tour: 7, fictif: true, isVous: false },
  { id: "f08", name: "Chantal Djuidje", role: "membre", phone: "+237 6 70 19 56 84", city: "Bafoussam", since: "2020", tour: 8, fictif: true, isVous: false },
  { id: "f09", name: "Hervé Fotso", role: "membre", phone: "+237 6 57 82 40 63", city: "Yaoundé", since: "2021", tour: 9, fictif: true, isVous: false },
  { id: "f10", name: "Aurélie Simo", role: "membre", phone: "+1 514 236 7890", city: "Montréal (diaspora)", since: "2023", tour: 10, fictif: true, isVous: false },
];

/** Effectif complet : les 10 fictifs + « Vous » (membre connecté), par ancienneté. */
export function buildRoster(vousName?: string | null): Member[] {
  const vous: Member = {
    id: "vous",
    name: (vousName ?? "").trim() || "Vous",
    role: "membre",
    phone: "",
    city: "Ma position",
    since: String(new Date().getFullYear()),
    tour: 11,
    fictif: false,
    isVous: true,
  };
  return [...MEMBRES_FICTIFS, vous];
}

/** Mois du tour n (1-based) : tour 1 = janvier… tour 11 = novembre. */
export const moisDuTour = (tour: number) => MOIS_FR[tour - 1] ?? "—";

/* ══════════════════════════ calendrier — les 2ᵉ dimanches ══════════════════════════ */

/** Jour du 2ᵉ dimanche du mois (8 à 14). */
export function secondSunday(year: number, month0: number): number {
  const dow = new Date(year, month0, 1).getDay(); // 0 = dimanche
  return 1 + ((7 - dow) % 7) + 7;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type EtatMois = "passe" | "courant" | "futur";

export type TourMois = {
  month0: number; // 0..11
  mois: string;
  annee: number;
  jour: number; // jour du 2ᵉ dimanche
  date: Date;
  iso: string; // yyyy-mm-dd de la réunion
  tour: number | null; // null en décembre (AG)
  beneficiary: Member | null; // null en décembre (AG)
  ag: boolean; // assemblée générale
  pot: number;
  collation: number;
  total: number;
  etat: EtatMois; // le nom du bénéficiaire n'apparaît que passé/courant (le moment venu)
};

/** Construit les 12 mois de l'année : 11 tours + l'AG de décembre. */
export function buildAnnee(year: number, roster: Member[], today = new Date()): TourMois[] {
  const byTour = new Map<number, Member>();
  roster.forEach((m) => byTour.set(m.tour, m));
  const moisCourant = today.getMonth();
  return MOIS_FR.map((mois, m0) => {
    const jour = secondSunday(year, m0);
    const date = new Date(year, m0, jour);
    const ag = m0 === 11;
    const beneficiary = ag ? null : byTour.get(m0 + 1) ?? null;
    const pot = ag ? 0 : potMensuel(roster.length);
    const collation = ag ? 0 : collationMensuelle(roster.length);
    const etat: EtatMois = m0 < moisCourant ? "passe" : m0 === moisCourant ? "courant" : "futur";
    return {
      month0: m0, mois, annee: year, jour, date,
      iso: `${year}-${String(m0 + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`,
      tour: ag ? null : m0 + 1, beneficiary, ag, pot, collation, total: pot + collation, etat,
    };
  });
}

/** État de la réunion d'un mois au niveau du jour : passée / aujourd'hui / à venir. */
export function etatReunion(t: TourMois, today = new Date()): "passee" | "aujourdhui" | "avenir" {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d0 = new Date(t.annee, t.month0, t.jour).getTime();
  if (d0 < t0) return "passee";
  if (d0 === t0) return "aujourdhui";
  return "avenir";
}

/** Nombre de jours avant la réunion (négatif = passée). */
export function joursAvant(t: TourMois, today = new Date()): number {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d0 = new Date(t.annee, t.month0, t.jour).getTime();
  return Math.round((d0 - t0) / 86_400_000);
}

/* ══════════════════════════ suivi personnel des versements ══════════════════════════ */

const PAYES_KEY = "fc_tontine_payes_v1";

/** Clé d'un versement : à quelle personne, pour quelle réunion. */
export const payeKey = (memberId: string, annee: number, month0: number) => `${memberId}:${annee}:${month0}`;

export type Payes = Record<string, string>; // clé → date ISO du versement déclaré

export function loadPayes(): Payes {
  try {
    const raw = localStorage.getItem(PAYES_KEY);
    return raw ? (JSON.parse(raw) as Payes) : {};
  } catch {
    return {};
  }
}

export function savePayes(p: Payes): void {
  try {
    localStorage.setItem(PAYES_KEY, JSON.stringify(p));
  } catch {
    /* stockage indisponible — le suivi reste en mémoire pour la session */
  }
}

/** Ce que je dois, à chaque personne : 10 000 de cotisation + 2 000 de collation. */
export const detteParPersonne = () => TONTINE.montantCotisation + TONTINE.montantCollation;

export type DetteRow = {
  member: Member;
  tour: TourMois;
  amount: number;
  checked: boolean; // cochée = ma part pour cette personne est versée
  paidAt: string | null;
};

/** Personnes à qui je dois encore cotiser : bénéficiaires des réunions déjà arrivées. */
export function mesDettes(annee: TourMois[], vousId: string, payes: Payes, today = new Date()): DetteRow[] {
  const todayIso = isoDate(today);
  return annee
    .filter((t) => !t.ag && t.beneficiary && t.beneficiary.id !== vousId && t.iso <= todayIso)
    .map((t) => {
      const m = t.beneficiary!;
      const paidAt = payes[payeKey(m.id, t.annee, t.month0)] ?? null;
      return { member: m, tour: t, amount: detteParPersonne(), checked: !!paidAt, paidAt };
    });
}

export type StatutVersement = "paye" | "a_payer" | "avenir" | "mon_tour" | "ag";

export type VersementRow = {
  tour: TourMois;
  member: Member | null;
  cotis: number;
  colla: number;
  total: number;
  statut: StatutVersement;
  paidAt: string | null;
};

/** Échéancier annuel de mes versements (vue « Mes versements »). */
export function mesVersements(annee: TourMois[], vousId: string, payes: Payes, today = new Date()): VersementRow[] {
  const todayIso = isoDate(today);
  return annee.map((t) => {
    if (t.ag) return { tour: t, member: null, cotis: 0, colla: 0, total: 0, statut: "ag" as StatutVersement, paidAt: null };
    const b = t.beneficiary!;
    if (b.id === vousId) {
      return { tour: t, member: b, cotis: 0, colla: TONTINE.montantCollation, total: TONTINE.montantCollation, statut: "mon_tour" as StatutVersement, paidAt: null };
    }
    const paidAt = payes[payeKey(b.id, t.annee, t.month0)] ?? null;
    if (paidAt) return { tour: t, member: b, cotis: TONTINE.montantCotisation, colla: TONTINE.montantCollation, total: detteParPersonne(), statut: "paye" as StatutVersement, paidAt };
    if (t.iso <= todayIso) return { tour: t, member: b, cotis: TONTINE.montantCotisation, colla: TONTINE.montantCollation, total: detteParPersonne(), statut: "a_payer" as StatutVersement, paidAt: null };
    return { tour: t, member: b, cotis: TONTINE.montantCotisation, colla: TONTINE.montantCollation, total: detteParPersonne(), statut: "avenir" as StatutVersement, paidAt: null };
  });
}

/** Statut de cotisation d'un membre pour la réunion du mois courant. */
export function statutMembreDuMois(
  m: Member,
  moisCourant: TourMois | undefined,
  payes: Payes,
  today = new Date(),
): { label: string; cls: string } {
  const neutre = "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]";
  if (!moisCourant) return { label: "—", cls: neutre };
  if (moisCourant.ag) return { label: `AG le ${moisCourant.jour}`, cls: "bg-[#3D6B72]/10 text-[#3D6B72] border-[#3D6B72]/30" };
  if (moisCourant.beneficiary?.id === m.id) {
    return etatReunion(moisCourant, today) === "passee"
      ? { label: "A reçu la réunion ✓", cls: "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30" }
      : { label: "Son tour — reçoit la réunion", cls: "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45" };
  }
  if (etatReunion(moisCourant, today) === "avenir") {
    return { label: `Réunion le ${moisCourant.jour}`, cls: neutre };
  }
  if (m.isVous) {
    const paid = !!payes[payeKey(m.id, moisCourant.annee, moisCourant.month0)];
    return paid
      ? { label: "Payé ✓", cls: "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30" }
      : { label: "En attente", cls: "bg-[#A5473D]/10 text-[#A5473D] border-[#A5473D]/30" };
  }
  // Membres fictifs — registre du trésorier : déterministe (≈ 1 sur 4 en attente).
  const paye = (m.tour + moisCourant.month0) % 4 !== 0;
  return paye
    ? { label: "Payé ✓", cls: "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30" }
    : { label: "En attente", cls: "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45" };
}

/* ══════════════════════════ trésorerie — journal & caisses ══════════════════════════ */

export type Anomalie = { month0: number; memberId: string; type: "retard" | "absence"; montant: number; note: string };

/** Événements déterministes de l'année (alimentent pénalités, journal, classement). */
export const ANOMALIES: Anomalie[] = [
  { month0: 2, memberId: "f07", type: "retard", montant: TONTINE.penaliteRetard, note: "Cotisation remise après la réunion — pénalité de retard." },
  { month0: 4, memberId: "f09", type: "absence", montant: TONTINE.penaliteAbsence, note: "Absence non excusée — pénalité versée à la caisse sociale." },
  { month0: 8, memberId: "f07", type: "retard", montant: TONTINE.penaliteRetard, note: "Cotisation remise après la réunion — pénalité de retard." },
];

/** Mois où le vice-président préside à la place du président. */
export const SUPPLEANCES = [3, 8]; // avril, septembre

export type JournalRow = {
  tour: TourMois;
  encaisse: number;
  pot: number;
  collation: number;
  caisseSociale: number; // solde cumulé en fin de mois
  penalites: number; // pénalités du mois
  etat: "cloture" | "en_cours" | "avenir";
  note: string;
};

/** Journal de caisse de l'année — soldes dérivés des règles et des anomalies. */
export function journalDeCaisse(annee: TourMois[], roster: Member[], today = new Date()): JournalRow[] {
  const n = roster.length;
  let caisse = n * TONTINE.fraisAdhesion; // adhésions encaissées en janvier
  return annee.map((t) => {
    const penalites = t.etat === "futur" ? 0 : ANOMALIES.filter((a) => a.month0 === t.month0).reduce((s, a) => s + a.montant, 0);
    if (t.ag) {
      return { tour: t, encaisse: 0, pot: 0, collation: 0, caisseSociale: caisse, penalites: 0, etat: t.etat === "futur" ? ("avenir" as const) : ("cloture" as const), note: "Assemblée générale — aucun mouvement" };
    }
    if (t.etat === "futur") {
      return { tour: t, encaisse: t.total, pot: t.pot, collation: t.collation, caisseSociale: caisse, penalites: 0, etat: "avenir" as const, note: "Projection" };
    }
    caisse += penalites;
    return {
      tour: t, encaisse: t.total, pot: t.pot, collation: t.collation, caisseSociale: caisse, penalites,
      etat: t.etat === "courant" ? ("en_cours" as const) : ("cloture" as const),
      note: penalites > 0 ? `+ ${penalites.toLocaleString("fr-FR")} de pénalités` : "",
    };
  });
}

export type ClassementRow = {
  member: Member;
  parts: number; // réunions où le membre devait cotiser (déjà arrivées)
  versees: number; // parts versées
  retards: number;
  penalites: number;
  ponctualite: number | null; // %
  totalVerse: number;
};

/** Classement des cotisants — les fictifs selon le registre, « Vous » selon votre suivi. */
export function classementCotisants(annee: TourMois[], roster: Member[], payes: Payes, vousId: string, today = new Date()): ClassementRow[] {
  const todayIso = isoDate(today);
  const toursEcoules = annee.filter((t) => !t.ag && t.iso <= todayIso);
  return roster.map((m) => {
    const mes = toursEcoules.filter((t) => t.beneficiary?.id !== m.id);
    const parts = mes.length;
    const anoms = ANOMALIES.filter((a) => a.memberId === m.id && mes.some((t) => t.month0 === a.month0));
    const versees = m.isVous
      ? mes.filter((t) => payes[payeKey(m.id, t.annee, t.month0)]).length
      : parts; // registre officiel : versé, même avec pénalité de retard
    const ponctualite = parts > 0 ? Math.round((versees / parts) * 100) : null;
    return {
      member: m, parts, versees,
      retards: anoms.length,
      penalites: anoms.reduce((s, a) => s + a.montant, 0),
      ponctualite,
      totalVerse: versees * detteParPersonne(),
    };
  }).sort((a, b) => {
    const pa = a.ponctualite ?? -1;
    const pb = b.ponctualite ?? -1;
    if (pb !== pa) return pb - pa;
    if (b.totalVerse !== a.totalVerse) return b.totalVerse - a.totalVerse;
    return a.member.tour - b.member.tour;
  });
}

/** Projection de fin d'année — tous les montants dérivés des règles. */
export function projectionAnnee(annee: TourMois[], roster: Member[]) {
  const tours = annee.filter((t) => !t.ag);
  const nbTours = tours.length;
  const pot = potMensuel(roster.length);
  const colla = collationMensuelle(roster.length);
  const penalites = ANOMALIES.reduce((s, a) => s + a.montant, 0);
  return {
    nbTours,
    totalCollecte: nbTours * (pot + colla),
    totalPots: nbTours * pot,
    totalCollations: nbTours * colla,
    caisseSociale: roster.length * TONTINE.fraisAdhesion + penalites,
    penalites,
  };
}

/** Caisses à l'instant présent (tours déjà arrivés). */
export function caissesDuMoment(annee: TourMois[], roster: Member[], today = new Date()) {
  const todayIso = isoDate(today);
  const arrivés = annee.filter((t) => !t.ag && t.iso <= todayIso);
  const penalites = ANOMALIES.filter((a) => arrivés.some((t) => t.month0 === a.month0)).reduce((s, a) => s + a.montant, 0);
  return {
    collecte: arrivés.reduce((s, t) => s + t.total, 0),
    potsVerses: arrivés.reduce((s, t) => s + t.pot, 0),
    collations: arrivés.reduce((s, t) => s + t.collation, 0),
    caisseSociale: roster.length * TONTINE.fraisAdhesion + penalites,
  };
}

/* ══════════════════════════ missions des rôles ══════════════════════════ */

export type Mission = { titre: string; detail: string; rythme: string };

export const MISSIONS: Record<Exclude<RoleKey, "membre">, Mission[]> = {
  president: [
    { titre: "Préside les réunions", detail: "Ouvre, conduit et clôture la réunion du 2ᵉ dimanche.", rythme: "Chaque mois" },
    { titre: "Représente la tontine", detail: "Porte la parole de l'association auprès des familles et invités.", rythme: "En permanence" },
    { titre: "Veille au règlement", detail: "Fait respecter les règles ; aucune pénalité sans passage au conseil.", rythme: "En permanence" },
    { titre: "Autorise les échanges de places", detail: "Valide tout échange de tour entre deux membres.", rythme: "À la demande" },
    { titre: "Confirme le calendrier", detail: "Publie l'ordre des tours et le calendrier de l'année en janvier.", rythme: "Chaque janvier" },
  ],
  vice_president: [
    { titre: "Supplée le président", detail: "Préside la réunion quand le président est absent ou empêché.", rythme: "À la demande" },
    { titre: "Coordonne les préparatifs", detail: "Prépare le lieu (chez le bénéficiaire) et la collation avec lui.", rythme: "Chaque mois" },
    { titre: "Prépare l'ordre du jour", detail: "Avec le président, avant chaque réunion.", rythme: "Chaque mois" },
    { titre: "Recueille la parole des membres", detail: "Transmet suggestions et réclamations au bureau.", rythme: "En continu" },
  ],
  commissaire: [
    { titre: "Contrôle les caisses", detail: "Vérifie caisse sociale, cotisations et collations, reçus à l'appui.", rythme: "Chaque trimestre" },
    { titre: "Audite le journal de caisse", detail: "Compare encaissements, sommes remises et dépenses du trésorier.", rythme: "Chaque trimestre" },
    { titre: "Alerte le bureau", detail: "Signale toute anomalie au président et au censeur.", rythme: "Immédiatement" },
    { titre: "Rend compte à l'assemblée", detail: "Présente le rapport annuel des comptes à l'AG de décembre.", rythme: "Décembre" },
  ],
  tresorier: [
    { titre: "Encaisse les cotisations", detail: "Reçoit la part de chacun et la collation à chaque réunion.", rythme: "Chaque réunion" },
    { titre: "Verse la somme au bénéficiaire", detail: "Remet la somme du mois, devant témoin, au bénéficiaire.", rythme: "Chaque réunion" },
    { titre: "Tient le journal de caisse", detail: "Note chaque mouvement : encaissement, somme remise, collation, pénalité.", rythme: "En continu" },
    { titre: "Gère la caisse sociale", detail: "Adhésions et pénalités, débloquées sur décision du bureau.", rythme: "En continu" },
  ],
  censeur: [
    { titre: "Veille à l'équité", detail: "S'assure que chacun est traité à égalité, sans favoritisme.", rythme: "En permanence" },
    { titre: "Écoute les membres", detail: "Reçoit les observations confidentielles de chacun.", rythme: "En continu" },
    { titre: "Alerte en cas de dérive", detail: "Peut réunir le bureau si une règle n'est plus respectée.", rythme: "Au besoin" },
    { titre: "Protège les personnes", detail: "Veille à la dignité des membres en difficulté — aide discrète.", rythme: "En permanence" },
  ],
};

/* ══════════════════════════ épargnes & prêts — taux mensuel paramétrable ══════════════════════════

   ÉPARGNE — intérêts SIMPLES : chaque réunion tenue après le dépôt ajoute
   capital × taux, sur la base du capital uniquement (jamais sur les intérêts).
   10 000 épargnés en mars à 3 % : avril 10 300 · mai 10 600 · juin 10 900 …
   jusqu'en décembre de l'année du dépôt, où le tout est récupéré.

   PRÊT — argent emprunté à la réunion : la dette gagne le taux du mois DÈS LE
   MOIS DU PRÊT, à montant CONSTANT pendant chaque bloc de 3 mois (taux × base
   du bloc). 10 000 empruntés en janvier à 3 % : janvier 10 000 · février 10 300
   · mars 10 600 — échéance de mars : 10 900 à rembourser (3 × 300). Tous les
   3 MOIS sans remboursement, la dette totale devient la NOUVELLE BASE :
   +327 par mois d'avril à juin (échéance juin : 11 881), puis +356, etc. — le
   recalcul se fait TOUS LES 3 MOIS, jamais chaque mois. */

export const TAUX_DEFAUT = 3; // % par mois — valeur par défaut, paramétrable par le bureau

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const TAUX_KEY = "fc_tontine_taux_v1";

/** Taux mensuel partagé (épargnes et prêts), en % — borné 0 à 20. */
export function loadTaux(): number {
  try {
    const raw = localStorage.getItem(TAUX_KEY);
    if (!raw || raw.trim() === "") return TAUX_DEFAUT;
    const v = Number(raw);
    return isFinite(v) && v >= 0 && v <= 20 ? Math.round(v * 10) / 10 : TAUX_DEFAUT;
  } catch {
    return TAUX_DEFAUT;
  }
}

export function saveTaux(t: number): void {
  try {
    localStorage.setItem(TAUX_KEY, String(Math.round(t * 10) / 10));
  } catch {
    /* stockage indisponible — réglage gardé en mémoire pour la session */
  }
}

/** Intérêt d'UN mois d'épargne : capital × taux (base constante — non cumulatif). */
export const interetEpargneMois = (capital: number, tauxPct: number) => Math.round(capital * (tauxPct / 100));

/** Solde d'une épargne après n mois comptés : capital + n × intérêt mensuel. */
export const soldeEpargneAuMois = (capital: number, tauxPct: number, n: number) =>
  n <= 0 ? capital : capital + interetEpargneMois(capital, tauxPct) * n;

/** Dette d'un prêt au cours du mois `cible` (hors remboursement).
 *  Règle du bureau : la dette gagne taux × BASE DU BLOC chaque mois, dès le
 *  mois du prêt, à montant constant pendant 3 mois ; à chaque échéance des
 *  3 mois non remboursée, la dette totale devient la nouvelle base — le
 *  recalcul se fait TOUS LES 3 MOIS, jamais chaque mois.
 *  10 000 en janvier à 3 % : janv. 10 000 · févr. 10 300 · mars 10 600
 *  (échéance 10 900) · avril 10 900 · mai 11 227 · juin 11 554 (échéance
 *  11 881)… `cible = 12` → solde final de fin décembre (14 113). */
export function dettePretAuMois(capital: number, tauxPct: number, depart: number, cible: number): number {
  const n = Math.min(Math.max(cible - depart, 0), 12 - depart); // mois d'intérêts écoulés (le mois du prêt compte, plafonné à fin décembre)
  if (n <= 0) return capital;
  const r = tauxPct / 100;
  let base = capital; // base du bloc courant — recalculée seulement tous les 3 mois
  let solde = capital;
  for (let i = 1; i <= n; i++) {
    solde += Math.round(base * r); // intérêt du mois — constant pendant les 3 mois du bloc
    if (i % 3 === 0) base = solde; // échéance des 3 mois : la dette devient la nouvelle base
  }
  return solde;
}

/** Nombre de réunions déjà tenues APRÈS le mois de départ (l'épargne commence
 *  à courir le mois suivant) — plafonné à décembre. */
export function moisEcoules(depart: number, annee: TourMois[], today = new Date()): number {
  const todayIso = isoDate(today);
  let n = 0;
  for (let m = depart + 1; m <= 11; m++) {
    if (annee[m] && annee[m].iso <= todayIso) n++;
  }
  return n;
}

/** Mois de l'année de tontine qui contient aujourd'hui : 0 = janvier … 11 =
 *  décembre, 12 = année achevée (après décembre), -1 = avant l'année ou
 *  calendrier absent. Utilisé par les prêts (le mois du prêt compte). */
export function moisCourantAnnee(annee: TourMois[], today = new Date()): number {
  if (!annee || annee.length < 12) return -1;
  const ym = isoDate(today).slice(0, 7); // "YYYY-MM"
  for (let m = 0; m <= 11; m++) {
    if (annee[m].iso.slice(0, 7) === ym) return m;
  }
  return isoDate(today) < annee[0].iso ? -1 : 12;
}

/* — stockage local des épargnes — */

const EPARGNES_KEY = "fc_tontine_epargnes_v1";

export type Epargne = { id: string; month0: number; capital: number };

export function loadEpargnes(): Epargne[] {
  try {
    const raw = localStorage.getItem(EPARGNES_KEY);
    const list = raw ? (JSON.parse(raw) as Epargne[]) : [];
    return Array.isArray(list) ? list.filter((e) => e && typeof e.month0 === "number" && typeof e.capital === "number" && e.capital > 0) : [];
  } catch {
    return [];
  }
}

export function saveEpargnes(list: Epargne[]): void {
  try {
    localStorage.setItem(EPARGNES_KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}

/* — stockage local des prêts — */

const PRETS_KEY = "fc_tontine_prets_v1";

export type Pret = {
  id: string;
  month0: number; // mois de la réunion où le prêt a été demandé
  capital: number; // somme prêtée par la réunion
  rembourseMois: number | null; // mois du remboursement (null = en cours)
  rembourseMontant: number; // somme versée au moment du remboursement
};

export function loadPrets(): Pret[] {
  try {
    const raw = localStorage.getItem(PRETS_KEY);
    const list = raw ? (JSON.parse(raw) as Pret[]) : [];
    return Array.isArray(list)
      ? list.filter((p) => p && typeof p.month0 === "number" && typeof p.capital === "number" && p.capital > 0)
      : [];
  } catch {
    return [];
  }
}

export function savePrets(list: Pret[]): void {
  try {
    localStorage.setItem(PRETS_KEY, JSON.stringify(list));
  } catch {
    /* stockage indisponible */
  }
}
