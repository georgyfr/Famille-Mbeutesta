import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import webpush from "web-push";
import { apiError, apiOk, requireSession, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@familleconnect.app";

// POST /api/push — { action: "test" | "welcome" } : envoie une vraie notification système
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const body = await req.json().catch(() => ({}));

  const device = await db.device.findUnique({ where: { id: result.session.did } });
  if (!device?.pushSubscription) {
    return apiError("Aucun abonnement push sur cet appareil. Activez les notifications d'abord.", 400);
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return apiError("VAPID non configuré côté serveur.", 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const payload =
    body.action === "welcome"
      ? {
          title: "🌳 Bienvenue dans la famille !",
          body: `Félicitations ${result.user.fullName} — les alertes de la famille vous parviendront ici, même l'application fermée.`,
          tag: "fc-welcome",
          url: "/",
        }
      : {
          title: "🔔 Famille.Mbeutetsa — test réussi",
          body: `Les notifications push fonctionnent sur « ${device.name} ». Vous ne manquerez plus aucun événement familial.`,
          tag: "fc-push-test",
          url: "/",
        };

  try {
    await webpush.sendNotification(JSON.parse(device.pushSubscription), JSON.stringify(payload), {
      urgency: "high",
      TTL: 7 * 86400,
    });
    await logSecurity(
      result.user.id,
      body.action === "welcome" ? "PUSH_WELCOME_SENT" : "PUSH_TEST_SENT",
      `Push réel envoyé à « ${device.name} »`
    );
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
