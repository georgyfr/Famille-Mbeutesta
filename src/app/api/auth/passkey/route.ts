import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/fc-auth";
import { apiError, apiOk, logSecurity, notify } from "@/lib/fc-server";

export const runtime = "nodejs";

// rpID dynamique : dérivé de l'origine de la requête (fonctionne en preview et en prod)
function rpFromRequest(req: NextRequest) {
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const hostname = new URL(origin).hostname;
  return { origin, rpID: hostname };
}

async function saveChallenge(kind: string, challenge: string, data: Record<string, unknown>) {
  await db.challenge.deleteMany({ where: { kind, expiresAt: { lt: new Date() } } });
  return db.challenge.create({
    data: {
      kind,
      challenge,
      dataJson: JSON.stringify(data),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });
}

async function popChallenge(kind: string, challenge: string): Promise<{ challenge: string; data: Record<string, unknown> } | null> {
  const rec = await db.challenge.findFirst({
    where: { kind, challenge, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!rec) return null;
  await db.challenge.delete({ where: { id: rec.id } });
  return { challenge: rec.challenge, data: JSON.parse(rec.dataJson) as Record<string, unknown> };
}

// POST /api/auth/passkey — { action: ... }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { origin, rpID } = rpFromRequest(req);
  const action = body.action as string;

  // ── Enregistrement (nécessite une session) ──
  if (action === "register-options") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return apiError("Session requise.", 401);
    const payloadSigned = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    const user = await db.user.findUnique({ where: { id: payloadSigned.uid } });
    if (!user) return apiError("Session requise.", 401);

    const options = await generateRegistrationOptions({
      rpName: "Famille.Mbeutetsa",
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.fullName,
      userDisplayName: user.fullName,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform",
      },
      attestationType: "none",
    });
    await saveChallenge("webauthn-reg", options.challenge, { userId: user.id });
    return apiOk({ options });
  }

  if (action === "register-verify") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return apiError("Session requise.", 401);
    const payloadSigned = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    const user = await db.user.findUnique({ where: { id: payloadSigned.uid } });
    if (!user) return apiError("Session requise.", 401);

    const stored = await popChallenge("webauthn-reg", body.response?.response?.challenge);
    if (!stored) return apiError("Challenge expiré. Réessayez.", 400);

    try {
      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: stored.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return apiError("Vérification biométrique échouée.", 400);
      }
      const { credential } = verification.registrationInfo;
      const device = await db.device.create({
        data: {
          userId: user.id,
          name: `${body.deviceLabel || "Biométrie"} · ${new Date().toLocaleDateString("fr-FR")}`,
          type: "pwa_web",
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: credential.counter,
          simulated: false,
        },
      });
      await notify(user.id, {
        univers: "U1", typeCode: "AUTH_PASSKEY_ADDED", priority: "NORMALE",
        title: "Biométrie activée 🔐",
        body: `Votre empreinte/Face ID est maintenant votre moyen de connexion sur cet appareil.`,
      });
      await logSecurity(user.id, "PASSKEY_REGISTERED", `Appareil « ${device.name} »`);
      return apiOk({ device: { id: device.id, name: device.name } });
    } catch (e) {
      return apiError(`Enrôlement biométrique impossible : ${(e as Error).message.slice(0, 120)}`, 400);
    }
  }

  // ── Connexion (sans session) ──
  if (action === "auth-options") {
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: [], // discoverable credentials (passkeys synchronisées)
    });
    await saveChallenge("webauthn-auth", options.challenge, {});
    return apiOk({ options });
  }

  if (action === "auth-verify") {
    try {
      const stored = await popChallenge("webauthn-auth", body.response?.response?.challenge);
      if (!stored) return apiError("Challenge expiré. Réessayez.", 400);

      const credentialId = body.response?.id;
      const device = await db.device.findFirst({
        where: { credentialId, revokedAt: null },
        include: { user: true },
      });
      if (!device) return apiError("Biométrie non reconnue sur ce compte.", 401);

      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: String(stored.challenge),
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: device.credentialId!,
          publicKey: new Uint8Array(Buffer.from(device.publicKey!, "base64url")),
          counter: device.counter,
        },
        requireUserVerification: false,
      });
      if (!verification.verified) return apiError("Vérification biométrique échouée.", 400);

      await db.device.update({ where: { id: device.id }, data: { counter: verification.authenticationInfo.newCounter, lastSeen: new Date() } });
      const res = NextResponse.json({ ok: true, user: { id: device.user.id, fullName: device.user.fullName } });
      res.cookies.set(SESSION_COOKIE, signSession({ uid: device.user.id, did: device.id }), sessionCookieOptions());
      await logSecurity(device.user.id, "PASSKEY_LOGIN", `Connexion biométrique — « ${device.name} »`);
      return res;
    } catch (e) {
      return apiError(`Connexion biométrique impossible : ${(e as Error).message.slice(0, 120)}`, 400);
    }
  }

  // ── Mode démo : enrôlement d'un appareil biométrique simulé (session requise) ──
  if (action === "simulate-register") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return apiError("Session requise.", 401);
    const signed = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    const user = await db.user.findUnique({ where: { id: signed.uid } });
    if (!user) return apiError("Session requise.", 401);
    const credentialId = "SIM-" + crypto.randomUUID();
    const device = await db.device.create({
      data: {
        userId: user.id,
        name: `Biométrie simulée · ${new Date().toLocaleDateString("fr-FR")}`,
        type: "pwa_web",
        credentialId,
        simulated: true,
      },
    });
    await notify(user.id, {
      univers: "U1", typeCode: "AUTH_PASSKEY_ADDED", priority: "NORMALE",
      title: "Biométrie (démo) activée 🔐",
      body: `Un appareil biométrique simulé a été enregistré : « ${device.name} ».`,
    });
    await logSecurity(user.id, "PASSKEY_REGISTERED", `Appareil simulé « ${device.name} »`);
    return apiOk({ device: { id: device.id, name: device.name }, simulated: true });
  }

  // ── Mode démo : connexion par appareil simulé (fallback preview/headless) ──
  if (action === "simulate") {
    const { uid } = body;
    if (!uid) return apiError("Utilisateur requis.", 400);
    const user = await db.user.findUnique({ where: { id: uid } });
    if (!user) return apiError("Compte introuvable.", 404);
    const hasRealPasskey = await db.device.count({
      where: { userId: uid, simulated: false, credentialId: { not: null }, revokedAt: null },
    });
    if (hasRealPasskey > 0) {
      return apiError("Un appareil biométrique réel est enregistré — utilisez-le.", 400);
    }
    const device = await db.device.findFirst({
      where: { userId: uid, simulated: true, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!device) return apiError("Aucun appareil biométrique simulé trouvé.", 404);
    await db.device.update({ where: { id: device.id }, data: { lastSeen: new Date() } });
    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName } });
    res.cookies.set(SESSION_COOKIE, signSession({ uid: user.id, did: device.id }), sessionCookieOptions());
    await logSecurity(user.id, "PASSKEY_SIMULATED_LOGIN", `Connexion biométrie simulée — « ${device.name} »`);
    return res;
  }

  return apiError("Action inconnue.", 400);
}
