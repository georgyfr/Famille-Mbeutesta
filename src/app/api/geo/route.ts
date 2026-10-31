import { NextResponse } from "next/server";

// ─── GET /api/geo ───
// Renvoie le pays d'où provient la requête, pour pré-sélectionner
// automatiquement l'indicatif téléphonique du pays de l'utilisateur.
//
// En production (Cloudflare Pages), c'est le worker qui répond : il lit
// `request.cf.country` (en-tête CF-IPCountry) — gratuit, illimité, sans
// service externe. Ce route Next sert de repli en développement local :
// aucun en-tête de géolocalisation n'existe alors, et le client utilise
// ses propres replis (fuseau horaire, langue du navigateur, Cameroun).
export async function GET(req: Request) {
  const h = req.headers;
  let country: string | null =
    h.get("cf-ipcountry") ||
    h.get("x-vercel-ip-country") ||
    h.get("x-country-code") ||
    null;

  if (country === "XX" || country === "T1") country = null; // inconnu / Tor

  return NextResponse.json(
    { ok: true, country },
    { headers: { "Cache-Control": "no-store" } }
  );
}
