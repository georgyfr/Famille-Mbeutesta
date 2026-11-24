"use client";

import { detruireMiroir, DRAPEAU_PURGE } from "@/lib/fc-storage-mirror";

// ─────────────────────────────────────────────────────────────────────────────
// PURGE DES UTILISATEURS DE L'APPLICATION — Famille.Mbeutetsa (v28, Task 72)
//
// Signalement de l'administrateur : « Je pensais avoir demandé de supprimer
// tous les comptes sans exception… Pourquoi ne l'as-tu pas fait ? Supprime
// absolument tous les comptes, même ceux que j'ai créés via le téléphone,
// tels que Georges, Georges 2, etc. »
//
// CAUSE DE LA RÉSURRECTION (corrigée en v28) — la purge v27 vidait la base
// fc_demo_db_v2… mais le MIROIR DE SECOURS (fc-storage-mirror.ts) reprenait
// aussitôt le relais : snapshot IndexedDB « fc-mirror » + cookies « fc_anchor »
// (miniature du compte) + « fc_ep_data » (épargnes compactées). Conçu pour
// protéger contre les navigateurs qui vident le localStorage, ce miroir a
// RESTAURÉ les comptes supprimés (Georges, Georges 2…) dès la seconde de la
// purge. La purge v28 détruit donc LES TROIS COUCHES :
//   1. localStorage — base de l'app + marqueurs du compte courant ;
//   2. IndexedDB  — base « fc-mirror » supprimée ENTIÈREMENT ;
//   3. cookies    — fc_anchor, fc_ep_data, fc_session (expirés sur-le-champ).
// Un drapeau de session interdit EN OUTRE toute restauration miroir pendant
// la page qui purge (course purge ⇄ restauration éliminée).
//
// PORTÉE EXACTE (inchangée) :
//   · PURGÉS — les comptes de l'APPLICATION RÉELLE : base fc_demo_db_v2
//     (+ v1/v3 héritées), utilisateurs, membres, géolocalisations,
//     notifications, session, appareils, marqueurs du compte courant.
//   · PRÉSERVÉS — TOUTES les données de la MAQUETTE (conservées pour les
//     tests) : les 10 membres fictifs (en dur) et les registres partagés du
//     bureau (fc_epargnes_reunion_v1, fc_prets_reunion_v1,
//     fc_secretaire_cotis_mois_v1, fc_cotis_types_v1, fc_codes_membres_v1,
//     fc_villes_v1, fc_tontine_*) ne sont JAMAIS touchés.
//
// ONE-SHOT PAR VERSION (marqueur fc_purge_app_v28) : le NOUVEAU nom du
// marqueur relance la purge sur CHAQUE appareil qui charge v28 — y compris
// les téléphones qui avaient déjà exécuté la v27. Ensuite, plus JAMAIS : le
// premier utilisateur réel (la secrétaire — code FCM-SAND2R, Sandrine
// Abessolo, v38) s'inscrit sur une base vide et ses données ne sont plus
// jamais effacées.
// ─────────────────────────────────────────────────────────────────────────────

const MARQUEUR = "fc_purge_app_v28";

/** Drapeau de SESSION — posé par la purge, lu par le miroir : la page qui
 *  vient de purger ne doit JAMAIS restaurer un snapshot résiduel.
 *  (Constante définie dans le miroir — source unique — et réexportée ici.) */
export { DRAPEAU_PURGE };

/** Clés du stockage LOCAL appartenant à l'application réelle (comptes +
 *  données du compte) — purgées une seule fois à la mise en v28. */
const CLES_APP: string[] = [
  "fc_demo_db_v2", // base de l'app : users, members (géolocs), notifications, session
  "fc_demo_db_v1", // base héritée (anciens essais — comptes résiduels)
  "fc_demo_db_v3", // annexe écrite par les codes d'invitation avant la correction v27
  "fc_uid", // compte courant
  "fc_name", // nom affiché en cache
  "fc_phone", // téléphone en cache (push)
  "fc_loc_skipped", // marqueur « localisation plus tard » du compte
  "fc_code_invite_v1", // code d'invitation collé mais non consommé
  "fc_ma_ville_v1", // ville de tontine du compte
  "fc_session_restore_v1", // restauration de session (mode backend réel)
  // — données PERSONNELLES du compte supprimé (c'est précisément ce que le
  //   miroir qualifiait de « donnée la plus précieuse » à ressusciter) —
  "fc_tontine_epargnes_v1", // épargnes « vous » du compte supprimé
  "fc_tontine_prets_v1", // prêts « vous » du compte supprimé
  "fc_tontine_payes_v1", // remboursements payés du compte supprimé
  "fc_tontine_role_v1", // rôle choisi par le compte supprimé (le code du bureau réattribuera)
  "fc_tontine_decisions_v1", // journal des décisions validées par le compte
  "fc_tontine_signalements_v1", // signalements émis par le compte
];

/** Cookie de session du mode backend réel — fermé lui aussi par la purge
 *  (les cookies du MIROIR, fc_anchor/fc_ep_data, sont détruits par
 *  detruireMiroir() importé de fc-storage-mirror.ts). */
const COOKIES_A_DETUIRE: string[] = ["fc_session"];

function effacerCookie(nom: string): void {
  try {
    // max-age=0 + expires passée : double couverture tous navigateurs.
    document.cookie = `${nom}=; max-age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  } catch {
    /* cookies indisponibles */
  }
}

/* ─── Nettoyage fin des registres PARTAGÉS (maquette préservée) ───
 * Les registres du bureau survivent (données de la maquette) MAIS toutes les
 * références aux comptes RÉELS supprimés (« app-… ») en sont retirées : sinon
 * des lignes fantômes « membre inconnu » pollueraient les listes du bureau.
 * Les pré-inscriptions « tel-… » (futurs membres par code) sont conservées. */

const PREFIXE_COMPTE_SUPPRIME = "app-";

/** Retire d'un tableau d'items { membreId } ceux portés par un compte supprimé. */
function scrubListe(cle: string): void {
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return;
    const data = JSON.parse(brut) as unknown;
    if (!Array.isArray(data)) return;
    const filtre = data.filter(
      (x) => typeof x === "object" && x !== null &&
        typeof (x as { membreId?: unknown }).membreId === "string" &&
        !(x as { membreId: string }).membreId.startsWith(PREFIXE_COMPTE_SUPPRIME),
    );
    if (filtre.length !== data.length) {
      window.localStorage.setItem(cle, JSON.stringify(filtre));
    }
  } catch {
    /* registre illisible — on n'y touche pas */
  }
}

/** Registre clé→objet (cotisations du mois : { "<membreId>": {...} }) — les
 *  entrées « app-… » disparaissent, les autres restent intactes. */
function scrubObjet(cle: string): void {
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return;
    const data = JSON.parse(brut) as Record<string, unknown>;
    if (!data || typeof data !== "object" || Array.isArray(data)) return;
    let touche = false;
    for (const k of Object.keys(data)) {
      if (k.startsWith(PREFIXE_COMPTE_SUPPRIME)) {
        delete data[k];
        touche = true;
      }
    }
    if (touche) window.localStorage.setItem(cle, JSON.stringify(data));
  } catch {
    /* registre illisible — on n'y touche pas */
  }
}

/** Types de cotisations : retire les membres « app-… » (comptes supprimés)
 *  des listes d'attribution — « tel-… » (futurs membres) conservés. */
function scrubTypesCotisations(): void {
  try {
    const brut = window.localStorage.getItem("fc_cotis_types_v1");
    if (!brut) return;
    const types = JSON.parse(brut) as { membreIds?: string[] }[];
    if (!Array.isArray(types)) return;
    let touche = false;
    const filtre = types.map((t) => {
      if (!Array.isArray(t.membreIds)) return t;
      const ids = t.membreIds.filter((m) => !m.startsWith(PREFIXE_COMPTE_SUPPRIME));
      if (ids.length !== t.membreIds.length) touche = true;
      return { ...t, membreIds: ids };
    });
    if (touche) window.localStorage.setItem("fc_cotis_types_v1", JSON.stringify(filtre));
  } catch {
    /* illisible — on n'y touche pas */
  }
}

/** Réinitialise les CODES SEMÉS de l'application (FCM-JS2ALE — la secrétaire
 *  Josiale, v41 ; FCM-A3V29V — le président Albert Fotsos ;
 *  FCM-C7QKPT — le Coach, v34-quinquies) : si une machine avait marqué l'un
 *  d'eux « utilisé » lors d'un essai, la purge efface la trace locale — les
 *  codes redeviennent VIERGES et utilisables sur tous les appareils
 *  (chargerCodes() retombe sur la version semée dans l'app ; les anciens
 *  FCM-K7M2PV, FCM-SAND2R et FCM-PL82US sont écartés à la lecture par
 *  chargerCodes). */
function scrubCodeSeed(): void {
  try {
    const brut = window.localStorage.getItem("fc_codes_membres_v1");
    if (!brut) return;
    const codes = JSON.parse(brut) as { id?: string }[];
    if (!Array.isArray(codes)) return;
    const filtre = codes.filter(
      (c) =>
        c?.id !== "cm-seed-premier" &&
        c?.id !== "cm-seed-secretaire" &&
        c?.id !== "cm-seed-josiale" &&
        c?.id !== "cm-seed-president" &&
        c?.id !== "cm-seed-coach",
    );
    if (filtre.length !== codes.length) {
      window.localStorage.setItem("fc_codes_membres_v1", JSON.stringify(filtre));
    }
  } catch {
    /* illisible — les codes semés restent disponibles de toute façon */
  }
}

/** Purge one-shot — appelée au démarrage de MainApp (AVANT la lecture de la
 *  session ET avant l'installation du miroir, donc l'app démarre bien « sans
 *  aucun utilisateur »). Idempotente : si le marqueur v28 existe déjà, elle ne
 *  fait RIEN — les données réelles créées ensuite (le premier secrétaire)
 *  restent en place pour toujours. */
export function purgerAppUneFois(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MARQUEUR)) return;
    // 1. localStorage — base + marqueurs du compte.
    for (const cle of CLES_APP) {
      try {
        window.localStorage.removeItem(cle);
      } catch {
        /* clé verrouillée — la purge continue sur les autres */
      }
    }
    // 2. Miroir de secours — IndexedDB « fc-mirror » + cookies anchor/épargnes.
    detruireMiroir();
    // 3. Cookie de session du mode backend réel.
    for (const c of COOKIES_A_DETUIRE) effacerCookie(c);
    // 4. Registres partagés : nettoyage fin des références « app-… » (comptes
    //    supprimés) — la maquette garde tout le reste.
    scrubListe("fc_epargnes_reunion_v1");
    scrubListe("fc_prets_reunion_v1");
    scrubListe("fc_prets_demandes_v1");
    scrubObjet("fc_secretaire_cotis_mois_v1");
    scrubTypesCotisations();
    scrubCodeSeed(); // FCM-JS2ALE redevient vierge (secrétaire Josiale)
    // 5. Drapeau de session : CETTE page ne doit restaurer aucun snapshot.
    try {
      window.sessionStorage.setItem(DRAPEAU_PURGE, new Date().toISOString());
    } catch {
      /* rien */
    }
    window.localStorage.setItem(MARQUEUR, new Date().toISOString());
  } catch {
    /* stockage indisponible — rien à purger */
  }
}
