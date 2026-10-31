"use client";

import { normalizePhoneIntl, phoneErrorHint } from "./fc-phone";

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
  identifier?: string; // identifiant texte (connexion sans numéro)
  passwordHash?: string; // sha$salt$hash (WebCrypto, mode démo)
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
  // Localisation réelle (rencontres familiales & GPS)
  country?: string | null;
  region?: string | null;
  department?: string | null;
  city?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  locationSource?: string | null;
  locationConfirmed?: boolean;
  locationUpdatedAt?: string | null;
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
  pushSubscription?: string | null;
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

const DB_KEY = "fc_demo_db_v2"; // v2 : purge des anciennes données fictives
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

// Normalisation téléphone multi-pays (miroir du serveur, E.164 + rétro-compat CM)
function normalizePhone(raw: string, country?: unknown): string | null {
  return normalizePhoneIntl(raw, country);
}

// Identifiant : 3 à 30 caractères — lettres, chiffres, point, tiret, underscore
function normalizeIdentifier(raw: string): string | null {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(id)) return null;
  return id;
}

// Hash mot de passe (mode démo) : SHA-256 salé via WebCrypto, format sha$salt$hash
async function hashPassword(password: string, salt?: string): Promise<string> {
  const s = salt || Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const msg = new TextEncoder().encode(`fc:${s}:${password}`);
  try {
    const digest = await crypto.subtle.digest("SHA-256", msg);
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    return `sha$${s}$${hex}`;
  } catch {
    // Repli sans WebCrypto (rare) — FNV-1a 32 bits salé
    let h = 2166136261;
    const str = `fc:${s}:${password}`;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `fnv$${s}$${(h >>> 0).toString(16)}`;
  }
}
function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  // Vérification SYNCHRONE : recalcul du même schéma que hashPassword
  const str = `fc:${salt}:${password}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Le hash WebCrypto (64 hex) ne peut PAS être recalculé en synchrone :
  // on stocke donc TOUJOURS le hash via hashPassword (async) et on vérifie
  // en re-hasant de manière asynchrone côté appelant (checkPassword).
  return hash.length === 64 ? false : (h >>> 0).toString(16) === hash;
}
async function checkPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  if (hash.length === 64) {
    const recomputed = await hashPassword(password, salt);
    return recomputed === stored;
  }
  return verifyPassword(password, stored);
}

function seedDB(): DemoDB {
  const now = nowISO();
  // ── AUCUNE donnée fictive ──
  // La base démarre VIDE : chaque membre, notification et chiffre affiché
  // provient uniquement d'actions réelles (inscriptions, événements…).
  return {
    users: [],
    members: [],
    devices: [],
    notifications: [],
    logs: [
      { id: rid("l"), userId: null, action: "SEED_EMPTY", detail: "Base initialisée vide — aucune donnée fictive", createdAt: now },
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
  // ── Géolocalisation d'indicatif : en démo, pas d'IP Cloudflare →
  //    le client utilise ses replis (fuseau horaire, langue, Cameroun).
  if (path === "/api/geo" && method === "GET") {
    return { ok: true, country: null };
  }

  if (path === "/api/auth/session" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: true, session: null };
    const device = d.devices.find((x) => x.id === d.session!.did && !x.revoked) ?? null;
    const member = d.members.find((m) => m.id === user.memberId) ?? null;
    const location =
      member && member.locationConfirmed
        ? {
            country: member.country ?? null,
            region: member.region ?? null,
            department: member.department ?? null,
            city: member.city ?? null,
            arrondissement: member.arrondissement ?? null,
            quartier: member.quartier ?? null,
            latitude: member.latitude ?? null,
            longitude: member.longitude ?? null,
          }
        : null;
    return {
      ok: true,
      session: {
        user: {
          id: user.id, fullName: user.fullName, phone: user.phone, email: null,
          role: user.role, hasPin: !!user.pinHash, hasLocation: !!location,
        },
        member: member
          ? { id: member.id, branch: member.branch, role: member.role, status: member.status }
          : null,
        location,
        device: device ? { id: device.id, name: device.name, type: device.type } : null,
        unreadCount: d.notifications.filter((n) => n.userId === user.id && !n.read).length,
        hasPasskey: false,
      },
    };
  }

  // ── Auth : flux numéro façon WhatsApp ──
  if (path === "/api/auth/phone" && method === "POST") {
    if (body.action === "request") {
      const phone = normalizePhone(String(body.phone ?? ""), body.country);
      if (!phone) return { ok: false, error: phoneErrorHint(body.country) };
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
      const pseudo = String(body.pseudo ?? "").trim().slice(0, 60);
      if (!((firstName.length >= 2 && lastName.length >= 2) || pseudo.length >= 2)) {
        return { ok: false, error: "Indiquez votre prénom et votre nom — ou au moins un pseudo." };
      }
      const fullName = pseudo || `${firstName} ${lastName}`;
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

  // ── Auth : inscription / connexion par identifiant + mot de passe ──
  if (path === "/api/auth/identifier" && method === "POST") {
    const action = String(body.action ?? "");

    if (action === "register") {
      const identifier = normalizeIdentifier(String(body.identifier ?? ""));
      const password = String(body.password ?? "");
      const pseudo = String(body.pseudo ?? "").trim().slice(0, 60);
      const phone = normalizePhone(String(body.phone ?? ""), body.country);
      const deviceName = String(body.deviceName ?? "Appareil").slice(0, 60);

      if (!identifier) return { ok: false, error: "Identifiant invalide : 3 à 30 caractères (lettres, chiffres, point, tiret ou underscore)." };
      if (password.length < 6) return { ok: false, error: "Mot de passe trop court : au moins 6 caractères." };
      if (pseudo.length < 2) return { ok: false, error: "Indiquez votre pseudo (au moins 2 caractères)." };
      if (!phone) return { ok: false, error: phoneErrorHint(body.country) };

      // 1. Identifiant déjà pris ?
      if (d.users.some((u) => u.identifier === identifier)) {
        return { ok: false, error: "Cet identifiant est déjà utilisé. Connectez-vous ou choisissez-en un autre." };
      }

      // 2. DÉTECTION par numéro de téléphone
      const detected = d.users.find((u) => u.phone === phone);
      if (detected) {
        if (detected.identifier && detected.identifier !== identifier) {
          return { ok: false, error: `Ce numéro est déjà associé au compte « ${detected.fullName} ». Connectez-vous avec son identifiant, ou utilisez un autre numéro.` };
        }
        // Compte détecté sans identifiant → association identifiant + mot de passe
        detected.identifier = identifier;
        detected.passwordHash = await hashPassword(password);
        const device: DemoDevice = {
          id: rid("dev"), userId: detected.id, name: deviceName, type: "pwa_web",
          simulated: false, hasPasskey: false, hasPush: false,
          lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
        };
        d.devices.push(device);
        d.session = { uid: detected.id, did: device.id };
        notifyOne(d, detected.id, {
          typeCode: "AUTH_PASSWORD_LOGIN", title: "Identifiant associé à votre compte",
          body: `Votre identifiant « ${identifier} » est désormais relié au numéro ${phone}. Vous pouvez vous connecter avec ou sans mot de passe.`,
        });
        logOne(d, detected.id, "IDENTIFIER_LINKED", `${detected.fullName} — identifiant ${identifier} — ${phone}`);
        d.pendingVerify = null;
        save(d);
        return { ok: true, linked: true, user: { id: detected.id, fullName: detected.fullName } };
      }

      // 3. Nouveau compte complet
      const branch = BRANCHES[0];
      const memberId = rid("m");
      d.members.push({
        id: memberId, fullName: pseudo, phone, role: "ADULTE", status: "ACTIF",
        branch: branch.name, branchId: branch.id, activeCode: null, codeExpiresAt: null, createdAt: nowISO(),
      });
      const user: DemoUser = {
        id: rid("u"), memberId, fullName: pseudo, phone, role: "ADULTE",
        identifier, passwordHash: await hashPassword(password),
      };
      d.users.push(user);
      const device: DemoDevice = {
        id: rid("dev"), userId: user.id, name: deviceName, type: "pwa_web",
        simulated: false, hasPasskey: false, hasPush: false,
        lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
      };
      d.devices.push(device);
      d.session = { uid: user.id, did: device.id };
      notifyOne(d, user.id, {
        typeCode: "AUTH_WELCOME", title: "Bienvenue dans Famille.Mbeutetsa 🌳",
        body: `Votre compte « ${pseudo} » est actif (${branch.name}). Conservez votre identifiant « ${identifier} » et votre mot de passe — votre numéro ${phone} permet aussi de vous retrouver.`,
      });
      d.users
        .filter((u) => ["SECRETAIRE", "PATRIARCHE", "CHEF_BRANCHE", "CONSEIL"].includes(u.role))
        .forEach((a) =>
          notifyOne(d, a.id, {
            typeCode: "AUTH_REGISTERED_ADMIN", title: "Nouveau membre inscrit",
            body: `${pseudo} (${branch.name}) vient de s'inscrire avec l'identifiant « ${identifier} » — numéro ${phone}.`,
          })
        );
      logOne(d, user.id, "REGISTERED_IDENTIFIER", `${pseudo} — identifiant ${identifier} — ${phone} — appareil « ${deviceName} »`);
      d.pendingVerify = null;
      d.pendingRegister = null;
      save(d);
      return { ok: true, linked: false, user: { id: user.id, fullName: pseudo } };
    }

    if (action === "login") {
      const rawId = String(body.identifier ?? "").trim();
      const password = String(body.password ?? "");
      const deviceName = String(body.deviceName ?? "Appareil").slice(0, 60);
      if (!rawId || !password) {
        return { ok: false, error: "Indiquez votre identifiant et votre mot de passe." };
      }
      const phone = normalizePhone(rawId);
      const identifier = phone ? null : normalizeIdentifier(rawId);
      const user = phone
        ? d.users.find((u) => u.phone === phone && u.passwordHash)
        : identifier
          ? d.users.find((u) => u.identifier === identifier)
          : undefined;
      if (!user || !(await checkPassword(password, user.passwordHash))) {
        logOne(d, user?.id ?? null, "LOGIN_IDENTIFIER_FAILED", "identifiant ou mot de passe incorrect");
        save(d);
        return { ok: false, error: "Identifiant ou mot de passe incorrect." };
      }
      const device: DemoDevice = {
        id: rid("dev"), userId: user.id, name: deviceName, type: "pwa_web",
        simulated: false, hasPasskey: false, hasPush: false,
        lastSeen: nowISO(), revoked: false, createdAt: nowISO(),
      };
      d.devices.push(device);
      d.session = { uid: user.id, did: device.id };
      notifyOne(d, user.id, {
        typeCode: "AUTH_PASSWORD_LOGIN", title: "Connexion par identifiant",
        body: `Vous êtes connecté avec l'identifiant « ${user.identifier ?? user.phone} » sur « ${device.name} ». Si ce n'était pas vous, signalez-le au secrétaire de famille.`,
      });
      logOne(d, user.id, "LOGIN_IDENTIFIER", `${user.fullName} — appareil « ${device.name} »`);
      save(d);
      return { ok: true, user: { id: user.id, fullName: user.fullName } };
    }
  }

  // ── Auth : logout ──
  if (path === "/api/auth/logout" && method === "POST") {
    if (d.session) logOne(d, d.session.uid, "LOGOUT", "Session fermée (mode démo)");
    d.session = null;
    save(d);
    return { ok: true };
  }

  // ── Statistiques du tableau de bord — 100 % réelles, comptées depuis la base ──
  if (path === "/api/stats" && method === "GET") {
    const user = currentUser(d);
    return {
      ok: true,
      stats: {
        members: d.members.length,
        localized: d.members.filter((m) => m.locationConfirmed).length,
        branches: BRANCHES.length,
        unread: user ? d.notifications.filter((n) => n.userId === user.id && !n.read).length : 0,
        announcement: null,
      },
    };
  }

  // ── Ma localisation (rencontres familiales & GPS) ──
  if (path === "/api/me/location" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    const member = d.members.find((m) => m.id === user.memberId) ?? null;
    if (!member || !member.locationConfirmed) return { ok: true, location: null };
    return {
      ok: true,
      location: {
        country: member.country ?? null, region: member.region ?? null,
        department: member.department ?? null, city: member.city ?? null,
        arrondissement: member.arrondissement ?? null, quartier: member.quartier ?? null,
        latitude: member.latitude ?? null, longitude: member.longitude ?? null,
        accuracy: member.accuracy ?? null, source: member.locationSource ?? null,
        updatedAt: member.locationUpdatedAt ?? null,
      },
    };
  }
  if (path === "/api/me/location" && method === "POST") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    const member = d.members.find((m) => m.id === user.memberId);
    if (!member) return { ok: false, error: "Aucun profil membre relié à ce compte." };
    const s = (v: unknown, max = 80): string | null => {
      const t = String(v ?? "").trim().slice(0, max);
      return t.length ? t : null;
    };
    const lat = typeof body.latitude === "number" && isFinite(body.latitude) ? Math.max(-90, Math.min(90, body.latitude)) : null;
    const lon = typeof body.longitude === "number" && isFinite(body.longitude) ? Math.max(-180, Math.min(180, body.longitude)) : null;
    const country = s(body.country);
    const city = s(body.city);
    if (!country && !city && (lat === null || lon === null)) {
      return { ok: false, error: "Indiquez au moins votre pays ou votre ville (ou activez le GPS)." };
    }
    member.country = country;
    member.region = s(body.region);
    member.department = s(body.department);
    member.city = city;
    member.arrondissement = s(body.arrondissement);
    member.quartier = s(body.quartier);
    member.latitude = lat;
    member.longitude = lon;
    member.accuracy = typeof body.accuracy === "number" && isFinite(body.accuracy) ? body.accuracy : null;
    member.locationSource = s(body.source, 12);
    member.locationConfirmed = true;
    member.locationUpdatedAt = nowISO();
    logOne(d, user.id, "LOCATION_SAVED", [member.city, member.region, member.country].filter(Boolean).join(", "));
    save(d);
    return { ok: true, location: { /* reflété par /api/auth/session */ } };
  }

  // ── Annuaire localisé de la famille ──
  if (path === "/api/family/locations" && method === "GET") {
    const user = currentUser(d);
    if (!user) return { ok: false, error: "Session expirée." };
    const out = d.members
      .filter((m) => m.locationConfirmed && typeof m.latitude === "number" && typeof m.longitude === "number")
      .map((m) => ({
        id: m.id,
        fullName: m.fullName,
        phone: m.phone,
        isMe: m.id === user.memberId,
        role: m.role,
        city: m.city ?? null,
        region: m.region ?? null,
        department: m.department ?? null,
        arrondissement: m.arrondissement ?? null,
        quartier: m.quartier ?? null,
        country: m.country ?? null,
        latitude: m.latitude as number,
        longitude: m.longitude as number,
        updatedAt: m.locationUpdatedAt ?? null,
      }));
    return { ok: true, members: out };
  }

  // ── Push ── (le Worker Cloudflare fc-push envoie les vraies notifications système)
  const PUSH_URL = process.env.NEXT_PUBLIC_FC_PUSH_URL || "";
  if (path === "/api/push/public-key" && method === "GET") {
    if (PUSH_URL) {
      try {
        const r = await fetch(`${PUSH_URL}/public-key`);
        const j = (await r.json()) as { publicKey?: string };
        if (j.publicKey) return { ok: true, publicKey: j.publicKey };
      } catch {
        /* secours ci-dessous */
      }
    }
    return { ok: true, publicKey: fakeVapid() };
  }
  if (path === "/api/push/subscribe" && method === "POST") {
    const sub = body.subscription as { endpoint?: string } | undefined;
    if (d.session && sub?.endpoint) {
      const dev = d.devices.find((x) => x.id === d.session!.did);
      if (dev) {
        dev.hasPush = true;
        dev.pushSubscription = JSON.stringify(sub);
      }
      save(d);
      if (PUSH_URL) {
        void fetch(`${PUSH_URL}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub, phone: currentUser(d)?.phone }),
        }).catch(() => undefined);
      }
    }
    return { ok: true, subscribed: true };
  }
  if (path === "/api/push" && method === "POST") {
    const user = currentUser(d);
    const action = String(body.action ?? "");
    if ((action === "test" || action === "welcome") && user) {
      const dev = d.session ? d.devices.find((x) => x.id === d.session!.did) : null;
      const subJson = dev?.pushSubscription;
      const welcome = action === "welcome";
      if (PUSH_URL && subJson) {
        try {
          const r = await fetch(`${PUSH_URL}/send-one`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: JSON.parse(subJson),
              title: welcome ? "🌳 Bienvenue dans la famille !" : "🔔 Famille.Mbeutetsa — test réussi",
              body: welcome
                ? `Félicitations ${user.fullName} — les alertes de la famille vous parviendront ici, même l'application fermée.`
                : `Les notifications push fonctionnent sur « ${dev!.name} ». Vous ne manquerez plus aucun événement familial.`,
              tag: welcome ? "fc-welcome" : "fc-push-test",
            }),
          });
          if (r.ok) {
            logOne(d, user.id, welcome ? "PUSH_WELCOME_SENT" : "PUSH_TEST_SENT", "Notification système réelle (Worker)");
            save(d);
            return { ok: true, sent: true };
          }
        } catch {
          /* secours in-app ci-dessous */
        }
      }
      notifyOne(d, user.id, {
        typeCode: welcome ? "AUTH_WELCOME" : "PUSH_TEST", priority: "NORMALE",
        title: welcome ? "Bienvenue dans Famille.Mbeutetsa 🌳" : "Notification de test",
        body: welcome
          ? "Votre compte est actif. Activez les notifications dans Ma sécurité pour être alerté sur l'écran du téléphone."
          : "Le serveur de notification n'est pas encore relié — cette alerte reste dans le centre d'alertes.",
      });
      logOne(d, user.id, welcome ? "PUSH_WELCOME_INAPP" : "PUSH_TEST_INAPP", "Notification in-app (secours)");
      save(d);
      return { ok: true, sent: false, fallback: "in-app" };
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

    // ── Notifications push & événements : fetch RÉEL (même origine) ──
    // La passerelle push (_worker.js sur pages.dev / routes Node en local) gère
    // /api/push/* et /api/notify*. Seul /api/push/subscribe est intercepté pour
    // marquer l'appareil comme « push actif » dans la base de démo, puis relayé.
    if (url === "/api/push/subscribe" && (init?.method || "POST").toUpperCase() === "POST") {
      let subBody: Record<string, unknown> = {};
      try {
        subBody = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
      } catch {
        subBody = {};
      }
      const sub = subBody.subscription as { endpoint?: string } | undefined;
      const d = db();
      if (d.session && sub?.endpoint) {
        const dev = d.devices.find((x) => x.id === d.session!.did);
        if (dev) {
          dev.hasPush = true;
          dev.pushSubscription = JSON.stringify(sub);
        }
        save(d);
      }
      // Relais réel (originalFetch passe au-dessus de ce hook) → passerelle push
      return originalFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: String(init?.body || "{}"),
      });
    }
    if (url === "/api/push" || url.startsWith("/api/push/") || url.startsWith("/api/notify")) {
      return originalFetch(input as RequestInfo, init);
    }

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
