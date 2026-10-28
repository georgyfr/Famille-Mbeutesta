"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Mode démo pour le déploiement statique (Cloudflare Pages)
// Intercepte les appels fetch vers /api/* et les simule avec un « serveur »
// persisté dans localStorage. Activé uniquement quand NEXT_PUBLIC_DEMO_MODE=1.
// ─────────────────────────────────────────────────────────────────────────────

type DemoUser = {
  id: string;
  memberId: string;
  fullName: string;
  phone: string;
  role: string;
  pinHash?: string;
};

type DemoMember = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  status: string; // PREINSCRIT | ACTIF
  branch: string;
  branchId: string;
  activeCode: string | null;
  codeExpiresAt: string | null;
  createdAt: string;
};

type DemoDevice = {
  id: string;
  userId: string;
  name: string;
  type: string;
  simulated: boolean;
  hasPasskey: boolean;
  hasPush: boolean;
  lastSeen: string;
  revoked: boolean;
  createdAt: string;
};

type DemoNotification = {
  id: string;
  userId: string;
  univers: string;
  typeCode: string;
  priority: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type DemoLog = { id: string; userId: string | null; action: string; detail: string | null; createdAt: string };

type DemoDB = {
  users: DemoUser[];
  members: DemoMember[];
  devices: DemoDevice[];
  notifications: DemoNotification[];
  logs: DemoLog[];
  prefs: { digestEnabled: boolean; quietStart: number; quietEnd: number; pushEnabled: boolean };
  session: { uid: string; did: string } | null;
  pendingVerify: { phone: string; code: string; verifyToken: string } | null;
  pendingRegister: { phone: string; registerToken: string } | null;
};

const DB_KEY = "fc_demo_db_v1";
const BRANCHES = [
  { id: "br-douala", name: "Branche Douala" },
  { id: "br-yaounde", name: "Branche Yaoundé" },
  { id: "br-bafoussam", name: "Branche Bafoussam" },
  { id: "br-diaspora", name: "Branche Diaspora (Europe)" },
];

function nowISO(): string {
  return new Date().toISOString();
}
function rid(prefix = "d"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function makeCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `FC-${pick(4)}-${pick(4)}`;
}
// Clé VAPID factice (65 octets base64url) — permet au navigateur d'accepter la souscription
function fakeVapid(): string {
  const bytes = new Uint8Array(65);
  bytes[0] = 4;
  for (let i = 1; i < 65; i++) bytes[i] = (i * 7) % 256;
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Normalisation numéro camerounais (miroir du serveur)
function normalizePhone(raw: string): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("00237")) digits = digits.slice(5);
  else if (digits.startsWith("237")) digits = digits.slice(3);
  if (digits.length !== 9 || !/^[62]/.test(digits)) return null;
  return "+237" + digits;
}

function seedDB(): DemoDB {
  const now = nowISO();
  const seedMembers: DemoMember[] = [
    {
      id: "m-patriarche", fullName: "Papa Mbeutetsa", phone: "+237699000001", role: "PATRIARCHE",
      status: "ACTIF", branch: "Branche Douala", branchId: "br-douala", activeCode: null,
      codeExpiresAt: null, createdAt: now,
    },
    {
      id: "m-secretaire", fullName: "Marie Mbeutetsa", phone: "+237699000002", role: "SECRETAIRE",
      status: "ACTIF", branch: "Branche Douala", branchId: "br-douala", activeCode: null,
      codeExpiresAt: null, createdAt: now,
    },
    {
      id: "m-oncle", fullName: "Paul Ekwalla", phone: "+237677000003", role: "CHEF_BRANCHE",
      status: "PREINSCRIT", branch: "Branche Yaoundé", branchId: "br-yaounde",
      activeCode: "FC-DEMO-2026", codeExpiresAt: new Date(Date.now() + 7 * 86400e3).toISOString(), createdAt: now,
    },
  ];
  return {
    users: [
      { id: "u-patriarche", memberId: "m-patriarche", fullName: "Papa Mbeutetsa", phone: "+237699000001", role: "PATRIARCHE" },
      { id: "u-secretaire", memberId: "m-secretaire", fullName: "Marie Mbeutetsa", phone: "+237699000002", role: "SECRETAIRE" },
    ],
    members: seedMembers,
    devices: [],
    notifications: [
      {
        id: rid("n"), userId: "u-secretaire", univers: "U1", typeCode: "FAM_NEWS", priority: "NORMALE",
        title: "Réunion de famille dimanche",
        body: "La réunion mensuelle se tiendra dimanche à 15 h chez le patriarche, quartier Bonamoussadi.",
        read: false, createdAt: now,
      },
    ],
    logs: [
      { id: rid("l"), userId: null, action: "SEED_DEMO", detail: "Base de démonstration initialisée (mode démo Cloudflare)", createdAt: now },
    ],
    prefs: { digestEnabled: true, quietStart: 19, quietEnd: 7, pushEnabled: true },
    session: null,
    pendingVerify: null,
    pendingRegister: null,
  };
}

function db(): DemoDB {
  if (typeof localStorage === "undefined") return seedDB();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
  } catch {
    // base corrompue → re-seed
  }
  const fresh = seedDB();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}
function save(d: DemoDB): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(DB_KEY, JSON.stringify(d));
}

function currentUser(d: DemoDB): DemoUser | null {
  if (!d.session) return null;
  return d.users.find((u) => u.id === d.session!.uid) ?? null;
}

function notifyOne(d: DemoDB, userId: string, n: Partial<DemoNotification> & { title: string; body: string }) {
  d.notifications.unshift({
    id: rid("n"), userId, univers: n.univers ?? "U1", typeCode: n.typeCode ?? "INFO",
    priority: n.priority ?? "NORMALE", title: n.title, body: n.body, read: false, createdAt: nowISO(),
  });
}
function logOne(d: DemoDB, userId: string | null, action: string, detail?: string) {
  d.logs.unshift({ id: rid("l"), userId, action, detail: detail ?? null, createdAt: nowISO() });
}

/* ─────────────────────────── Routeur des API simulées ─────────────────────────── */

async function handleApi(url: string, method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const path = url.split("?")[0];
  const d = db();

  // ── Auth : session ──
  if (path === "/api/auth/session" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: true, session: null };
    const device = d.devices.find((x) => x.id === d.session!.did && !x.revoked) ?? null;
    const member = d.members.find((m) => m.id === user.memberId) ?? null;
    return {
      ok: true,
      session: {
        user: { id: user.id, fullName: user.fullName, phone: user.phone, email: null, role: user.role, hasPin: !!user.pinHash },
        member: member
          ? { id: member.id, branch: member.branch, role: member.role, status: member.status }
          : null,
        device: device ? { id: device.id, name: device.name, type: device.type } : null,
        unreadCount: d.notifications.filter((n) => n.userId === user.id && !n.read).length,
        hasPasskey: false,
      },
    };
  }

  // ── Auth : flux numéro façon WhatsApp ──
  if (path === "/api/auth/phone" && method === "POST") {
    if (body.action === "request") {
      const phone = normalizePhone(String(body.phone ?? ""));
      if (!phone) return { ok: false, error: "Numéro camerounais invalide. Exemple : 6 91 23 45 67 (9 chiffres)." };
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const verifyToken = rid("vt");
      d.pendingVerify = { phone, code, verifyToken };
      const known = d.users.some((u) => u.phone === phone);
      logOne(d, null, "PHONE_VERIFY_REQUEST", `${phone} — compte existant : ${known ? "oui" : "non"}`);
      save(d);
      return { ok: true, verifyToken, demoCode: code, known, phone };
    }
    if (body.action === "verify") {
      const pv = d.pendingVerify;
      if (!pv || pv.verifyToken !== body.verifyToken) {
        return { ok: false, error: "Notification de vérification expirée. Recommencez avec votre numéro." };
      }
      if (String(body.code ?? "") !== pv.code) {
        return { ok: false, error: "Code incorrect. Vérifiez la notification reçue." };
      }
      const user = d.users.find((u) => u.phone === pv.phone);
      if (user) {
        const device: DemoDevice = {
          id: rid("dev"), userId: user.id, name: String(body.deviceName ?? "Appareil").slice(0, 60),
          type: "pwa_web", simulated: false, hasPasskey: false, hasPush: false,
          lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
        };
        d.devices.push(device);
        d.session = { uid: user.id, did: device.id };
        notifyOne(d, user.id, {
          typeCode: "AUTH_PHONE_LOGIN", title: "Connexion par numéro",
          body: `Vous êtes connecté avec le numéro ${pv.phone} sur « ${device.name} ». Si ce n'était pas vous, signalez-le au secrétaire de famille.`,
        });
        logOne(d, user.id, "PHONE_LOGIN", `${pv.phone} — appareil « ${device.name} »`);
        d.pendingVerify = null;
        save(d);
        return { ok: true, registered: true, user: { id: user.id, fullName: user.fullName } };
      }
      const registerToken = rid("reg");
      d.pendingRegister = { phone: pv.phone, registerToken };
      d.pendingVerify = null;
      save(d);
      return { ok: true, registered: false, registerToken, phone: pv.phone };
    }
    if (body.action === "register") {
      const pr = d.pendingRegister;
      if (!pr || pr.registerToken !== body.registerToken) {
        return { ok: false, error: "Vérification expirée. Recommencez avec votre numéro." };
      }
      const firstName = String(body.firstName ?? "").trim();
      const lastName = String(body.lastName ?? "").trim();
      if (firstName.length < 2 || lastName.length < 2) {
        return { ok: false, error: "Indiquez votre prénom et votre nom pour créer votre compte." };
      }
      const fullName = `${firstName} ${lastName}`;
      const existing = d.users.find((u) => u.phone === pr.phone);
      if (existing) {
        const device: DemoDevice = {
          id: rid("dev"), userId: existing.id, name: String(body.deviceName ?? "Appareil").slice(0, 60),
          type: "pwa_web", simulated: false, hasPasskey: false, hasPush: false,
          lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
        };
        d.devices.push(device);
        d.session = { uid: existing.id, did: device.id };
        logOne(d, existing.id, "PHONE_LOGIN", `${pr.phone} — appareil « ${device.name} »`);
        d.pendingRegister = null;
        save(d);
        return { ok: true, user: { id: existing.id, fullName: existing.fullName } };
      }
      const branch = BRANCHES[0];
      const memberId = rid("m");
      d.members.push({
        id: memberId, fullName, phone: pr.phone, role: "ADULTE", status: "ACTIF",
        branch: branch.name, branchId: branch.id, activeCode: null, codeExpiresAt: null, createdAt: nowISO(),
      });
      const user: DemoUser = { id: rid("u"), memberId, fullName, phone: pr.phone, role: "ADULTE" };
      d.users.push(user);
      const device: DemoDevice = {
        id: rid("dev"), userId: user.id, name: String(body.deviceName ?? "Appareil").slice(0, 60),
        type: "pwa_web", simulated: false, hasPasskey: false, hasPush: false,
        lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
      };
      d.devices.push(device);
      d.session = { uid: user.id, did: device.id };
      notifyOne(d, user.id, {
        typeCode: "AUTH_WELCOME", title: "Bienvenue dans Famille.Mbeutetsa 🌳",
        body: `Votre compte est actif (${branch.name}). Votre numéro de téléphone est votre identifiant : la prochaine fois, l'application s'ouvrira directement sur cet appareil.`,
      });
      // Notifier les « admins » de démo
      d.users
        .filter((u) => ["SECRETAIRE", "PATRIARCHE", "CHEF_BRANCHE", "CONSEIL"].includes(u.role))
        .forEach((a) =>
          notifyOne(d, a.id, {
            typeCode: "AUTH_REGISTERED_ADMIN", title: "Nouveau membre inscrit",
            body: `${fullName} (${branch.name}) vient de s'inscrire avec le numéro ${pr.phone}.`,
          })
        );
      logOne(d, user.id, "REGISTERED", `${fullName} — ${pr.phone} — appareil « ${device.name} »`);
      d.pendingRegister = null;
      save(d);
      return { ok: true, user: { id: user.id, fullName } };
    }
  }

  // ── Auth : logout ──
  if (path === "/api/auth/logout" && method === "POST") {
    if (d.session) logOne(d, d.session.uid, "LOGOUT", "Session fermée (mode démo)");
    d.session = null;
    save(d);
    return { ok: true };
  }

  // ── Push ──
  if (path === "/api/push" && method === "GET") {
    return { ok: true, publicKey: fakeVapid() };
  }
  if (path === "/api/push" && method === "POST") {
    const user = currentUser(d);
    if (body.action === "subscribe") {
      if (d.session) {
        const dev = d.devices.find((x) => x.id === d.session!.did);
        if (dev) dev.hasPush = true;
        save(d);
      }
      return { ok: true };
    }
    if (body.action === "test" && user) {
      notifyOne(d, user.id, {
        typeCode: "PUSH_TEST", priority: "INFO", title: "Notification de test envoyée",
        body: "Si les notifications sont autorisées, une bulle apparaît en haut de votre écran.",
      });
      logOne(d, user.id, "PUSH_TEST_SENT", "Push de test (mode démo)");
      save(d);
      return { ok: true };
    }
    return { ok: true };
  }

  // ── Notifications ──
  if (path === "/api/notifications") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    if (method === "GET") {
      const mine = d.notifications
        .filter((n) => n.userId === user.id)
        .map((n) => ({ ...n }));
      return { ok: true, notifications: mine, prefs: d.prefs };
    }
    if (method === "POST") {
      if (body.action === "read") {
        const n = d.notifications.find((x) => x.id === body.id);
        if (n) n.read = true;
        save(d);
        return { ok: true };
      }
      if (body.action === "read-all") {
        let count = 0;
        d.notifications.forEach((n) => {
          if (n.userId === user.id && !n.read) {
            n.read = true;
            count++;
          }
        });
        save(d);
        return { ok: true, readAll: count };
      }
      if (body.action === "prefs") {
        d.prefs = { ...d.prefs, digestEnabled: !!body.digestEnabled };
        save(d);
        return { ok: true, prefs: d.prefs };
      }
    }
  }

  // ── Appareils ──
  if (path === "/api/devices" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    return {
      ok: true,
      devices: d.devices
        .filter((x) => x.userId === user.id)
        .map((x) => ({
          id: x.id, name: x.name, type: x.type, simulated: x.simulated, hasPasskey: x.hasPasskey,
          hasPush: x.hasPush, lastSeen: x.lastSeen, revoked: x.revoked,
          current: !!d.session && x.id === d.session.did, createdAt: x.createdAt,
        })),
    };
  }
  if (path === "/api/devices" && method === "POST" && body.action === "revoke") {
    const dev = d.devices.find((x) => x.id === body.id);
    if (dev) {
      dev.revoked = true;
      logOne(d, dev.userId, "DEVICE_REVOKED", `Appareil « ${dev.name} » révoqué`);
      save(d);
    }
    return { ok: true };
  }

  // ── Journal de sécurité ──
  if (path === "/api/security-log" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    return {
      ok: true,
      logs: d.logs.filter((l) => l.userId === user.id || l.userId === null).slice(0, 50),
    };
  }

  // ── Secrétariat (admin) ──
  if (path === "/api/admin/members") {
    if (method === "GET") {
      return { ok: true, members: d.members, branches: BRANCHES };
    }
    if (method === "POST") {
      const fullName = String(body.fullName ?? "").trim();
      if (fullName.length < 3) return { ok: false, error: "Nom complet requis." };
      const branch = BRANCHES.find((b) => b.id === body.branchId) ?? BRANCHES[0];
      const code = makeCode();
      d.members.push({
        id: rid("m"), fullName, phone: String(body.phone ?? ""), email: String(body.email ?? ""),
        role: String(body.role ?? "ADULTE"), status: "PREINSCRIT", branch: branch.name, branchId: branch.id,
        activeCode: code, codeExpiresAt: new Date(Date.now() + 7 * 86400e3).toISOString(), createdAt: nowISO(),
      });
      logOne(d, null, "MEMBER_PREREGISTERED", `${fullName} (${branch.name}) — code ${code}`);
      save(d);
      return { ok: true, member: { fullName }, accessCode: { code } };
    }
    if (method === "PUT") {
      const m = d.members.find((x) => x.id === body.memberId);
      if (!m) return { ok: false, error: "Membre introuvable." };
      const code = makeCode();
      m.activeCode = code;
      m.codeExpiresAt = new Date(Date.now() + 7 * 86400e3).toISOString();
      logOne(d, null, "CODE_REGENERATED", `Nouveau code pour ${m.fullName}`);
      save(d);
      return { ok: true, accessCode: { code } };
    }
  }

  return { ok: false, error: `Route démo non simulée : ${method} ${path}` };
}

/* ─────────────────────────── Installation ─────────────────────────── */

declare global {
  interface Window {
    __FC_DEMO_API__?: boolean;
  }
}

export function installDemoApi(): void {
  if (typeof window === "undefined" || window.__FC_DEMO_API__) return;
  window.__FC_DEMO_API__ = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.startsWith("/api/")) return originalFetch(input as RequestInfo, init);
    const method = (init?.method || (init?.body ? "POST" : "GET")).toUpperCase();
    let body: Record<string, unknown> = {};
    try {
      if (init?.body) body = JSON.parse(String(init.body));
    } catch {
      body = {};
    }
    const data = await handleApi(url, method, body);
    return new Response(JSON.stringify(data), {
      status: data.ok === false ? 400 : 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
