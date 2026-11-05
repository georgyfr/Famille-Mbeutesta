// ─────────────────────────────────────────────────────────────────────────────
// VILLES DE LA TONTINE — Famille.Mbeutetsa (v27, Task 71)
//
// Demande de l'administrateur : chaque membre appartient à UNE VILLE, et
// « chaque membre qui appartient à la même ville constitue un seul groupe » —
// c'est la tontine de la ville (page Finances : cotisations additionnées
// entre eux, prêts et épargnes de la même ville, visibilité restreinte).
//
//   · La ville PAR DÉFAUT est YAOUNDÉ ;
//   · à côté du champ ville, le bureau (président / secrétaire) peut
//     « Ajouter une nouvelle ville » : il choisit d'abord la RÉGION parmi les
//     10 régions du Cameroun, puis la ville appropriée (ou « Autre… » pour
//     saisir une ville qui ne figure pas dans la liste) ;
//   · la liste des villes est partagée par toute l'application (clé locale,
//     gratuit et hors ligne) : les codes d'invitation, les membres et la
//     page Finances parlent tous le même langage.
// ─────────────────────────────────────────────────────────────────────────────

/** Les 10 régions du Cameroun et leurs principales villes. */
export const REGIONS_VILLES_CAMEROUN: Record<string, string[]> = {
  "Adamaoua": ["Ngaoundéré", "Meiganga", "Tibati", "Banyo", "Tignère"],
  "Centre": ["Yaoundé", "Mbalmayo", "Obala", "Mfou", "Sa'a", "Eséka", "Akono", "Monatélé", "Nkoteng", "Bafia"],
  "Est": ["Bertoua", "Batouri", "Abong-Mbang", "Doumé", "Garoua-Boulaï", "Bélabo", "Ndelele"],
  "Extrême-Nord": ["Maroua", "Kousséri", "Yagoua", "Kaélé", "Mora", "Mokolo", "Waza"],
  "Littoral": ["Douala", "Nkongsamba", "Édéa", "Loum", "Yabassi", "Manjo", "Mbanga", "Dibombari"],
  "Nord": ["Garoua", "Guider", "Tcholliré", "Pitoa", "Poli", "Figuil"],
  "Nord-Ouest": ["Bamenda", "Bafut", "Wum", "Kumbo", "Nkambé", "Fundong", "Belo"],
  "Ouest": ["Bafoussam", "Bandja", "Bangangté", "Bafang", "Dschang", "Foumban", "Foumbot", "Kékem", "Mbouda", "Santa", "Tonga", "Galim"],
  "Sud": ["Ebolowa", "Ambam", "Kribi", "Sangmélima", "Mvangue", "Zoétélé", "Djoum"],
  "Sud-Ouest": ["Buea", "Limbé", "Kumba", "Mamfe", "Nguti", "Tiko", "Mundemba", "Ekondo-Titi"],
};

/** Régions dans l'ordre officiel (liste déroulante). */
export const REGIONS_CAMEROUN: string[] = Object.keys(REGIONS_VILLES_CAMEROUN);

/** Une ville de la tontine : son nom et sa région. */
export type Ville = { nom: string; region: string };

/** La ville par défaut — Yaoundé (demande explicite). */
export const VILLE_DEFAUT = "Yaoundé";
const REGION_DEFAUT = "Centre";

const VILLES_KEY = "fc_villes_v1";

/** Normalise un nom de ville pour comparer sans se tromper (accents, casse, espaces). */
export function cleVille(nom: string): string {
  return (nom ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Villes connues — Yaoundé par défaut, plus celles ajoutées par le bureau.
 *  La ville par défaut ne peut PAS être retirée de la liste. */
export function loadVilles(): Ville[] {
  const defaut: Ville = { nom: VILLE_DEFAUT, region: REGION_DEFAUT };
  if (typeof window === "undefined") return [defaut];
  try {
    const raw = window.localStorage.getItem(VILLES_KEY);
    if (!raw) return [defaut];
    const p = JSON.parse(raw) as Ville[];
    if (!Array.isArray(p)) return [defaut];
    const liste = p
      .filter((v) => v && typeof v.nom === "string" && v.nom.trim())
      .map((v) => ({ nom: v.nom.trim(), region: (v.region ?? "").trim() || REGION_DEFAUT }));
    // La ville par défaut est toujours présente, en tête.
    if (!liste.some((v) => cleVille(v.nom) === cleVille(VILLE_DEFAUT))) liste.unshift(defaut);
    // Déduplication (deux villes au nom identique = une seule entrée).
    const vues = new Set<string>();
    return liste.filter((v) => {
      const k = cleVille(v.nom);
      if (vues.has(k)) return false;
      vues.add(k);
      return true;
    });
  } catch {
    return [defaut];
  }
}

/** Enregistre la liste des villes. */
export function saveVilles(v: Ville[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VILLES_KEY, JSON.stringify(v));
  } catch {
    /* stockage indisponible — la liste reste valable pour la session */
  }
}

/** Ajoute une ville (région + nom) — sans doublon. Retourne la liste à jour
 *  et dit si la ville est réellement nouvelle. */
export function ajouterVille(nom: string, region: string): { villes: Ville[]; ajoutee: boolean } {
  const propre = (nom ?? "").trim();
  if (!propre) return { villes: loadVilles(), ajoutee: false };
  const villes = loadVilles();
  if (villes.some((v) => cleVille(v.nom) === cleVille(propre))) return { villes, ajoutee: false };
  const liste = [...villes, { nom: propre, region: (region ?? "").trim() || REGION_DEFAUT }];
  saveVilles(liste);
  return { villes: liste, ajoutee: true };
}

/** La ville existe-t-elle déjà dans la liste connue ? */
export function villeConnue(nom: string): boolean {
  return loadVilles().some((v) => cleVille(v.nom) === cleVille(nom));
}

/** Récupère la région d'une ville connue ("" si inconnue). */
export function regionDeVille(nom: string): string {
  return loadVilles().find((v) => cleVille(v.nom) === cleVille(nom))?.region ?? "";
}

/** Deux villes sont-elles les mêmes ? (comparaison tolérante) */
export const memeVille = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && cleVille(a) === cleVille(b);
