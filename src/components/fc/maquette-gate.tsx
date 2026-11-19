"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BASCULE MAQUETTE ⇄ APPLICATION — Famille.Mbeutetsa (v36)
//
// v36 — DEMANDES DE L'ADMINISTRATEUR (barre du haut + fin de la page accueil) :
//   « À la place de Membres, tu mets le logo et tu écris en dessous Famille
//   Mbeutetsa. Et au niveau de Apps, ce serait plutôt le menu hamburger qui
//   s'y trouve. Concernant les boutons tels que Membres et Apps, tu les
//   supprimes — ainsi que la petite icône qui montre que l'IA travaille.
//   L'ancienne page d'accueil (tableau de bord, Finances, Mon poste au
//   bureau) est supprimée : après la géolocalisation, on arrive DIRECTEMENT
//   sur la page de son propre statut (Espace Membre, Président…). »
//   · la barre du haut devient : LOGO + nom de la famille (en dessous) à
//     gauche, MENU HAMBURGER à droite — plus de pastilles de consoles, plus
//     de bouton « App », plus d'icône « IA » (Sparkles) ;
//   · le hamburger GLOBAL ouvre le tiroir de la console courante (événement
//     « fc-ouvrir-menu » — un seul MenuHamburger est monté à la fois) ;
//   · en mode app (inscription / géolocalisation / rôle), la barre montre la
//     marque seule : le hamburger n'existe pas encore (aucune console).
//
// v34 — ISOLATION STRICTE (inchangée) : le gate lit le poste du compte
//   connecté (fc_uid + fc_tontine_role_v1) — la console d'un AUTRE poste est
//   refusée (redirection Espace Membre + message). Chacun ne voit que SON
//   statut ; sans compte connecté (validation de développement), les 4
//   consoles restent accessibles par l'URL (#president/#secretaire/…).
//
// v32 — PAGE 1 « Ouvrez votre page » (code seul) + PAGE 2 « Vos
//   renseignements » : le parcours d'inscription reste celui-là (AuthFlow).
//
// Trois consoles de gestion restent présentées en vue de validation, routées
// par le hash de l'URL :
//   · #president/…    → Poste de commandement du Président
//   · #secretaire/…   → Console du Secrétaire (20 onglets)
//   · #commissaire/…  → Console du Commissaire aux comptes
//   · #membre/…       → Espace Membre
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import { MainApp } from "./main-app";
import { MaquettePresident } from "./maquette-president";
import { MaquetteSecretaire } from "./maquette-secretaire";
import { MaquetteCommissaire } from "./maquette-commissaire";
import { EspaceMembre } from "./espace-membre";
import { corrigerFauxNegatifLegacy, forceLegacyDemande, gateMode } from "./gate-fix";
import { CONSOLE_DU_ROLE, LIBELLE_CONSOLE, roleDuCompteConnecte } from "./poste-console";
import type { RoleKey } from "./tontine-data";

type ConsoleKey = "president" | "secretaire" | "commissaire" | "membre";

function consoleFromHash(): ConsoleKey {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#secretaire")) return "secretaire";
    if (h.startsWith("#commissaire")) return "commissaire";
    if (h.startsWith("#membre")) return "membre";
  } catch { /* rien */ }
  return "president";
}

/** Le hash vise EXPLICITEMENT une console — contrairement à consoleFromHash,
 *  qui renvoie « president » par défaut pour tout hash inconnu (#tontine,
 *  #admin, vide…) : ce repère sert à la bascule automatique ci-dessous. */
function hashConsoleExplicite(): boolean {
  try {
    const h = (window.location.hash || "").toLowerCase();
    return h.startsWith("#president") || h.startsWith("#secretaire") || h.startsWith("#commissaire") || h.startsWith("#membre");
  } catch {
    return false;
  }
}

/** v36 — le hamburger de la BARRE DU HAUT : ouvre le tiroir de la console
 *  courante. La console (Espace Membre, Président, Secrétaire, Commissaire)
 *  écoute « fc-ouvrir-menu » dans son MenuHamburger — un seul est monté à la
 *  fois, donc le tiroir qui répond est toujours le bon. */
function ouvrirMenuConsole(): void {
  try {
    window.dispatchEvent(new CustomEvent("fc-ouvrir-menu"));
  } catch { /* rien */ }
}

/** v36 — BARRE DU HAUT : le logo de la famille + son nom écrit EN DESSOUS
 *  (demande de l'administrateur), et — quand une console est affichée — le
 *  menu hamburger à droite. Fini les pastilles « Membres » / « App » et
 *  l'icône d'IA. */
function BarreHaute({ avecMenu }: { avecMenu: boolean }) {
  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-[#2A4A3A] px-3 py-1.5 text-white"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex shrink-0 flex-col items-center">
          <img
            src="/logo-famille.webp"
            alt="Armoiries de la famille Mbeutetsa"
            className="h-7 w-7 rounded-lg border border-[#C89F62]/70 bg-[#FBF7EA] object-cover"
          />
          <p className="mt-0.5 text-[9px] font-bold leading-none tracking-wide text-[#FBF7EA]">
            Famille Mbeutetsa
          </p>
        </div>
      </div>
      {avecMenu && (
        <button
          type="button"
          onClick={ouvrirMenuConsole}
          aria-label="Ouvrir le menu de la page"
          aria-haspopup="dialog"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#C89F62]/70 bg-white/10 text-[#FBF7EA] transition-all hover:bg-white/20 active:scale-95"
        >
          <Menu aria-hidden className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function MaquetteGate() {
  // Navigateurs 2015 (classe fc-legacy posée par le browser gate) : l'app Lite
  // ES5 reste maîtresse — la maquette React ne s'y affiche pas. v31 : la valeur
  // est réévaluée après le montage — si React monte, MainApp CORRIGE le faux
  // négatif (classe re-posée en fc-modern) et la maquette reprend la main.
  const [legacy, setLegacy] = useState(
    () => typeof document !== "undefined" && /fc-legacy/.test(document.documentElement.className),
  );
  // v27 — L'APPLICATION TELLE QUELLE à l'ouverture. v36 — HYDRATATION SÛRE :
  // l'état initial est TOUJOURS « app » (identique côté serveur et client —
  // lire window.location.hash à l'état initial crée un mismatch SSR/client,
  // erreur « Hydration failed » avec la nouvelle barre). Le sync() post-montage
  // (setTimeout 0, ci-dessous) bascule vers « maquette » si l'URL vise déjà
  // une console (#president/…, #secretaire/…, #membre/…).
  const [mode, setMode] = useState<"maquette" | "app">("app");
  const [console_, setConsole_] = useState<ConsoleKey>(() => consoleFromHash());
  // v34 — poste du compte connecté sur CET appareil : sert à l'ISOLATION DES
  // STATUTS (seule la console du propre poste est ouverte). "pas-de-compte"
  // = validation de développement sans session : tout reste accessible.
  const [roleCompte, setRoleCompte] = useState<RoleKey | "pas-de-compte">(
    () => (typeof window !== "undefined" ? roleDuCompteConnecte() : "pas-de-compte"),
  );

  /** v34 — la console demandée est-elle ouverte à CE compte ? L'Espace Membre
   *  est de tous ; chaque console du bureau n'appartient qu'à SON poste —
   *  « aucun membre ne devrait voir la page du statut d'un autre membre ». */
  const consoleAutorisee = (c: ConsoleKey, role: RoleKey | "pas-de-compte"): boolean =>
    role === "pas-de-compte" || c === "membre" || CONSOLE_DU_ROLE[role] === c;

  useEffect(() => {
    // v31 — CORRECTION DU FAUX NÉGATIF AVANT TOUT : React monte (preuve
    // vivante que le navigateur est moderne). Si le gate l'avait classé
    // « legacy » à tort (détection stricte), on retourne le masque posé dans
    // <head> et on retire le fallback Lite — sinon l'écran « Bienvenue » du
    // Lite restait empilé AU-DESSUS de la maquette (capture du 09/11).
    // #fc-force-legacy explicite reste respecté (version Lite demandée).
    if (gateMode() === "legacy" && !forceLegacyDemande()) corrigerFauxNegatifLegacy();
    const sync = () => {
      // v31 — réévaluation du mode Lite : la correction ci-dessus a re-posé
      // fc-modern → la maquette React reprend la main.
      setLegacy(/fc-legacy/.test(document.documentElement.className));
      // v34 — poste du compte (relu à chaque sync : il peut être posé entre-temps
      // par le code d'invitation) puis ISOLATION : si le hash vise la console
      // d'un AUTRE poste → Espace Membre (chacun ne voit que son statut).
      const role = roleDuCompteConnecte();
      setRoleCompte(role);
      let cible = consoleFromHash();
      if (hashConsoleExplicite() && !consoleAutorisee(cible, role)) {
        const refusee = cible; // capturée AVANT la redirection (message clair)
        cible = "membre";
        try {
          window.history.replaceState(null, "", "#membre");
        } catch { /* rien */ }
        toast.error(
          `La page « ${LIBELLE_CONSOLE[refusee]} » n'est pas la vôtre — chaque membre ne voit que SON statut. Votre Espace Membre est ouvert.`,
        );
      }
      setConsole_(cible);
      // v20 — quand le hash vise une console, la vue bascule d'elle-même de
      // l'application vers la console du poste (lien profond, bouton retour).
      if (hashConsoleExplicite()) setMode("maquette");
    };
    const t0 = setTimeout(sync, 0);
    // v34 — GUÉRISON DE SESSION + RE-SYNCHRONISATION DIFFÉRÉE : au chargement
    // direct d'une console (#secretaire…), le stockage peut avoir perdu
    // fc_uid/fc_name (vidage du navigateur) — la session rend le compte, on
    // les repose, puis on relit le poste : l'isolation des statuts s'applique
    // d'emblée, quel que soit le mode (app ou maquette).
    void (async () => {
      try {
        const { api } = await import("@/lib/fc-client");
        const s = await api<{ session: { user: { id: string; fullName: string } } | null }>("/api/auth/session");
        if (s.ok && s.session) {
          const uid = s.session.user.id;
          const nom = s.session.user.fullName;
          try {
            if (uid && localStorage.getItem("fc_uid") !== uid) localStorage.setItem("fc_uid", uid);
            if (nom && localStorage.getItem("fc_name") !== nom) localStorage.setItem("fc_name", nom);
          } catch { /* stockage indisponible */ }
          sync();
        }
      } catch { /* pas de session — validation hors connexion possible */ }
    })();
    const t1 = setTimeout(sync, 1400);
    const onHash = () => sync();
    window.addEventListener("hashchange", onHash);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  if (legacy) return <MainApp />;

  if (mode === "app") {
    // v36 — mode app : le parcours d'inscription (code → renseignements →
    // géolocalisation → rôle) puis la redirection DIRECTE vers la page du
    // poste. La barre du haut montre la marque seule : le hamburger n'a
    // encore aucune console à ouvrir.
    return (
      <div className="flex flex-1 flex-col">
        <BarreHaute avecMenu={false} />
        <MainApp />
      </div>
    );
  }

  // v36 — mode console : la page propre au statut connecté, sous la barre du
  // haut (logo + hamburger). Plus aucune pastille « Membres » / « App ».
  return (
    <div className="flex flex-1 flex-col">
      <BarreHaute avecMenu />
      {console_ === "president" ? <MaquettePresident />
        : console_ === "secretaire" ? <MaquetteSecretaire />
        : console_ === "membre" ? <EspaceMembre />
        : <MaquetteCommissaire />}
    </div>
  );
}
