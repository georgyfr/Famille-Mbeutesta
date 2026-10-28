"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Notifications push réelles (Web Push / VAPID) — Famille.Mbeutetsa
// Fonctionne en mode complet (API Node /api/push) et en mode démo statique
// (Worker Cloudflare fc-push via NEXT_PUBLIC_PUSH_API).
// ─────────────────────────────────────────────────────────────────────────────

import { api, urlBase64ToUint8Array } from "./fc-client";
import { toast } from "sonner";

export type PushState = "unsupported" | "default" | "granted" | "denied" | "subscribed";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function pushState(): Promise<PushState> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) return "subscribed";
  } catch {
    /* rien */
  }
  return Notification.permission === "granted" ? "granted" : "default";
}

/** Enregistre le Service Worker dès le démarrage (nécessaire pour recevoir les push app fermée). */
export async function initServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* vieux navigateurs : silencieux */
  }
}

/** Écoute les push reçus pour vérification E2E (window.__lastPush). */
export function initPushDebugListener(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const w = window as unknown as { __lastPush?: unknown; __fcPushHook?: boolean };
  if (w.__fcPushHook) return;
  w.__fcPushHook = true;
  try {
    navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
      const data = event.data as { type?: string; data?: unknown } | null;
      if (data && data.type === "fc-push-received") w.__lastPush = data.data;
    });
  } catch {
    /* rien */
  }
}

async function subscribeToPush(): Promise<PushSubscription> {
  const key = await api<{ publicKey: string }>("/api/push/public-key");
  if (!key.ok || !key.publicKey) throw new Error("Clé de notification indisponible.");
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key.publicKey).buffer as ArrayBuffer,
  });
  const saved = await api("/api/push/subscribe", { body: { subscription: sub.toJSON() } });
  if (!saved.ok) throw new Error("Enregistrement de l'abonnement refusé.");
  return sub;
}

/**
 * Active les notifications système (invite du navigateur → abonnement push → enregistrement).
 * À appeler depuis un geste utilisateur pour une UX fiable.
 */
export async function enablePush(opts?: { silent?: boolean }): Promise<boolean> {
  if (!isPushSupported()) {
    if (!opts?.silent)
      toast.info(
        "Ce navigateur ne prend pas en charge les notifications. Sur iPhone, ajoutez d'abord l'app à l'écran d'accueil."
      );
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      if (!opts?.silent)
        toast.warning("Notifications refusées. Réactivez-les dans les réglages du navigateur ou via Ma sécurité.");
      return false;
    }
    await subscribeToPush();
    if (!opts?.silent) toast.success("Notifications activées 🔔 — alertes de la famille même app fermée.");
    return true;
  } catch (e) {
    if (!opts?.silent)
      toast.error(e instanceof Error ? e.message : "Activation des notifications impossible.");
    return false;
  }
}

/** Après l'authentification : nouvel inscrit → invite automatique ; connu → abonnement silencieux si déjà accordé. */
export async function afterAuthPush(isNewUser: boolean): Promise<void> {
  if (!isPushSupported()) return;
  try {
    if (isNewUser) {
      const ok = await enablePush({ silent: true });
      if (ok) {
        toast.success("Notifications activées 🔔 — vous serez alerté comme sur WhatsApp.");
        void welcomePush();
      } else if (Notification.permission === "default") {
        toast.info("Activez les notifications dans « Ma sécurité » pour recevoir les alertes de la famille.");
      }
    } else if (Notification.permission === "granted") {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) await subscribeToPush().catch(() => undefined);
    }
  } catch {
    /* jamais bloquant */
  }
}

/** Push de bienvenue réel (serveur ou Worker) — juste après l'inscription. */
export async function welcomePush(): Promise<void> {
  try {
    await api("/api/push", { body: { action: "welcome" } });
  } catch {
    /* silencieux */
  }
}

/** Notification de vérification — l'utilisateur confirme que ça marche sur son téléphone. */
export async function testPush(): Promise<{ ok: boolean; error?: string }> {
  return api<{ ok: boolean }>("/api/push", { body: { action: "test" } });
}

/* ── Invite d'installation PWA (différée) — utilisée par Ma sécurité ── */

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };
let deferredPrompt: BIPEvent | null = null;

export function setDeferredInstallPrompt(e: Event): void {
  e.preventDefault();
  deferredPrompt = e as BIPEvent;
}

export function hasDeferredInstallPrompt(): boolean {
  return !!deferredPrompt;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "dismissed";
  }
}
