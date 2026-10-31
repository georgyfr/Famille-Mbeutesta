import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  signToken,
  verifyToken,
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  hashValue,
  randomDigits,
} from "@/lib/fc-auth";
import { apiError, apiOk, ensureSeed, logSecurity, notify, notifyAdmins } from "@/lib/fc-server";
import { normalizePhoneIntl, phoneErrorHint } from "@/lib/fc-phone";

export const runtime = "nodejs";

// ─── Normalisation téléphone multi-pays (diaspora) ───
// Frontend : { phone: "<indicatif><national>", country: "CM"|"FR"|… }
// Accepte aussi les formats anciens : "691234567", "+237 691234567", "00237 …"
// → E.164 : "+237691234567", "+33612345678", "+14155550123", …
function normalizePhone(raw: string, country?: unknown): string | null {
  return normalizePhoneIntl(raw, country);
}

function cleanDeviceName(raw: unknown): string {
  return String(raw ?? "").slice(0, 60) || "Appareil";
}

// ─── POST /api/auth/phone ───
// Inscription / connexion « façon WhatsApp » : le numéro de téléphone est l'identifiant.
// 1. request  → envoie une notification de vérification (OTP 6 chiffres, mode démo : le code
//    est renvoyé à l'écran comme contenu de la notification)
// 2. verify   → vérifie le code + que le numéro est bien celui de l'appareil :
//    • numéro déjà enregistré → session ouverte immédiatement (reconnexion instantanée)
//    • numéro inconnu         → registerToken pour la saisie nom/prénom
// 3. register → crée le membre + le compte avec prénom/nom, ouvre la session
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  /* ──────── Étape 1 : demande de vérification ──────── */
  if (body.action === "request") {
    await ensureSeed();
    const phone = normalizePhone(body.phone, body.country);
    if (!phone) {
      return apiError(phoneErrorHint(body.country));
    }
    const code = randomDigits(6);
    const token = signToken({ phone, codeHash: hashValue(code) }, "phone-verify", 600); // 10 min
    const existing = await db.user.findFirst({ where: { phone } });
    await logSecurity(null, "PHONE_VERIFY_REQUEST", `${phone} — compte existant : ${existing ? "oui" : "non"}`);
    return apiOk({
      verifyToken: token,
      demoCode: code, // mode démo : la « notification » affiche le code à l'écran
      known: !!existing,
      phone,
    });
  }

  /* ──────── Étape 2 : vérification du code + appareil ──────── */
  if (body.action === "verify") {
    const payload = body.verifyToken ? verifyToken(body.verifyToken, "phone-verify") : null;
    if (!payload) return apiError("Notification de vérification expirée. Recommencez avec votre numéro.", 401);
    if (typeof body.code !== "string" || hashValue(body.code) !== payload.codeHash) {
      return apiError("Code incorrect. Vérifiez la notification reçue.", 401, { reason: "BAD_CODE" });
    }
    const phone = String(payload.phone);
    const user = await db.user.findFirst({ where: { phone } });

    if (user) {
      // Numéro déjà enregistré → connexion immédiate (le compte est retrouvé par le numéro)
      const deviceName = cleanDeviceName(body.deviceName);
      const device = await db.device.create({
        data: { userId: user.id, name: deviceName, type: "pwa_web" },
      });
      const token = signSession({ uid: user.id, did: device.id });
      const res = apiOk({
        registered: true,
        user: { id: user.id, fullName: user.fullName },
      }) as NextResponse;
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

      await notify(user.id, {
        univers: "U1",
        typeCode: "AUTH_PHONE_LOGIN",
        priority: "NORMALE",
        title: "Connexion par numéro",
        body: `Vous êtes connecté avec le numéro ${phone} sur « ${deviceName} ». Si ce n'était pas vous, signalez-le au secrétaire de famille.`,
      });
      await logSecurity(user.id, "PHONE_LOGIN", `${phone} — appareil « ${deviceName} »`);
      return res;
    }

    // Numéro inconnu → vers la saisie du prénom / nom
    const registerToken = signToken({ phone }, "phone-verify", 900); // 15 min
    return apiOk({ registered: false, registerToken, phone });
  }

  /* ──────── Étape 3 : inscription (prénom + nom) ──────── */
  if (body.action === "register") {
    await ensureSeed();
    const payload = body.registerToken ? verifyToken(body.registerToken, "phone-verify") : null;
    if (!payload?.phone) {
      return apiError("Vérification expirée. Recommencez avec votre numéro.", 401);
    }
    const phone = String(payload.phone);
    const firstName = String(body.firstName ?? "").trim().slice(0, 60);
    const lastName = String(body.lastName ?? "").trim().slice(0, 60);
    const pseudo = String(body.pseudo ?? "").trim().slice(0, 60);
    if (!((firstName.length >= 2 && lastName.length >= 2) || pseudo.length >= 2)) {
      return apiError("Indiquez votre prénom et votre nom — ou au moins un pseudo.");
    }
    const fullName = pseudo || `${firstName} ${lastName}`;

    // Le numéro a pu être enregistré entre-temps sur un autre appareil → on connecte directement
    const existing = await db.user.findFirst({ where: { phone } });
    if (existing) {
      const deviceName = cleanDeviceName(body.deviceName);
      const device = await db.device.create({
        data: { userId: existing.id, name: deviceName, type: "pwa_web" },
      });
      const token = signSession({ uid: existing.id, did: device.id });
      const res = apiOk({ user: { id: existing.id, fullName: existing.fullName } }) as NextResponse;
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
      await logSecurity(existing.id, "PHONE_LOGIN", `${phone} — appareil « ${deviceName} »`);
      return res;
    }

    const family = await ensureSeed();
    const branch =
      (await db.branch.findFirst({ where: { familyId: family.id, name: "Branche Douala" } })) ??
      (await db.branch.findFirst({ where: { familyId: family.id } }));
    if (!branch) return apiError("Famille non initialisée. Contactez le secrétaire de famille.", 500);

    const member = await db.member.create({
      data: { familyId: family.id, branchId: branch.id, fullName, phone, role: "ADULTE", status: "ACTIF" },
    });
    const user = await db.user.create({
      data: { memberId: member.id, fullName, phone, role: "ADULTE" },
    });
    const deviceName = cleanDeviceName(body.deviceName);
    const device = await db.device.create({
      data: { userId: user.id, name: deviceName, type: "pwa_web" },
    });

    const token = signSession({ uid: user.id, did: device.id });
    const res = apiOk({ user: { id: user.id, fullName } }) as NextResponse;
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

    // ── Notifications (matrice par action) ──
    await notify(user.id, {
      univers: "U1",
      typeCode: "AUTH_WELCOME",
      priority: "NORMALE",
      title: "Bienvenue dans Famille.Mbeutetsa 🌳",
      body: `Votre compte est actif. Votre numéro de téléphone est votre identifiant : la prochaine fois, l'application s'ouvrira directement sur cet appareil.`,
    });
    await notifyAdmins({
      univers: "U1",
      typeCode: "AUTH_REGISTERED_ADMIN",
      priority: "NORMALE",
      title: "Nouveau membre inscrit",
      body: `${fullName} vient de s'inscrire avec le numéro ${phone}.`,
    });
    await logSecurity(user.id, "REGISTERED", `${fullName} — ${phone} — appareil « ${deviceName} »`);
    return res;
  }

  return apiError("Action inconnue.", 400);
}
