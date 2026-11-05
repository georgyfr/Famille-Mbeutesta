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
import { FcSpinner } from "./ui";

/** Décision durable du browser gate (layout.tsx) — survit à l'hydratation React,
 *  qui réinitialise le className de <html>. */
function gateMode(): "modern" | "legacy" | "" {
  if (typeof window === "undefined") return "";
  try {
    const g = window.sessionStorage.getItem("fc_gate");
    if (g === "modern" || g === "legacy") return g;
  } catch {
    /* rien */
  }
  return String(document.documentElement.className).indexOf("fc-legacy") !== -1 ? "legacy" : "";
}

/** Retire le fallback Lite (navigateurs 2015) dès que React prend le relais. */
function removeLegacyApp() {
  try {
    const el = document.getElementById("fc-legacy");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch {
    /* rien */
  }
}

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

/** Marqueur « localisation passée » — lié au COMPTE (valeur = uid), pas à
 *  l'appareil : un autre membre qui s'inscrit sur le même téléphone doit avoir
 *  son propre parcours d'accueil (localisation puis rôle). */
function locSkippedActuel(): boolean {
  try {
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
    // Appareil classé « legacy » par le gate (vieux téléphone 2015 ou #fc-force-legacy) :
    // React s'efface devant la version Lite ES5 (style inline sur son propre nœud).
    if (gateMode() === "legacy") {
      if (rootRef.current) rootRef.current.style.display = "none";
      return;
    }
    removeLegacyApp();
    let cleanupTimers: () => void = () => undefined;
    // Démarrage : en mode démo (site statique Cloudflare), on RESTAURE d'abord
    // compte + épargnes si le navigateur a vidé le localStorage (WebView
    // WhatsApp/Opéra…), puis on simule les API — l'utilisateur ne doit JAMAIS
    // se réinscrire à chaque clic sur le lien.
    void (async () => {
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

  /** Localisation enregistrée → on nettoie le marqueur « plus tard » et on recharge la session. */
  const handleLocationSaved = useCallback(async () => {
    try {
      localStorage.removeItem("fc_loc_skipped");
    } catch {
      /* rien */
    }
    setLocSkipped(false);
    await loadSession();
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

  /** Rôle validé juste après la géolocalisation → on entre dans l'application. */
  const handleRoleDone = useCallback(() => {
    setRoleChoisi(true);
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
