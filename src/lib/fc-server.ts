import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "@/lib/fc-auth";

// Assure l'existence de la famille + branches de démonstration
export async function ensureSeed() {
  const family = await db.family.upsert({
    where: { name: "Famille Mbeutetsa" },
    update: {},
    create: { name: "Famille Mbeutetsa" },
  });
  const branchNames = ["Branche Douala", "Branche Yaoundé", "Branche Bafoussam", "Branche Diaspora (Europe)"];
  for (const name of branchNames) {
    await db.branch.upsert({
      where: { id: `${family.id}:${name}` },
      update: {},
      create: { id: `${family.id}:${name}`, familyId: family.id, name },
    });
  }
  return family;
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function apiOk(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export async function requireSession(): Promise<
  { session: SessionPayload; user: NonNullable<Awaited<ReturnType<typeof db.user.findFirst>>> } | null
> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;
  return { session, user };
}

// Notifications in-app persistantes (centre de notifications)
export async function notify(
  userId: string,
  n: { univers?: string; typeCode: string; priority?: string; title: string; body: string; link?: string }
) {
  return db.notification.create({
    data: {
      userId,
      univers: n.univers ?? "U1",
      typeCode: n.typeCode,
      priority: n.priority ?? "NORMALE",
      title: n.title,
      body: n.body,
      link: n.link,
    },
  });
}

export async function notifyAdmins(n: { univers?: string; typeCode: string; priority?: string; title: string; body: string; link?: string }, excludeUserId?: string) {
  const admins = await db.user.findMany({
    where: { role: { in: ["SECRETAIRE", "PATRIARCHE", "CHEF_BRANCHE", "CONSEIL"] }, id: { not: excludeUserId } },
  });
  for (const admin of admins) {
    await notify(admin.id, n);
  }
  return admins.length;
}

export async function logSecurity(userId: string | null, action: string, detail?: string) {
  return db.securityLog.create({ data: { userId, action, detail } });
}
