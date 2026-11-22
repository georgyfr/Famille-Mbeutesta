"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PARTAGE BUREAU ⇄ MEMBRES (v39) — Famille.Mbeutetsa
//
// Demande de l'administrateur :
//   1. Séances : « lorsqu'elle a validé ou créé une séance, il faut qu'elle
//      ait la possibilité d'envoyer ça aux différents membres du bureau. Elle
//      peut créer autant d'ordres du jour et décider à qui elle va envoyer
//      cela, que ce soit aux membres de l'association ou aux membres du bureau
//      ou à des personnes réellement spécifiques. » Le membre reçoit la séance
//      présentée proprement, peut la TÉLÉCHARGER en PDF ou en Word, COMMENTER
//      et ENGAGER UN CHAT avec la secrétaire — notification à l'appui.
//   2. Présences : « la liste des présences devrait toujours être envoyée
//      quatre jours avant le jeudi de la réunion, de façon automatique, à tous
//      les membres. Chacun devra confirmer sa présence, proposer son excuse
//      (le retard) ou manifester son absence — et mentionner le choix de ses
//      boissons. » Le rapport des absents part au commissaire aux comptes.
//
// Clés de stockage (localStorage, comme tout le registre de la famille) :
//   · fc_seances_partagees_v1  — les ordres du jour partagés + réactions ;
//   · fc_demandes_presence_v1  — les demandes de confirmation de présence.
// Aucune donnée ne quitte l'appareil. Hydratation sûre : les fonctions de
// lecture renvoient les défauts côté serveur, écrivent côté client seulement.
// ─────────────────────────────────────────────────────────────────────────────

/* ═══════════════════════════ types partagés ═══════════════════════════ */

export type CommentaireDoc = {
  id: string;
  auteurId: string;
  auteurNom: string;
  texte: string;
  /** « 5 nov. 14:32 » */
  le: string;
};

export type ChatMessage = {
  id: string;
  auteurId: string;
  auteurNom: string;
  texte: string;
  le: string;
  /** true = écrit par le secrétariat (bulle à droite côté membre). */
  deSecretariat: boolean;
};

export type CiblePartage = "tous" | "bureau" | "specifiques";

export type PartageSeance = {
  id: string;
  seanceId: string;
  /** Clé de mois (« 2026-11 »). */
  moisKey: string;
  titre: string;
  /** Jour de la réunion (2ᵉ dimanche) dans le mois. */
  jourReunion: number;
  points: { id: string; titre: string; detail: string; responsable: string }[];
  envoyeLe: string;
  parNom: string;
  cible: CiblePartage;
  /** Destinataires précis (cible « specifiques ») — sinon vide. */
  cibleIds: string[];
  /** membreIds ayant ouvert la séance partagée. */
  vues: string[];
  commentaires: CommentaireDoc[];
  messages: ChatMessage[];
};

export type EtatReponsePresence = "present" | "excuse" | "absent";

export type ReponsePresence = {
  etat: EtatReponsePresence;
  /** Choix textuel des boissons (« Fanta, jus de gingembre… »). */
  boissons: string;
  le: string;
};

export type DemandePresence = {
  /** ID déterministe : « dem-presence-<moisKey> » — une seule demande par mois. */
  id: string;
  moisKey: string;
  envoyeeLe: string;
  parNom: string;
  /** Envoyée automatiquement par le moteur (4 jours avant la réunion). */
  auto: boolean;
  jourReunion: number;
  reponses: Record<string, ReponsePresence>;
};

/* ═══════════════════════════ stockage générique ═══════════════════════════ */

function lireListe<T>(cle: string, valide: (x: unknown) => x is T): T[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return [];
    const v = JSON.parse(brut) as unknown;
    return Array.isArray(v) && v.every(valide) ? (purgerOPO(v) as T[]) : [];
  } catch {
    return [];
  }
}

/** v40 — SUPPRESSION DE « OPO » : la réunion ne porte JAMAIS ce nom — les
 *  séances partagées et les demandes de présence qui le contiennent encore
 *  sont corrigées au chargement (« OPO » → « la réunion »). */
const OPO_RE = /\bO\.?\s?P\.?\s?O\b/g;
function purgerOPO(v: unknown): unknown {
  if (typeof v === "string") return v.replace(OPO_RE, "la réunion");
  if (Array.isArray(v)) return v.map(purgerOPO);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = purgerOPO(val);
    return out;
  }
  return v;
}

function ecrireListe<T>(cle: string, valeur: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota — la maquette continue en mémoire */
  }
}

const CLE_PARTAGES = "fc_seances_partagees_v1";
const CLE_DEMANDES = "fc_demandes_presence_v1";

/* ═══════════════════════════ séances partagées ═══════════════════════════ */

const estPartage = (x: unknown): x is PartageSeance =>
  !!x && typeof x === "object" &&
  typeof (x as PartageSeance).id === "string" &&
  typeof (x as PartageSeance).moisKey === "string" &&
  typeof (x as PartageSeance).titre === "string" &&
  Array.isArray((x as PartageSeance).points);

export function chargerPartages(): PartageSeance[] {
  return lireListe<PartageSeance>(CLE_PARTAGES, estPartage);
}

export function savePartages(liste: PartageSeance[]): void {
  ecrireListe(CLE_PARTAGES, liste);
}

/** Les postes du bureau (cible « bureau ») — tout sauf simple membre. */
export const BUREAU_ROLES = [
  "president", "vice_president", "tresorier", "commissaire", "censeur", "secretariat",
] as const;

export function estDuBureau(role: string): boolean {
  return (BUREAU_ROLES as readonly string[]).includes(role);
}

/** Ce partage est-il destiné à CE membre ? */
export function partageMeConcerner(part: PartageSeance, membreId: string, role: string): boolean {
  if (part.cible === "tous") return true;
  if (part.cible === "bureau") return estDuBureau(role);
  return part.cibleIds.includes(membreId);
}

export type NouveauPartage = {
  seanceId: string;
  moisKey: string;
  titre: string;
  jourReunion: number;
  points: { id: string; titre: string; detail: string; responsable: string }[];
  parNom: string;
  cible: CiblePartage;
  cibleIds: string[];
};

/** Crée (ou remplace : même séance → même partage) l'ordre du jour partagé. */
export function partagerSeance(input: NouveauPartage, envoyeLe: string): PartageSeance {
  const liste = chargerPartages();
  const existant = liste.find((p) => p.seanceId === input.seanceId);
  const part: PartageSeance = {
    ...(existant ?? { id: `partage-${input.seanceId}`, vues: [], commentaires: [], messages: [] }),
    seanceId: input.seanceId,
    moisKey: input.moisKey,
    titre: input.titre,
    jourReunion: input.jourReunion,
    points: input.points.map((pt) => ({ ...pt })),
    parNom: input.parNom,
    cible: input.cible,
    cibleIds: [...input.cibleIds],
    envoyeLe,
  };
  const next = existant ? liste.map((p) => (p.id === existant.id ? part : p)) : [part, ...liste];
  savePartages(next);
  return part;
}

/** Le membre ouvre la séance → compteur de vues. */
export function marquerVuePartage(partageId: string, membreId: string): void {
  const liste = chargerPartages();
  const p = liste.find((x) => x.id === partageId);
  if (!p || p.vues.includes(membreId)) return;
  const next = liste.map((x) => (x.id === partageId ? { ...x, vues: [...x.vues, membreId] } : x));
  savePartages(next);
}

export function commenterPartage(partageId: string, c: Omit<CommentaireDoc, "id">): void {
  const liste = chargerPartages();
  const next = liste.map((x) => (x.id === partageId
    ? { ...x, commentaires: [...x.commentaires, { ...c, id: `cmt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }] }
    : x));
  savePartages(next);
}

export function ecrireMessagePartage(partageId: string, m: Omit<ChatMessage, "id">): void {
  const liste = chargerPartages();
  const next = liste.map((x) => (x.id === partageId
    ? { ...x, messages: [...x.messages, { ...m, id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }] }
    : x));
  savePartages(next);
}

/* ═══════════════════════════ demandes de présence ═══════════════════════════ */

const estDemande = (x: unknown): x is DemandePresence =>
  !!x && typeof x === "object" &&
  typeof (x as DemandePresence).id === "string" &&
  typeof (x as DemandePresence).moisKey === "string" &&
  !!((x as DemandePresence).reponses) && typeof (x as DemandePresence).reponses === "object";

export function chargerDemandesPresence(): DemandePresence[] {
  return lireListe<DemandePresence>(CLE_DEMANDES, estDemande);
}

export function saveDemandesPresence(liste: DemandePresence[]): void {
  ecrireListe(CLE_DEMANDES, liste);
}

/** Demande du mois (ou null). */
export function demandeDeMois(moisKey: string): DemandePresence | null {
  return chargerDemandesPresence().find((d) => d.moisKey === moisKey) ?? null;
}

/** Crée (ou rafraîchit) la demande de confirmation de présence du mois —
 *  les réponses déjà données sont conservées. */
export function demanderPresences(moisKey: string, jourReunion: number, parNom: string, auto: boolean, envoyeeLe: string): DemandePresence {
  const liste = chargerDemandesPresence();
  const existante = liste.find((d) => d.moisKey === moisKey);
  const dem: DemandePresence = {
    ...(existante ?? { id: `dem-presence-${moisKey}`, reponses: {} }),
    moisKey,
    jourReunion,
    parNom,
    auto,
    envoyeeLe,
  };
  const next = existante ? liste.map((d) => (d.id === dem.id ? dem : d)) : [dem, ...liste];
  saveDemandesPresence(next);
  return dem;
}

/** Le membre répond : présent / excusé (retard) / absent + ses boissons. */
export function repondrePresence(moisKey: string, membreId: string, r: ReponsePresence): void {
  const liste = chargerDemandesPresence();
  const next = liste.map((d) => (d.moisKey === moisKey ? { ...d, reponses: { ...d.reponses, [membreId]: r } } : d));
  saveDemandesPresence(next);
}

/* ═══════════════════════════ moteur automatique (J-4) ═══════════════════════════ */

/** Nombre de jours restants avant la réunion (2ᵉ dimanche du mois courant). */
export function joursAvantReunion(jourReunion: number, moisCourantIdx: number, annee: number, aujourdhui = new Date()): number {
  const dateReunion = new Date(annee, moisCourantIdx, jourReunion);
  const t0 = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()).getTime();
  return Math.round((dateReunion.getTime() - t0) / 86_400_000);
}

/* ═══════════════════════════ exports PDF / Word ═══════════════════════════ */

/** Document HTML autonome (styles maison) — sert au PDF (impression) et au Word (.doc). */
export function documentHTML(titre: string, corpsHTML: string): string {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><title>${titre}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2a22; margin: 32px; line-height: 1.55; }
  .entete { text-align: center; border-bottom: 3px solid #C89F62; padding-bottom: 12px; margin-bottom: 20px; }
  .entete .titre { font-size: 21px; font-weight: bold; color: #1E4D2B; }
  .entete .sous { font-size: 12px; color: #6b746c; margin-top: 4px; }
  h2 { font-size: 15px; color: #1E4D2B; border-bottom: 1px solid #E5DCC0; padding-bottom: 4px; margin: 22px 0 10px; }
  ol { padding-left: 22px; } li { margin-bottom: 7px; }
  .meta { font-size: 11px; color: #6b746c; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th { background: #1E4D2B; color: #fff; text-align: left; padding: 6px 8px; }
  td { border-bottom: 1px solid #E5DCC0; padding: 6px 8px; }
  .pied { margin-top: 26px; font-size: 10.5px; color: #8a9288; border-top: 1px solid #E5DCC0; padding-top: 8px; }
</style></head><body>
<div class="entete"><div class="titre">${titre}</div>
<div class="sous">Tontine Famille Mbeutetsa — registre tenu par le secrétariat</div></div>
${corpsHTML}
<div class="pied">Document généré par l'application Famille.Mbeutetsa — le ${new Date().toLocaleDateString("fr-FR")}.</div>
</body></html>`;
}

/** Télécharger en Word (.doc — HTML signé Word, ouvre dans Word/LibreOffice). */
export function telechargerWord(nomFichier: string, titre: string, corpsHTML: string): void {
  const html = documentHTML(titre, corpsHTML);
  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomFichier}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** « PDF » : ouvre le document en fenêtre d'impression (Enregistrer en PDF). */
export function telechargerPDF(titre: string, corpsHTML: string): void {
  const html = documentHTML(titre, corpsHTML);
  const w = window.open("", "_blank", "width=820,height=940");
  if (!w) {
    // bloqueur de pop-ups → téléchargement Word en secours
    telechargerWord(titre.toLowerCase().replace(/\s+/g, "-"), titre, corpsHTML);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.focus(); } catch { /* rien */ }
  setTimeout(() => { try { w.print(); } catch { /* rien */ } }, 350);
}
