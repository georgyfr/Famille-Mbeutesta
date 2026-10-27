import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { verifyToken, signToken, hashValue, randomDigits } from "@/lib/fc-auth";
import { apiError, apiOk, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

const DEMO_MODE = process.env.OTP_DEMO_MODE !== "0"; // démo : code retourné à l'écran

// POST /api/auth/otp — { action: "request" | "verify", claimToken?, code? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as "request" | "verify";

  if (action === "request") {
    const payload = body.claimToken ? verifyToken(body.claimToken, "claim") : null;
    if (!payload) return apiError("Session de connexion expirée. Recommencez.", 401);

    const code = randomDigits(6);
    const demoCode = code; // MODE DÉMO : affiché à l'écran (production : SMS/email + jamais retourné)
    // Stockage TTL court via table Challenge (kind otp-claim, purgé par expiration)
    await db.challenge.deleteMany({ where: { kind: "otp-claim", expiresAt: { lt: new Date() } } });
    await db.challenge.create({
      data: {
        kind: "otp-claim",
        challenge: hashValue(code),
        dataJson: JSON.stringify({ claimToken: body.claimToken }),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // TTL 5 min
      },
    });
    await logSecurity(null, "OTP_REQUESTED", `OTP demandé (membre ${String(payload.memberId).slice(-6)})`);
    return apiOk({ demoMode: DEMO_MODE, demoCode, expiresInS: 300 });
  }

  if (action === "verify") {
    const payload = body.claimToken ? verifyToken(body.claimToken, "claim") : null;
    if (!payload) return apiError("Session de connexion expirée. Recommencez.", 401);
    if (!body.code || typeof body.code !== "string") return apiError("Code de vérification requis.");

    const record = await db.challenge.findFirst({
      where: {
        kind: "otp-claim",
        challenge: hashValue(body.code.trim().toUpperCase()),
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      await logSecurity(null, "OTP_FAILED", `OTP invalide ou expiré (membre ${String(payload.memberId).slice(-6)})`);
      return apiError("Code incorrect ou expiré. Demandez un nouveau code.", 400, { reason: "INVALID" });
    }
    // Vérifier que le claimToken de la requête correspond bien à celui stocké
    const stored = JSON.parse(record.dataJson) as { claimToken?: string };
    if (stored.claimToken !== body.claimToken) {
      return apiError("Code incorrect ou expiré. Demandez un nouveau code.", 400, { reason: "INVALID" });
    }
    // Usage unique : le challenge est supprimé après vérification
    await db.challenge.delete({ where: { id: record.id } });

    const activateToken = signToken(
      { accessCodeId: payload.accessCodeId, code: payload.code, memberId: payload.memberId, deviceName: payload.deviceName, reenroll: payload.reenroll },
      "activate",
      60 * 15
    );
    await logSecurity(null, "OTP_VERIFIED", `OTP validé (membre ${String(payload.memberId).slice(-6)})`);
    return apiOk({ activateToken });
  }

  return apiError("Action inconnue.", 400);
}
