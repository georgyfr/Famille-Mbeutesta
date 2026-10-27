import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Famille.Mbeutetsa — Espace numérique de famille",
  description:
    "Plateforme de gouvernance des grandes familles africaines. Registre, événements, solidarité, finances, gouvernance, mémoire et réseau.",
  applicationName: "Famille.Mbeutetsa",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Famille.Mbeutetsa",
  },
};

export const viewport: Viewport = {
  themeColor: "#2A4A3A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

/**
 * Browser gate ES5 — s'exécute AVANT tout rendu, y compris sur iOS 9 / Android 5 (2015).
 * - Navigateur moderne (React/Next exécutable : fetch, Proxy, globalThis, optional chaining,
 *   nullish coalescing) → classe `fc-modern` → l'app React s'affiche, le fallback Lite est masqué.
 * - Navigateur ancien → classe `fc-legacy` → l'app Lite ES5 (statique, #fc-legacy) reste visible.
 * - #fc-force-legacy / #fc-force-modern dans l'URL : hooks de test manuels.
 */
const FC_BROWSER_GATE =
  "(function(){var e=document.documentElement;" +
  "function t(){try{var n=window.location.hash||'';" +
  "if(n.indexOf('fc-force-legacy')!==-1)return false;" +
  "if(n.indexOf('fc-force-modern')!==-1)return true;" +
  "if(!window.Promise||!window.fetch||!window.Symbol||!window.Map||!window.WeakMap)return false;" +
  "if(typeof Proxy==='undefined'||typeof globalThis==='undefined')return false;" +
  "if(!window.history||!window.history.pushState)return false;" +
  "new Function('a?.b');new Function('0??1');return true}catch(r){return false}}" +
  "var m=t()?'modern':'legacy';" +
  "e.className+=m==='modern'?' fc-modern':' fc-legacy';" +
  "try{window.sessionStorage.setItem('fc_gate',m)}catch(r){}" +
  // Legacy : injection DOM de la logique Lite ES5 (hors arbre React — aucun
  // mismatch d'hydratation ; boot() attend DOMContentLoaded si nécessaire).
  "if(m==='legacy'){var s=document.createElement('script');s.src='/fc-lite.js';" +
  "s.defer=true;(document.body||e).appendChild(s);}})();";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: FC_BROWSER_GATE }} />
        {children}
        <Toaster />
        <Sonner position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
