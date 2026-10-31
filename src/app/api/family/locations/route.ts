import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/fc-server";

export const runtime = "nodejs";

/**
 * GET /api/family/locations — annuaire localisé de la famille.
 * Uniquement les membres AYANT validé leur localisation (locationConfirmed),
 * pour les rencontres physiques et le guidage GPS entre membres.
 */
export async function GET() {
  const auth = await requireSession();
  if (!auth) return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });

  const members = await db.member.findMany({
    where: { locationConfirmed: true },
    select: {
      id: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      city: true,
      region: true,
      department: true,
      arrondissement: true,
      quartier: true,
      country: true,
      latitude: true,
      longitude: true,
      locationUpdatedAt: true,
    },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json({
    ok: true,
    members: members
      .filter((m) => typeof m.latitude === "number" && typeof m.longitude === "number")
      .map((m) => ({
        id: m.id,
        fullName: m.fullName,
        phone: m.phone,
        isMe: m.id === auth.user.memberId,
        role: m.role,
        city: m.city,
        region: m.region,
        department: m.department,
        arrondissement: m.arrondissement,
        quartier: m.quartier,
        country: m.country,
        latitude: m.latitude,
        longitude: m.longitude,
        updatedAt: m.locationUpdatedAt,
      })),
  });
}
