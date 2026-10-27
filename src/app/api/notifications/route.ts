import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { apiError, apiOk, requireSession } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/notifications — centre de notifications in-app
export async function GET(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const notifications = await db.notification.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await db.notification.count({ where: { userId: result.user.id, readAt: null } });
  const prefs = await db.notificationPref.upsert({
    where: { userId: result.user.id },
    update: {},
    create: { userId: result.user.id },
  });
  return apiOk({
    notifications: notifications.map((n) => ({
      id: n.id,
      univers: n.univers,
      typeCode: n.typeCode,
      priority: n.priority,
      title: n.title,
      body: n.body,
      read: !!n.readAt,
      createdAt: n.createdAt,
    })),
    unreadCount: unread,
    prefs: {
      digestEnabled: prefs.digestEnabled,
      quietStart: prefs.quietStart,
      quietEnd: prefs.quietEnd,
      pushEnabled: prefs.pushEnabled,
    },
  });
}

// POST /api/notifications — { action: "read" | "read-all" | "prefs", ... }
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const body = await req.json().catch(() => ({}));

  if (body.action === "read" && body.id) {
    await db.notification.updateMany({
      where: { id: body.id, userId: result.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return apiOk({ read: body.id });
  }

  if (body.action === "read-all") {
    const r = await db.notification.updateMany({
      where: { userId: result.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return apiOk({ readAll: r.count });
  }

  if (body.action === "prefs") {
    const prefs = await db.notificationPref.upsert({
      where: { userId: result.user.id },
      update: {
        digestEnabled: body.digestEnabled,
        quietStart: body.quietStart,
        quietEnd: body.quietEnd,
        pushEnabled: body.pushEnabled,
      },
      create: {
        userId: result.user.id,
        digestEnabled: body.digestEnabled,
        quietStart: body.quietStart,
        quietEnd: body.quietEnd,
        pushEnabled: body.pushEnabled,
      },
    });
    return apiOk({ prefs: { digestEnabled: prefs.digestEnabled, quietStart: prefs.quietStart, quietEnd: prefs.quietEnd, pushEnabled: prefs.pushEnabled } });
  }

  return apiError("Action inconnue.", 400);
}
