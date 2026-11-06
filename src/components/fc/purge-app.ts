"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PURGE DES UTILISATEURS DE L'APPLICATION — Famille.Mbeutetsa (v27, Task 71)
//
// Demande de l'administrateur : « supprime tous les utilisateurs — ceux que
// j'ai créés manuellement et ceux créés par l'IA — et toutes leurs données :
// cotisations, prêts, géolocalisations. Pour le moment, le site ne devrait
// avoir AUCUN utilisateur : les vrais membres arrivent. »
//
// PORTÉE EXACTE (cruciale) :
//   · PURGÉS — les comptes de l'APPLICATION RÉELLE : base fc_demo_db_v2
//     (utilisateurs, membres, géolocalisations, notifications, session,
//     appareils) + l'annexe v3 des villes + les marqueurs du compte courant
//     (fc_uid, localisation passée, code d'invitation en attente, ma ville).
//   · PRÉSERVÉS — TOUTES les données de la MAQUETTE (conservées pour
//     continuer les tests) : les 10 membres fictifs (en dur dans le code) et
//     les registres partagés du bureau (fc_epargnes_reunion_v1,
//     fc_prets_reunion_v1, fc_secretaire_cotis_mois_v1, fc_cotis_types_v1,
//     fc_codes_membres_v1, fc_villes_v1…) ne sont JAMAIS touchés.
//
// La purge est UNE FOIS POUR TOUTES (marqueur fc_purge_app_v27) : dès qu'elle
// a tourné, elle ne revient JAMAIS — le premier utilisateur réel (le
// secrétaire qui activera le code FCM-K7M2PV) s'inscrit sur une base vide et
// ses données ne sont plus jamais effacées.
// ─────────────────────────────────────────────────────────────────────────────

const MARQUEUR = "fc_purge_app_v27";

/** Clés du stockage LOCAL appartenant à l'application réelle (comptes +
 *  données du compte) — purgées une seule fois à la mise en v27. */
const CLES_APP: string[] = [
  "fc_demo_db_v2", // base de l'app : users, members (géolocs), notifications, session
  "fc_demo_db_v3", // annexe écrite par les codes d'invitation avant la correction v27
  "fc_uid", // compte courant
  "fc_loc_skipped", // marqueur « localisation plus tard » du compte
  "fc_code_invite_v1", // code d'invitation collé mais non consommé
  "fc_ma_ville_v1", // ville de tontine du compte
];

/** Purge one-shot — appelée au démarrage de MainApp (AVANT la lecture de la
 *  session, donc l'app démarre bien « sans aucun utilisateur »). Idempotente :
 *  si le marqueur existe déjà, elle ne fait RIEN (les données réelles créées
 *  ensuite — le premier secrétaire — restent en place pour toujours). */
export function purgerAppUneFois(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MARQUEUR)) return;
    for (const cle of CLES_APP) {
      try {
        window.localStorage.removeItem(cle);
      } catch {
        /* clé verrouillée — la purge continue sur les autres */
      }
    }
    // La session serveur (mode backend réel) est aussi fermée localement :
    // plus aucun utilisateur « existant » à l'écran de l'application.
    try {
      window.localStorage.removeItem("fc_session_restore_v1");
    } catch {
      /* rien */
    }
    window.localStorage.setItem(MARQUEUR, new Date().toISOString());
  } catch {
    /* stockage indisponible — rien à purger */
  }
}
