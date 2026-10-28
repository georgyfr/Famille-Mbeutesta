import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/fc-server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/push/unsubscribe — retire l'abonnement push (par endpoint)
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  const endpoint = String(body.endpoint || "");
  if (!endpoint) return apiError("Endpoint manquant.", 400);
  const devices = await db.device.findMany({
    where: { pushSubscription: { not: null } },
    select: { id: true, pushSubscription: true },
  });
  let removed = 0;
  for (const d of devices) {
    try {
      const sub = JSON.parse(d.pushSubscription as string) as { endpoint?: string };
      if (sub.endpoint === endpoint) {
        await db.device.update({ where: { id: d.id }, data: { pushSubscription: null } });
        removed++;
      }
    } catch {
      /* ignore */
    }
  }
  return apiOk({ removed });
}
