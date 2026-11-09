/**
 * v31 — Correction du browser gate, partagée par MaquetteGate (racine) et
 * MainApp. Historique : le gate (layout.tsx) classait certains téléphones
 * modernes « legacy » à tort (détection stricte : Proxy, pushState, ?. …) ;
 * l'hydratation React effaçait ensuite la classe fc-legacy de <html>, le CSS
 * de masquage croisé devenait inopérant et les DEUX couches s'empilaient —
 * l'écran « Bienvenue » du Lite AU-DESSUS de la maquette (capture du 09/11).
 *
 * Principe : React qui MONTE est la preuve vivante que le navigateur est
 * moderne. Si le gate a dit « legacy » sans que l'URL le demande
 * explicitement (#fc-force-legacy), on retourne le masque posé dans <head>
 * (id fc-gate-mask), on repose les classes et on retire le fallback Lite.
 */

/** Décision durable du browser gate (survit à l'hydratation React). */
export function gateMode(): "modern" | "legacy" | "" {
  if (typeof window === "undefined") return "";
  try {
    const g = window.sessionStorage.getItem("fc_gate");
    if (g === "modern" || g === "legacy") return g;
  } catch {
    /* rien */
  }
  return String(document.documentElement.className).indexOf("fc-legacy") !== -1 ? "legacy" : "";
}

/** Le navigateur est-il classé « legacy » PAR L'URL (#fc-force-legacy) ?
 *  Ce hook de test manuel doit être RESPECTÉ même si React fonctionne. */
export function forceLegacyDemande(): boolean {
  try {
    return (window.location.hash || "").indexOf("fc-force-legacy") !== -1;
  } catch {
    return false;
  }
}

/** Retire le fallback Lite (navigateurs 2015) dès que React prend le relais. */
export function removeLegacyApp(): void {
  try {
    const el = document.getElementById("fc-legacy");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  } catch {
    /* rien */
  }
}

/** FAUX NÉGATIF du gate : React s'exécute → navigateur moderne. On retourne
 *  le masque <head id="fc-gate-mask">, on repose les classes et on retire le
 *  fallback Lite — fin de l'empilement « Bienvenue » au-dessus de la maquette.
 *  Idempotent : appelable depuis MainApp ET MaquetteGate sans effet de bord. */
export function corrigerFauxNegatifLegacy(): void {
  try {
    const root = document.documentElement;
    root.className = root.className.replace(/fc-legacy/g, "").trim();
    if (root.className.indexOf("fc-modern") === -1) root.className += " fc-modern";
  } catch {
    /* rien */
  }
  try {
    window.sessionStorage.setItem("fc_gate", "modern");
  } catch {
    /* rien */
  }
  try {
    const masque = document.getElementById("fc-gate-mask");
    if (masque) masque.textContent = "#fc-legacy{display:none!important}";
  } catch {
    /* rien */
  }
  removeLegacyApp();
}
