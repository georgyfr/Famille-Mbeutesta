import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/fc-server";

export const runtime = "nodejs";

function clean(v: unknown, max = 80): string | null {
  const s = String(v ?? "").trim().slice(0, max);
  return s.length ? s : null;
}

/** GET /api/me/location — ma localisation enregistrée */
export async function GET() {
  const auth = await requireSession();
  if (!auth) return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
  const member = auth.user.memberId
    ? await db.member.findUnique({ where: { id: auth.user.memberId } })
    : null;
  if (!member) return NextResponse.json({ ok: true, location: null });
  return NextResponse.json({
    ok: true,
    location: member.locationConfirmed
      ? {
          country: member.country,
          region: member.region,
          department: member.department,
          city: member.city,
          arrondissement: member.arrondissement,
          quartier: member.quartier,
          latitude: member.latitude,
          longitude: member.longitude,
          accuracy: member.accuracy,
          source: member.locationSource,
          updatedAt: member.locationUpdatedAt,
        }
      : null,
  });
}

/**
 * POST /api/me/location — enregistre la localisation validée par l'utilisateur.
 * Le téléphone de l'utilisateur reste l'élément d'identification ; la localisation
 * sert aux rencontres physiques et au guidage GPS entre membres de la famille.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth) return NextResponse.json({ ok: false, error: "Session expirée." }, { status: 401 });
  if (!auth.user.memberId)
    return NextResponse.json({ ok: false, error: "Aucun profil membre relié à ce compte." }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Au minimum : un pays OU une ville OU des coordonnées GPS
  const country = clean(b.country);
  const city = clean(b.city);
  const latitude = typeof b.latitude === "number" && isFinite(b.latitude) ? b.latitude : null;
  const longitude = typeof b.longitude === "number" && isFinite(b.longitude) ? b.longitude : null;
  if (!country && !city && (latitude === null || longitude === null)) {
    return NextResponse.json(
      { ok: false, error: "Indiquez au moins votre pays ou votre ville (ou activez le GPS)." },
      { status: 400 }
    );
  }

  const lat = latitude !== null ? Math.max(-90, Math.min(90, latitude)) : null;
  const lon = longitude !== null ? Math.max(-180, Math.min(180, longitude)) : null;

  const member = await db.member.update({
    where: { id: auth.user.memberId },
    data: {
      country,
      region: clean(b.region),
      department: clean(b.department),
      city,
      arrondissement: clean(b.arrondissement),
      quartier: clean(b.quartier),
      latitude: lat,
      longitude: lon,
      accuracy: typeof b.accuracy === "number" && isFinite(b.accuracy) ? b.accuracy : null,
      locationSource: clean(b.source, 12),
      locationConfirmed: true,
      locationUpdatedAt: new Date(),
    },
  });

  await db.securityLog.create({
    data: {
      userId: auth.user.id,
      action: "LOCATION_SAVED",
      detail: [member.city, member.region, member.country].filter(Boolean).join(", ") || `${lat ?? "?"},${lon ?? "?"}`,
    },
  });

  return NextResponse.json({
    ok: true,
    location: {
      country: member.country,
      region: member.region,
      department: member.department,
      city: member.city,
      arrondissement: member.arrondissement,
      quartier: member.quartier,
      latitude: member.latitude,
      longitude: member.longitude,
      accuracy: member.accuracy,
      source: member.locationSource,
      updatedAt: member.locationUpdatedAt,
    },
  });
}
