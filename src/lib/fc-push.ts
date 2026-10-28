"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Notifications push réelles (Web Push / VAPID) — Famille.Mbeutetsa
// Fonctionne en mode complet (API Node /api/push) et en mode démo statique
// (passerelle same-origin _worker.js sur pages.dev — le téléphone ne parle
// qu'à notre domaine, jamais à workers.dev).
// ─────────────────────────────────────────────────────────────────────────────

import { api, deviceName, urlBase64ToUint8Array } from "./fc-client";
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

/* ── Clé VAPID du serveur + auto-réparation de l'abonnement ── */

async function getServerPublicKey(): Promise<string> {
  const key = await api<{ publicKey: string }>("/api/push/public-key");
  if (!key.ok || !key.publicKey) throw new Error("Clé de notification indisponible.");
  return key.publicKey;
}

function bytesToB64u(b: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Clé publique avec laquelle l'abonnement actuel a été créé (si le navigateur l'expose). */
function subscriptionAppKey(sub: PushSubscription): string {
  try {
    const k = sub.options && sub.options.applicationServerKey;
    if (!k) return "";
    return bytesToB64u(new Uint8Array(k as ArrayBufferLike & ArrayBuffer));
  } catch {
    return "";
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

async function subscribeToPush(): Promise<PushSubscription> {
  const serverKey = await getServerPublicKey();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  // Auto-réparation : abonnement lié à une AUTRE clé (ex : clé factice d'un ancien
  // déploiement, ou serveur changé) → on désabonne puis réabonne avec la clé actuelle.
  if (sub) {
    let usedKey = subscriptionAppKey(sub);
    if (!usedKey) {
      try {
        usedKey = localStorage.getItem("fc_push_pkey") || "";
      } catch {
        usedKey = "";
      }
    }
    if (usedKey && usedKey !== serverKey) {
      await sub.unsubscribe().catch(() => undefined);
      sub = null;
    }
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(serverKey).buffer as ArrayBuffer,
    });
  }
  try {
    localStorage.setItem("fc_push_pkey", serverKey);
  } catch {
    /* rien */
  }

  const saved = await api("/api/push/subscribe", {
    body: {
      subscription: sub.toJSON(),
      phone: (() => {
        try {
          return localStorage.getItem("fc_phone") || undefined;
        } catch {
          return undefined;
        }
      })(),
      deviceName: deviceName(),
    },
  });
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
      const sub = await currentSubscription();
      if (!sub) await subscribeToPush().catch(() => undefined);
    }
  } catch {
    /* jamais bloquant */
  }
}

/** Push de bienvenue réel — juste après l'inscription. */
export async function welcomePush(): Promise<void> {
  try {
    const subscription = await currentSubscription();
    await api("/api/push", { body: { action: "welcome", subscription: subscription ? subscription.toJSON() : undefined } });
  } catch {
    /* silencieux */
  }
}

/** Notification de vérification — l'utilisateur confirme que ça sonne sur son téléphone. */
export async function testPush(): Promise<{ ok: boolean; error?: string }> {
  const subscription = await currentSubscription();
  if (!subscription) {
    return { ok: false, error: "Aucun abonnement push sur cet appareil — activez les notifications d'abord." };
  }
  return api<{ ok: boolean }>("/api/push", {
    body: { action: "test", subscription: subscription.toJSON() },
  });
}

/**
 * Diffuse un événement familial : la notification système part sur TOUS les
 * téléphones abonnés (son + vibration, même écran verrouillé) et reste
 * consultable dans le centre d'alertes. Jamais bloquant.
 */
export async function familyNotify(opts: { title: string; body: string; tag?: string }): Promise<void> {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
  } catch {
    /* silencieux — l'action locale reste toujours réussie */
  }
}

/**
 * Repli in-app : polling léger des événements récents (60 s) — pour les
 * navigateurs sans Web Push (iOS < 16.4, vieux WebView) et pour afficher
 * aussi un toast quand l'app est ouverte au premier plan.
 * Renvoie une fonction d'arrêt.
 */
export function startInAppNotificationPolling(onEvent: (n: { title: string; body: string }) => void): () => void {
  let last = Date.now() - 120000;
  const tick = async () => {
    try {
      const res = await fetch(`/api/notify/recent?since=${last}`, { cache: "no-store" });
      const j = (await res.json()) as { ok?: boolean; notifications?: { title: string; body: string }[]; now?: number };
      if (j && j.ok) {
        last = j.now || Date.now();
        (j.notifications || []).slice(0, 3).forEach(onEvent);
      }
    } catch {
      /* silencieux */
    }
  };
  const iv = setInterval(tick, 60000);
  void tick();
  return () => clearInterval(iv);
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
