"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CRÉER UN MEMBRE DE LA RÉUNION — génération de codes d'invitation
//
// Section PARTAGÉE par les deux consoles du bureau (demande de
// l'administrateur, Task 67) : le président (#president/codes) et la
// secrétaire (#secretaire/codes) créent des membres de la réunion AVANT leur
// arrivée et leur remettent un CODE d'invitation — partageable par WhatsApp,
// copiable en un geste — que la personne collera à son inscription pour voir
// SA page s'ouvrir directement avec le rôle et la cotisation attribués.
//
// Champs du code (cahier des charges) : numéro de téléphone, type de
// cotisation (selon les paramétrages du bureau), type de membre
// (Membre simple / Membre du bureau — si bureau, liste déroulante du poste).
//
// Un code n'expire JAMAIS : tant qu'il n'est pas utilisé il reste « en
// attente », une fois utilisé il reste dans la liste marqué « utilisé ».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Check, Copy, KeyRound, MessageCircle, Phone, ShieldCheck, Ticket, Trash2, UserPlus, Users,
} from "lucide-react";
import { FcCard } from "./ui";
import { Block, Btn, BtnConfirme, P, dateCourte, heure, fcfa } from "./maquette-ui";
import { PhoneCountrySelect, usePhoneCountry } from "./phone-country-select";
import { TONTINE, loadMontants } from "./tontine-data";
import type { RoleKey } from "./tontine-data";
import { loadTypesCotisation, type TypeCotisation } from "./cotisations-types";
import {
  LIBELLES_BUREAU, POSTES_BUREAU_CODES, chargerCodes, genererCodeMembre,
  messageWhatsApp, sauverCodes, type CodeMembre, type TypeMembreCode,
} from "./codes-membres";

export function CodesMembresSection(p: {
  /** Qui crée le membre — l'auteur est écrit dans le code. */
  creePar: "president" | "secretariat";
  creeParNom: string;
  /** Couleur d'accent de la console (violet secrétaire, vert président). */
  accent: string;
  /** Titre du bloc (différent selon la console). */
  titre?: string;
}) {
  /* — chargements réservés au client (localStorage) — zéro mismatch — */
  const [codes, setCodes] = useState<CodeMembre[]>([]);
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  /** Cotisation de base RÉELLE : les montants persistés (loadMontants) sont
   *  appliqués à TONTINE avant lecture — sinon le libellé affiche 0 FCFA. */
  const [montantBase, setMontantBase] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => {
      setCodes(chargerCodes());
      setTypesCotis(loadTypesCotisation());
      loadMontants();
      setMontantBase(TONTINE.montantCotisation);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  /* — formulaire : téléphone, cotisation, type de membre — */
  const { country, setCountry } = usePhoneCountry();
  const [digits, setDigits] = useState("");
  const [nom, setNom] = useState("");
  const [cotisChoix, setCotisChoix] = useState<string>("base"); // "base" | id de type
  const [typeMembre, setTypeMembre] = useState<TypeMembreCode>("simple");
  const [bureauRole, setBureauRole] = useState<RoleKey>("president");

  const telPlein = `+${country.dial}${digits.replace(/\D/g, "")}`;
  const telOk = digits.replace(/\D/g, "").length >= 6;
  const typeChoisi = typesCotis.find((t) => t.id === cotisChoix) ?? null;
  const cotisMontant = typeChoisi ? typeChoisi.montant : montantBase;
  const cotisNom = typeChoisi ? typeChoisi.nom : "Cotisation de base de la Tontine";

  /* — dernier code généré : grande carte de partage — */
  const [dernier, setDernier] = useState<CodeMembre | null>(null);
  const [copie, setCopie] = useState(false);

  const copier = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
      toast.success("Code copié", { description: `${code} est dans le presse-papier — collez-le dans WhatsApp, SMS ou e-mail.` });
    } catch {
      toast.error("Copie impossible sur ce navigateur", { description: `Sélectionnez le code à la main : ${code}` });
    }
  };

  const generer = () => {
    if (!telOk) {
      toast.error("Entrez le numéro de téléphone du futur membre");
      return;
    }
    if (typeMembre === "bureau" && !bureauRole) {
      toast.error("Choisissez le poste du bureau dans la liste déroulante");
      return;
    }
    const c = genererCodeMembre({
      telephone: telPlein,
      nomOptionnel: nom.trim(),
      cotisationTypeId: typeChoisi?.id ?? null,
      cotisationNom: cotisNom,
      cotisationMontant: cotisMontant,
      typeMembre,
      bureauRole: typeMembre === "bureau" ? bureauRole : null,
      creePar: p.creePar,
      creeParNom: p.creeParNom,
    });
    setCodes(chargerCodes());
    setDernier(c);
    setNom("");
    setDigits("");
    setTypeMembre("simple");
    toast.success(`Code généré pour ${c.nomOptionnel || "le futur membre"}`, {
      description: `${c.code} — partagez-le par WhatsApp ou copiez-le : la personne le collera à son inscription et SA page s'ouvrira avec le rôle attribué. Le code n'expire jamais.`,
    });
  };

  const supprimer = (id: string) => {
    const reste = codes.filter((x) => x.id !== id);
    sauverCodes(reste);
    setCodes(reste);
    if (dernier?.id === id) setDernier(null);
    toast("Code retiré de la liste");
  };

  const cartePartage = (c: CodeMembre): ReactNode => (
    <div className="rounded-2xl border-2 p-3.5" style={{ borderColor: `${p.accent}55`, backgroundColor: `${p.accent}0D` }}>
      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: p.accent }}>
        {c === dernier ? "Code tout juste généré — à partager maintenant" : "Code d'invitation"}
      </p>
      <p className="mt-1 select-all font-mono text-[26px] font-black tracking-[0.14em] text-[#2B3530]">{c.code}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn small tone="or" onClick={() => void copier(c.code)}>
          {copie && c === dernier ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copie && c === dernier ? "Copié !" : "Copier le code"}
        </Btn>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp(c))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-[11.5px] font-bold text-white transition hover:bg-[#1fb857] active:scale-[0.97]"
          aria-label={`Partager le code ${c.code} via WhatsApp`}
        >
          <MessageCircle className="h-3.5 w-3.5" /> Partager via WhatsApp
        </a>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-[#5C6B60]">
        La personne s'inscrit avec son numéro, <strong>colle ce code</strong> à l'étape du téléphone : sa page
        s'ouvre directement avec {c.typeMembre === "bureau" ? `le poste « ${c.bureauRole ? LIBELLES_BUREAU[c.bureauRole] : "bureau"} »` : "le rôle de membre simple"}
        {c.cotisationTypeId ? ` et sa cotisation « ${c.cotisationNom} » (${fcfa(c.cotisationMontant)}/mois)` : ` et la cotisation de base (${fcfa(c.cotisationMontant)}/mois)`}.
      </p>
    </div>
  );

  return (
    <Block
      title={p.titre ?? "Créer un membre de la réunion — générer un code d'invitation"}
      icon={<Ticket className="h-4.5 w-4.5" />}
      accent={p.accent}
      note="Le président, la secrétaire et l'administrateur du site créent les membres AVANT leur arrivée : remplissez le numéro de téléphone, le type de cotisation (selon vos paramétrages) et le type de membre — puis générez le code et partagez-le (WhatsApp ou copier-coller). La personne s'inscrit, colle le code, et SA page apparaît avec le rôle choisi. Un code n'expire jamais : tant qu'il n'est pas utilisé, il reste valable."
    >
      <div className="space-y-3 p-4">
        {/* ─── formulaire ─── */}
        <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
            <UserPlus className="h-4 w-4" /> Le futur membre — ce que le bureau connaît de lui
          </p>

          <label className="mt-3 block">
            <span className="block text-[11.5px] font-bold text-[#2B3530]">Nom (facultatif — la personne confirme à l&apos;inscription)</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. : Georges Mbeutetsa"
              aria-label="Nom du futur membre (facultatif)"
              className="mt-1 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
            />
          </label>

          <label className="mt-3 block">
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
              <Phone className="h-3.5 w-3.5" /> Numéro de téléphone de la personne
            </span>
            <span className="mt-1 flex items-stretch gap-2">
              <span className="shrink-0 [&>div]:rounded-lg [&>div]:border">
                <PhoneCountrySelect value={country} onChange={(c) => setCountry(c)} />
              </span>
              <input
                value={digits}
                onChange={(e) => setDigits(e.target.value.replace(/[^\d\s]/g, "").slice(0, 14))}
                inputMode="tel"
                placeholder="6 90 00 00 64"
                aria-label="Numéro de téléphone du futur membre (sans indicatif)"
                className="min-w-0 flex-1 rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
              />
            </span>
            <span className="mt-1 block text-[10.5px] text-[#8A9288]">Numéro complet : {telPlein || `+${country.dial}…`}</span>
          </label>

          <label className="mt-3 block">
            <span className="block text-[11.5px] font-bold text-[#2B3530]">Type de cotisation qu&apos;il effectuera</span>
            <span className="mt-0.5 block text-[10.5px] text-[#8A9288]">
              Selon les paramétrages faits par le bureau (types de cotisations mensuelles) — ou la cotisation de base.
            </span>
            <select
              value={cotisChoix}
              onChange={(e) => setCotisChoix(e.target.value)}
              aria-label="Type de cotisation du futur membre"
              className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none"
            >
              <option value="base">Cotisation de base — {fcfa(montantBase)} / mois</option>
              {typesCotis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom} — {fcfa(t.montant)} / mois
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3">
            <span className="block text-[11.5px] font-bold text-[#2B3530]">Type de membre</span>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Type de membre du futur code">
              {([
                { v: "simple" as TypeMembreCode, t: "Membre simple", d: "Il cotise et participe comme tout le monde" },
                { v: "bureau" as TypeMembreCode, t: "Membre du bureau", d: "Une liste déroulante précise son poste" },
              ]).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={typeMembre === o.v}
                  onClick={() => setTypeMembre(o.v)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left transition ${
                    typeMembre === o.v ? "shadow-sm" : "border-[#E5DCC0] bg-white hover:border-[#C9B98A]"
                  }`}
                  style={typeMembre === o.v ? { borderColor: p.accent, backgroundColor: `${p.accent}14` } : undefined}
                >
                  <span className="block text-[12.5px] font-black text-[#2B3530]">{o.t}</span>
                  <span className="block text-[10.5px] text-[#8A9288]">{o.d}</span>
                </button>
              ))}
            </div>
            {typeMembre === "bureau" && (
              <label className="mt-2 block rounded-xl border-2 px-3 py-2.5" style={{ borderColor: `${p.accent}66`, backgroundColor: `${p.accent}0A` }}>
                <span className="block text-[11.5px] font-bold" style={{ color: p.accent }}>
                  Quel poste du bureau ? — la page du poste sera SA page
                </span>
                <select
                  value={bureauRole}
                  onChange={(e) => setBureauRole(e.target.value as RoleKey)}
                  aria-label="Poste du bureau du futur membre"
                  className="mt-1.5 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none"
                >
                  {POSTES_BUREAU_CODES.map((r) => (
                    <option key={r} value={r}>{LIBELLES_BUREAU[r]}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn tone={p.creePar === "secretariat" ? "violet" : "vert"} onClick={generer} disabled={!telOk}>
              <KeyRound className="h-4 w-4" /> Générer le code d&apos;invitation
            </Btn>
            <p className="text-[10.5px] font-semibold text-[#8A9288]">
              Le code est unique, dicté sans confusion (sans O/I/0/1) et reste valable sans limite de temps.
            </p>
          </div>
        </div>

        {/* ─── carte de partage du dernier code ─── */}
        {dernier && cartePartage(dernier)}

        {/* ─── liste des codes ─── */}
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
            <Users className="h-4 w-4" /> Codes générés par le bureau ({codes.length})
          </p>
          {codes.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
              Aucun code pour l&apos;instant — remplissez le formulaire ci-dessus puis cliquez « Générer le code d&apos;invitation ».
            </p>
          ) : (
            <div className="mt-2 max-h-96 space-y-2 overflow-y-auto pr-1">
              {codes.map((c) => (
                <div key={c.id} className="rounded-2xl border border-[#E5DCC0] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[15px] font-black tracking-[0.12em] text-[#2B3530]">{c.code}</p>
                    {c.utiliseLe ? (
                      <P cls="bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30">
                        <ShieldCheck className="h-3 w-3" /> Utilisé le {dateCourte()} à {heure()} par {c.utiliseNom ?? "—"}
                      </P>
                    ) : (
                      <P cls="bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45">En attente d&apos;inscription — valable sans limite</P>
                    )}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#5C6B60]">
                    {c.nomOptionnel ? <><strong>{c.nomOptionnel}</strong> · </> : null}
                    {c.telephone} · {c.typeMembre === "bureau" ? `Membre du bureau — ${c.bureauRole ? LIBELLES_BUREAU[c.bureauRole] : "poste à préciser"}` : "Membre simple"}
                    {" "}· {c.cotisationNom} ({fcfa(c.cotisationMontant)}/mois)
                    {" "}· créé par {c.creeParNom}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Btn small tone="neutre" onClick={() => void copier(c.code)}><Copy className="h-3.5 w-3.5" /> Copier</Btn>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp(c))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 text-[11.5px] font-bold text-white transition hover:bg-[#1fb857]"
                      aria-label={`Partager à nouveau le code ${c.code} via WhatsApp`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                    <BtnConfirme tone="rouge" labelConfirmer="Supprimer ?" onConfirmer={() => supprimer(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </BtnConfirme>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── rappel du fonctionnement ─── */}
        <p className="flex items-start gap-2 rounded-xl border border-[#C89F62]/45 bg-[#C89F62]/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-[#7A5B2E]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Comment ça marche :</strong> la personne reçoit le code (WhatsApp, SMS, e-mail…) → elle s&apos;inscrit
            dans l&apos;application avec son numéro → à l&apos;étape du téléphone elle <strong>colle le code</strong> →
            l&apos;assistant de rôle est sauté et <strong>SA page s&apos;ouvre directement</strong> avec le rôle et la
            cotisation fixés ici. Aucune expiration : même partagé aujourd&apos;hui, il marchera encore dans six mois.
          </span>
        </p>
      </div>
    </Block>
  );
}

/** Petit bloc récapitulatif (console secrétaire / président) — à placer sur la
 *  page d'accueil de la console si besoin. Non utilisé pour l'instant. */
export function RappelCodesMembres({ accent, children }: { accent: string; children?: ReactNode }) {
  return (
    <FcCard className="p-3.5">
      <p className="flex items-center gap-1.5 text-[12px] font-black" style={{ color: accent }}>
        <Ticket className="h-4 w-4" /> Créer un membre : codes d&apos;invitation
      </p>
      {children}
    </FcCard>
  );
}

