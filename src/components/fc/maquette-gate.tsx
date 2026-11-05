"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BASCULE MAQUETTE ⇄ APPLICATION — Famille.Mbeutetsa (v20)
//
// Trois consoles de gestion sont présentées en vue de validation, routées par
// le hash de l'URL :
//   · #president/…    → Poste de commandement du Président
//   · #secretaire/…   → Console du Secrétaire (v19)
//   · #commissaire/…  → Console du Commissaire aux comptes (v19)
// v20 : le switcher « Mon poste au bureau » du tableau de bord (application)
// pointe vers ces hashes — quand le hash cible explicitement une console, la
// vue bascule AUTOMATIQUEMENT de l'application vers la maquette.
// L'administrateur compare la maquette à l'application actuelle ; après son
// accord, la maquette disparaîtra et ses outils rejoindront les pages des
// acteurs dans le projet Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { MainApp } from "./main-app";
import { MaquettePresident } from "./maquette-president";
import { MaquetteSecretaire } from "./maquette-secretaire";
import { MaquetteCommissaire } from "./maquette-commissaire";
import { Sparkles } from "lucide-react";

type ConsoleKey = "president" | "secretaire" | "commissaire";

const CONSOLES: Record<ConsoleKey, string> = {
  president: "Poste de commandement du Président (paramétrage + espace membre)",
  secretaire: "Console du Secrétaire (procès-verbaux, présences, décisions, taux, convocations)",
  commissaire: "Console du Commissaire aux comptes (caisses, journal, registres, rapports)",
};

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
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-[#2A4A3A] px-3 py-1.5 text-white">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C89F62]" />
        <p className="truncate text-[11px] font-semibold">
          {mode === "maquette"
            ? `Maquette v20 — ${CONSOLES[console_]}`
            : "Application actuelle — consultation"}
        </p>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "maquette" ? "app" : "maquette"))}
          className="shrink-0 rounded-full bg-[#C89F62] px-3 py-1 text-[11px] font-bold text-[#2B2416] transition-all hover:bg-[#b98f50] active:scale-95"
        >
          {mode === "maquette" ? "Voir l’app actuelle" : "Voir la maquette"}
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
