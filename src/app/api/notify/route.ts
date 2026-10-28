import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/fc-server";
import { localNtfAppend, localNtfSince, pushToAllDevices } from "@/lib/fc-dev";

export const runtime = "nodejs";

// GET /api/notify/recent?since=<ts> — repli in-app : événements familiaux récents
export async function GET(req: NextRequest) {
  const since = parseInt(req.nextUrl.searchParams.get("since") || "0", 10) || 0;
  return apiOk(localNtfSince(since));
}

// POST /api/notify — événement familial : stocker + diffuser à tous les appareils
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title || "").trim().slice(0, 120);
  const msgBody = String(body.body || "").trim().slice(0, 240);
  const tag = String(body.tag || "famille").slice(0, 60);
  if (!title) return apiError("Titre requis.", 400);

  localNtfAppend({ id: `n-${Date.now().toString(36)}`, title, body: msgBody, tag, at: Date.now() });

  try {
    const r = await pushToAllDevices({
      title,
      body: msgBody,
      tag,
      url: "/",
    });
    return apiOk({ sent: r.sent, failed: r.failed, pruned: r.pruned });
  } catch (e) {
    return apiOk({ sent: 0, failed: 0, note: String(e).slice(0, 140) });
  }
}
