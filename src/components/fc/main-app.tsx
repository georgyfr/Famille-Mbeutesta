"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, X } from "lucide-react";
import { api } from "@/lib/fc-client";
import { installDemoApi } from "@/lib/demo-api";
import { AuthFlow } from "./auth-flow";
import { Dashboard, type SessionData } from "./dashboard";
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

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };

/** Écran de lancement — sensation d'application native au démarrage à froid. */
function Splash() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24"
      role="status"
      aria-label="Démarrage de l'application"
    >
      <img
        src="/logo-famille.png"
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

/** Bannière d'installation PWA (Android/Chrome : invite native ; iOS : instructions). */
function InstallBanner({
  isIOS,
  onInstall,
  onDismiss,
}: {
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-30 mx-auto max-w-md px-4"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Installation de l'application"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#C89F62]/60 bg-[#2A4A3A] p-3 text-white shadow-xl">
        <img
          src="/logo-famille.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 rounded-xl bg-[#FBF7EA] p-1"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight">Installer l&apos;application</p>
          <p className="text-[11px] leading-tight text-white/70">
            {isIOS
              ? "Partager ⎋ → « Sur l'écran d'accueil »"
              : "Ajoutez Famille.Mbeutetsa à votre téléphone"}
          </p>
        </div>
        {!isIOS && (
          <button
            onClick={onInstall}
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-[#C89F62] px-3 text-[12px] font-bold text-[#2B2416]"
          >
            <Download className="h-4 w-4" /> Installer
          </button>
        )}
        <button
          onClick={onDismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-full p-2 text-white/70 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MainApp() {
  const [loading, setLoading] = useState(true);
  const [splashMin, setSplashMin] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [isIOS] = useState<boolean>(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    return (
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  });
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    const res = await api<{ session: SessionData | null }>("/api/auth/session");
    setSession(res.ok ? res.session : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Appareil classé « legacy » par le gate (vieux téléphone 2015 ou #fc-force-legacy) :
    // React s'efface devant la version Lite ES5 (style inline sur son propre nœud).
    if (gateMode() === "legacy") {
      if (rootRef.current) rootRef.current.style.display = "none";
      return;
    }
    removeLegacyApp();
    // Mode démo (build statique Cloudflare) : simule les API côté navigateur
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") installDemoApi();

    const min = setTimeout(() => setSplashMin(false), 700);

    let standalone = false;
    let dismissed = false;
    try {
      standalone = window.matchMedia("(display-mode: standalone)").matches;
      dismissed = localStorage.getItem("fc_install_dismissed") === "1";
    } catch {
      /* vieux navigateurs : pas de bannière */
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BIPEvent);
      if (!standalone && !dismissed) setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const t = setTimeout(loadSession, 0);
    return () => {
      clearTimeout(t);
      clearTimeout(min);
      window.removeEventListener("beforeinstallprompt", onBIP);
    };
  }, [loadSession]);

  const handleReady = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const handleLoggedOut = useCallback(() => {
    setSession(null);
  }, []);

  const handleInstall = useCallback(async () => {
    const evt = installEvt;
    setShowInstall(false);
    if (!evt) return;
    try {
      await evt.prompt();
      evt.userChoice
        ?.then((choice) => {
          if (choice.outcome === "accepted") {
            toast.success("Famille.Mbeutetsa ajoutée à votre téléphone 📱");
          }
        })
        .catch(() => undefined);
    } catch {
      toast.error("Installation annulée.");
    }
  }, [installEvt]);

  const handleDismissInstall = useCallback(() => {
    setShowInstall(false);
    try {
      localStorage.setItem("fc_install_dismissed", "1");
    } catch {
      /* rien */
    }
  }, []);

  const ready = !loading && !splashMin;

  return (
    <div ref={rootRef} className="flex flex-1 flex-col">
      {!ready ? (
        <Splash />
      ) : session ? (
        <>
          <Dashboard session={session} onLoggedOut={handleLoggedOut} />
          {showInstall && (installEvt || isIOS) && (
            <InstallBanner isIOS={isIOS} onInstall={handleInstall} onDismiss={handleDismissInstall} />
          )}
        </>
      ) : (
        <AuthFlow onReady={handleReady} />
      )}
    </div>
  );
}
