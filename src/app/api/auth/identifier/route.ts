import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  signSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  hashPin,
  verifyPin,
} from "@/lib/fc-auth";
import { apiError, ensureSeed, logSecurity, notify, notifyAdmins } from "@/lib/fc-server";
import { normalizePhoneIntl, phoneErrorHint } from "@/lib/fc-phone";

export const runtime = "nodejs";

// ─── Normalisation téléphone multi-pays (miroir de /api/auth/phone) ───
// Frontend : { phone: "<indicatif><national>", country: "CM"|"FR"|… } → E.164
function normalizePhone(raw: string, country?: unknown): string | null {
  return normalizePhoneIntl(raw, country);
}

// Identifiant : 3 à 30 caractères — lettres, chiffres, point, tiret, underscore
function normalizeIdentifier(raw: string): string | null {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(id)) return null;
  return id;
}

function cleanDeviceName(raw: unknown): string {
  return String(raw ?? "").slice(0, 60) || "Appareil";
}

async function openSession(
  userId: string,
  deviceName: string,
  extra: Record<string, unknown> = {}
): Promise<NextResponse> {
  const device = await db.device.create({
    data: { userId, name: cleanDeviceName(deviceName), type: "pwa_web" },
  });
  const token = signSession({ uid: userId, did: device.id });
  const res = NextResponse.json({ ok: true, ...extra });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

// ─── POST /api/auth/identifier ───
// Inscription / connexion par IDENTIFIANT + MOT DE PASSE.
// • action "register" : { identifier, password, pseudo, phone, deviceName }
//   → le numéro de téléphone est l'élément de DÉTECTION : si un compte existe
//     déjà avec ce numéro, l'identifiant lui est associé (compte retrouvé) ;
//     sinon un nouveau compte est créé (membre + utilisateur + session).
// • action "login" : { identifier, password, deviceName }
//   → l'identifiant peut être le pseudo-texte OU le numéro de téléphone.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  await ensureSeed();
  const action = String(body.action ?? "");

  /* ──────── Inscription / liaison par identifiant ──────── */
  if (action === "register") {
    const identifier = normalizeIdentifier(String(body.identifier ?? ""));
    const password = String(body.password ?? "");
    const pseudo = String(body.pseudo ?? "").trim().slice(0, 60);
    const phone = normalizePhone(String(body.phone ?? ""), body.country);
    const deviceName = cleanDeviceName(body.deviceName);

    if (!identifier) {
      return apiError("Identifiant invalide : 3 à 30 caractères (lettres, chiffres, point, tiret ou underscore).");
    }
    if (password.length < 6) {
      return apiError("Mot de passe trop court : au moins 6 caractères.");
    }
    if (pseudo.length < 2) {
      return apiError("Indiquez votre pseudo (au moins 2 caractères).");
    }
    if (!phone) {
      return apiError(phoneErrorHint(body.country));
    }

    // 1. L'identifiant est-il déjà pris ?
    const taken = await db.user.findFirst({ where: { identifier } });
    if (taken) {
      return apiError("Cet identifiant est déjà utilisé. Connectez-vous ou choisissez-en un autre.");
    }

    // 2. DÉTECTION par numéro : un compte existe-t-il déjà avec ce téléphone ?
    const detected = await db.user.findFirst({ where: { phone } });

    if (detected) {
      // a) Le compte détecté a déjà un identifiant → refus (pas de détournement)
      if (detected.identifier && detected.identifier !== identifier) {
        return apiError(
          `Ce numéro est déjà associé au compte « ${detected.fullName} ». Connectez-vous avec son identifiant, ou utilisez un autre numéro.`,
          409,
          { reason: "PHONE_TAKEN" }
        );
      }
      // b) Compte détecté sans identifiant → on associe identifiant + mot de passe
      const { hash, salt } = hashPin(password);
      await db.user.update({
        where: { id: detected.id },
        data: { identifier, passwordHash: hash, passwordSalt: salt },
      });
      await logSecurity(detected.id, "IDENTIFIER_LINKED", `${detected.fullName} — identifiant ${identifier} associé au numéro ${phone}`);
      return openSession(detected.id, deviceName, {
        linked: true,
        user: { id: detected.id, fullName: detected.fullName },
      });
    }

    // 3. Aucun compte détecté → création complète (membre + utilisateur)
    const family = await ensureSeed();
    const branch =
      (await db.branch.findFirst({ where: { familyId: family.id, name: "Branche Douala" } })) ??
      (await db.branch.findFirst({ where: { familyId: family.id } }));
    if (!branch) return apiError("Famille non initialisée. Contactez le secrétaire de famille.", 500);

    const member = await db.member.create({
      data: { familyId: family.id, branchId: branch.id, fullName: pseudo, phone, role: "ADULTE", status: "ACTIF" },
    });
    const { hash, salt } = hashPin(password);
    const user = await db.user.create({
      data: {
        memberId: member.id,
        fullName: pseudo,
        phone,
        identifier,
        passwordHash: hash,
        passwordSalt: salt,
        role: "ADULTE",
      },
    });

    const res = await openSession(user.id, deviceName);
    await notify(user.id, {
      univers: "U1",
      typeCode: "AUTH_WELCOME",
      priority: "NORMALE",
      title: "Bienvenue dans Famille.Mbeutetsa 🌳",
      body: `Votre compte « ${pseudo} » est actif. Conservez votre identifiant « ${identifier} » et votre mot de passe — votre numéro ${phone} permet aussi de vous retrouver.`,
    });
    await notifyAdmins({
      univers: "U1",
      typeCode: "AUTH_REGISTERED_ADMIN",
      priority: "NORMALE",
      title: "Nouveau membre inscrit",
      body: `${pseudo} vient de s'inscrire avec l'identifiant « ${identifier} » — numéro ${phone}.`,
    });
    await logSecurity(user.id, "REGISTERED_IDENTIFIER", `${pseudo} — identifiant ${identifier} — ${phone}`);
    return openSession(user.id, deviceName, {
      linked: false,
      user: { id: user.id, fullName: pseudo },
    });
  }

  /* ──────── Connexion identifiant (ou numéro) + mot de passe ──────── */
  if (action === "login") {
    const rawId = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    const deviceName = cleanDeviceName(body.deviceName);
    if (!rawId || !password) {
      return apiError("Indiquez votre identifiant et votre mot de passe.");
    }

    // Identifiant texte, ou numéro de téléphone comme identifiant (tous pays : E.164 ou CM)
    const phone = normalizePhone(rawId);
    const identifier = phone ? null : normalizeIdentifier(rawId);
    const user = phone
      ? await db.user.findFirst({ where: { phone, passwordHash: { not: null } } })
      : identifier
        ? await db.user.findFirst({ where: { identifier } })
        : null;

    if (!user || !user.passwordHash || !user.passwordSalt) {
      await logSecurity(null, "LOGIN_IDENTIFIER_FAILED", `compte introuvable : ${rawId.slice(0, 30)}`);
      return apiError("Identifiant ou mot de passe incorrect.", 401, { reason: "BAD_CREDENTIALS" });
    }
    if (!verifyPin(password, user.passwordHash, user.passwordSalt)) {
      await logSecurity(user.id, "LOGIN_IDENTIFIER_FAILED", "mot de passe incorrect");
      return apiError("Identifiant ou mot de passe incorrect.", 401, { reason: "BAD_CREDENTIALS" });
    }

    await notify(user.id, {
      univers: "U1",
      typeCode: "AUTH_PASSWORD_LOGIN",
      priority: "NORMALE",
      title: "Connexion par identifiant",
      body: `Vous êtes connecté avec l'identifiant « ${user.identifier ?? user.phone} » sur « ${deviceName} ». Si ce n'était pas vous, signalez-le au secrétaire de famille.`,
    });
    await logSecurity(user.id, "LOGIN_IDENTIFIER", `${user.fullName} — appareil « ${deviceName} »`);
    return openSession(user.id, deviceName, {
      user: { id: user.id, fullName: user.fullName },
    });
  }

  return apiError("Action inconnue.", 400);
}
