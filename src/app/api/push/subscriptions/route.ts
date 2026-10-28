import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/fc-server";
import { devConfigured, isDevRequest } from "@/lib/fc-dev";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/push/subscriptions — [développeur] appareils abonnés au push (local)
export async function GET(req: NextRequest) {
  if (!devConfigured()) return apiError("Accès développeur non configuré côté serveur.", 500);
  if (!isDevRequest(req)) return apiError("Code développeur invalide.", 401);
  const devices = await db.device.findMany({
    where: { pushSubscription: { not: null }, revokedAt: null },
    select: { name: true, lastSeen: true, user: { select: { phone: true, fullName: true } } },
    orderBy: { lastSeen: "desc" },
    take: 50,
  });
  return apiOk({
    devices: devices.map((d) => ({
      device: d.name,
      phone: d.user?.phone,
      added: d.lastSeen?.toISOString(),
      endpoint: "sqlite:device.pushSubscription",
    })),
  });
}
