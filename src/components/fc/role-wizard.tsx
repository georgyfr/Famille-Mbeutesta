"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Assistant « Votre rôle dans la Tontine » — Famille.Mbeutetsa (v34)
//
// Demande de l'administrateur : « aucun membre ne devrait voir la page du
// statut d'un autre membre dans l'entreprise. Tu ne vois que ton statut. »
//
// AVANT (jusqu'à v33) : cet assistant laissait CHACUN se déclarer président,
// secrétaire, trésorier… — une porte ouverte aux faux statuts (l'administrateur
// a constaté des « données fictives »).
//
// MAINTENANT : le poste du bureau vient UNIQUEMENT du CODE d'invitation remis
// par le bureau (posé à l'inscription par appliquerCodeInvitation — et l'assistant
// est alors SAUTÉ). Pour un compte sans code, le rôle est « Membre simple » :
// cet écran le CONFIRME en une carte unique (plus aucun choix de poste).
// Les postes réels du bureau s'attribuent dans #secretaire/codes ou
// #president (génération d'un code d'invitation « membre du bureau »).
// ─────────────────────────────────────────────────────────────────────────────

import { toast } from "sonner";
import { saveVousRole } from "./tontine-bureau";
import { ROLE_META, type RoleKey } from "./tontine-data";
import { FcButton, FcCard } from "./ui";
import { Check, ShieldCheck, Users } from "lucide-react";

export function RoleWizard({ onDone }: { onDone: () => void }) {
  const role: RoleKey = "membre"; // sans code du bureau, le statut est « membre »
  const meta = ROLE_META[role];

  const valider = () => {
    saveVousRole(role);
    toast.success("Votre espace est prêt 🌳", {
      description:
        "En tant que membre, vous validez les décisions du bureau et vous pouvez signaler tout problème. Le bureau vous remettra un code d'invitation si un poste vous est confié.",
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
          Votre statut est attribué par le bureau via votre code d&apos;invitation.
        </p>
      </div>

      <FcCard className="p-5 sm:p-6">
        {/* Carte unique — Membre simple (plus AUCUN choix de poste : un poste
            du bureau ne se déclare pas, il se REMET par code d'invitation). */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#C89F62] bg-[#C89F62]/10 p-3.5 ring-1 ring-[#C89F62]/40">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${meta.accent}1A`, color: meta.accent }}
          >
            <Users className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] font-bold text-[#1E4D2B]">{meta.label}</span>
              <span className="rounded-full bg-[#2A4A3A]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2A4A3A]">
                Votre statut
              </span>
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-[#5C6B60]">
              {meta.summary}
            </span>
          </span>
          <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#C89F62] bg-[#C89F62] text-white" aria-hidden="true">
            <Check className="h-3.5 w-3.5" />
          </span>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[#8A9288]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Président, secrétaire, trésorier… : un poste du bureau vous est REMIS
          par le bureau lui-même, avec votre code d&apos;invitation — il ouvre
          votre page automatiquement.
        </p>

        <FcButton onClick={valider} className="mt-3 h-[54px] text-[16.5px]">
          <Check className="h-5 w-5" /> Entrer dans la Tontine
        </FcButton>
      </FcCard>
    </div>
  );
}
