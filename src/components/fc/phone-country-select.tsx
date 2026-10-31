"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Sélecteur d'indicatif téléphonique international — Famille.Mbeutetsa
//
// • Propose TOUS les pays (drapeau + nom + indicatif) avec recherche.
// • Détecte automatiquement le pays où se trouve l'utilisateur :
//   Cloudflare (IP) → fuseau horaire → langue du navigateur → Cameroun.
// • Mémorise le choix : si l'utilisateur change lui-même le pays, son choix
//   devient prioritaire (plus jamais de surcharge automatique).
// • Accessible (rôle listbox/option, Échap, Entrée) et mobile-friendly.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  COUNTRIES,
  Country,
  DEFAULT_COUNTRY,
  flagEmoji,
  resolveInitialCountry,
  saveCountryChoice,
} from "@/lib/fc-countries";

/* ─── Hook : pays courant + détection auto + mémoire du choix manuel ─── */
export function usePhoneCountry() {
  const [country, setCountryState] = useState<Country>(DEFAULT_COUNTRY);
  const [ready, setReady] = useState(false);

  // Détection automatique au montage (sauf si l'utilisateur a déjà choisi)
  useEffect(() => {
    let alive = true;
    void resolveInitialCountry().then(({ country: c, detected }) => {
      if (!alive) return;
      setCountryState(c);
      if (detected) saveCountryChoice(c.iso, false); // on mémorise la détection
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setManual = (c: Country) => {
    setCountryState(c);
    saveCountryChoice(c.iso, true); // choix manuel → prioritaire pour toujours
  };

  return { country, setCountry: setManual, ready };
}

/* ─── Sélecteur : bouton drapeau + indicatif, panneau avec recherche ─── */
export function PhoneCountrySelect({
  value,
  onChange,
  disabled,
}: {
  value: Country;
  onChange: (c: Country) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Fermeture : clic extérieur / Échap
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus de la recherche à l'ouverture (la remise à zéro se fait au clic)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Scroll vers le pays sélectionné à l'ouverture
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-iso="${value.iso}"]`);
    el?.scrollIntoView({ block: "center" });
  }, [open, value.iso]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const digits = q.replace(/\D/g, "");
    return COUNTRIES.filter((c) => {
      if (digits && q === digits) {
        // Recherche par indicatif : préfixe (33 → +33, +33…)
        return c.dial.startsWith(digits) || (digits.startsWith("0") && c.dial.startsWith(digits.slice(1)));
      }
      return (
        c.fr.toLowerCase().includes(q) ||
        c.iso.toLowerCase() === q ||
        c.dial.startsWith(digits && /^\d+$/.test(q) ? digits : "\u0000")
      );
    });
  }, [query]);

  const pick = (c: Country) => {
    onChange(c);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setQuery(""); // nouvelle ouverture → recherche vierge
          setOpen((o) => !o);
        }}
        className="flex h-[54px] items-center gap-1.5 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[16px] font-medium text-[#2B3530] transition-colors hover:border-[#2A4A3A] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15 disabled:opacity-60 sm:px-4"
        aria-label={`Indicatif du pays : ${value.fr} +${value.dial}. Changer de pays`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-[19px] leading-none" aria-hidden="true">
          {flagEmoji(value.iso)}
        </span>
        <span className="whitespace-nowrap">+{value.dial}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#8A9288] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[60px] z-30 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-[#C9B98A] bg-[#FFFDF6] shadow-xl"
          role="listbox"
          aria-label="Choisir le pays de votre numéro"
        >
          <div className="border-b border-[#E5DCC0] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9288]" aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results.length > 0) {
                    e.preventDefault();
                    pick(results[0]);
                  }
                }}
                placeholder="Rechercher un pays ou un indicatif…"
                className="h-10 w-full rounded-lg border border-[#E5DCC0] bg-white pl-9 pr-3 text-[14px] text-[#2B3530] placeholder:text-[#8A9288] focus:border-[#2A4A3A] focus:outline-none"
                aria-label="Rechercher un pays ou un indicatif"
                autoComplete="off"
              />
            </div>
          </div>
          <div ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[#8A9288]">Aucun pays trouvé pour « {query} »</p>
            ) : (
              results.map((c) => {
                const selected = c.iso === value.iso;
                return (
                  <button
                    key={c.iso + c.dial + c.fr}
                    type="button"
                    data-iso={c.iso}
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(c)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-[14px] transition-colors ${
                      selected ? "bg-[#2A4A3A]/10" : "hover:bg-[#2A4A3A]/5"
                    }`}
                  >
                    <span className="w-7 shrink-0 text-[18px] leading-none" aria-hidden="true">
                      {flagEmoji(c.iso)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[#2B3530]">
                      {c.fr}
                      {c.len ? <span className="ml-1 text-[11px] text-[#8A9288]">({c.len} chiffres)</span> : null}
                    </span>
                    <span className="shrink-0 font-medium text-[#5C6B60]">+{c.dial}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
