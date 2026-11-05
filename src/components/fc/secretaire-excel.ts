// ─────────────────────────────────────────────────────────────────────────────
// EXPORT EXCEL DU REGISTRE DES ÉPARGNES (v22) — Famille.Mbeutetsa
//
// Demande du président : « je souhaiterais que cela puisse être téléchargé
// en fichier Excel. Il faut qu'il y ait la possibilité de télécharger le
// registre des épargnes sous forme de fichier Excel. »
//
// Génère un VRAI classeur .xlsx (SheetJS) avec :
//   · feuille « Registre des épargnes » — ligne par inscription (membre, rôle,
//     mois rattaché, montant, visa de la secrétaire, date du visa) + totaux ;
//   · feuille « Synthèse par membre » — total épargné, nombre d'inscriptions,
//     part visée — pour la lecture en réunion.
// L'export est client-side : aucune donnée ne quitte l'appareil.
// ─────────────────────────────────────────────────────────────────────────────

import type { AttributionReunion } from "./registres-bureau";
import type { Member } from "./tontine-data";
import { MOIS_FR, ROLE_META } from "./tontine-data";
import type { RoleKey } from "./tontine-data";
import type { VisasEpargnes } from "./secretaire-bureau";

export async function exportRegistreEpargnesExcel(
  epargnes: AttributionReunion[],
  parMembre: Map<string, Member>,
  visas: VisasEpargnes,
): Promise<void> {
  const XLSX = await import("xlsx");

  /* — feuille 1 : le registre, ligne par ligne — */
  const lignes = epargnes.map((e) => {
    const m = parMembre.get(e.membreId);
    const mi = Math.min(11, Math.max(0, e.moisIdx));
    const visa = visas[e.id];
    return {
      Membre: m?.name ?? e.membreId,
      Rôle: m ? (ROLE_META[m.role as RoleKey]?.label ?? m.role) : "—",
      Ville: m?.city ?? "—",
      "Mois rattaché": MOIS_FR[mi],
      "Montant (FCFA)": Math.round(e.montant),
      Visa: visa ? "Visé ✓" : "À viser",
      "Date du visa": visa?.le ?? "",
      "Visé par": visa?.par ?? "",
    };
  });

  const total = epargnes.reduce((s, e) => s + e.montant, 0);
  const nbVisees = epargnes.filter((e) => visas[e.id]).length;
  lignes.push({
    Membre: "TOTAL DU REGISTRE",
    Rôle: `${epargnes.length} inscription(s)`,
    Ville: "",
    "Mois rattaché": "",
    "Montant (FCFA)": Math.round(total),
    Visa: `${nbVisees}/${epargnes.length} visée(s)`,
    "Date du visa": "",
    "Visé par": "",
  });

  const feuille = XLSX.utils.json_to_sheet(lignes);
  feuille["!cols"] = [
    { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 22 },
  ];

  /* — feuille 2 : synthèse par membre — */
  const parMembreRows = [...new Set(epargnes.map((e) => e.membreId))].map((id) => {
    const ses = epargnes.filter((e) => e.membreId === id);
    const m = parMembre.get(id);
    return {
      Membre: m?.name ?? id,
      Rôle: m ? (ROLE_META[m.role as RoleKey]?.label ?? m.role) : "—",
      "Nombre d'inscriptions": ses.length,
      "Total épargné (FCFA)": ses.reduce((s, e) => s + e.montant, 0),
      "Part visée": `${ses.filter((e) => visas[e.id]).length}/${ses.length}`,
    };
  });
  const synthese = XLSX.utils.json_to_sheet(parMembreRows);
  synthese["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 12 }];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, "Registre des épargnes");
  XLSX.utils.book_append_sheet(classeur, synthese, "Synthèse par membre");

  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(classeur, `registre-epargnes-secretaire-${stamp}.xlsx`);
}
