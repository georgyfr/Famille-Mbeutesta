"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/fc-client";
import { installDemoApi } from "@/lib/demo-api";
import { consumedRestore, installStorageMirror } from "@/lib/fc-storage-mirror";
import {
  initPushDebugListener, initServiceWorker, setDeferredInstallPrompt,
} from "@/lib/fc-push";
import { AuthFlow } from "./auth-flow";
import { Dashboard, type SessionData } from "./dashboard";
import { LocationWizard } from "./location-wizard";
import { RoleWizard } from "./role-wizard";
import { loadVousRole } from "./tontine-bureau";
import { CONSOLE_DU_ROLE, naviguerHash } from "./poste-console";
import { purgerAppUneFois } from "./purge-app";
import { FcSpinner } from "./ui";

/** v31 — helpers du gate partagés avec MaquetteGate (voir gate-fix.ts) :
 *  gateMode, forceLegacyDemande, removeLegacyApp, corrigerFauxNegatifLegacy. */
import {
  corrigerFauxNegatifLegacy, forceLegacyDemande, gateMode, removeLegacyApp,
} from "./gate-fix";

/** Écran de lancement — sensation d'application native au démarrage à froid. */
function Splash() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24"
      role="status"
      aria-label="Démarrage de l'application"
    >
      <img
        src="/logo-famille.webp"
        alt="Armoiries de la famille Mbeutetsa"
        className="h-24 w-24 animate-pulse rounded-3xl bg-[#FBF7EA] p-2 shadow-lg ring-1 ring-[#C89F62]/70"
      />
      <div className="text-center">
        <p className="fc-serif text-2xl font-bold text-[#1E4D2B]">Famille.Mbeutetsa</p>
        <p className="text-[13px] text-[#8A9288]">Le registre vivant des grandes familles</p>
      </div>
      <FcSpinner className="mt-2 h-6 w-6 text-[#C89F62]" />
    </div>
  );
}

/** v34 — Le push « Bienvenue <Nom> » renvoie l'application avec
 *  « ?suite=localisation » : le nouveau membre (ou celui qui avait passé
 *  l'étape) clique sa notification → le marqueur « localisation plus tard »
 *  est LEVÉ et le paramètre est retiré de l'URL (une seule fois) — le
 *  wizard de géolocalisation s'ouvre, puis la page du poste suit. */
function suiteLocalisationDemandee(): boolean {
  try {
    const u = new URL(window.location.href);
    const suite = u.searchParams.get("suite");
    if (suite !== "localisation") return false;
    u.searchParams.delete("suite");
    window.history.replaceState(null, "", u.pathname + (u.search || "") + (u.hash || ""));
    return true;
  } catch {
    return false;
  }
}

/** Marqueur « localisation passée » — lié au COMPTE (valeur = uid), pas à
 *  l'appareil : un autre membre qui s'inscrit sur le même téléphone doit avoir
 *  son propre parcours d'accueil (localisation puis rôle). */
function locSkippedActuel(): boolean {
  try {
    // v34 — clic sur la notification « Bienvenue » → la localisation est
    // redemandée même si elle avait été passée (« pour la suite »).
    if (suiteLocalisationDemandee()) {
      localStorage.removeItem("fc_loc_skipped");
      return false;
    }
    const uid = localStorage.getItem("fc_uid") ?? "";
    if (!uid) return false;
    return localStorage.getItem("fc_loc_skipped") === uid;
  } catch {
    return false;
  }
}

export function MainApp() {
  const [loading, setLoading] = useState(true);
  const [splashMin, setSplashMin] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [locSkipped, setLocSkipped] = useState(false);
  // Rôle dans la Tontine : null = pas encore vérifié (évite un flash de l'écran
  // de rôle avant la lecture du stockage local).
  const [roleChoisi, setRoleChoisi] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    const res = await api<{ session: SessionData | null }>("/api/auth/session");
    setSession(res.ok ? res.session : null);
    setLoading(false);
    // Session restaurée automatiquement (le navigateur avait vidé le stockage)
    // → accueil chaleureux au lieu de l'écran d'inscription.
    const restored = consumedRestore();
    if (restored && res.ok && res.session) {
      toast.success("Espace restauré automatiquement — bienvenue à nouveau 👋");
    }
  }, []);

  useEffect(() => {
    // Appareil classé « legacy » par le gate (détection stricte ou #fc-force-legacy).
    if (gateMode() === "legacy") {
      if (forceLegacyDemande()) {
        // Hook de test manuel (#fc-force-legacy) : la version Lite ES5 reste
        // maîtresse — React s'efface devant elle.
        if (rootRef.current) rootRef.current.style.display = "none";
        return;
      }
      // v31 — FAUX NÉGATIF : React s'exécute (on monte) → le navigateur est
      // moderne. On retourne le masque, on repose les classes et on retire le
      // fallback Lite — FINI l'empilement « Bienvenue » au-dessus de la maquette.
      corrigerFauxNegatifLegacy();
    }
    removeLegacyApp();
    let cleanupTimers: () => void = () => undefined;
    // Démarrage : en mode démo (site statique Cloudflare), on RESTAURE d'abord
    // compte + épargnes si le navigateur a vidé le localStorage (WebView
    // WhatsApp/Opéra…), puis on simule les API — l'utilisateur ne doit JAMAIS
    // se réinscrire à chaque clic sur le lien.
    void (async () => {
      // v27 — PURGE ONE-SHOT de l'application réelle : plus AUCUN utilisateur
      // (ni manuel, ni créé par l'IA), plus aucune de leurs données (cotisations,
      // prêts, géolocalisations). La maquette garde TOUS ses utilisateurs. Une
      // seule fois : ensuite le premier utilisateur réel (secrétaire — code
      // FCM-K7M2PV) s'inscrit sur une base vide qui ne se vide plus jamais.
      purgerAppUneFois();
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
        try {
          await installStorageMirror();
          installDemoApi();
        } catch {
          installDemoApi();
        }
      }
      // L'utilisateur a-t-il déjà repoussé l'assistant de localisation (marqueur
      // lié au COMPTE, pas à l'appareil — valeur = uid) ? A-t-il déjà choisi son
      // rôle dans la Tontine ?
      const t0 = setTimeout(() => {
        setLocSkipped(locSkippedActuel());
        setRoleChoisi(loadVousRole() !== null);
      }, 0);

      // Service Worker (push app fermée) + invite d'installation PWA différée (Ma sécurité)
      void initServiceWorker();
      initPushDebugListener();
      window.addEventListener("beforeinstallprompt", setDeferredInstallPrompt);

      const min = setTimeout(() => setSplashMin(false), 700);
      const t = setTimeout(loadSession, 0);
      cleanupTimers = () => {
        clearTimeout(t);
        clearTimeout(min);
        clearTimeout(t0);
        window.removeEventListener("beforeinstallprompt", setDeferredInstallPrompt);
      };
    })();
    return () => cleanupTimers();
  }, [loadSession]);

  const handleReady = useCallback(async () => {
    // Inscription ou connexion : on relit l'état de l'appareil — une NOUVELLE
    // inscription ayant effacé rôle + marqueur « localisation passée »,
    // l'enchaînement est : géolocalisation PUIS rôle dans la Tontine.
    setLocSkipped(locSkippedActuel());
    setRoleChoisi(loadVousRole() !== null);
    await loadSession();
  }, [loadSession]);

  const handleLoggedOut = useCallback(() => {
    setSession(null);
  }, []);

  /** Localisation enregistrée → on nettoie le marqueur « plus tard » et on
   *  recharge la session.
   *  v34 — DEMANDE DE L'ADMINISTRATEUR : « lorsqu'une personne finit son
   *  inscription et sa géolocalisation, la page qui suit est la page propre
   *  au statut qu'il occupe » — si le compte porte déjà SON poste (posé par
   *  le code du bureau), l'application ouvre DIRECTEMENT la console du poste
   *  : président → #president, secrétaire → #secretaire, commissaire →
   *  #commissaire, simple membre → #membre. Si le poste n'est pas encore
   *  posé, l'assistant « Votre rôle » s'affiche d'abord (voir handleRoleDone). */
  const handleLocationSaved = useCallback(async () => {
    try {
      localStorage.removeItem("fc_loc_skipped");
    } catch {
      /* rien */
    }
    setLocSkipped(false);
    await loadSession();
    const role = loadVousRole();
    if (role) naviguerHash(CONSOLE_DU_ROLE[role]);
  }, [loadSession]);

  const skipLocation = useCallback(async () => {
    // Marqueur « localisation plus tard » lié au compte (valeur = uid) : un
    // autre membre qui s'inscrit sur le même appareil doit avoir SON parcours.
    try {
      const uid = localStorage.getItem("fc_uid") ?? "";
      if (uid) localStorage.setItem("fc_loc_skipped", uid);
    } catch {
      /* rien */
    }
    setLocSkipped(true);
    await loadSession();
  }, [loadSession]);

  /** Rôle validé juste après la géolocalisation → on entre dans l'application.
   *  v34 — et la page qui s'ouvre est celle du poste CHOISI (console du bureau
   *  pour les postes à console dédiée, Espace Membre pour les autres). */
  const handleRoleDone = useCallback(() => {
    setRoleChoisi(true);
    const role = loadVousRole();
    if (role) naviguerHash(CONSOLE_DU_ROLE[role]);
  }, []);

  const ready = !loading && !splashMin;
  // Après l'inscription (ou une session sans localisation validée) : l'application DEMANDE
  // où se trouve la personne — détection automatique modifiable puis enregistrement.
  const needsLocation = !!session && !session.user.hasLocation && !locSkipped;
  // JUSTE APRÈS la géolocalisation : le rôle dans la Tontine (président,
  // secrétaire, trésorier…) — il ouvre la page du bureau et les droits associés.
  const needsRole = !!session && !needsLocation && roleChoisi === false;

  return (
    <div ref={rootRef} className="flex flex-1 flex-col">
      {!ready ? (
        <Splash />
      ) : needsLocation && session ? (
        <LocationWizard firstRun onSaved={handleLocationSaved} onSkip={skipLocation} />
      ) : needsRole && session ? (
        <RoleWizard onDone={handleRoleDone} />
      ) : session ? (
        <Dashboard session={session} onLoggedOut={handleLoggedOut} onRefresh={loadSession} />
      ) : (
        <AuthFlow onReady={handleReady} />
      )}
    </div>
  );
}
