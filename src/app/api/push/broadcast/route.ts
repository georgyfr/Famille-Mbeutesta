import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/fc-server";
import { devConfigured, isDevRequest, pushToAllDevices } from "@/lib/fc-dev";

export const runtime = "nodejs";

// POST /api/push/broadcast — [développeur] diffusion manuelle à toute la famille (local)
export async function POST(req: NextRequest) {
  if (!devConfigured()) return apiError("Accès développeur non configuré côté serveur.", 500);
  if (!isDevRequest(req)) return apiError("Code développeur invalide.", 401);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "Annonce de la famille").slice(0, 120);
  const msgBody = String(body.body || "").slice(0, 240);
  try {
    const r = await pushToAllDevices({ title, body: msgBody, tag: "fc-broadcast", url: "/" });
    return apiOk({ sent: r.sent, failed: r.failed });
  } catch (e) {
    return apiError(`Diffusion impossible : ${String(e).slice(0, 120)}`, 502);
  }
}
