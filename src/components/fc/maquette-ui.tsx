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
import { useEffect, useState } from "react";
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

/* — v24 : MÉMOIRE DES BADGES VUS — le chiffre d'un onglet indique qu'une action
 *    a été menée ; quand on OUVRE l'onglet, le chiffre doit disparaître. On
 *    mémorise donc (localStorage, une clé par console) l'effectif déjà vu de
 *    chaque onglet : le badge n'affiche plus que le NOUVEAU (delta = actuel −
 *    vu). Une nouvelle action fait réapparaître le chiffre, ouvrir l'onglet le
 *    referme — exactement le réflexe « naturel » attendu. — */
export function useOngletsVus<T extends string>(cle: string, tab: T, badges: Partial<Record<T, number>>, autorise = true) {
  const [vus, setVus] = useState<Partial<Record<T, number>>>({});
  useEffect(() => {
    /* différé (pattern du projet) : on lit localStorage HORS du rendu */
    const t0 = setTimeout(() => {
      try { setVus(JSON.parse(window.localStorage.getItem(cle) || "{}")); } catch { /* rien */ }
    }, 0);
    return () => clearTimeout(t0);
  }, [cle]);
  useEffect(() => {
    /* autorise = drapeau « données initiales chargées + onglet synchronisé
     * avec l'URL » : sans lui, le premier enregistrement écraserait la mémoire
     * avec des compteurs vides (artefact du montage). */
    if (!autorise) return;
    const n = badges[tab];
    if (n == null) return;
    const t0 = setTimeout(() => {
      setVus((v) => {
        if (v[tab] === n) return v;
        const next = { ...v, [tab]: n };
        try { window.localStorage.setItem(cle, JSON.stringify(next)); } catch { /* rien */ }
        return next;
      });
    }, 0);
    return () => clearTimeout(t0);
  }, [tab, badges, cle, autorise]);
  return (t: T) => Math.max(0, (badges[t] ?? 0) - (vus[t] ?? 0));
}

/* — navigation d'onglets : même boîte collante que le président, accent par rôle.
 *    v24 : les onglets peuvent être RÉPARTIS EN SECTIONS (groupes libellés,
 *    chacun teinté de sa couleur) au lieu d'un seul rang mélangé. — */
export type OngletItem<T extends string> = { key: T; label: string; icon: ReactNode; badge?: number };
export type GroupeOnglets<T extends string> = { label: string; note?: string; couleur: string; onglets: OngletItem<T>[] };

export function NavOnglets<T extends string>({ ariaLabel, etiquette, etiquetteCourte, couleurPoint, onglets, groupes, actif, goTab, render }: {
  ariaLabel: string; etiquette: string; etiquetteCourte?: string; couleurPoint: string;
  onglets?: OngletItem<T>[];
  groupes?: GroupeOnglets<T>[];
  actif: T; goTab: (t: T) => void;
  render: (t: OngletItem<T>, actif: boolean) => ReactNode;
}) {
  return (
    /* v24 : MOBILE = nav STATIQUE (les 4 sections défilent avec la page — une
     *    barre collante de 4 sections dévorerait l'écran du téléphone) ;
     *    sm+ = COLLANTE avec garde-fou max-h + défilement interne. */
    <nav aria-label={ariaLabel} className="fc-scroll relative -mx-3 mt-3 bg-[#F6EFE2]/95 px-3 py-2 backdrop-blur sm:sticky sm:top-0 sm:z-20 sm:-mx-4 sm:max-h-[72vh] sm:overflow-y-auto sm:overscroll-contain sm:px-4">
      <div className="rounded-2xl border-2 border-[#B8A87E] bg-white p-2 shadow-[0_10px_30px_rgba(42,74,58,0.14)] sm:p-2.5">
        <p className="flex items-center gap-1.5 px-1 pb-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: couleurPoint }}>
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurPoint }} />
          <span className="sm:hidden">{etiquetteCourte ?? etiquette}</span>
          <span className="hidden sm:inline">{etiquette}</span>
        </p>
        {groupes ? (
          <div className="space-y-2">
            {groupes.map((g) => (
              <div key={g.label} className="rounded-xl border px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2" style={{ borderColor: `${g.couleur}4D`, backgroundColor: `${g.couleur}0A` }}>
                <p className="flex items-center gap-1.5 px-0.5 pb-1.5 text-[9.5px] font-black uppercase tracking-[0.14em] sm:pb-2" style={{ color: g.couleur }}>
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: g.couleur }} />
                  {g.label}
                  <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal" style={{ backgroundColor: `${g.couleur}1A` }}>
                    {g.onglets.length} onglet{g.onglets.length > 1 ? "s" : ""}
                  </span>
                </p>
                {g.note && <p className="hidden px-0.5 pb-2 text-[10.5px] leading-snug sm:block" style={{ color: g.couleur }}>{g.note}</p>}
                {/* v24 mobile : rangée à DÉFILEMENT HORIZONTAL (une ligne par
                 *    section — la barre collante ne dévore plus l'écran) ; dès
                 *    sm, retour à l'enveloppement classique. */}
                <div className="fc-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 *:shrink-0 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-x-visible sm:px-0 sm:pb-0">
                  {g.onglets.map((t) => render(t, actif === t.key))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="fc-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 *:shrink-0 sm:mx-0 sm:flex-wrap sm:gap-2 sm:overflow-x-visible sm:px-0 sm:pb-0">
            {(onglets ?? []).map((t) => render(t, actif === t.key))}
          </div>
        )}
      </div>
    </nav>
  );
}

/* — toast d'export direct pour les consoles — */
export { toast };
