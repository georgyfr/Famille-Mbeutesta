import { apiOk } from "@/lib/fc-server";

export const runtime = "nodejs";

// GET /api/push/public-key — clé publique VAPID pour l'abonnement navigateur
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) return apiError("VAPID non configuré côté serveur.", 500);
  return apiOk({ publicKey });
}
