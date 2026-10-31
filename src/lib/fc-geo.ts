"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Détection de localisation — 100 % GRATUIT, SANS CLÉ API, ILLIMITÉ
//
// Chaîne de détection (dans l'ordre) :
//  1. GPS du navigateur (navigator.geolocation) — gratuit, intégré au téléphone
//  2. Nominatim (OpenStreetMap) — reverse geocoding gratuit, sans clé
//     https://nominatim.openstreetmap.org (usage respecté : 1 requête à la fois)
//  3. BigDataCloud « reverse-geocode-client » — gratuit sans clé côté navigateur
//  4. Localisation par IP (si GPS refusé/indisponible) :
//     ipapi.co → freeipapi.com → ipwho.is (toutes gratuites, sans clé)
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
   Pour le Cameroun : state = Région, state_district/county = Département,
   city = Ville, suburb/city_district = Arrondissement, neighbourhood = Quartier. */

type NominatimAddress = Record<string, string | undefined>;

function pick(a: NominatimAddress, keys: string[]): string {
  for (const k of keys) {
    const v = a[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

function fromNominatim(json: { address?: NominatimAddress; lat?: string; lon?: string }, lat: number, lon: number, accuracy: number | null): LocationDraft {
  const a = json.address ?? {};
  return {
    country: pick(a, ["country"]),
    region: pick(a, ["state", "region", "state_district"]),
    department: pick(a, ["state_district", "county", "district"]),
    city: pick(a, ["city", "town", "municipality", "village", "commune"]),
    arrondissement: pick(a, ["borough", "suburb", "city_district", "district"]),
    quartier: pick(a, ["neighbourhood", "quarter", "residential"]),
    latitude: lat,
    longitude: lon,
    accuracy,
    source: "gps",
  };
}

async function reverseNominatim(lat: number, lon: number, accuracy: number | null): Promise<LocationDraft> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16` +
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

/* ─── 3. BigDataCloud client (secours, sans clé, illimité côté client) ─── */

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
    };
    return {
      country: j.countryName || "",
      region: j.principalSubdivision || "",
      department: "",
      city: j.city || j.locality || "",
      arrondissement: "",
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

/* ─── Détection complète : GPS → reverse geocode → secours IP ─── */

export type DetectOutcome = { draft: LocationDraft; method: "gps" | "ip" };

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
    // Nominatim d'abord (hiérarchie complète), puis BigDataCloud en secours
    try {
      return { draft: await reverseNominatim(lat, lon, accuracy), method: "gps" };
    } catch {
      try {
        return { draft: await reverseBigDataCloud(lat, lon, accuracy), method: "gps" };
      } catch {
        // Coordonnées GPS mais adresse introuvable → on garde les coordonnées
        return {
          draft: { ...EMPTY_DRAFT, latitude: lat, longitude: lon, accuracy, source: "gps" },
          method: "gps",
        };
      }
    }
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
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr` +
    `&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat?: string; lon?: string }[];
    const first = arr?.[0];
    const lat = parseFloat(String(first?.lat ?? ""));
    const lon = parseFloat(String(first?.lon ?? ""));
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
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
