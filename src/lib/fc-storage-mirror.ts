"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Miroir de stockage — Famille.Mbeutetsa
//
// SIGNALEMENT (2026-10-31) : « à chaque fois que je clique de nouveau sur le
// lien, je dois me réinscrire ou me reconnecter » — certains navigateurs
// (WebView WhatsApp/Facebook, réglage « effacer les données à la fermeture »
// d'Opera/Samsung, navigation privée) VIDENT le localStorage à chaque
// relancement. Résultat : compte et épargnes disparus, réinscription forcée.
//
// SOLUTION — triple écriture + restauration automatique au démarrage :
//   1. localStorage       stockage normal (le plus rapide)
//   2. IndexedDB          compartiment indépendant — survit quand le
//                         localStorage est vidé (autre couche du navigateur)
//   3. cookie « fc_anchor » (10 ans, SameSite=Lax) — miniature du COMPTE :
//     suffit à recréer la session et le profil même si les deux stockages
//     sont perdus ; + « fc_ep_data » : les ÉPARGNES et PRÊTS au format
//     compact (4:20000,6:15000) — la donnée la plus précieuse de l'app.
//
// La restauration s'exécute AVANT toute lecture de session, donc l'utilisateur
// retrouvre son espace sans jamais revoir l'écran d'inscription.
// ─────────────────────────────────────────────────────────────────────────────

const DB_KEY = "fc_demo_db_v2"; // base démo (comptes, session, notifications)
const TAUX_KEY = "fc_tontine_taux_v1";
const EPARGNES_KEY = "fc_tontine_epargnes_v1";
const PRETS_KEY = "fc_tontine_prets_v1";
const PAYES_KEY = "fc_tontine_payes_v1";
const LOC_SKIP_KEY = "fc_loc_skipped"; // « localisation plus tard » — à retenir aussi

/** Clés dont une copie de sécurité est tenue en permanence. */
const MIRRORED_KEYS = [DB_KEY, TAUX_KEY, EPARGNES_KEY, PRETS_KEY, PAYES_KEY, LOC_SKIP_KEY];

const MIRROR_DB = "fc-mirror";
const MIRROR_STORE = "kv";
const MIRROR_SNAPSHOT = "snapshot_v1";
const ANCHOR_COOKIE = "fc_anchor";
const DATA_COOKIE = "fc_ep_data";
const COOKIE_AGE_S = 60 * 60 * 24 * 365 * 10; // 10 ans

type Anchor = {
  uid: string;
  did: string;
  name: string;
  phone: string;
  memberId: string;
  role: string;
  branch: string;
  savedAt: number;
};

/* ───────────────────────── IndexedDB (repli dur) ───────────────────────── */

function idbOpen(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(MIRROR_DB, 1);
      req.onupgradeneeded = () => {
        try {
          req.result.createObjectStore(MIRROR_STORE);
        } catch {
          /* déjà créé */
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await idbOpen();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(MIRROR_STORE, "readwrite");
      tx.objectStore(MIRROR_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await idbOpen();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(MIRROR_STORE, "readonly");
      const req = tx.objectStore(MIRROR_STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/* ───────────────────────── cookies (dernier rempart) ───────────────────────── */

function readCookie(name: string): string | null {
  try {
    const prefix = `${name}=`;
    for (const part of document.cookie.split(";")) {
      const c = part.trim();
      if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length));
    }
  } catch {
    /* rien */
  }
  return null;
}

function writeCookie(name: string, value: string | null): void {
  try {
    if (value === null) {
      document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
      return;
    }
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_AGE_S}; path=/; SameSite=Lax`;
  } catch {
    /* stockage indisponible */
  }
}

/* ───────────────────────── extraction compte / épargnes ───────────────────────── */

type DbLike = {
  users?: { id: string; memberId: string; fullName: string; phone: string; role: string }[];
  members?: { id: string; fullName: string; phone: string; role: string; branch: string; status: string }[];
  devices?: { id: string; userId: string }[];
  session?: { uid: string; did: string } | null;
};

function extractAnchor(dbRaw: string | undefined): Anchor | null {
  if (!dbRaw) return null;
  try {
    const d = JSON.parse(dbRaw) as DbLike;
    if (!d.session?.uid) return null;
    const u = d.users?.find((x) => x.id === d.session!.uid);
    if (!u) return null;
    const m = d.members?.find((x) => x.id === u.memberId);
    return {
      uid: u.id,
      did: d.session.did,
      name: u.fullName,
      phone: u.phone,
      memberId: u.memberId,
      role: u.role,
      branch: m?.branch ?? "Branche Douala",
      savedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

type EpargneLike = { id?: string; month0: number; capital: number };
type PretLike = { month0: number; capital: number };

/** Format ultra-compact : épargnes « 4:20000,6:15000 », prêts « 2:10000 ». */
function packData(epargnes: EpargneLike[], prets: PretLike[], taux: number): string {
  const e = epargnes
    .filter((x) => typeof x.month0 === "number" && x.capital > 0)
    .map((x) => `${x.month0}:${Math.round(x.capital)}`)
    .join(",");
  const p = prets
    .filter((x) => typeof x.month0 === "number" && x.capital > 0)
    .map((x) => `${x.month0}:${Math.round(x.capital)}`)
    .join(",");
  return `e=${e};p=${p};t=${Math.round(taux * 10) / 10}`;
}

function unpackData(raw: string): { epargnes: EpargneLike[]; prets: PretLike[]; taux: number | null } {
  const out: { epargnes: EpargneLike[]; prets: PretLike[]; taux: number | null } = { epargnes: [], prets: [], taux: null };
  try {
    for (const seg of raw.split(";")) {
      const [k, v] = seg.split("=");
      if (!k || v === undefined) continue;
      if (k === "e" || k === "p") {
        for (const item of v.split(",")) {
          const [m, c] = item.split(":").map(Number);
          if (!isFinite(m) || !isFinite(c) || c <= 0) continue;
          (k === "e" ? out.epargnes : out.prets).push({ month0: Math.min(Math.max(m, 0), 11), capital: c });
        }
      } else if (k === "t") {
        const t = Number(v);
        if (isFinite(t) && t >= 0 && t <= 20) out.taux = t;
      }
    }
  } catch {
    /* rien */
  }
  return out;
}

/* ───────────────────────── écriture du miroir ───────────────────────── */

let mirrorTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleMirrorWrite(delay = 600): void {
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    mirrorTimer = null;
    void writeMirror();
  }, delay);
}

async function writeMirror(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // 1. Snapshot complet → IndexedDB
    const snap: Record<string, string> = {};
    for (const k of MIRRORED_KEYS) {
      const v = localStorage.getItem(k);
      if (v) snap[k] = v;
    }
    if (Object.keys(snap).length > 0) await idbSet(MIRROR_SNAPSHOT, snap);

    const dbRaw = snap[DB_KEY];
    if (typeof dbRaw === "string" && dbRaw) {
      const anchor = extractAnchor(dbRaw);
      if (anchor) {
        // 2. Cookie compte (miniature — recrée la session)
        writeCookie(ANCHOR_COOKIE, JSON.stringify(anchor));
        // 3. Cookie épargnes/prêts (la donnée la plus précieuse, format compact)
        try {
          const ep = JSON.parse(localStorage.getItem(EPARGNES_KEY) ?? "[]") as EpargneLike[];
          const pr = JSON.parse(localStorage.getItem(PRETS_KEY) ?? "[]") as PretLike[];
          const trRaw = localStorage.getItem(TAUX_KEY);
          // Taux jamais réglé explicitement → défaut de l'app (3 %), JAMAIS 0.
          const tr = trRaw && trRaw.trim() !== "" ? Number(trRaw) : 3;
          writeCookie(DATA_COOKIE, packData(ep, pr, isFinite(tr) ? tr : 3));
        } catch {
          /* rien */
        }
      } else {
        // Déconnexion EXPLICITE (session fermée dans la base) → plus
        // d'auto-reconnexion, et les données personnelles quittent les cookies.
        writeCookie(ANCHOR_COOKIE, null);
        writeCookie(DATA_COOKIE, null);
      }
    }
    // ⚠️ Si la base est ILLISIBLE/absente (stockage vidé par le navigateur),
    // on ne touche PAS aux cookies : ils sont le dernier rempart.
  } catch {
    /* stockage indisponible — jamais bloquant */
  }
}

/* ───────────────────────── restauration au démarrage ───────────────────────── */

function seedMinimalDb(a: Anchor, epargnes: EpargneLike[], prets: PretLike[], taux: number | null): string {
  const now = new Date().toISOString();
  const ep = epargnes.map((x, i) => ({ id: `r-${i}-${Math.random().toString(36).slice(2, 8)}`, month0: x.month0, capital: x.capital }));
  const pr = prets.map((x, i) => ({
    id: `r-p-${i}-${Math.random().toString(36).slice(2, 8)}`,
    month0: x.month0,
    capital: x.capital,
    rembourseMois: null,
    rembourseMontant: 0,
  }));
  const db = {
    users: [{ id: a.uid, memberId: a.memberId, fullName: a.name, phone: a.phone, role: a.role }],
    members: [
      {
        id: a.memberId,
        fullName: a.name,
        phone: a.phone,
        role: "ADULTE",
        status: "ACTIF",
        branch: a.branch,
        branchId: "br-douala",
        activeCode: null,
        codeExpiresAt: null,
        createdAt: now,
      },
    ],
    devices: [
      {
        id: a.did,
        userId: a.uid,
        name: "Appareil",
        type: "pwa_web",
        simulated: false,
        hasPasskey: false,
        hasPush: false,
        lastSeen: now,
        revoked: false,
        createdAt: now,
      },
    ],
    notifications: [
      {
        id: `r-n-${Math.random().toString(36).slice(2, 8)}`,
        userId: a.uid,
        univers: "U1",
        typeCode: "SESSION_RESTORED",
        priority: "NORMALE",
        title: "Espace restauré automatiquement",
        body: `Bonjour ${a.name.split(" ")[0]} — votre navigation a été restaurée sans nouvelle inscription. Bienvenue à nouveau dans Famille.Mbeutetsa.`,
        read: false,
        createdAt: now,
      },
    ],
    logs: [{ id: `r-l-${Math.random().toString(36).slice(2, 8)}`, userId: a.uid, action: "SESSION_RESTORED", detail: "Restauration automatique après effacement du stockage navigateur", createdAt: now }],
    prefs: { digestEnabled: true, quietStart: 19, quietEnd: 7, pushEnabled: true },
    session: { uid: a.uid, did: a.did },
    pendingVerify: null,
    pendingRegister: null,
  };
  if (ep.length > 0) localStorage.setItem(EPARGNES_KEY, JSON.stringify(ep));
  if (pr.length > 0) localStorage.setItem(PRETS_KEY, JSON.stringify(pr));
  if (taux !== null) localStorage.setItem(TAUX_KEY, String(taux));
  return JSON.stringify(db);
}

/**
 * Restaure compte + épargnes si le navigateur a vidé le localStorage.
 * À appeler UNE fois au démarrage, AVANT toute lecture de session.
 * Retourne « idb » | « cookie » | null (origine de la restauration).
 */
export async function restoreFromMirror(): Promise<"idb" | "cookie" | null> {
  if (typeof window === "undefined") return null;
  try {
    // Session déjà en place ? → simple rafraîchissement du miroir, rien à restaurer.
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      scheduleMirrorWrite(0);
      return null;
    }

    // 1) Repli fort : snapshot complet dans IndexedDB (compte + épargnes + prêts)
    const snap = await idbGet<Record<string, string>>(MIRROR_SNAPSHOT);
    if (snap && typeof snap === "object") {
      let restored = false;
      for (const k of MIRRORED_KEYS) {
        const v = snap[k];
        if (typeof v === "string" && v) {
          try {
            localStorage.setItem(k, v);
            restored = true;
          } catch {
            /* quota */
          }
        }
      }
      if (restored) {
        try {
          sessionStorage.setItem("fc_restored", "idb");
        } catch {
          /* rien */
        }
        scheduleMirrorWrite(0);
        return "idb";
      }
    }

    // 2) Dernier rempart : cookies (compte + épargnes compactées)
    const aRaw = readCookie(ANCHOR_COOKIE);
    if (aRaw) {
      try {
        const a = JSON.parse(aRaw) as Anchor;
        if (a?.uid && a.name) {
          const data = readCookie(DATA_COOKIE) ?? "";
          const { epargnes, prets, taux } = unpackData(data);
          localStorage.setItem(DB_KEY, seedMinimalDb(a, epargnes, prets, taux));
          try {
            sessionStorage.setItem("fc_restored", "cookie");
          } catch {
            /* rien */
          }
          scheduleMirrorWrite(0);
          return "cookie";
        }
      } catch {
        /* cookie illisible */
      }
    }
  } catch {
    /* stockage indisponible */
  }
  return null;
}

/**
 * Installe le miroir : restaure d'abord (await), puis surveille chaque
 * écriture localStorage des clés de l'app et la recopie en arrière-plan.
 * Résout quand la restauration est terminée (l'app peut lire la session).
 */
export async function installStorageMirror(): Promise<void> {
  if (typeof window === "undefined") return;
  await restoreFromMirror();
  try {
    const proto = Storage.prototype as unknown as { setItem: (k: string, v: string) => void };
    const orig = proto.setItem;
    proto.setItem = function (this: Storage, k: string, v: string) {
      orig.call(this, k, v);
      if (MIRRORED_KEYS.indexOf(k) !== -1) scheduleMirrorWrite();
    };
  } catch {
    /* environnement verrouillé — la restauration ponctuelle reste en place */
  }
  // Filet : au repli/fermeture, on force une dernière copie.
  try {
    window.addEventListener("pagehide", () => void writeMirror());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void writeMirror();
    });
  } catch {
    /* rien */
  }
}

/** Origine de la restauration de CETTE session (pour le toast d'accueil). */
export function consumedRestore(): "idb" | "cookie" | null {
  try {
    const v = sessionStorage.getItem("fc_restored") as "idb" | "cookie" | null;
    if (v) sessionStorage.removeItem("fc_restored");
    return v;
  } catch {
    return null;
  }
}
