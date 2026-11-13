/* Test de la cascade de géolocalisation (v34-quater — LocationIQ).
   Simule le GPS du navigateur sur deux points réels du Cameroun et vérifie
   que detectLocation() renvoie la hiérarchie complète :
   · Yaoundé (Rue Tsoungui Akoa) → Centre · Mfoundi · Yaoundé · Yaoundé III · Ngoa-Ékélé ;
   · Douala (Akwa) → Littoral · Wouri · Douala · Douala I · quartier. */
const normaliser = (x: string) =>
  (x || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

type Point = { nom: string; lat: number; lon: number; attendus: Record<string, string> };
const POINTS: Point[] = [
  {
    nom: "Yaoundé — Rue Tsoungui Akoa",
    lat: 3.848,
    lon: 11.502,
    attendus: { region: "Centre", department: "Mfoundi", city: "Yaoundé", arrondissement: "Yaoundé III", quartier: "Ngoa-Ékélé" },
  },
  {
    nom: "Douala — centre",
    lat: 4.048,
    lon: 9.7,
    attendus: { region: "Littoral", department: "Wouri", city: "Douala", arrondissement: "Douala I" },
  },
];

const { detectLocation } = await import("../src/lib/fc-geo");

let toutOk = true;
for (const p of POINTS) {
  (globalThis as unknown as { navigator: unknown }).navigator = {
    geolocation: {
      getCurrentPosition: (ok: (r: { coords: { latitude: number; longitude: number; accuracy: number } }) => void) =>
        ok({ coords: { latitude: p.lat, longitude: p.lon, accuracy: 30 } }),
    },
  };
  const out = await detectLocation();
  console.log(`\n─── ${p.nom} (méthode : ${out.method}) ───`);
  console.log(JSON.stringify(out.draft, null, 2));
  for (const [champ, attendu] of Object.entries(p.attendus)) {
    const obtenu = (out.draft as unknown as Record<string, string>)[champ] ?? "";
    const pass = normaliser(obtenu).includes(normaliser(attendu));
    if (!pass) toutOk = false;
    console.log(`${pass ? "OK" : "ECHEC"} ${champ} : « ${obtenu} » (attendu ≈ « ${attendu} »)`);
  }
}
console.log(toutOk ? "\nCASCADE COMPLÈTE — TOUS CHAMPS ✓" : "\nÉCHEC — champ(s) manquant(s)");
process.exit(toutOk ? 0 : 1);
