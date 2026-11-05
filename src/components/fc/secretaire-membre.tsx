"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FRANÇOISE EN TANT QUE MEMBRE — l'espace membre de la SECRÉTAIRE (v23)
//
// Demande de l'administrateur (Task 67) : « Ajoute une section spéciale pour
// les cotisations, épargne et prêt de la secrétaire en tant que membre de la
// réunion et NON en tant que secrétaire, comme tu l'as fait avec le cas du
// président. Car la secrétaire elle aussi cotise comme tous les membres de la
// réunion et elle devrait choisir quel type de cotisation elle fait. Elle peut
// aussi souscrire à un prêt comme un membre de la réunion et elle devrait
// aussi s'attribuer un prêt ou une épargne comme un membre de la réunion. »
//
// Trois sections, miroirs des onglets membre du président (m-cotis, m-epargne,
// m-prets) — membreId = f06 (Françoise Mbeutetsa) :
//   · SecMesCotisations — sa cotisation du mois (elle CHOISIT son type parmi
//     ceux paramétrés par le bureau, ou la cotisation de base), sa part de
//     collation, le bouton Cotiser (écrit dans fc_secretaire_cotis_mois_v1 —
//     la même source que la gestion du secrétariat) ;
//   · SecMesEpargnes — SES épargnes du registre du bureau (fc_epargnes_reunion_v1,
//     MÊME SOURCE que le président) + elle s'attribue une épargne comme un
//     membre : le versement rejoint le registre partagé (président inclus) ;
//   · SecMesPrets — elle SOUSCRIT un prêt à la caisse (dossier dans
//     fc_prets_demandes_v1, instruit par le secrétariat) et s'attribue un
//     prêt FAIT à la réunion (fc_prets_reunion_v1 — registre partagé).
//
// HYDRATATION SÛRE : tout chargement localStorage/Date dans setTimeout(0) ;
// les mois arrivent en props. Aucune écriture de window.location.hash.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarCheck, CheckCircle2, Coins, Coffee, HandCoins, Landmark, PiggyBank, ReceiptText,
  TrendingUp, UserCheck, Wallet,
} from "lucide-react";
import { FcCard } from "./ui";
import { Block, Btn, BtnConfirme, P, fcfa, fmt, nid, OK_CLS, OR_CLS, TE_CLS, VI_CLS } from "./maquette-ui";
import { MEMBRES_FICTIFS, MOIS_FR, TONTINE, loadMontants } from "./tontine-data";
import { loadTypesCotisation, saveTypesCotisation, typeDuMembre, cotisationDuMembre, type TypeCotisation } from "./cotisations-types";
import { loadCollations, collationDuMembre, type Collation } from "./collations";
import {
  loadEpargnesReunion, saveEpargnesReunion, loadPretsReunion, savePretsReunion,
  type AttributionReunion,
} from "./registres-bureau";
import type { Reglement } from "./reglement";

/** Françoise Mbeutetsa — la secrétaire est AUSSI une membre (f06, tour 6). */
const MOI = "f06";
const NOM_MOI = "Françoise Mbeutetsa";

const CLE_COTIS_MOIS = "fc_secretaire_cotis_mois_v1"; // même source que SecCotisationsCollations
const CLE_DEMANDES = "fc_prets_demandes_v1"; // même source que les dossiers du secrétariat

type MouvementCotisMois = { cotisation: boolean; collation: boolean };

type DossierPret = {
  id: string; membreId: string; montant: number; motif: string; garanties: string;
  avalisteId: string | null; cosignTresorier: boolean;
  statut: "en_attente" | "accorde" | "refuse"; motifRefus: string;
  moisIdx?: number;
};

function lireJSON<T>(cle: string, demo: T): T {
  if (typeof window === "undefined") return demo;
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : demo;
  } catch {
    return demo;
  }
}

function ecrireJSON(cle: string, valeur: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* quota — la maquette continue en mémoire */
  }
}

function chargerCotisMois(): Record<string, MouvementCotisMois> {
  const demo: Record<string, MouvementCotisMois> = {};
  for (const m of MEMBRES_FICTIFS) demo[m.id] = { cotisation: false, collation: false };
  return lireJSON<Record<string, MouvementCotisMois>>(CLE_COTIS_MOIS, demo);
}

function chargerDossiers(): DossierPret[] {
  const demo: DossierPret[] = [
    { id: "p1", membreId: "f08", montant: 150_000, motif: "Rentrée scolaire des enfants", garanties: "Fond de commerce au marché B", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
    { id: "p2", membreId: "f07", montant: 80_000, motif: "Soins médicaux de sa mère", garanties: "Rémunération mensuelle déclarée", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "" },
  ];
  const brut = lireJSON<DossierPret[] | null>(CLE_DEMANDES, null);
  if (!Array.isArray(brut)) return demo;
  return brut.filter((x) => x && typeof x?.id === "string" && typeof x?.membreId === "string");
}

/* ══════════════════════════ MES COTISATIONS — Françoise membre ══════════════════════════ */

export function SecMesCotisations(p: { moisIdx: number | null; moisLabel: string | null }): ReactNode {
  const [typesCotis, setTypesCotis] = useState<TypeCotisation[]>([]);
  const [collations, setCollations] = useState<Collation[]>([]);
  const [cotisMois, setCotisMois] = useState<Record<string, MouvementCotisMois>>({});
  const [montantBase, setMontantBase] = useState(0);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTypesCotis(loadTypesCotisation());
      setCollations(loadCollations());
      setCotisMois(chargerCotisMois());
      loadMontants(); // applique les montants persistés (cotisation de base…) à TONTINE
      setMontantBase(TONTINE.montantCotisation);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  const monType = typeDuMembre(MOI, typesCotis);
  const maCotis = cotisationDuMembre(MOI, typesCotis, montantBase);
  const mesCollations = collationDuMembre(MOI, collations);
  const total = maCotis + mesCollations;
  const monMois = cotisMois[MOI] ?? { cotisation: false, collation: false };
  const aJour = monMois.cotisation;

  /* — ELLE CHOISIT son type de cotisation (parmi ceux du bureau, ou la base) — */
  const choisirType = (id: string) => {
    const types = loadTypesCotisation().map((t) => ({
      ...t,
      membreIds: t.membreIds.filter((m) => m !== MOI), // règle de la maison : UNE seule cotisation
    }));
    if (id) {
      const idx = types.findIndex((t) => t.id === id);
      if (idx >= 0) types[idx] = { ...types[idx], membreIds: [...types[idx].membreIds, MOI] };
    }
    saveTypesCotisation(types);
    setTypesCotis(types);
    const t = types.find((x) => x.id === id);
    toast.success("Votre type de cotisation est enregistré", {
      description: t
        ? `Vous cotiserez ${fcfa(t.montant)} par mois (« ${t.nom} ») — comme tout membre de ce type.`
        : `Vous revenez à la cotisation de base (${fcfa(montantBase)}/mois).`,
    });
  };

  const cotiser = () => {
    if (aJour) { toast("Votre cotisation du mois est déjà enregistrée"); return; }
    const next = { ...cotisMois, [MOI]: { cotisation: true, collation: mesCollations > 0 } };
    setCotisMois(next);
    ecrireJSON(CLE_COTIS_MOIS, next);
    toast.success("Votre cotisation est enregistrée", {
      description: `${fcfa(total)}${mesCollations > 0 ? " (cotisation + collation)" : " (cotisation)"} — reçu immédiat. La secrétaire cotise comme tout le monde : aucune exception.`,
    });
  };

  return (
    <>
      <FcCard className="overflow-hidden">
        <div className="flex items-start gap-3 bg-[#6E4B71] px-4 py-3.5 text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15"><UserCheck className="h-4.5 w-4.5" /></span>
          <div>
            <p className="fc-serif text-[15px] font-bold">D&apos;abord membre de la Tontine — ensuite secrétaire</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/85">
              Françoise cotise comme tous les membres de la réunion : mêmes montants, mêmes pénalités, même ordre des tours.
              Ici elle agit comme MEMBRE — son encaissement rejoint celui du secrétariat (page « Cotisations &amp; collations »).
            </p>
          </div>
        </div>
        <div className="p-4">
          {/* — CHOIX DU TYPE DE COTISATION — */}
          <div className="rounded-2xl border-2 border-[#6E4B71]/40 bg-[#6E4B71]/8 px-3.5 py-3">
            <p className="text-[11.5px] font-black uppercase tracking-wide text-[#6E4B71]">Quel type de cotisation faites-vous ?</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-[#5C6B60]">
              Règle de la maison : un membre ne cotise qu&apos;UNE seule somme mensuelle — choisissez un type du bureau, ou restez à la cotisation de base.
            </p>
            <select
              value={monType?.id ?? ""}
              onChange={(e) => choisirType(e.target.value)}
              aria-label="Mon type de cotisation (en tant que membre)"
              className="mt-2 w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              <option value="">Cotisation de base — {fcfa(montantBase)} / mois</option>
              {typesCotis.map((t) => (
                <option key={t.id} value={t.id}>{t.nom} — {fcfa(t.montant)} / mois</option>
              ))}
            </select>
          </div>

          {/* — MA COTISATION DU MOIS — */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3.5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma cotisation {p.moisLabel ? `— ${p.moisLabel}` : "du mois"}</p>
              <p className="text-[19px] font-black text-[#2B3530]">
                {fcfa(maCotis)}{mesCollations > 0 && <span className="text-[12px] font-semibold text-[#8A9288]"> + {fcfa(mesCollations)} de collation</span>}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#8A6420]">
                {monType ? `Type attribué : ${monType.nom}` : "Cotisation de base de la Tontine"}
              </p>
            </div>
            {aJour ? (
              <P cls={OK_CLS}><CheckCircle2 className="h-3.5 w-3.5" /> Cotisation à jour</P>
            ) : (
              <Btn tone="violet" onClick={cotiser}><Wallet className="h-4 w-4" /> Cotiser {fcfa(total)}</Btn>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ma part de collation</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#2B3530]"><Coffee className="h-4 w-4 text-[#8A6420]" /> {fcfa(mesCollations)}</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Somme des collations où je suis désignée — la part de chaque membre, comme pour tous.</p>
            </div>
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Reçu de cotisation</p>
              <p className="flex items-center gap-1.5 text-[13.5px] font-black text-[#2F6B45]"><ReceiptText className="h-4 w-4" /> Reçu remis par le trésorier</p>
              <p className="mt-0.5 text-[10.5px] text-[#8A9288]">Chaque versement est encaissé et inscrit au journal de caisse — comme pour tous les membres.</p>
            </div>
          </div>
        </div>
      </FcCard>

      <Block title="Mon historique de cotisations" icon={<CalendarCheck className="h-4.5 w-4.5" />}
        note="La secrétaire suit EXACTEMENT les mêmes règles que les membres — son encaissement apparaît dans la gestion du secrétariat, membre par membre.">
        <div className="flex flex-wrap gap-1.5 p-3.5">
          <P cls={aJour ? OK_CLS : OR_CLS}>
            {aJour ? <CheckCircle2 className="h-3 w-3" /> : <Coins className="h-3 w-3" />} {p.moisLabel ?? "Ce mois"} {aJour ? "— cotisé" : "— à cotiser"}
          </P>
          {mesCollations > 0 && (
            <P cls={monMois.collation ? OK_CLS : VI_CLS}><Coffee className="h-3 w-3" /> Collation {monMois.collation ? "encaissée" : `— ${fcfa(mesCollations)}`}</P>
          )}
        </div>
      </Block>
    </>
  );
}

/* ══════════════════════════ MES ÉPARGNES — Françoise membre ══════════════════════════ */

export function SecMesEpargnes(p: { moisCourantIdx: number | null; regl: Reglement }): ReactNode {
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [montant, setMontant] = useState("");
  const [moisChoisi, setMoisChoisi] = useState<number | null>(null);

  const taux = p.regl.epargne.tauxFixe ? p.regl.epargne.tauxMensuel : 3;

  useEffect(() => {
    const t0 = setTimeout(() => {
      setEpargnes(loadEpargnesReunion());
      setMoisChoisi(p.moisCourantIdx);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  /* — MES versements (membreId = f06) — MÊME SOURCE que le président — */
  const mes = useMemo(() => epargnes.filter((e) => e.membreId === MOI).sort((a, b) => a.moisIdx - b.moisIdx), [epargnes]);
  const solde = mes.reduce((s, e) => s + e.montant, 0);

  /* — MES INTÉRÊTS MOIS PAR MOIS (comme l'espace membre du président) — */
  const lignes = useMemo(() => {
    const parMois: number[] = Array.from({ length: 12 }, () => 0);
    mes.forEach((e) => { parMois[Math.min(11, Math.max(0, e.moisIdx))] += e.montant; });
    type Ligne = { mois: string; m: number; depot: number; enPlace: number; interet: number; cumul: number; avenir: boolean; courant: boolean };
    return MOIS_FR.reduce<Ligne[]>((acc, nom, m) => {
      const prec = acc[acc.length - 1];
      const enPlace = (prec?.enPlace ?? 0) + parMois[m];
      const interet = Math.round(enPlace * (taux / 100));
      const avenir = p.moisCourantIdx != null && m > p.moisCourantIdx;
      acc.push({ mois: nom, m, depot: parMois[m], enPlace, interet, cumul: (prec?.cumul ?? 0) + (avenir ? 0 : interet), avenir, courant: m === p.moisCourantIdx });
      return acc;
    }, []);
  }, [mes, taux, p.moisCourantIdx]);
  const realise = lignes.filter((l) => !l.avenir).reduce((s, l) => s + l.interet, 0);
  const projection = lignes.reduce((s, l) => s + l.interet, 0);

  /* — M'ATTRIBUER une épargne comme un membre : le versement rejoint le
   *    REGISTRE PARTAGÉ (le président et le secrétariat le voient aussitôt) — */
  const mAttribuer = () => {
    const n = Number(montant);
    if (!n || n <= 0) { toast.error("Indiquez la somme de votre épargne"); return; }
    const mi = moisChoisi ?? p.moisCourantIdx ?? 0;
    const next: AttributionReunion[] = [...epargnes, { id: nid(), membreId: MOI, montant: n, moisIdx: Math.min(11, Math.max(0, mi)) }];
    setEpargnes(next);
    saveEpargnesReunion(next);
    setMontant("");
    toast.success("Votre épargne est inscrite au registre du bureau", {
      description: `${fcfa(n)} rattaché à ${MOIS_FR[Math.min(11, Math.max(0, mi))]} — visible aussi dans le registre du président (même source).`,
    });
  };

  /* — retirer un de MES versements (double confirmation, comme au bureau) — */
  const retirerVersement = (id: string) => {
    const e = epargnes.find((x) => x.id === id);
    if (!e) return;
    const next = epargnes.filter((x) => x.id !== id);
    setEpargnes(next);
    saveEpargnesReunion(next);
    toast.success("Versement retiré du registre", { description: `${fcfa(e.montant)} (${MOIS_FR[Math.min(11, Math.max(0, e.moisIdx))]}) — le registre partagé est mis à jour.` });
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Mon épargne personnelle — {NOM_MOI}, comme chaque membre</p>
            <p className="text-[26px] font-black leading-none text-[#1E4D2B]">{fcfa(solde)}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8A9288]">{mes.length} versement(s) au registre du bureau</p>
          </div>
          <P cls={VI_CLS}><Coins className="h-3 w-3" /> Rémunérée à {taux} %/mois — comme chaque membre</P>
        </div>
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#F7F1F8] px-3 py-2 text-[11.5px] font-semibold leading-snug text-[#5D3F60]">
          <PiggyBank className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Vos versements vivent dans le <strong>registre du bureau</strong> (clé partagée avec le président) : ce que
            vous vous attribuez ici remonte automatiquement dans « Épargnes » et sur la page du président.
          </span>
        </p>

        {/* — M'ATTRIBUER une épargne (le formulaire du membre) — */}
        <div className="mt-3 rounded-2xl border-2 border-[#6E4B71]/35 bg-[#F7F1F8] p-3.5">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#6E4B71]">M&apos;attribuer une épargne — comme un membre de la réunion</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Somme (FCFA)"
              aria-label="Somme de mon épargne en FCFA"
              className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
            />
            <select
              value={moisChoisi ?? ""}
              onChange={(e) => setMoisChoisi(Number(e.target.value))}
              aria-label="Mois réel de mon épargne"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              {MOIS_FR.map((nom, mi) => (
                <option key={nom} value={mi}>
                  {nom}{p.moisCourantIdx != null && mi === p.moisCourantIdx ? " — mois en cours" : p.moisCourantIdx != null && mi > p.moisCourantIdx ? " — à venir" : ""}
                </option>
              ))}
            </select>
            <Btn tone="violet" onClick={mAttribuer}><PiggyBank className="h-4 w-4" /> Épargner {montant ? fcfa(Number(montant)) : ""}</Btn>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-[#8A9288]">
            Intérêts au taux en vigueur ({taux} %/mois) — la manière de collecter est celle réglée par le bureau.
          </p>
        </div>
      </FcCard>

      {/* — MES INTÉRÊTS MOIS PAR MOIS — */}
      <Block title={`Mes intérêts mois par mois`} icon={<TrendingUp className="h-4.5 w-4.5" />}
        note={`Chaque mois où votre épargne est en place rapporte ${taux} % : intérêts RÉALISÉS jusqu'au mois en cours, PROJECTION pour les mois à venir.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[12px]">
            <thead>
              <tr className="bg-[#6E4B71] text-white">
                <th className="px-2.5 py-2 text-left font-black">Mois</th>
                <th className="px-2.5 py-2 text-right font-black">Versements du mois</th>
                <th className="px-2.5 py-2 text-right font-black">Épargne en place</th>
                <th className="px-2.5 py-2 text-right font-black">Intérêts du mois</th>
                <th className="px-2.5 py-2 text-right font-black">Intérêts cumulés</th>
              </tr>
            </thead>
            <tbody>
              {lignes.filter((l) => l.depot > 0 || l.enPlace > 0 || !l.avenir).map((l) => (
                <tr key={l.mois} className={`border-b border-[#E5DCC0] ${l.avenir ? "bg-[#FBF7EA] text-[#8A9288]" : "bg-[#FFFDF6]"}`}>
                  <td className="px-2.5 py-2 font-bold">
                    {l.mois}
                    {l.courant && <span className="ml-1.5 rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[9px] font-black text-[#2B2416]">en cours</span>}
                    {l.avenir && <span className="ml-1.5 rounded-full border border-[#C9D2CB] px-1.5 py-0.5 text-[9px] font-black text-[#8A9288]">à venir</span>}
                  </td>
                  <td className="px-2.5 py-2 text-right font-semibold">{l.depot > 0 ? `+${fmt(l.depot)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right">{l.enPlace > 0 ? fcfa(l.enPlace) : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{l.enPlace > 0 ? `+${fmt(l.interet)}` : "—"}</td>
                  <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fcfa(l.cumul)}</td>
                </tr>
              ))}
              <tr className="bg-[#C89F62]/15">
                <td className="px-2.5 py-2.5 font-black text-[#2B2416]" colSpan={3}>Projection au 31 décembre</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#8A6420]">+{fmt(projection)}</td>
                <td className="px-2.5 py-2.5 text-right font-black text-[#2B2416]">{fcfa(projection)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Block>

      {/* — MES VERSEMENTS (registre partagé) — */}
      <Block title="Mes versements — registre du bureau" icon={<ReceiptText className="h-4.5 w-4.5" />}
        note="Chaque ligne est un de vos versements au registre partagé. Une épargne attribuée PAR ERREUR se retire d'un geste (double confirmation) — le registre du président suit aussitôt.">
        {mes.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">
            Aucun versement à votre nom — utilisez « M&apos;attribuer une épargne » ci-dessus.
          </p>
        ) : (
          <ul className="divide-y divide-[#E5DCC0]">
            {mes.map((e) => {
              const mi = Math.min(11, Math.max(0, e.moisIdx));
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6E4B71]/12 text-[#6E4B71]"><PiggyBank className="h-3.5 w-3.5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#2B3530]">{MOIS_FR[mi]} — {fcfa(e.montant)}</span>
                    <span className="block text-[10.5px] text-[#8A9288]">
                      intérêt du mois : +{fcfa(Math.round(e.montant * (taux / 100)))} — registre du bureau (partagé avec le président)
                    </span>
                  </span>
                  <BtnConfirme tone="rouge" labelConfirmer="Confirmer ?" onConfirmer={() => retirerVersement(e.id)}>
                    Retirer ce versement
                  </BtnConfirme>
                </li>
              );
            })}
          </ul>
        )}
      </Block>
    </>
  );
}

/* ══════════════════════════ MES PRÊTS — Françoise membre ══════════════════════════ */

export function SecMesPrets(p: { moisCourantIdx: number | null; regl: Reglement; roster: { id: string; name: string }[] }): ReactNode {
  const [dossiers, setDossiers] = useState<DossierPret[]>([]);
  const [pretsReunion, setPretsReunion] = useState<AttributionReunion[]>([]);
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [moisChoisi, setMoisChoisi] = useState<number | null>(null);
  /* — s'attribuer un prêt FAIT à la réunion (elle prête à la réunion) — */
  const [montantPret, setMontantPret] = useState("");
  const [moisPret, setMoisPret] = useState<number | null>(null);

  const taux = p.regl.prets.tauxMensuel || 3;
  const duree = p.regl.prets.dureeMaxMois > 0 ? p.regl.prets.dureeMaxMois : 6;

  useEffect(() => {
    const t0 = setTimeout(() => {
      setDossiers(chargerDossiers());
      setPretsReunion(loadPretsReunion());
      setMoisChoisi(p.moisCourantIdx);
      setMoisPret(p.moisCourantIdx);
    }, 0);
    return () => clearTimeout(t0);
  }, []);

  const mesDossiers = useMemo(() => dossiers.filter((x) => x.membreId === MOI), [dossiers]);
  const mesPretsReunion = useMemo(() => pretsReunion.filter((x) => x.membreId === MOI).sort((a, b) => a.moisIdx - b.moisIdx), [pretsReunion]);
  const enCours = mesPretsReunion.reduce((s, x) => s + x.montant, 0);

  /* — SOUSCRIRE un prêt à la caisse (dossier instruit par le secrétariat) — */
  const souscrire = () => {
    const n = Number(montant);
    if (!n || n <= 0) { toast.error("Indiquez le montant souhaité"); return; }
    const mi = moisChoisi ?? p.moisCourantIdx ?? 0;
    const nd: DossierPret = {
      id: nid(), membreId: MOI, montant: n, motif: motif.trim() || "Prêt à la caisse de la Tontine",
      garanties: "", avalisteId: null, cosignTresorier: false, statut: "en_attente", motifRefus: "",
      moisIdx: Math.min(11, Math.max(0, mi)),
    };
    const next = [nd, ...dossiers];
    setDossiers(next);
    ecrireJSON(CLE_DEMANDES, next);
    setMontant("");
    setMotif("");
    toast.success("Votre demande de prêt est déposée", {
      description: `${fcfa(n)} rattaché à ${MOIS_FR[Math.min(11, Math.max(0, mi))]} — le dossier rejoint les « Dossiers de prêt des membres » : le secrétariat désigne l'avaliste, obtient la co-signature puis statue.`,
    });
  };

  /* — M'ATTRIBUER un prêt FAIT à la réunion (registre partagé) — */
  const mAttribuerPret = () => {
    const n = Number(montantPret);
    if (!n || n <= 0) { toast.error("Indiquez la somme que vous prêtez à la réunion"); return; }
    const mi = moisPret ?? p.moisCourantIdx ?? 0;
    const next: AttributionReunion[] = [...pretsReunion, { id: nid(), membreId: MOI, montant: n, moisIdx: Math.min(11, Math.max(0, mi)) }];
    setPretsReunion(next);
    savePretsReunion(next);
    setMontantPret("");
    toast.success("Votre prêt à la réunion est inscrit au registre", {
      description: `${fcfa(n)} rattaché à ${MOIS_FR[Math.min(11, Math.max(0, mi))]} — visible aussi dans le registre du président (même source). Intérêts : ${taux} %/mois pendant ${duree} mois.`,
    });
  };

  const STATUT: Record<DossierPret["statut"], { label: string; cls: string }> = {
    en_attente: { label: "En attente — instruit par le secrétariat", cls: OR_CLS },
    accorde: { label: "Accordé", cls: OK_CLS },
    refuse: { label: "Refusé", cls: "bg-[#A5473D]/10 text-[#A5473D] border-[#A5473D]/30" },
  };

  return (
    <>
      <FcCard className="p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#6E4B71]/10 text-[#6E4B71]"><Landmark className="h-4 w-4" /></span>
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#6E4B71]">Emprunter à la caisse de la Tontine — les mêmes règles pour vous.</strong>{" "}
            Choisissez un montant et le mois du prêt ({taux} %/mois, échéance {duree} mois). Votre dossier passe
            dans la file commune : avaliste désigné par le secrétariat, co-signature du trésorier, décision du bureau.
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={montant}
            onChange={(e) => setMontant(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="Montant souhaité (FCFA)"
            aria-label="Montant de mon prêt en FCFA"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
          />
          <select
            value={moisChoisi ?? ""}
            onChange={(e) => setMoisChoisi(Number(e.target.value))}
            aria-label="Mois auquel rattacher mon prêt"
            className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
          >
            {MOIS_FR.map((nom, mi) => (
              <option key={nom} value={mi}>
                {nom}{p.moisCourantIdx != null && mi === p.moisCourantIdx ? " — mois en cours" : p.moisCourantIdx != null && mi > p.moisCourantIdx ? " — à venir" : ""}
              </option>
            ))}
          </select>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Motif (ex. : rentrée scolaire)"
            aria-label="Motif de mon prêt"
            className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#2B3530] outline-none placeholder:text-[#8A9288] sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Btn tone="violet" onClick={souscrire}><HandCoins className="h-4 w-4" /> Souscrire ce prêt {montant ? `de ${fcfa(Number(montant))}` : ""}</Btn>
          </div>
        </div>
        {Number(montant) > 0 && (
          <p className="mt-2 rounded-2xl border border-[#C89F62]/50 bg-[#C89F62]/10 px-3 py-2 text-[11.5px] font-semibold text-[#8A6420]">
            En direct — {fcfa(Number(montant))} sur {duree} mois à {taux} %/mois : intérêts ≈ {fcfa(Math.round(Number(montant) * (taux / 100) * duree))}, mensualité ≈ {fcfa(Math.round((Number(montant) * (1 + (taux / 100) * duree)) / duree))}.
          </p>
        )}
      </FcCard>

      {/* — MES DOSSIERS DE PRÊT — */}
      <Block title="Mes demandes de prêt (caisse de la Tontine)" icon={<HandCoins className="h-4.5 w-4.5" />}
        note="Chaque demande déposée rejoint la file commune des dossiers de prêt : le secrétariat instruit, le bureau statue. Suivez ici l'état de vos dossiers.">
        {mesDossiers.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">
            Aucune demande à votre nom — remplissez le formulaire ci-dessus pour souscrire votre premier prêt.
          </p>
        ) : (
          <div className="space-y-2.5 p-4">
            {mesDossiers.map((d) => {
              const mi = Math.min(11, Math.max(0, d.moisIdx ?? p.moisCourantIdx ?? 0));
              const av = d.avalisteId ? p.roster.find((x) => x.id === d.avalisteId) : null;
              return (
                <div key={d.id} className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13.5px] font-bold text-[#2B3530]">{fcfa(d.montant)} — rattaché à {MOIS_FR[mi]}</p>
                    <P cls={STATUT[d.statut].cls}>{STATUT[d.statut].label}</P>
                  </div>
                  {d.motif && <p className="mt-0.5 text-[11.5px] text-[#8A9288]">{d.motif}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {av && <P cls={OK_CLS}><UserCheck className="h-3 w-3" /> Avaliste : {av.name}</P>}
                    {d.cosignTresorier && <P cls={OK_CLS}><Wallet className="h-3 w-3" /> Co-signé trésorier</P>}
                    {d.garanties && <P cls={TE_CLS}><Landmark className="h-3 w-3" /> Garantie : {d.garanties}</P>}
                  </div>
                  {d.statut === "refuse" && d.motifRefus && (
                    <p className="mt-2 rounded-lg bg-[#A5473D]/8 px-3 py-2 text-[12px] text-[#A5473D]">Motif du refus : {d.motifRefus}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Block>

      {/* — M'ATTRIBUER un prêt FAIT à la réunion — */}
      <Block title="Prêter à la réunion — je m'attribue mon prêt comme un membre" icon={<Coins className="h-4.5 w-4.5" />}
        note="Un prêt FAIT à la réunion = de l'argent que la réunion vous doit : inscrit au registre partagé (président inclus), il produit des intérêts au taux en vigueur jusqu'au remboursement confirmé par le bureau.">
        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={montantPret}
              onChange={(e) => setMontantPret(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Somme prêtée (FCFA)"
              aria-label="Somme de mon prêt à la réunion en FCFA"
              className="rounded-lg border border-[#C9B98A] bg-white px-3 py-2.5 text-[13px] font-bold text-[#2B3530] outline-none placeholder:text-[#8A9288]"
            />
            <select
              value={moisPret ?? ""}
              onChange={(e) => setMoisPret(Number(e.target.value))}
              aria-label="Mois réel de mon prêt à la réunion"
              className="rounded-lg border-2 border-[#E5DCC0] bg-white px-2.5 py-2.5 text-[12.5px] font-bold text-[#2B3530] outline-none focus:border-[#6E4B71]"
            >
              {MOIS_FR.map((nom, mi) => (
                <option key={nom} value={mi}>
                  {nom}{p.moisCourantIdx != null && mi === p.moisCourantIdx ? " — mois en cours" : p.moisCourantIdx != null && mi > p.moisCourantIdx ? " — à venir" : ""}
                </option>
              ))}
            </select>
            <Btn tone="violet" onClick={mAttribuerPret}><HandCoins className="h-4 w-4" /> Inscrire {montantPret ? fcfa(Number(montantPret)) : ""}</Btn>
          </div>
          {mesPretsReunion.length > 0 ? (
            <ul className="mt-3 divide-y divide-[#E5DCC0] rounded-2xl border border-[#E5DCC0] bg-white">
              {mesPretsReunion.map((x) => {
                const mi = Math.min(11, Math.max(0, x.moisIdx));
                return (
                  <li key={x.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-bold text-[#2B3530]">{MOIS_FR[mi]} — {fcfa(x.montant)}</span>
                      <span className="block text-[10.5px] text-[#8A9288]">intérêts du mois : +{fcfa(Math.round(x.montant * (taux / 100)))} — registre partagé avec le président</span>
                    </span>
                    <P cls={VI_CLS}>au registre du bureau</P>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-[#C9B98A] bg-[#FBF7EA] px-3 py-2.5 text-[11.5px] text-[#8A9288]">
              Aucun prêt à la réunion à votre nom — {enCours > 0 ? "" : "inscrivez le premier avec le formulaire ci-dessus."}
            </p>
          )}
        </div>
      </Block>
    </>
  );
}
