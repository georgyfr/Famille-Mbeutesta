"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, deviceName } from "@/lib/fc-client";
import { FcButton, FcCard, FcInput, FcSpinner, FcWatermark } from "./ui";
import { ArrowLeft, BellRing, Check, Phone, RefreshCw, ShieldCheck, Smartphone, UserRound } from "lucide-react";

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
  | { k: "phone" }
  | { k: "verify"; verifyToken: string; digits: string; demoCode: string; known: boolean }
  | { k: "profile"; registerToken: string; digits: string };

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

export function AuthFlow({ onReady }: { onReady: (name: string) => void }) {
  const [step, setStep] = useState<Step>({ k: "welcome" });
  const [busy, setBusy] = useState(false);

  return (
    <div className="relative flex w-full flex-1 flex-col lg:flex-row">
      {/* ══════════ Panneau gauche — branding (desktop) ══════════ */}
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-[#2A4A3A] p-10 text-white lg:flex xl:p-12">
        {/* Motif décoratif — arbre généalogique */}
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
          {/* LE logo — en vedette */}
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

      {/* ══════════ Panneau droit — parcours de connexion ══════════ */}
      <div className="relative flex min-h-full flex-1 flex-col items-center px-4 py-8 sm:py-12">
        <FcWatermark />

        {/* En-tête mobile — le logo en vedette quand le panneau latéral est masqué */}
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
          {step.k === "welcome" && (
            <WelcomeScreen busy={busy} goto={setStep} />
          )}
          {step.k === "phone" && (
            <PhoneScreen busy={busy} setBusy={setBusy} goto={setStep} />
          )}
          {step.k === "verify" && (
            <VerifyScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
          )}
          {step.k === "profile" && (
            <ProfileScreen state={step} busy={busy} setBusy={setBusy} goto={setStep} onReady={onReady} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Écran d'accueil ───────────────────────── */

function WelcomeScreen({ busy, goto }: { busy: boolean; goto: (s: Step) => void }) {
  return (
    <FcCard className="p-6 sm:p-8">
      <h2 className="fc-serif mb-1 text-center text-3xl font-bold text-[#1E4D2B]">Bienvenue 🌳</h2>
      <p className="mb-7 text-center text-[15px] leading-relaxed text-[#5C6B60]">
        Votre numéro de téléphone est votre identifiant — comme sur WhatsApp. Aucun mot de passe à retenir.
      </p>

      <FcButton onClick={() => goto({ k: "phone" })} disabled={busy} className="h-[54px] text-[17px]">
        <Phone className="h-5 w-5" /> Continuer avec mon numéro
      </FcButton>

      <p className="mt-5 text-center text-[13px] text-[#8A9288]">
        Une fois inscrit, l&apos;application s&apos;ouvre directement sur cet appareil.
      </p>
    </FcCard>
  );
}

/* ───────────────────────── Saisie du numéro de téléphone ───────────────────────── */

function PhoneScreen({
  busy,
  setBusy,
  goto,
}: {
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
      toast.success(`Notification de vérification envoyée au ${prettyPhone(digits)}`, {
        description: "Consultez vos notifications — l'application vérifie ensuite votre appareil.",
      });
      goto({ k: "verify", verifyToken: res.verifyToken, digits, demoCode: res.demoCode, known: res.known });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi de la notification impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "welcome" })} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Votre numéro de téléphone</h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Nous vous envoyons une notification pour vérifier qu&apos;il s&apos;agit bien de votre téléphone.
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

/* ───────────────────────── Notification + vérification de l'appareil ───────────────────────── */

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
          // Le numéro est déjà enregistré → session ouverte, on entre directement
          toast.success(`Content de vous revoir, ${res.user.fullName.split(" ")[0]} !`);
          onReady(res.user.fullName);
        } else if (res.registerToken) {
          toast.info("Numéro vérifié — première inscription, continuez.");
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

  // Séquence automatique : la notification arrive, l'application lit le code sur le téléphone
  // (comme WhatsApp lit le SMS) puis vérifie le numéro tout seul.
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
      <BackButton onClick={() => goto({ k: "phone" })} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">Vérification du numéro</h2>
      <p className="mb-5 text-center text-[14px] text-[#5C6B60]">
        Notification envoyée au <strong>{prettyPhone(state.digits)}</strong>
      </p>

      {/* Notification simulée reçue sur le téléphone */}
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

      {/* Étapes de vérification de l'appareil */}
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
              goto({ k: "phone" });
            }}
            disabled={busy}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Renvoyer la notification
          </button>
        ) : (
          <button
            className="text-sm text-[#5C6B60] hover:underline"
            onClick={goManual}
            disabled={busy}
          >
            Saisir le code manuellement
          </button>
        )}
      </div>
    </FcCard>
  );
}

/* ───────────────────────── Première inscription : prénom + nom ───────────────────────── */

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

  const submit = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error("Indiquez votre prénom et votre nom pour créer votre compte.");
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
          deviceName: deviceName(),
        },
      });
      if (!res.ok) throw new Error(res.error);
      localStorage.setItem("fc_uid", res.user.id);
      localStorage.setItem("fc_name", res.user.fullName);
      toast.success(`Bienvenue dans la famille, ${res.user.fullName.split(" ")[0]} ! 🌳`);
      onReady(res.user.fullName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FcCard className="p-6 sm:p-8">
      <BackButton onClick={() => goto({ k: "phone" })} />
      <h2 className="fc-serif mb-1 text-center text-2xl font-bold text-[#1E4D2B]">
        Comment vous appelez-vous ?
      </h2>
      <p className="mb-6 text-center text-[14px] leading-relaxed text-[#5C6B60]">
        Votre numéro <strong>{prettyPhone(state.digits)}</strong> est vérifié ✓. Indiquez simplement votre
        prénom et votre nom.
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
      </div>

      <FcButton onClick={submit} disabled={busy} className="h-[54px] text-[17px]">
        {busy ? <FcSpinner /> : <Check className="h-5 w-5" />}
        Créer mon compte
      </FcButton>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-[#8A9288]">
        Vous entrerez immédiatement au tableau de bord après votre inscription.
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
