// ─── Jeton développeur (partagé client/serveur) ───
// Le client envoie X-Dev-Token = SHA-256 hex du code développeur ;
// le serveur le compare à DEV_TOKEN_SHA (env), jamais au code en clair.

import type { NextRequest } from "next/server";

export function isDevRequest(req: NextRequest): boolean {
  const token = req.headers.get("X-Dev-Token") || "";
  const expected = process.env.DEV_TOKEN_SHA || "";
  return !!expected && token.length === 64 && token === expected;
}

export function devConfigured(): boolean {
  return !!(process.env.DEV_TOKEN_SHA && process.env.DEV_TOKEN_SHA.length === 64);
}

/* ── Journal en mémoire des événements diffusés (dev local) ── */

export type LocalNtf = { id: string; title: string; body: string; tag?: string; at: number };

const recent: LocalNtf[] = [];
const MAX = 30;

export function localNtfAppend(n: LocalNtf): void {
  recent.unshift(n);
  if (recent.length > MAX) recent.length = MAX;
}

export function localNtfSince(since: number): { notifications: LocalNtf[]; now: number } {
  return { notifications: recent.filter((x) => x.at > since), now: Date.now() };
}

/* ── Envoi Web Push à tous les appareils enregistrés (dev local) ── */

export async function pushToAllDevices(
  payload: Record<string, unknown>
): Promise<{ sent: number; failed: number; pruned: number }> {
  const webpush = (await import("web-push")).default;
  const { db } = await import("@/lib/db");
  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) throw new Error("VAPID non configuré côté serveur.");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:contact@familleconnect.app",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );

  const devices = await db.device.findMany({
    where: { pushSubscription: { not: null }, revokedAt: null },
    select: { id: true, name: true, pushSubscription: true },
  });

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  const body = JSON.stringify(payload);
  for (const d of devices) {
    try {
      await webpush.sendNotification(JSON.parse(d.pushSubscription as string), body, {
        urgency: "high",
        TTL: 7 * 86400,
      });
      sent++;
    } catch (e) {
      const err = e as { statusCode?: number };
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.device.update({ where: { id: d.id }, data: { pushSubscription: null } });
        pruned++;
      }
    }
  }
  return { sent, failed, pruned };
}
