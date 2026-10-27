import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { verifyToken, formatAccessCode, signToken } from "@/lib/fc-auth";
import { apiError, apiOk, ensureSeed, logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

// POST /api/auth/verify-code — vérifie un code d'accès à usage unique
export async function POST(req: NextRequest) {
  await ensureSeed();
  const { code, deviceName } = await req.json().catch(() => ({}));
  if (!code || typeof code !== "string") return apiError("Code d'accès requis.");
  if (!deviceName || typeof deviceName !== "string") return apiError("Nom d'appareil requis.");

  const normalized = code.trim().toUpperCase();
  const accessCode = await db.accessCode.findUnique({
    where: { code: normalized },
    include: { member: { include: { branch: true, user: true } } },
  });

  if (!accessCode) {
    return apiError("Code inconnu. Vérifiez auprès du secrétaire de famille.", 404, { reason: "UNKNOWN" });
  }
  if (accessCode.usedAt) {
    return apiError("Ce code a déjà été utilisé.", 400, { reason: "USED" });
  }
  if (accessCode.expiresAt < new Date()) {
    return apiError("Ce code a expiré (validité 7 jours). Demandez un nouveau code au secrétaire.", 400, {
      reason: "EXPIRED",
    });
  }

  const member = accessCode.member;
  if (!member || member.status === "ARCHIVE") {
    return apiError("Ce profil familial n'est plus actif. Contactez le conseil de famille.", 400);
  }

  await logSecurity(null, "CODE_VERIFIED", `Code ${normalized} vérifié pour ${member.fullName}`);

  // Token d'étape : la session d'activation n'existe pas encore, on transporte le contexte
  const claimToken = signToken(
    {
      accessCodeId: accessCode.id,
      code: normalized,
      memberId: member.id,
      deviceName,
      reenroll: !!member.user, // si le membre a déjà un compte → ré-enrôlement (téléphone perdu)
    },
    "claim",
    60 * 30
  );

  return apiOk({
    claimToken,
    member: {
      fullName: member.fullName,
      branch: member.branch.name,
      role: member.role,
      phone: member.phone,
      reenroll: !!member.user,
    },
  });
}

// GET — validation d'un claimToken (utilisé par le client pour reprendre un flux)
export async function PUT(req: NextRequest) {
  const { claimToken } = await req.json().catch(() => ({}));
  const payload = claimToken ? verifyToken(claimToken, "claim") : null;
  if (!payload) return apiError("Session de connexion expirée. Recommencez.", 401);
  return apiOk({ valid: true });
}

// Génère un nouveau code (utilisé aussi par les tests)
export async function GET() {
  return apiOk({ sampleFormat: formatAccessCode() });
}
