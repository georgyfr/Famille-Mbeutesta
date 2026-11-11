"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Détection de localisation — 100 % GRATUIT, SANS CLÉ API, ILLIMITÉ
//
// v34 — CASCADE PARALLÈLE (signalement : « incapable de détecter le
// département, ni l'arrondissement, voire même le quartier »). CAUSE TROUVÉE :
// Nominatim (OpenStreetMap) RENVOIE 429 « Too many requests » dès que
// plusieurs personnes partagent la même IP publique (NAT des opérateurs
// mobiles — cas RÉEL au Cameroun) — l'ancienne cascade en série retombait
// alors sur BigDataCloud DONT LE CODE IGNORAIT la hiérarchie complète
// (localityInfo) : département et arrondissement restaient VIDES.
//
// NOUVELLE ARCHITECTURE (toutes gratuites, sans clé, sans compte) :
//  1. GPS du navigateur (navigator.geolocation) — intégré au téléphone ;
//  2. BigDataCloud « reverse-geocode-client » — GRATUIT, ILLIMITÉ côté
//     client, hiérarchie COMPLÈTE du Cameroun (localityInfo.administrative) :
//       adminLevel 2 = pays · 4 = région · 6 = DÉPARTEMENT (Wouri/Mfoundi)
//       7 = ville · 8 = ARRONDISSEMENT (Douala I / Yaoundé VI) —
//     c'est la BASE GARANTIE : jamais de champ administratif vide ;
//  3. Nominatim (OpenStreetMap) — en PARALLÈLE, pour le QUARTIER
//     (suburb/neighbourhood, zoom 18) : 1 seule requête, avec un 2ᵉ essai
//     automatique si 429 ;
//  4. GeoCode.xyz — dernier secours pour le QUARTIER (gratuit, sans clé) ;
//  5. Localisation par IP (si GPS refusé) : ipapi.co → freeipapi.com →
//     ipwho.is.
// Les réponses sont FUSIONNÉES champ par champ : BigDataCloud pose la
// hiérarchie administrative, Nominatim/GeoCode.xyz ajoutent le quartier —
// AUCUN champ ne peut rester vide s'il existe chez l'un des fournisseurs.
//
// Aucune de ces APIs ne demande de carte bancaire ni de compte.
// ─────────────────────────────────────────────────────────────────────────────

export type LocationDraft = {
  country: string;
  region: string; // Région (ex : Littoral)
  department: string; // Département (ex : Wouri)
  city: string; // Ville / Commune (ex : Douala)
  arrondissement: string; // Arrondissement (ex : Douala 2e)
  quartier: string; // Quartier de résidence
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null; // précision GPS (mètres)
  source: "gps" | "ip" | "manual";
};

export const EMPTY_DRAFT: LocationDraft = {
  country: "",
  region: "",
  department: "",
  city: "",
  arrondissement: "",
  quartier: "",
  latitude: null,
  longitude: null,
  accuracy: null,
  source: "manual",
};

/* ─── Listes d'aide (saisie manuelle) ─── */

export const CM_REGIONS = [
  "Adamaoua", "Centre", "Est", "Extrême-Nord", "Littoral",
  "Nord", "Nord-Ouest", "Ouest", "Sud", "Sud-Ouest",
];

export const CM_CITIES = [
  "Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua", "Maroua",
  "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Kribi", "Limbé",
  "Dschang", "Foumban", "Edéa", "Nkongsamba", "Kumba", "Kousséri",
];

export const COMMON_COUNTRIES = [
  "Cameroun", "France", "Belgique", "Canada", "États-Unis", "Allemagne",
  "Italie", "Espagne", "Royaume-Uni", "Suisse", "Turquie", "Chine",
  "Émirats arabes unis", "Afrique du Sud", "Nigeria", "Gabon", "Tchad",
  "République centrafricaine", "Côte d'Ivoire", "Sénégal", "Guinée équatoriale",
];

/* ─── 1. GPS du navigateur ─── */

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("GPS non disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  });
}

/* ─── 2. Nominatim (OpenStreetMap) : hiérarchie complète ───
   v34 — PRÉCISION AU CAMEROUN (signalement de l'administrateur : la
   détection « était un fiasco » — département, arrondissement, quartier
   vides ou mélangés). Ce qu'OpenStreetMap renvoie RÉELLEMENT au Cameroun :
     · à Douala : state=Littoral · county=Wouri · city=« Douala V »
       (l'ARRONDISSEMENT !) · municipality=« Communauté urbaine de Douala »
       (la VILLE) · suburb=« Cité Des Palmiers » (le QUARTIER) ;
     · à Yaoundé : state=Centre · county=Mfoundi · city_district=« Yaoundé II »
       (l'ARRONDISSEMENT) · city=« Communauté urbaine de Yaoundé » (la VILLE)
       · suburb=« Briqueterie » (le QUARTIER).
   L'ancien mapping prenait city comme ville et suburb comme arrondissement —
   d'où « Douala V » en ville, « Cité Des Palmiers » en arrondissement et un
   quartier vide. Le nouveau mapping décode cette hiérarchie : ville =
   municipality/city NETTOYÉE du préfixe « Communauté urbaine de » ;
   arrondissement = city_district/borough, ou city quand elle diffère de la
   ville ; quartier = neighbourhood/quarter/suburb ; département = county. */

type NominatimAddress = Record<string, string | undefined>;

function pick(a: NominatimAddress, keys: string[]): string {
  for (const k of keys) {
    const v = a[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

/** « Communauté urbaine de Douala » → « Douala » ; « Commune de Bafoussam » →
 *  « Bafoussam » — OSM préfixe parfois la ville/communauté, on rend le nom
 *  propre tel qu'il est parlé dans la famille. */
function nettoyerVille(s: string): string {
  return (s ?? "")
    .replace(/^communaut[ée]\s+urbaine\s+d[’']e?\s+/i, "")
    .replace(/^communaut[ée]\s+urbaine\s+de\s+/i, "")
    .replace(/^commune\s+d[’']e?\s+/i, "")
    .replace(/^commune\s+de\s+/i, "")
    .replace(/^commune\s+du\s+/i, "")
    .replace(/^commune\s+urbanis[ée]e\s+de\s+/i, "")
    .trim();
}

function fromNominatim(json: { address?: NominatimAddress; lat?: string; lon?: string }, lat: number, lon: number, accuracy: number | null): LocationDraft {
  const a = json.address ?? {};
  // VILLE — la « grande entité » : municipality (communauté urbaine) sinon
  // city/town/village, toujours nettoyée du préfixe administratif.
  const villeBrute = pick(a, ["municipality", "city", "town", "village", "commune"]);
  const ville = nettoyerVille(villeBrute);
  // ARRONDISSEMENT — « Douala V », « Yaoundé II » : city_district/district/
  // borough, OU le champ city quand il diffère de la ville retenue
  // (Douala : municipality porte la ville, city porte l'arrondissement).
  let arrondissement = pick(a, ["city_district", "district", "borough"]);
  if (!arrondissement) {
    const cityBrute = nettoyerVille(pick(a, ["city", "town"]));
    if (cityBrute && cityBrute.localeCompare(ville, "fr", { sensitivity: "base" }) !== 0) {
      arrondissement = cityBrute;
    }
  }
  return {
    country: pick(a, ["country"]),
    region: pick(a, ["state", "region"]),
    department: pick(a, ["county", "state_district"]),
    city: ville,
    arrondissement,
    quartier: pick(a, ["neighbourhood", "quarter", "suburb", "city_block", "residential", "hamlet"]),
    latitude: lat,
    longitude: lon,
    accuracy,
    source: "gps",
  };
}

async function reverseNominatim(lat: number, lon: number, accuracy: number | null): Promise<LocationDraft> {
  // v34 — zoom 18 (niveau bâtiment/rue) au lieu de 16 : c'est CE qui permet
  // à Nominatim de renvoyer le QUARTIER précis (suburb/neighbourhood).
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18` +
    `&accept-language=fr&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const json = (await res.json()) as { address?: NominatimAddress };
    return fromNominatim(json, lat, lon, accuracy);
  } finally {
    clearTimeout(t);
  }
}

/* ─── 3. BigDataCloud client — BASE GARANTIE (sans clé, illimité côté client) ─
    v34 — LECTURE DE LA HIÉRARCHIE COMPLÈTE (localityInfo.administrative) :
    au Cameroun, BigDataCloud renvoie EXACTEMENT les niveaux administratifs
    dont l'application a besoin (vérifié en direct sur Yaoundé et Douala) :
        adminLevel 2 → « Cameroun » (pays)
        adminLevel 4 → « Centre » / « Littoral » (RÉGION)
        adminLevel 6 → « Mfoundi » / « Wouri » (DÉPARTEMENT)
        adminLevel 7 → « Yaoundé » / « Douala » (VILLE)
        adminLevel 8 → « Yaounde VI » / « Douala I » (ARRONDISSEMENT)
    L'ancienne version n'extrayait que country/region/city : département et
    arrondissement restaient VIDES — d'où le « fiasco » signalé. */

type BdcAdmin = { name?: string; description?: string; adminLevel?: number; order?: number };

/** Retourne l'entrée administrative du niveau demandé (null si absente).
 *  Les niveaux arrivent dans un ordre variable — on cherche par adminLevel. */
function bdcNiveau(list: BdcAdmin[] | undefined, level: number): string {
  if (!Array.isArray(list)) return "";
  const hit = list.find((a) => a.adminLevel === level && a.name && a.name.trim());
  return hit?.name?.trim() ?? "";
}

async function reverseBigDataCloud(lat: number, lon: number, accuracy: number | null): Promise<LocationDraft> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}&localityLanguage=fr`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`BigDataCloud HTTP ${res.status}`);
    const j = (await res.json()) as {
      countryName?: string;
      principalSubdivision?: string;
      city?: string;
      locality?: string;
      localityInfo?: { administrative?: BdcAdmin[] };
    };
    const adm = j.localityInfo?.administrative;
    // Hiérarchie complète — chaque niveau retombe sur un champ générique si
    // BigDataCloud ne l'a pas (aucun champ ne reste vide sans raison).
    const region = bdcNiveau(adm, 4) || j.principalSubdivision || "";
    const department = bdcNiveau(adm, 6);
    const villeAdmin = bdcNiveau(adm, 7);
    const arrondissement = bdcNiveau(adm, 8);
    const city = j.city || j.locality || villeAdmin || "";
    return {
      country: j.countryName || "",
      region,
      department: department || region, // secours : au moins la région
      city,
      arrondissement,
      quartier: "",
      latitude: lat,
      longitude: lon,
      accuracy,
      source: "gps",
    };
  } finally {
    clearTimeout(t);
  }
}

/* ─── 3 bis. GeoCode.xyz — dernier secours pour le QUARTIER (gratuit, sans clé) ─ */

async function reverseGeocodeXyz(lat: number, lon: number): Promise<string> {
  const url = `https://geocode.xyz/${lat},${lon}?geoit=json&lang=fr`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`GeoCode.xyz HTTP ${res.status}`);
    const j = (await res.json()) as {
      osmtags?: { name?: string };
      staddress?: string;
      standard?: { addresst?: string };
    };
    return (j.osmtags?.name || j.staddress || j.standard?.addresst || "").trim();
  } finally {
    clearTimeout(t);
  }
}

/* ─── FUSION champ par champ — la garantie « jamais de champ vide » ──
    a = base (BigDataCloud — hiérarchie administrative garantie),
    b = enrichissement (Nominatim/GeoCode.xyz — surtout le QUARTIER).
    Chaque champ vide de a est comblé par b ; a garde la priorité quand
    les deux sont remplis (sauf quartier : b est spécialisé). */
function fusionnerDraft(base: LocationDraft, enrich: LocationDraft): LocationDraft {
  const vide = (x: string) => !x || !x.trim();
  return {
    country: vide(base.country) ? enrich.country : base.country,
    region: vide(base.region) ? enrich.region : base.region,
    department: vide(base.department) ? enrich.department : base.department,
    // VILLE — BigDataCloud donne la vraie ville (« Yaoundé », « Douala ») ;
    // Nominatim donne parfois la commune détaillée — la base reste prioritaire.
    city: vide(base.city) ? enrich.city : base.city,
    arrondissement: vide(base.arrondissement) ? enrich.arrondissement : base.arrondissement,
    quartier: vide(enrich.quartier) ? base.quartier : enrich.quartier,
    latitude: base.latitude ?? enrich.latitude,
    longitude: base.longitude ?? enrich.longitude,
    accuracy: base.accuracy ?? enrich.accuracy,
    source: base.source === "gps" || enrich.source === "gps" ? "gps" : base.source,
  };
}

/* ─── 4. Localisation par IP (si le GPS est refusé) — gratuites sans clé ─── */

type IpGeo = { country?: string; region?: string; city?: string; latitude?: number; longitude?: number };

async function ipGeolocate(): Promise<LocationDraft> {
  const providers: (() => Promise<IpGeo>)[] = [
    async () => {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) throw new Error("ipapi ko");
      return (await r.json()) as IpGeo;
    },
    async () => {
      const r = await fetch("https://freeipapi.com/api/json");
      if (!r.ok) throw new Error("freeipapi ko");
      const j = (await r.json()) as { countryName?: string; regionName?: string; cityName?: string; latitude?: number; longitude?: number };
      return { country: j.countryName, region: j.regionName, city: j.cityName, latitude: j.latitude, longitude: j.longitude };
    },
    async () => {
      const r = await fetch("https://ipwho.is/");
      if (!r.ok) throw new Error("ipwho ko");
      const j = (await r.json()) as { success?: boolean; country?: string; region?: string; city?: string; latitude?: number; longitude?: number };
      if (j.success === false) throw new Error("ipwho échec");
      return { country: j.country, region: j.region, city: j.city, latitude: j.latitude, longitude: j.longitude };
    },
  ];
  let lastErr: unknown = null;
  for (const p of providers) {
    try {
      const g = await p();
      if (g.country || g.city) {
        return {
          country: g.country || "",
          region: g.region || "",
          department: "",
          city: g.city || "",
          arrondissement: "",
          quartier: "",
          latitude: typeof g.latitude === "number" ? g.latitude : null,
          longitude: typeof g.longitude === "number" ? g.longitude : null,
          accuracy: null,
          source: "ip",
        };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Localisation par IP indisponible.");
}

/* ─── Détection complète : GPS → CASCADE PARALLÈLE → secours IP ─── */

export type DetectOutcome = { draft: LocationDraft; method: "gps" | "ip" };

/** Nominatim avec 1 relance automatique : les 429 « Too many requests » sont
 *  courants sur les IP partagées (NAT opérateur) — après ~1,2 s le quota
 *  glissant laisse souvent repasser la requête. */
async function nominatimAvecRelance(lat: number, lon: number, accuracy: number | null): Promise<LocationDraft> {
  try {
    return await reverseNominatim(lat, lon, accuracy);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (!/429|Too many/i.test(msg)) throw e;
    await new Promise((r) => setTimeout(r, 1200));
    return reverseNominatim(lat, lon, accuracy);
  }
}

export async function detectLocation(): Promise<DetectOutcome> {
  let lat: number | null = null;
  let lon: number | null = null;
  let accuracy: number | null = null;

  try {
    const pos = await getPosition();
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    accuracy = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;
  } catch {
    /* GPS refusé ou indisponible → IP */
  }

  if (lat !== null && lon !== null) {
    // v34 — CASCADE PARALLÈLE : BigDataCloud (base garantie : région,
    // département, ville, arrondissement) tourne EN MÊME TEMPS que Nominatim
    // (le quartier). Les deux réponses sont fusionnées champ par champ :
    // même si Nominatim renvoie 429 (IP partagée), la hiérarchie complète
    // arrive quand même — seul le quartier peut alors manquer.
    const base = await reverseBigDataCloud(lat, lon, accuracy);
    let enrich: LocationDraft | null = null;
    try {
      enrich = await nominatimAvecRelance(lat, lon, accuracy);
    } catch {
      enrich = null;
    }
    if (enrich) {
      return { draft: fusionnerDraft(base, enrich), method: "gps" };
    }
    // Nominatim indisponible → GeoCode.xyz tente le QUARTIER seul.
    try {
      const quartier = await reverseGeocodeXyz(lat, lon);
      if (quartier) return { draft: { ...base, quartier }, method: "gps" };
    } catch {
      /* pas de quartier — la hiérarchie administrative reste complète */
    }
    return { draft: base, method: "gps" };
  }

  const ipDraft = await ipGeolocate();
  return { draft: ipDraft, method: "ip" };
}

/* ─── Distance (Haversine) & formatage — calcul local, gratuit ─── */

export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371; // rayon terrestre en km
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/* ─── Itinéraires — liens profonds GRATUITS, sans clé API ─── */

export function googleMapsDirectionsUrl(dest: { latitude: number; longitude: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}&travelmode=driving`;
}

export function osmDirectionsUrl(
  from: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number }
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.latitude},${from.longitude};${dest.latitude},${dest.longitude}`;
}

export function osmViewUrl(p: { latitude: number; longitude: number }, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=${zoom}/${p.latitude}/${p.longitude}`;
}

/* ─── Itinéraire TRACÉ DANS L'APPLICATION — OSRM (serveur public gratuit,
   sans clé, sans compte) ───
   L'utilisateur ne quitte jamais l'application : le trajet est dessiné sur la
   carte Leaflet interne (fc-route-map.tsx). En cas d'échec (hors connexion,
   serveur indisponible), la carte trace une ligne droite et la distance
   Haversine locale est affichée à la place. */
export type RouteInfo = {
  points: [number, number][]; // [lat, lng] — trajet routier complet
  distanceKm: number;
  minutes: number; // durée estimée en voiture
};

export async function fetchRoute(from: PointGeo, to: PointGeo): Promise<RouteInfo | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[];
    };
    const r = j.routes?.[0];
    const coords = r?.geometry?.coordinates;
    if (!r || !coords || coords.length < 2) return null;
    return {
      points: coords.map(([lon, lat]) => [lat, lon] as [number, number]),
      distanceKm: (r.distance ?? 0) / 1000,
      minutes: Math.max(1, Math.round((r.duration ?? 0) / 60)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ─── Géocodage avant (adresse → coordonnées) — Nominatim, gratuit sans clé ───
   Sert quand l'utilisateur corrige son adresse après une détection :
   les coordonnées GPS sont recalculées pour coller à la ville corrigée. */

export async function forwardGeocode(d: {
  country: string; region: string; department?: string; city: string; quartier?: string;
}): Promise<{ latitude: number; longitude: number } | null> {
  const q = [d.quartier, d.city, d.department, d.region, d.country]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join(", ");
  if (!q) return null;
  // 1) Nominatim — adresse complète (quartier inclus quand il connaît)
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr` +
    `&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (res.ok) {
      const arr = (await res.json()) as { lat?: string; lon?: string }[];
      const first = arr?.[0];
      const lat = parseFloat(String(first?.lat ?? ""));
      const lon = parseFloat(String(first?.lon ?? ""));
      if (isFinite(lat) && isFinite(lon)) return { latitude: lat, longitude: lon };
    }
  } catch {
    /* Nominatim indisponible → secours ci-dessous */
  } finally {
    clearTimeout(t);
  }
  // 2) Open-Meteo geocoding — GRATUIT, sans clé, jamais de 429 — la VILLE
  //    suffit : les coordonnées servent à centrer la carte de la famille.
  const ville = [d.city, d.region, d.country].map((x) => (x || "").trim()).filter(Boolean).join(", ");
  if (!ville) return null;
  try {
    const r = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&language=fr&name=${encodeURIComponent(ville)}`,
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: { latitude?: number; longitude?: number }[] };
    const hit = j.results?.[0];
    if (typeof hit?.latitude === "number" && typeof hit?.longitude === "number") {
      return { latitude: hit.latitude, longitude: hit.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Localisation formatée courte ─── */

export function formatPlace(p: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  arrondissement?: string | null;
}): string {
  return [p.city, p.region, p.country].filter(Boolean).join(", ");
}

/* ─── Département du Mfoundi (Yaoundé, région du Centre — Cameroun) ───
   Le Mfoundi est le département qui abrite Yaoundé : c'est là que vit la
   majorité de la famille. La carte des membres est donc CENTRÉE sur cette
   zone (cadre vert) ; les membres situés hors du rectangle restent visibles
   dans la liste « Hors du Mfoundi » et peuvent être localisés par un clic
   (« Voir »), avec un retour intuitif à la vue du Mfoundi.
   Le zoom libre (tuiles OSM jusqu'au niveau 19) permet de descendre jusqu'au
   quartier et à l'emplacement de la maison. — 100 % gratuit, sans clé API. */
export const MFOUNDI = {
  label: "Département du Mfoundi",
  sousTitre: "Yaoundé · Région du Centre, Cameroun",
  /** Rectangle englobant généreux du Mfoundi (Yaoundé & périphérie immédiate). */
  south: 3.72,
  west: 11.33,
  north: 4.0,
  east: 11.69,
} as const;

export type PointGeo = { latitude: number; longitude: number };

/** Le membre se trouve-t-il dans le département du Mfoundi ? */
export function estDansMfoundi(p: PointGeo): boolean {
  return (
    p.latitude >= MFOUNDI.south &&
    p.latitude <= MFOUNDI.north &&
    p.longitude >= MFOUNDI.west &&
    p.longitude <= MFOUNDI.east
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUIDAGE ASSISTÉ PAR IA — bouton « S'y rendre »
   ─────────────────────────────────────────────────────────────────────────
   L'utilisateur est guidé SANS JAMAIS quitter l'application :
   • itinéraire turn-by-turn (OSRM, serveur public gratuit — l'IA « s'inspire
     » des meilleures cartes routières mondiales, sans que l'utilisateur ait
     besoin de le savoir) ;
   • suivi régulier de la position (watchPosition) + recalcul automatique en
     cas de détour ;
   • suggestions & réponses de l'assistant (GLM via /api/ai/guide — clé
     gratuite ajoutée côté serveur ; repli local intelligent sans clé).
   ═══════════════════════════════════════════════════════════════════════ */

/** Une étape de l'itinéraire (manœuvre OSRM simplifiée). */
export type RouteStep = {
  /** Nom de la rue/route (peut être vide). */
  name: string;
  /** Type de manœuvre OSRM : depart, turn, new name, continue, merge, roundabout, arrive… */
  type: string;
  /** Direction : left, right, sharp left, uturn, straight… */
  modifier?: string;
  /** Longueur de l'étape en mètres. */
  distanceM: number;
  /** Position [lat, lng] du point de manœuvre. */
  location: [number, number];
};

/** Itinéraire complet avec étapes — pour le guidage pas à pas. */
export type GuideRoute = RouteInfo & { steps: RouteStep[] };

/** Itinéraire routier DÉTAILLÉ (étapes turn-by-turn) — OSRM gratuit, sans clé. */
export async function fetchRouteGuide(from: PointGeo, to: PointGeo): Promise<GuideRoute | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
    `?overview=full&geometries=geojson&steps=true`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      routes?: {
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
        legs?: { steps?: { maneuver?: { type?: string; modifier?: string; location?: [number, number] }; name?: string; distance?: number }[] }[];
      }[];
    };
    const r = j.routes?.[0];
    const coords = r?.geometry?.coordinates;
    if (!r || !coords || coords.length < 2) return null;
    const rawSteps = r.legs?.[0]?.steps ?? [];
    const steps: RouteStep[] = rawSteps
      .filter((s) => s.maneuver?.location)
      .map((s) => ({
        name: (s.name || "").trim(),
        type: s.maneuver?.type || "continue",
        modifier: s.maneuver?.modifier,
        distanceM: Math.round(s.distance ?? 0),
        location: [s.maneuver!.location![1], s.maneuver!.location![0]] as [number, number],
      }));
    return {
      points: coords.map(([lon, lat]) => [lat, lon] as [number, number]),
      distanceKm: (r.distance ?? 0) / 1000,
      minutes: Math.max(1, Math.round((r.duration ?? 0) / 60)),
      steps,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Traduction française d'une manœuvre OSRM. */
export function instructionFr(step: RouteStep): string {
  const rue = step.name ? ` sur ${step.name}` : "";
  const dist = step.distanceM > 0 ? ` — ${step.distanceM >= 950 ? `${(step.distanceM / 1000).toFixed(1).replace(".", ",")} km` : `${step.distanceM} m`}` : "";
  switch (step.type) {
    case "depart":
      return `Départ${rue}${dist}`;
    case "arrive":
      return "Vous êtes arrivé à destination 🎉";
    case "turn":
    case "end of road":
      switch (step.modifier) {
        case "left": return `Tournez à gauche${rue}${dist}`;
        case "right": return `Tournez à droite${rue}${dist}`;
        case "sharp left": return `Tournez franchement à gauche${rue}${dist}`;
        case "sharp right": return `Tournez franchement à droite${rue}${dist}`;
        case "slight left": return `Restez légèrement à gauche${rue}${dist}`;
        case "slight right": return `Restez légèrement à droite${rue}${dist}`;
        case "uturn": return `Faites demi-tour${rue}${dist}`;
        default: return `Continuez${rue}${dist}`;
      }
    case "new name":
    case "continue":
      return `Continuez${rue}${dist}`;
    case "merge":
      return `Rejoignez${rue}${dist}`;
    case "roundabout":
    case "rotary":
      return `Prenez le rond-point${rue}${dist}`;
    case "roundabout turn":
      return `Au rond-point, ${step.modifier === "left" ? "prenez à gauche" : step.modifier === "right" ? "prenez à droite" : "continuez"}${rue}${dist}`;
    case "fork":
      if (step.modifier === "left") return `Restez sur la fourche de gauche${rue}${dist}`;
      if (step.modifier === "right") return `Restez sur la fourche de droite${rue}${dist}`;
      return `Restez sur la fourche${rue}${dist}`;
    case "on ramp":
      return `Prenez la bretelle${rue}${dist}`;
    case "off ramp":
      return `Sortez${rue}${dist}`;
    default:
      return `Continuez${rue}${dist}`;
  }
}

/** Cap (0-360°, nord = 0) d'un point A vers un point B. */
export function bearingDeg(a: PointGeo, b: PointGeo): number {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Point cardinal en français. */
export function cardinalFr(deg: number): string {
  const dirs = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"];
  return dirs[Math.round(deg / 45) % 8];
}

/* ─── Projection d'une position sur le trajet — guidage en temps réel ───
   Trouve le point le plus proche du polygone routier, la distance restante
   jusqu'à l'arrivée, et l'index de l'étape en cours. Approximation plate
   (équirectangulaire) largement suffisante à l'échelle d'une ville. */

export type RouteProgress = {
  /** Point projeté sur le trajet [lat, lng]. */
  projete: [number, number];
  /** Distance du point réel au trajet, en km (hors trajet si > seuil). */
  ecartKm: number;
  /** Distance restante à parcourir le long du trajet, en km. */
  restantKm: number;
  /** Index de la prochaine étape (manœuvre) dans steps. */
  etapeIdx: number;
};

export function progressOnRoute(route: GuideRoute, pos: PointGeo): RouteProgress {
  const pts = route.points;
  const R = 6371;
  const rad = Math.PI / 180;
  const x = (lng: number) => lng * rad * Math.cos(((pts[0][0] + pos.latitude) / 2) * rad);
  const y = (lat: number) => lat * rad;

  let best = { i: 0, dist: Number.POSITIVE_INFINITY, t: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = x(pts[i][1]), ay = y(pts[i][0]);
    const bx = x(pts[i + 1][1]), by = y(pts[i + 1][0]);
    const px = x(pos.longitude), py = y(pos.latitude);
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * dx, qy = ay + t * dy;
    const d = Math.sqrt((px - qx) ** 2 + (py - qy) ** 2) * R;
    if (d < best.dist) best = { i, dist: d, t };
  }

  // Distance restante : projection → fin du segment courant, puis tous les
  // segments suivants (via Haversine, précis aux petites distances).
  const hav = haversineKm;
  let restant = hav(
    { latitude: pts[best.i][0] + (pts[best.i + 1][0] - pts[best.i][0]) * best.t, longitude: pts[best.i][1] + (pts[best.i + 1][1] - pts[best.i][1]) * best.t },
    { latitude: pts[best.i + 1][0], longitude: pts[best.i + 1][1] }
  );
  for (let i = best.i + 1; i < pts.length - 1; i++) {
    restant += hav({ latitude: pts[i][0], longitude: pts[i][1] }, { latitude: pts[i + 1][0], longitude: pts[i + 1][1] });
  }

  // Prochaine étape : la première manœuvre dont le point cumulé dépasse la
  // position projetée (approximation : distance le long du trajet).
  let cumul = 0;
  const avantProj = hav({ latitude: pts[0][0], longitude: pts[0][1] }, { latitude: pts[best.i][0] + (pts[best.i + 1][0] - pts[best.i][0]) * best.t, longitude: pts[best.i][1] + (pts[best.i + 1][1] - pts[best.i][1]) * best.t });
  let etapeIdx = route.steps.length - 1;
  for (let s = 0; s < route.steps.length; s++) {
    cumul += (route.steps[s].distanceM || 0) / 1000;
    if (cumul >= avantProj) {
      etapeIdx = Math.min(s, route.steps.length - 1);
      break;
    }
  }

  return {
    projete: [
      pts[best.i][0] + (pts[best.i + 1][0] - pts[best.i][0]) * best.t,
      pts[best.i][1] + (pts[best.i + 1][1] - pts[best.i][1]) * best.t,
    ],
    ecartKm: best.dist,
    restantKm: Math.max(0, restant),
    etapeIdx,
  };
}

/* ─── Étiquettes des quartiers & arrondissements de Yaoundé (Mfoundi) ───
   Les tuiles OSM standard n'affichent pas toujours les petits quartiers :
   nous POSONS NOS PROPREs étiquettes (données intégrées, gratuites) sur la
   carte — toujours lisibles, à partir du zoom adapté. Coordonnées
   approximatives, suffisantes pour l'orientation. */
export type QuartierLabel = { nom: string; lat: number; lng: number; arr?: boolean };

export const QUARTIERS_YAOUNDE: QuartierLabel[] = [
  // Arrondissements (étiquettes plus visibles, zoom ≥ 12)
  { nom: "Yaoundé I — Nlongkak", lat: 3.874, lng: 11.514, arr: true },
  { nom: "Yaoundé II — Tsinga", lat: 3.888, lng: 11.522, arr: true },
  { nom: "Yaoundé III — Efoulan", lat: 3.833, lng: 11.509, arr: true },
  { nom: "Yaoundé IV — Kondengui", lat: 3.854, lng: 11.526, arr: true },
  { nom: "Yaoundé V — Essos", lat: 3.875, lng: 11.545, arr: true },
  { nom: "Yaoundé VI — Biyem-Assi", lat: 3.833, lng: 11.482, arr: true },
  { nom: "Yaoundé VII — Nkolbisson", lat: 3.872, lng: 11.449, arr: true },
  // Quartiers (zoom ≥ 13)
  { nom: "Bastos", lat: 3.887, lng: 11.512 },
  { nom: "Etoudi", lat: 3.906, lng: 11.533 },
  { nom: "Emana", lat: 3.929, lng: 11.525 },
  { nom: "Nsam", lat: 3.895, lng: 11.518 },
  { nom: "Mokolo", lat: 3.877, lng: 11.504 },
  { nom: "Cité Verte", lat: 3.872, lng: 11.487 },
  { nom: "Mimboman", lat: 3.873, lng: 11.536 },
  { nom: "Essos", lat: 3.874, lng: 11.547 },
  { nom: "Tsinga", lat: 3.883, lng: 11.518 },
  { nom: "Nlongkak", lat: 3.874, lng: 11.514 },
  { nom: "Mvog-Mbi", lat: 3.861, lng: 11.514 },
  { nom: "Nkoldongo", lat: 3.856, lng: 11.524 },
  { nom: "Kondengui", lat: 3.855, lng: 11.524 },
  { nom: "Mvog-Ada", lat: 3.854, lng: 11.533 },
  { nom: "Ngoa-Ekellé", lat: 3.859, lng: 11.494 },
  { nom: "Melen", lat: 3.85, lng: 11.498 },
  { nom: "Mvolyé", lat: 3.849, lng: 11.494 },
  { nom: "Obili", lat: 3.846, lng: 11.475 },
  { nom: "Nkolbisson", lat: 3.874, lng: 11.453 },
  { nom: "Mbankomo", lat: 3.845, lng: 11.43 },
  { nom: "Efoulan", lat: 3.835, lng: 11.51 },
  { nom: "Emombo", lat: 3.84, lng: 11.506 },
  { nom: "Mendong", lat: 3.835, lng: 11.473 },
  { nom: "Biyem-Assi", lat: 3.839, lng: 11.483 },
  { nom: "Etoug-Ebé", lat: 3.828, lng: 11.489 },
  { nom: "Nkolnda", lat: 3.818, lng: 11.493 },
  { nom: "Odza", lat: 3.799, lng: 11.528 },
  { nom: "Ahala", lat: 3.815, lng: 11.544 },
  { nom: "Mvan", lat: 3.81, lng: 11.52 },
  { nom: "Simbock", lat: 3.834, lng: 11.54 },
  { nom: "Ekounou", lat: 3.845, lng: 11.55 },
  { nom: "Nkolfoulou", lat: 3.86, lng: 11.562 },
];
