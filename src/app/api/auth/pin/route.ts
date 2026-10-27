import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, sessionCookieOptions, verifyPin } from "@/lib/fc-auth";
import { apiError, apiOk, logSecurity, notify } from "@/lib/fc-server";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

// POST /api/auth/pin — { action: "setup" | "verify", pin, uid? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as "setup" | "verify";

  // ── Définir le PIN (session requise) ──
  if (action === "setup") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return apiError("Session requise.", 401);
    const signed = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    const user = await db.user.findUnique({ where: { id: signed.uid } });
    if (!user) return apiError("Session requise.", 401);
    if (!body.pin || !/^\d{4,6}$/.test(body.pin)) {
      return apiError("Le PIN doit contenir 4 à 6 chiffres.", 400);
    }
    const { hashPin } = await import("@/lib/fc-auth");
    const { hash, salt } = hashPin(body.pin);
    await db.user.update({ where: { id: user.id }, data: { pinHash: hash, pinSalt: salt } });
    await notify(user.id, {
      univers: "U1", typeCode: "AUTH_PIN_SET", priority: "NORMALE",
      title: "Code PIN défini",
      body: "Votre PIN de secours est actif. Ne le partagez avec personne.",
    });
    await logSecurity(user.id, "PIN_SET", "PIN de secours défini");
    return apiOk({ hasPin: true });
  }

  // ── Vérifier le PIN (reconnexion même appareil, sans session) ──
  if (action === "verify") {
    const { uid, pin, deviceName } = body;
    if (!uid || !pin) return apiError("PIN requis.", 400);
    const user = await db.user.findUnique({ where: { id: uid } });
    if (!user || !user.pinHash || !user.pinSalt) {
      return apiError("Aucun PIN défini pour ce compte.", 404);
    }

    // Anti-épuisement : 5 échecs sur 30 min → verrouillage
    const since = new Date(Date.now() - LOCK_MINUTES * 60 * 1000);
    const failures = await db.securityLog.count({
      where: { userId: uid, action: "PIN_FAIL", createdAt: { gte: since } },
    });
    if (failures >= MAX_ATTEMPTS) {
      await logSecurity(uid, "PIN_LOCKED", "Verrouillage 30 min après 5 échecs");
      await notify(uid, {
        univers: "U1", typeCode: "AUTH_PIN_LOCKED", priority: "HAUTE",
        title: "Alerte sécurité 🔒",
        body: `${MAX_ATTEMPTS} tentatives de PIN erronées. Connexion par PIN verrouillée ${LOCK_MINUTES} min. Utilisez la biométrie ou un code d'accès.`,
      });
      return apiError(`Trop de tentatives. Réessayez dans ${LOCK_MINUTES} minutes.`, 429, { reason: "LOCKED" });
    }

    if (!verifyPin(pin, user.pinHash, user.pinSalt)) {
      await logSecurity(uid, "PIN_FAIL", `PIN incorrect (tentative ${failures + 1}/${MAX_ATTEMPTS})`);
      const left = MAX_ATTEMPTS - failures - 1;
      return apiError(
        `PIN incorrect. ${left > 0 ? `${left} tentative(s) restante(s).` : "Compte verrouillé 30 min."}`,
        400,
        { reason: "WRONG", attemptsLeft: Math.max(0, left) }
      );
    }

    // Session sur l'appareil courant (créé/réutilisé par nom)
    let device = await db.device.findFirst({
      where: { userId: uid, name: String(deviceName || "Appareil"), revokedAt: null },
    });
    if (!device) {
      device = await db.device.create({
        data: { userId: uid, name: String(deviceName || "Appareil").slice(0, 60), type: "pwa_web" },
      });
    } else {
      await db.device.update({ where: { id: device.id }, data: { lastSeen: new Date() } });
    }
    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName } });
    res.cookies.set(SESSION_COOKIE, signSession({ uid: user.id, did: device.id }), sessionCookieOptions());
    await logSecurity(uid, "PIN_LOGIN", `Connexion par PIN — « ${device.name} »`);
    return res;
  }

  return apiError("Action inconnue.", 400);
}
