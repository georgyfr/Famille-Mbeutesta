import { NextRequest } from "next/server";
import { apiOk } from "@/lib/fc-server";
import { localNtfSince } from "@/lib/fc-dev";

export const runtime = "nodejs";

// GET /api/notify/recent?since=<ts> — repli in-app : événements familiaux récents
export async function GET(req: NextRequest) {
  const since = parseInt(req.nextUrl.searchParams.get("since") || "0", 10) || 0;
  return apiOk(localNtfSince(since));
}
