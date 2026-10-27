import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import webpush from "web-push";
import { apiError, apiOk, requireSession, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";

// GET /api/push — clé publique VAPID pour l'abonnement navigateur
export async function GET() {
  if (!VAPID_PUBLIC) return apiError("VAPID non configuré côté serveur.", 500);
  return apiOk({ publicKey: VAPID_PUBLIC });
}

// POST /api/push — { action: "subscribe" | "test", subscription? }
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const body = await req.json().catch(() => ({}));

  if (body.action === "subscribe") {
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return apiError("Abonnement push invalide.", 400);
    }
    await db.device.update({
      where: { id: result.session.did },
      data: { pushSubscription: JSON.stringify(sub) },
    });
    return apiOk({ subscribed: true });
  }

  if (body.action === "test") {
    const device = await db.device.findUnique({ where: { id: result.session.did } });
    if (!device?.pushSubscription) {
      return apiError("Aucun abonnement push sur cet appareil. Activez les notifications d'abord.", 400);
    }
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return apiError("VAPID non configuré côté serveur.", 500);
    }
    webpush.setVapidDetails("mailto:contact@familleconnect.app", VAPID_PUBLIC, VAPID_PRIVATE);
    const payload = JSON.stringify({
      title: "🔔 Famille.Mbeutetsa — test réussi",
      body: `Les notifications push fonctionnent sur « ${device.name} ». Vous ne manquerez plus aucun événement familial.`,
      tag: "fc-push-test",
      url: "/",
    });
    try {
      await webpush.sendNotification(JSON.parse(device.pushSubscription), payload);
      await logSecurity(result.user.id, "PUSH_TEST_SENT", `Push test envoyé à « ${device.name} »`);
      return apiOk({ sent: true });
    } catch (e) {
      const err = e as { statusCode?: number; message?: string };
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.device.update({ where: { id: device.id }, data: { pushSubscription: null } });
        return apiError("Abonnement expiré côté navigateur. Réactivez les notifications.", 410);
      }
      return apiError(`Envoi push impossible : ${String(err.message).slice(0, 120)}`, 502);
    }
  }

  return apiError("Action inconnue.", 400);
}
