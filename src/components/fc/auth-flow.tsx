"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Authentification — Famille.Mbeutetsa (v32 — le CODE est la porte d'entrée)
//
// DEMANDE DE L'ADMINISTRATEUR : « je pensais avoir été clair que tout le
// monde se connecte avec le code qu'on lui a généré. D'où vient encore cette
// page ? Je veux une première page uniquement avec le code à coller qui va le
// rediriger vers une autre page de renseignement. Je veux la page en
// interface mobile. »
//
// DEUX PAGES, INTERFACE MOBILE (une seule colonne, grands boutons tactiles) :
//   PAGE 1 — LE CODE : UNIQUEMENT un champ « collez votre code » (FCM-XXXXXX).
//     · code valide et vierge → PAGE 2 ;
//     · code déjà utilisé → bouton « Se reconnecter avec mon numéro »
//       (numéro du code prérempli) — personne ne crée de double compte ;
//     · code inconnu → message clair (vérifier auprès du bureau).
//   PAGE 2 — RENSEIGNEMENTS : nom & prénom (ou pseudo) + numéro de téléphone
//     PRÉREMPLI depuis le code (modifiable si besoin) → la notification de
//     vérification part automatiquement → le compte est créé DIRECTEMENT avec
//     le nom saisi (l'ancien écran « Comment souhaitez-vous être appelé » a
//     disparu) → géolocalisation → accueil avec le rôle attribué par le bureau.
//
// RECONNEXION (session perdue, autre appareil) : la personne recolle SON code
// → « déjà utilisé » → se reconnecte avec son numéro (OTP automatique).
//
// LIEN CLIQUABLE (v28, conservé) : « ?code=FCM-XXXXXX » (ou #code=…) ouvre
// l'app DIRECTEMENT sur la PAGE 2, code déjà accepté et numéro prérempli.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, deviceName } from "@/lib/fc-client";
import { afterAuthPush, familyNotify } from "@/lib/fc-push";
import { Country, countryByIso, DIAL_TO_ISO, groupPhone } from "@/lib/fc-countries";
import { PhoneCountrySelect, usePhoneCountry } from "./phone-country-select";
import { FcButton, FcCard, FcInput, FcSpinner, FcWatermark } from "./ui";
/* Le choix du rôle dans la Tontine n'est PLUS demandé ici : il se fait juste
 * APRÈS la sélection de la géolocalisation (assistant dédié RoleWizard dans
 * main-app.tsx). À l'inscription, le rôle de l'appareil est effacé pour que
 * le nouvel utilisateur passe par l'assistant — SAUF s'il colle un CODE
 * D'INVITATION généré par le bureau : le rôle (et la cotisation) du code sont
 * appliqués automatiquement et l'assistant est sauté (Task 67). */
import { clearVousRole, saveVousRole } from "./tontine-bureau";
import { ROLE_META } from "./tontine-data";
import {
  appliquerCotisationCode, codeInviteEnAttente, consommerCode, LIBELLES_BUREAU,
  poserCodeInvite, retirerCodeInvite, trouverCode, type CodeMembre,
} from "./codes-membres";
import {
  ArrowLeft, AtSign, Check, ChevronRight, RefreshCw, ShieldCheck, Smartphone,
  Ticket, UserRound,
} from "lucide-react";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/* Affichage international : « +237 6 91 23 45 67 » / « +33 6 12 34 56 78 » */
function prettyState(s: { dial: string; iso: string; digits: string }): string {
  const c = countryByIso(s.iso);
  const dial = c?.dial ?? s.dial;
  return `+${dial} ${groupPhone(s.digits)}`.trim();
}

/* Numéro national valide selon le pays choisi :
   • Cameroun : 9 chiffres commençant par 6 (mobile) ou 2 (fixe)
   • autres pays : 6 à 14 chiffres (largeur volontaire — le numéro sert à
     identifier le membre, la longueur exacte varie selon l'opérateur) */
function phoneDigitsOk(country: Country, d: string): boolean {
  if (country.iso === "CM") return d.length === 9 && /^[62]/.test(d);
  return d.length >= 6 && d.length <= 14;
}
function maxDigitsFor(country: Country): number {
  return country.iso === "CM" ? 9 : 14;
}
function placeholderFor(country: Country): string {
  return country.iso === "CM" ? "6 91 23 45 67" : "Numéro sans l'indicatif";
}

/* ═══════════════ CODE D'INVITATION (Task 67) ═══════════════
 * Le bureau (secrétaire, président) crée les membres AVANT leur arrivée et
 * leur remet un code « FCM-XXXXXX ». v32 : la personne colle le code SUR LA
 * PREMIÈRE PAGE — c'est la SEULE façon d'entrer. Son téléphone est prérempli,
 * puis À LA CRÉATION DU COMPTE son rôle et sa cotisation sont appliqués
 * automatiquement (appliquerCodeInvitation, plus bas) — SA page s'ouvre
 * directement, l'assistant de rôle est sauté. Un code n'expire JAMAIS. */
/* Déduit le PAYS d'un numéro international (« +237 6… » → Cameroun) — sert au
 * préremplissage depuis un code d'invitation : le pays ET le numéro sont
 * posés, quelle que soit la détection automatique du navigateur. */
function paysDepuisTelephone(tel: string): Country | null {
  const brut = tel.replace(/^\+/, "");
  for (let l = Math.min(6, brut.length); l >= 1; l--) {
    const iso = DIAL_TO_ISO[brut.slice(0, l)];
    if (iso) {
      const c = countryByIso(iso);
      if (c) return c;
    }
  }
  return null;
}

function appliquerCodeInvitation(codeAtt: string | null, fullName: string, uid: string): void {
  if (!codeAtt) return;
  const c = trouverCode(codeAtt);
  if (!c) { retirerCodeInvite(); return; }
  const maj = consommerCode(codeAtt, fullName);
  if (!maj) {
    retirerCodeInvite();
    toast.info("Votre code d'invitation était déjà utilisé — votre compte reste actif.");
    return;
  }
  saveVousRole(c.bureauRole ?? "membre");
  appliquerCotisationCode(c.cotisationTypeId, `app-${uid}`);
  retirerCodeInvite();
  const libelle = ROLE_META[c.bureauRole ?? "membre"]?.label ?? "Membre";
  toast.success("Code d'invitation appliqué 🎟️", {
    description: `Votre page « ${libelle} » s'ouvre directement${c.cotisationTypeId ? ` — cotisation « ${c.cotisationNom} » (${c.cotisationMontant.toLocaleString("fr-FR")} FCFA/mois)` : " — cotisation de base de la Tontine"}. Votre compte reste actif sans limite de temps.`,
  });
}

/* Nom saisi sur la PAGE 2 — reporté jusqu'à la création du compte (l'ancien
 * écran « Comment souhaitez-vous être appelé ? » a été supprimé : le compte
 * est créé DIRECTEMENT après la vérification du numéro). */
type NomChoisi = { firstName: string; lastName: string; pseudo: string };

type Step =
  | { k: "code" } // PAGE 1 — UNIQUEMENT le code à coller (interface mobile)
  | { k: "renseignement"; code: CodeMembre } // PAGE 2 — nom + téléphone (prérempli)
  | { k: "phone"; prefillTel: string | null } // reconnexion — numéro prérempli si code déjà utilisé
  | {
      k: "verify";
      verifyToken: string;
      digits: string;
      demoCode: string;
      dial: string;
      iso: string;
      /** Nom saisi en PAGE 2 (inscription) — null = reconnexion par numéro. */
      nom: NomChoisi | null;
      /** Retour : PAGE 2 (inscription) ou écran numéro (reconnexion). */
      codeM: CodeMembre | null;
      prefillTel: string | null;
    };

/* Crée le compte DIRECTEMENT après la vérification du numéro (v32) — le nom
 * vient de la PAGE 2. Remplace l'ancien ProfileScreen (écran « être appelé »
 * supprimé : plus aucune redemande du nom). */
async function creerCompteVerifie(registerToken: string, nom: NomChoisi): Promise<{ id: string; fullName: string }> {
  const res = await api<{ user: { id: string; fullName: string } }>("/api/auth/phone", {
    body: {
      action: "register",
      registerToken,
      firstName: nom.firstName.trim(),
      lastName: nom.lastName.trim(),
      pseudo: nom.pseudo.trim(),
      deviceName: deviceName(),
    },
  });
  if (!res.ok) throw new Error(res.error);
  try {
    localStorage.setItem("fc_uid", res.user.id);
    localStorage.setItem("fc_name", res.user.fullName);
    // Nouveau compte → parcours d'accueil complet : localisation puis rôle.
    localStorage.removeItem("fc_loc_skipped");
  } catch {
    /* rien */
  }
  // Nouveau compte → le rôle de l'appareil repart à zéro : l'assistant
  // « Votre rôle dans la Tontine » viendra juste après la géolocalisation —
  // SAUF si un code d'invitation a été collé : son rôle s'applique déjà ici
  // (page directe, assistant sauté).
  clearVousRole();
  appliquerCodeInvitation(codeInviteEnAttente(), res.user.fullName, res.user.id);
  toast.success(`Bienvenue dans la famille, ${res.user.fullName.split(" ")[0]} ! 🌳`);
  void afterAuthPush(true);
  void familyNotify({
    title: "Nouveau membre inscrit 🌳",
    body: `${res.user.fullName} vient de rejoindre Famille.Mbeutetsa.`,
    tag: "fc-register",
  });
  return res.user;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE 1 — LE CODE. Uniquement le code à coller (demande explicite de
 * l'administrateur) : pas de choix d'inscription, pas de bouton « Se
 * connecter » — tout le monde entre avec le code reçu du bureau.
 * ═══════════════════════════════════════════════════════════════════════════ */
function CodeScreen({ goto }: { goto: (s: Step) => void }) {
  const [saisie, setSaisie] = useState("");
  // Code reconnu mais DÉJÀ UTILISÉ → c'est une reconnexion, pas une création.
  const [utilise, setUtilise] = useState<CodeMembre | null>(null);

  const valider = () => {
    if (!saisie.trim()) {
      toast.error("Collez le code reçu du bureau — format FCM-XXXXXX.");
      return;
    }
    const c = trouverCode(saisie);
    if (!c) {
      setUtilise(null);
      toast.error("Code inconnu — vérifiez auprès du secrétaire ou du président qui l'a généré.");
      return;
    }
    if (c.utiliseLe) {
      setUtilise(c);
      toast.error("Ce code a déjà servi à créer un compte.", {
        description: "Si c'est votre compte, reconnectez-vous avec votre numéro — le bouton ci-dessous préremplit tout.",
      });
      return;
    }
    setUtilise(null);
    poserCodeInvite(c.code); // mémorisé jusqu'à la création du compte (consommé ensuite)
    toast.success("Code accepté 🎟️", {
      description: `Bienvenue${c.nomOptionnel ? ` ${c.nomOptionnel}` : ""} ! Complétez vos renseignements — votre page s'ouvrira avec le rôle attribué par le bureau.`,
    });
    goto({ k: "renseignement", code: c });
  };

  return (
    <div className="space-y-3">
      <FcCard className="p-6 sm:p-8">
        <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Ouvrez votre page</h2>
        <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
          Collez le code que le bureau de la Tontine vous a remis.
        </p>

        <label htmlFor="fc-code-invitation" className="sr-only">
          Code d&apos;invitation du bureau
        </label>
        <input
          id="fc-code-invitation"
          value={saisie}
          onChange={(e) => {
            setSaisie(e.target.value.toUpperCase());
            if (utilise) setUtilise(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && saisie.trim() && valider()}
          placeholder="FCM-AB12CD"
          aria-label="Code d'invitation du bureau"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="mb-4 h-[64px] w-full rounded-2xl border-2 border-[#C9B98A] bg-white px-4 text-center font-mono text-[22px] font-black tracking-[0.18em] text-[#2B3530] outline-none placeholder:font-semibold placeholder:tracking-[0.12em] placeholder:text-[#B8B2A0] focus:border-[#C89F62] focus:ring-2 focus:ring-[#C89F62]/25"
        />

        <FcButton onClick={valider} disabled={!saisie.trim()} className="h-[56px] w-full text-[16px]">
          <Ticket className="h-5 w-5" /> Continuer <ChevronRight className="h-5 w-5" />
        </FcButton>

        {/* Code déjà utilisé → RECONNEXION (jamais un second compte) : le
            numéro du code est prérempli, la vérification part toute seule. */}
        {utilise && (
          <div className="mt-4 rounded-xl border border-[#C89F62]/50 bg-[#FBF7EA] p-3.5">
            <p className="text-[12.5px] font-semibold leading-snug text-[#7A5B2E]">
              Le code <strong className="font-mono">{utilise.code}</strong> a déjà servi — s&apos;il était pour vous,
              reconnectez-vous avec votre numéro :
            </p>
            <FcButton
              variant="outline"
              onClick={() => goto({ k: "phone", prefillTel: utilise.telephone })}
              className="mt-2.5 h-[48px] w-full"
            >
              Se reconnecter avec mon numéro
            </FcButton>
          </div>
        )}

        <p className="mt-5 text-center text-[12px] leading-relaxed text-[#8A9288]">
          Le code vous a été remis par le secrétaire ou le président (format FCM-XXXXXX).
          Il ne périme jamais.
        </p>
      </FcCard>

      <p className="px-2 text-center text-[12.5px] leading-relaxed text-[#5C6B60]">
        Pas encore reçu de code ? Demandez-le au secrétaire ou au président de votre tontine.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE 2 — RENSEIGNEMENTS. La personne arrive du code (collé ou lien
 * cliquable) : nom & prénom (ou pseudo), numéro PRÉREMPLI depuis le code
 * (modifiable si elle emprunte un autre téléphone). « Continuer » déclenche
 * la vérification automatique — le compte est créé juste après, sans
 * redemander le nom.
 * ═══════════════════════════════════════════════════════════════════════════ */
function RenseignementScreen({
  state,
  busy,
  setBusy,
  goto,
}: {
  state: Extract<Step, { k: "renseignement" }>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
}) {
  const c = state.code;

  // Nom éventuellement indiqué par le bureau (« Jean Mbeutetsa ») → prérempli.
  const parties = c.nomOptionnel.trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(parties.length >= 2 ? parties[0] : c.nomOptionnel.trim());
  const [lastName, setLastName] = useState(parties.length >= 3 ? parties.slice(1).join(" ") : (parties.length === 2 ? parties[1] : ""));
  const [pseudo, setPseudo] = useState("");

  const { country, setCountry, ready } = usePhoneCountry();
  const [digits, setDigits] = useState("");
  const maxD = maxDigitsFor(country);

  // Le préremplissage depuis le code s'applique UNE fois, APRÈS la détection
  // automatique du pays (sinon elle l'écraserait) — le code fait foi.
  const prechargeFait = useRef(false);
  useEffect(() => {
    if (!ready || prechargeFait.current) return;
    prechargeFait.current = true;
    const pays = paysDepuisTelephone(c.telephone);
    if (pays) setCountry(pays);
    const dial = pays?.dial ?? country.dial;
    const brut = c.telephone.replace(/^\+/, "");
    const d = brut.startsWith(dial) ? brut.slice(dial.length) : brut;
    if (d) setDigits(onlyDigits(d).slice(0, maxDigitsFor(pays ?? country)));
  }, [ready, c.telephone, country, setCountry]);

  const nomComplet = (firstName.trim().length >= 2 && lastName.trim().length >= 2) || pseudo.trim().length >= 2;
  const toutComplet = nomComplet && phoneDigitsOk(country, digits);

  const continuer = async () => {
    if (!nomComplet) {
      toast.error("Indiquez votre prénom et votre nom — ou au moins un pseudo.");
      return;
    }
    if (!phoneDigitsOk(country, digits)) {
      toast.error(
        country.iso === "CM"
          ? "Entrez un numéro camerounais à 9 chiffres (ex : 6 91 23 45 67)."
          : `Entrez votre numéro ${country.fr} sans l'indicatif +${country.dial}.`,
      );
      return;
    }
    setBusy(true);
    try {
      poserCodeInvite(c.code); // mémorisé jusqu'à la création du compte (consommé ensuite)
      const res = await api<{ verifyToken: string; demoCode: string; known: boolean }>("/api/auth/phone", {
        body: { action: "request", phone: country.dial + digits, country: country.iso, deviceName: deviceName() },
      });
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_phone", "+" + country.dial + digits);
      } catch {
        /* rien */
      }
      toast.success(`Notification de vérification envoyée au +${country.dial} ${groupPhone(digits)}`, {
        description: "Consultez vos notifications — l'application vérifie ensuite votre appareil.",
      });
      goto({
        k: "verify",
        verifyToken: res.verifyToken,
        digits,
        demoCode: res.demoCode,
        dial: country.dial,
        iso: country.iso,
        nom: { firstName: firstName.trim(), lastName: lastName.trim(), pseudo: pseudo.trim() },
        codeM: c,
        prefillTel: null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi de la notification impossible.");
    } finally {
      setBusy(false);
    }
  };

  const libelleRole =
    c.typeMembre === "bureau" && c.bureauRole ? LIBELLES_BUREAU[c.bureauRole] : "Membre simple";

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "code" })} />
      <StepBadge current={1} total={2} label="Inscription" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Vos renseignements</h2>
      <p className="mb-5 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Votre code est accepté ✓ — dites-nous qui vous êtes.
      </p>

      {/* Ce que le bureau a déjà préparé pour cette personne (rôle, tontine,
          cotisation) — 100 % déduit du code, rien à choisir ici. */}
      <div className="mb-5 rounded-xl border border-[#2F6B45]/25 bg-[#2F6B45]/8 p-3.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-semibold leading-snug text-[#2F6B45]">
          <span className="font-mono text-[13px] font-black tracking-wider">{c.code}</span>
          <span>· {libelleRole}</span>
          <span>· Tontine de {c.ville}</span>
          {c.cotisationMontant > 0 && (
            <span>· {c.cotisationMontant.toLocaleString("fr-FR")} FCFA/mois</span>
          )}
        </p>
      </div>

      <div className="mb-3 space-y-2">
        <FcInput
          icon={<UserRound className="h-5 w-5" />}
          placeholder="Prénom (ex : Jean)"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          aria-label="Prénom"
        />
        <FcInput
          icon={<UserRound className="h-5 w-5" />}
          placeholder="Nom (ex : Mbeutetsa)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          aria-label="Nom"
        />
        <FcInput
          icon={<AtSign className="h-5 w-5" />}
          placeholder="Pseudo — facultatif (ex : Grand Frère)"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          aria-label="Pseudo, facultatif"
        />
        <div className="flex items-stretch gap-2">
          <PhoneCountrySelect
            value={country}
            onChange={(nc) => {
              setCountry(nc);
              setDigits(""); // nouveau pays → nouveau numéro
            }}
          />
          <FcInput
            className="flex-1"
            placeholder={placeholderFor(country)}
            value={groupPhone(digits)}
            onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, maxD))}
            onKeyDown={(e) => e.key === "Enter" && toutComplet && void continuer()}
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={20}
            aria-label="Numéro de téléphone (sans indicatif)"
          />
        </div>
      </div>
      <p className="mb-4 px-1 text-center text-[12px] leading-relaxed text-[#8A9288]">
        Votre numéro est prérempli depuis votre code — vérifiez-le et corrigez-le si nécessaire.
      </p>

      <FcButton onClick={() => void continuer()} disabled={busy || !toutComplet} className="h-[54px] w-full text-[16px]">
        {busy ? <FcSpinner /> : <ShieldCheck className="h-5 w-5" />}
        Continuer <ChevronRight className="h-5 w-5" />
      </FcButton>

      <p className="mt-3 text-center text-[12px] leading-relaxed text-[#8A9288]">
        {pseudo.trim().length >= 2 && !nomComplet
          ? `Vous serez affiché sous le pseudo « ${pseudo.trim()} ».`
          : "Étape suivante : la vérification du numéro — la notification part toute seule."}
      </p>
    </FcCard>
  );
}

/* ───────────────────────── Reconnexion par numéro (code déjà utilisé) ───────────────────────── */

function PhoneScreen({
  busy,
  setBusy,
  goto,
  prefillTel,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
  /** Numéro prérempli quand la personne arrive d'un code « déjà utilisé ». */
  prefillTel?: string | null;
}) {
  const [digits, setDigits] = useState("");
  const { country, setCountry, ready } = usePhoneCountry();
  const maxD = maxDigitsFor(country);

  // Préremplissage depuis le code « déjà utilisé » — UNE fois, après la
  // détection automatique du pays (le code fait foi).
  const prechargeFait = useRef(false);
  useEffect(() => {
    if (!prefillTel || !ready || prechargeFait.current) return;
    prechargeFait.current = true;
    const pays = paysDepuisTelephone(prefillTel);
    if (pays) setCountry(pays);
    const dial = pays?.dial ?? country.dial;
    const brut = prefillTel.replace(/^\+/, "");
    const d = brut.startsWith(dial) ? brut.slice(dial.length) : brut;
    if (d) setDigits(onlyDigits(d).slice(0, maxDigitsFor(pays ?? country)));
  }, [prefillTel, ready, country, setCountry]);

  const send = async () => {
    if (!phoneDigitsOk(country, digits)) {
      toast.error(
        country.iso === "CM"
          ? "Entrez un numéro camerounais à 9 chiffres (ex : 6 91 23 45 67)."
          : `Entrez votre numéro ${country.fr} sans l'indicatif +${country.dial}${country.len ? ` (${country.len} chiffres)` : " (6 à 14 chiffres)"}.`
      );
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ verifyToken: string; demoCode: string; known: boolean }>("/api/auth/phone", {
        body: { action: "request", phone: country.dial + digits, country: country.iso, deviceName: deviceName() },
      });
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_phone", "+" + country.dial + digits);
      } catch {
        /* rien */
      }
      setEnvoiRate(false);
      toast.success(`Notification de vérification envoyée au +${country.dial} ${groupPhone(digits)}`, {
        description: "Consultez vos notifications — l'application vérifie ensuite votre appareil.",
      });
      goto({
        k: "verify",
        verifyToken: res.verifyToken,
        digits,
        demoCode: res.demoCode,
        dial: country.dial,
        iso: country.iso,
        nom: null, // reconnexion — pas de création de compte
        codeM: null,
        prefillTel: prefillTel ?? null,
      });
    } catch (e) {
      setEnvoiRate(true); // repli discret : un bouton « Renvoyer » apparaît
      toast.error(e instanceof Error ? e.message : "Envoi de la notification impossible.");
    } finally {
      setBusy(false);
    }
  };

  /* NOTIFICATION AUTOMATIQUE (v29) : dès que le numéro est complet, la
   * vérification part TOUTE SEULE après un léger délai (anti-course). */
  const [envoiRate, setEnvoiRate] = useState(false);
  const envoyePourRef = useRef("");
  const cleNum = phoneDigitsOk(country, digits) ? `${country.dial}|${onlyDigits(digits)}` : "";
  useEffect(() => {
    if (!cleNum || busy) return;
    if (envoyePourRef.current === cleNum) return; // déjà envoyé pour CE numéro
    const t = setTimeout(() => {
      envoyePourRef.current = cleNum;
      void send();
    }, 850);
    return () => clearTimeout(t);
  }, [cleNum, busy, send]);

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "code" })} />
      <StepBadge current={1} total={2} label="Connexion" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Se reconnecter</h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Entrez le numéro avec lequel votre compte a été créé — la notification part automatiquement, sans mot de passe.
      </p>

      <div className="mb-4 flex items-stretch gap-2">
        <PhoneCountrySelect
          value={country}
          onChange={(c) => {
            setCountry(c);
            setDigits(""); // nouveau pays → nouveau numéro
          }}
        />
        <FcInput
          className="flex-1"
          placeholder={placeholderFor(country)}
          value={groupPhone(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, maxD))}
          onKeyDown={(e) => e.key === "Enter" && phoneDigitsOk(country, digits) && send()}
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={20}
          aria-label="Numéro de téléphone (sans indicatif)"
        />
      </div>

      <div aria-live="polite">
        {busy ? (
          <p className="flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-[#1E4D2B]/8 px-4 text-[13.5px] font-bold text-[#1E4D2B]">
            <FcSpinner /> Envoi automatique de la vérification…
          </p>
        ) : envoiRate ? (
          <FcButton variant="outline" onClick={() => void send()} className="h-[54px] w-full">
            <RefreshCw className="h-5 w-5" /> Renvoyer la vérification
          </FcButton>
        ) : (
          <p className="rounded-xl bg-[#3D6B52]/8 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#2A4A3A]">
            🔔 La notification part <b>toute seule</b> dès que votre numéro est complet — rien à cliquer.
          </p>
        )}
      </div>

      <p className="mt-4 text-center text-[12px] text-[#8A9288]">
        {country.iso === "CM"
          ? "Format camerounais — 9 chiffres commençant par 6 (mobile) ou 2 (fixe)."
          : `L'indicatif +${country.dial} est ajouté automatiquement — saisissez le numéro sans l'indicatif.`}
      </p>
    </FcCard>
  );
}

/* ───────────────────────── Vérification du numéro (OTP) ───────────────────────── */

function VerifyScreen({
  state,
  busy,
  setBusy,
  goto,
  onReady,
}: {
  state: Extract<Step, { k: "verify" }>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
  onReady: (name: string) => void;
}) {
  const [code, setCode] = useState("");
  const [manual, setManual] = useState(false);
  const [phase, setPhase] = useState<"sent" | "reading" | "detected">("sent");
  const verifiedRef = useRef(false);

  const retourVers = useCallback(
    () => goto(state.codeM ? { k: "renseignement", code: state.codeM } : { k: "phone", prefillTel: state.prefillTel }),
    [goto, state.codeM, state.prefillTel],
  );

  const doVerify = useCallback(
    async (c: string) => {
      if (verifiedRef.current) return;
      verifiedRef.current = true;
      setBusy(true);
      try {
        const res = await api<{
          registered: boolean;
          user?: { id: string; fullName: string };
          registerToken?: string;
        }>("/api/auth/phone", {
          body: { action: "verify", verifyToken: state.verifyToken, code: c, deviceName: deviceName() },
        });
        if (!res.ok) {
          verifiedRef.current = false;
          throw new Error(res.error);
        }
        if (res.registered && res.user) {
          // Le numéro est déjà enregistré → session ouverte, entrée directe.
          toast.success(`Content de vous revoir, ${res.user.fullName.split(" ")[0]} !`);
          // v32 — si un CODE D'INVITATION attendait (collé en PAGE 1 ou lien
          // cliquable) et que le numéro correspond à un compte EXISTANT
          // (ex. le bureau régénère un code pour un membre qui avait déjà un
          // compte « Georges »), le rôle et la cotisation du code s'appliquent
          // QUAND MÊME — sinon la personne entre sans son poste du bureau.
          appliquerCodeInvitation(codeInviteEnAttente(), res.user.fullName, res.user.id);
          void afterAuthPush(false);
          onReady(res.user.fullName);
        } else if (res.registerToken && state.nom) {
          // v32 — le nom vient de la PAGE 2 : le compte est créé DIRECTEMENT
          // (fini l'ancien écran « Comment souhaitez-vous être appelé ? »).
          const u = await creerCompteVerifie(res.registerToken, state.nom);
          onReady(u.fullName);
        } else if (res.registerToken) {
          // Reconnexion avec un numéro SANS compte → retour au code (seule
          // porte d'entrée d'une création de compte).
          toast.info("Aucun compte avec ce numéro — collez le code reçu du bureau pour créer votre compte.");
          goto({ k: "code" });
        } else {
          throw new Error("Réponse inattendue du serveur.");
        }
      } catch (e) {
        verifiedRef.current = false;
        setManual(true);
        setCode("");
        toast.error(e instanceof Error ? e.message : "Vérification impossible.");
      } finally {
        setBusy(false);
      }
    },
    [state.verifyToken, state.nom, setBusy, goto, onReady],
  );

  // Séquence automatique : la notification arrive, l'application lit le code
  // sur le téléphone (comme WhatsApp lit le SMS) puis vérifie toute seule.
  useEffect(() => {
    if (manual) return;
    const t1 = setTimeout(() => setPhase("reading"), 900);
    const t2 = setTimeout(() => {
      setPhase("detected");
      setCode(state.demoCode);
      toast.info("Code détecté automatiquement sur votre téléphone");
    }, 2600);
    const t3 = setTimeout(() => doVerify(state.demoCode), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [manual, state.demoCode, doVerify]);

  const goManual = () => {
    setManual(true);
    setPhase("sent");
    setCode("");
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={retourVers} />
      <StepBadge current={2} total={2} label={state.nom ? "Inscription" : "Connexion"} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Vérification du numéro</h2>
      <p className="mb-5 text-center text-[14px] text-[#5C6B60]">
        Notification envoyée au <strong>{prettyState(state)}</strong>
      </p>

      <div className="mb-4 rounded-2xl border border-[#E5DCC0] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <img
            src="/logo-famille.webp"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 rounded-lg bg-[#FBF7EA] p-0.5 ring-1 ring-[#C89F62]/50"
          />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#2B3530]">
              Famille.Mbeutetsa <span className="font-normal text-[#8A9288]">· à l&apos;instant</span>
            </p>
            <p className="text-[14px] leading-snug text-[#5C6B60]">
              Votre code de vérification est{" "}
              <span className="font-bold tracking-wider text-[#1E4D2B]">{state.demoCode}</span>. Ne le partagez
              avec personne.
            </p>
          </div>
        </div>
      </div>

      {!manual && (
        <ol className="mb-5 space-y-2.5" aria-label="Progression de la vérification">
          <CheckStep done text="Notification envoyée sur votre téléphone" />
          <CheckStep
            done={phase === "detected"}
            active={phase === "reading"}
            text={phase === "detected" ? "Numéro vérifié sur cet appareil" : "Vérification du numéro sur cet appareil…"}
          />
          <CheckStep
            done={phase === "detected"}
            active={phase === "detected"}
            text={phase === "detected" ? "Code lu automatiquement" : "Lecture de la notification…"}
          />
        </ol>
      )}

      {manual && (
        <>
          <FcInput
            icon={<Smartphone className="h-5 w-5" />}
            placeholder="● ● ● ● ● ●"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && doVerify(code)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="mb-4 text-center text-[20px] tracking-[0.4em]"
            aria-label="Code de vérification à 6 chiffres"
          />
          <FcButton onClick={() => doVerify(code)} disabled={busy || code.length !== 6} className="h-[54px]">
            {busy ? <FcSpinner /> : <ShieldCheck className="h-5 w-5" />}
            Confirmer mon numéro
          </FcButton>
        </>
      )}

      <div className="mt-3 flex flex-col items-center gap-1">
        {manual ? (
          <button
            className="flex items-center gap-1.5 text-sm text-[#C89F62] hover:underline"
            onClick={retourVers}
            disabled={busy}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Renvoyer la notification
          </button>
        ) : (
          <button className="text-sm text-[#5C6B60] hover:underline" onClick={goManual} disabled={busy}>
            Saisir le code manuellement
          </button>
        )}
      </div>
    </FcCard>
  );
}

/* ───────────────────────── Utilitaires partagés ───────────────────────── */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-2 inline-flex items-center gap-1 text-sm text-[#5C6B60] hover:text-[#2A4A3A]"
      aria-label="Retour"
    >
      <ArrowLeft className="h-4 w-4" /> Retour
    </button>
  );
}

function StepBadge({ current, total, label }: { current: number; total: number; label: string }) {
  if (total <= 1) {
    return (
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#C89F62]">
        {label}
      </p>
    );
  }
  return (
    <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#C89F62]">
      {label} · étape {current} sur {total}
    </p>
  );
}

function CheckStep({ done, active, text }: { done?: boolean; active?: boolean; text: string }) {
  return (
    <li className="flex items-center gap-3 text-[14px]" aria-current={active ? "step" : undefined}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? "border-[#16A34A] bg-[#16A34A] text-white"
            : active
              ? "border-[#2A4A3A] bg-transparent"
              : "border-[#D9D2BC] bg-transparent"
        }`}
      >
        {done ? (
          <Check className="h-3.5 w-3.5" />
        ) : active ? (
          <FcSpinner className="h-3.5 w-3.5 text-[#2A4A3A]" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-[#D9D2BC]" />
        )}
      </span>
      <span className={done ? "text-[#1E4D2B]" : active ? "font-medium text-[#2B3530]" : "text-[#8A9288]"}>
        {text}
      </span>
    </li>
  );
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    PATRIARCHE: "Patriarche",
    CONSEIL: "Conseil de famille",
    CHEF_BRANCHE: "Chef de branche",
    SECRETAIRE: "Secrétaire de famille",
    ADULTE: "Adulte (18+)",
    JUNIOR: "Junior (moins de 18 ans)",
  };
  return map[role] ?? role;
}

/* ───────────────────────── Racine du parcours (interface mobile) ───────────────────────── */

/* v28 — LIEN CLIQUABLE du bureau : « ?code=FCM-XXXXXX » (ou #code=…) ouvre
 * l'app DIRECTEMENT sur la PAGE 2, code déjà accepté et numéro prérempli —
 * la personne clique, tape son nom, sa page s'ouvre. Lecture UNE fois à
 * l'initialisation du composant (le contenu du lien est statique) — JAMAIS
 * dans un effet (setState en effet interdit) : initialisateurs paresseux. */
type LienCode =
  | { statut: "absent"; code: null }
  | { statut: "ok"; code: CodeMembre }
  | { statut: "inconnu"; code: null }
  | { statut: "utilise"; code: CodeMembre };

function lireCodeDuLien(): LienCode {
  if (typeof window === "undefined") return { statut: "absent", code: null };
  try {
    const lire = (s: string) => new URLSearchParams(s.startsWith("#") ? s.slice(1) : s);
    const q = lire(window.location.search);
    const h = lire(window.location.hash);
    const brut =
      q.get("code") ?? q.get("invitation") ?? q.get("invite") ??
      h.get("code") ?? h.get("invitation") ?? h.get("invite");
    if (!brut) return { statut: "absent", code: null };
    const c = trouverCode(brut);
    if (!c) return { statut: "inconnu", code: null };
    if (c.utiliseLe) return { statut: "utilise", code: c };
    return { statut: "ok", code: c };
  } catch {
    return { statut: "absent", code: null };
  }
}

export function AuthFlow({ onReady }: { onReady: (name: string) => void }) {
  // Code préchargé par le lien (null = parcours normal) — lu UNE fois.
  const [lien] = useState<LienCode>(lireCodeDuLien);
  const precharge = lien.statut === "ok" ? lien.code : null;
  const [busy, setBusy] = useState(false);
  // v32 — Lien valide → PAGE 2 directement ; sinon PAGE 1 (le code) — JAMAIS
  // l'ancien écran « Bienvenue » (choix inscription/connexion) : supprimé.
  const [step, setStep] = useState<Step>(() =>
    precharge ? { k: "renseignement", code: precharge } : { k: "code" },
  );

  return (
    <div className="relative flex w-full flex-1 flex-col items-center px-4 py-8 sm:py-12">
      <FcWatermark />

      {/* En-tête compact (interface mobile) — logo + marque */}
      <div className="relative z-10 mb-4 flex flex-col items-center gap-2.5 text-center">
        <img
          src="/logo-famille.webp"
          alt="Armoiries de la famille Mbeutetsa"
          className="h-16 w-16 rounded-2xl bg-[#FBF7EA] p-1.5 shadow-lg ring-1 ring-[#C89F62]/70"
        />
        <div>
          <p className="fc-serif text-xl font-bold leading-tight text-[#1E4D2B]">Famille.Mbeutetsa</p>
          <p className="text-[11px] text-[#8A9288]">Espace numérique de la famille</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-4">
        {/* v28 — signalement inline si le lien portait un code inutilisable */}
        {lien.statut === "utilise" && (
          <div
            role="status"
            className="rounded-xl border border-[#C89F62]/50 bg-[#FBF7EA] px-4 py-3 text-[12.5px] font-semibold leading-snug text-[#7A5B2E]"
          >
            Le code de ce lien a déjà été utilisé — si c&apos;est votre compte, reconnectez-vous avec votre numéro.
            Sinon, demandez un nouveau code au bureau de la Tontine.
          </div>
        )}
        {lien.statut === "inconnu" && (
          <div
            role="status"
            className="rounded-xl border border-[#C89F62]/50 bg-[#FBF7EA] px-4 py-3 text-[12.5px] font-semibold leading-snug text-[#7A5B2E]"
          >
            Le code contenu dans ce lien est inconnu — vérifiez auprès du bureau de la Tontine.
          </div>
        )}
        {step.k === "code" && <CodeScreen goto={setStep} />}
        {step.k === "renseignement" && (
          <RenseignementScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} />
        )}
        {step.k === "phone" && (
          <PhoneScreen busy={busy} setBusy={setBusy} goto={setStep} prefillTel={step.prefillTel} />
        )}
        {step.k === "verify" && (
          <VerifyScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
        )}
      </div>
    </div>
  );
}
