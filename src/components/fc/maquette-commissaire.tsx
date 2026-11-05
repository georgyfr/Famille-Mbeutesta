"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETTE v19 — CONSOLE DU COMMISSAIRE AUX COMPTES (cantine Mbeutetsa)
//
// Bernadette Kamga CONTRÔLE — elle ne manipule pas l'argent : elle vérifie,
// atteste, rapproche et alerte. Même philosophie que la console du président,
// mais SANS pouvoir d'encaissement, de décaissement ni de décision : la
// trésorerie reste au trésorier, la conduite au président. Des onglets
// pourront s'ajouter plus tard si le besoin se présente.
//
// ⚠ Maquette de démonstration : le journal de caisse est fictif ; le REGISTRE
// des épargnes et des prêts est lu dans la MÊME source localStorage que la
// console du président (fc_epargnes_reunion_v1 / fc_prets_reunion_v1) — le
// commissaire audit donc la MÊME réalité que le bureau. Aucun effet réel.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BadgeCheck, BookCheck,
  CalendarClock, Eye, FileSpreadsheet, HandHeart, Landmark, PiggyBank,
  Scale, ScrollText, Send, ShieldCheck, Wallet,
} from "lucide-react";
import {
  Block, Btn, BtnConfirme, P, KpiCard, EnteteConsole, NavOnglets,
  fmt, fcfa, heure, nid, dateCourte, OK_CLS, OR_CLS, RJ_CLS, TE_CLS, toast,
} from "./maquette-ui";
import { MEMBRES_FICTIFS, MOIS_FR, ROLE_META } from "./tontine-data";
import { loadEpargnesReunion, loadPretsReunion, type AttributionReunion } from "./registres-bureau";

/* ══════════════════════════ routage par hash ══════════════════════════ */

type TabKey = "caisse" | "journal" | "registres" | "rapports";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "caisse", label: "Caisse du mois", icon: <Wallet className="h-3.5 w-3.5" /> },
  { key: "journal", label: "Journal de caisse", icon: <FileSpreadsheet className="h-3.5 w-3.5" /> },
  { key: "registres", label: "Épargnes & prêts", icon: <PiggyBank className="h-3.5 w-3.5" /> },
  { key: "rapports", label: "Rapports & observations", icon: <ScrollText className="h-3.5 w-3.5" /> },
];

function tabFromHash(): TabKey {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#commissaire/")) {
      const seg = h.slice("#commissaire/".length).replace(/\/+$/, "").split("/")[0];
      if ((TABS.map((t) => t.key) as string[]).includes(seg)) return seg as TabKey;
    } else if (h === "#commissaire" || h === "#commissaire/") {
      return "caisse";
    }
  } catch { /* rien */ }
  return "caisse";
}

/* ══════════════════════════ données de démonstration ══════════════════════════ */

type CaisseCompte = { id: string; label: string; detail: string; montant: number; tone: string; icon: ReactNode };
type LigneCaisse = { id: string; le: string; label: string; entree: number; sortie: number; verifie: boolean };
type Observation = { id: string; sujet: string; detail: string; destinataire: string; le: string; statut: "transmise" | "traitee" };
type RapportTrimestre = { trimestre: string; le: string | null; signe: boolean; lignes: number; montants: string };

const CAISSES_DEMO: CaisseCompte[] = [
  { id: "pot", label: "Pot du mois", detail: "Cotisations & collations encaissées en novembre — à remettre au bénéficiaire", montant: 210_000, tone: "#1E4D2B", icon: <Landmark className="h-4 w-4" /> },
  { id: "sociale", label: "Caisse sociale", detail: "Fonds permanent de la cantine (adhésions, amendes, intérêts)", montant: 85_000, tone: "#3D6B72", icon: <Wallet className="h-4 w-4" /> },
  { id: "secours", label: "Caisse de secours", detail: "Aides familiales (deuil, naissance, maladie) — votées par le bureau", montant: 45_000, tone: "#8A6420", icon: <HandHeart className="h-4 w-4" /> },
];

const initJournal = (): LigneCaisse[] => [
  { id: "j1", le: "02 nov.", label: "Cotisations de novembre — 8 membres encaissés", entree: 200_000, sortie: 0, verifie: true },
  { id: "j2", le: "02 nov.", label: "Collations de novembre — 5 membres", entree: 10_000, sortie: 0, verifie: false },
  { id: "j3", le: "02 nov.", label: "Remise au bénéficiaire du mois — Aurélie Simo (accusé signé)", entree: 0, sortie: 210_000, verifie: false },
  { id: "j4", le: "09 nov.", label: "Amende de retard — Patrick Talla (relance 2)", entree: 2_000, sortie: 0, verifie: false },
  { id: "j5", le: "12 nov.", label: "Aide sociale décaissée — naissance famille Fotso (vote 3/4)", entree: 0, sortie: 45_000, verifie: false },
  { id: "j6", le: "14 nov.", label: "Solde de cotisation — Bernadette Kamga (commissaire)", entree: 25_000, sortie: 0, verifie: false },
];

const initObservations = (): Observation[] => [
  { id: "o1", sujet: "Amende de retard sans relance enregistrée", detail: "Une amende de 2 000 FCFA a été inscrite pour un membre sans que la relance du 1ᵉʳ niveau soit tracée au registre — demander la pièce au trésorier.", destinataire: "Trésorier", le: "28 oct.", statut: "traitee" },
];

const initRapports = (): RapportTrimestre[] => [
  { trimestre: "2ᵉ trimestre (avr.–juin)", le: "07 juil.", signe: true, lignes: 34, montants: "612 000 entrées · 540 000 sorties" },
  { trimestre: "3ᵉ trimestre (juil.–sept.)", le: "05 oct.", signe: true, lignes: 41, montants: "708 000 entrées · 655 000 sorties" },
  { trimestre: "4ᵉ trimestre (oct.–déc.)", le: null, signe: false, lignes: 6, montants: "237 000 entrées · 255 000 sorties" },
];

/* ══════════════════════════ la console ══════════════════════════ */

export function MaquetteCommissaire() {
  const [tab, setTab] = useState<TabKey>(() => "caisse");
  const [moisLabel, setMoisLabel] = useState("…");
  const [moisIdx, setMoisIdx] = useState<number | null>(null);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setTab(tabFromHash());
      const d = new Date();
      setMoisIdx(d.getMonth());
      setMoisLabel(`${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`);
    }, 0);
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const goTab = (t: TabKey) => {
    setTab(t);
    try {
      const h = `#commissaire/${t}`;
      if (window.location.hash !== h) window.history.replaceState(null, "", h);
    } catch {
      /* rien */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const parMembre = useMemo(() => new Map(MEMBRES_FICTIFS.map((m) => [m.id, m])), []);

  /* — caisses : attestations — */
  const [attestations, setAttestations] = useState<Record<string, string>>({});
  const attester = (id: string) => {
    setAttestations((prev) => ({ ...prev, [id]: `${dateCourte()} ${heure()}` }));
    const c = CAISSES_DEMO.find((x) => x.id === id);
    toast.success("Compte attesté", { description: `${c?.label} — les pièces justificatives ont été contrôlées et l'attestation est signée par le commissaire aux comptes.` });
  };

  /* — journal de caisse : audit ligne par ligne — */
  const [journal, setJournal] = useState<LigneCaisse[]>(initJournal);
  const [filtreAttente, setFiltreAttente] = useState(false);
  const cocher = (id: string) => {
    setJournal((prev) => prev.map((x) => (x.id === id ? { ...x, verifie: !x.verifie } : x)));
    const j = journal.find((x) => x.id === id);
    if (j && !j.verifie) toast.success("Ligne vérifiée", { description: `${j.label} — pièce contrôlée, montant cohérent.` });
  };
  const aVerifier = journal.filter((x) => !x.verifie).length;
  const totaux = useMemo(() => {
    const entrees = journal.reduce((s, x) => s + x.entree, 0);
    const sorties = journal.reduce((s, x) => s + x.sortie, 0);
    return { entrees, sorties, solde: 65_000 + entrees - sorties };
  }, [journal]);
  const toutVerifier = () => {
    setJournal((prev) => prev.map((x) => ({ ...x, verifie: true })));
    toast.success("Journal entièrement vérifié", { description: `${journal.length} lignes cochées — total ${fcfa(totaux.entrees)} entrées, ${fcfa(totaux.sorties)} sorties, solde ${fcfa(totaux.solde)}.` });
  };

  /* — registres du bureau : rapprochement (MÊME source que le président) — */
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [prets, setPrets] = useState<AttributionReunion[]>([]);
  useEffect(() => {
    const t0 = setTimeout(() => { setEpargnes(loadEpargnesReunion()); setPrets(loadPretsReunion()); }, 0);
    return () => clearTimeout(t0);
  }, []);
  const [rapprochement, setRapprochement] = useState<string | null>(null);
  const lancerRapprochement = () => {
    const totalE = epargnes.reduce((s, e) => s + e.montant, 0);
    const totalP = prets.filter((x) => !x.rembourse).reduce((s, x) => s + x.montant, 0);
    const incoherences = [...epargnes, ...prets].filter((x) => !(x.montant > 0) || x.moisIdx < 0 || x.moisIdx > 11 || !parMembre.get(x.membreId)).length;
    setRapprochement(`${dateCourte()} ${heure()}`);
    if (incoherences > 0) {
      toast.error("Anomalies détectées", { description: `${incoherences} inscription(s) incohérente(s) au registre — une observation est à transmettre au bureau (onglet Rapports).` });
    } else {
      toast.success("Rapprochement exact", { description: `${epargnes.length} épargne(s) pour ${fcfa(totalE)} · ${prets.filter((x) => !x.rembourse).length} prêt(s) en cours pour ${fcfa(totalP)} — registre conforme, aucune anomalie.` });
    }
  };

  /* — rapports & observations — */
  const [rapports, setRapports] = useState<RapportTrimestre[]>(initRapports);
  const [observations, setObservations] = useState<Observation[]>(initObservations);
  const [obsForm, setObsForm] = useState<{ sujet: string; detail: string; destinataire: string } | null>(null);
  const signerRapport = () => {
    setRapports((prev) => prev.map((x) => (x.signe ? x : { ...x, signe: true, le: dateCourte() })));
    toast.success("Rapport signé", { description: "Le rapport du trimestre est signé par le commissaire aux comptes et transmis au président — il sera LU à la prochaine réunion." });
  };
  const transmettreObservation = () => {
    if (!obsForm?.sujet.trim() || !obsForm?.detail.trim()) { toast.error("Le sujet et le détail sont obligatoires"); return; }
    setObservations((prev) => [{ id: nid(), sujet: obsForm.sujet.trim(), detail: obsForm.detail.trim(), destinataire: obsForm.destinataire, le: `${dateCourte()} ${heure()}`, statut: "transmise" }, ...prev]);
    setObsForm(null);
    toast.success("Observation transmise", { description: `Envoyée au ${obsForm.destinataire.toLowerCase()} — copie archivée au registre du commissariat.` });
  };

  const badges: Partial<Record<TabKey, number>> = {
    caisse: CAISSES_DEMO.length - Object.keys(attestations).length,
    journal: aVerifier,
    registres: rapprochement ? 0 : 1,
    rapports: observations.filter((o) => o.statut === "transmise").length,
  };

  const renderTab = (t: (typeof TABS)[number], actif: boolean) => {
    const badge = badges[t.key] ?? 0;
    return (
      <button
        key={t.key}
        type="button"
        onClick={() => goTab(t.key)}
        aria-current={actif ? "page" : undefined}
        className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-[13px] font-bold transition-all sm:min-h-[48px] sm:text-[14px] ${
          actif
            ? "border-[#22484F] bg-[#3D6B72] text-white shadow-[0_6px_18px_rgba(61,107,114,0.5)]"
            : "border-[#8FB5BA] bg-[#EDF4F3] text-[#2A5259] hover:border-[#3D6B72] hover:bg-[#DFEDEB]"
        }`}
      >
        {t.icon}
        {t.label}
        {badge > 0 && (
          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${actif ? "bg-[#C89F62] text-[#2B2416]" : "bg-[#A5473D] text-white"}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-10 pt-3 sm:px-4">
      {/* ── en-tête ── */}
      <EnteteConsole
        accent="#31565C" accentClair="#3D6B72"
        surtitre="Contrôle & audit des caisses"
        titre="Console — Commissaire aux comptes"
        sousTitre={`${ROLE_META.commissaire.label} : Bernadette Kamga (vous) · Cantine Mbeutetsa · contrôle trimestriel`}
        icon={<Scale className="h-6 w-6" />}
        badges={
          <>
            <P cls="border-white/25 bg-white/10 text-white"><Eye className="h-3 w-3" /> Lecture seule — la caisse reste au trésorier</P>
            <P cls={aVerifier > 0 ? "border-[#C89F62] bg-[#C89F62]/25 text-[#FFEBD2]" : "border-white/25 bg-white/10 text-white"}>
              <BookCheck className="h-3 w-3" /> {aVerifier} ligne(s) à vérifier
            </P>
            <P cls="border-white/25 bg-white/10 text-white"><BadgeCheck className="h-3 w-3" /> {Object.keys(attestations).length}/{CAISSES_DEMO.length} comptes attestés</P>
          </>
        }
      />

      {/* ── onglets ── */}
      <NavOnglets
        ariaLabel="Sections du commissariat aux comptes"
        etiquette="Commissariat aux comptes — contrôler sans décider"
        couleurPoint="#3D6B72"
        onglets={TABS.map((t) => ({ ...t, badge: badges[t.key] ?? 0 }))}
        actif={tab}
        goTab={goTab}
        render={renderTab}
      />

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {tab === "caisse" && (
          <CaisseSection mois={moisLabel} attestations={attestations} onAttester={attester} />
        )}
        {tab === "journal" && (
          <JournalSection journal={journal} filtreAttente={filtreAttente} setFiltreAttente={setFiltreAttente} onCoicher={cocher} onToutVerifier={toutVerifier} totaux={totaux} aVerifier={aVerifier} />
        )}
        {tab === "registres" && (
          <RegistresSection epargnes={epargnes} prets={prets} parMembre={parMembre} moisIdx={moisIdx} rapprochement={rapprochement} onRapprocher={lancerRapprochement} />
        )}
        {tab === "rapports" && (
          <RapportsSection rapports={rapports} observations={observations} obsForm={obsForm} setObsForm={setObsForm} onSigner={signerRapport} onTransmettre={transmettreObservation} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ sections ══════════════════════════ */

function CaisseSection(p: { mois: string; attestations: Record<string, string>; onAttester: (id: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {CAISSES_DEMO.map((c) => {
          const atteste = p.attestations[c.id];
          return (
            <div key={c.id} className="flex flex-col rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">
                <span style={{ color: c.tone }}>{c.icon}</span> {c.label}
              </div>
              <p className="mt-1 text-[21px] font-black leading-tight" style={{ color: c.tone }}>{fcfa(c.montant)}</p>
              <p className="mt-0.5 flex-1 text-[10.5px] font-semibold text-[#8A9288]">{c.detail}</p>
              <div className="mt-2">
                {atteste ? (
                  <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Attesté le {atteste}</P>
                ) : (
                  <BtnConfirme tone="teal" onConfirmer={() => p.onAttester(c.id)} labelConfirmer="Attester ?">
                    <BadgeCheck className="h-4 w-4" /> Attester ce compte
                  </BtnConfirme>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Block
        title={`Attestation des caisses — ${p.mois}`}
        icon={<Wallet className="h-4 w-4" />}
        accent="#3D6B72"
        note="Le commissaire aux comptes ATTESTE chaque caisse : les montants annoncés par le trésorier correspondent aux pièces (reçus, accusés, tickets). Attester = signer « j'ai vu les pièces ». Le trésorier garde la caisse — le commissaire ne touche JAMAIS à l'argent."
      >
        <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-[#4A554E]">
          <p className="font-bold text-[#2B3530]">Rappel des règles du commissariat :</p>
          <p>• Contrôle des caisses et du journal de caisse CHAQUE TRIMESTRE — rapport signé et lu en réunion.</p>
          <p>• Toute anomalie est transmise au président (ou au censeur si le président est concerné) PAR ÉCRIT, jamais réglée en privé.</p>
          <p>• Aucun pouvoir de décision : le commissaire constate, le bureau statue.</p>
        </div>
      </Block>
    </>
  );
}

function JournalSection(p: {
  journal: LigneCaisse[]; filtreAttente: boolean; setFiltreAttente: (v: boolean) => void;
  onCoicher: (id: string) => void; onToutVerifier: () => void;
  totaux: { entrees: number; sorties: number; solde: number }; aVerifier: number;
}) {
  const lignes = p.filtreAttente ? p.journal.filter((x) => !x.verifie) : p.journal;
  return (
    <Block
      title="Journal de caisse — audit ligne par ligne"
      icon={<FileSpreadsheet className="h-4 w-4" />}
      accent="#3D6B72"
      note="Le trésorier inscrit CHAQUE mouvement de caisse. Le commissaire coche « vérifié » après avoir vu la pièce justificative — une ligne non vérifiée reste visible en rouge jusqu'au contrôle."
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DCC0] bg-[#FBF7EA] px-4 py-2.5">
        <P cls={p.aVerifier > 0 ? RJ_CLS : OK_CLS}>
          {p.aVerifier > 0 ? `${p.aVerifier} ligne(s) à vérifier` : "Journal entièrement vérifié"}
        </P>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => p.setFiltreAttente(!p.filtreAttente)}
            aria-pressed={p.filtreAttente}
            className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border-2 px-2.5 text-[11.5px] font-bold transition ${p.filtreAttente ? "border-[#3D6B72] bg-[#3D6B72] text-white" : "border-[#C9B98A] bg-white text-[#5C6B60] hover:border-[#3D6B72]"}`}
          >
            <Eye className="h-3.5 w-3.5" /> À vérifier seulement
          </button>
          <Btn small tone="teal" onClick={p.onToutVerifier}><BookCheck className="h-3.5 w-3.5" /> Tout vérifier</Btn>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[#3D6B72] text-white">
              <th className="px-3 py-2 text-left font-black">Date</th>
              <th className="px-3 py-2 text-left font-black">Mouvement</th>
              <th className="px-3 py-2 text-right font-black">Entrée</th>
              <th className="px-3 py-2 text-right font-black">Sortie</th>
              <th className="px-3 py-2 text-center font-black">Vérifié</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((j) => (
              <tr key={j.id} className={`border-b border-[#E5DCC0] ${j.verifie ? "bg-[#FFFDF6]" : "bg-[#A5473D]/6"}`}>
                <td className="px-3 py-2 font-semibold text-[#5C6B60]">{j.le}</td>
                <td className="px-3 py-2 font-bold text-[#2B3530]">{j.label}</td>
                <td className="px-3 py-2 text-right font-black text-[#2F6B45]">{j.entree > 0 ? `+${fmt(j.entree)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-black text-[#A5473D]">{j.sortie > 0 ? `−${fmt(j.sortie)}` : "—"}</td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => p.onCoicher(j.id)}
                    aria-pressed={j.verifie}
                    aria-label={j.verifie ? `Retirer la vérification de « ${j.label} »` : `Vérifier « ${j.label} »`}
                    className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-lg border-2 px-1.5 text-[10.5px] font-black transition ${j.verifie ? "border-[#2F6B45]/40 bg-[#2F6B45]/15 text-[#2F6B45]" : "border-[#A5473D]/40 bg-white text-[#A5473D] hover:bg-[#A5473D]/10"}`}
                  >
                    <BookCheck className="h-3.5 w-3.5" /> {j.verifie ? "Vu" : "À voir"}
                  </button>
                </td>
              </tr>
            ))}
            {lignes.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-3 text-center text-[12px] font-semibold text-[#8A9288]">Aucune ligne à vérifier — tout a été contrôlé.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#C89F62]/15">
              <td className="px-3 py-2.5 font-black text-[#2B2416]" colSpan={2}>Totaux du journal</td>
              <td className="px-3 py-2.5 text-right font-black text-[#2F6B45]">+{fmt(p.totaux.entrees)}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#A5473D]">−{fmt(p.totaux.sorties)}</td>
              <td className="px-3 py-2.5" />
            </tr>
            <tr className="bg-[#2A4A3A]/8">
              <td className="px-3 py-2.5 font-black text-[#2B2416]" colSpan={2}>Solde de caisse (avec solde initial 65 000)</td>
              <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]" colSpan={2}>{fcfa(p.totaux.solde)}</td>
              <td className="px-3 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </Block>
  );
}

function RegistresSection(p: {
  epargnes: AttributionReunion[]; prets: AttributionReunion[];
  parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>; moisIdx: number | null;
  rapprochement: string | null; onRapprocher: () => void;
}) {
  const totalE = p.epargnes.reduce((s, e) => s + e.montant, 0);
  const pretsEnCours = p.prets.filter((x) => !x.rembourse);
  const totalP = pretsEnCours.reduce((s, x) => s + x.montant, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<PiggyBank className="h-4 w-4" />} label="Épargnes au registre" value={String(p.epargnes.length)} sub={`total ${fcfa(totalE)}`} accent="#1E4D2B" />
        <KpiCard icon={<ArrowDownToLine className="h-4 w-4" />} label="Prêts en cours" value={String(pretsEnCours.length)} sub={`capital dû ${fcfa(totalP)}`} accent="#8A6420" />
        <KpiCard icon={<ArrowUpFromLine className="h-4 w-4" />} label="Prêts remboursés" value={String(p.prets.filter((x) => x.rembourse).length)} sub="soldés et clos" accent="#2F6B45" />
        <KpiCard icon={<Scale className="h-4 w-4" />} label="Rapprochement" value={p.rapprochement ? "Fait" : "À faire"} sub={p.rapprochement ?? "registres du bureau"} accent="#3D6B72" />
      </div>
      <Block
        title="Registres du bureau — contrôle de cohérence"
        icon={<PiggyBank className="h-4 w-4" />}
        accent="#3D6B72"
        note="CE SONT LES REGISTRES RÉELS du bureau — la même source que les pages « Épargnes » et « Prêts » du président. Le rapprochement vérifie que chaque inscription est complète (membre connu, mois valide, montant positif)."
      >
        <div className="p-4">
          <BtnConfirme tone="teal" onConfirmer={p.onRapprocher} labelConfirmer="Lancer ?">
            <Scale className="h-4 w-4" /> Lancer le rapprochement des registres
          </BtnConfirme>
          {p.rapprochement && (
            <p className="mt-2 text-[11px] font-semibold text-[#2F6B45]">Dernier rapprochement : {p.rapprochement} — le résultat détaillé est dans la notification.</p>
          )}
        </div>
        {p.epargnes.length > 0 && (
          <div className="overflow-x-auto border-t border-[#E5DCC0]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#1E4D2B] text-white">
                  <th className="px-3 py-2 text-left font-black">Épargne — membre</th>
                  <th className="px-3 py-2 text-left font-black">Mois</th>
                  <th className="px-3 py-2 text-right font-black">Montant</th>
                  <th className="px-3 py-2 text-right font-black">Intérêts au 31 déc. (3 %/mois)</th>
                </tr>
              </thead>
              <tbody>
                {p.epargnes.map((e) => {
                  const m = p.parMembre.get(e.membreId);
                  const mi = Math.min(11, Math.max(0, e.moisIdx));
                  const moisProduit = 12 - mi;
                  const interet = Math.round(e.montant * 0.03 * moisProduit);
                  return (
                    <tr key={e.id} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                      <td className="px-3 py-2 font-bold text-[#2B3530]">{m?.name ?? e.membreId}</td>
                      <td className="px-3 py-2">{MOIS_FR[mi]}</td>
                      <td className="px-3 py-2 text-right font-black text-[#1E4D2B]">{fcfa(e.montant)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#2F6B45]">+{fmt(interet)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#C89F62]/15">
                  <td className="px-3 py-2.5 font-black text-[#2B2416]" colSpan={2}>Total épargnes</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#2B2416]">{fcfa(totalE)}</td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {p.prets.length > 0 && (
          <div className="overflow-x-auto border-t border-[#E5DCC0]">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#31565C] text-white">
                  <th className="px-3 py-2 text-left font-black">Prêt — membre</th>
                  <th className="px-3 py-2 text-left font-black">Mois</th>
                  <th className="px-3 py-2 text-right font-black">Capital</th>
                  <th className="px-3 py-2 text-center font-black">État</th>
                </tr>
              </thead>
              <tbody>
                {p.prets.map((pr) => {
                  const m = p.parMembre.get(pr.membreId);
                  const mi = Math.min(11, Math.max(0, pr.moisIdx));
                  return (
                    <tr key={pr.id} className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                      <td className="px-3 py-2 font-bold text-[#2B3530]">{m?.name ?? pr.membreId}</td>
                      <td className="px-3 py-2">{MOIS_FR[mi]}</td>
                      <td className="px-3 py-2 text-right font-black text-[#1E4D2B]">{fcfa(pr.montant)}</td>
                      <td className="px-3 py-2 text-center">
                        {pr.rembourse ? <P cls={OK_CLS}>Remboursé</P> : pr.avances?.length ? <P cls={OR_CLS}>Avance reçue</P> : <P cls={TE_CLS}>En cours</P>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#C89F62]/15">
                  <td className="px-3 py-2.5 font-black text-[#2B2416]" colSpan={2}>Capital des prêts en cours</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#2B2416]">{fcfa(totalP)}</td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Block>
    </>
  );
}

function RapportsSection(p: {
  rapports: RapportTrimestre[]; observations: Observation[];
  obsForm: { sujet: string; detail: string; destinataire: string } | null;
  setObsForm: (f: { sujet: string; detail: string; destinataire: string } | null) => void;
  onSigner: () => void; onTransmettre: () => void;
}) {
  const DESTINATAIRES = ["Président", "Trésorier", "Bureau en séance", "Censeur"];
  return (
    <>
      <Block
        title="Rapports trimestriels de contrôle"
        icon={<ScrollText className="h-4 w-4" />}
        accent="#3D6B72"
        note="Chaque TRIMESTRE, le commissaire signe un rapport : caisses contrôlées, journal de caisse audité, registres rapprochés. Le rapport signé est transmis au président et LU à la réunion — la transparence n'est pas une option."
      >
        <div className="divide-y divide-[#E5DCC0]">
          {p.rapports.map((r) => (
            <div key={r.trimestre} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#2B3530]">{r.trimestre}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#8A9288]">{r.lignes} lignes auditées · {r.montants}</p>
              </div>
              {r.signe ? (
                <P cls={OK_CLS}><BadgeCheck className="h-3 w-3" /> Signé le {r.le}</P>
              ) : (
                <P cls={OR_CLS}><CalendarClock className="h-3 w-3" /> En cours — à signer</P>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
          <BtnConfirme tone="teal" onConfirmer={p.onSigner} labelConfirmer="Confirmer la signature ?">
            <BadgeCheck className="h-4 w-4" /> Signer le rapport du trimestre en cours
          </BtnConfirme>
        </div>
      </Block>

      <Block
        title="Observations & alertes au bureau"
        icon={<AlertTriangle className="h-4 w-4" />}
        accent="#3D6B72"
        note="Une anomalie repérée ? Le commissaire la transmet PAR ÉCRIT au destinataire choisi — traçable, datée, archivée. C'est la voie normale : pas de conflit devant la famille, pas d'arrangement en privé."
      >
        {p.obsForm && (
          <div className="space-y-2 border-b border-[#E5DCC0] bg-[#EDF4F3] p-4">
            <p className="text-[12px] font-black text-[#2A5259]">Nouvelle observation</p>
            <input
              value={p.obsForm.sujet}
              onChange={(e) => p.setObsForm({ ...p.obsForm!, sujet: e.target.value })}
              placeholder="Sujet (ex. : Amende sans relance tracée)"
              aria-label="Sujet de l'observation"
              className="w-full rounded-lg border border-[#8FB5BA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
            />
            <textarea
              value={p.obsForm.detail}
              onChange={(e) => p.setObsForm({ ...p.obsForm!, detail: e.target.value })}
              rows={3}
              placeholder="Détail : ce que vous avez constaté, la pièce qui manque, la règle concernée…"
              aria-label="Détail de l'observation"
              className="w-full rounded-lg border border-[#8FB5BA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {DESTINATAIRES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => p.setObsForm({ ...p.obsForm!, destinataire: d })}
                  aria-pressed={p.obsForm!.destinataire === d}
                  className={`rounded-lg border-2 px-2.5 py-1 text-[11px] font-bold transition ${p.obsForm!.destinataire === d ? "border-[#3D6B72] bg-[#3D6B72] text-white" : "border-[#C9B98A] bg-white text-[#5C6B60] hover:border-[#3D6B72]"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn tone="teal" onClick={p.onTransmettre}><Send className="h-4 w-4" /> Transmettre l'observation</Btn>
              <Btn tone="neutre" onClick={() => p.setObsForm(null)}>Annuler</Btn>
            </div>
          </div>
        )}
        <div className="divide-y divide-[#E5DCC0]">
          {p.observations.map((o) => (
            <div key={o.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-[13px] font-bold text-[#2B3530]">{o.sujet}</p>
                <P cls={o.statut === "transmise" ? OR_CLS : OK_CLS}>{o.statut === "transmise" ? "Transmise" : "Traitée"} · {o.le}</P>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A554E]">{o.detail}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Destinataire : {o.destinataire}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
          <Btn tone="teal" onClick={() => p.setObsForm({ sujet: "", detail: "", destinataire: "Président" })} disabled={!!p.obsForm}>
            <AlertTriangle className="h-4 w-4" /> Écrire une observation
          </Btn>
        </div>
      </Block>
    </>
  );
}
