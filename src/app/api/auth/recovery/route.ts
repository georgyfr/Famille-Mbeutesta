import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, sessionCookieOptions, hashValue, formatRecoveryCode } from "@/lib/fc-auth";
import { apiError, apiOk, logSecurity, notify, notifyAdmins } from "@/lib/fc-server";

export const runtime = "nodejs";

// POST /api/auth/recovery — récupération autonome par code personnel (téléphone perdu, diaspora)
// { code, deviceName } → usage unique → révoque les anciens appareils → nouveau code affiché
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, deviceName } = body;
  if (!code || typeof code !== "string" || !deviceName) {
    return apiError("Code de récupération et nom d'appareil requis.", 400);
  }

  const normalized = code.trim().toUpperCase();
  const hash = hashValue(normalized);
  const recovery = await db.recoveryCode.findFirst({
    where: { codeHash: hash, usedAt: null },
    include: { user: true },
  });
  if (!recovery) {
    await logSecurity(null, "RECOVERY_FAILED", `Code de récupération invalide (${normalized.slice(0, 4)}…)`);
    return apiError("Code de récupération invalide ou déjà utilisé.", 404, { reason: "INVALID" });
  }

  const user = recovery.user;

  // Révocation de tous les anciens appareils (même logique que le ré-enrôlement assisté)
  await db.device.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });

  // Nouvel appareil
  const device = await db.device.create({
    data: { userId: user.id, name: String(deviceName).slice(0, 60), type: "pwa_web" },
  });

  // Code consommé + nouveau code de récupération (affiché une seule fois)
  await db.recoveryCode.update({ where: { id: recovery.id }, data: { usedAt: new Date() } });
  const newCode = formatRecoveryCode();
  await db.recoveryCode.create({ data: { userId: user.id, codeHash: hashValue(newCode) } });

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, fullName: user.fullName },
    device: { id: device.id, name: device.name },
    newRecoveryCode: newCode,
  });
  res.cookies.set(SESSION_COOKIE, signSession({ uid: user.id, did: device.id }), sessionCookieOptions());

  await notify(user.id, {
    univers: "U1", typeCode: "AUTH_RECOVERY_USED", priority: "HAUTE",
    title: "Accès récupéré sur un nouvel appareil",
    body: `Connexion rétablie via votre code de récupération sur « ${device.name} ». Un NOUVEAU code de récupération vous a été attribué — notez-le.`,
  });
  await notifyAdmins({
    univers: "U1", typeCode: "AUTH_RECOVERY_ADMIN", priority: "NORMALE",
    title: "Récupération autonome",
    body: `${user.fullName} a récupéré son accès via code de récupération sur « ${device.name} ».`,
  });
  await logSecurity(user.id, "RECOVERY_USED", `Anciens appareils révoqués, nouveau device « ${device.name} »`);

  return res;
}
