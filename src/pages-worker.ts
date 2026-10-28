// ─────────────────────────────────────────────────────────────────────────────
// Famille.Mbeutetsa — _worker.js pour Cloudflare Pages (mode avancé)
//
// Rôle : servir les endpoints de notifications push SUR LE MÊME DOMAINE que
// l'application (famille-mbeutetsa.pages.dev). Avant, le téléphone devait
// joindre https://fc-push.famille-mbeutetsa.workers.dev — un domaine .workers.dev
// souvent bloqué ou instable sur les réseaux mobiles camerounais (MTN/Orange).
// Désormais :
//   téléphone → pages.dev (même origine, toujours accessible)
//             → ce worker → (réseau interne Cloudflare) → moteur fc-push
//             → serveurs FCM/push → notification système sur le téléphone 🔔
//
// Les clés VAPID et le chiffrement restent dans le moteur fc-push existant :
// les abonnements déjà enregistrés dans le KV restent 100 % valables.
//
// Routes ajoutées (JSON { ok, ... }) :
//   GET  /api/push/public-key       → clé VAPID (via moteur)
//   POST /api/push/subscribe        → enregistre l'abonnement dans le KV
//   POST /api/push/unsubscribe      → supprime l'abonnement du KV
//   POST /api/push                  → { action: "test"|"welcome", subscription } → envoi réel
//   GET  /api/push/subscriptions    → [développeur] liste des appareils abonnés
//   POST /api/push/broadcast        → [développeur] diffuse à toute la famille
//   POST /api/notify                → événement familial → stockage + diffusion
//   GET  /api/notify/recent?since=  → repli in-app (polling) des événements récents
// Tout le reste est servi comme fichiers statiques (env.ASSETS).
// ─────────────────────────────────────────────────────────────────────────────

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(opts?: { prefix?: string; cursor?: string }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  PUSH_SUBS: KVLike;
  // URL du moteur d'envoi (secrets VAPID + WebCrypto). Défaut : worker fc-push.
  PUSH_ENGINE_URL?: string;
  // SHA-256 hex du code développeur (contrôle d'accès aux routes sensibles)
  DEV_TOKEN_SHA?: string;
}

type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
type StoredSub = PushSub & { phone?: string; device?: string; added?: string };
type NtfItem = { id: string; title: string; body: string; tag?: string; url?: string; at: number };

const ENGINE = (env: Env) => (env.PUSH_ENGINE_URL || "https://fc-push.famille-mbeutetsa.workers.dev").replace(/\/$/, "");
const SITE_ORIGIN = "https://famille-mbeutetsa.pages.dev";
const NTF_RECENT_KEY = "ntf:recent";
const NTF_MAX = 30;

/* ── utilitaires ── */

async function sha256hex(data: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)));
  let out = "";
  for (const b of h) out += b.toString(16).padStart(2, "0");
  return out;
}

function subKey(endpoint: string): Promise<string> {
  return sha256hex(endpoint);
}

const json = (data: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Appel vers le moteur push (réseau interne Cloudflare, jamais bloqué par les FAI). */
async function engineCall(env: Env, path: string, body?: Record<string, unknown>): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${ENGINE(env)}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: SITE_ORIGIN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* réponse non JSON */
  }
  return { status: res.status, data };
}

/** Vérification du jeton développeur (X-Dev-Token = sha256 hex du code secret). */
function isDev(req: Request, env: Env): boolean {
  const token = req.headers.get("X-Dev-Token") || "";
  const expected = env.DEV_TOKEN_SHA || "";
  return !!expected && token.length === 64 && token === expected;
}

function isDevTokenSet(env: Env): boolean {
  return !!env.DEV_TOKEN_SHA && env.DEV_TOKEN_SHA.length === 64;
}

/* ── événements récents (repli in-app) ── */

async function ntfRecent(env: Env): Promise<NtfItem[]> {
  const raw = await env.PUSH_SUBS.get(NTF_RECENT_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as NtfItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function ntfAppend(env: Env, item: NtfItem): Promise<NtfItem[]> {
  const list = (await ntfRecent(env)).filter((x) => x.id !== item.id);
  list.unshift(item);
  const trimmed = list.slice(0, NTF_MAX);
  await env.PUSH_SUBS.put(NTF_RECENT_KEY, JSON.stringify(trimmed), { expirationTtl: 14 * 86400 });
  return trimmed;
}

/* ── routeur ── */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (!path.startsWith("/api/")) {
      // Fichiers statiques (site Next exporté, APK, SW, manifest…)
      return env.ASSETS.fetch(request);
    }

    try {
      /* ── Clé publique VAPID (relayée du moteur, en cache 10 min côté edge) ── */
      if (path === "/api/push/public-key" && method === "GET") {
        const r = await engineCall(env, "/public-key");
        if (typeof r.data.publicKey === "string" && r.data.publicKey) {
          return json({ ok: true, publicKey: r.data.publicKey });
        }
        return json({ ok: false, error: "Clé VAPID indisponible (moteur push)." }, 502);
      }

      /* ── Abonnement → KV (même format que le moteur fc-push) ── */
      if (path === "/api/push/subscribe" && method === "POST") {
        const b = await readBody(request);
        const s = b.subscription as PushSub | undefined;
        if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
          return json({ ok: false, error: "Abonnement invalide." }, 400);
        }
        const rec: StoredSub = {
          endpoint: s.endpoint,
          keys: s.keys,
          phone: typeof b.phone === "string" ? b.phone.slice(0, 24) : undefined,
          device: typeof b.deviceName === "string" ? b.deviceName.slice(0, 60) : undefined,
          added: new Date().toISOString(),
        };
        await env.PUSH_SUBS.put(await subKey(s.endpoint), JSON.stringify(rec));
        return json({ ok: true, subscribed: true });
      }

      /* ── Désabonnement ── */
      if (path === "/api/push/unsubscribe" && method === "POST") {
        const b = await readBody(request);
        const endpoint = String(b.endpoint || "");
        if (!endpoint) return json({ ok: false, error: "Endpoint manquant." }, 400);
        await env.PUSH_SUBS.delete(await subKey(endpoint));
        return json({ ok: true });
      }

      /* ── Test / bienvenue : envoi réel vers L'ABONNEMENT DU DEMANDEUR ── */
      if (path === "/api/push" && method === "POST") {
        const b = await readBody(request);
        const action = String(b.action || "test");
        const s = b.subscription as PushSub | undefined;
        if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
          return json({ ok: false, error: "Aucun abonnement push sur cet appareil. Activez les notifications d'abord." }, 400);
        }
        const payload = {
          subscription: s,
          title: action === "welcome" ? "🌳 Bienvenue dans la famille !" : "🔔 Famille.Mbeutetsa — test réussi",
          body:
            action === "welcome"
              ? String(b.body || "Félicitations — les alertes de la famille vous parviendront ici, même l'application fermée.")
              : String(b.body || "Les notifications push fonctionnent sur ce téléphone. Vous ne manquerez plus aucun événement familial."),
          url: "/",
          tag: action === "welcome" ? "fc-welcome" : "fc-push-test",
        };
        const r = await engineCall(env, "/send-one", payload);
        if (r.data.ok === true) {
          return json({ ok: true, sent: true });
        }
        if (r.status === 410 || r.status === 404) {
          await env.PUSH_SUBS.delete(await subKey(s.endpoint));
          return json({ ok: false, error: "Abonnement expiré côté navigateur. Réactivez les notifications." }, 410);
        }
        return json({ ok: false, error: `Envoi impossible (service push HTTP ${r.status}).` }, 502);
      }

      /* ── Événement familial : stocker + diffuser à toute la famille ── */
      if (path === "/api/notify" && method === "POST") {
        const b = await readBody(request);
        const title = String(b.title || "").trim().slice(0, 120);
        const body = String(b.body || "").trim().slice(0, 240);
        if (!title) return json({ ok: false, error: "Titre requis." }, 400);
        const tag = String(b.tag || "famille").slice(0, 60);
        const urlPath = String(b.url || "/").slice(0, 200);

        // Anti-doublon : 1 événement identique max toutes les 30 s (hash du contenu)
        const dedupeKey = `ntf:dedupe:${await sha256hex(`${title}|${body}`)}`;
        if (await env.PUSH_SUBS.get(dedupeKey)) {
          return json({ ok: true, sent: false, deduped: true });
        }
        await env.PUSH_SUBS.put(dedupeKey, "1", { expirationTtl: 60 });

        const item: NtfItem = { id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title, body, tag, url: urlPath, at: Date.now() };
        await ntfAppend(env, item);

        let sent = 0;
        let failed = 0;
        if (isDevTokenSet(env)) {
          const adminToken = await env.PUSH_SUBS.get("admin:token");
          if (adminToken) {
            const r = await engineCall(env, "/send", { token: adminToken, title, body, url: urlPath });
            if (typeof r.data.sent === "number") sent = r.data.sent;
            if (typeof r.data.failed === "number") failed = r.data.failed;
          }
        }
        return json({ ok: true, sent, failed, id: item.id });
      }

      /* ── Repli in-app : événements récents (polling navigateur) ── */
      if (path === "/api/notify/recent" && method === "GET") {
        const since = parseInt(url.searchParams.get("since") || "0", 10) || 0;
        const list = (await ntfRecent(env)).filter((x) => x.at > since);
        return json({ ok: true, notifications: list, now: Date.now() });
      }

      /* ── Développeur : liste des appareils abonnés ── */
      if (path === "/api/push/subscriptions" && method === "GET") {
        if (!isDevTokenSet(env)) return json({ ok: false, error: "Accès développeur non configuré côté serveur." }, 500);
        if (!isDev(request, env)) return json({ ok: false, error: "Code développeur invalide." }, 401);
        const out: { phone?: string; device?: string; added?: string; endpoint?: string }[] = [];
        let cursor = "";
        do {
          const list = await env.PUSH_SUBS.list({ cursor: cursor || undefined });
          for (const k of list.keys) {
            if (!/^[0-9a-f]{64}$/.test(k.name)) continue; // uniquement les clés d'abonnement (sha256 d'endpoint)
            const raw = await env.PUSH_SUBS.get(k.name);
            if (!raw) continue;
            try {
              const rec = JSON.parse(raw) as StoredSub;
              out.push({
                phone: rec.phone,
                device: rec.device,
                added: rec.added,
                endpoint: rec.endpoint.replace(/^https:\/\/[^/]+\//, "").slice(0, 28) + "…",
              });
            } catch {
              /* ignore */
            }
          }
          cursor = list.list_complete ? "" : (list.cursor as string);
        } while (cursor);
        return json({ ok: true, devices: out });
      }

      /* ── Développeur : diffusion manuelle à toute la famille ── */
      if (path === "/api/push/broadcast" && method === "POST") {
        if (!isDevTokenSet(env)) return json({ ok: false, error: "Accès développeur non configuré côté serveur." }, 500);
        if (!isDev(request, env)) return json({ ok: false, error: "Code développeur invalide." }, 401);
        const b = await readBody(request);
        const title = String(b.title || "Annonce de la famille").slice(0, 120);
        const body = String(b.body || "").slice(0, 240);
        const adminToken = await env.PUSH_SUBS.get("admin:token");
        if (!adminToken) return json({ ok: false, error: "Jeton de diffusion absent du KV (admin:token)." }, 500);
        const item: NtfItem = { id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, title, body, tag: "fc-broadcast", url: "/", at: Date.now() };
        await ntfAppend(env, item);
        const r = await engineCall(env, "/send", { token: adminToken, title, body, url: "/" });
        return json({ ok: r.data.ok === true, sent: r.data.sent ?? 0, failed: r.data.failed ?? 0, id: item.id });
      }

      // Route API non gérée par le worker → réponse propre (les routes Next n'existent pas en statique)
      return json({ ok: false, error: `Route API indisponible en mode démo : ${method} ${path}` }, 404);
    } catch (e) {
      return json({ ok: false, error: `Erreur interne: ${String(e).slice(0, 180)}` }, 500);
    }
  },
};
