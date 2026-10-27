import { LegacyApp } from "@/components/fc/legacy-app";
import { MainApp } from "@/components/fc/main-app";

/**
 * Une seule URL, deux moteurs (progressive enhancement) :
 *  - <LegacyApp/>  : app Lite statique ES5 — visible uniquement sur les navigateurs
 *                    de 2015 (iOS 9, Android 5/6, Chrome < 80) via `html.fc-legacy` ;
 *  - <MainApp/>    : app React complète — splash natif, inscription façon WhatsApp,
 *                    session persistante, navigation basse, PWA installable.
 * Le browser gate ES5 (layout.tsx) tranche avant le premier rendu.
 */
export default function Page() {
  return (
    <div className="fc-bg-page flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        <LegacyApp />
        <div className="fc-root flex flex-1 flex-col">
          <MainApp />
        </div>
      </main>

      <footer
        className="fc-footer mt-auto border-t border-[#E5DCC0] bg-[#1E4D2B] text-center text-[12px] text-[#FBF7EA]/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <p className="pt-3">
          Famille.Mbeutetsa © 2026 — Le registre vivant des grandes familles
        </p>
      </footer>
    </div>
  );
}
