import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { apiError, apiOk, requireSession, logSecurity, notify } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/devices — liste des appareils de l'utilisateur courant
export async function GET() {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const devices = await db.device.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
  });
  return apiOk({
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      simulated: d.simulated,
      hasPasskey: !!d.credentialId,
      hasPush: !!d.pushSubscription,
      lastSeen: d.lastSeen,
      revoked: !!d.revokedAt,
      current: d.id === result.session.did,
      createdAt: d.createdAt,
    })),
  });
}

// POST /api/devices — { action: "revoke", id } — révoque un appareil (jamais le courant)
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const body = await req.json().catch(() => ({}));
  if (body.action !== "revoke" || !body.id) return apiError("Action invalide.", 400);
  if (body.id === result.session.did) {
    return apiError("Impossible de révoquer l'appareil courant. Utilisez « Quitter la session web ».", 400);
  }
  const device = await db.device.findFirst({ where: { id: body.id, userId: result.user.id } });
  if (!device) return apiError("Appareil introuvable.", 404);
  await db.device.update({ where: { id: device.id }, data: { revokedAt: new Date() } });
  await notify(result.user.id, {
    univers: "U1", typeCode: "AUTH_DEVICE_REVOKED", priority: "HAUTE",
    title: "Appareil déconnecté",
    body: `« ${device.name} » n'a plus accès à votre compte. Ce n'était pas vous ? Contactez le secrétaire de famille immédiatement.`,
  });
  await logSecurity(result.user.id, "DEVICE_REVOKED", `« ${device.name} » révoqué manuellement`);
  return apiOk({ revoked: device.id });
}
