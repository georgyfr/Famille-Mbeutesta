"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Assistant « Mon rôle dans la Tontine » — Famille.Mbeutetsa
//
// Demande JUSTE APRÈS la sélection de la géolocalisation (parcours :
// inscription → localisation → RÔLE → tableau de bord).
//
// Chaque personne indique le rôle qu'elle joue dans la Tontine : simple membre
// ou l'un des six acteurs du bureau (président, vice-président, secrétaire,
// trésorier, commissaire aux comptes, censeur). Le rôle ouvre la page du
// bureau correspondante et détermine les droits : taux mensuel, validations
// d'épargnes, dettes, signalements. Modifiable à tout moment depuis la carte
// « Mon rôle dans la Tontine » de l'onglet Sécurité.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { toast } from "sonner";
import { saveVousRole } from "./tontine-bureau";
import { ROLE_META, ROLES_BUREAU, type RoleKey } from "./tontine-data";
import { FcButton, FcCard } from "./ui";
import {
  Check, Crown, Eye, Scale, ScrollText, ShieldCheck, UserRound, Users, Wallet,
} from "lucide-react";

const ORDRE: RoleKey[] = ["membre", ...ROLES_BUREAU];

const ICÔNE_RÔLE: Record<RoleKey, React.ReactNode> = {
  membre: <Users className="h-5 w-5" />,
  president: <Crown className="h-5 w-5" />,
  vice_president: <UserRound className="h-5 w-5" />,
  secretariat: <ScrollText className="h-5 w-5" />,
  tresorier: <Wallet className="h-5 w-5" />,
  commissaire: <Scale className="h-5 w-5" />,
  censeur: <Eye className="h-5 w-5" />,
};

export function RoleWizard({ onDone }: { onDone: () => void }) {
  const [role, setRole] = useState<RoleKey>("membre");

  const valider = () => {
    saveVousRole(role);
    toast.success(`Rôle enregistré : ${ROLE_META[role].label} 🎉`, {
      description:
        role === "membre"
          ? "Vous validez les décisions du bureau et vous pouvez signaler tout problème."
          : "Votre page du bureau vous donne vos outils : taux mensuel, validations, dettes, signalements.",
    });
    onDone();
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
      {/* En-tête */}
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#1E4D2B] text-white shadow-lg">
          <Users className="h-8 w-8" />
        </div>
        <h1 className="fc-serif text-2xl font-bold text-[#1E4D2B]">
          Votre rôle dans la Tontine
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[#5C6B60]">
          Dernière étape : quel rôle jouez-vous dans la Tontine de la famille ? Il ouvre votre page
          du bureau (président, secrétaire, trésorier…) et détermine vos droits.
        </p>
      </div>

      <FcCard className="p-5 sm:p-6">
        <div role="radiogroup" aria-label="Rôle joué dans la Tontine" className="space-y-2">
          {ORDRE.map((r) => {
            const meta = ROLE_META[r];
            const choisi = role === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={choisi}
                onClick={() => setRole(r)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  choisi
                    ? "border-[#C89F62] bg-[#C89F62]/10 ring-1 ring-[#C89F62]/40"
                    : "border-[#E5DCC0] bg-[#FFFDF6] hover:border-[#C89F62]/50 hover:bg-[#C89F62]/5"
                }`}
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${meta.accent}1A`, color: meta.accent }}
                >
                  {ICÔNE_RÔLE[r]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-bold text-[#1E4D2B]">{meta.label}</span>
                    {r === "membre" && (
                      <span className="rounded-full bg-[#2A4A3A]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2A4A3A]">
                        Le plus courant
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-[#5C6B60]">
                    {meta.summary}
                  </span>
                </span>
                <span
                  className={`mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    choisi ? "border-[#C89F62] bg-[#C89F62] text-white" : "border-[#C9B98A] bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {choisi && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#8A9288]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Vous pourrez changer de rôle à tout moment depuis la fiche « Mon rôle dans la Tontine ».
        </p>

        <FcButton onClick={valider} className="mt-3 h-[54px] text-[16.5px]">
          <Check className="h-5 w-5" /> Valider mon rôle
        </FcButton>
      </FcCard>
    </div>
  );
}
