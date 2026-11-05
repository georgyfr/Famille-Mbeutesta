"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BASCULE MAQUETTE ⇄ APPLICATION — Famille.Mbeutetsa (v22)
//
// Trois consoles de gestion sont présentées en vue de validation, routées par
// le hash de l'URL :
//   · #president/…    → Poste de commandement du Président
//   · #secretaire/…   → Console du Secrétaire (v22 : 16 onglets, moteur
//                       d'amendes, convocations à réponse, export Excel)
//   · #commissaire/…  → Console du Commissaire aux comptes (v19)
// v20 : le switcher « Mon poste au bureau » du tableau de bord (application)
// pointe vers ces hashes — quand le hash cible explicitement une console, la
// vue bascule AUTOMATIQUEMENT de l'application vers la maquette.
// v21 : le bandeau porte désormais un SÉLECTEUR DE CONSOLES (Président ·
// Secrétaire · Commissaire) VISIBLE EN PERMANENCE, en maquette comme en
// application — un clic sur une pastille pose le hash et ouvre la console,
// sans passer par l'URL ni par le tableau de bord. Fini les consoles
// introuvables : chaque poste est à un clic du bandeau vert.
// L'administrateur compare la maquette à l'application actuelle ; après son
// accord, la maquette disparaîtra et ses outils rejoindront les pages des
// acteurs dans le projet Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { MainApp } from "./main-app";
import { MaquettePresident } from "./maquette-president";
import { MaquetteSecretaire } from "./maquette-secretaire";
import { MaquetteCommissaire } from "./maquette-commissaire";
import { Sparkles, Crown, PenLine, Landmark } from "lucide-react";

type ConsoleKey = "president" | "secretaire" | "commissaire";

const CONSOLES: Record<ConsoleKey, string> = {
  president: "Poste de commandement du Président (paramétrage + espace membre)",
  secretaire: "Console du Secrétaire (procès-verbaux, présences, décisions, taux, convocations)",
  commissaire: "Console du Commissaire aux comptes (caisses, journal, registres, rapports)",
};

// v21 — pastilles du bandeau : une par console, cliquable PARTOUT (maquette
// comme application). Dans l'ordre d'affichage du bureau.
const PILLES: Array<{ key: ConsoleKey; label: string; Icon: typeof Crown }> = [
  { key: "president", label: "Président", Icon: Crown },
  { key: "secretaire", label: "Secrétaire", Icon: PenLine },
  { key: "commissaire", label: "Commissaire", Icon: Landmark },
];

function consoleFromHash(): ConsoleKey {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#secretaire")) return "secretaire";
    if (h.startsWith("#commissaire")) return "commissaire";
  } catch { /* rien */ }
  return "president";
}

/** Le hash vise EXPLICITEMENT une console — contrairement à consoleFromHash,
 *  qui renvoie « president » par défaut pour tout hash inconnu (#tontine,
 *  #admin, vide…) : ce repère sert à la bascule automatique ci-dessous. */
function hashConsoleExplicite(): boolean {
  try {
    const h = (window.location.hash || "").toLowerCase();
    return h.startsWith("#president") || h.startsWith("#secretaire") || h.startsWith("#commissaire");
  } catch {
    return false;
  }
}

export function MaquetteGate() {
  // Navigateurs 2015 (classe fc-legacy posée par le browser gate) : l'app Lite
  // ES5 reste maîtresse — la maquette React ne s'y affiche pas.
  const [legacy] = useState(
    () => typeof document !== "undefined" && /fc-legacy/.test(document.documentElement.className),
  );
  const [mode, setMode] = useState<"maquette" | "app">("maquette");
  const [console_, setConsole_] = useState<ConsoleKey>(() => "president");

  // v21 — pastille de console : ouvre IMMÉDIATEMENT la console visée (état
  // posé à la main) et pose le hash via history.pushState — le pattern du
  // projet (jamais location.hash= dans un composant, règle React 19).
  // pushState ne déclenche pas « hashchange » : c'est voulu, l'état est déjà
  // posé ici ; le listener reste utile pour les changements EXTERNES du hash
  // (switcher « Mon poste au bureau », URL éditée, bouton retour). Piège
  // hash identique (#president/… sous-page) : rien à faire, l'état est déjà bon.
  const allerConsole = (c: ConsoleKey): void => {
    setConsole_(c);
    setMode("maquette");
    try {
      const h = (window.location.hash || "").toLowerCase();
      if (!h.startsWith(`#${c}`)) {
        window.history.pushState(null, "", `#${c}`);
      }
    } catch { /* rien */ }
  };

  useEffect(() => {
    const sync = () => {
      setConsole_(consoleFromHash());
      // v20 — switcher « Mon poste au bureau » : quand le hash vise une
      // console, la vue bascule d'elle-même de l'application vers la maquette
      // (le membre qui bascule vers son poste tombe directement dessus).
      if (hashConsoleExplicite()) setMode("maquette");
    };
    const t0 = setTimeout(sync, 0);
    const onHash = () => sync();
    window.addEventListener("hashchange", onHash);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  if (legacy) return <MainApp />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-1 bg-[#2A4A3A] px-1.5 py-1.5 text-white sm:gap-2 sm:px-3">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C89F62]" />
        <p className="hidden min-w-0 truncate text-[11px] font-semibold sm:block">
          {mode === "maquette"
            ? `Maquette v22 — ${CONSOLES[console_]}`
            : "Application actuelle — consultation"}
        </p>
        {/* v21 — sélecteur de consoles : VISIBLE EN PERMANENCE (maquette comme
            application). Un clic pose le hash et ouvre la console visée. */}
        <nav aria-label="Consoles du bureau" className="flex min-w-0 items-center gap-1">
          {PILLES.map(({ key, label, Icon }) => {
            const actif = mode === "maquette" && console_ === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => allerConsole(key)}
                aria-pressed={actif}
                title={CONSOLES[key]}
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-all active:scale-95 sm:text-[11px] ${
                  actif
                    ? "bg-[#C89F62] text-[#2B2416] shadow-sm"
                    : "border border-white/25 bg-white/5 text-white/80 hover:border-white/50 hover:bg-white/15 hover:text-white"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "maquette" ? "app" : "maquette"))}
          className="ml-auto shrink-0 rounded-full bg-[#C89F62] px-2.5 py-1 text-[11px] font-bold text-[#2B2416] transition-all hover:bg-[#b98f50] active:scale-95 sm:px-3"
        >
          <span className="hidden sm:inline">{mode === "maquette" ? "Voir l’app actuelle" : "Voir la maquette"}</span>
          <span className="sm:hidden">{mode === "maquette" ? "App" : "Maquette"}</span>
          <span className="sr-only">{mode === "maquette" ? "Voir l’application actuelle" : "Voir la maquette"}</span>
        </button>
      </div>
      {mode === "maquette" ? (
        console_ === "president" ? <MaquettePresident /> : console_ === "secretaire" ? <MaquetteSecretaire /> : <MaquetteCommissaire />
      ) : (
        <MainApp />
      )}
    </div>
  );
}
