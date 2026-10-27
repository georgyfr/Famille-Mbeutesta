import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/fc-auth";
import { logSecurity } from "@/lib/fc-server";

export const runtime = "nodejs";

// POST /api/auth/logout — ferme la session courante (web uniquement ; mobile : pas de logout)
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const signed = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
      await logSecurity(signed.uid, "LOGOUT", `Session fermée sur l'appareil ${signed.did}`);
    } catch {
      // token invalide : rien à journaliser
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
}
