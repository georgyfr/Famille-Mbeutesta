import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/fc-server";

export const runtime = "nodejs";

export async function GET() {
  const result = await requireSession();
  if (!result) return NextResponse.json({ ok: true, session: null });
  const { session, user } = result;
  const device = await db.device.findUnique({ where: { id: session.did } });
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const member = user.memberId
    ? await db.member.findUnique({ where: { id: user.memberId }, include: { branch: true } })
    : null;
  const hasPasskey = await db.device.count({
    where: { userId: user.id, credentialId: { not: null }, revokedAt: null, simulated: false },
  });
  return NextResponse.json({
    ok: true,
    session: {
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        role: user.role,
        hasPin: !!user.pinHash,
      },
      member: member
        ? { id: member.id, branch: member.branch.name, role: member.role, status: member.status }
        : null,
      device: device && !device.revokedAt ? { id: device.id, name: device.name, type: device.type } : null,
      unreadCount: unread,
      hasPasskey: hasPasskey > 0,
    },
  });
}
