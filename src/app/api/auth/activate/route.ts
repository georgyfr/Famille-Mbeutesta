import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signSession, SESSION_COOKIE, sessionCookieOptions, formatRecoveryCode, hashValue, hashPin } from "@/lib/fc-auth";
import { apiError, apiOk, ensureSeed, logSecurity, notify, notifyAdmins } from "@/lib/fc-server";

export const runtime = "nodejs";

// POST /api/auth/activate — { activateToken, pin?, simulatedCredentialId? }
// Finalise la revendication de profil : crée/ré-active le compte, l'appareil,
// génère le code de récupération (affiché 1 seule fois), ouvre la session.
export async function POST(req: NextRequest) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const payload = body.activateToken ? verifyToken(body.activateToken, "activate") : null;
  if (!payload) return apiError("Session d'activation expirée. Recommencez.", 401);

  const { accessCodeId, code, memberId, deviceName, reenroll } = payload as {
    accessCodeId: string; code: string; memberId: string; deviceName: string; reenroll?: boolean;
  };

  const member = await db.member.findUnique({ where: { id: memberId }, include: { branch: true } });
  if (!member) return apiError("Profil familial introuvable.", 404);

  const accessCode = await db.accessCode.findUnique({ where: { id: accessCodeId } });
  if (!accessCode || accessCode.usedAt) return apiError("Code d'accès déjà utilisé ou invalide.", 400);

  let user;
  if (member.user) {
    // Ré-enrôlement (téléphone perdu / changement d'appareil) : on révoque TOUS les anciens appareils
    user = member.user;
    await db.device.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await logSecurity(user.id, "DEVICES_REVOKED", `Ré-enrôlement — tous les anciens appareils révoqués (${member.fullName})`);
  } else {
    user = await db.user.create({
      data: {
        memberId: member.id,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        role: member.role,
      },
    });
    await db.member.update({ where: { id: member.id }, data: { status: "ACTIF" } });
  }

  // PIN optionnel à l'activation
  let pinSet = false;
  if (body.pin && typeof body.pin === "string" && /^\d{4,6}$/.test(body.pin)) {
    const { hash, salt } = hashPin(body.pin);
    await db.user.update({ where: { id: user.id }, data: { pinHash: hash, pinSalt: salt } });
    pinSet = true;
  }

  // Appareil : biométrie réelle (credential WebAuthn) ou simulée (mode démo)
  const simulatedId = typeof body.simulatedCredentialId === "string" ? body.simulatedCredentialId : null;
  const device = await db.device.create({
    data: {
      userId: user.id,
      name: String(deviceName).slice(0, 60) || "Appareil",
      type: "pwa_web",
      credentialId: simulatedId,
      simulated: !!simulatedId,
    },
  });

  // Code d'accès consommé (usage unique)
  await db.accessCode.update({
    where: { id: accessCodeId },
    data: { usedAt: new Date(), usedByDevice: device.name },
  });

  // Code de récupération personnel — affiché UNE SEULE FOIS
  const recoveryPlain = formatRecoveryCode();
  await db.recoveryCode.create({
    data: { userId: user.id, codeHash: hashValue(recoveryPlain) },
  });

  // Session
  const token = signSession({ uid: user.id, did: device.id });
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, fullName: user.fullName, role: user.role },
    device: { id: device.id, name: device.name },
    recoveryCode: recoveryPlain,
    reenroll: !!reenroll,
    pinSet,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

  // ── Notifications (matrice par action) ──
  if (reenroll) {
    await notify(user.id, {
      univers: "U1", typeCode: "AUTH_REENROLLED", priority: "HAUTE",
      title: "Nouvel appareil activé",
      body: `Votre accès a été réactivé sur « ${device.name} ». Les anciens appareils ont été déconnectés automatiquement.`,
    });
    await notifyAdmins({
      univers: "U1", typeCode: "AUTH_REENROLLED_ADMIN", priority: "NORMALE",
      title: "Ré-enrôlement effectué",
      body: `${member.fullName} (${member.branch.name}) a réactivé son accès sur un nouvel appareil.`,
    });
  } else {
    await notify(user.id, {
      univers: "U1", typeCode: "AUTH_WELCOME", priority: "NORMALE",
      title: "Bienvenue dans Famille.Mbeutetsa 🌳",
      body: `Votre compte est actif, branche ${member.branch.name}. Conservez précieusement votre code de récupération — il ne sera plus jamais affiché.`,
    });
    await notifyAdmins({
      univers: "U1", typeCode: "AUTH_ACTIVATED_ADMIN", priority: "NORMALE",
      title: "Membre activé",
      body: `${member.fullName} (${member.branch.name}) vient d'activer son compte Famille.Mbeutetsa.`,
    });
  }
  await logSecurity(user.id, reenroll ? "REENROLLED" : "ACTIVATED",
    `${member.fullName} — appareil « ${device.name} »${pinSet ? " + PIN défini" : ""}`);

  return res;
}
