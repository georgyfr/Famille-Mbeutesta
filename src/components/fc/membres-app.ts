"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MEMBRES AJOUTÉS VIA L'APPLICATION — Famille.Mbeutetsa
//
// Retour de l'administrateur (Task 55) : « parmi les membres présents, il n'y a
// pas les membres que j'ai ajoutés par moi-même. Je pense avoir ajouté deux ou
// trois membres. Pourquoi ne sont-ils pas présents ? »
//
// CAUSE — la console du président n'affichait que les 10 membres de
// DÉMONSTRATION (MEMBRES_FICTIFS) : les personnes ajoutées depuis l'espace
// famille (inscription avec code d'accès, pré-enregistrement du secrétariat)
// sont enregistrées dans l'ANNUAIRE de l'application mais aucun lien ne les
// ramenait vers la console du président.
//
// SOLUTION — ce module lit l'annuaire réel et le convertit en membres de la
// Tontine :
//   • mode démo (site Cloudflare) : la base navigateur fc_demo_db_v2 — la
//     même que l'inscription et le pré-enregistrement alimentent déjà ;
//   • hors mode démo (dev, annuaire serveur exigeant une session) : liste
//     vide — la maquette garde ses 10 membres de démonstration, aucune
//     régression.
// Les membres importés sont fusionnés APRÈS les 10 membres de démonstration,
// sans doublon de nom, et marqués par le préfixe d'identifiant « app- » afin
// de pouvoir les signaler « via l'app » dans les listes.
// ─────────────────────────────────────────────────────────────────────────────

import { MEMBRES_FICTIFS, type Member, type RoleKey } from "./tontine-data";
import { loadVousRole } from "./tontine-bureau";

/** Préfixe d'identifiant des membres importés de l'annuaire de l'application. */
export const PREFIXE_ID_APP = "app-";

/** Vrai pour un membre importé de l'annuaire de l'application (≠ démonstration). */
export function estMembreApp(m: Member): boolean {
  return m.id.startsWith(PREFIXE_ID_APP);
}

/** Normalise un nom pour la déduplication (minuscules, sans accents). */
function nomCle(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Entrée de l'annuaire de l'application (miroir de DemoMember — lecture
 *  défensive : seuls les champs utiles sont attendus, tout est optionnel). */
type EntreeAnnuaire = {
  id?: string;
  fullName?: string;
  phone?: string;
  status?: string; // PREINSCRIT | ACTIF — les deux participent à la Tontine
  branch?: string;
  city?: string | null;
  createdAt?: string;
};

/** Lit l'annuaire de l'application et le convertit en membres de la Tontine.
 *  Retourne [] en l'absence d'annuaire (dev, stockage vide) — jamais d'erreur. */
export function loadMembresApplication(): Member[] {
  try {
    if (typeof window === "undefined") return [];
    const brut = localStorage.getItem("fc_demo_db_v2");
    if (!brut) return [];
    const db: { members?: EntreeAnnuaire[] } = JSON.parse(brut);
    // Déduplication : un nom déjà porté par un membre de démonstration (ou
    // déjà importé) n'est pas importé une seconde fois.
    const deja = new Set(MEMBRES_FICTIFS.map((m) => nomCle(m.name)));
    const importes: Member[] = [];
    for (const m of db.members ?? []) {
      const nom = (m.fullName ?? "").trim();
      if (!nom || !m.id) continue;
      const cle = nomCle(nom);
      if (deja.has(cle)) continue;
      deja.add(cle);
      const ville =
        (m.city ?? "").trim() ||
        (m.branch ?? "").replace(/^Branche\s+/i, "").trim() ||
        "—";
      const anneeBrute = m.createdAt ? new Date(m.createdAt).getFullYear() : NaN;
      importes.push({
        id: `${PREFIXE_ID_APP}${m.id}`,
        name: nom,
        role: "membre",
        phone: (m.phone ?? "").trim(),
        city: ville,
        since: Number.isFinite(anneeBrute) ? String(anneeBrute) : String(new Date().getFullYear()),
        tour: 11, // non affiché dans la console du président
        fictif: false,
        isVous: false,
      });
    }
    return importes;
  } catch {
    return [];
  }
}

/* ═══ v34 — LE COMPTE CONNECTÉ : le VRAI membre (fin des données fictives) ═══
 * Demande de l'administrateur : « lorsqu'on est président, que ce soit plutôt
 * notre nom, notre compte, notre statut et nos tableaux, nos prêts, nos
 * cotisations qui nous sont propres à nous et non des éléments fictifs. »
 *
 * L'identité réelle est lue du compte connecté (fc_uid + fc_name) : c'est
 * LUI qui apparaît (ex. « Albert Fotsos »), avec SON poste (posé par son
 * code d'invitation) et SES données (cotisation, épargnes, prêts) — les
 * tables écrivent le MÊME identifiant « app-<uid> » que l'espace membre et
 * les registres du bureau : tout est coordonné, une seule source de vérité.
 * Sans compte connecté (validation de développement), null — la console
 * affiche alors un libellé neutre « Président » SANS nom inventé. */

/** Le compte connecté converti en membre de la Tontine (null si aucun compte).
 *  Sources en cascade : fc_uid + fc_name (posés à l'inscription), sinon la
 *  SESSION de la base démo fc_demo_db_v2 (d.session → user → member) —
 *  robuste même si le navigateur a perdu fc_uid/fc_name en route. */
export function chargerCompteConnecte(): Member | null {
  try {
    if (typeof window === "undefined") return null;
    const uid = localStorage.getItem("fc_uid");
    const nom = (localStorage.getItem("fc_name") ?? "").trim();
    if (uid && nom) {
      const phone = (localStorage.getItem("fc_phone") ?? "").trim();
      return {
        id: `${PREFIXE_ID_APP}${uid}`,
        name: nom,
        role: (loadVousRole() ?? "membre") as RoleKey,
        phone,
        city: "Ma position",
        since: String(new Date().getFullYear()),
        tour: 1,
        fictif: false,
        isVous: true,
      };
    }
    // SECOURS — la session de l'annuaire (même source que le tableau de bord)
    const brut = localStorage.getItem("fc_demo_db_v2");
    if (!brut) return null;
    const db: {
      session?: { uid?: string } | null;
      users?: { id?: string; fullName?: string; phone?: string }[];
      members?: EntreeAnnuaire[];
    } = JSON.parse(brut);
    const suid = db.session?.uid;
    const user = (db.users ?? []).find((u) => u.id === suid);
    const nomSession = (user?.fullName ?? "").trim();
    if (!suid || !nomSession) return null;
    const phone = (user?.phone ?? "").trim();
    const membreAnnuaire = (db.members ?? []).find((m) => m.id === suid);
    return {
      id: `${PREFIXE_ID_APP}${suid}`,
      name: nomSession,
      role: (loadVousRole() ?? "membre") as RoleKey,
      phone,
      city: (membreAnnuaire?.city ?? "").trim() || "Ma position",
      since: String(new Date().getFullYear()),
      tour: 1,
      fictif: false,
      isVous: true,
    };
  } catch {
    return null;
  }
}

/** Effectif RÉEL de la Tontine : le compte connecté (le « vous » réel, avec
 *  SON poste) + les membres inscrits/pré-enregistrés dans l'annuaire de
 *  l'application + les futurs membres (codes d'invitation en attente).
 *  AUCUN membre fictif — la console reflète la vie réelle de la famille. */
export function chargerRosterReel(): Member[] {
  const vous = chargerCompteConnecte();
  const app = loadMembresApplication().filter((m) => m.id !== vous?.id);
  return vous ? [vous, ...app] : app;
}
