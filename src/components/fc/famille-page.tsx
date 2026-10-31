"use client";

// ─── Onglet Famille : carte de la famille + formulaire « Ma localisation » ───
// Reconstruit fidèlement depuis la version de production (famille-mbeutetsa.pages.dev)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Check, Compass, Copy, Crosshair, Earth, Landmark, LocateFixed, MapPin, MapPinned,
  Navigation, PencilLine, RefreshCw, Route as RouteIcon, Save, ShieldCheck, TriangleAlert, Users,
} from "lucide-react";
import { api } from "@/lib/fc-client";
import { FcButton, FcCard, FcSpinner } from "./ui";

/* ─────────────────────────── Types & constantes ─────────────────────────── */

export type MemberLocation = {
  country: string | null;
  region: string | null;
  department: string | null;
  city: string | null;
  arrondissement: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source?: string | null;
  updatedAt?: string | null;
};

type FamilyMember = {
  id: string;
  fullName: string;
  phone: string;
  isMe: boolean;
  role: string;
  city: string | null;
  region: string | null;
  department: string | null;
  arrondissement: string | null;
  quartier: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  updatedAt: string | null;
};

const EMPTY_DRAFT: MemberLocation = {
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

const REGIONS_CM = ["Adamaoua", "Centre", "Est", "Extrême-Nord", "Littoral", "Nord", "Nord-Ouest", "Ouest", "Sud", "Sud-Ouest"];
const VILLES_CM = [
  "Douala", "Yaoundé", "Bafoussam", "Bamenda", "Garoua", "Maroua", "Ngaoundéré", "Bertoua", "Ebolowa", "Buea",
  "Kribi", "Limbé", "Dschang", "Foumban", "Edéa", "Nkongsamba", "Kumba", "Kousséri",
];
const PAYS_COMMUNS = [
  "Cameroun", "France", "Belgique", "Canada", "États-Unis", "Allemagne", "Italie", "Espagne", "Royaume-Uni",
  "Suisse", "Turquie", "Chine", "Émirats arabes unis", "Afrique du Sud", "Nigeria", "Gabon", "Tchad",
  "République centrafricaine", "Côte d'Ivoire", "Sénégal", "Guinée équatoriale",
];

function pickFirst(addr: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = addr[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function osmLink(loc: { latitude: number; longitude: number }, zoom = 15): string {
  return `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=${zoom}/${loc.latitude}/${loc.longitude}`;
}

/* ─────────────────────────── Détection de position ─────────────────────────── */

async function reverseNominatim(lat: number, lon: number, accuracy: number | null): Promise<MemberLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=16&accept-language=fr&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const j = (await res.json()) as { address?: Record<string, string> };
    const addr = j.address ?? {};
    return {
      country: pickFirst(addr, ["country"]),
      region: pickFirst(addr, ["state", "region", "state_district"]),
      department: pickFirst(addr, ["state_district", "county", "district"]),
      city: pickFirst(addr, ["city", "town", "municipality", "village", "commune"]),
      arrondissement: pickFirst(addr, ["borough", "suburb", "city_district", "district"]),
      quartier: pickFirst(addr, ["neighbourhood", "quarter", "residential"]),
      latitude: lat,
      longitude: lon,
      accuracy,
      source: "gps",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function reverseBigDataCloud(lat: number, lon: number, accuracy: number | null): Promise<MemberLocation> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=fr`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`BigDataCloud HTTP ${res.status}`);
    const j = (await res.json()) as { countryName?: string; principalSubdivision?: string; city?: string; locality?: string };
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
    clearTimeout(timer);
  }
}

async function detectByIp(): Promise<MemberLocation> {
  let last: unknown = null;
  const providers: (() => Promise<{ country?: string; region?: string; city?: string; latitude?: number; longitude?: number }>)[] = [
    async () => {
      const r = await fetch("https://ipapi.co/json/");
      if (!r.ok) throw new Error("ipapi ko");
      return (await r.json()) as { country?: string; region?: string; city?: string; latitude?: number; longitude?: number };
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
      return j;
    },
  ];
  for (const p of providers) {
    try {
      const j = await p();
      if (j.country || j.city) {
        return {
          country: j.country || "",
          region: j.region || "",
          department: "",
          city: j.city || "",
          arrondissement: "",
          quartier: "",
          latitude: typeof j.latitude === "number" ? j.latitude : null,
          longitude: typeof j.longitude === "number" ? j.longitude : null,
          accuracy: null,
          source: "ip",
        };
      }
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("Localisation par IP indisponible.");
}

async function detectPosition(): Promise<{ draft: MemberLocation; method: "gps" | "ip" }> {
  let lat: number | null = null;
  let lon: number | null = null;
  let accuracy: number | null = null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("GPS non disponible sur cet appareil."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    accuracy = typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null;
  } catch {
    /* GPS refusé ou indisponible → réseau */
  }
  if (lat !== null && lon !== null) {
    try {
      return { draft: await reverseNominatim(lat, lon, accuracy), method: "gps" };
    } catch {
      try {
        return { draft: await reverseBigDataCloud(lat, lon, accuracy), method: "gps" };
      } catch {
        return { draft: { ...EMPTY_DRAFT, latitude: lat, longitude: lon, accuracy, source: "gps" }, method: "gps" };
      }
    }
  }
  return { draft: await detectByIp(), method: "ip" };
}

// Ajuste les coordonnées GPS sur l'adresse corrigée (géocodage avant)
async function geocodeAddress(d: MemberLocation): Promise<{ latitude: number; longitude: number } | null> {
  const q = [d.quartier, d.city, d.department, d.region, d.country]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .join(", ");
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const j = (await res.json()) as { lat?: string; lon?: string }[];
    const first = j?.[0];
    const lat = parseFloat(String(first?.lat ?? ""));
    const lon = parseFloat(String(first?.lon ?? ""));
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return { latitude: lat, longitude: lon };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ─────────────────────────── Formulaire « Ma localisation » ─────────────────────────── */

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A4A3A]/8 text-[#2A4A3A]">{icon}</span>
      <span className="pt-1.5 text-[13.5px] leading-snug text-[#2B3530]">{text}</span>
    </li>
  );
}

function Field({
  label, icon, value, onChange, placeholder, options, datalistId,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[];
  datalistId?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[#8A9288]">{label}</span>
      <span className="relative block">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E4D2B]">{icon}</span>}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          list={datalistId}
          className={`h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] text-[15.5px] text-[#2B3530] placeholder:text-[#B7B0A0] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15 ${
            icon ? "pl-10 pr-3" : "px-3.5"
          }`}
          aria-label={label}
        />
        {options && (
          <datalist id={datalistId}>
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </span>
    </label>
  );
}

function ConfirmPanel({ draft, onEdit, onSave }: { draft: MemberLocation; onEdit: () => void; onSave: () => void }) {
  const rows: [string, string][] = [
    ["Pays", draft.country ?? ""],
    ["Région", draft.region ?? ""],
    ["Département", draft.department ?? ""],
    ["Ville / Commune", draft.city ?? ""],
    ["Arrondissement", draft.arrondissement ?? ""],
    ["Quartier", draft.quartier ?? ""],
    [
      "Coordonnées GPS",
      draft.latitude !== null && draft.longitude !== null
        ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}${draft.accuracy ? ` (±${Math.round(draft.accuracy)} m)` : ""}`
        : "—",
    ],
  ];
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-[13.5px] text-[#5C6B60]">
        <MapPinned className="h-4 w-4 text-[#C89F62]" />
        Vérifiez une dernière fois — ces coordonnées guideront la famille jusqu&apos;à vous.
      </p>
      <dl className="mb-5 overflow-hidden rounded-2xl border border-[#E5DCC0]">
        {rows.map(([label, value], i) => (
          <div key={label} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i % 2 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}`}>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-[#8A9288]">{label}</dt>
            <dd className="text-right text-[14px] font-semibold text-[#2B3530]">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <FcButton onClick={onSave} className="h-[54px] text-[16.5px]">
        <Save className="h-5 w-5" /> Enregistrer ma localisation
      </FcButton>
      <button
        onClick={onEdit}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-center text-[13.5px] font-medium text-[#2A4A3A] hover:underline"
      >
        <PencilLine className="h-4 w-4" /> Modifier avant d&apos;enregistrer
      </button>
    </div>
  );
}

export function LocationForm({
  firstRun = false, initial, onSaved, onSkip,
}: {
  firstRun?: boolean;
  initial?: MemberLocation | null;
  onSaved: () => void | Promise<void>;
  onSkip?: () => void;
}) {
  const [step, setStep] = useState<"intro" | "detecting" | "edit" | "confirm" | "saving">(initial ? "edit" : "intro");
  const [draft, setDraft] = useState<MemberLocation>(initial ?? EMPTY_DRAFT);
  const [source, setSource] = useState<string | null>(initial ? initial.source ?? null : null);
  const [warn, setWarn] = useState("");
  const [busy, setBusy] = useState(false);
  const lastSaved = useRef<string>(initial ? JSON.stringify([initial.country, initial.region, initial.department, initial.city, initial.quartier]) : "");

  const upd = (patch: Partial<MemberLocation>) => setDraft((d) => ({ ...d, ...patch }));

  const ajuster = async () => {
    const sig = JSON.stringify([draft.country, draft.region, draft.department, draft.city, draft.quartier]);
    if (lastSaved.current !== sig && ((draft.city ?? "").trim() || (draft.country ?? "").trim())) {
      setBusy(true);
      const geo = await geocodeAddress(draft);
      setBusy(false);
      if (geo) {
        setDraft((d) => ({ ...d, latitude: geo.latitude, longitude: geo.longitude, accuracy: null }));
        toast.success("Coordonnées GPS ajustées sur l'adresse corrigée 🎯");
      }
    }
    setStep("confirm");
  };

  const detecter = async () => {
    setWarn("");
    setStep("detecting");
    try {
      const res = await detectPosition();
      setDraft(res.draft);
      setSource(res.method);
      lastSaved.current = JSON.stringify([res.draft.country, res.draft.region, res.draft.department, res.draft.city, res.draft.quartier]);
      setStep("edit");
      const filled = [res.draft.city, res.draft.region, res.draft.country].filter(Boolean).length;
      toast.success(
        res.method === "gps" ? "Position détectée par le GPS du téléphone 📍" : "Zone approximative détectée par le réseau (activez le GPS pour plus de précision)",
        { description: filled ? undefined : "Complétez les champs ci-dessous si besoin." },
      );
    } catch (e) {
      setStep("edit");
      setSource("manual");
      setWarn(
        e instanceof Error && /GPS/.test(e.message)
          ? "Le GPS n'a pas répondu (permission refusée ou signal indisponible). Remplissez les champs manuellement — c'est tout aussi utile."
          : "Détection automatique indisponible (connexion limitée). Remplissez les champs manuellement.",
      );
    }
  };

  const enregistrer = async () => {
    setStep("saving");
    try {
      const res = await api("/api/me/location", {
        body: { ...draft, source: source ?? "manual" },
      });
      if (!res.ok) throw new Error(res.error);
      toast.success("Votre localisation est enregistrée 🌍", {
        description: "Les membres de la famille pourront vous trouver pour les rencontres.",
      });
      await onSaved();
    } catch (e) {
      setStep("edit");
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };

  const valide = (draft.city ?? "").trim().length >= 2 || (draft.country ?? "").trim().length >= 2 || (draft.latitude !== null && draft.longitude !== null);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1E4D2B] text-white shadow-lg">
          <MapPinned className="h-8 w-8" />
        </div>
        <h1 className="fc-serif text-2xl font-bold text-[#1E4D2B]">{firstRun ? "Où vous trouvez-vous ?" : "Ma localisation"}</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[#5C6B60]">
          {firstRun
            ? "L'application détecte automatiquement votre pays, votre région, votre ville et votre quartier. Vous pourrez corriger chaque champ — c'est utile pour les rencontres de famille : les membres pourront se guider par GPS jusqu'à vous."
            : "Ces coordonnées permettent aux membres de la famille de vous trouver pour les rencontres physiques."}
        </p>
      </div>

      {step === "intro" && (
        <FcCard className="p-6">
          <ul className="mb-5 space-y-3">
            <Bullet icon={<LocateFixed className="h-5 w-5" />} text="Détection automatique par le GPS de votre téléphone (avec votre accord)" />
            <Bullet icon={<Earth className="h-5 w-5" />} text="Pays, région, département, ville, arrondissement et quartier remplis pour vous" />
            <Bullet icon={<PencilLine className="h-5 w-5" />} text="Vous vérifiez et corrigez tout ce que vous voulez avant d'enregistrer" />
            <Bullet icon={<Navigation className="h-5 w-5" />} text="Guidage GPS gratuit entre membres pour les rencontres familiales" />
          </ul>
          <FcButton onClick={detecter} className="h-[54px] text-[17px]">
            <LocateFixed className="h-5 w-5" /> Détecter ma position
          </FcButton>
          <button
            onClick={() => {
              setSource("manual");
              setStep("edit");
            }}
            className="mt-3 w-full text-center text-[13.5px] font-medium text-[#2A4A3A] hover:underline"
          >
            Remplir manuellement à la place
          </button>
          {onSkip && (
            <button onClick={onSkip} className="mt-4 w-full text-center text-[12.5px] text-[#8A9288] hover:underline">
              Passer pour l&apos;instant — je le ferai plus tard
            </button>
          )}
        </FcCard>
      )}

      {step === "detecting" && (
        <FcCard className="flex flex-col items-center gap-4 p-10">
          <span role="status" className="contents">
          <span className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute h-16 w-16 animate-ping rounded-full bg-[#C89F62]/30" />
            <LocateFixed className="h-9 w-9 text-[#1E4D2B]" />
          </span>
          <p className="text-center text-[15px] font-semibold text-[#1E4D2B]">Détection en cours…</p>
          <p className="text-center text-[13px] text-[#8A9288]">Acceptez la demande de position de votre navigateur si elle apparaît.</p>
          <FcSpinner className="mt-1 text-[#C89F62]" />
          </span>
        </FcCard>
      )}

      {(step === "edit" || step === "confirm" || step === "saving") && (
        <FcCard className="p-5 sm:p-6">
          {warn && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 p-3 text-[12.5px] leading-relaxed text-[#7A5B2E]">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {warn}
            </p>
          )}
          {source && (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#3D6B52]/10 px-3 py-1 text-[11.5px] font-semibold text-[#2A4A3A]">
              {source === "gps" ? "📍 Détecté par GPS" : source === "ip" ? "🌐 Zone estimée par le réseau" : "✍️ Saisie manuelle"}
            </p>
          )}
          {step === "edit" && (
            <>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Pays" icon={<Earth className="h-4 w-4" />} value={draft.country ?? ""} onChange={(v) => upd({ country: v })} placeholder="Cameroun" datalistId="fc-countries" options={PAYS_COMMUNS} />
                <Field label="Région" icon={<Compass className="h-4 w-4" />} value={draft.region ?? ""} onChange={(v) => upd({ region: v })} placeholder="Littoral" datalistId="fc-regions" options={REGIONS_CM} />
                <Field label="Département" icon={<Landmark className="h-4 w-4" />} value={draft.department ?? ""} onChange={(v) => upd({ department: v })} placeholder="Wouri" />
                <Field label="Ville / Commune" icon={<Building2 className="h-4 w-4" />} value={draft.city ?? ""} onChange={(v) => upd({ city: v })} placeholder="Douala" datalistId="fc-cities" options={VILLES_CM} />
                <Field label="Arrondissement" icon={<MapPin className="h-4 w-4" />} value={draft.arrondissement ?? ""} onChange={(v) => upd({ arrondissement: v })} placeholder="Douala 2e" />
                <Field label="Quartier" icon={<MapPin className="h-4 w-4" />} value={draft.quartier ?? ""} onChange={(v) => upd({ quartier: v })} placeholder="ex : Akwa, Bonapriso…" />
              </div>
              <div className="mt-4 rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1E4D2B]">Coordonnées GPS</p>
                    {draft.latitude !== null && draft.longitude !== null ? (
                      <p className="truncate text-[12px] text-[#5C6B60]">
                        {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
                        {draft.accuracy ? ` · précision ~${Math.round(draft.accuracy)} m` : ""}
                      </p>
                    ) : (
                      <p className="text-[12px] text-[#8A9288]">Aucune — utile pour le guidage GPS</p>
                    )}
                  </div>
                  <button
                    onClick={detecter}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#C9B98A] px-3 py-2 text-[12.5px] font-semibold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    aria-label="Relancer la détection automatique"
                  >
                    <RefreshCw className="h-4 w-4" /> Détecter
                  </button>
                </div>
                {draft.latitude !== null && draft.longitude !== null && (
                  <a
                    href={osmLink({ latitude: draft.latitude, longitude: draft.longitude })}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#2A4A3A] hover:underline"
                  >
                    <MapPinned className="h-3.5 w-3.5" /> Vérifier ce point sur la carte
                  </a>
                )}
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#8A9288]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Visible uniquement par les membres de la famille, uniquement pour les rencontres.
              </p>
              <FcButton onClick={ajuster} disabled={!valide || busy} className="mt-4 h-[52px]">
                {busy ? (
                  <>
                    <FcSpinner className="h-5 w-5" /> Ajustement des coordonnées…
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" /> C&apos;est correct — vérifier
                  </>
                )}
              </FcButton>
            </>
          )}
          {step === "confirm" && <ConfirmPanel draft={draft} onEdit={() => setStep("edit")} onSave={enregistrer} />}
          {step === "saving" && (
            <div className="flex flex-col items-center gap-3 py-8" role="status">
              <FcSpinner className="h-7 w-7 text-[#C89F62]" />
              <p className="text-[14px] font-medium text-[#1E4D2B]">Enregistrement…</p>
            </div>
          )}
        </FcCard>
      )}
    </div>
  );
}

/* ─────────────────────────── Liste des membres localisés ─────────────────────────── */

function MembreCarte({
  m, distanceLabel, showRoute, from, onCopy, highlight,
}: {
  m: FamilyMember;
  distanceLabel?: string;
  showRoute?: boolean;
  from?: { latitude: number; longitude: number };
  onCopy: (m: FamilyMember) => void;
  highlight?: boolean;
}) {
  return (
    <li className={`rounded-2xl border p-3 ${highlight ? "border-[#C89F62]/60 bg-[#C89F62]/10" : "border-[#E5DCC0] bg-[#FFFDF6]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-[#1E4D2B]">{m.isMe ? `${m.fullName} (vous)` : m.fullName}</p>
          <p className="text-[12.5px] text-[#5C6B60]">
            {[m.quartier, m.arrondissement].filter(Boolean).join(", ")}
            {m.quartier || m.arrondissement ? " — " : ""}
            {[m.city, m.region, m.country].filter(Boolean).join(", ")}
          </p>
          {distanceLabel && (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[#2A4A3A]">
              <MapPin className="h-3 w-3" /> {distanceLabel}
            </p>
          )}
        </div>
        <button
          onClick={() => onCopy(m)}
          className="shrink-0 rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10"
          aria-label={`Copier les coordonnées de ${m.fullName}`}
          title="Copier les coordonnées GPS"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      {showRoute && from && (
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-[#1F5B3F] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#184a33]"
          >
            <Navigation className="h-3.5 w-3.5" /> Y aller (Google Maps)
          </a>
          <a
            href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.latitude},${from.longitude};${m.latitude},${m.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#C9B98A] px-3 py-1.5 text-[12.5px] font-semibold text-[#2A4A3A] hover:bg-[#C89F62]/10"
          >
            <RouteIcon className="h-3.5 w-3.5" /> Itinéraire OSM
          </a>
        </div>
      )}
    </li>
  );
}

/* ─────────────────────────── Onglet Famille (carte) ─────────────────────────── */

declare global {
  interface Window {
    L?: unknown;
  }
}

type LeafletMap = { remove: () => void; setView: (c: [number, number], z?: number) => void };

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

function loadLeaflet(): Promise<unknown> {
  const w = window as { L?: unknown };
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("fc-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "fc-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing = document.getElementById("fc-leaflet-js");
    if (existing) {
      existing.addEventListener("load", () => (w.L ? resolve(w.L) : reject(new Error("Leaflet absent"))));
      existing.addEventListener("error", () => reject(new Error("Leaflet indisponible")));
      return;
    }
    const script = document.createElement("script");
    script.id = "fc-leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => (w.L ? resolve(w.L) : reject(new Error("Leaflet absent")));
    script.onerror = () => reject(new Error("Leaflet indisponible"));
    document.head.appendChild(script);
  });
}

export function FamilleTab({ onEditLocation }: { onEditLocation: () => void }) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ members: FamilyMember[] }>("/api/family/locations");
    if (res.ok) setMembers(res.members);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const moi = useMemo(() => members.find((m) => m.isMe) ?? null, [members]);
  const autres = useMemo(
    () =>
      members
        .filter((m) => !m.isMe)
        .map((m) => ({ ...m, distanceKm: moi ? distanceKm({ latitude: moi.latitude, longitude: moi.longitude }, m) : null }))
        .sort((a, b) =>
          a.distanceKm !== null && b.distanceKm !== null ? a.distanceKm - b.distanceKm : a.fullName.localeCompare(b.fullName, "fr"),
        ),
    [members, moi],
  );

  useEffect(() => {
    let cancelled = false;
    if (loading || mapFailed || members.length === 0) return;
    let map: LeafletMap | null = null;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapDivRef.current || mapRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const leaflet = L as any;
        const m = leaflet.map(mapDivRef.current, { zoomControl: true, attributionControl: true });
        leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
        const points: [number, number][] = [];
        for (const f of members) {
          const svgMe =
            '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#C89F62"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>';
          const svgOther =
            '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#1E4D2B"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>';
          const html = `<img src="data:image/svg+xml;utf8,${encodeURIComponent(f.isMe ? svgMe : svgOther)}" style="width:30px;height:42px" alt=""/>`;
          leaflet
            .marker([f.latitude, f.longitude], {
              icon: leaflet.divIcon({ html, className: "fc-pin", iconSize: [30, 42], iconAnchor: [15, 42], popupAnchor: [0, -40] }),
            })
            .addTo(m)
            .bindPopup(
              `<strong>${escapeHtml(f.isMe ? "Vous" : f.fullName)}</strong><br/><span style="font-size:12px">${escapeHtml([f.city, f.region, f.country].filter(Boolean).join(", "))}</span>`,
            );
          points.push([f.latitude, f.longitude]);
        }
        if (moi && autres.length > 0) {
          for (const a of autres) {
            if (a.distanceKm !== null && a.distanceKm < 300) {
              leaflet
                .polyline(
                  [
                    [moi.latitude, moi.longitude],
                    [a.latitude, a.longitude],
                  ],
                  { color: "#C89F62", weight: 2, opacity: 0.55, dashArray: "6 8" },
                )
                .addTo(m);
            }
          }
        }
        m.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
        map = m;
        mapRef.current = m;
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true);
      });
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      void map;
    };
  }, [loading, mapFailed, members, moi, autres]);

  const copier = async (m: FamilyMember) => {
    const text = `${m.fullName} — ${m.latitude.toFixed(5)}, ${m.longitude.toFixed(5)}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Coordonnées copiées — collez-les dans n'importe quelle application GPS.");
  };

  const fmtDistance = (km: number): string =>
    km < 1 ? `${Math.round(km * 1000)} m` : km < 10 ? `${km.toFixed(1).replace(".", ",")} km` : `${Math.round(km)} km`;

  return (
    <div className="space-y-4">
      <FcCard className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <LocateFixed className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Ma localisation</h3>
          <button
            onClick={load}
            className="ml-auto rounded-lg p-1.5 text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
            aria-label="Rafraîchir"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <p className="py-2 text-[13px] text-[#8A9288]">Chargement…</p>
        ) : moi ? (
          <>
            <p className="text-[15px] font-semibold text-[#2B3530]">{[moi.quartier, moi.arrondissement].filter(Boolean).join(", ") || "—"}</p>
            <p className="text-[13px] text-[#5C6B60]">{[moi.city, moi.department, moi.region, moi.country].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-[11.5px] text-[#8A9288]">
              GPS : {moi.latitude.toFixed(5)}, {moi.longitude.toFixed(5)}
            </p>
            <FcButton variant="outline" onClick={onEditLocation} className="mt-3">
              <PencilLine className="h-4 w-4" /> Corriger ma localisation
            </FcButton>
          </>
        ) : (
          <>
            <p className="text-[13px] text-[#5C6B60]">
              Vous n&apos;avez pas encore enregistré votre position — la famille ne peut pas encore vous trouver.
            </p>
            <FcButton onClick={onEditLocation} className="mt-3">
              <MapPinned className="h-4 w-4" /> Indiquer ma localisation
            </FcButton>
          </>
        )}
      </FcCard>

      <FcCard className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4.5 w-4.5 text-[#C89F62]" />
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-[#8A9288]">Carte de la famille</p>
          </div>
          {moi && !mapFailed && members.length > 0 && (
            <button
              onClick={() => {
                if (mapRef.current && moi) mapRef.current.setView([moi.latitude, moi.longitude], 14);
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
              aria-label="Recentrer sur ma position"
            >
              <Crosshair className="h-3.5 w-3.5" /> Recentrer
            </button>
          )}
        </div>
        {loading ? (
          <p className="py-8 text-center text-[13px] text-[#8A9288]">Chargement de la carte…</p>
        ) : members.length === 0 ? (
          <p className="px-4 pb-5 pt-1 text-center text-[13px] text-[#8A9288]">
            Aucun membre localisé pour l&apos;instant — soyez le premier : votre position servira de point de rendez-vous.
          </p>
        ) : mapFailed ? (
          <p className="px-4 pb-5 pt-1 text-[12.5px] text-[#8A9288]">
            La carte interactive n&apos;a pas pu charger (connexion limitée). La liste ci-dessous reste pleinement fonctionnelle avec
            les liens d&apos;itinéraire.
          </p>
        ) : (
          <div ref={mapDivRef} className="h-[300px] w-full bg-[#E8E4D8]" role="application" aria-label="Carte des membres de la famille" />
        )}
      </FcCard>

      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Membres localisés ({autres.length + (moi ? 1 : 0)})</h3>
        </div>
        {loading ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="py-3 text-center text-[13px] text-[#8A9288]">
            Personne pour l&apos;instant. Chaque membre qui enregistre sa position apparaîtra ici.
          </p>
        ) : (
          <ul className="fc-scroll max-h-96 space-y-2.5 overflow-y-auto pr-1">
            {moi && (
              <MembreCarte m={moi} distanceLabel="Vous êtes ici" onCopy={copier} highlight />
            )}
            {autres.map((m) => (
              <MembreCarte
                key={m.id}
                m={m}
                distanceLabel={m.distanceKm !== null ? `à ${fmtDistance(m.distanceKm)} de vous` : undefined}
                showRoute={!!moi}
                from={moi ? { latitude: moi.latitude, longitude: moi.longitude } : undefined}
                onCopy={copier}
              />
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-[#8A9288]">
          « Y aller » ouvre gratuitement Google Maps (ou OpenStreetMap) avec la position du membre comme destination — le guidage se
          fait comme pour n&apos;importe quelle adresse.
        </p>
      </FcCard>
    </div>
  );
}
