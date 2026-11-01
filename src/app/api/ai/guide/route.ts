import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// ─── POST /api/ai/guide ───
// Assistant de route « S'y rendre » — guidage assisté par IA (GLM).
//
// Le client envoie le CONTEXTE du guidage (destination, position, trajet,
// prochaines manœuvres, question éventuelle) ; le serveur interroge le modèle
// GLM gratuit et renvoie un conseil court, concret, en français.
//
// En production (Cloudflare Pages), le _worker.js répond : si la variable
// d'environnement GLM_API_KEY (ou ZAI_API_KEY) est configurée, il appelle
// l'API GLM (gratuite) ; sinon il produit un CONSEIL LOCAL intelligent à
// partir des données du trajet — l'application reste utilisable à 100 %.
// Ce route Next sert le développement local via le SDK z-ai (crédits de
// l'environnement).

type GuideBody = {
  mode?: "question" | "conseil";
  question?: string | null;
  destination?: { nom?: string; quartier?: string | null; arrondissement?: string | null; latitude?: number; longitude?: number };
  position?: { latitude?: number; longitude?: number } | null;
  trajet?: { km?: number; minutes?: number; etapes?: string[] } | null;
  restant?: { km?: number; minutes?: number } | null;
  horsTrajet?: boolean;
  suivi?: boolean;
};

function conseilLocal(b: GuideBody): string {
  const dest = b.destination?.nom ? `chez ${b.destination.nom}` : "au rendez-vous";
  const quartier = b.destination?.quartier ? ` (quartier ${b.destination.quartier})` : "";
  const restant = b.restant ? `Il reste environ ${String(b.restant.km).replace(".", ",")} km (~${b.restant.minutes} min). ` : "";
  const etape = b.trajet?.etapes?.[0] ? `Prochaine manœuvre : ${b.trajet.etapes[0]}. ` : "";
  const suivantes = b.trajet?.etapes?.slice(1, 3) ?? [];
  const apres = suivantes.length ? `Ensuite : ${suivantes.join(", puis ")}. ` : "";

  if (b.mode === "question" && b.question) {
    const q = b.question.toLowerCase();
    if (q.includes("perdu") || q.includes("égare") || (b.horsTrajet ?? false)) {
      return `Pas de panique — le trajet vient d'être recalculé depuis votre position réelle. ${restant}${etape}Avancez calmement : la carte se met à jour automatiquement.`;
    }
    if (q.includes("raccourci")) {
      return `Le trajet affiché est déjà le plus court trouvé sur le réseau routier${quartier}. ${restant}${etape}Évitez les pistes non tracées : restez sur le trajet vert, c'est la voie la plus fiable.`;
    }
    if (q.includes("direction") || q.includes("prochaine")) {
      return `${etape}${restant}Continuez sur le trajet vert affiché.`;
    }
    if (q.includes("où") || q.includes("endroit") || q.includes("décris")) {
      return `Le rendez-vous est ${dest}${quartier}${b.destination?.arrondissement ? `, arrondissement ${b.destination.arrondissement}` : ""}. ${restant}Le pin vert sur la carte marque la maison exacte — zoomez jusqu'à voir les bâtiments, puis utilisez le fond « Satellite » pour reconnaître l'entrée.`;
    }
    return `${etape}${apres}${restant}Suivez le trajet vert sur la carte interne.`;
  }

  // Conseil spontané (guidage automatique)
  if (b.horsTrajet) {
    return `Vous vous êtes écarté du trajet — je l'ai recalculé depuis votre position. ${restant}${etape}`;
  }
  if ((b.restant?.km ?? 1) < 0.2) {
    return `Vous y êtes presque ! ${etape}Regardez autour du pin vert : le bénéficiaire peut aussi vous guider par téléphone depuis sa fiche.`;
  }
  return `${etape}${apres}${restant}Bonne route — tout se passe dans l'application.`;
}

export async function POST(req: Request) {
  let b: GuideBody = {};
  try {
    b = (await req.json()) as GuideBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  // Repli immédiat : assistant local (aucune dépendance réseau)
  const secours = conseilLocal(b);

  try {
    const zai = await ZAI.create();
    const dest = b.destination ?? {};
    const contexte = [
      `Destination : chez ${dest.nom ?? "le bénéficiaire"}${dest.quartier ? `, quartier ${dest.quartier}` : ""}${dest.arrondissement ? `, ${dest.arrondissement}` : ""}, Yaoundé (Mfoundi), Cameroun.`,
      b.position?.latitude != null ? `Position actuelle de l'utilisateur : ${b.position.latitude.toFixed(5)}, ${b.position.longitude?.toFixed(5)}.` : "",
      b.trajet ? `Trajet routier total : ${String(b.trajet.km ?? "?").replace(".", ",")} km (~${b.trajet.minutes ?? "?"} min).` : "",
      b.restant ? `Distance restante : ${String(b.restant.km).replace(".", ",")} km (~${b.restant.minutes} min).` : "",
      b.trajet?.etapes?.length ? `Prochaines manœuvres : ${b.trajet.etapes.join(" ; ")}.` : "",
      b.horsTrajet ? "L'utilisateur s'est ÉCARTÉ du trajet (recalcul en cours)." : "",
      b.suivi ? "Le guidage automatique est ACTIF (position suivie en continu)." : "",
    ]
      .filter(Boolean)
      .join("\n");

    const messages = [
      {
        role: "system" as const,
        content:
          "Tu es l'assistant de route de l'application Famille.Mbeutetsa (tontine familiale à Yaoundé, Cameroun). " +
          "Tu aides un membre à rejoindre à pied/en voiture la maison du bénéficiaire de la réunion du mois. " +
          "RÈGLES : réponds UNIQUEMENT en français, ton chaleureux et rassurant ; réponses COURTES (2 à 4 phrases max, ~60 mots) ; " +
          "base-toi STRICTEMENT sur le contexte fourni (distance, manœuvres, quartiers) — n'invente jamais de nom de rue ; " +
          "si l'information manque, dis simplement de suivre le trajet vert et d'appeler le bénéficiaire si besoin ; " +
          "pas de listes à puces, pas de markdown, une seule phrase de conseil concret par idée. " +
          "Tout se passe DANS l'application : ne renvoie jamais vers Google Maps, OpenStreetMap ou un lien externe.",
      },
      {
        role: "user" as const,
        content:
          `${b.mode === "question" ? `Question du membre : « ${b.question ?? ""} »\n\n` : "Donne un conseil de guidage spontané, bref.\n\n"}Contexte du guidage :\n${contexte}`,
      },
    ];

    const res = (await zai.chat.completions.create({ messages })) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = res?.choices?.[0]?.message?.content?.trim();
    if (reply) {
      return NextResponse.json({ ok: true, reply, ai: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ ok: true, reply: secours, ai: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // IA indisponible → conseil local (l'application reste 100 % utilisable)
    return NextResponse.json({ ok: true, reply: secours, ai: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
