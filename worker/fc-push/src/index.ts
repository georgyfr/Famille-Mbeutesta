// ─────────────────────────────────────────────────────────────────────────────
// Famille.Mbeutetsa — Worker « fc-push » : serveur Web Push 100 % gratuit
// - Stockage des abonnements push dans KV (gratuit)
// - Envoi Web Push standard (VAPID ES256 + chiffrement aes128gcm RFC 8291)
//   via WebCrypto — aucun paquet npm, aucun service tiers payant.
// ─────────────────────────────────────────────────────────────────────────────

export interface Env {
  PUSH_SUBS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
}

type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type StoredSub = PushSub & { phone?: string; added?: string };

const ALLOWED_ORIGINS = [
  "https://famille-mbeutetsa.pages.dev",
  "http://localhost:3000",
];

const SUBJECT = "mailto:contact@familleconnect.app";

/* ── base64url ── */
function b64uToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64u(b: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}
async function sha256hex(data: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  let out = "";
  for (const b of h) out += b.toString(16).padStart(2, "0");
  return out;
}

/* ── HKDF (extract+expand en une primitive WebCrypto) ── */
async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8)
  );
}

/* ── VAPID : JWT ES256 signé avec la clé du serveur ── */
function jwkFrom(pubB64u: string, privB64u: string): JsonWebKey {
  const pub = b64uToBytes(pubB64u);
  const d = b64uToBytes(privB64u);
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: bytesToB64u(d),
  };
}

async function vapidJwt(audience: string, env: Env): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const claims = { aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: SUBJECT };
  const h = bytesToB64u(new TextEncoder().encode(JSON.stringify(header)));
  const p = bytesToB64u(new TextEncoder().encode(JSON.stringify(claims)));
  const input = `${h}.${p}`;
  const jwk = jwkFrom(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(input))
  );
  return `${input}.${bytesToB64u(sig)}`;
}

/* ── Chiffrement du message (aes128gcm, RFC 8291 + RFC 8188) ── */
async function encryptFor(sub: PushSub, payloadJson: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const clientPub = b64uToBytes(sub.keys.p256dh);
  const authSecret = b64uToBytes(sub.keys.auth);

  const server = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", server.publicKey));
  const clientKey = await crypto.subtle.importKey("raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedBits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, server.privateKey, 256)
  );

  const keyInfo = concat(enc.encode("WebPush: info"), new Uint8Array([0]), clientPub, serverPubRaw);
  const ikm = await hkdf(sharedBits, authSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, concat(enc.encode("Content-Encoding: aes128gcm"), new Uint8Array([0])), 16);
  const nonce = await hkdf(ikm, salt, concat(enc.encode("Content-Encoding: nonce"), new Uint8Array([0])), 12);

  // plaintext = charge utile || délimiteur 0x02 (padding nul)
  const plaintext = concat(enc.encode(payloadJson), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, plaintext)
  );

  // En-tête aes128gcm : salt(16) || rs(4, 4096) || idlen(1) || clé publique serveur(65)
  const header = new Uint8Array(21 + serverPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = serverPubRaw.length;
  header.set(serverPubRaw, 21);
  return concat(header, ciphertext);
}

/* ── Envoi d'une notification à un abonnement ── */
async function sendOne(env: Env, sub: PushSub, payload: Record<string, unknown>): Promise<number> {
  const audience = new URL(sub.endpoint).origin;
  const jwt = await vapidJwt(audience, env);
  const body = await encryptFor(sub, JSON.stringify(payload));
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: "604800",
      Urgency: payload.critical ? "high" : "normal",
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
    },
    body: body as unknown as BodyInit,
  });
  return res.status;
}

function subKey(endpoint: string): Promise<string> {
  return sha256hex(new TextEncoder().encode(endpoint));
}

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...extra } });

/* ── Routeur ── */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    const corsH = cors(origin);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsH });

    const url = new URL(req.url);
    const path = url.pathname;
    try {
      // Clé publique VAPID (le navigateur s'abonne avec)
      if (path === "/public-key" && req.method === "GET") {
        return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, corsH);
      }

      // Abonnement → KV
      if (path === "/subscribe" && req.method === "POST") {
        const b = (await req.json().catch(() => ({}))) as { subscription?: PushSub; phone?: string };
        const s = b.subscription;
        if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
          return json({ ok: false, error: "Abonnement invalide." }, 400, corsH);
        }
        const rec: StoredSub = { endpoint: s.endpoint, keys: s.keys, phone: b.phone, added: new Date().toISOString() };
        await env.PUSH_SUBS.put(await subKey(s.endpoint), JSON.stringify(rec));
        return json({ ok: true }, 200, corsH);
      }

      // Envoi à UN abonnement (celui que possède le client — utilisé par la démo statique)
      if (path === "/send-one" && req.method === "POST") {
        const ip = req.headers.get("CF-Connecting-IP") || "inconnu";
        const minute = Math.floor(Date.now() / 60000);
        const rlKey = `rl:${ip}:${minute}`;
        const count = parseInt((await env.PUSH_SUBS.get(rlKey)) || "0", 10);
        if (count > 10) {
          return json({ ok: false, error: "Trop de demandes, réessayez dans une minute." }, 429, corsH);
        }
        await env.PUSH_SUBS.put(rlKey, String(count + 1), { expirationTtl: 120 });

        const b = (await req.json().catch(() => ({}))) as { subscription?: PushSub; title?: string; body?: string; url?: string; tag?: string };
        const s = b.subscription;
        if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) {
          return json({ ok: false, error: "Abonnement manquant." }, 400, corsH);
        }
        const payload = {
          title: String(b.title || "Famille.Mbeutetsa").slice(0, 120),
          body: String(b.body || "").slice(0, 240),
          url: String(b.url || "/").slice(0, 200),
          tag: String(b.tag || "familleconnect").slice(0, 60),
        };
        const status = await sendOne(env, s, payload);
        if (status === 201 || status === 200) {
          return json({ ok: true, sent: true }, 200, corsH);
        }
        if (status === 404 || status === 410) {
          await env.PUSH_SUBS.delete(await subKey(s.endpoint));
          return json({ ok: false, error: "Abonnement expiré — réactivez les notifications." }, 410, corsH);
        }
        return json({ ok: false, error: `Service de push: HTTP ${status}` }, 502, corsH);
      }

      // Diffusion à tous (admin, protégé par token) — futur : annonces du conseil
      if (path === "/send" && req.method === "POST") {
        const b = (await req.json().catch(() => ({}))) as { token?: string; title?: string; body?: string; url?: string };
        const expected = await env.PUSH_SUBS.get("admin:token");
        if (!expected || b.token !== expected) {
          return json({ ok: false, error: "Non autorisé." }, 401, corsH);
        }
        let sent = 0;
        let failed = 0;
        let cursor = "";
        do {
          const list = await env.PUSH_SUBS.list({ cursor, prefix: "" });
          for (const k of list.keys) {
            if (k.name.startsWith("rl:") || k.name.startsWith("admin:")) continue;
            const raw = await env.PUSH_SUBS.get(k.name);
            if (!raw) continue;
            try {
              const st = await sendOne(env, JSON.parse(raw) as StoredSub, {
                title: String(b.title || "Famille.Mbeutetsa"),
                body: String(b.body || ""),
                url: String(b.url || "/"),
              });
              if (st === 201 || st === 200) sent++;
              else {
                failed++;
                if (st === 404 || st === 410) await env.PUSH_SUBS.delete(k.name);
              }
            } catch {
              failed++;
            }
          }
          cursor = list.list_complete ? "" : (list.cursor as string);
        } while (cursor);
        return json({ ok: true, sent, failed }, 200, corsH);
      }

      return json({ ok: false, error: "Route inconnue." }, 404, corsH);
    } catch (e) {
      return json({ ok: false, error: `Erreur interne: ${String(e).slice(0, 200)}` }, 500, corsH);
    }
  },
};
