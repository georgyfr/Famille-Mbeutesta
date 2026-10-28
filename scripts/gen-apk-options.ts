// Génère scripts/apk-options-v1.1.0.json — APK v1.1.0 signé avec la MÊME clé que v1.0.0
// (mise à jour en place sans désinstallation) + raccourcis natifs Android.
import { readFileSync, writeFileSync } from "node:fs";

const keystoreB64 = readFileSync("/tmp/keystore.b64", "utf8").trim();
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
    password: "7xVBTZaYoar1",
    storePassword: "7xVBTZaYoar1",
    keyPassword: "7xVBTZaYoar1",
  },
};

writeFileSync("/home/z/my-project/scripts/apk-options-v1.1.0.json", JSON.stringify(options, null, 2));
console.log("OK — scripts/apk-options-v1.1.0.json écrit,", JSON.stringify(options).length, "octets");
