import { db } from "@/lib/db";
import { apiError, apiOk, requireSession } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/security-log — journal de sécurité du membre (30 dernières entrées)
export async function GET() {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const logs = await db.securityLog.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return apiOk({
    logs: logs.map((l) => ({ id: l.id, action: l.action, detail: l.detail, createdAt: l.createdAt })),
  });
}
