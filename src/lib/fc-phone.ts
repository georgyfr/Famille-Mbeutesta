// ─────────────────────────────────────────────────────────────────────────────
// Normalisation des numéros de téléphone — multi-pays (diaspora)
//
// La famille vit dans plusieurs pays : un numéro est stocké au format
// international E.164 sans espaces, ex :
//   • Cameroun  → +237691234567
//   • France    → +33612345678
//   • Canada    → +14155550123
//
// Le FRONTEND envoie : { phone: "<indicatif><numéro national>" (chiffres),
//                        country: "CM" | "FR" | … (ISO 3166-1 alpha-2) }
//
// RÉTRO-COMPATIBILITÉ (applications anciennes / mode lite / saisie libre) :
//   • 9 chiffres commençant par 6 ou 2      → Cameroun (+237…)
//   • 00237… / +237…                        → indicatif retiré, Cameroun
//   • plus de 9 chiffres avec un indicatif connu (33, 32, 41, 44, 1, …)
//     → indicatif détecté par correspondance du préfixe le plus long
//
// RÈGLES :
//   • CM : numéro national strictement à 9 chiffres, commençant par 6 ou 2
//   • autres pays : numéro national de 6 à 14 chiffres (largeur volontaire :
//     le numéro sert à identifier la personne, pas à envoyer des SMS)
// ─────────────────────────────────────────────────────────────────────────────

export const DIALS: Record<string, string> = {
  AD: "376", AE: "971", AF: "93", AG: "1", AI: "1", AL: "355", AM: "374",
  AO: "244", AR: "54", AS: "1", AT: "43", AU: "61", AW: "297", AX: "358",
  AZ: "994", BA: "387", BB: "1", BD: "880", BE: "32", BF: "226", BG: "359",
  BH: "973", BI: "257", BJ: "229", BL: "590", BM: "1", BN: "673", BO: "591",
  BR: "55", BS: "1", BT: "975", BW: "267", BY: "375", BZ: "501", CA: "1",
  CD: "243", CF: "236", CG: "242", CH: "41", CI: "225", CK: "682", CL: "56",
  CM: "237", CN: "86", CO: "57", CR: "506", CU: "53", CV: "238", CW: "599",
  CX: "61", CY: "357", CZ: "420", DE: "49", DJ: "253", DK: "45", DM: "1",
  DO: "1", DZ: "213", EC: "593", EE: "372", EG: "20", EH: "212", ER: "291",
  ES: "34", ET: "251", FI: "358", FJ: "679", FK: "500", FM: "691", FO: "298",
  FR: "33", GA: "241", GB: "44", GD: "1", GE: "995", GF: "594", GG: "44",
  GH: "233", GI: "350", GL: "299", GM: "220", GN: "224", GP: "590", GQ: "240",
  GR: "30", GT: "502", GU: "1", GW: "245", GY: "592", HK: "852", HN: "504",
  HR: "385", HT: "509", HU: "36", ID: "62", IE: "353", IL: "972", IM: "44",
  IN: "91", IO: "246", IQ: "964", IR: "98", IS: "354", IT: "39", JE: "44",
  JM: "1", JO: "962", JP: "81", KE: "254", KG: "996", KH: "855", KI: "686",
  KM: "269", KN: "1", KR: "82", KW: "965", KY: "1", KZ: "7", LA: "856",
  LB: "961", LC: "1", LI: "423", LK: "94", LR: "231", LS: "266", LT: "370",
  LU: "352", LV: "371", LY: "218", MA: "212", MC: "377", MD: "373", ME: "382",
  MF: "590", MG: "261", MH: "692", MK: "389", ML: "223", MM: "95", MN: "976",
  MO: "853", MP: "1", MQ: "596", MR: "222", MS: "1", MT: "356", MU: "230",
  MV: "960", MW: "265", MX: "52", MY: "60", MZ: "258", NA: "264", NC: "687",
  NE: "227", NF: "672", NG: "234", NI: "505", NL: "31", NO: "47", NP: "977",
  NR: "674", NU: "683", NZ: "64", OM: "968", PA: "507", PE: "51", PF: "689",
  PG: "675", PH: "63", PK: "92", PL: "48", PM: "508", PR: "1", PS: "970",
  PT: "351", PW: "680", PY: "595", QA: "974", RE: "262", RO: "40", RS: "381",
  RU: "7", RW: "250", SA: "966", SB: "677", SC: "248", SD: "249", SE: "46",
  SG: "65", SH: "290", SI: "386", SK: "421", SL: "232", SM: "378", SN: "221",
  SO: "252", SR: "597", SS: "211", ST: "239", SV: "503", SX: "1", SY: "963",
  SZ: "268", TC: "1", TD: "235", TG: "228", TH: "66", TJ: "992", TK: "690",
  TL: "670", TM: "993", TN: "216", TO: "676", TR: "90", TT: "1", TV: "688",
  TW: "886", TZ: "255", UA: "380", UG: "256", US: "1", UY: "598", UZ: "998",
  VA: "39", VC: "1", VE: "58", VG: "1", VI: "1", VN: "84", VU: "678",
  WF: "681", WS: "685", XK: "383", YE: "967", YT: "262", ZA: "27", ZM: "260",
  ZW: "263",
};

/* Indicatif → ISO par défaut (préfixe le plus long d'abord) — repli uniquement */
const DIAL_TO_ISO: { dial: string; iso: string }[] = (() => {
  const seen = new Set<string>();
  const out: { dial: string; iso: string }[] = [];
  for (const [iso, dial] of Object.entries(DIALS)) {
    if (seen.has(dial)) continue;
    seen.add(dial);
    out.push({ dial, iso });
  }
  return out.sort((a, b) => b.dial.length - a.dial.length);
})();

function isCameroonNational(digits: string): boolean {
  return digits.length === 9 && /^[62]/.test(digits);
}

/**
 * Normalise un numéro de téléphone vers le format E.164 (« +237691234567 »).
 * @param raw        saisie utilisateur (peut contenir espaces, +, tirets)
 * @param countryIso pays choisi dans le sélecteur (ISO 3166-1 alpha-2), optionnel
 * @returns le numéro normalisé, ou null si invalide
 */
export function normalizePhoneIntl(raw: unknown, countryIso?: unknown): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return null;

  // Préfixe international « 00 » (ex : 0023369…)
  if (digits.startsWith("00")) digits = digits.slice(2);

  const iso =
    typeof countryIso === "string" && countryIso.length === 2
      ? countryIso.toUpperCase()
      : null;

  /* 1) Pays explicite (sélecteur) — chemin principal du nouveau formulaire */
  if (iso && DIALS[iso]) {
    const dial = DIALS[iso];
    // L'utilisateur a (éventuellement) recopié l'indicatif : on le retire
    if (digits.startsWith(dial) && digits.length > dial.length) {
      const rest = digits.slice(dial.length);
      if (iso === "CM") return isCameroonNational(rest) ? "+237" + rest : null;
      if (rest.length >= 6 && rest.length <= 14) return "+" + dial + rest;
      return null;
    }
    // Numéro national saisi sans indicatif
    if (iso === "CM") return isCameroonNational(digits) ? "+237" + digits : null;
    if (digits.length >= 6 && digits.length <= 14) return "+" + dial + digits;
    return null;
  }

  /* 2) Chemin hérité sans pays : Cameroun d'abord (historique de l'app),
        puis détection de l'indicatif par préfixe pour les numéros longs. */
  if (digits.startsWith("00237")) digits = digits.slice(5);
  else if (digits.startsWith("237") && digits.length !== 9) digits = digits.slice(3);

  if (isCameroonNational(digits)) return "+237" + digits;

  if (digits.length > 9) {
    for (const { dial, iso: dIso } of DIAL_TO_ISO) {
      if (digits.startsWith(dial)) {
        const rest = digits.slice(dial.length);
        if (rest.length >= 6 && rest.length <= 14) return "+" + dial + rest;
      }
    }
  }

  return null;
}

/** Message d'erreur parlant, adapté au pays choisi. */
export function phoneErrorHint(countryIso?: unknown): string {
  const iso =
    typeof countryIso === "string" && countryIso.length === 2
      ? countryIso.toUpperCase()
      : null;
  if (iso === "CM" || !iso || !DIALS[iso]) {
    return "Numéro camerounais invalide. Exemple : 6 91 23 45 67 (9 chiffres).";
  }
  return `Numéro invalide pour l'indicatif +${DIALS[iso]} — saisissez le numéro national sans l'indicatif (6 à 14 chiffres).`;
}
