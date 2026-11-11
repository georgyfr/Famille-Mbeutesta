"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CRÉER UN MEMBRE DE LA RÉUNION — génération de codes d'invitation (v27)
//
// Demande de l'administrateur (Task 71) :
//   1. « lorsqu'un code est généré, celui qui a généré le code n'est pas
//      obligé de le partager tout de suite » → une SECTION dédiée « Codes
//      générés » (TABLEAU : numéro de téléphone · ville · code · statut)
//      garde chaque code avec ses boutons de PARTAGE (WhatsApp, copier).
//   2. Le champ NOM est RETIRÉ du formulaire : la personne donne son nom
//      ELLE-MÊME quand elle insère son code dans l'application.
//   3. Le champ VILLE est ajouté juste après le téléphone — Yaoundé par
//      défaut, et à côté le bouton « Ajouter une nouvelle ville » : on
//      sélectionne d'abord la RÉGION parmi les régions du Cameroun, puis la
//      ville appropriée. Chaque ville = une tontine (page Finances).
//   4. Pré-allocation : dès le code généré, le bureau peut attribuer
//      cotisations, épargnes et prêts au futur membre (il apparaît dans les
//      listes) — à l'inscription, la personne retrouve TOUT sur sa page.
//
// Un code n'expire JAMAIS : tant qu'il n'est pas utilisé il reste « en
// attente », une fois utilisé il reste dans la liste marqué « utilisé ».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  Check, Copy, KeyRound, MapPin, MessageCircle, Phone, PlusCircle, ShieldCheck, Ticket, Trash2, UserPlus, Users,
} from "lucide-react";
import { FcCard } from "./ui";
import { Block, Btn, BtnConfirme, P, fcfa } from "./maquette-ui";
import { PhoneCountrySelect, usePhoneCountry } from "./phone-country-select";
import { TONTINE, loadMontants } from "./tontine-data";
import type { RoleKey } from "./tontine-data";
import { loadTypesCotisation, type TypeCotisation } from "./cotisations-types";
import {
  LIBELLES_BUREAU, POSTES_BUREAU_CODES, chargerCodes, genererCodeMembre,
  messageWhatsApp, sauverCodes, type CodeMembre, type TypeMembreCode,
} from "./codes-membres";
import {
  REGIONS_CAMEROUN, REGIONS_VILLES_CAMEROUN, VILLE_DEFAUT, ajouterVille, loadVilles,
  type Ville,
} from "./villes";

/** Date ISO → « 5 nov. 2026, 14:03 » — fidèle à la date réelle du code. */
function dateIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

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
  const [villes, setVilles] = useState<Ville[]>([]);
  /** Cotisation de base RÉELLE : les montants persistés (loadMontants) sont
   *  appliqués à TONTINE avant lecture — sinon le libellé affiche 0 FCFA. */
  const [montantBase, setMontantBase] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => {
      setCodes(chargerCodes());
      setTypesCotis(loadTypesCotisation());
      setVilles(loadVilles());
      loadMontants();
      setMontantBase(TONTINE.montantCotisation);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  /* — formulaire : téléphone, ville, cotisation, type de membre — */
  const { country, setCountry } = usePhoneCountry();
  const [digits, setDigits] = useState("");
  const [ville, setVille] = useState<string>(VILLE_DEFAUT);
  const [cotisChoix, setCotisChoix] = useState<string>("base"); // "base" | id de type
  const [typeMembre, setTypeMembre] = useState<TypeMembreCode>("simple");
  const [bureauRole, setBureauRole] = useState<RoleKey>("president");

  /* — ajout d'une nouvelle ville : région d'abord, puis la ville — */
  const [panneauVille, setPanneauVille] = useState(false);
  const [regionChoisie, setRegionChoisie] = useState<string>(REGIONS_CAMEROUN[1] ?? REGIONS_CAMEROUN[0] ?? "Centre");
  const [villeRegion, setVilleRegion] = useState<string>("");
  const [villeAutre, setVilleAutre] = useState<string>("");
  const villesDeRegion = REGIONS_VILLES_CAMEROUN[regionChoisie] ?? [];

  const confirmerNouvelleVille = () => {
    const nom = (villeRegion === "__autre__" ? villeAutre : villeRegion).trim();
    if (!nom) {
      toast.error("Sélectionnez la ville appropriée — ou « Autre… » pour la saisir vous-même.");
      return;
    }
    const { villes: maj, ajoutee } = ajouterVille(nom, regionChoisie);
    setVilles(maj);
    setPanneauVille(false);
    setVilleRegion("");
    setVilleAutre("");
    if (ajoutee) {
      setVille(nom);
      toast.success(`Ville ajoutée : ${nom} (${regionChoisie})`, {
        description: `Une nouvelle tontine est créée pour ${nom}.`,
      });
    } else {
      setVille(nom);
      toast.info(`${nom} figure déjà dans la liste des villes.`);
    }
  };

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
      toast.success("Code copié", { description: `${code} — collez-le où vous voulez.` });
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
      nomOptionnel: "", // le nom est donné par la PERSONNE à l'inscription (v27)
      cotisationTypeId: typeChoisi?.id ?? null,
      cotisationNom: cotisNom,
      cotisationMontant: cotisMontant,
      typeMembre,
      bureauRole: typeMembre === "bureau" ? bureauRole : null,
      ville: villes.some((v) => v.nom === ville) ? ville : VILLE_DEFAUT,
      creePar: p.creePar,
      creeParNom: p.creeParNom,
    });
    setCodes(chargerCodes());
    setDernier(c);
    setDigits("");
    setTypeMembre("simple");
    toast.success(`Code généré pour le futur membre de ${c.ville}`, {
      description: `${c.code} — gardé dans la section « Codes générés ».`,
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
        {c === dernier ? "Nouveau code — partagez quand vous voulez" : "Code d'invitation"}
      </p>
      <p className="mt-1 select-all font-mono text-[26px] font-black tracking-[0.14em] text-[#2B3530]">{c.code}</p>
      <p className="mt-0.5 text-[11.5px] font-semibold text-[#5C6B60]">
        {c.telephone ? c.telephone : "Numéro à saisir à l'inscription"} · {c.ville} · {c.typeMembre === "bureau" ? LIBELLES_BUREAU[c.bureauRole ?? "membre"] : "Membre simple"}
      </p>
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
        La personne colle ce code puis donne son nom — sa page s&apos;ouvre toute seule.
      </p>
    </div>
  );

  return (
    <Block
      title={p.titre ?? "Créer un membre de la réunion — générer un code d'invitation"}
      icon={<Ticket className="h-4.5 w-4.5" />}
      accent={p.accent}
      note="Tapez le numéro, choisissez la ville et la cotisation, puis générez le code."
    >
      <div className="space-y-3 p-4">
        {/* ─── formulaire ─── */}
        <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
          <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
            <UserPlus className="h-4 w-4" /> Le futur membre — téléphone, ville, cotisation
          </p>

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

          {/* — VILLE (v27) : Yaoundé par défaut + ajout d'une nouvelle ville — */}
          <div className="mt-3">
            <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#2B3530]">
              <MapPin className="h-3.5 w-3.5" /> Ville de la tontine — la personne rejoint SA ville
            </span>
            <span className="mt-1 flex flex-wrap items-stretch gap-2">
              <select
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                aria-label="Ville du futur membre"
                className="min-h-[42px] min-w-0 flex-1 rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2 text-[13px] font-bold text-[#2B3530] outline-none"
              >
                {villes.map((v) => (
                  <option key={v.nom} value={v.nom}>
                    {v.nom}{v.region ? ` — ${v.region}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setPanneauVille((x) => !x)}
                className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-lg border-2 px-2.5 text-[11.5px] font-bold transition active:scale-[0.97]"
                style={{ borderColor: `${p.accent}66`, color: p.accent, backgroundColor: `${p.accent}0A` }}
                aria-expanded={panneauVille}
              >
                <PlusCircle className="h-4 w-4" /> Ajouter une nouvelle ville
              </button>
            </span>
            <p className="mt-1 text-[10.5px] text-[#8A9288]">
              Une ville = une tontine.
            </p>

            {panneauVille && (
              <div className="mt-2 rounded-xl border-2 p-3" style={{ borderColor: `${p.accent}55`, backgroundColor: `${p.accent}0A` }}>
                <p className="text-[11.5px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
                  Nouvelle ville — la région d&apos;abord, puis la ville
                </p>
                <label className="mt-2 block">
                  <span className="block text-[11px] font-bold text-[#2B3530]">1. Région du Cameroun</span>
                  <select
                    value={regionChoisie}
                    onChange={(e) => {
                      setRegionChoisie(e.target.value);
                      setVilleRegion("");
                    }}
                    aria-label="Région de la nouvelle ville"
                    className="mt-1 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none"
                  >
                    {REGIONS_CAMEROUN.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 block">
                  <span className="block text-[11px] font-bold text-[#2B3530]">2. Ville appropriée</span>
                  <select
                    value={villeRegion}
                    onChange={(e) => setVilleRegion(e.target.value)}
                    aria-label="Ville à ajouter"
                    className="mt-1 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none"
                  >
                    <option value="">— Sélectionnez la ville —</option>
                    {villesDeRegion.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                    <option value="__autre__">Autre… (saisir la ville)</option>
                  </select>
                </label>
                {villeRegion === "__autre__" && (
                  <input
                    value={villeAutre}
                    onChange={(e) => setVilleAutre(e.target.value)}
                    placeholder={`Nom de la ville (${regionChoisie})`}
                    aria-label="Nom de la ville à saisir"
                    className="mt-2 w-full rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
                  />
                )}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Btn small tone={p.creePar === "secretariat" ? "violet" : "vert"} onClick={confirmerNouvelleVille}>
                    <Check className="h-3.5 w-3.5" /> Ajouter la ville
                  </Btn>
                  <Btn small tone="neutre" onClick={() => setPanneauVille(false)}>Annuler</Btn>
                </div>
              </div>
            )}
          </div>

          <label className="mt-3 block">
            <span className="block text-[11.5px] font-bold text-[#2B3530]">Type de cotisation qu&apos;il effectuera</span>
            <span className="mt-0.5 block text-[10.5px] text-[#8A9288]">
              Choisissez un type ou restez à la cotisation de base.
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
                  Quel poste du bureau ?
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
              Le code reste valable sans limite de temps.
            </p>
          </div>
        </div>

        {/* ─── carte de partage du dernier code ─── */}
        {dernier && cartePartage(dernier)}

        {/* ─── SECTION « CODES GÉNÉRÉS » — tableau téléphone · ville · code, partageable ─── */}
        <div>
          <p className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wide" style={{ color: p.accent }}>
            <Users className="h-4 w-4" /> Codes générés — à partager quand vous voulez ({codes.length})
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#8A9288]">
            Partagez chaque code quand vous voulez, via WhatsApp ou copier.
          </p>
          {codes.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-3 text-[12px] leading-relaxed text-[#8A9288]">
              Aucun code — remplissez le formulaire ci-dessus.
            </p>
          ) : (
            <div className="mt-2 max-h-96 overflow-y-auto rounded-2xl border border-[#E5DCC0] bg-white pr-0.5 fc-scroll">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Tableau des codes d&apos;invitation générés — numéro, ville, code et statut</caption>
                <thead>
                  <tr className="sticky top-0 bg-[#FBF7EA] text-[10px] font-black uppercase tracking-wide text-[#8A9288]">
                    <th scope="col" className="px-2.5 py-2">Numéro de la personne</th>
                    <th scope="col" className="px-2.5 py-2">Ville</th>
                    <th scope="col" className="px-2.5 py-2">Code</th>
                    <th scope="col" className="px-2.5 py-2">Statut</th>
                    <th scope="col" className="px-2.5 py-2 text-right">Partage</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-t border-[#F0E9D6] align-top">
                      <td className="px-2.5 py-2.5">
                        <p className="text-[12px] font-bold text-[#2B3530]">{c.telephone || "À saisir à l'inscription"}</p>
                        <p className="text-[10px] leading-snug text-[#8A9288]">
                          {c.typeMembre === "bureau" ? `Bureau — ${c.bureauRole ? LIBELLES_BUREAU[c.bureauRole] : "poste à préciser"}` : "Membre simple"}
                          {" "}· {c.cotisationNom} ({fcfa(c.cotisationMontant)}/mois)
                        </p>
                        {c.utiliseNom && <p className="text-[10px] font-semibold text-[#2F6B45]">Inscrit(e) : {c.utiliseNom}</p>}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#C9B98A]/60 bg-[#FBF7EA] px-2 py-0.5 text-[10.5px] font-bold text-[#5C6B60]">
                          <MapPin className="h-3 w-3" /> {c.ville}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5">
                        <p className="select-all font-mono text-[13.5px] font-black tracking-[0.1em] text-[#2B3530]">{c.code}</p>
                        <p className="text-[10px] text-[#8A9288]">créé le {dateIso(c.creeLe)} par {c.creeParNom}</p>
                      </td>
                      <td className="px-2.5 py-2.5">
                        {c.utiliseLe ? (
                          <P cls="bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30">
                            <ShieldCheck className="h-3 w-3" /> Utilisé le {dateIso(c.utiliseLe)}
                          </P>
                        ) : (
                          <P cls="bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45">En attente</P>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Btn small tone="neutre" onClick={() => void copier(c.code)}><Copy className="h-3.5 w-3.5" /> Copier</Btn>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp(c))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[30px] items-center justify-center gap-1 rounded-lg bg-[#25D366] px-2 text-[10.5px] font-bold text-white transition hover:bg-[#1fb857]"
                            aria-label={`Partager le code ${c.code} via WhatsApp`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                          <BtnConfirme tone="rouge" labelConfirmer="Supprimer ?" onConfirmer={() => supprimer(c.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Retirer
                          </BtnConfirme>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── rappel du fonctionnement ─── */}
        <p className="flex items-start gap-2 rounded-xl border border-[#C89F62]/45 bg-[#C89F62]/10 px-3 py-2.5 text-[11.5px] leading-relaxed text-[#7A5B2E]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Générez le code, allouez ses cotisations, puis partagez-le quand vous voulez.
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
