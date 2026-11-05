"use client";

// ─────────────────────────────────────────────────────────────────────────────
// UI PARTAGÉE DES CONSOLES (v19) — Secrétaire · Commissaire aux comptes
//
// Même philosophie que la maquette du président (MÊMES couleurs de section,
// MÊMES cartes crème, MÊMES pastilles) : petits composants extraits pour que
// chaque nouveau poste de gestion reste cohérent SANS toucher au fichier du
// président (qui garde ses propres copies).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { FcCard } from "./ui";

/* — nombres & monnaie — */
export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const fcfa = (n: number) => `${fmt(n)} FCFA`;

/** Heure HH:MM — UNIQUEMENT dans les gestionnaires d'événements (jamais au
 *  rendu initial) pour éviter tout mismatch d'hydratation. */
export const heure = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

let seq = 0;
export const nid = () => `mkx-${Date.now().toString(36)}-${seq++}`;

/** Date lisible « 5 nov. » — gestionnaires d'événements uniquement. */
export const dateCourte = () => {
  const d = new Date();
  return `${d.getDate()} ${["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][d.getMonth()]}`;
};

/* — pastilles (mêmes classes que le président) — */
export const OK_CLS = "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30";
export const OR_CLS = "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45";
export const RJ_CLS = "bg-[#A5473D]/10 text-[#A5473D] border-[#A5473D]/30";
export const TE_CLS = "bg-[#3D6B72]/10 text-[#3D6B72] border-[#3D6B72]/30";
export const VI_CLS = "bg-[#6E4B71]/10 text-[#6E4B71] border-[#6E4B71]/30";

export function P({ children, cls = "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" }: { children: ReactNode; cls?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${cls}`}>
      {children}
    </span>
  );
}

/* — bouton d'action (ton « violet » ajouté pour le secrétariat) — */
export function Btn({ children, onClick, tone = "vert", disabled, small }: {
  children: ReactNode; onClick?: () => void; tone?: "vert" | "or" | "rouge" | "neutre" | "teal" | "violet";
  disabled?: boolean; small?: boolean;
}) {
  const tones = {
    vert: "bg-[#1F5B3F] text-white hover:bg-[#184a33]",
    or: "bg-[#C89F62] text-[#2B2416] hover:bg-[#b98f50]",
    rouge: "bg-[#A5473D] text-white hover:bg-[#8f3c33]",
    neutre: "bg-[#2A4A3A]/8 text-[#2B3530] hover:bg-[#2A4A3A]/14",
    teal: "bg-[#3D6B72] text-white hover:bg-[#31565c]",
    violet: "bg-[#6E4B71] text-white hover:bg-[#5d3f60]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "min-h-[34px] px-2.5 text-[11.5px]" : "min-h-[42px] px-3.5 text-[13px]"
      } ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/* — bouton à CONFIRMATION (même geste que la poubelle du président) :
 *    premier clic → arme (« Confirmer ? »), second clic → action ; sans
 *    second clic, tout rentre dans l'ordre après 4 s. — */
export function BtnConfirme({ children, onConfirmer, tone = "vert", labelConfirmer = "Confirmer ?" }: {
  children: ReactNode; onConfirmer: () => void; tone?: "vert" | "or" | "rouge" | "neutre" | "teal" | "violet"; labelConfirmer?: string;
}) {
  const [arme, setArme] = useState(false);
  const clic = () => {
    if (arme) { setArme(false); onConfirmer(); return; }
    setArme(true);
    window.setTimeout(() => setArme(false), 4000);
  };
  return (
    <Btn onClick={clic} tone={arme ? "rouge" : tone}>
      {children} {arme && <span className="text-[12px] font-black uppercase tracking-wide">{labelConfirmer}</span>}
    </Btn>
  );
}

/* — section : même carte que le président, ACCENT par rôle — */
export function Block({ title, icon, note, accent = "#1E4D2B", children }: {
  title: string; icon: ReactNode; note?: string; accent?: string; children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-[0_8px_30px_rgba(42,74,58,0.10)]">
      <div className="flex items-center gap-2 border-b border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}1A`, color: accent }}>{icon}</span>
        <h2 className="fc-serif flex-1 text-[14.5px] font-bold" style={{ color: accent }}>{title}</h2>
      </div>
      {note && <p className="border-b border-[#E5DCC0] bg-[#FBF7EA]/60 px-4 py-2 text-[11.5px] leading-relaxed text-[#5C6B60]">{note}</p>}
      {children}
    </section>
  );
}

/* — carte chiffrée (KPI) — accent en hex — */
export function KpiCard({ icon, label, value, sub, accent, barre }: {
  icon: ReactNode; label: string; value: string; sub?: string; accent: string;
  barre?: { pct: number };
}) {
  return (
    <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">
        <span style={{ color: accent }}>{icon}</span> {label}
      </div>
      <p className="mt-1 text-[21px] font-black leading-tight" style={{ color: accent }}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10.5px] font-semibold text-[#8A9288]">{sub}</p>}
      {barre && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E5DCC0]">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, barre.pct))}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  );
}

/* — bandeau d'en-tête de console : même gabarit que le président — */
export function EnteteConsole({ accent, accentClair, surtitre, titre, sousTitre, icon, badges }: {
  accent: string; accentClair: string; surtitre: string; titre: string; sousTitre: string;
  icon: ReactNode; badges: ReactNode;
}) {
  return (
    <FcCard className="overflow-hidden">
      <div className="px-4 py-4 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accentClair})` }}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">{icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: accentClair === accent ? "#C89F62" : "#EAD9EE" }}>{surtitre}</p>
            <p className="fc-serif text-[19px] font-bold leading-tight">{titre}</p>
            <p className="mt-0.5 text-[12px] text-white/85">{sousTitre}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div>
      </div>
    </FcCard>
  );
}

/* — navigation d'onglets : même boîte collante que le président, accent par rôle — */
export function NavOnglets<T extends string>({ ariaLabel, etiquette, couleurPoint, onglets, actif, goTab, render }: {
  ariaLabel: string; etiquette: string; couleurPoint: string;
  onglets: { key: T; label: string; icon: ReactNode; badge?: number }[];
  actif: T; goTab: (t: T) => void;
  render: (t: { key: T; label: string; icon: ReactNode; badge?: number }, actif: boolean) => ReactNode;
}) {
  return (
    <nav aria-label={ariaLabel} className="sticky top-0 z-20 -mx-3 mt-3 bg-[#F6EFE2]/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4">
      <div className="rounded-2xl border-2 border-[#B8A87E] bg-white p-2.5 shadow-[0_10px_30px_rgba(42,74,58,0.14)]">
        <p className="flex items-center gap-1.5 px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: couleurPoint }}>
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurPoint }} /> {etiquette}
        </p>
        <div className="flex flex-wrap gap-2">
          {onglets.map((t) => render(t, actif === t.key))}
        </div>
      </div>
    </nav>
  );
}

/* — toast d'export direct pour les consoles — */
export { toast };
