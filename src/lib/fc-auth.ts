import { createHmac, timingSafeEqual, randomBytes, pbkdf2Sync } from "crypto";
import { cookies } from "next/headers";

const SECRET = process.env.FC_SECRET || "dev-secret-change-me";
export const SESSION_COOKIE = "fc_session";
const SESSION_TTL_S = 60 * 60 * 24 * 60; // 60 jours

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export type SessionPayload = { uid: string; did: string; iat: number };

// Token générique multi-étapes (claim → otp → activate) signé HMAC, TTL court
export type StepToken = Record<string, unknown> & { kind: string; iat: number };

export function signToken(payload: Record<string, unknown>, kind: string, ttlS: number): string {
  const body = { ...payload, kind, iat: Math.floor(Date.now() / 1000) };
  const data = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string, expectedKind: string): StepToken | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as StepToken;
    if (payload.kind !== expectedKind) return null;
    if (Math.floor(Date.now() / 1000) - payload.iat > ttlForKind(expectedKind)) return null;
    return payload;
  } catch {
    return null;
  }
}

function ttlForKind(kind: string): number {
  switch (kind) {
    case "claim": return 60 * 30;        // 30 min
    case "activate": return 60 * 15;     // 15 min
    default: return 60 * 30;
  }
}

export function signSession(payload: { uid: string; did: string }): string {
  const body: SessionPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const data = b64url(JSON.stringify(body));
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (Math.floor(Date.now() / 1000) - payload.iat > SESSION_TTL_S) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    maxAge: SESSION_TTL_S,
    path: "/",
  };
}

// ─── PIN & codes : hash PBKDF2-SHA256 ───
export function hashPin(pin: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(pin, s, 120_000, 32, "sha256").toString("hex");
  return { hash, salt: s };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const test = pbkdf2Sync(pin, salt, 120_000, 32, "sha256");
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

export function randomCode(len = 6): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I,L,O,0,1 (ambigus)
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

// OTP numérique (format SMS standard)
export function randomDigits(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += bytes[i] % 10;
  return out;
}

export function formatAccessCode(): string {
  return `FC-${randomCode(4)}-${randomCode(4)}`;
}

export function formatRecoveryCode(): string {
  return `MBTE-${randomCode(4)}-${randomCode(4)}`;
}

export function hashValue(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}
