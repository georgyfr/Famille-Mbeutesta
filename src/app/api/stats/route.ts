import { db } from "@/lib/db";
import { apiOk } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/stats — chiffres du tableau de bord (accueil)
export async function GET() {
  const [members, actives, branches, latestAnnouncement] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { status: "ACTIF" } }),
    db.branch.count(),
    db.notification.findFirst({
      where: { typeCode: { in: ["ANNOUNCEMENT", "FAM_NEWS", "AUTH_WELCOME"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return apiOk({
    stats: {
      members: members || actives,
      treasury: 0, // U4 (caisse Mobile Money) — univers à venir
      events: 0, // U2 (moteur d'événements) — univers à venir
      branches,
      announcement: latestAnnouncement
        ? { title: latestAnnouncement.title, body: latestAnnouncement.body }
        : null,
    },
  });
}
