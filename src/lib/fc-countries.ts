"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Annuaire international des indicatifs téléphoniques — Famille.Mbeutetsa
//
// La famille est répartie sur plusieurs pays (diaspora) : le sélecteur de
// pays doit proposer TOUS les indicatifs, détecter automatiquement le pays
// où se trouve l'utilisateur, et mémoriser son choix s'il le change.
//
// DÉTECTION (chaîne de secours, 100 % gratuite, sans clé API) :
//   1. /api/geo → pays renvoyé par Cloudflare (en-tête CF-IPCountry, gratuit,
//      illimité, aucun service externe) — le plus fiable « où il se trouve »
//   2. Langue du navigateur (navigator.language, ex : « fr-FR » → FR)
//   3. Fuseau horaire (Intl) → pays le plus probable
//   4. Par défaut : Cameroun (+237) — la famille est d'origine camerounaise
//
// PERSISTANCE :
//   • fc_dial        → dernier pays utilisé (auto ou manuel)
//   • fc_dial_manual → "1" si l'utilisateur a choisi lui-même son pays
//     (dans ce cas on ne re-détecte plus jamais automatiquement)
// ─────────────────────────────────────────────────────────────────────────────

export type Country = {
  iso: string; // ISO 3166-1 alpha-2
  fr: string; // nom en français
  dial: string; // indicatif international (sans « + »)
  len?: number; // longueur typique du numéro national (mobile) — indication
};

/* Ordre d'affichage : Cameroun en tête, puis pays de la diaspora, puis le
   reste du monde par ordre alphabétique français. */
export const COUNTRIES: Country[] = [
  { iso: "CM", fr: "Cameroun", dial: "237", len: 9 },

  // ── Diaspora & pays fréquents ──
  { iso: "FR", fr: "France", dial: "33", len: 9 },
  { iso: "BE", fr: "Belgique", dial: "32", len: 9 },
  { iso: "CA", fr: "Canada", dial: "1", len: 10 },
  { iso: "US", fr: "États-Unis", dial: "1", len: 10 },
  { iso: "DE", fr: "Allemagne", dial: "49" },
  { iso: "GB", fr: "Royaume-Uni", dial: "44", len: 10 },
  { iso: "CH", fr: "Suisse", dial: "41", len: 9 },
  { iso: "IT", fr: "Italie", dial: "39", len: 10 },
  { iso: "ES", fr: "Espagne", dial: "34", len: 9 },
  { iso: "TR", fr: "Turquie", dial: "90", len: 10 },
  { iso: "CN", fr: "Chine", dial: "86", len: 11 },
  { iso: "AE", fr: "Émirats arabes unis", dial: "971", len: 9 },
  { iso: "ZA", fr: "Afrique du Sud", dial: "27", len: 9 },
  { iso: "NG", fr: "Nigeria", dial: "234", len: 10 },
  { iso: "GA", fr: "Gabon", dial: "241", len: 7 },
  { iso: "GQ", fr: "Guinée équatoriale", dial: "240", len: 9 },
  { iso: "CG", fr: "Congo (Brazzaville)", dial: "242", len: 9 },
  { iso: "CD", fr: "RD Congo (Kinshasa)", dial: "243", len: 9 },
  { iso: "TD", fr: "Tchad", dial: "235", len: 8 },
  { iso: "CF", fr: "République centrafricaine", dial: "236", len: 8 },
  { iso: "CI", fr: "Côte d'Ivoire", dial: "225", len: 10 },
  { iso: "SN", fr: "Sénégal", dial: "221", len: 9 },

  // ── Reste du monde (alphabétique) ──
  { iso: "AD", fr: "Andorre", dial: "376" },
  { iso: "AF", fr: "Afghanistan", dial: "93", len: 9 },
  { iso: "AG", fr: "Antigua-et-Barbuda", dial: "1" },
  { iso: "AI", fr: "Anguilla", dial: "1" },
  { iso: "AL", fr: "Albanie", dial: "355", len: 9 },
  { iso: "AM", fr: "Arménie", dial: "374", len: 8 },
  { iso: "AO", fr: "Angola", dial: "244", len: 9 },
  { iso: "AR", fr: "Argentine", dial: "54", len: 10 },
  { iso: "AS", fr: "Samoa américaines", dial: "1" },
  { iso: "AT", fr: "Autriche", dial: "43", len: 10 },
  { iso: "AU", fr: "Australie", dial: "61", len: 9 },
  { iso: "AW", fr: "Aruba", dial: "297", len: 7 },
  { iso: "AZ", fr: "Azerbaïdjan", dial: "994", len: 9 },
  { iso: "BA", fr: "Bosnie-Herzégovine", dial: "387", len: 8 },
  { iso: "BB", fr: "Barbade", dial: "1" },
  { iso: "BD", fr: "Bangladesh", dial: "880", len: 10 },
  { iso: "BF", fr: "Burkina Faso", dial: "226", len: 8 },
  { iso: "BG", fr: "Bulgarie", dial: "359" },
  { iso: "BH", fr: "Bahreïn", dial: "973", len: 8 },
  { iso: "BI", fr: "Burundi", dial: "257", len: 8 },
  { iso: "BJ", fr: "Bénin", dial: "229", len: 8 },
  { iso: "BL", fr: "Saint-Barthélemy", dial: "590" },
  { iso: "BM", fr: "Bermudes", dial: "1" },
  { iso: "BN", fr: "Brunéi", dial: "673", len: 7 },
  { iso: "BO", fr: "Bolivie", dial: "591", len: 8 },
  { iso: "BR", fr: "Brésil", dial: "55" },
  { iso: "BS", fr: "Bahamas", dial: "1" },
  { iso: "BT", fr: "Bhoutan", dial: "975", len: 8 },
  { iso: "BW", fr: "Botswana", dial: "267" },
  { iso: "BY", fr: "Biélorussie", dial: "375", len: 9 },
  { iso: "BZ", fr: "Belize", dial: "501", len: 7 },
  { iso: "CC", fr: "Îles Cocos", dial: "61" },
  { iso: "CK", fr: "Îles Cook", dial: "682", len: 5 },
  { iso: "CL", fr: "Chili", dial: "56", len: 9 },
  { iso: "CO", fr: "Colombie", dial: "57", len: 10 },
  { iso: "CR", fr: "Costa Rica", dial: "506", len: 8 },
  { iso: "CU", fr: "Cuba", dial: "53", len: 8 },
  { iso: "CV", fr: "Cap-Vert", dial: "238", len: 7 },
  { iso: "CW", fr: "Curaçao", dial: "599" },
  { iso: "CX", fr: "Île Christmas", dial: "61" },
  { iso: "CY", fr: "Chypre", dial: "357", len: 8 },
  { iso: "CZ", fr: "Tchéquie", dial: "420", len: 9 },
  { iso: "DJ", fr: "Djibouti", dial: "253", len: 8 },
  { iso: "DK", fr: "Danemark", dial: "45", len: 8 },
  { iso: "DM", fr: "Dominique", dial: "1" },
  { iso: "DO", fr: "République dominicaine", dial: "1" },
  { iso: "DZ", fr: "Algérie", dial: "213", len: 9 },
  { iso: "EC", fr: "Équateur", dial: "593", len: 9 },
  { iso: "EE", fr: "Estonie", dial: "372" },
  { iso: "EG", fr: "Égypte", dial: "20", len: 10 },
  { iso: "EH", fr: "Sahara occidental", dial: "212", len: 9 },
  { iso: "ER", fr: "Érythrée", dial: "291", len: 7 },
  { iso: "ET", fr: "Éthiopie", dial: "251", len: 9 },
  { iso: "FI", fr: "Finlande", dial: "358", len: 9 },
  { iso: "FJ", fr: "Fidji", dial: "679", len: 7 },
  { iso: "FK", fr: "Îles Malouines", dial: "500", len: 5 },
  { iso: "FM", fr: "Micronésie", dial: "691", len: 7 },
  { iso: "FO", fr: "Îles Féroé", dial: "298", len: 6 },
  { iso: "GD", fr: "Grenade", dial: "1" },
  { iso: "GE", fr: "Géorgie", dial: "995", len: 9 },
  { iso: "GF", fr: "Guyane française", dial: "594", len: 9 },
  { iso: "GG", fr: "Guernesey", dial: "44", len: 10 },
  { iso: "GH", fr: "Ghana", dial: "233", len: 9 },
  { iso: "GI", fr: "Gibraltar", dial: "350", len: 8 },
  { iso: "GL", fr: "Groenland", dial: "299", len: 6 },
  { iso: "GM", fr: "Gambie", dial: "220", len: 7 },
  { iso: "GN", fr: "Guinée", dial: "224", len: 9 },
  { iso: "GP", fr: "Guadeloupe", dial: "590", len: 9 },
  { iso: "GR", fr: "Grèce", dial: "30", len: 10 },
  { iso: "GT", fr: "Guatemala", dial: "502", len: 8 },
  { iso: "GU", fr: "Guam", dial: "1" },
  { iso: "GW", fr: "Guinée-Bissau", dial: "245" },
  { iso: "GY", fr: "Guyana", dial: "592", len: 7 },
  { iso: "HK", fr: "Hong Kong", dial: "852", len: 8 },
  { iso: "HN", fr: "Honduras", dial: "504", len: 8 },
  { iso: "HR", fr: "Croatie", dial: "385", len: 9 },
  { iso: "HT", fr: "Haïti", dial: "509", len: 8 },
  { iso: "HU", fr: "Hongrie", dial: "36", len: 9 },
  { iso: "ID", fr: "Indonésie", dial: "62" },
  { iso: "IE", fr: "Irlande", dial: "353", len: 9 },
  { iso: "IL", fr: "Israël", dial: "972", len: 9 },
  { iso: "IM", fr: "Île de Man", dial: "44", len: 10 },
  { iso: "IN", fr: "Inde", dial: "91", len: 10 },
  { iso: "IO", fr: "Territoire britannique de l'océan Indien", dial: "246", len: 7 },
  { iso: "IQ", fr: "Irak", dial: "964", len: 10 },
  { iso: "IR", fr: "Iran", dial: "98", len: 10 },
  { iso: "IS", fr: "Islande", dial: "354", len: 7 },
  { iso: "JE", fr: "Jersey", dial: "44", len: 10 },
  { iso: "JM", fr: "Jamaïque", dial: "1" },
  { iso: "JO", fr: "Jordanie", dial: "962", len: 9 },
  { iso: "JP", fr: "Japon", dial: "81", len: 10 },
  { iso: "KE", fr: "Kenya", dial: "254", len: 9 },
  { iso: "KG", fr: "Kirghizistan", dial: "996", len: 9 },
  { iso: "KH", fr: "Cambodge", dial: "855" },
  { iso: "KI", fr: "Kiribati", dial: "686" },
  { iso: "KM", fr: "Comores", dial: "269", len: 7 },
  { iso: "KN", fr: "Saint-Christophe-et-Niévès", dial: "1" },
  { iso: "KR", fr: "Corée du Sud", dial: "82" },
  { iso: "KW", fr: "Koweït", dial: "965", len: 8 },
  { iso: "KY", fr: "Îles Caïmans", dial: "1" },
  { iso: "KZ", fr: "Kazakhstan", dial: "7", len: 10 },
  { iso: "LA", fr: "Laos", dial: "856" },
  { iso: "LB", fr: "Liban", dial: "961" },
  { iso: "LC", fr: "Sainte-Lucie", dial: "1" },
  { iso: "LI", fr: "Liechtenstein", dial: "423", len: 7 },
  { iso: "LK", fr: "Sri Lanka", dial: "94", len: 9 },
  { iso: "LR", fr: "Liberia", dial: "231" },
  { iso: "LS", fr: "Lesotho", dial: "266", len: 8 },
  { iso: "LT", fr: "Lituanie", dial: "370", len: 8 },
  { iso: "LU", fr: "Luxembourg", dial: "352" },
  { iso: "LV", fr: "Lettonie", dial: "371", len: 8 },
  { iso: "LY", fr: "Libye", dial: "218", len: 9 },
  { iso: "MA", fr: "Maroc", dial: "212", len: 9 },
  { iso: "MC", fr: "Monaco", dial: "377" },
  { iso: "MD", fr: "Moldavie", dial: "373", len: 8 },
  { iso: "ME", fr: "Monténégro", dial: "382", len: 8 },
  { iso: "MF", fr: "Saint-Martin (France)", dial: "590", len: 9 },
  { iso: "MG", fr: "Madagascar", dial: "261", len: 9 },
  { iso: "MH", fr: "Îles Marshall", dial: "692", len: 7 },
  { iso: "MK", fr: "Macédoine du Nord", dial: "389", len: 8 },
  { iso: "ML", fr: "Mali", dial: "223", len: 8 },
  { iso: "MM", fr: "Birmanie", dial: "95" },
  { iso: "MN", fr: "Mongolie", dial: "976", len: 8 },
  { iso: "MO", fr: "Macao", dial: "853", len: 8 },
  { iso: "MP", fr: "Îles Mariannes du Nord", dial: "1" },
  { iso: "MQ", fr: "Martinique", dial: "596", len: 9 },
  { iso: "MR", fr: "Mauritanie", dial: "222", len: 8 },
  { iso: "MS", fr: "Montserrat", dial: "1" },
  { iso: "MT", fr: "Malte", dial: "356", len: 8 },
  { iso: "MU", fr: "Maurice", dial: "230" },
  { iso: "MV", fr: "Maldives", dial: "960", len: 7 },
  { iso: "MW", fr: "Malawi", dial: "265" },
  { iso: "MX", fr: "Mexique", dial: "52", len: 10 },
  { iso: "MY", fr: "Malaisie", dial: "60" },
  { iso: "MZ", fr: "Mozambique", dial: "258", len: 9 },
  { iso: "NA", fr: "Namibie", dial: "264", len: 9 },
  { iso: "NC", fr: "Nouvelle-Calédonie", dial: "687", len: 6 },
  { iso: "NE", fr: "Niger", dial: "227", len: 8 },
  { iso: "NF", fr: "Île Norfolk", dial: "672" },
  { iso: "NI", fr: "Nicaragua", dial: "505", len: 8 },
  { iso: "NL", fr: "Pays-Bas", dial: "31", len: 9 },
  { iso: "NO", fr: "Norvège", dial: "47", len: 8 },
  { iso: "NP", fr: "Népal", dial: "977", len: 10 },
  { iso: "NR", fr: "Nauru", dial: "674", len: 7 },
  { iso: "NU", fr: "Niue", dial: "683", len: 4 },
  { iso: "NZ", fr: "Nouvelle-Zélande", dial: "64" },
  { iso: "OM", fr: "Oman", dial: "968", len: 8 },
  { iso: "PA", fr: "Panama", dial: "507", len: 8 },
  { iso: "PE", fr: "Pérou", dial: "51", len: 9 },
  { iso: "PF", fr: "Polynésie française", dial: "689", len: 6 },
  { iso: "PG", fr: "Papouasie-Nouvelle-Guinée", dial: "675", len: 8 },
  { iso: "PH", fr: "Philippines", dial: "63", len: 10 },
  { iso: "PK", fr: "Pakistan", dial: "92", len: 10 },
  { iso: "PL", fr: "Pologne", dial: "48", len: 9 },
  { iso: "PM", fr: "Saint-Pierre-et-Miquelon", dial: "508", len: 6 },
  { iso: "PR", fr: "Porto Rico", dial: "1" },
  { iso: "PS", fr: "Palestine", dial: "970", len: 9 },
  { iso: "PT", fr: "Portugal", dial: "351", len: 9 },
  { iso: "PW", fr: "Palaos", dial: "680", len: 7 },
  { iso: "PY", fr: "Paraguay", dial: "595", len: 9 },
  { iso: "QA", fr: "Qatar", dial: "974", len: 8 },
  { iso: "RE", fr: "Réunion", dial: "262", len: 9 },
  { iso: "RO", fr: "Roumanie", dial: "40", len: 9 },
  { iso: "RS", fr: "Serbie", dial: "381" },
  { iso: "RU", fr: "Russie", dial: "7", len: 10 },
  { iso: "RW", fr: "Rwanda", dial: "250", len: 9 },
  { iso: "SA", fr: "Arabie saoudite", dial: "966", len: 9 },
  { iso: "SB", fr: "Îles Salomon", dial: "677" },
  { iso: "SC", fr: "Seychelles", dial: "248", len: 7 },
  { iso: "SD", fr: "Soudan", dial: "249", len: 9 },
  { iso: "SE", fr: "Suède", dial: "46", len: 9 },
  { iso: "SG", fr: "Singapour", dial: "65", len: 8 },
  { iso: "SH", fr: "Sainte-Hélène", dial: "290", len: 4 },
  { iso: "SI", fr: "Slovénie", dial: "386", len: 8 },
  { iso: "SK", fr: "Slovaquie", dial: "421", len: 9 },
  { iso: "SL", fr: "Sierra Leone", dial: "232", len: 8 },
  { iso: "SM", fr: "Saint-Marin", dial: "378" },
  { iso: "SO", fr: "Somalie", dial: "252" },
  { iso: "SR", fr: "Suriname", dial: "597", len: 7 },
  { iso: "SS", fr: "Soudan du Sud", dial: "211", len: 9 },
  { iso: "ST", fr: "Sao Tomé-et-Principe", dial: "239", len: 7 },
  { iso: "SV", fr: "Salvador", dial: "503", len: 8 },
  { iso: "SX", fr: "Saint-Martin (Pays-Bas)", dial: "1" },
  { iso: "SY", fr: "Syrie", dial: "963", len: 9 },
  { iso: "SZ", fr: "Eswatini", dial: "268", len: 8 },
  { iso: "TC", fr: "Îles Turques-et-Caïques", dial: "1" },
  { iso: "TG", fr: "Togo", dial: "228", len: 8 },
  { iso: "TH", fr: "Thaïlande", dial: "66", len: 9 },
  { iso: "TJ", fr: "Tadjikistan", dial: "992", len: 9 },
  { iso: "TK", fr: "Tokelau", dial: "690", len: 4 },
  { iso: "TL", fr: "Timor oriental", dial: "670" },
  { iso: "TM", fr: "Turkménistan", dial: "993", len: 8 },
  { iso: "TN", fr: "Tunisie", dial: "216", len: 8 },
  { iso: "TO", fr: "Tonga", dial: "676" },
  { iso: "TT", fr: "Trinité-et-Tobago", dial: "1" },
  { iso: "TV", fr: "Tuvalu", dial: "688" },
  { iso: "TW", fr: "Taïwan", dial: "886", len: 9 },
  { iso: "TZ", fr: "Tanzanie", dial: "255", len: 9 },
  { iso: "UA", fr: "Ukraine", dial: "380", len: 9 },
  { iso: "UG", fr: "Ouganda", dial: "256", len: 9 },
  { iso: "UY", fr: "Uruguay", dial: "598", len: 8 },
  { iso: "UZ", fr: "Ouzbékistan", dial: "998", len: 9 },
  { iso: "VA", fr: "Vatican", dial: "39" },
  { iso: "VC", fr: "Saint-Vincent-et-les-Grenadines", dial: "1" },
  { iso: "VE", fr: "Venezuela", dial: "58", len: 10 },
  { iso: "VG", fr: "Îles Vierges britanniques", dial: "1" },
  { iso: "VI", fr: "Îles Vierges des États-Unis", dial: "1" },
  { iso: "VN", fr: "Viêt Nam", dial: "84", len: 9 },
  { iso: "VU", fr: "Vanuatu", dial: "678" },
  { iso: "WF", fr: "Wallis-et-Futuna", dial: "681", len: 6 },
  { iso: "WS", fr: "Samoa", dial: "685" },
  { iso: "XK", fr: "Kosovo", dial: "383", len: 8 },
  { iso: "YE", fr: "Yémen", dial: "967", len: 9 },
  { iso: "YT", fr: "Mayotte", dial: "262", len: 9 },
  { iso: "ZM", fr: "Zambie", dial: "260", len: 9 },
  { iso: "ZW", fr: "Zimbabwe", dial: "263", len: 9 },
];

/* Indicatif → pays par défaut (correspondance inverse, préfixe le plus
   long d'abord). Sert uniquement au repli « saisie libre » (mode lite). */
export const DIAL_TO_ISO: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of COUNTRIES) if (!m[c.dial]) m[c.dial] = c.iso;
  return m;
})();

export const DEFAULT_COUNTRY: Country = COUNTRIES[0]; // Cameroun

export function countryByIso(iso: string | null | undefined): Country | null {
  if (!iso || typeof iso !== "string") return null;
  const up = iso.toUpperCase();
  return COUNTRIES.find((c) => c.iso === up) ?? null;
}

export function flagEmoji(iso: string): string {
  if (!/^[A-Za-z]{2}$/.test(iso)) return "🌐";
  return iso
    .toUpperCase()
    .split("")
    .map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
    .join("");
}

/* ─── Normalisation visuelle : « 691234567 » → « 6 91 23 45 67 » ─── */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function groupPhone(d: string): string {
  const parts = [d.slice(0, 1), d.slice(1, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9), d.slice(9, 11), d.slice(11, 13)].filter(Boolean);
  return parts.join(" ");
}

export function prettyPhone(country: Country, national: string): string {
  return `+${country.dial} ${groupPhone(national)}`.trim();
}

/* ─── Fuseau horaire → pays (repli si /api/geo indisponible) ─── */
const TZ_COUNTRY: Record<string, string> = {
  "Africa/Douala": "CM", "Africa/Lagos": "NG", "Africa/Abidjan": "CI",
  "Africa/Accra": "GH", "Africa/Addis_Ababa": "ET", "Africa/Algiers": "DZ",
  "Africa/Antananarivo": "MG", "Africa/Bamako": "ML", "Africa/Bangui": "CF",
  "Africa/Brazzaville": "CG", "Africa/Bujumbura": "BI", "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA", "Africa/Conakry": "GN", "Africa/Cotonou": "BJ",
  "Africa/Dakar": "SN", "Africa/Dar_es_Salaam": "TZ", "Africa/Djibouti": "DJ",
  "Africa/Freetown": "SL", "Africa/Gaborone": "BW", "Africa/Harare": "ZW",
  "Africa/Johannesburg": "ZA", "Africa/Kampala": "UG", "Africa/Khartoum": "SD",
  "Africa/Kigali": "RW", "Africa/Kinshasa": "CD", "Africa/Libreville": "GA",
  "Africa/Lome": "TG", "Africa/Luanda": "AO", "Africa/Lubumbashi": "CD",
  "Africa/Lusaka": "ZM", "Africa/Malabo": "GQ", "Africa/Maputo": "MZ",
  "Africa/Maseru": "LS", "Africa/Mbabane": "SZ", "Africa/Mogadishu": "SO",
  "Africa/Monrovia": "LR", "Africa/Nairobi": "KE", "Africa/Ndjamena": "TD",
  "Africa/Niamey": "NE", "Africa/Nouakchott": "MR", "Africa/Ouagadougou": "BF",
  "Africa/Porto-Novo": "BJ", "Africa/Sao_Tome": "ST", "Africa/Tripoli": "LY",
  "Africa/Tunis": "TN", "Africa/Windhoek": "NA",
  "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Zurich": "CH",
  "Europe/Geneva": "CH", "Europe/London": "GB", "Europe/Berlin": "DE",
  "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Lisbon": "PT",
  "Europe/Amsterdam": "NL", "Europe/Luxembourg": "LU", "Europe/Vienna": "AT",
  "Europe/Dublin": "IE", "Europe/Oslo": "NO", "Europe/Stockholm": "SE",
  "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Athens": "GR",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Moscow": "RU",
  "Europe/Kiev": "UA", "Europe/Istanbul": "TR", "Europe/Monaco": "MC",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Toronto": "CA", "America/Vancouver": "CA",
  "America/Montreal": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
  "America/Bogota": "CO", "America/Lima": "PE", "America/Buenos_Aires": "AR",
  "America/Santiago": "CL", "America/Caracas": "VE", "America/Guayaquil": "EC",
  "America/La_Paz": "BO", "America/Montevideo": "UY", "America/Panama": "PA",
  "America/Havana": "CU", "America/Port-au-Prince": "HT",
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Amman": "JO",
  "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Baghdad": "IQ",
  "Asia/Tehran": "IR", "Asia/Jerusalem": "IL", "Asia/Qostanay": "KZ",
  "Asia/Almaty": "KZ", "Asia/Tashkent": "UZ", "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN", "Asia/Dhaka": "BD", "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP", "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN",
  "Asia/Saigon": "VN", "Asia/Jakarta": "ID", "Asia/Manila": "PH",
  "Asia/Kuala_Lumpur": "MY", "Asia/Singapore": "SG", "Asia/Hong_Kong": "HK",
  "Asia/Macau": "MO", "Asia/Shanghai": "CN", "Asia/Beijing": "CN",
  "Asia/Seoul": "KR", "Asia/Tokyo": "JP", "Asia/Taipei": "TW",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
};

function countryFromTimezone(): Country | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    if (TZ_COUNTRY[tz]) return countryByIso(TZ_COUNTRY[tz]);
    return null;
  } catch {
    return null;
  }
}

function countryFromLocale(): Country | null {
  try {
    const langs: string[] = Array.from(navigator.languages?.length ? navigator.languages : [navigator.language]);
    for (const tag of langs) {
      const m = /[-_]([A-Za-z]{2})\b/.exec(tag || "");
      const c = m ? countryByIso(m[1]) : null;
      if (c) return c;
    }
    return null;
  } catch {
    return null;
  }
}

/* ─── Persistance du choix ─── */
const LS_ISO = "fc_dial";
const LS_MANUAL = "fc_dial_manual";

export function loadSavedCountry(): Country | null {
  try {
    return countryByIso(localStorage.getItem(LS_ISO));
  } catch {
    return null;
  }
}

export function isManualChoice(): boolean {
  try {
    return localStorage.getItem(LS_MANUAL) === "1";
  } catch {
    return false;
  }
}

export function saveCountryChoice(iso: string, manual: boolean): void {
  try {
    localStorage.setItem(LS_ISO, iso);
    if (manual) localStorage.setItem(LS_MANUAL, "1");
  } catch {
    /* stockage indisponible — on ignore */
  }
}

/* ─── Détection automatique du pays où se trouve l'utilisateur ───
   1. Cloudflare (IP, via /api/geo)  2. fuseau horaire  3. langue  4. Cameroun */
export async function detectCountry(): Promise<{ country: Country; source: "geo" | "tz" | "locale" | "default" }> {
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { country?: string | null };
      const c = countryByIso(data.country ?? null);
      if (c) return { country: c, source: "geo" };
    }
  } catch {
    /* /api/geo indisponible — repli local */
  }
  const tz = countryFromTimezone();
  if (tz) return { country: tz, source: "tz" };
  const loc = countryFromLocale();
  if (loc) return { country: loc, source: "locale" };
  return { country: DEFAULT_COUNTRY, source: "default" };
}

/* Détection complète avec mémoire du choix manuel :
   • choix manuel enregistré → on l'honore toujours ;
   • sinon → détection à chaque visite (le membre peut déménager),
     avec le dernier pays connu en secours. */
export async function resolveInitialCountry(): Promise<{ country: Country; detected: boolean }> {
  if (isManualChoice()) {
    const saved = loadSavedCountry();
    if (saved) return { country: saved, detected: false };
  }
  const { country } = await detectCountry();
  return { country, detected: true };
}
