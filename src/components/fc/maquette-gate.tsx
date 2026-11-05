"use client";

// ─────────────────────────────────────────────────────────────────────────────
// BASCULE MAQUETTE ⇄ APPLICATION — Famille.Mbeutetsa
//
// La maquette « Poste de commandement du Président » est présentée en vue de
// validation. L'administrateur compare la maquette à l'application actuelle ;
// après son accord, la maquette disparaîtra et ses outils rejoindront les
// pages des acteurs dans le projet Cloudflare.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { MainApp } from "./main-app";
import { MaquettePresident } from "./maquette-president";
import { Sparkles } from "lucide-react";

export function MaquetteGate() {
  // Navigateurs 2015 (classe fc-legacy posée par le browser gate) : l'app Lite
  // ES5 reste maîtresse — la maquette React ne s'y affiche pas.
  const [legacy] = useState(
    () => typeof document !== "undefined" && /fc-legacy/.test(document.documentElement.className),
  );
  const [mode, setMode] = useState<"maquette" | "app">("maquette");

  if (legacy) return <MainApp />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-[#2A4A3A] px-3 py-1.5 text-white">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#C89F62]" />
        <p className="truncate text-[11px] font-semibold">
          {mode === "maquette"
            ? "Maquette — Poste de commandement du Président (paramétrage + espace membre)"
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
      {mode === "maquette" ? <MaquettePresident /> : <MainApp />}
    </div>
  );
}
