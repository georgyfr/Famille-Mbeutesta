"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETTE v19 — CONSOLE DU SECRÉTAIRE (cantine Mbeutetsa)
//
// Françoise Mbeutetsa tient la MÉMOIRE de la tontine : procès-verbaux,
// liste de présence, journal des décisions, taux des épargnes & prêts
// (co-signé avec le président) et convocations. Même philosophie que la
// console du président — mais SEULEMENT ses fonctions à elle : le président
// garde la conduite de réunion, la trésorerie et la recouvrance ; des onglets
// pourront s'ajouter plus tard si le besoin se présente.
//
// ⚠ Maquette de démonstration : données fictives en mémoire ; le REGISTRE des
// épargnes et le RÈGLEMENT sont lus dans les MÊMES sources localStorage que la
// console du président (fc_epargnes_reunion_v1, fc_reglement_v1) — les trois
// consoles montrent donc la même réalité. Aucune action réelle hors de la page.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive, Ban, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Coins, FileEdit,
  Mail, PenLine, Percent, PiggyBank, ScrollText, Send, ShieldCheck, Stamp,
  UserCheck, Users,
} from "lucide-react";
import {
  Block, Btn, BtnConfirme, P, KpiCard, EnteteConsole, NavOnglets,
  fmt, fcfa, heure, nid, dateCourte, OK_CLS, OR_CLS, RJ_CLS, TE_CLS, VI_CLS, toast,
} from "./maquette-ui";
import { MEMBRES_FICTIFS, MOIS_FR, ROLE_META, TONTINE, secondSunday } from "./tontine-data";
import { loadMembresApplication } from "./membres-app";
import { loadReglement } from "./reglement";
import { loadEpargnesReunion, type AttributionReunion } from "./registres-bureau";

/* ══════════════════════════ routage par hash ══════════════════════════ */

type TabKey = "pv" | "presences" | "decisions" | "taux" | "convocations";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "pv", label: "Procès-verbaux", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { key: "presences", label: "Liste de présence", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { key: "decisions", label: "Décisions & archives", icon: <ScrollText className="h-3.5 w-3.5" /> },
  { key: "taux", label: "Taux & registre", icon: <Percent className="h-3.5 w-3.5" /> },
  { key: "convocations", label: "Convocations", icon: <Mail className="h-3.5 w-3.5" /> },
];

function tabFromHash(): TabKey {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h.startsWith("#secretaire/")) {
      const seg = h.slice("#secretaire/".length).replace(/\/+$/, "").split("/")[0];
      if ((TABS.map((t) => t.key) as string[]).includes(seg)) return seg as TabKey;
    } else if (h === "#secretaire" || h === "#secretaire/") {
      return "pv";
    }
  } catch { /* rien */ }
  return "pv";
}

/* ══════════════════════════ données de démonstration ══════════════════════════ */

type StatutPV = "brouillon" | "finalise" | "archive";
type PV = { id: string; titre: string; le: string; statut: StatutPV; contenu: string };
type DecisionJ = { id: string; point: string; texte: string; responsable: string; le: string };
type Convocation = { id: string; objet: string; message: string; le: string; destinataires: number };
type PresenceEtat = "attente" | "present" | "excuse" | "absent";

const initPV = (): PV[] => [
  {
    id: "pv-sep", titre: "Procès-verbal — réunion de septembre", le: "14 sept.", statut: "archive",
    contenu: "Réunion tenue le 2ᵉ dimanche de septembre au domicile de la famille Mbeutetsa, Douala. "
      + "Appel : 10 membres, 9 présents, 1 excusé (Françoise Mbeutetsa, depuis Paris). "
      + "Cotisations encaissées par le trésorier Émile Tchoumi. "
      + "Décision du bureau : le taux mensuel des épargnes et prêts est MAINTENU à 3 %. "
      + "Prochaine réunion : 2ᵉ dimanche d'octobre — collation assurée par la famille Talla.",
  },
  {
    id: "pv-oct", titre: "Procès-verbal — réunion d'octobre", le: "12 oct.", statut: "finalise",
    contenu: "Réunion tenue le 2ᵉ dimanche d'octobre. Appel : 10 membres, 8 présents, 1 excusé, 1 absent. "
      + "Remise de la somme du mois au bénéficiaire Aurélie Simo — accusé de remise signé devant témoin. "
      + "Deux signalements examinés (épargne d'octobre mal montée, dette de P. Talla corrigée au registre). "
      + "La cotation de novembre est rappelée à tous : aucune exception, président compris.",
  },
  {
    id: "pv-nov", titre: "Procès-verbal — réunion de novembre", le: "—", statut: "brouillon",
    contenu: "Appel : (à compléter après la séance).\n\nPoint 1 — Cotisations du mois : …\n\nPoint 2 — Remise au bénéficiaire : …\n\nPoint 3 — Divers : …",
  },
];

const initDecisions = (): DecisionJ[] => [
  { id: "d1", point: "Taux des épargnes & prêts", texte: "Taux mensuel fixé à 3 % pour toute l'année — décision conjointe président + secrétaire, publiée au registre.", responsable: "Président + Secrétaire", le: "09:12" },
  { id: "d2", point: "Épargne d'octobre (Bernadette Kamga)", texte: "Montant erroné au registre : corrigé à 25 000 FCFA après vérification du reçu.", responsable: "Trésorier", le: "08:47" },
  { id: "d3", point: "Dette de Patrick Talla", texte: "Dette mal insérée au registre — réécrite et validée par le bureau.", responsable: "Bureau", le: "08:47" },
  { id: "d4", point: "Caisse de secours — juin", texte: "Aide de 45 000 FCFA décaissée pour la naissance chez la famille Fotso — reçu archivé.", responsable: "Trésorier", le: "Hier" },
];

const initConvocations = (): Convocation[] => [
  { id: "c1", objet: "Réunion d'octobre — cotisation & remise du mois", message: "Chers membres, la réunion se tiendra le 2ᵉ dimanche d'octobre à 14 h. Merci d'amener votre cotisation et votre contribution collation.", le: "5 oct.", destinataires: 10 },
];

const initPresences = (ids: string[]): Record<string, PresenceEtat> => {
  const seed: Record<string, PresenceEtat> = {
    f01: "present", f02: "present", f03: "attente", f04: "present", f05: "excuse",
    f06: "present", f07: "attente", f08: "present", f09: "absent", f10: "attente",
  };
  ids.forEach((id) => { if (!(id in seed)) seed[id] = "attente"; });
  return seed;
};

const ETATS_PRESENCE: { cle: PresenceEtat; label: string; cls: string }[] = [
  { cle: "present", label: "Présent", cls: OK_CLS },
  { cle: "excuse", label: "Excusé", cls: OR_CLS },
  { cle: "absent", label: "Absent", cls: RJ_CLS },
  { cle: "attente", label: "Attente", cls: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" },
];

/* ══════════════════════════ la console ══════════════════════════ */

export function MaquetteSecretaire() {
  const [tab, setTab] = useState<TabKey>(() => "pv");
  const [membresApp, setMembresApp] = useState<(typeof MEMBRES_FICTIFS)[number][]>([]);
  const [moisLabel, setMoisLabel] = useState("…");
  const [moisIdx, setMoisIdx] = useState<number | null>(null);

  /* chargements réservés au client (localStorage, Date) — zéro mismatch d'hydratation */
  useEffect(() => {
    const t0 = setTimeout(() => {
      setTab(tabFromHash());
      setMembresApp(loadMembresApplication());
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
      const h = `#secretaire/${t}`;
      if (window.location.hash !== h) window.history.replaceState(null, "", h);
    } catch {
      /* rien */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const roster = useMemo(() => [...MEMBRES_FICTIFS, ...membresApp], [membresApp]);
  const parMembre = useMemo(() => new Map(roster.map((m) => [m.id, m])), [roster]);
  const MOI = "f06"; // Françoise Mbeutetsa — la secrétaire est AUSSI une membre

  /* — procès-verbaux — */
  const [pvs, setPvs] = useState<PV[]>(initPV);
  const finaliserPV = (id: string) => {
    setPvs((prev) => prev.map((x) => (x.id === id ? { ...x, statut: "finalise" as const, le: dateCourte() } : x)));
    toast.success("Procès-verbal finalisé", { description: "Prêt à être LU à la prochaine réunion, puis archivé — comme à l'oral : on lit, la famille approuve." });
  };
  const archiverPV = (id: string) => {
    const p = pvs.find((x) => x.id === id);
    setPvs((prev) => prev.map((x) => (x.id === id ? { ...x, statut: "archive" as const } : x)));
    toast("Procès-verbal archivé", { description: p ? `« ${p.titre} » rejoint les archives de la famille — consultables par tous.` : "" });
  };
  const majContenuPV = (id: string, contenu: string) =>
    setPvs((prev) => prev.map((x) => (x.id === id ? { ...x, contenu } : x)));

  /* — présences — */
  const [presences, setPresences] = useState<Record<string, PresenceEtat>>(() => initPresences(MEMBRES_FICTIFS.map((m) => m.id)));
  /* Les membres AJOUTÉS via l'application ne sont pas dans le seed : au rendu,
   * tout id absent de la map vaut « attente » (aucun effet nécessaire). */
  const etatPresence = (id: string): PresenceEtat => presences[id] ?? "attente";
  const marquer = (id: string, etat: PresenceEtat) => {
    setPresences((prev) => ({ ...prev, [id]: etat }));
  };
  const nbPresent = roster.filter((m) => etatPresence(m.id) === "present").length;
  const nbExcuse = roster.filter((m) => etatPresence(m.id) === "excuse").length;
  const nbAbsent = roster.filter((m) => etatPresence(m.id) === "absent").length;
  const toutPresent = () => {
    setPresences(Object.fromEntries(roster.map((m) => [m.id, "present" as const])));
    toast.success("Tous les membres marqués présents", { description: `Appel de ${roster.length} membres terminé — la liste part au trésorier pour les pénalités d'absence (0 ce mois).` });
  };
  const transmettreAppel = () => {
    toast.success("Liste de présence transmise au trésorier", { description: `${nbPresent} présents · ${nbExcuse} excusés · ${nbAbsent} absents — pénalités d'absence à encaisser : ${fcfa(nbAbsent * TONTINE.penaliteAbsence)}.` });
  };

  /* — décisions & archives — */
  const [decisions, setDecisions] = useState<DecisionJ[]>(initDecisions);
  const [decForm, setDecForm] = useState<{ point: string; texte: string; resp: string } | null>(null);
  const inscrireDecision = () => {
    if (!decForm?.point.trim() || !decForm?.texte.trim()) { toast.error("Le point et la décision sont obligatoires"); return; }
    setDecisions((prev) => [{ id: nid(), point: decForm.point.trim(), texte: decForm.texte.trim(), responsable: decForm.resp.trim() || "Secrétaire", le: heure() }, ...prev]);
    setDecForm(null);
    toast.success("Décision inscrite au journal", { description: "Archivée au nom du bureau — le président et le commissaire aux comptes en ont la lecture." });
  };

  /* — taux & registre : LES MÊMES sources que le président — */
  const reglement = useMemo(() => loadReglement(), []);
  const taux = reglement.epargne.tauxMensuel || 3;
  const [tauxPropose, setTauxPropose] = useState<number | null>(null);
  const [proposition, setProposition] = useState<{ taux: number; le: string } | null>(null);
  const proposerTaux = () => {
    if (tauxPropose == null || tauxPropose === taux) { toast.error("Choisissez un taux DIFFÉRENT du taux en vigueur"); return; }
    setProposition({ taux: tauxPropose, le: `${dateCourte()} ${heure()}` });
    toast("Proposition transmise au président", { description: `Nouveau taux proposé : ${tauxPropose} %/mois — il ne devient officiel qu'après SA co-signature, puis publication aux membres.` });
  };

  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [visees, setVisees] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const t0 = setTimeout(() => setEpargnes(loadEpargnesReunion()), 0);
    return () => clearTimeout(t0);
  }, []);
  const viser = (id: string) => {
    setVisees((prev) => ({ ...prev, [id]: true }));
    const e = epargnes.find((x) => x.id === id);
    toast.success("Épargne visée par la secrétaire", { description: e ? `Inscription de ${fcfa(e.montant)} vérifiée et contresignée — le registre du bureau reste la source.` : "" });
  };

  /* — convocations — */
  const [convocations, setConvocations] = useState<Convocation[]>(initConvocations);
  const [convForm, setConvForm] = useState({ objet: "", message: "" });
  const annee = new Date().getFullYear();
  const moisIdxRef = moisIdx ?? new Date().getMonth();
  const jourReunion = secondSunday(annee, moisIdxRef);
  const envoyerConvocation = () => {
    if (!convForm.objet.trim() || !convForm.message.trim()) { toast.error("L'objet et le message sont obligatoires"); return; }
    setConvocations((prev) => [{ id: nid(), objet: convForm.objet.trim(), message: convForm.message.trim(), le: dateCourte(), destinataires: roster.length }, ...prev]);
    setConvForm({ objet: "", message: "" });
    toast.success(`Convocation envoyée aux ${roster.length} membres`, { description: "Notification immédiate dans l'application + copie WhatsApp — accusés de lecture au fil des réponses." });
  };

  /* — badges des onglets — */
  const badges: Partial<Record<TabKey, number>> = {
    pv: pvs.filter((x) => x.statut === "brouillon").length,
    presences: roster.filter((m) => etatPresence(m.id) === "attente").length,
    decisions: decForm ? 1 : 0,
    taux: proposition ? 0 : epargnes.filter((e) => !visees[e.id]).length,
    convocations: 0,
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
            ? "border-[#4A334C] bg-[#6E4B71] text-white shadow-[0_6px_18px_rgba(110,75,113,0.45)]"
            : "border-[#C7A9CA] bg-[#F7F1F8] text-[#5A3E5D] hover:border-[#6E4B71] hover:bg-[#F0E4F1]"
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
        accent="#5D3F60" accentClair="#6E4B71"
        surtitre="Table de rédaction & d'archives"
        titre="Console — Secrétaire"
        sousTitre={`${ROLE_META.secretariat.label} : Françoise Mbeutetsa (vous) · Cantine Mbeutetsa · ${TONTINE.jourLabel}`}
        icon={<PenLine className="h-6 w-6" />}
        badges={
          <>
            <P cls="border-white/25 bg-white/10 text-white"><Users className="h-3 w-3" /> {roster.length} membres</P>
            <P cls="border-white/25 bg-white/10 text-white"><FileEdit className="h-3 w-3" /> {pvs.filter((x) => x.statut === "brouillon").length} PV en brouillon</P>
            <P cls="border-white/25 bg-white/10 text-white"><Archive className="h-3 w-3" /> {pvs.filter((x) => x.statut === "archive").length} PV archivés</P>
            <P cls={nbAbsent > 0 ? "border-[#C89F62] bg-[#C89F62]/25 text-[#FFEBD2]" : "border-white/25 bg-white/10 text-white"}>
              <UserCheck className="h-3 w-3" /> Appel : {nbPresent} présents · {nbAbsent} absent(s)
            </P>
          </>
        }
      />

      {/* ── onglets ── */}
      <NavOnglets
        ariaLabel="Sections du secrétariat"
        etiquette="Secrétariat — la mémoire de la tontine"
        couleurPoint="#6E4B71"
        onglets={TABS.map((t) => ({ ...t, badge: badges[t.key] ?? 0 }))}
        actif={tab}
        goTab={goTab}
        render={renderTab}
      />

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {tab === "pv" && (
          <PvSection pvs={pvs} onMajContenu={majContenuPV} onFinaliser={finaliserPV} onArchiver={archiverPV} mois={moisLabel} />
        )}
        {tab === "presences" && (
          <PresencesSection roster={roster} parMembre={parMembre} presences={presences} onMarquer={marquer} onToutPresent={toutPresent} onTransmettre={transmettreAppel} nbPresent={nbPresent} nbExcuse={nbExcuse} nbAbsent={nbAbsent} mois={moisLabel} />
        )}
        {tab === "decisions" && (
          <DecisionsSection decisions={decisions} form={decForm} setForm={setDecForm} onInscrire={inscrireDecision} />
        )}
        {tab === "taux" && (
          <TauxRegistreSection taux={taux} proposition={proposition} tauxPropose={tauxPropose} setTauxPropose={setTauxPropose} onProposer={proposerTaux} epargnes={epargnes} parMembre={parMembre} visees={visees} onViser={viser} moisIdx={moisIdx} />
        )}
        {tab === "convocations" && (
          <ConvocationsSection convocations={convocations} form={convForm} setForm={setConvForm} onEnvoyer={envoyerConvocation} jourReunion={jourReunion} moisIdx={moisIdxRef} annee={annee} roster={roster} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ sections ══════════════════════════ */

function PvSection(p: { pvs: PV[]; onMajContenu: (id: string, contenu: string) => void; onFinaliser: (id: string) => void; onArchiver: (id: string) => void; mois: string }) {
  const STATUT: Record<StatutPV, { label: string; cls: string }> = {
    brouillon: { label: "Brouillon", cls: OR_CLS },
    finalise: { label: "Finalisé — à lire en réunion", cls: VI_CLS },
    archive: { label: "Archivé", cls: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" },
  };
  return (
    <>
      <Block
        title="Les procès-verbaux de la famille"
        icon={<BookOpen className="h-4 w-4" />}
        accent="#6E4B71"
        note="Le secrétaire écrit ce que la réunion DÉCIDE — pas ce qu'elle pense. Un PV brouillon se rédige ici, se FINALISE quand il est complet, puis s'ARCHIVE après avoir été lu et approuvé en réunion."
      >
        <div className="space-y-3 p-4">
          {p.pvs.map((pv) => (
            <div key={pv.id} className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13.5px] font-bold text-[#2B3530]">{pv.titre}</p>
                <P cls={STATUT[pv.statut].cls}>{STATUT[pv.statut].label}</P>
              </div>
              {pv.statut === "brouillon" ? (
                <>
                  <textarea
                    value={pv.contenu}
                    onChange={(e) => p.onMajContenu(pv.id, e.target.value)}
                    rows={7}
                    aria-label={`Contenu du ${pv.titre}`}
                    className="mt-2 w-full rounded-xl border border-[#C7A9CA] bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#2B3530] focus:outline-none focus:ring-2 focus:ring-[#6E4B71]/25"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Btn tone="violet" onClick={() => p.onFinaliser(pv.id)}><CheckCircle2 className="h-4 w-4" /> Finaliser le procès-verbal</Btn>
                    <p className="text-[10.5px] font-semibold text-[#8A9288]">Écriture sauvegardée au fil de la saisie (maquette).</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#E5DCC0] bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#2B3530]">{pv.contenu}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {pv.statut === "finalise" && (
                      <BtnConfirme tone="violet" onConfirmer={() => p.onArchiver(pv.id)} labelConfirmer="Confirmer l'archive ?">
                        <Archive className="h-4 w-4" /> Archiver ce procès-verbal
                      </BtnConfirme>
                    )}
                    {pv.statut === "archive" && <p className="text-[10.5px] font-semibold text-[#8A9288]">Archivé le {pv.le} — consultable par toute la famille, à jamais.</p>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}

function PresencesSection(p: {
  roster: (typeof MEMBRES_FICTIFS)[number][]; parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  presences: Record<string, PresenceEtat>; onMarquer: (id: string, etat: PresenceEtat) => void;
  onToutPresent: () => void; onTransmettre: () => void; nbPresent: number; nbExcuse: number; nbAbsent: number; mois: string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Présents" value={String(p.nbPresent)} sub={`sur ${p.roster.length} membres`} accent="#2F6B45" />
        <KpiCard icon={<Mail className="h-4 w-4" />} label="Excusés" value={String(p.nbExcuse)} sub="motif reçu à l'avance" accent="#8A6420" />
        <KpiCard icon={<Ban className="h-4 w-4" />} label="Absents" value={String(p.nbAbsent)} sub="pénalité applicable" accent="#A5473D" />
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label="Attente" value={String(p.roster.filter((m) => p.presences[m.id] === "attente").length)} sub="pas encore appelé(s)" accent="#6E4B71" />
      </div>
      <Block
        title={`Liste de présence — ${p.mois}`}
        icon={<ClipboardList className="h-4 w-4" />}
        accent="#6E4B71"
        note="Le secrétaire APPELLE chaque membre à la réunion et note l'état. La liste part au trésorier : elle fonde les pénalités d'absence — personne n'y échappe, président compris."
      >
        <div className="divide-y divide-[#E5DCC0]">
          {p.roster.map((m) => {
            const etat = p.presences[m.id] ?? "attente";
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#2B3530]">
                  {m.name}{m.id === "f06" ? " (vous)" : ""}
                  <span className="ml-1.5 text-[10.5px] font-semibold text-[#8A9288]">{m.city}</span>
                </span>
                <div className="flex gap-1">
                  {ETATS_PRESENCE.map((e) => (
                    <button
                      key={e.cle}
                      type="button"
                      onClick={() => p.onMarquer(m.id, e.cle)}
                      aria-pressed={etat === e.cle}
                      className={`rounded-lg border px-2 py-1 text-[10.5px] font-bold transition ${etat === e.cle ? e.cls + " ring-1 ring-current" : "border-[#E5DCC0] bg-white text-[#8A9288] hover:border-[#6E4B71]/40 hover:text-[#5A3E5D]"}`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row">
          <Btn tone="violet" onClick={p.onToutPresent}><UserCheck className="h-4 w-4" /> Tout le monde est présent</Btn>
          <Btn tone="neutre" onClick={p.onTransmettre}><Send className="h-4 w-4" /> Transmettre la liste au trésorier</Btn>
        </div>
      </Block>
    </>
  );
}

function DecisionsSection(p: {
  decisions: DecisionJ[]; form: { point: string; texte: string; resp: string } | null;
  setForm: (f: { point: string; texte: string; resp: string } | null) => void; onInscrire: () => void;
}) {
  return (
    <Block
      title="Journal des décisions du bureau"
      icon={<ScrollText className="h-4 w-4" />}
      accent="#6E4B71"
      note="Chaque décision du bureau est ARCHIVÉE ici, avec son responsable et son heure — c'est la mémoire qui fait foi quand un doute surgit. Le président transmet ses décisions à la secrétaire ; elle peut aussi inscrire celles qu'elle vit en direct."
    >
      {p.form && (
        <div className="space-y-2 border-b border-[#E5DCC0] bg-[#F7F1F8] p-4">
          <p className="text-[12px] font-black text-[#5A3E5D]">Nouvelle décision</p>
          <input
            value={p.form.point}
            onChange={(e) => p.setForm({ ...p.form, point: e.target.value })}
            placeholder="Point concerné (ex. : Taux des épargnes & prêts)"
            aria-label="Point concerné"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
          />
          <textarea
            value={p.form.texte}
            onChange={(e) => p.setForm({ ...p.form, texte: e.target.value })}
            rows={3}
            placeholder="La décision exacte, telle qu'approuvée par le bureau…"
            aria-label="Décision"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
          />
          <input
            value={p.form.resp}
            onChange={(e) => p.setForm({ ...p.form, resp: e.target.value })}
            placeholder="Responsable (facultatif — défaut : Secrétaire)"
            aria-label="Responsable"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
          />
          <div className="flex gap-2">
            <Btn tone="violet" onClick={p.onInscrire}><PenLine className="h-4 w-4" /> Inscrire au journal</Btn>
            <Btn tone="neutre" onClick={() => p.setForm(null)}>Annuler</Btn>
          </div>
        </div>
      )}
      <div className="divide-y divide-[#E5DCC0]">
        {p.decisions.map((d) => (
          <div key={d.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <p className="text-[13px] font-bold text-[#2B3530]">{d.point}</p>
              <P cls={VI_CLS}>{d.le}</P>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A554E]">{d.texte}</p>
            <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Responsable : {d.responsable}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
        <Btn tone="violet" onClick={() => p.setForm({ point: "", texte: "", resp: "" })} disabled={!!p.form}>
          <PenLine className="h-4 w-4" /> Inscrire une décision
        </Btn>
      </div>
    </Block>
  );
}

function TauxRegistreSection(p: {
  taux: number; proposition: { taux: number; le: string } | null; tauxPropose: number | null;
  setTauxPropose: (t: number | null) => void; onProposer: () => void;
  epargnes: AttributionReunion[]; parMembre: Map<string, (typeof MEMBRES_FICTIFS)[number]>;
  visees: Record<string, boolean>; onViser: (id: string) => void; moisIdx: number | null;
}) {
  const totalEpargnes = p.epargnes.reduce((s, e) => s + e.montant, 0);
  return (
    <>
      <Block
        title="Taux des épargnes & prêts — co-signature du bureau"
        icon={<Percent className="h-4 w-4" />}
        accent="#6E4B71"
        note="Le taux est réglé À DEUX : le président propose, la secrétaire contresigne (ou l'inverse). Tant que le président n'a pas co-signé, le taux en vigueur reste inchangé pour tous les membres."
      >
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
            <P cls={VI_CLS}><Percent className="h-3 w-3" /> Taux en vigueur : {p.taux} %/mois</P>
            <P cls={OK_CLS}><ShieldCheck className="h-3 w-3" /> Co-signé président + secrétaire</P>
          </div>
          {p.proposition ? (
            <div className="rounded-2xl border-2 border-[#C89F62] bg-[#FFF8EC] px-3.5 py-3">
              <p className="text-[13px] font-bold text-[#8A6420]">Proposition en attente du président : {p.proposition.taux} %/mois</p>
              <p className="mt-0.5 text-[11px] text-[#8A9288]">Transmise le {p.proposition.le} — le président reçoit une notification ; sans sa co-signature, rien ne change pour les membres.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5DCC0] bg-white px-3.5 py-3">
              <p className="text-[12.5px] font-bold text-[#2B3530]">Proposer un nouveau taux</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[2, 2.5, 3, 3.5, 4].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => p.setTauxPropose(t)}
                    aria-pressed={p.tauxPropose === t}
                    className={`min-h-[38px] rounded-lg border-2 px-3 text-[13px] font-black transition ${p.tauxPropose === t ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-[#F7F1F8] text-[#5A3E5D] hover:border-[#6E4B71]"}`}
                  >
                    {t} %
                  </button>
                ))}
                <Btn tone="violet" onClick={p.onProposer}><Send className="h-4 w-4" /> Proposer au président</Btn>
              </div>
            </div>
          )}
        </div>
      </Block>

      <Block
        title="Registre des épargnes — à viser par la secrétaire"
        icon={<PiggyBank className="h-4 w-4" />}
        accent="#6E4B71"
        note="CE registre est celui du bureau — la MÊME source que la page « Épargnes » du président. La secrétaire le VISE : chaque épargne est vérifiée (montant annoncé = montant inscrit) et contresignée."
      >
        {p.epargnes.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Registre vide — les épargnes inscrites par le président apparaîtront ici.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#6E4B71] text-white">
                  <th className="px-3 py-2 text-left font-black">Membre</th>
                  <th className="px-3 py-2 text-left font-black">Mois rattaché</th>
                  <th className="px-3 py-2 text-right font-black">Montant</th>
                  <th className="px-3 py-2 text-center font-black">Visa</th>
                </tr>
              </thead>
              <tbody>
                {p.epargnes.map((e) => {
                  const m = p.parMembre.get(e.membreId);
                  const mi = Math.min(11, Math.max(0, e.moisIdx));
                  return (
                    <tr key={e.id} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                      <td className="px-3 py-2 font-bold text-[#2B3530]">{m?.name ?? e.membreId}</td>
                      <td className="px-3 py-2">{MOIS_FR[mi]}</td>
                      <td className="px-3 py-2 text-right font-black text-[#1E4D2B]">{fcfa(e.montant)}</td>
                      <td className="px-3 py-2 text-center">
                        {p.visees[e.id] ? (
                          <P cls={OK_CLS}><Stamp className="h-3 w-3" /> Visé</P>
                        ) : (
                          <Btn small tone="violet" onClick={() => p.onViser(e.id)}><Stamp className="h-3.5 w-3.5" /> Viser</Btn>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#C89F62]/15">
                  <td className="px-3 py-2.5 font-black text-[#2B2416]" colSpan={2}>Total du registre</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#2B2416]">{fcfa(totalEpargnes)}</td>
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

function ConvocationsSection(p: {
  convocations: Convocation[]; form: { objet: string; message: string };
  setForm: (f: { objet: string; message: string }) => void; onEnvoyer: () => void;
  jourReunion: number; moisIdx: number; annee: number;
  roster: (typeof MEMBRES_FICTIFS)[number][];
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Prochaine réunion" value={`${p.jourReunion} ${MOIS_FR[p.moisIdx]}`} sub={`${p.annee} · ${TONTINE.jourLabel}`} accent="#6E4B71" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Destinataires" value={String(p.roster.length)} sub="tous les membres" accent="#2F6B45" />
        <KpiCard icon={<Mail className="h-4 w-4" />} label="Convocations envoyées" value={String(p.convocations.length)} sub="cette année" accent="#8A6420" />
        <KpiCard icon={<Coins className="h-4 w-4" />} label="Cotisation du mois" value={TONTINE.montantCotisation ? fcfa(TONTINE.montantCotisation) : "à fixer"} sub="réglée par le bureau" accent="#3D6B72" />
      </div>
      <Block
        title={`Convocation — réunion du ${p.jourReunion} ${MOIS_FR[p.moisIdx]} ${p.annee}`}
        icon={<Mail className="h-4 w-4" />}
        accent="#6E4B71"
        note="Le secrétaire convoque : objet clair, lieu, heure, ce que chacun doit apporter. La convocation part à TOUS les membres — présents, excusés ou en retard — nul n'est censé ignorer l'appel."
      >
        <div className="space-y-2 p-4">
          <input
            value={p.form.objet}
            onChange={(e) => p.setForm({ ...p.form, objet: e.target.value })}
            placeholder="Objet (ex. : Réunion de novembre — cotisation & remise du mois)"
            aria-label="Objet de la convocation"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
          />
          <textarea
            value={p.form.message}
            onChange={(e) => p.setForm({ ...p.form, message: e.target.value })}
            rows={4}
            placeholder="Message : lieu, heure, cotisation à amener, collation assurée par…"
            aria-label="Message de la convocation"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none"
          />
          <Btn tone="violet" onClick={p.onEnvoyer}><Send className="h-4 w-4" /> Envoyer aux {p.roster.length} membres</Btn>
        </div>
      </Block>
      <Block title="Convocations envoyées" icon={<Archive className="h-4 w-4" />} accent="#6E4B71">
        <div className="divide-y divide-[#E5DCC0]">
          {p.convocations.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-[13px] font-bold text-[#2B3530]">{c.objet}</p>
                <P cls={VI_CLS}>Envoyée le {c.le}</P>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A554E]">{c.message}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">{c.destinataires} destinataires · accusés de lecture reçus</p>
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}
