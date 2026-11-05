// ─────────────────────────────────────────────────────────────────────────────
// REGISTRES DU BUREAU — prêts & épargnes FAITS À LA RÉUNION — Famille.Mbeutetsa
//
// Demande du président (v13) — le tableau des prêts devient un VRAI suivi :
//   · « On devrait voir pour chaque mois l'évolution des intérêts ainsi que
//     les sommes totales de chaque mois » → chaque prêt se déplie en un
//     CALENDRIER mois par mois (capital, intérêts du mois, avances, total dû)
//     et une table « Sommes totales mois par mois » additionne tous les prêts ;
//   · « après le nombre de mois fixé dans les paramètres, si l'intérêt n'a pas
//     été remboursé, la somme totale de ce mois devient l'élément sur lequel
//     le pourcentage est de nouveau recalculé » → la RECONDUCTION du capital
//     (Paramètres → Prêts) s'applique aussi aux prêts faits à la réunion :
//     à l'échéance (durée maximale), les intérêts non payés sont absorbés dans
//     le capital — NOUVEAU CAPITAL — puis, si la reconduction est activée,
//     l'opération se répète tous les « periodeCapitalisationMois » mois.
//     L'évolution reste visible MOIS PAR MOIS jusqu'au remboursement ;
//   · « lorsque cela a été remboursé… un champ qui permet de confirmer… il
//     disparaît de la liste des personnes ayant prêté » → bouton « Confirmer
//     le remboursement » : le prêt quitte le registre actif et rejoint la
//     section PRÊTS REMBOURSÉS (intérêts produits + somme totale remboursée) ;
//   · « un autre champ pour les avances de remboursement des prêts » → chaque
//     prêt accepte des AVANCES : une avance paie d'abord les intérêts courus,
//     puis réduit le capital — si les intérêts de la période sont entièrement
//     payés, il n'y a pas de capitalisation à l'échéance.
//
// Chaque enregistrement : le membre, la SOMME et le MOIS réel auquel elle est
// rattachée (on peut avoir oublié d'inscrire un mois passé). Le TAUX en
// vigueur (prêts ou épargnes, décidé par le bureau dans Paramètres) est
// appliqué au moment du calcul — jamais stocké ici : changer le taux
// recalculera tout le registre, comme pour les calendriers.
//
// Persistance locale (gratuit, hors ligne, zéro serveur) :
//   · fc_prets_reunion_v1   — les prêts faits à la réunion par les membres ;
//   · fc_epargnes_reunion_v1 — les épargnes des membres inscrites par le bureau.
// ─────────────────────────────────────────────────────────────────────────────

/** Une avance de remboursement : de l'argent rendu au prêteur AVANT le
 *  remboursement définitif (paie d'abord les intérêts courus, puis le capital). */
export type AvanceRemboursement = {
  id: string;
  montant: number; // FCFA versés au prêteur
  /** Mois (0-11) auquel l'avance a été versée. */
  moisIdx: number;
};

/** Le remboursement DÉFINITIF confirmé par le président : le prêt quitte le
 *  registre actif et rejoint la section « Prêts remboursés ». */
export type RemboursementPret = {
  /** Mois (0-11) du remboursement définitif. */
  moisIdx: number;
  /** Solde final versé (hors avances déjà versées) — prérempli par la machine,
   *  modifiable par le président (arrangement à l'amiable possible). */
  montant: number;
};

/** Un prêt (ou une épargne) inscrit par le bureau à la réunion d'un membre. */
export type AttributionReunion = {
  id: string;
  membreId: string;
  montant: number; // FCFA
  /** Mois (0-11 = janvier-décembre) auquel la somme est rattachée — base du
   *  calcul des intérêts (du mois rattaché, inclus, jusqu'à décembre). */
  moisIdx: number;
  /** PRÊTS uniquement — avances de remboursement versées au prêteur. */
  avances?: AvanceRemboursement[];
  /** PRÊTS uniquement — remboursement définitif confirmé (le prêt est clos). */
  rembourse?: RemboursementPret | null;
};

/* — DONNÉES DE DÉMONSTRATION (statiques : hydratation sûre, aucun Date ici) —
 * Quatre personnes ont prêté à la réunion cette année, dont trois à des mois
 * différents ; l'exemple du président (10 000 en janvier) y figure. Deux
 * enregistrements montrent les nouveautés v13 : une avance de remboursement
 * et un prêt DÉJÀ REMBOURSÉ (les mois de démo restent ≤ novembre). */
const PRETS_REUNION_DEMO: AttributionReunion[] = [
  { id: "ar-p1", membreId: "f08", montant: 100_000, moisIdx: 0 }, // janvier — en cours
  {
    id: "ar-p2", membreId: "f05", montant: 50_000, moisIdx: 2, // mars — avec avance
    avances: [{ id: "ar-p2-a1", montant: 1_500, moisIdx: 3 }], // 1 500 rendus en avril
  },
  { id: "ar-p3", membreId: "f03", montant: 30_000, moisIdx: 2 }, // mars — en cours
  {
    id: "ar-p4", membreId: "f02", montant: 40_000, moisIdx: 4, // mai — remboursé
    avances: [{ id: "ar-p4-a1", montant: 2_400, moisIdx: 6 }], // 2 400 rendus en juillet
    rembourse: { moisIdx: 8, montant: 43_600 }, // solde final versé en septembre
  },
  {
    id: "ar-p5", membreId: "f06", montant: 15_000, moisIdx: 1, // février — remboursé
    rembourse: { moisIdx: 3, montant: 16_350 }, // 15 000 + 3 × 450, soldé en avril
  },
];

const EPARGNES_REUNION_DEMO: AttributionReunion[] = [
  { id: "ar-e1", membreId: "f04", montant: 25_000, moisIdx: 1 }, // février
  { id: "ar-e2", membreId: "f06", montant: 15_000, moisIdx: 3 }, // avril
  { id: "ar-e3", membreId: "f04", montant: 15_000, moisIdx: 6 }, // juillet — 2e épargne de Bernadette (v15 : regroupées sur UNE ligne)
];

function lireListe(cle: string, demo: AttributionReunion[]): AttributionReunion[] {
  if (typeof window === "undefined") return demo.map((x) => ({ ...x, avances: x.avances?.map((a) => ({ ...a })), rembourse: x.rembourse ? { ...x.rembourse } : undefined }));
  try {
    const raw = window.localStorage.getItem(cle);
    if (!raw) return demo.map((x) => ({ ...x, avances: x.avances?.map((a) => ({ ...a })), rembourse: x.rembourse ? { ...x.rembourse } : undefined }));
    const data = JSON.parse(raw) as AttributionReunion[];
    if (!Array.isArray(data)) return demo.map((x) => ({ ...x, avances: x.avances?.map((a) => ({ ...a })), rembourse: x.rembourse ? { ...x.rembourse } : undefined }));
    const liste = data.filter((x) => typeof x?.id === "string" && typeof x?.membreId === "string" && Number(x?.montant) >= 0);
    /* MIGRATION v13 : un enregistrement de démonstration déjà présent dans le
     * stockage local (inscrit avant l'arrivée des avances / remboursements) est
     * enrichi des nouvelles données de démo — les vraies inscriptions du
     * président ne sont JAMAIS touchées. */
    return liste.map((x) => {
      const d = demo.find((y) => y.id === x.id);
      if (!d || x.avances != null || x.rembourse !== undefined) return x;
      return {
        ...x,
        avances: d.avances?.map((a) => ({ ...a })),
        rembourse: d.rembourse ? { ...d.rembourse } : undefined,
      };
    });
  } catch {
    return demo.map((x) => ({ ...x, avances: x.avances?.map((a) => ({ ...a })), rembourse: x.rembourse ? { ...x.rembourse } : undefined }));
  }
}

function ecrireListe(cle: string, liste: AttributionReunion[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(liste));
  } catch {
    /* quota / navigation privée — la maquette continue en mémoire */
  }
}

const CLE_PRETS = "fc_prets_reunion_v1";
const CLE_EPARGNES = "fc_epargnes_reunion_v1";

/** Lit les prêts FAITS À LA RÉUNION par les membres (sinon la démo). */
export function loadPretsReunion(): AttributionReunion[] {
  return lireListe(CLE_PRETS, PRETS_REUNION_DEMO);
}

/** Enregistre les prêts faits à la réunion. */
export function savePretsReunion(liste: AttributionReunion[]): void {
  ecrireListe(CLE_PRETS, liste);
}

/** Lit les épargnes des membres inscrites par le bureau (sinon la démo). */
export function loadEpargnesReunion(): AttributionReunion[] {
  return lireListe(CLE_EPARGNES, EPARGNES_REUNION_DEMO);
}

/** Enregistre les épargnes inscrites par le bureau. */
export function saveEpargnesReunion(liste: AttributionReunion[]): void {
  ecrireListe(CLE_EPARGNES, liste);
}

/* ─── calcul des intérêts d'un enregistrement — partagé par les deux pages ─── */

export type InteretsAttribution = {
  interetMois: number; // intérêts produits chaque mois (montant × taux)
  moisDepart: number; // mois rattaché, borné 0-11
  moisProduit: number; // nombre de mois qui produisent des intérêts (jusqu'à décembre, départ inclus)
  totalAnnee: number; // intérêts au 31 décembre (réalisés + projection)
  realise: number; // intérêts déjà produits (jusqu'au mois courant inclus)
  projection: number; // intérêts à venir (mois après le mois courant)
};

/** Intérêts SIMPLES d'un prêt/épargne rattaché à un mois : montant × taux à
 *  chaque mois, du mois rattaché (inclus) à décembre. Le mois courant sépare
 *  les intérêts RÉALISÉS de la PROJECTION — comme le tableau « Mes intérêts
 *  mois par mois » de l'espace membre. (Utilisé par les ÉPARGNES — les prêts
 *  utilisent désormais evolutionPretReunion, plus bas, qui gère les avances
 *  et la reconduction du capital.) */
export function interetsAttribution(
  montant: number,
  taux: number, // % par mois en vigueur (prêts ou épargnes)
  moisIdx: number,
  moisCourantIdx: number | null,
): InteretsAttribution {
  const interetMois = Math.round(montant * (taux / 100));
  const moisDepart = Math.min(11, Math.max(0, moisIdx));
  const moisProduit = 12 - moisDepart;
  const totalAnnee = interetMois * moisProduit;
  const moisRealises =
    moisCourantIdx == null ? 0 : Math.min(moisProduit, Math.max(0, moisCourantIdx - moisDepart + 1));
  const realise = interetMois * moisRealises;
  return { interetMois, moisDepart, moisProduit, totalAnnee, realise, projection: totalAnnee - realise };
}

/* ─── ÉVOLUTION D'UN PRÊT FAIT À LA RÉUNION — mois par mois, avances et
 *     reconduction du capital (v13) ──────────────────────────────────────────
 *
 * Un prêt à la réunion est un argent que la réunion DOIT rendre à son
 * prêteur : chaque mois, il produit des intérêts (capital × taux) ; la
 * réunion peut verser des AVANCES en cours de route ; à l'échéance (la durée
 * maximale de remboursement fixée dans Paramètres → Prêts), si l'intérêt n'a
 * pas été payé, la somme due devient un NOUVEAU CAPITAL — et, si la
 * reconduction est activée, l'opération se répète tous les « periode » mois.
 * Quand le président confirme le remboursement, l'évolution s'arrête au mois
 * du remboursement : le prêt est clos.
 *
 * Une avance paie D'ABORD les intérêts courus, PUIS réduit le capital —
 * ainsi, si les intérêts de la période sont entièrement payés, il n'y a pas
 * de capitalisation à l'échéance : le capital continue de produire ses
 * intérêts sans gonfler. */

export type LigneEvolutionPret = {
  moisIdx: number; // 0-11 (année en cours)
  capital: number; // capital effectif en DÉBUT de mois (après capitalisations antérieures)
  interet: number; // intérêts produits CE mois (capital × taux)
  avance: number; // avances versées CE mois
  totalDu: number; // somme totale due à la FIN du mois (capital + intérêts courus − avances)
  /** Échéance de la durée maximale de remboursement. */
  echeance?: boolean;
  /** Présent si une capitalisation a lieu ce mois : valeur du NOUVEAU CAPITAL. */
  nouveauCapital?: number;
  /** Ligne du remboursement définitif (dernière ligne d'un prêt clos). */
  rembourse?: boolean;
};

export type EvolutionPret = {
  lignes: LigneEvolutionPret[];
  /** Somme de tous les intérêts produits sur la période affichée. */
  totalInterets: number;
  /** Somme de toutes les avances versées sur la période affichée. */
  totalAvances: number;
  /** Somme totale due au dernier mois affiché (décembre, ou mois du remboursement). */
  totalDu: number;
  /** Intérêts produits chaque mois AUJOURD'HUI (au mois courant — sinon au
   *  premier mois du prêt si celui-ci n'a pas encore commencé). */
  interetMoisCourant: number;
  /** Intérêts déjà produits (jusqu'au mois courant inclus). */
  realise: number;
  /** Mois (0-11) de l'échéance ABSOLUE (départ + durée − 1) — peut déborder
   *  sur l'année suivante : la note d'interface le signale alors. */
  moisEcheance: number;
};

export function evolutionPretReunion(
  montant: number,
  taux: number, // % par mois en vigueur
  moisIdx: number, // mois rattaché au prêt
  duree: number, // durée maximale de remboursement (mois) — échéance
  periode: number, // reconduction : mois entre deux capitalisations (0 = jamais)
  avances: AvanceRemboursement[] | undefined,
  rembourse: RemboursementPret | null | undefined,
  moisCourantIdx: number | null,
): EvolutionPret {
  const depart = Math.min(11, Math.max(0, Math.round(moisIdx)));
  const dureeEff = duree > 0 ? Math.round(duree) : 6;
  const capital0 = Math.max(0, Math.round(montant));
  /* Horizon : décembre, ou le mois du remboursement définitif s'il est clos. */
  const fin = rembourse ? Math.min(11, Math.max(depart, Math.round(rembourse.moisIdx))) : 11;
  const moisEcheance = depart + dureeEff - 1;

  /* Avances regroupées par mois (celles d'après le remboursement sont ignorées). */
  const avMois = new Map<number, number>();
  for (const a of avances ?? []) {
    const m = Math.min(11, Math.max(0, Math.round(a.moisIdx)));
    if (m > fin) continue;
    avMois.set(m, (avMois.get(m) ?? 0) + Math.max(0, Math.round(a.montant)));
  }

  let capital = capital0; // capital effectif (change aux capitalisations / avances)
  let courus = 0; // intérêts courus non payés (remis à zéro à chaque capitalisation)
  let totalAvances = 0;
  const lignes: LigneEvolutionPret[] = [];

  for (let m = depart; m <= fin; m++) {
    const capitalDebut = capital;
    const interet = Math.round(capital * (taux / 100));
    courus += interet;

    /* Avances du mois : d'abord les intérêts courus, puis le capital. */
    const av = avMois.get(m) ?? 0;
    const payeInterets = Math.min(av, courus);
    courus -= payeInterets;
    const payeCapital = av - payeInterets;
    capital = Math.max(0, capital - payeCapital);
    totalAvances += av;

    /* Échéance / reconduction : l'intérêt non payé est absorbé dans le
     * capital — LA SOMME DUE DEVIENT LE NOUVEAU CAPITAL. L'échéance tombe le
     * mois N° duree (départ INCLUS) — 10 000 rattaché à janvier avec une
     * durée de 3 mois : échéance en MARS (10 000 + 3 × 300 = 10 900) — puis,
     * si la reconduction est activée, tous les « periode » mois. */
    const apres = m - depart - (dureeEff - 1); // 0 le mois de l'échéance, puis 1, 2…
    const echeance = apres === 0;
    const reconduction = periode > 0 && apres > 0 && apres % periode === 0;
    let nouveauCapital: number | undefined;
    if ((echeance || reconduction) && courus > 0) {
      capital += courus;
      courus = 0;
      nouveauCapital = capital;
    }

    lignes.push({
      moisIdx: m,
      capital: capitalDebut,
      interet,
      avance: av,
      totalDu: capital + courus,
      echeance,
      nouveauCapital,
      rembourse: rembourse != null && m === fin,
    });
  }

  const totalInterets = lignes.reduce((s, l) => s + l.interet, 0);
  const totalDu = lignes.length > 0 ? lignes[lignes.length - 1].totalDu : capital0;
  const ligneCourante = moisCourantIdx == null ? undefined : lignes.find((l) => l.moisIdx === Math.min(11, Math.max(0, moisCourantIdx)));
  const interetMoisCourant = ligneCourante?.interet ?? (lignes.length > 0 ? lignes[0].interet : 0);
  const realise =
    moisCourantIdx == null
      ? 0
      : lignes.filter((l) => l.moisIdx <= Math.min(11, Math.max(0, moisCourantIdx))).reduce((s, l) => s + l.interet, 0);
  return { lignes, totalInterets, totalAvances, totalDu, interetMoisCourant, realise, moisEcheance };
}
