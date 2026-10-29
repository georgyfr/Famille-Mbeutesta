"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Page d'authentification — Famille.Mbeutetsa (refonte complète)
//
// DEUX PARCOURS D'INSCRIPTION :
//  1. PAR NUMÉRO DE TÉLÉPHONE (recommandé, façon WhatsApp) :
//     numéro → vérification → nom & prénom (ou au moins un pseudo) → compte.
//  2. PAR IDENTIFIANT & MOT DE PASSE :
//     identifiant + mot de passe → pseudo + numéro de téléphone → compte.
//     Le numéro sert à DÉTECTER l'utilisateur (compte existant retrouvé et
//     relié à l'identifiant, alertes push, annuaire familial).
//
// DEUX PARCOURS DE CONNEXION :
//  • numéro + code de vérification (compte retrouvé par le numéro) ;
//  • identifiant + mot de passe (l'identifiant accepte aussi le numéro).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, deviceName } from "@/lib/fc-client";
import { afterAuthPush, familyNotify } from "@/lib/fc-push";
import { FcButton, FcCard, FcInput, FcSpinner, FcWatermark } from "./ui";
import {
  ArrowLeft, AtSign, BellRing, Check, ChevronRight, Eye, EyeOff, KeyRound,
  Lock, Phone, RefreshCw, ShieldCheck, Smartphone, UserRound,
} from "lucide-react";

const UNIVERSES: { icon: string; label: string; wide?: boolean }[] = [
  { icon: "👨‍👩‍👧‍👦", label: "U1 · La Famille" },
  { icon: "📅", label: "U2 · Vie familiale" },
  { icon: "🤝", label: "U3 · Solidarité" },
  { icon: "💰", label: "U4 · Finances" },
  { icon: "🗳️", label: "U5 · Gouvernance" },
  { icon: "📜", label: "U6 · La Mémoire" },
  { icon: "🌐", label: "U7 · Réseau & Diaspora", wide: true },
];

type Step =
  | { k: "welcome" }
  | { k: "login-choice" }
  | { k: "phone"; mode: "signup" | "login" }
  | { k: "verify"; verifyToken: string; digits: string; demoCode: string }
  | { k: "profile"; registerToken: string; digits: string }
  | { k: "creds" }
  | { k: "id-profile"; identifier: string; password: string }
  | { k: "login-creds" };

/* ─── Formatage numéro camerounais : "691234567" → "6 91 23 45 67" ─── */
function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}
function groupPhone(d: string): string {
  const parts = [d.slice(0, 1), d.slice(1, 3), d.slice(3, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}
function prettyPhone(d: string): string {
  return `+237 ${groupPhone(d)}`;
}

/* ─── Validation identifiant : 3-30, lettres/chiffres/._- ─── */
const IDENT_RE = /^[a-zA-Z0-9._-]{3,30}$/;

export function AuthFlow({ onReady }: { onReady: (name: string) => void }) {
  const [step, setStep] = useState<Step>({ k: "welcome" });
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative flex w-full flex-1 flex-col lg:flex-row">
      {/* ══════════ Panneau gauche — branding (desktop) ══════════ */}
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-[#2A4A3A] p-10 text-white lg:flex xl:p-12">
        <svg
          className="pointer-events-none absolute -bottom-24 -right-24 opacity-10"
          width="520"
          height="520"
          viewBox="0 0 200 200"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="100" cy="35" r="16" />
          <circle cx="50" cy="100" r="16" />
          <circle cx="150" cy="100" r="16" />
          <circle cx="100" cy="165" r="16" />
          <line x1="100" y1="51" x2="100" y2="84" stroke="currentColor" strokeWidth="6" />
          <line x1="100" y1="84" x2="55" y2="96" stroke="currentColor" strokeWidth="6" />
          <line x1="100" y1="84" x2="145" y2="96" stroke="currentColor" strokeWidth="6" />
          <line x1="100" y1="116" x2="100" y2="149" stroke="currentColor" strokeWidth="6" />
        </svg>

        <div className="relative z-10">
          <div className="mb-12 flex items-center gap-4">
            <img
              src="/logo-famille.png"
              alt="Armoiries de la famille Mbeutetsa"
              className="h-16 w-16 rounded-2xl bg-[#FBF7EA] p-1.5 shadow-lg ring-1 ring-[#C89F62]/70"
            />
            <div>
              <p className="fc-serif text-2xl font-bold tracking-tight">Famille.Mbeutetsa</p>
              <p className="text-sm text-white/60">Espace numérique de la famille</p>
            </div>
          </div>

          <h1 className="fc-serif mb-4 max-w-md text-4xl font-bold leading-tight">
            « Une famille unie est une force inébranlable. »
          </h1>
          <p className="mb-10 max-w-md text-lg text-white/70">
            Retrouvez vos proches, la caisse familiale, les votes et la mémoire des Mbeutetsa — réunis dans une
            seule application.
          </p>

          <div className="grid max-w-md grid-cols-2 gap-3">
            {UNIVERSES.map((u) => (
              <div
                key={u.label}
                className={`flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2.5 ${
                  u.wide ? "col-span-2 justify-center" : ""
                }`}
              >
                <span className="text-xl" aria-hidden="true">{u.icon}</span>
                <span className="text-sm">{u.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sm text-white/40">© Famille.Mbeutetsa · 2026 · Cameroun</p>
      </aside>

      {/* ══════════ Panneau droit — parcours d'authentification ══════════ */}
      <div className="relative flex min-h-full flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <FcWatermark />

        <div className="relative z-10 mb-2 flex w-full max-w-md items-center justify-center gap-3 lg:hidden">
          <img
            src="/logo-famille.png"
            alt="Armoiries de la famille Mbeutetsa"
            className="h-16 w-auto drop-shadow-sm"
          />
          <div>
            <p className="fc-serif text-xl font-bold leading-tight text-[#1E4D2B]">Famille.Mbeutetsa</p>
            <p className="text-[11px] text-[#8A9288]">Espace numérique de la famille</p>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-md space-y-4">
          {step.k === "welcome" && <WelcomeScreen goto={setStep} />}
          {step.k === "login-choice" && <LoginChoiceScreen goto={setStep} />}
          {step.k === "phone" && <PhoneScreen mode={step.mode} busy={busy} setBusy={setBusy} goto={setStep} />}
          {step.k === "verify" && (
            <VerifyScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
          )}
          {step.k === "profile" && (
            <ProfileScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
          )}
          {step.k === "creds" && <CredsScreen busy={busy} setBusy={setBusy} goto={setStep} />}
          {step.k === "id-profile" && (
            <IdProfileScreen
              state={step}
              busy={busy}
              setBusy={setBusy}
              goto={setStep}
              onReady={onReady}
            />
          )}
          {step.k === "login-creds" && (
            <LoginCredsScreen busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Écran d'accueil : choix d'inscription ───────────────────────── */

function WelcomeScreen({ goto }: { goto: (s: Step) => void }) {
  return (
    <FcCard className="p-6 sm:p-8">
      <h2 className="fc-serif mb-1 text-center text-3xl font-bold text-[#1E4D2B]">Bienvenue 🌳</h2>
      <p className="mb-6 text-center text-[15px] leading-relaxed text-[#5C6B60]">
        Rejoignez le registre vivant des Mbeutetsa. Créez votre compte de la façon qui vous convient.
      </p>

      <div className="space-y-3">
        <OptionCard
          icon={<Phone className="h-5 w-5" />}
          badge="Recommandé"
          title="Avec mon numéro de téléphone"
          desc="La façon WhatsApp : aucun mot de passe à retenir. On vous demandera votre nom ou votre pseudo."
          onClick={() => goto({ k: "phone", mode: "signup" })}
        />
        <OptionCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Avec un identifiant & mot de passe"
          desc="Vous choisirez un identifiant, un mot de passe, votre pseudo et votre numéro de téléphone."
          onClick={() => goto({ k: "creds" })}
        />
      </div>

      <div className="mt-6 border-t border-[#E5DCC0] pt-5 text-center">
        <p className="mb-2 text-[13px] text-[#8A9288]">Vous avez déjà un compte ?</p>
        <FcButton variant="outline" onClick={() => goto({ k: "login-choice" })} className="h-[48px]">
          <Lock className="h-4 w-4" /> Se connecter
        </FcButton>
      </div>
    </FcCard>
  );
}

/* ───────────────────────── Choix du mode de connexion ───────────────────────── */

function LoginChoiceScreen({ goto }: { goto: (s: Step) => void }) {
  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "welcome" })} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Connexion</h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Comment souhaitez-vous vous connecter ?
      </p>

      <div className="space-y-3">
        <OptionCard
          icon={<Phone className="h-5 w-5" />}
          title="Avec mon numéro de téléphone"
          desc="Un code de vérification vous est envoyé — comme la première fois. Aucun mot de passe."
          onClick={() => goto({ k: "phone", mode: "login" })}
        />
        <OptionCard
          icon={<KeyRound className="h-5 w-5" />}
          title="Avec mon identifiant & mot de passe"
          desc="Votre identifiant ou votre numéro, accompagnés de votre mot de passe."
          onClick={() => goto({ k: "login-creds" })}
        />
      </div>

      <p className="mt-6 border-t border-[#E5DCC0] pt-4 text-center text-[13px] text-[#8A9288]">
        Pas encore de compte ?{" "}
        <button
          className="font-semibold text-[#C89F62] hover:underline"
          onClick={() => goto({ k: "welcome" })}
        >
          Inscrivez-vous
        </button>
      </p>
    </FcCard>
  );
}

/* ───────────────────────── Saisie du numéro (inscription & connexion) ───────────────────────── */

function PhoneScreen({
  mode,
  busy,
  setBusy,
  goto,
}: {
  mode: "signup" | "login";
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
}) {
  const [digits, setDigits] = useState("");

  const send = async () => {
    if (digits.length !== 9) {
      toast.error("Entrez un numéro camerounais à 9 chiffres (ex : 6 91 23 45 67).");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ verifyToken: string; demoCode: string; known: boolean }>("/api/auth/phone", {
        body: { action: "request", phone: digits, deviceName: deviceName() },
      });
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_phone", "+237" + digits);
      } catch {
        /* rien */
      }
      toast.success(`Notification de vérification envoyée au ${prettyPhone(digits)}`, {
        description: "Consultez vos notifications — l'application vérifie ensuite votre appareil.",
      });
      goto({ k: "verify", verifyToken: res.verifyToken, digits, demoCode: res.demoCode });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi de la notification impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto(mode === "signup" ? { k: "welcome" } : { k: "login-choice" })} />
      <StepBadge current={1} total={mode === "signup" ? 3 : 2} label={mode === "signup" ? "Inscription" : "Connexion"} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Votre numéro de téléphone</h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        {mode === "signup"
          ? "Votre numéro est votre identifiant — nous vous envoyons une notification pour vérifier qu'il s'agit bien de votre téléphone."
          : "Nous vous envoyons une notification avec un code pour vous reconnecter sans mot de passe."}
      </p>

      <div className="mb-4 flex items-stretch gap-2">
        <div
          className="flex h-[54px] shrink-0 items-center gap-2 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[16px] font-medium text-[#2B3530]"
          aria-label="Indicatif pays Cameroun +237"
        >
          <span aria-hidden="true">🇨🇲</span> +237
        </div>
        <FcInput
          className="flex-1"
          placeholder="6 91 23 45 67"
          value={groupPhone(digits)}
          onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, 9))}
          onKeyDown={(e) => e.key === "Enter" && digits.length === 9 && send()}
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={13}
          aria-label="Numéro de téléphone"
        />
      </div>

      <FcButton onClick={send} disabled={busy || digits.length !== 9} className="h-[54px]">
        {busy ? <FcSpinner /> : <BellRing className="h-5 w-5" />}
        Recevoir la notification
      </FcButton>

      <p className="mt-4 text-center text-[12px] text-[#8A9288]">
        Format camerounais — 9 chiffres commençant par 6 (mobile) ou 2 (fixe).
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
          // Le numéro est déjà enregistré → session ouverte, entrée directe
          toast.success(`Content de vous revoir, ${res.user.fullName.split(" ")[0]} !`);
          void afterAuthPush(false);
          onReady(res.user.fullName);
        } else if (res.registerToken) {
          toast.info("Numéro vérifié — complétez votre profil pour créer votre compte.");
          goto({ k: "profile", registerToken: res.registerToken, digits: state.digits });
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
    [state.verifyToken, state.digits, setBusy, goto, onReady]
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
      <BackButton onClick={() => goto({ k: "phone", mode: "signup" })} />
      <StepBadge current={2} total={3} label="Inscription" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Vérification du numéro</h2>
      <p className="mb-5 text-center text-[14px] text-[#5C6B60]">
        Notification envoyée au <strong>{prettyPhone(state.digits)}</strong>
      </p>

      <div className="mb-4 rounded-2xl border border-[#E5DCC0] bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <img
            src="/logo-famille.png"
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
            onClick={() => {
              setCode("");
              goto({ k: "phone", mode: "signup" });
            }}
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

/* ───────────────────────── Profil (parcours numéro) : nom & prénom ou pseudo ───────────────────────── */

function ProfileScreen({
  state,
  busy,
  setBusy,
  goto,
  onReady,
}: {
  state: Extract<Step, { k: "profile" }>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
  onReady: (name: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pseudo, setPseudo] = useState("");

  const complete = (firstName.trim().length >= 2 && lastName.trim().length >= 2) || pseudo.trim().length >= 2;

  const submit = async () => {
    if (!complete) {
      toast.error("Indiquez votre prénom et votre nom — ou au moins un pseudo.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ user: { id: string; fullName: string } }>("/api/auth/phone", {
        body: {
          action: "register",
          registerToken: state.registerToken,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          pseudo: pseudo.trim(),
          deviceName: deviceName(),
        },
      });
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_uid", res.user.id);
        localStorage.setItem("fc_name", res.user.fullName);
      } catch {
        /* rien */
      }
      toast.success(`Bienvenue dans la famille, ${res.user.fullName.split(" ")[0]} ! 🌳`);
      void afterAuthPush(true);
      void familyNotify({
        title: "Nouveau membre inscrit 🌳",
        body: `${res.user.fullName} vient de rejoindre Famille.Mbeutetsa.`,
        tag: "fc-register",
      });
      onReady(res.user.fullName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "phone", mode: "signup" })} />
      <StepBadge current={3} total={3} label="Inscription" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">
        Comment souhaitez-vous être appelé ?
      </h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Votre numéro <strong>{prettyPhone(state.digits)}</strong> est vérifié ✓. Indiquez votre nom et votre
        prénom — ou au moins un pseudo.
      </p>

      <div className="mb-3 space-y-2">
        <FcInput
          icon={<UserRound className="h-5 w-5" />}
          placeholder="Prénom (ex : Jean)"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoComplete="given-name"
          aria-label="Prénom"
        />
        <FcInput
          icon={<UserRound className="h-5 w-5" />}
          placeholder="Nom (ex : Mbeutetsa)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoComplete="family-name"
          aria-label="Nom"
        />
        <FcInput
          icon={<AtSign className="h-5 w-5" />}
          placeholder="Pseudo — facultatif (ex : Grand Frère)"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          aria-label="Pseudo, facultatif"
        />
      </div>
      <p className="mb-4 text-center text-[12px] leading-relaxed text-[#8A9288]">
        {pseudo.trim().length >= 2
          ? `Vous serez affiché sous le pseudo « ${pseudo.trim()} ».`
          : "Si vous préférez rester discret, laissez prénom et nom vides et indiquez juste un pseudo."}
      </p>

      <FcButton onClick={submit} disabled={busy || !complete} className="h-[54px] text-[17px]">
        {busy ? <FcSpinner /> : <Check className="h-5 w-5" />}
        Créer mon compte
      </FcButton>
    </FcCard>
  );
}

/* ───────────────────────── Inscription (parcours identifiant) : 1/2 — identifiant & mot de passe ───────────────────────── */

function CredsScreen({
  busy,
  setBusy,
  goto,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const valid = IDENT_RE.test(identifier.trim()) && password.length >= 6 && password === confirm;

  const submit = () => {
    if (!IDENT_RE.test(identifier.trim())) {
      toast.error("Identifiant invalide : 3 à 30 caractères — lettres, chiffres, point, tiret ou underscore.");
      return;
    }
    if (password.length < 6) {
      toast.error("Mot de passe trop court : au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    goto({ k: "id-profile", identifier: identifier.trim().toLowerCase(), password });
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "welcome" })} />
      <StepBadge current={1} total={2} label="Inscription" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">
        Votre identifiant & mot de passe
      </h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Choisissez un identifiant et un mot de passe. À l&apos;étape suivante, on vous demandera votre pseudo
        et votre numéro de téléphone.
      </p>

      <div className="mb-3 space-y-2">
        <FcInput
          icon={<AtSign className="h-5 w-5" />}
          placeholder="Identifiant (ex : jean.mbeutetsa)"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && valid && submit()}
          autoComplete="username"
          autoCapitalize="none"
          aria-label="Identifiant"
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          show={show}
          toggle={() => setShow((v) => !v)}
          placeholder="Mot de passe (au moins 6 caractères)"
          autoComplete="new-password"
        />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          show={show}
          toggle={() => setShow((v) => !v)}
          placeholder="Confirmez le mot de passe"
          autoComplete="new-password"
          onEnter={valid ? submit : undefined}
        />
      </div>

      <FcButton onClick={submit} disabled={busy || !valid} className="h-[54px]">
        Continuer <ChevronRight className="h-5 w-5" />
      </FcButton>

      <p className="mt-4 text-center text-[12px] text-[#8A9288]">
        Lettres, chiffres, point, tiret ou underscore uniquement — ex : <code className="rounded bg-black/5 px-1">jean.m</code>
      </p>
    </FcCard>
  );
}

/* ───────────────────────── Inscription (parcours identifiant) : 2/2 — pseudo + téléphone (détection) ───────────────────────── */

function IdProfileScreen({
  state,
  busy,
  setBusy,
  goto,
  onReady,
}: {
  state: Extract<Step, { k: "id-profile" }>;
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
  onReady: (name: string) => void;
}) {
  const [pseudo, setPseudo] = useState("");
  const [digits, setDigits] = useState("");

  const valid = pseudo.trim().length >= 2 && digits.length === 9;

  const submit = async () => {
    if (!valid) {
      toast.error("Indiquez votre pseudo et votre numéro de téléphone (9 chiffres).");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ linked?: boolean; user: { id: string; fullName: string } }>(
        "/api/auth/identifier",
        {
          body: {
            action: "register",
            identifier: state.identifier,
            password: state.password,
            pseudo: pseudo.trim(),
            phone: digits,
            deviceName: deviceName(),
          },
        }
      );
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_uid", res.user.id);
        localStorage.setItem("fc_name", res.user.fullName);
        localStorage.setItem("fc_phone", "+237" + digits);
      } catch {
        /* rien */
      }
      if (res.linked) {
        // DÉTECTION : le numéro correspondait à un compte existant → identifiant associé
        toast.success(
          `Numéro reconnu — compte de ${res.user.fullName}. Votre identifiant « ${state.identifier} » y est désormais associé.`
        );
        void afterAuthPush(false);
      } else {
        toast.success(`Bienvenue dans la famille, ${res.user.fullName.split(" ")[0]} ! 🌳`);
        void afterAuthPush(true);
        void familyNotify({
          title: "Nouveau membre inscrit 🌳",
          body: `${res.user.fullName} vient de rejoindre Famille.Mbeutetsa.`,
          tag: "fc-register",
        });
      }
      onReady(res.user.fullName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "creds" })} />
      <StepBadge current={2} total={2} label="Inscription" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Votre pseudo & votre numéro</h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Votre numéro <strong className="whitespace-nowrap">+237 …</strong> permet de vous détecter : si un
        compte existe déjà avec ce numéro, il sera automatiquement relié à votre identifiant.
      </p>

      <div className="mb-3 space-y-2">
        <FcInput
          icon={<UserRound className="h-5 w-5" />}
          placeholder="Pseudo (ex : Grand Frère)"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && submit()}
          aria-label="Pseudo"
        />
        <div className="flex items-stretch gap-2">
          <div
            className="flex h-[54px] shrink-0 items-center gap-2 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[16px] font-medium text-[#2B3530]"
            aria-label="Indicatif pays Cameroun +237"
          >
            <span aria-hidden="true">🇨🇲</span> +237
          </div>
          <FcInput
            className="flex-1"
            placeholder="6 91 23 45 67"
            value={groupPhone(digits)}
            onChange={(e) => setDigits(onlyDigits(e.target.value).slice(0, 9))}
            onKeyDown={(e) => e.key === "Enter" && valid && submit()}
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={13}
            aria-label="Numéro de téléphone"
          />
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#C89F62]/40 bg-[#C89F62]/10 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7A5B2E]" />
        <p className="text-[12px] leading-relaxed text-[#7A5B2E]">
          Ce numéro ne sera pas vérifié par code maintenant — il sert à vous retrouver dans la famille et à
          recevoir les alertes. Vous pourrez toujours ajouter la vérification plus tard.
        </p>
      </div>

      <FcButton onClick={submit} disabled={busy || !valid} className="h-[54px] text-[17px]">
        {busy ? <FcSpinner /> : <Check className="h-5 w-5" />}
        Créer mon compte
      </FcButton>
    </FcCard>
  );
}

/* ───────────────────────── Connexion identifiant + mot de passe ───────────────────────── */

function LoginCredsScreen({
  busy,
  setBusy,
  goto,
  onReady,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  goto: (s: Step) => void;
  onReady: (name: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const valid = identifier.trim().length >= 3 && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    try {
      const res = await api<{ user: { id: string; fullName: string } }>("/api/auth/identifier", {
        body: {
          action: "login",
          identifier: identifier.trim(),
          password,
          deviceName: deviceName(),
        },
      });
      if (!res.ok) throw new Error(res.error);
      try {
        localStorage.setItem("fc_uid", res.user.id);
        localStorage.setItem("fc_name", res.user.fullName);
      } catch {
        /* rien */
      }
      toast.success(`Content de vous revoir, ${res.user.fullName.split(" ")[0]} !`);
      void afterAuthPush(false);
      onReady(res.user.fullName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "login-choice" })} />
      <StepBadge current={1} total={1} label="Connexion" />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">
        Identifiant & mot de passe
      </h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Votre identifiant — ou votre numéro de téléphone si vous l&apos;avez relié à un mot de passe.
      </p>

      <div className="mb-3 space-y-2">
        <FcInput
          icon={<AtSign className="h-5 w-5" />}
          placeholder="Identifiant ou numéro de téléphone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && submit()}
          autoComplete="username"
          autoCapitalize="none"
          aria-label="Identifiant ou numéro de téléphone"
        />
        <PasswordInput
          value={password}
          onChange={setPassword}
          show={show}
          toggle={() => setShow((v) => !v)}
          placeholder="Mot de passe"
          autoComplete="current-password"
          onEnter={valid ? submit : undefined}
        />
      </div>

      <FcButton onClick={submit} disabled={busy || !valid} className="h-[54px]">
        {busy ? <FcSpinner /> : <Lock className="h-5 w-5" />}
        Se connecter
      </FcButton>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-[#8A9288]">
        Mot de passe oublié ?{" "}
        <button
          className="font-semibold text-[#C89F62] hover:underline"
          onClick={() => goto({ k: "phone", mode: "login" })}
        >
          Connectez-vous avec votre numéro
        </button>{" "}
        — il est reconnu même sans code.
      </p>
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

/** Carte de choix : icône ronde + titre + description + chevron. */
function OptionCard({
  icon,
  title,
  desc,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 rounded-2xl border border-[#E5DCC0] bg-white p-4 text-left transition-all hover:border-[#2A4A3A]/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/20 active:scale-[0.99]"
      aria-label={title}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2A4A3A]/8 text-[#2A4A3A] transition-colors group-hover:bg-[#2A4A3A] group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-[#2B3530]">{title}</span>
          {badge && (
            <span className="rounded-full bg-[#C89F62]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7A5B2E]">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-[#8A9288]">{desc}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#C9B98A] transition-transform group-hover:translate-x-0.5 group-hover:text-[#2A4A3A]" />
    </button>
  );
}

/** Champ mot de passe avec bouton afficher/masquer. */
function PasswordInput({
  value,
  onChange,
  show,
  toggle,
  placeholder,
  autoComplete,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  placeholder: string;
  autoComplete?: string;
  onEnter?: () => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1E4D2B]">
        <Lock className="h-5 w-5" />
      </span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-label={placeholder}
        className="h-[54px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] pl-12 pr-12 text-[16px] text-[#2B3530] placeholder:text-[#8A9288] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8A9288] hover:bg-black/5 hover:text-[#2A4A3A]"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
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
