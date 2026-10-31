"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Assistant de localisation — Famille.Mbeutetsa
//
// Après l'inscription, l'application demande OÙ SE TROUVE la personne :
// pays, région, département, ville, arrondissement et quartier.
//
//  1. DÉTECTION AUTOMATIQUE (gratuite, sans clé API) :
//     GPS du téléphone → OpenStreetMap/Nominatim → secours par IP.
//  2. VÉRIFICATION & CORRECTION : tous les champs restent modifiables,
//     avec des listes d'aide (régions et villes du Cameroun, pays courants).
//  3. CONFIRMATION & ENREGISTREMENT : récapitulatif clair puis enregistrement.
//
// Ces coordonnées servent aux rencontres physiques : les membres peuvent se
// localiser sur une carte et se guider par GPS (Google Maps / OpenStreetMap).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/fc-client";
import {
  CM_CITIES, CM_REGIONS, COMMON_COUNTRIES, EMPTY_DRAFT, detectLocation, forwardGeocode, osmViewUrl,
  type LocationDraft,
} from "@/lib/fc-geo";
import { FcButton, FcCard, FcSpinner } from "./ui";
import {
  AlertTriangle, Building2, Check, Compass, Globe2, Landmark, LocateFixed,
  MapPin, MapPinned, Navigation, PencilLine, RefreshCw, Save, ShieldCheck,
} from "lucide-react";

type StepName = "intro" | "detecting" | "edit" | "confirm" | "saving";

export function LocationWizard({
  firstRun = false,
  initial,
  onSaved,
  onSkip,
}: {
  firstRun?: boolean;
  initial?: LocationDraft | null;
  onSaved: () => void;
  onSkip?: () => void;
}) {
  const [step, setStep] = useState<StepName>(initial ? "edit" : "intro");
  const [draft, setDraft] = useState<LocationDraft>(initial ?? EMPTY_DRAFT);
  const [method, setMethod] = useState<"gps" | "ip" | "manual" | null>(initial ? initial.source : null);
  const [error, setError] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  // Instantané de l'adresse au moment de la détection : si l'utilisateur corrige
  // ensuite les champs, les coordonnées GPS sont recalculées (géocodage gratuit).
  const detectedAddrRef = useRef<string>(initial ? JSON.stringify([initial.country, initial.region, initial.department, initial.city, initial.quartier]) : "");

  const set = (patch: Partial<LocationDraft>) => setDraft((d) => ({ ...d, ...patch }));

  /* ── Passage à la confirmation : si l'adresse a été corrigée, on recalcule
       les coordonnées GPS pour qu'elles collent à la ville corrigée ── */
  const proceedToConfirm = async () => {
    const addrNow = JSON.stringify([draft.country, draft.region, draft.department, draft.city, draft.quartier]);
    const addrChanged = detectedAddrRef.current !== addrNow;
    if (addrChanged && (draft.city.trim() || draft.country.trim())) {
      setAdjusting(true);
      const geo = await forwardGeocode({
        country: draft.country, region: draft.region,
        department: draft.department, city: draft.city, quartier: draft.quartier,
      });
      setAdjusting(false);
      if (geo) {
        setDraft((d) => ({ ...d, latitude: geo.latitude, longitude: geo.longitude, accuracy: null }));
        toast.success("Coordonnées GPS ajustées sur l'adresse corrigée 🎯");
      }
    }
    setStep("confirm");
  };

  /* ─── 1. Détection automatique ─── */
  const runDetect = async () => {
    setError("");
    setStep("detecting");
    try {
      const outcome = await detectLocation();
      setDraft(outcome.draft);
      setMethod(outcome.method);
      detectedAddrRef.current = JSON.stringify([
        outcome.draft.country, outcome.draft.region, outcome.draft.department,
        outcome.draft.city, outcome.draft.quartier,
      ]);
      setStep("edit");
      const filled = [outcome.draft.city, outcome.draft.region, outcome.draft.country].filter(Boolean).length;
      toast.success(
        outcome.method === "gps"
          ? "Position détectée par le GPS du téléphone 📍"
          : "Zone approximative détectée par le réseau (activez le GPS pour plus de précision)",
        { description: filled ? undefined : "Complétez les champs ci-dessous si besoin." }
      );
    } catch (e) {
      setStep("edit");
      setMethod("manual");
      setError(
        e instanceof Error && /GPS/.test(e.message)
          ? "Le GPS n'a pas répondu (permission refusée ou signal indisponible). Remplissez les champs manuellement — c'est tout aussi utile."
          : "Détection automatique indisponible (connexion limitée). Remplissez les champs manuellement."
      );
    }
  };

  /* ─── 3. Enregistrement ─── */
  const save = async () => {
    setStep("saving");
    try {
      const res = await api("/api/me/location", { body: { ...draft, source: method ?? "manual" } });
      if (!res.ok) throw new Error(res.error);
      toast.success("Votre localisation est enregistrée 🌍", {
        description: "Les membres de la famille pourront vous trouver pour les rencontres.",
      });
      onSaved();
    } catch (e) {
      setStep("edit");
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
  };

  const canContinue = draft.city.trim().length >= 2 || draft.country.trim().length >= 2 ||
    (draft.latitude !== null && draft.longitude !== null);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      {/* En-tête */}
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1E4D2B] text-white shadow-lg">
          <MapPinned className="h-8 w-8" />
        </div>
        <h1 className="fc-serif text-2xl font-bold text-[#1E4D2B]">
          {firstRun ? "Où vous trouvez-vous ?" : "Ma localisation"}
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[#5C6B60]">
          {firstRun
            ? "L'application détecte automatiquement votre pays, votre région, votre ville et votre quartier. Vous pourrez corriger chaque champ — c'est utile pour les rencontres de famille : les membres pourront se guider par GPS jusqu'à vous."
            : "Ces coordonnées permettent aux membres de la famille de vous trouver pour les rencontres physiques."}
        </p>
      </div>

      {step === "intro" && (
        <FcCard className="p-6">
          <ul className="mb-5 space-y-3">
            <ExplainRow icon={<LocateFixed className="h-5 w-5" />} text="Détection automatique par le GPS de votre téléphone (avec votre accord)" />
            <ExplainRow icon={<Globe2 className="h-5 w-5" />} text="Pays, région, département, ville, arrondissement et quartier remplis pour vous" />
            <ExplainRow icon={<PencilLine className="h-5 w-5" />} text="Vous vérifiez et corrigez tout ce que vous voulez avant d'enregistrer" />
            <ExplainRow icon={<Navigation className="h-5 w-5" />} text="Guidage GPS gratuit entre membres pour les rencontres familiales" />
          </ul>
          <FcButton onClick={runDetect} className="h-[54px] text-[17px]">
            <LocateFixed className="h-5 w-5" /> Détecter ma position
          </FcButton>
          <button
            onClick={() => { setMethod("manual"); setStep("edit"); }}
            className="mt-3 w-full text-center text-[13.5px] font-medium text-[#2A4A3A] hover:underline"
          >
            Remplir manuellement à la place
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-4 w-full text-center text-[12.5px] text-[#8A9288] hover:underline"
            >
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
          <p className="text-center text-[13px] text-[#8A9288]">
            Acceptez la demande de position de votre navigateur si elle apparaît.
          </p>
          <FcSpinner className="mt-1 text-[#C89F62]" />
          </span>
        </FcCard>
      )}

      {(step === "edit" || step === "confirm" || step === "saving") && (
        <FcCard className="p-5 sm:p-6">
          {error && (
            <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#D97706]/40 bg-[#D97706]/10 p-3 text-[12.5px] leading-relaxed text-[#7A5B2E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          {method && (
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#3D6B52]/10 px-3 py-1 text-[11.5px] font-semibold text-[#2A4A3A]">
              {method === "gps" ? "📍 Détecté par GPS" : method === "ip" ? "🌐 Zone estimée par le réseau" : "✍️ Saisie manuelle"}
            </p>
          )}

          {step === "edit" && (
            <>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <Field label="Pays" icon={<Globe2 className="h-4 w-4" />} value={draft.country} onChange={(v) => set({ country: v })} list="fc-countries" placeholder="Cameroun" datalistId="fc-countries" options={COMMON_COUNTRIES} />
                <Field label="Région" icon={<Compass className="h-4 w-4" />} value={draft.region} onChange={(v) => set({ region: v })} placeholder="Littoral" datalistId="fc-regions" options={CM_REGIONS} />
                <Field label="Département" icon={<Landmark className="h-4 w-4" />} value={draft.department} onChange={(v) => set({ department: v })} placeholder="Wouri" />
                <Field label="Ville / Commune" icon={<Building2 className="h-4 w-4" />} value={draft.city} onChange={(v) => set({ city: v })} placeholder="Douala" datalistId="fc-cities" options={CM_CITIES} />
                <Field label="Arrondissement" icon={<MapPin className="h-4 w-4" />} value={draft.arrondissement} onChange={(v) => set({ arrondissement: v })} placeholder="Douala 2e" />
                <Field label="Quartier" icon={<MapPin className="h-4 w-4" />} value={draft.quartier} onChange={(v) => set({ quartier: v })} placeholder="ex : Akwa, Bonapriso…" />
              </div>

              {/* Position GPS */}
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
                    onClick={runDetect}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#C9B98A] px-3 py-2 text-[12.5px] font-semibold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    aria-label="Relancer la détection automatique"
                  >
                    <RefreshCw className="h-4 w-4" /> Détecter
                  </button>
                </div>
                {draft.latitude !== null && draft.longitude !== null && (
                  <a
                    href={osmViewUrl({ latitude: draft.latitude, longitude: draft.longitude })}
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

              <FcButton onClick={proceedToConfirm} disabled={!canContinue || adjusting} className="mt-4 h-[52px]">
                {adjusting ? (
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

          {step === "confirm" && <ConfirmView draft={draft} onEdit={() => setStep("edit")} onSave={save} />}

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

function ExplainRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2A4A3A]/8 text-[#2A4A3A]">{icon}</span>
      <span className="pt-1.5 text-[13.5px] leading-snug text-[#2B3530]">{text}</span>
    </li>
  );
}

function Field({
  label, icon, value, onChange, placeholder, options, datalistId, list,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  options?: string[];
  datalistId?: string;
  list?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-wide text-[#8A9288]">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1E4D2B]">{icon}</span>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          list={list ?? datalistId}
          className={`h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] text-[15.5px] text-[#2B3530] placeholder:text-[#B7B0A0] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15 ${icon ? "pl-10 pr-3" : "px-3.5"}`}
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

function ConfirmView({ draft, onEdit, onSave }: { draft: LocationDraft; onEdit: () => void; onSave: () => void }) {
  const rows: { label: string; value: string }[] = [
    { label: "Pays", value: draft.country },
    { label: "Région", value: draft.region },
    { label: "Département", value: draft.department },
    { label: "Ville / Commune", value: draft.city },
    { label: "Arrondissement", value: draft.arrondissement },
    { label: "Quartier", value: draft.quartier },
    {
      label: "Coordonnées GPS",
      value: draft.latitude !== null && draft.longitude !== null
        ? `${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}${draft.accuracy ? ` (±${Math.round(draft.accuracy)} m)` : ""}`
        : "—",
    },
  ];
  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-[13.5px] text-[#5C6B60]">
        <MapPinned className="h-4 w-4 text-[#C89F62]" />
        Vérifiez une dernière fois — ces coordonnées guideront la famille jusqu&apos;à vous.
      </p>
      <dl className="mb-5 overflow-hidden rounded-2xl border border-[#E5DCC0]">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i % 2 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}`}>
            <dt className="text-[12px] font-bold uppercase tracking-wide text-[#8A9288]">{r.label}</dt>
            <dd className="text-right text-[14px] font-semibold text-[#2B3530]">{r.value || "—"}</dd>
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
