"use client";

// ─────────────────────────────────────────────────────────────────────────────
// RÉGLAGE « NOTIFICATIONS » — Paramètres (v29, Task 73)
//
// Demande de l'administrateur : « “Recevoir la notification” — supprime cette
// phrase car la notification automatique doit être par défaut ; ajoute cette
// option plutôt dans les paramètres. »
//
// · Les notifications sont AUTOMATIQUES PAR DÉFAUT : plus aucun bouton
//   « Recevoir la notification » ni « Activer les notifications » — l'app
//   demande l'autorisation toute seule à l'inscription (afterAuthPush) et
//   répare l'abonnement en silence.
// · CETTE carte vit dans LES PARAMÈTRES : Ma sécurité (app), Espace Membre →
//   Mon profil, Paramètres du secrétariat et Paramètres du président.
// · L'interrupteur coupe/relance sur CET appareil (désabonnement serveur
//   compris) — la préférence fc_push_pref_v1 bloque toute relance auto.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { FcCard } from "./ui";
import {
  desabonnerPush,
  enablePush,
  ecrirePrefPush,
  lirePrefPush,
  pushState as getPushState,
  testPush,
  type PrefPush,
  type PushState,
} from "@/lib/fc-push";

export function ReglageNotifications() {
  const [pref, setPref] = useState<PrefPush>("auto");
  const [etat, setEtat] = useState<PushState>("default");
  const [pret, setPret] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setPref(lirePrefPush());
      setEtat(await getPushState());
      setPret(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const activer = async () => {
    setEnCours(true);
    ecrirePrefPush("auto");
    setPref("auto");
    const ok = await enablePush();
    if (ok) toast.success("Notifications activées 🔔 — même application fermée.");
    setEtat(await getPushState());
    setEnCours(false);
  };

  const couper = async () => {
    setEnCours(true);
    const ok = await desabonnerPush();
    if (ok) {
      setPref("off");
      toast.info("Notifications coupées sur cet appareil — réactivables ici à tout moment.");
    } else {
      toast.error("Impossible de couper les notifications — réessayez.");
    }
    setEtat(await getPushState());
    setEnCours(false);
  };

  const verifier = async () => {
    setEnCours(true);
    const res = await testPush();
    if (res.ok) toast.success("Notification envoyée — regardez votre écran, même verrouillé 🔔");
    else toast.error(res.error || "Envoi impossible.");
    setEnCours(false);
  };

  const cochable = pret && etat !== "unsupported" && etat !== "denied" && !enCours;

  return (
    <FcCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C89F62]/15">
            <Bell className="h-4.5 w-4.5 text-[#C89F62]" />
          </span>
          <div>
            <h3 className="fc-serif text-[16px] font-bold leading-tight text-[#1E4D2B]">Notifications</h3>
            <p className="mt-0.5 text-[12px] text-[#8A9288]">Réglage de cet appareil — automatiques par défaut</p>
          </div>
        </div>
        <Switch
          checked={cochable && pref === "auto"}
          disabled={!cochable}
          onCheckedChange={(v) => void (v ? activer() : couper())}
          aria-label="Activer ou couper les notifications sur cet appareil"
        />
      </div>

      {/* — état courant, une ligne claire — */}
      <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed">
        {!pret && <p className="text-[#8A9288]">Vérification de l'état…</p>}

        {pret && etat === "subscribed" && (
          <p className="flex items-center gap-1.5 font-semibold text-[#16A34A]">
            <ShieldCheck className="h-4 w-4" /> Actives sur cet appareil — alertes reçues même application fermée.
          </p>
        )}
        {pret && (etat === "granted" || (etat === "default" && pref === "auto")) && (
          <p className="font-medium text-[#2B3530]">
            ✅ Automatiques — l'application vous alerte dès qu'un événement de la famille arrive (son + vibration,
            comme WhatsApp). Rien à cliquer.
          </p>
        )}
        {pret && etat === "denied" && (
          <p className="flex items-start gap-1.5 text-[#B91C1C]">
            <BellOff className="mt-0.5 h-4 w-4 shrink-0" />
            Bloquées par le navigateur — réautorisez-les dans les réglages du site (icône cadenas dans la barre
            d'adresse), puis revenez ici.
          </p>
        )}
        {pret && etat === "unsupported" && (
          <p className="text-[#8A9288]">
            Ce navigateur ne gère pas les notifications push. Sur iPhone : ajoutez d'abord l'application à l'écran
            d'accueil (Partager → Sur l'écran d'accueil), puis ouvrez-la depuis son icône.
          </p>
        )}
        {pret && etat !== "unsupported" && pref === "off" && etat !== "denied" && (
          <p className="text-[#8A9288]">Coupées à votre demande sur cet appareil — le réglage reste enregistré.</p>
        )}
      </div>

      {etat === "subscribed" && (
        <button
          type="button"
          onClick={verifier}
          disabled={enCours}
          className="mt-3 min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-4 text-[13px] font-bold text-[#1E4D2B] transition hover:border-[#C89F62] disabled:opacity-60"
        >
          Vérifier que ça sonne sur mon téléphone
        </button>
      )}
    </FcCard>
  );
}
