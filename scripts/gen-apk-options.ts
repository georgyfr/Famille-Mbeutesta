// Génère scripts/apk-options-v1.1.0.json — APK v1.1.0 signé avec la MÊME clé que v1.0.0
// (mise à jour en place sans désinstallation) + raccourcis natifs Android.
// ⚠ SÉCURITÉ : le mot de passe du keystore n'est JAMAIS en dur dans ce fichier
// (le dépôt GitHub est public). Il est lu depuis :
//   1. l'environnement APK_KEYSTORE_PASSWORD, sinon
//   2. secrets-android/signing-key-info.txt (restaurable depuis le coffre
//      chiffré secrets-famille-mbeutetsa.tar.enc — voir SECRETS.md).
import { readFileSync, writeFileSync } from "node:fs";

function keystorePassword(): string {
  if (process.env.APK_KEYSTORE_PASSWORD) return process.env.APK_KEYSTORE_PASSWORD;
  try {
    const info = readFileSync("/home/z/my-project/secrets-android/signing-key-info.txt", "utf8");
    const m = info.match(/Key store password:\s*(\S+)/);
    if (m) return m[1];
  } catch {
    /* fichier absent (miroir GitHub) */
  }
  throw new Error(
    "Mot de passe keystore introuvable : définissez APK_KEYSTORE_PASSWORD ou restaurez secrets-android/signing-key-info.txt depuis le coffre (voir SECRETS.md).",
  );
}

const keystoreB64 = readFileSync("/tmp/keystore.b64", "utf8").trim();
const KEYSTORE_PASS = keystorePassword();
const icon96 = "https://famille-mbeutetsa.pages.dev/icons/icon-96.png";

const shortcut = (name, slug) => ({
  name,
  short_name: name,
  url: `/?shortcut=${slug}`,
  icons: [{ src: icon96, sizes: "96x96", type: "image/png" }],
});

const options = {
  packageId: "cm.famille.mbeutetsa",
  name: "Famille.Mbeutetsa",
  launcherName: "Famille.Mbeutetsa",
  appVersion: "1.1.0",
  appVersionCode: 2,
  display: "standalone",
  host: "https://famille-mbeutetsa.pages.dev",
  startUrl: "/",
  webManifestUrl: "https://famille-mbeutetsa.pages.dev/manifest.webmanifest",
  themeColor: "#2A4A3A",
  themeColorDark: "#2A4A3A",
  navigationColor: "#2A4A3A",
  navigationColorDark: "#1E4D2B",
  navigationDividerColor: "#C89F62",
  navigationDividerColorDark: "#C89F62",
  backgroundColor: "#F4F1E9",
  orientation: "portrait",
  iconUrl: "https://famille-mbeutetsa.pages.dev/icons/icon-512.png",
  maskableIconUrl: "https://famille-mbeutetsa.pages.dev/icons/icon-512-maskable.png",
  monochromeIconUrl: "https://famille-mbeutetsa.pages.dev/icons/icon-512-maskable.png",
  enableNotifications: true,
  enableSiteSettingsShortcut: true,
  isChromeOSOnly: false,
  isMetaQuest: false,
  includeSourceCode: false,
  fallbackType: "webview",
  splashScreenFadeOutDuration: 300,
  shortcuts: [
    shortcut("Membres", "membres"),
    shortcut("Trésor", "tresor"),
    shortcut("Événements", "evenements"),
    shortcut("Solidarité", "solidarite"),
  ],
  features: {
    locationDelegation: { enabled: false },
    playBilling: { enabled: false },
  },
  signingMode: "mine",
  signing: {
    file: keystoreB64,
    alias: "famille-mbeutetsa-key",
    fullName: "Famille Mbeutetsa",
    organization: "Famille Mbeutetsa",
    organizationalUnit: "Famille",
    countryCode: "CM",
    password: KEYSTORE_PASS,
    storePassword: KEYSTORE_PASS,
    keyPassword: KEYSTORE_PASS,
  },
};

writeFileSync("/home/z/my-project/scripts/apk-options-v1.1.0.json", JSON.stringify(options, null, 2));
console.log("OK — scripts/apk-options-v1.1.0.json écrit,", JSON.stringify(options).length, "octets");
