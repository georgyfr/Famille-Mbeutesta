import { db } from "@/lib/db";
import { apiOk, requireSession } from "@/lib/fc-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/stats — chiffres 100 % RÉELS du tableau de bord.
 * Aucun chiffre fictif : tout est compté dans la base de données.
 */
export async function GET() {
  const auth = await requireSession();

  const [members, localized, branches, unread, latestAnnouncement] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { locationConfirmed: true } }),
    db.branch.count(),
    auth ? db.notification.count({ where: { userId: auth.user.id, readAt: null } }) : Promise.resolve(0),
    db.notification.findFirst({
      where: { typeCode: { in: ["ANNOUNCEMENT", "FAM_NEWS"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return apiOk({
    stats: {
      members, // membres réellement enregistrés
      localized, // membres ayant validé leur localisation
      branches, // branches réellement créées
      unread, // alertes non lues de l'utilisateur
      announcement: latestAnnouncement
        ? { title: latestAnnouncement.title, body: latestAnnouncement.body }
        : null,
    },
  });
}
