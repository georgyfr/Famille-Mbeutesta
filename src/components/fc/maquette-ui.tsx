"use client";

// ─────────────────────────────────────────────────────────────────────────────
// UI PARTAGÉE DES CONSOLES (v30) — Secrétaire · Commissaire · Président · Membre
//
// Même philosophie que la maquette du président (MÊMES couleurs de section,
// MÊMES cartes crème, MÊMES pastilles) : petits composants extraits pour que
// chaque nouveau poste de gestion reste cohérent SANS toucher au fichier du
// président (qui garde ses propres copies).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronsRight, ChevronsUp, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/fc-client";
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

/* — v36 : PASTILLE CLIQUABLE (PBtn) — même silhouette que P, mais un vrai
 *    bouton : les badges de l'Espace Membre (« 5 membres », « actions
 *    attendue(s) », « 2ᵉ dimanche du mois ») deviennent INTERACTIFS — un clic
 *    ouvre la page correspondante, et un chiffre apparaît quand il y a des
 *    actions à faire (demande de l'administrateur). Le chevron signale le
 *    geste ; l'indicateur optionnel porte le chiffre d'actions en attente. — */
export function PBtn({ children, onClick, cls = "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]", ariaLabel, badge }: {
  children: ReactNode; onClick: () => void;
  cls?: string; ariaLabel: string; badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex min-h-[26px] items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition-all hover:brightness-95 active:scale-95 ${cls}`}
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[9px] font-black leading-none text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <ChevronRight aria-hidden className="h-3 w-3 opacity-70" />
    </button>
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
/* v36 — surtitre et sousTitre OPTIONNELS : la carte d'en-tête s'épure sur
 * demande de l'administrateur (« supprime “la Tontine au quotidien” et les
 * éléments tour n°1 (janvier) · Ma position — ce champ ne sert à rien »).
 * Un libellé absent n'est simplement plus rendu. */
export function EnteteConsole({ accent, accentClair, surtitre, titre, sousTitre, icon, badges }: {
  accent: string; accentClair: string; surtitre?: string; titre: string; sousTitre?: string;
  icon: ReactNode; badges: ReactNode;
}) {
  return (
    <FcCard className="overflow-hidden">
      <div className="px-4 py-4 text-white" style={{ background: `linear-gradient(135deg, ${accent}, ${accentClair})` }}>
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">{icon}</span>
          <div className="min-w-0 flex-1">
            {surtitre && surtitre.trim() !== "" && (
              <p className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: accentClair === accent ? "#C89F62" : "#EAD9EE" }}>{surtitre}</p>
            )}
            <p className="fc-serif text-[19px] font-bold leading-tight">{titre}</p>
            {sousTitre && sousTitre.trim() !== "" && (
              <p className="mt-0.5 text-[12px] text-white/85">{sousTitre}</p>
            )}
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

/* — v25 : NAV NON COLLANTE + PASTILLE « ONGLETS » — retour des retours terrain :
 *    la barre d'onglets COLLANTE masquait le contenu de la page dès qu'on
 *    scollait (elle occupait jusqu'à 72 vh). Désormais la nav DÉFILE avec la
 *    page (statique, mobile comme desktop) ; dès qu'elle sort de l'écran, une
 *    pastille flottante discrète apparaît en bas à droite : un clic et la nav
 *    REMONTE (scrollIntoView doux ; scroll-mt pour passer sous le bandeau). — */
/* Le ref RESTE dans le composant (créé avec useRef là-bas) — ce hook ne gère
 * que l'observation : true dès que l'élément n'est plus visible à l'écran. */
export function useHorsEcranNav(ref: RefObject<HTMLElement | null>) {
  const [horsEcran, setHorsEcran] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setHorsEcran(!e.isIntersecting);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return horsEcran;
}

/* pastille flottante « Onglets » — n'apparaît QUE quand la nav est sortie de
 * l'écran (opacity + translation, pointer-events off à zéro : elle ne masque
 * jamais le contenu, elle ne bloque jamais un clic). */
export function PastilleOnglets({ visible, couleurPoint, onClick }: { visible: boolean; couleurPoint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Revenir aux onglets"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border-2 border-[#B8A87E] bg-white py-2 pl-2.5 pr-3.5 text-[12px] font-bold text-[#2A4A3A] shadow-[0_8px_24px_rgba(42,74,58,0.28)] transition-all duration-200 sm:bottom-16 ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: couleurPoint }} />
      <ChevronsUp aria-hidden className="h-3.5 w-3.5" />
      Onglets
    </button>
  );
}

/* — navigation d'onglets : accent par rôle.
 *    v24 : les onglets peuvent être RÉPARTIS EN SECTIONS (groupes libellés,
 *    chacun teinté de sa couleur) au lieu d'un seul rang mélangé.
 *    v25 : nav STATIQUE (plus de sticky) + pastille « Onglets » de retour. — */
export type OngletItem<T extends string> = { key: T; label: string; icon: ReactNode; badge?: number };
export type GroupeOnglets<T extends string> = { label: string; note?: string; couleur: string; onglets: OngletItem<T>[] };

export function NavOnglets<T extends string>({ ariaLabel, etiquette, etiquetteCourte, couleurPoint, onglets, groupes, actif, goTab, render }: {
  ariaLabel: string; etiquette: string; etiquetteCourte?: string; couleurPoint: string;
  onglets?: OngletItem<T>[];
  groupes?: GroupeOnglets<T>[];
  actif: T; goTab: (t: T) => void;
  render: (t: OngletItem<T>, actif: boolean) => ReactNode;
}) {
  const navRef = useRef<HTMLElement | null>(null);
  const navHorsEcran = useHorsEcranNav(navRef);
  const remonterOnglets = () => navRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <>
    {/* v25 : nav STATIQUE sur tous les écrans — elle défile avec la page et
     *    ne reste plus figée au-dessus du contenu ; scroll-mt pour que la
     *    pastille la fasse remonter SOUS le bandeau des consoles. */}
    <nav ref={navRef} aria-label={ariaLabel} className="fc-scroll relative -mx-3 mt-3 bg-[#F6EFE2]/95 px-3 py-2 backdrop-blur scroll-mt-14 sm:-mx-4 sm:px-4">
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
    <PastilleOnglets visible={navHorsEcran} couleurPoint={couleurPoint} onClick={remonterOnglets} />
    </>
  );
}

/* — v30 : MENU HAMBURGER — retour des retours terrain : dans les consoles à
 *    20 onglets, la nav d'onglets occupait TOUTE la page et noyait le contenu
 *    (« les différents boutons des pages occupent toute la page, ça rend la
 *    navigation difficile »). Désormais UNE barre compacte COLLANTE de 48 px
 *    (bouton ☰ + onglet courant) et un TIROIR latéral qui regroupe toutes les
 *    sections avec leurs onglets (Mémoire de la réunion, Gestion de la
 *    cantine…) : le contenu des pages redevient lisible. MÊME MÉCANISME pour
 *    toutes les consoles du bureau : secrétaire, président, commissaire et
 *    espace membre — props identiques à NavOnglets (groupes | onglets).
 *
 * v36 — DEMANDE DE L'ADMINISTRATEUR : « le menu hamburger va dans la barre du
 * haut (à la place de « App ») — la barre interne [logo ☰ Accueil] ne sert à
 * rien, supprime-la. » L'Espace Membre (et toute console qui le souhaite)
 * rend le MenuHamburger SANS sa barre interne (afficherBarre={false}) : il ne
 * reste que le TIROIR — ouvert par le hamburger global de la barre du haut
 * via l'événement « fc-ouvrir-menu ». Un seul tiroir est monté à la fois :
 * le hamburger global ouvre toujours la console courante. — */
export function MenuHamburger<T extends string>({ ariaLabel, libelle, couleurPoint, onglets, groupes, actif, goTab, filRacine, afficherBarre = true }: {
  ariaLabel: string; libelle?: string; couleurPoint: string;
  onglets?: OngletItem<T>[];
  groupes?: GroupeOnglets<T>[];
  actif: T; goTab: (t: T) => void;
  /** v35 — fil d'Ariane : la RACINE du poste (« Console du Secrétaire »…).
   *  Le chemin complet est rendu dans la barre collante : Racine › Section
   *  › Onglet courant — cliquer la racine remonte à l'onglet d'accueil du
   *  poste, cliquer la section ouvre le tiroir sur tous ses onglets. */
  filRacine?: { label: string; onClick: () => void };
  /** v36 — barre interne masquable (défaut : affichée). À false, la console
   *  ne garde que le tiroir — le hamburger vit dans la barre du haut. */
  afficherBarre?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const fermerRef = useRef<HTMLButtonElement | null>(null);

  /* v38 — DEMANDE DE L'ADMINISTRATEUR : « au niveau du menu hamburger, il
   * faut créer un bouton de déconnexion. » La sortie de session (jusqu'ici
   * limitée à « Mon profil » de l'Espace Membre) vit DÉSORMAIS au pied du
   * tiroir — visible sur TOUS les postes (membre, secrétaire, président,
   * commissaire) : même mécanique que le profil (API /api/auth/logout,
   * fc_uid/fc_name nettoyés, hash retiré avant rechargement — retour à la
   * porte d'entrée = écran du code, jamais d'aperçu de console après sortie). */
  const [enSortie, setEnSortie] = useState(false);
  const seDeconnecter = async () => {
    setEnSortie(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch { /* on sort quand même */ }
    try {
      window.localStorage.removeItem("fc_uid");
      window.localStorage.removeItem("fc_name");
    } catch { /* rien */ }
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch { /* rien */ }
    window.location.reload();
  };

  const plats: OngletItem<T>[] = groupes ? groupes.flatMap((g) => g.onglets) : (onglets ?? []);
  const courant = plats.find((t) => t.key === actif) ?? plats[0];
  const badgeCourant = courant?.badge ?? 0;
  const autresBadges = plats.reduce((s, t) => s + (t.badge ?? 0), 0) - badgeCourant;
  /* v35 — la SECTION qui porte l'onglet courant : 2ᵉ niveau du fil d'Ariane.
   *   Cliquer dessus ouvre le tiroir (les sections ne sont pas des pages — le
   *   tiroir montre tous les onglets de la section, c'est la remontée). */
  const groupeCourant = groupes?.find((g) => g.onglets.some((t) => t.key === actif));

  /* Escape referme ; la page derrière ne défile plus ; focus clavier au
   * bouton de fermeture (différé : l'élément doit exister). */
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    window.addEventListener("keydown", onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t0 = window.setTimeout(() => fermerRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
      window.clearTimeout(t0);
    };
  }, [ouvert]);

  /* v36 — LE HAMBURGER GLOBAL (barre du haut) ouvre le tiroir de la console
   * courante : un seul MenuHamburger est monté à la fois, il répond à
   * l'événement « fc-ouvrir-menu » quel que soit son affichage interne. */
  useEffect(() => {
    const onOuvrir = () => setOuvert(true);
    window.addEventListener("fc-ouvrir-menu", onOuvrir);
    return () => window.removeEventListener("fc-ouvrir-menu", onOuvrir);
  }, []);

  const choisir = (t: T) => {
    setOuvert(false);
    btnRef.current?.focus();
    if (t !== actif) {
      goTab(t);
      /* le contenu de la nouvelle section commence en haut */
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { window.scrollTo(0, 0); }
    }
  };

  const ligne = (t: OngletItem<T>, couleur: string) => {
    const on = t.key === actif;
    return (
      <button
        key={t.key}
        type="button"
        onClick={() => choisir(t.key)}
        aria-current={on ? "page" : undefined}
        className={`flex min-h-[46px] w-full items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left text-[13.5px] font-bold transition-all active:scale-[0.98] ${
          on
            ? "border-transparent text-white shadow-[0_6px_18px_rgba(42,74,58,0.35)]"
            : "border-[#E5DCC0] bg-white text-[#2B3530] hover:border-[#B8A87E] hover:bg-[#F6EFE2]"
        }`}
        style={on ? { backgroundColor: couleur } : undefined}
      >
        <span className="shrink-0" style={on ? undefined : { color: couleur }}>{t.icon}</span>
        <span className="min-w-0 flex-1 truncate">{t.label}</span>
        {(t.badge ?? 0) > 0 && (
          <span className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${on ? "bg-white/25 text-white" : "bg-[#A5473D] text-white"}`}>
            {t.badge}
          </span>
        )}
      </button>
    );
  };

  const fermer = () => { setOuvert(false); btnRef.current?.focus(); };

  return (
    <>
      {/* barre compacte COLLANTE (sous le bandeau de consoles, ~35 px) —
       *    48 px de haut : elle ne dévore plus l'écran, le contenu passe
       *    dessous en scollant mais le menu reste TOUJOURS accessible.
       *    v31 — LE LOGO (blason) est ici, AU NIVEAU DU MENU HAMBURGER
       *    (retour terrain : « le logo doit être au niveau du menu
       *    hamburger ») — même mécanique pour toutes les consoles du bureau.
       *    v36 — SUPPRIMABLE : `afficherBarre={false}` — le hamburger vit
       *    alors dans la barre du haut (demande de l'administrateur pour
       *    l'Espace Membre : « cette barre ne sert à rien, supprime-la »). */}
      {afficherBarre && (
      <div className="sticky top-[35px] z-20 -mx-3 mt-3 px-3 sm:-mx-4 sm:px-4">
        <div className="rounded-2xl border-2 border-[#B8A87E] bg-white/95 shadow-[0_8px_24px_rgba(42,74,58,0.16)] backdrop-blur">
          <div className="flex items-center gap-2 py-1.5 pl-2 pr-2.5 sm:pl-2.5">
          <img
            src="/logo-famille.webp"
            alt="Armoiries de la famille Mbeutetsa"
            className="h-9 w-9 shrink-0 rounded-xl border-2 border-[#E5DCC0] bg-[#FBF7EA] object-cover p-0.5"
          />
          <button
            ref={btnRef}
            type="button"
            onClick={() => setOuvert(true)}
            aria-expanded={ouvert}
            aria-haspopup="dialog"
            aria-label={`Ouvrir le menu — ${ariaLabel}`}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95"
            style={{ borderColor: couleurPoint, color: couleurPoint, backgroundColor: `${couleurPoint}0F` }}
          >
            <Menu aria-hidden className="h-5 w-5" />
            {autresBadges > 0 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#A5473D] px-1 text-[10px] font-black text-white">
                {autresBadges}
              </span>
            )}
          </button>
          <div aria-hidden className="h-6 w-px shrink-0 bg-[#E5DCC0]" />
          <div className="flex min-w-0 flex-1 items-center gap-1.5" style={{ color: couleurPoint }}>
            {courant?.icon}
            <p className="min-w-0 truncate text-[13.5px] font-bold text-[#2B3530]">{courant?.label ?? "—"}</p>
            {badgeCourant > 0 && (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#A5473D] px-1.5 text-[11px] font-black text-white">
                {badgeCourant}
              </span>
            )}
          </div>
          <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] sm:inline" style={{ backgroundColor: `${couleurPoint}14`, color: couleurPoint }}>
            {libelle ?? `${plats.length} onglets`}
          </span>
          </div>
          {/* v35 — FIL D'ARIANE (2ᵉ ligne de la barre collante) : le chemin
           *    Racine › Section › Onglet reste visible MÊME en scollant — un
           *    clic ramène en arrière sans rouvrir le tiroir. */}
          {filRacine && (
            <div className="border-t border-[#E5DCC0] bg-[#FBF7EA]/70 px-2.5 py-1 sm:px-3">
              <FilAriane
                compact
                couleur={couleurPoint}
                segments={[
                  { label: filRacine.label, onClick: filRacine.onClick },
                  /* v39 — CORRECTION DE L'ADMINISTRATEUR : « mes onglets de la
                   * réunion renvoient au menu hamburger, ce qui ne devrait pas
                   * être — le fil d'Ariane, c'était pas pour faire n'importe
                   * quoi. » Cliquer la SECTION du fil d'Ariane NAVIGUE vers la
                   * première page de cette section (une vraie page, jamais le
                   * tiroir). */
                  ...(groupeCourant
                    ? [{ label: groupeCourant.label, onClick: () => choisir(groupeCourant.onglets[0].key) }]
                    : []),
                  { label: courant?.label ?? "—" },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      )}

      {/* tiroir latéral — toutes les sections et tous les onglets du poste */}
      {ouvert && (
        <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#141F17]/55 backdrop-blur-[2px]" onClick={fermer} />
          <div className="fc-drawer-in absolute inset-y-0 left-0 flex w-[88%] max-w-[350px] flex-col border-r-2 border-[#B8A87E] bg-[#FBF7EA] shadow-[10px_0_44px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2 border-b-2 border-[#B8A87E]/60 bg-white px-3 py-3">
              <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: couleurPoint }} />
              <div className="min-w-0 flex-1">
                <p className="fc-serif truncate text-[15px] font-bold text-[#2A4A3A]">{ariaLabel}</p>
                <p className="text-[10.5px] font-semibold text-[#8A9288]">
                  {plats.length} onglet{plats.length > 1 ? "s" : ""}{groupes ? ` · ${groupes.length} section${groupes.length > 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <button
                ref={fermerRef}
                type="button"
                onClick={fermer}
                aria-label="Fermer le menu"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#E5DCC0] bg-white text-[#2B3530] transition-all hover:border-[#A5473D] hover:text-[#A5473D] active:scale-95"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label={ariaLabel} className="fc-scroll flex-1 overflow-y-auto px-3 pb-8 pt-1">
              {groupes ? (
                <div className="space-y-1">
                  {groupes.map((g) => (
                    <div key={g.label}>
                      <p className="flex items-center gap-1.5 pb-1.5 pt-4 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: g.couleur }}>
                        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: g.couleur }} />
                        {g.label}
                        <span className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal" style={{ backgroundColor: `${g.couleur}1A` }}>
                          {g.onglets.length}
                        </span>
                      </p>
                      {g.note && <p className="pb-2 text-[10.5px] leading-snug text-[#8A9288]">{g.note}</p>}
                      <div className="space-y-1.5">{g.onglets.map((t) => ligne(t, g.couleur))}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 pt-3">{plats.map((t) => ligne(t, couleurPoint))}</div>
              )}
            </nav>
            {/* v38 — SORTIE DE SESSION au pied du tiroir, séparée des onglets :
             *    un geste volontaire (fond blanc, liseré rouge), jamais une
             *    navigation parmi les sections. */}
            <div className="border-t-2 border-[#B8A87E]/60 bg-white px-3 py-3">
              <button
                type="button"
                onClick={seDeconnecter}
                disabled={enSortie}
                aria-label="Se déconnecter de l'application"
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#A5473D] bg-[#A5473D]/[0.07] text-[13.5px] font-bold text-[#A5473D] transition-all hover:bg-[#A5473D] hover:text-white active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                {enSortie ? "Déconnexion…" : "Déconnexion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* — v35 : FIL D'ARIANE — « il est difficile de revenir à des pages
 *    précédentes » (demande de l'administrateur). Un chemin CLIQUABLE qui
 *    montre où l'on est et ramène en arrière d'un niveau : Accueil › Section
 *    › Onglet courant. Le DERNIER segment est la page ouverte (aria-current),
 *    les précédents sont des boutons ; un segment sans onClick s'affiche
 *    comme un simple texte (niveau purement indicatif). — */
export type SegmentAriane = { label: string; onClick?: () => void };

export function FilAriane({ segments, couleur, className = "", compact }: {
  segments: SegmentAriane[]; couleur?: string; className?: string; compact?: boolean;
}) {
  const utiles = segments.filter((s) => s.label.trim() !== "");
  if (utiles.length === 0) return null;
  return (
    <nav aria-label="Fil d'Ariane" className={`min-w-0 ${className}`}>
      <ol className={`flex min-w-0 items-center text-[12px] font-semibold text-[#2B3530] ${compact ? "gap-0.5" : "gap-1"}`}>
        {utiles.map((s, i) => {
          const dernier = i === utiles.length - 1;
          return (
            <li key={`${s.label}-${i}`} className="flex min-w-0 items-center gap-0.5">
              {i > 0 && (
                <ChevronsRight aria-hidden className="h-3 w-3 shrink-0 text-[#B8A87E]" />
              )}
              {dernier ? (
                <span
                  aria-current="page"
                  className="min-w-0 max-w-[56vw] truncate font-bold sm:max-w-none"
                  style={{ color: couleur ?? "#2A4A3A" }}
                >
                  {s.label}
                </span>
              ) : s.onClick ? (
                <button
                  type="button"
                  onClick={s.onClick}
                  className="min-w-0 max-w-[26vw] truncate rounded px-1 py-0.5 text-[#5C6B60] transition-colors hover:text-[#1E4D2B] hover:underline focus-visible:outline-2 focus-visible:outline-[#C89F62] sm:max-w-[220px]"
                >
                  {s.label}
                </button>
              ) : (
                <span className="min-w-0 max-w-[26vw] truncate sm:max-w-[220px]">{s.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* — toast d'export direct pour les consoles — */
export { toast };
