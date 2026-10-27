import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { formatAccessCode } from "@/lib/fc-auth";
import { apiError, apiOk, ensureSeed, requireSession, notifyAdmins, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/admin/members — liste des membres pré-enregistrés + codes actifs
export async function GET() {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const family = await ensureSeed();
  const members = await db.member.findMany({
    where: { familyId: family.id },
    include: {
      branch: true,
      user: { select: { id: true } },
      accessCodes: { where: { usedAt: null, expiresAt: { gte: new Date() } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return apiOk({
    members: members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      phone: m.phone,
      email: m.email,
      role: m.role,
      status: m.status,
      branch: m.branch.name,
      branchId: m.branchId,
      activated: !!m.user,
      activeCode: m.accessCodes[0]?.code ?? null,
      codeExpiresAt: m.accessCodes[0]?.expiresAt ?? null,
      createdAt: m.createdAt,
    })),
    branches: (await db.branch.findMany({ where: { familyId: family.id } })).map((b) => ({ id: b.id, name: b.name })),
  });
}

// POST /api/admin/members — pré-enregistre un membre + génère son code d'accès (TTL 7 jours)
export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const family = await ensureSeed();
  const { fullName, phone, email, branchId, role } = await req.json().catch(() => ({}));
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 3) {
    return apiError("Nom complet requis (3 caractères minimum).", 400);
  }
  const branch = branchId
    ? await db.branch.findFirst({ where: { id: branchId, familyId: family.id } })
    : (await db.branch.findFirst({ where: { familyId: family.id, name: { contains: "Douala" } } })) ??
      (await db.branch.findFirst({ where: { familyId: family.id } }));
  if (!branch) return apiError("Branche introuvable.", 404);

  const member = await db.member.create({
    data: {
      familyId: family.id,
      branchId: branch.id,
      fullName: fullName.trim(),
      phone: phone || null,
      email: email || null,
      role: role || "ADULTE",
      status: "PREINSCRIT",
    },
  });

  const code = formatAccessCode();
  await db.accessCode.create({
    data: {
      code,
      memberId: member.id,
      createdBy: result.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await notifyAdmins({
    univers: "U1", typeCode: "MEMBER_PREREGISTERED", priority: "NORMALE",
    title: "Nouveau membre pré-enregistré",
    body: `${member.fullName} (${branch.name}) — code d'accès ${code} valable 7 jours.`,
  });
  await logSecurity(result.user.id, "MEMBER_PREREGISTERED", `${member.fullName} — code ${code}`);

  return apiOk({
    member: { id: member.id, fullName: member.fullName, branch: branch.name },
    accessCode: { code, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
}

// PUT /api/admin/members — régénère un code d'accès (téléphone perdu, code expiré)
export async function PUT(req: NextRequest) {
  const result = await requireSession();
  if (!result) return apiError("Session requise.", 401);
  const { memberId } = await req.json().catch(() => ({}));
  if (!memberId) return apiError("Membre requis.", 400);
  const member = await db.member.findUnique({ where: { id: memberId }, include: { branch: true } });
  if (!member) return apiError("Membre introuvable.", 404);

  // Max 3 codes actifs par membre (anti-épuisement)
  const active = await db.accessCode.count({
    where: { memberId, usedAt: null, expiresAt: { gte: new Date() } },
  });
  if (active >= 3) {
    return apiError("Ce membre a déjà 3 codes actifs. Attendez leur expiration.", 429, { reason: "TOO_MANY" });
  }

  const code = formatAccessCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.accessCode.create({ data: { code, memberId, createdBy: result.user.id, expiresAt } });
  await logSecurity(result.user.id, "CODE_REGENERATED", `${member.fullName} — nouveau code ${code}`);

  return apiOk({ accessCode: { code, expiresAt }, member: { fullName: member.fullName, branch: member.branch.name } });
}
