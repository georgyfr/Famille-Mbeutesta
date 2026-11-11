"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BASCULE MAQUETTE ⇄ APPLICATION — Famille.Mbeutetsa (v34)
//
// v34 — DEMANDES DE L'ADMINISTRATEUR (isolation des statuts) :
//   « Au niveau de la version mobile, je ne souhaite plus que le bouton bureau
//   apparaisse. […] Désormais lorsqu'une personne finit son inscription et sa
//   géolocalisation, la page qui suit est la page propre au statut qu'il
//   occupe. Et aucun membre ne devrait voir la page du statut d'un autre
//   membre dans l'entreprise. Tu ne vois que ton statut. »
//   · le bouton « Bureau › » du bandeau de l'application est SUPPRIMÉ — plus
//     aucune porte des consoles de validation depuis l'app réelle ;
//   · après la géolocalisation (et le rôle), l'app ouvre DIRECTEMENT la
//     console du propre poste (main-app.tsx, poste-console.ts) ;
//   · ISOLATION STRICTE : le gate lit le poste du compte connecté
//     (fc_uid + fc_tontine_role_v1) — la console d'un AUTRE poste est
//     refusée (redirection Espace Membre + message), et les pastilles du
//     bandeau ne montrent que LA console du poste (plus de sélecteur de
//     toutes les consoles pour les comptes réels ; sans compte connecté —
//     validation de développement — les 4 consoles restent accessibles) ;
//   · l'auto-attribution de postes est fermée : le rôle vient UNIQUEMENT du
//     code d'invitation (role-wizard.tsx, dashboard.tsx alignés).
//
// v32 — DEMANDE DE L'ADMINISTRATEUR : « tout le monde se connecte avec le
// code qu'on lui a généré — je veux une première page UNIQUEMENT avec le code
// à coller qui va le rediriger vers une autre page de renseignement, en
// interface mobile. »
//   · PAGE 1 « Ouvrez votre page » : UNIQUEMENT le champ code (FCM-XXXXXX) —
//     l'ancien écran « Bienvenue 🌳 » (choix inscription/connexion) est
//     SUPPRIMÉ — plus AUCUNE autre porte d'entrée ;
//   · PAGE 2 « Vos renseignements » : nom + téléphone PRÉREMPLI depuis le
//     code (modifiable) → vérification automatique → compte créé DIRECTEMENT
//     avec le nom saisi (l'ancien écran « être appelé » a disparu) ;
//   · code déjà utilisé → reconnexion par numéro (prérempli depuis le code) —
//     jamais de double compte.
//
// v30 — DEMANDE DE L'ADMINISTRATEUR : « les différents boutons des pages
// occupent toute la page, ça rend la navigation difficile — organiser toutes
// les sections dans un menu hamburger… et le même mécanisme pour tous les
// autres membres du bureau. »
//   · MENU HAMBURGER (MenuHamburger, maquette-ui) : UNE barre compacte
//     collante (☰ + onglet courant) + un TIROIR latéral regroupant toutes
//     les sections et leurs onglets (Mémoire de la réunion, Gestion de la
//     cantine…) — le contenu redevient lisible ;
//   · MÊME MÉCANISME sur les 4 consoles : Secrétaire (20 onglets / 4
//     sections), Président (2 familles), Commissaire, Espace Membre ;
//   · badges conservés : le ☰ affiche le total des actions attendues hors
//     onglet courant, l'onglet courant garde son propre chiffre ;
//   · chaque onglet garde son URL (#secretaire/…, #president/…).
//
// v29 — DEMANDE DE L'ADMINISTRATEUR : « “Recevoir la notification” — supprime
// cette phrase car la notification automatique doit être par défaut ; ajoute
// cette option plutôt dans les paramètres. »
//   · le bouton « Recevoir la notification » de l'inscription est SUPPRIMÉ :
//     la vérification du numéro part TOUTE SEULE dès que le numéro est complet ;
//   · les notifications push sont AUTOMATIQUES PAR DÉFAUT (aucun bouton
//     « Activer les notifications ») ;
//   · le réglage vit dans LES PARAMÈTRES : Ma sécurité, Espace Membre → Mon
//     profil, Paramètres du secrétariat et du président (ReglageNotifications).
//
// v27 — DEMANDE DE L'ADMINISTRATEUR : « au niveau de l'application mobile,
// que l'on ne voie PAS la maquette : qu'on voie l'APPLICATION TELLE QUELLE. »
//   · À l'ouverture, c'est l'APPLICATION qui s'affiche (MainApp) — plus la
//     maquette par défaut ;
//   · en mode app, le bandeau est réduit à une fine barre discrète (marque
//     + accès « Bureau » pour l'administrateur) : l'app est vue TELLE QUELLE ;
//   · les consoles du bureau restent accessibles : pastille « Bureau », ou
//     hash explicite (#president/#secretaire/#commissaire/#membre) posé par
//     le switcher « Mon poste au bureau » — la vue bascule alors d'elle-même.
// Trois consoles de gestion restent présentées en vue de validation, routées
// par le hash de l'URL :
//   · #president/…    → Poste de commandement du Président
//   · #secretaire/…   → Console du Secrétaire (20 onglets)
//   · #commissaire/…  → Console du Commissaire aux comptes
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MainApp } from "./main-app";
import { MaquettePresident } from "./maquette-president";
import { MaquetteSecretaire } from "./maquette-secretaire";
import { MaquetteCommissaire } from "./maquette-commissaire";
import { EspaceMembre } from "./espace-membre";
import { corrigerFauxNegatifLegacy, forceLegacyDemande, gateMode } from "./gate-fix";
import { CONSOLE_DU_ROLE, LIBELLE_CONSOLE, roleDuCompteConnecte } from "./poste-console";
import type { RoleKey } from "./tontine-data";
import { Sparkles, Crown, PenLine, Landmark, Users } from "lucide-react";

type ConsoleKey = "president" | "secretaire" | "commissaire" | "membre";

const CONSOLES: Record<ConsoleKey, string> = {
  president: "Poste de commandement du Président (codes d'invitation + espace membre)",
  secretaire: "Console du Secrétaire (20 onglets : mémoire, gestion, créer un membre)",
  commissaire: "Console du Commissaire aux comptes (caisses, journal, registres, rapports)",
  membre: "Espace Membre (15 onglets : ma vie, la Tontine, ma voix, mon compte)",
};

// v21 — pastilles du bandeau : une par console, cliquable PARTOUT (maquette
// comme application). Dans l'ordre d'affichage du bureau. v26 : la 4ᵉ pastille
// Membre ouvre l'ESPACE MEMBRE — l'espace des membres simples refait à neuf.
const PILLES: Array<{ key: ConsoleKey; label: string; Icon: typeof Crown }> = [
  { key: "president", label: "Président", Icon: Crown },
  { key: "secretaire", label: "Secrétaire", Icon: PenLine },
  { key: "commissaire", label: "Commissaire", Icon: Landmark },
  { key: "membre", label: "Membre", Icon: Users },
];

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

export function MaquetteGate() {
  // Navigateurs 2015 (classe fc-legacy posée par le browser gate) : l'app Lite
  // ES5 reste maîtresse — la maquette React ne s'y affiche pas. v31 : la valeur
  // est réévaluée après le montage — si React monte, MainApp CORRIGE le faux
  // négatif (classe re-posée en fc-modern) et la maquette reprend la main.
  const [legacy, setLegacy] = useState(
    () => typeof document !== "undefined" && /fc-legacy/.test(document.documentElement.className),
  );
  // v27 — L'APPLICATION TELLE QUELLE à l'ouverture : le mode initial est « app »
  // SAUF si l'URL vise déjà une console (#president/…, #secretaire/…).
  const [mode, setMode] = useState<"maquette" | "app">(() =>
    (typeof window !== "undefined" && hashConsoleExplicite()) ? "maquette" : "app",
  );
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

  // v21 — pastille de console : ouvre IMMÉDIATEMENT la console visée (état
  // posé à la main) et pose le hash via history.pushState — le pattern du
  // projet (jamais location.hash= dans un composant, règle React 19).
  // pushState ne déclenche pas « hashchange » : c'est voulu, l'état est déjà
  // posé ici ; le listener reste utile pour les changements EXTERNES du hash
  // (switcher « Mon poste au bureau », URL éditée, bouton retour). Piège
  // hash identique (#president/… sous-page) : rien à faire, l'état est déjà bon.
  // v34 — une console d'un AUTRE poste est refusée (message clair).
  const allerConsole = (c: ConsoleKey): void => {
    if (!consoleAutorisee(c, roleCompte)) {
      toast.error(
        `La page « ${LIBELLE_CONSOLE[c]} » est réservée à ce poste du bureau — vous ne voyez que VOTRE statut.`,
      );
      return;
    }
    setConsole_(c);
    setMode("maquette");
    try {
      const h = (window.location.hash || "").toLowerCase();
      if (!h.startsWith(`#${c}`)) {
        window.history.pushState(null, "", `#${c}`);
      }
    } catch { /* rien */ }
  };

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
      // v20 — switcher « Mon poste au bureau » : quand le hash vise une
      // console, la vue bascule d'elle-même de l'application vers la maquette
      // (le membre qui bascule vers son poste tombe directement dessus).
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

  // v27 — MODE APP : l'application TELLE QUELLE, avec une fine barre discrète
  // (marque seule). v34 — le bouton « Bureau › » (vue de validation) est
  // SUPPRIMÉ : plus aucune porte des consoles depuis l'application réelle —
  // chacun est renvoyé à SON poste par la page qui suit la géolocalisation
  // et, depuis l'accueil, par la carte « Mon poste au bureau ».
  if (mode === "app") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-2 bg-[#2A4A3A] px-3 py-1.5 text-white">
          <Sparkles className="h-3 w-3 shrink-0 text-[#C89F62]" />
          <p className="min-w-0 truncate text-[11px] font-semibold">Famille.Mbeutetsa</p>
        </div>
        <MainApp />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-1 bg-[#2A4A3A] px-1.5 py-1.5 text-white sm:gap-2 sm:px-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C89F62]" />
        <p className="hidden min-w-0 truncate text-[11px] font-semibold sm:block">
          {console_ === "membre"
            ? `Espace Membre v34 — ${CONSOLES[console_]}`
            : `Maquette v34 — ${CONSOLES[console_]}`}
        </p>
        {/* v34 — sélecteur de consoles RÉDUIT AU PROPRE POSTE du compte
            connecté (isolation des statuts) : un président ne voit que la
            pastille Président, un membre simple que la pastille Membre.
            Sans compte connecté (validation de développement), les 4
            consoles restent accessibles. */}
        <nav aria-label="Consoles du bureau" className="fc-scroll flex min-w-0 items-center gap-1 overflow-x-auto">
          {PILLES.filter(({ key }) =>
            roleCompte === "pas-de-compte" || key === CONSOLE_DU_ROLE[roleCompte],
          ).map(({ key, label, Icon }) => {
            const actif = mode === "maquette" && console_ === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => allerConsole(key)}
                aria-pressed={actif}
                title={CONSOLES[key]}
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-all active:scale-95 sm:text-[11px] ${
                  actif
                    ? "bg-[#C89F62] text-[#2B2416] shadow-sm"
                    : "border border-white/25 bg-white/5 text-white/80 hover:border-white/50 hover:bg-white/15 hover:text-white"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setMode("app")}
          className="ml-auto shrink-0 rounded-full bg-[#C89F62] px-2.5 py-1 text-[11px] font-bold text-[#2B2416] transition-all hover:bg-[#b98f50] active:scale-95 sm:px-3"
        >
          <span className="hidden sm:inline">Voir l’app</span>
          <span className="sm:hidden">App</span>
          <span className="sr-only">Revenir à l’application</span>
        </button>
      </div>
      {mode === "maquette" ? (
        console_ === "president" ? <MaquettePresident />
          : console_ === "secretaire" ? <MaquetteSecretaire />
          : console_ === "membre" ? <EspaceMembre voirApp={() => setMode("app")} />
          : <MaquetteCommissaire />
      ) : (
        <MainApp />
      )}
    </div>
  );
}
