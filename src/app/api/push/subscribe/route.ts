import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { apiError, apiOk, requireSession, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

// POST /api/push/subscribe — enregistre l'abonnement Web Push sur l'appareil courant
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const body = await req.json().catch(() => ({}));
  const sub = body.subscription as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | undefined;

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return apiError("Abonnement push invalide.", 400);
  }

  await db.device.update({
    where: { id: result.session.did },
    data: { pushSubscription: JSON.stringify(sub) },
  });
  await logSecurity(result.user.id, "PUSH_SUBSCRIBED", "Notifications système activées sur cet appareil");
  return apiOk({ subscribed: true });
}
