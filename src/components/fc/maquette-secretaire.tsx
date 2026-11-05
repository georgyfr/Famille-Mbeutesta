"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MAQUETTE v22 — CONSOLE DU SECRÉTAIRE (cantine Mbeutetsa)
//
// Françoise Mbeutetsa tient la MÉMOIRE et désormais AUSSI la GESTION de la
// tontine (demande du président : le président peut ne pas maîtriser l'outil).
// SEIZE onglets, chacun avec sa PROPRE URL (#secretaire/<onglet>) :
//   1.  #secretaire/pv           — Procès-verbaux
//   2.  #secretaire/seances      — Séances & ordres du jour
//   3.  #secretaire/presences    — Présences (appel auto-sauvegardé + moteur)
//   4.  #secretaire/decisions    — Journal des décisions (actions réelles)
//   5.  #secretaire/archives     — Archives (PV + décisions, types réglables)
//   6.  #secretaire/taux         — Taux & règlement (co-signature)
//   7.  #secretaire/registre     — Registre des épargnes (visa + export Excel)
//   8.  #secretaire/convocations — Convocations (destinataires, confirmations,
//                                  justifications texte + message vocal)
//   9.  #secretaire/cotisations  — Cotisations & collations (gestion)
//   10. #secretaire/epargnes     — Épargnes (gestion, même registre président)
//   11. #secretaire/prets        — Prêts & garanties (gestion)
//   12. #secretaire/solidarite   — Solidarité (gestion)
//   13. #secretaire/membres      — Membres & suivi (compteurs, amendes)
//   14. #secretaire/notifications— Notifications du bureau (membres + président)
//   15. #secretaire/statistiques — Statistiques de la tontine
//   16. #secretaire/parametres   — Paramètres du secrétariat
//
// MOTEUR AUTOMATIQUE (v22) : chaque clic d'appel est ENREGISTRÉ AUTOMATIQUEMENT
// (localStorage) et déclenche les règles configurées dans Paramètres :
// avertissement au membre dès N absences, AMENDE automatique (consécutives,
// 6 mois, année, excusés), rachat des absences du mois passé si présent ce
// mois, amende « convocation confirmée puis absent ». Les notifications
// arrivent sur la page du membre (tableau de bord) et au président.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive, Ban, BarChart3, Bell, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Coins, Copy, Download, FileEdit, HandCoins, HeartHandshake, Mail, PenLine,
  Percent, PiggyBank, Play, Plus, RefreshCw, ScrollText, Send, Settings, ShieldCheck, Stamp,
  Trash2, UserCheck, Users, Wallet, X,
} from "lucide-react";
import {
  Block, Btn, BtnConfirme, P, KpiCard, EnteteConsole, NavOnglets,
  fmt, fcfa, heure, nid, dateCourte, OK_CLS, OR_CLS, RJ_CLS, TE_CLS, VI_CLS, toast,
} from "./maquette-ui";
import { MEMBRES_FICTIFS, MOIS_FR, ROLE_META, TONTINE, secondSunday } from "./tontine-data";
import type { Member } from "./tontine-data";
import { loadMembresApplication } from "./membres-app";
import { loadReglement } from "./reglement";
import type { Reglement } from "./reglement";
import { loadEpargnesReunion, type AttributionReunion } from "./registres-bureau";
import { SecCotisationsCollations, SecEpargnes, SecPrets, SecSolidarite } from "./gestion-secretaire";
import { ConvocationsSectionV2 } from "./secretaire-convocations";
import { exportRegistreEpargnesExcel } from "./secretaire-excel";
import {
  MOTIFS_LABELS, PARAMS_DEFAUT,
  derniersMoisKeys, labelMoisKey, loadAmendes, loadConvocations, loadDecisions,
  loadNotifs, loadParamsSecretaire, loadPresences, loadPVs, loadSeances, loadVisas,
  moisKeyOf, pushNotif, reinitialiserDonneesSecretariat, reinitialiserParams,
  sanctionnerConvocationManquee, saveAmendes, saveConvocations, saveDecisions, saveNotifs,
  saveParamsSecretaire, savePresences, savePVs, saveSeances, saveVisas, statsPresence, syncMembre,
} from "./secretaire-bureau";
import type {
  Amende, ConvocationV2, DecisionJ, HistoriquePresences, NotifBureau, ParamsSecretaire,
  PresenceEtat, PV, Seance, StatutDecision, VisasEpargnes,
} from "./secretaire-bureau";

/* ══════════════════════════ routage par hash ══════════════════════════ */

type TabKey =
  | "pv" | "seances" | "presences" | "decisions" | "archives" | "taux" | "registre"
  | "convocations" | "cotisations" | "epargnes" | "prets" | "solidarite"
  | "membres" | "notifications" | "statistiques" | "parametres";

const TABS: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "pv", label: "Procès-verbaux", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { key: "seances", label: "Séances", icon: <CalendarClock className="h-3.5 w-3.5" /> },
  { key: "presences", label: "Présences", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { key: "decisions", label: "Décisions", icon: <ScrollText className="h-3.5 w-3.5" /> },
  { key: "archives", label: "Archives", icon: <Archive className="h-3.5 w-3.5" /> },
  { key: "taux", label: "Taux & règlement", icon: <Percent className="h-3.5 w-3.5" /> },
  { key: "registre", label: "Registre des épargnes", icon: <PiggyBank className="h-3.5 w-3.5" /> },
  { key: "convocations", label: "Convocations", icon: <Mail className="h-3.5 w-3.5" /> },
  { key: "cotisations", label: "Cotisations & collations", icon: <Coins className="h-3.5 w-3.5" /> },
  { key: "epargnes", label: "Épargnes", icon: <Wallet className="h-3.5 w-3.5" /> },
  { key: "prets", label: "Prêts & garanties", icon: <HandCoins className="h-3.5 w-3.5" /> },
  { key: "solidarite", label: "Solidarité", icon: <HeartHandshake className="h-3.5 w-3.5" /> },
  { key: "membres", label: "Membres & suivi", icon: <Users className="h-3.5 w-3.5" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="h-3.5 w-3.5" /> },
  { key: "statistiques", label: "Statistiques", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "parametres", label: "Paramètres", icon: <Settings className="h-3.5 w-3.5" /> },
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

/* ══════════════════════════ la console ══════════════════════════ */

export function MaquetteSecretaire() {
  const [tab, setTab] = useState<TabKey>(() => "pv");
  const [membresApp, setMembresApp] = useState<Member[]>([]);
  const [moisLabel, setMoisLabel] = useState<string | null>(null);
  const [moisIdx, setMoisIdx] = useState<number | null>(null);
  const [annee, setAnnee] = useState<number | null>(null);
  const [params, setParams] = useState<ParamsSecretaire>(PARAMS_DEFAUT);
  const [pvs, setPvs] = useState<PV[]>([]);
  const [presHisto, setPresHisto] = useState<HistoriquePresences>({});
  const [seances, setSeances] = useState<Seance[]>([]);
  const [decisions, setDecisions] = useState<DecisionJ[]>([]);
  const [convos, setConvos] = useState<ConvocationV2[]>([]);
  const [amendes, setAmendes] = useState<Amende[]>([]);
  const [notifs, setNotifs] = useState<NotifBureau[]>([]);
  const [visas, setVisas] = useState<VisasEpargnes>({});
  const [epargnes, setEpargnes] = useState<AttributionReunion[]>([]);
  const [regl, setRegl] = useState<Reglement | null>(null);
  const [derniereSauvegarde, setDerniereSauvegarde] = useState<string | null>(null);

  const moisKey = useMemo(() => (annee != null && moisIdx != null ? moisKeyOf(annee, moisIdx) : null), [annee, moisIdx]);

  /* chargements réservés au client (localStorage, Date) — zéro mismatch d'hydratation */
  useEffect(() => {
    const t0 = setTimeout(() => {
      setTab(tabFromHash());
      const membres = loadMembresApplication();
      setMembresApp(membres);
      const d = new Date();
      setMoisIdx(d.getMonth());
      setAnnee(d.getFullYear());
      setMoisLabel(`${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`);
      const p = loadParamsSecretaire();
      setParams(p);
      setPvs(loadPVs());
      const h = loadPresences();
      setPresHisto(h);
      setSeances(loadSeances());
      setDecisions(loadDecisions());
      setConvos(loadConvocations());
      setVisas(loadVisas());
      setEpargnes(loadEpargnesReunion());
      setRegl(loadReglement());
      /* LE MOTEUR tourne au chargement : les règles configurées s'appliquent
       * à l'historique existant (amendes + notifications idempotentes). */
      const rosterInitial = [...MEMBRES_FICTIFS, ...membres];
      const mk = moisKeyOf(d.getFullYear(), d.getMonth());
      for (const m of rosterInitial) syncMembre(h, m.id, m.name, mk, p.presences);
      setAmendes(loadAmendes());
      setNotifs(loadNotifs());
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

  const presencesMois = useMemo<Record<string, PresenceEtat>>(() => (moisKey ? presHisto[moisKey] ?? {} : {}), [presHisto, moisKey]);
  const etatPresence = (id: string): PresenceEtat => presencesMois[id] ?? "attente";
  const nbPresent = roster.filter((m) => etatPresence(m.id) === "present").length;
  const nbExcuse = roster.filter((m) => etatPresence(m.id) === "excuse").length;
  const nbAbsent = roster.filter((m) => etatPresence(m.id) === "absent").length;
  const nbAttente = roster.filter((m) => etatPresence(m.id) === "attente").length;

  /* — APPEL AUTO-SAUVEGARDÉ + MOTEUR : chaque clic enregistre ET applique les
   *    règles configurées (amendes, avertissements, rachat, sanctions). — */
  const marquer = (id: string, etat: PresenceEtat) => {
    if (!moisKey) return;
    const jourMois = { ...(presHisto[moisKey] ?? {}), [id]: etat };
    const h: HistoriquePresences = { ...presHisto, [moisKey]: jourMois };
    setPresHisto(h);
    savePresences(h);
    setDerniereSauvegarde(heure());
    const m = roster.find((x) => x.id === id);
    if (m) {
      const avant = loadAmendes().filter((a) => a.membreId === id).length;
      syncMembre(h, m.id, m.name, moisKey, params.presences);
      if (etat === "absent") {
        for (const c of convos) {
          if (c.moisKey === moisKey && c.destinataires[id]?.statut === "confirmee") {
            sanctionnerConvocationManquee(id, m.name, moisKey, params.convocations, c.objet);
          }
        }
      }
      const apres = loadAmendes().filter((a) => a.membreId === id).length;
      setAmendes(loadAmendes());
      setNotifs(loadNotifs());
      if (apres > avant) {
        toast.warning(`Amende automatique — ${m.name}`, { description: "Une règle configurée dans Paramètres est atteinte : l'amende est enregistrée et le membre notifié sur sa page." });
      } else if (apres < avant) {
        toast.success(`Compteurs réduits — ${m.name}`, { description: "Son statut ne justifie plus certaines amendes « dues » : elles ont été retirées automatiquement." });
      } else {
        toast(`${m.name} : ${etat === "present" ? "présent" : etat === "excuse" ? "excusé" : etat === "absent" ? "absent" : "en attente"}`, { description: "Enregistré automatiquement — compteurs et règles recalculés." });
      }
    }
  };

  const toutPresent = () => {
    if (!moisKey) return;
    const h: HistoriquePresences = { ...presHisto, [moisKey]: Object.fromEntries(roster.map((m) => [m.id, "present" as const])) };
    setPresHisto(h);
    savePresences(h);
    setDerniereSauvegarde(heure());
    for (const m of roster) syncMembre(h, m.id, m.name, moisKey, params.presences);
    setAmendes(loadAmendes());
    setNotifs(loadNotifs());
    toast.success("Appel terminé — tous présents", { description: `Enregistré automatiquement pour ${roster.length} membres. Les absences du mois passé sont annulées (rachat automatique) et le trésorier peut être notifié.` });
  };

  const transmettreAppel = () => {
    const dues = amendes.filter((a) => a.moisKey === moisKey && a.statut === "due");
    if (dues.length === 0) {
      toast.success("Liste de présence transmise au trésorier", { description: `${nbPresent} présents · ${nbExcuse} excusés · ${nbAbsent} absents — aucune amende automatique à encaisser ce mois.` });
      return;
    }
    const total = dues.reduce((s, a) => s + a.montant, 0);
    saveAmendes(amendes.map((a) => (a.moisKey === moisKey && a.statut === "due" ? { ...a, statut: "transmise" as const } : a)));
    setAmendes(loadAmendes());
    for (const a of dues) {
      const m = parMembre.get(a.membreId);
      pushNotif({
        id: `amende-transmise:${a.id}`, le: `${dateCourte()} ${heure()}`,
        destinataire: a.membreId, destinataireNom: m?.name ?? a.membreId, type: "amende",
        titre: `Amende transmise au trésorier — ${m?.name ?? ""}`,
        message: `Votre amende « ${a.libelle} » (${fcfa(a.montant)}) vient d'être transmise au trésorier pour encaissement.`,
      });
    }
    setNotifs(loadNotifs());
    toast.success("Liste transmise au trésorier", { description: `${dues.length} amende(s) automatique(s) à encaisser : ${fcfa(total)} — chaque membre concerné est notifié sur sa page.` });
  };

  /* — visas du registre (membre notifié sur sa page + président informé) — */
  const viser = (id: string) => {
    const e = epargnes.find((x) => x.id === id);
    if (!e) return;
    const le = `${dateCourte()} ${heure()}`;
    const v: VisasEpargnes = { ...visas, [id]: { le, par: "Françoise Mbeutetsa — Secrétaire" } };
    setVisas(v);
    saveVisas(v);
    const m = parMembre.get(e.membreId);
    const mi = Math.min(11, Math.max(0, e.moisIdx));
    pushNotif({
      id: `visa-membre:${id}`, le,
      destinataire: e.membreId, destinataireNom: m?.name ?? e.membreId, type: "visa",
      titre: `Épargne visée — ${m?.name ?? e.membreId}`,
      message: `Votre épargne de ${MOIS_FR[mi]} (${fcfa(e.montant)}) a été VISÉE par la secrétaire le ${le} : le montant annoncé correspond au registre du bureau. Le président en a été informé.`,
    });
    pushNotif({
      id: `visa-president:${id}`, le,
      destinataire: "president", destinataireNom: "Président", type: "visa",
      titre: `Visa de la secrétaire — ${m?.name ?? e.membreId}`,
      message: `La secrétaire a visé l'épargne de ${m?.name ?? e.membreId} (${MOIS_FR[mi]}, ${fcfa(e.montant)}) le ${le} — inscription vérifiée et contresignée.`,
    });
    setNotifs(loadNotifs());
    toast.success("Épargne visée", { description: `${m?.name ?? ""} est notifié sur sa page et le président est informé — la ligne est désormais verrouillée.` });
  };

  const deviser = (id: string) => {
    const v = { ...visas };
    delete v[id];
    setVisas(v);
    saveVisas(v);
    const e = epargnes.find((x) => x.id === id);
    const m = e ? parMembre.get(e.membreId) : undefined;
    if (e && m) {
      pushNotif({
        id: `visa-membre:${id}`, le: `${dateCourte()} ${heure()}`,
        destinataire: e.membreId, destinataireNom: m.name, type: "visa",
        titre: `Visa retiré — ${m.name}`,
        message: `Le visa de votre épargne de ${MOIS_FR[Math.min(11, Math.max(0, e.moisIdx))]} (${fcfa(e.montant)}) a été retiré par la secrétaire pour vérification — il sera reposé après contrôle.`,
      });
      setNotifs(loadNotifs());
    }
    toast("Visa retiré", { description: "La ligne redevient « à viser » — le membre est notifié." });
  };

  const exporterExcel = async () => {
    if (epargnes.length === 0) { toast.error("Registre vide — rien à exporter"); return; }
    try {
      await exportRegistreEpargnesExcel(epargnes, parMembre, visas);
      toast.success("Registre téléchargé (Excel)", { description: `${epargnes.length} inscription(s) + synthèse par membre — le fichier .xlsx est dans vos téléchargements.` });
    } catch {
      toast.error("Le téléchargement a échoué", { description: "Réessayez — votre navigateur a peut-être bloqué le téléchargement." });
    }
  };

  /* — procès-verbaux — */
  const finaliserPV = (id: string) => {
    const next = pvs.map((x) => (x.id === id ? { ...x, statut: "finalise" as const, le: dateCourte() } : x));
    setPvs(next);
    savePVs(next);
    toast.success("Procès-verbal finalisé", { description: "Prêt à être LU à la prochaine réunion, puis archivé — comme à l'oral : on lit, la famille approuve." });
  };
  const archiverPV = (id: string, typeArchive: string) => {
    const p = pvs.find((x) => x.id === id);
    const next = pvs.map((x) => (x.id === id ? { ...x, statut: "archive" as const, archiveType: typeArchive } : x));
    setPvs(next);
    savePVs(next);
    toast("Procès-verbal archivé", { description: p ? `« ${p.titre} » rejoint les archives (type : ${typeArchive}) — consultables par toute la famille.` : "" });
  };
  const majContenuPV = (id: string, contenu: string) => {
    const next = pvs.map((x) => (x.id === id ? { ...x, contenu } : x));
    setPvs(next);
    savePVs(next);
  };

  /* — séances : ordre du jour du mois courant — */
  const seanceCourante = useMemo(() => seances.find((s) => s.moisKey === moisKey) ?? null, [seances, moisKey]);
  const majSeances = (next: Seance[]) => { setSeances(next); saveSeances(next); };
  const ajouterPoint = (titre: string, detail: string, responsable: string) => {
    if (!seanceCourante) {
      if (!moisKey) return;
      majSeances([...seances, { id: nid(), moisKey, points: [{ id: nid(), titre, detail, responsable: responsable || "Bureau", statut: "en_attente" }] }]);
      return;
    }
    majSeances(seances.map((s) => (s.id === seanceCourante.id
      ? { ...s, points: [...s.points, { id: nid(), titre, detail, responsable: responsable || "Bureau", statut: "en_attente" as const }] }
      : s)));
  };
  const majPoint = (pointId: string, patch: Partial<Seance["points"][number]>) => {
    if (!seanceCourante) return;
    majSeances(seances.map((s) => (s.id === seanceCourante.id ? { ...s, points: s.points.map((pt) => (pt.id === pointId ? { ...pt, ...patch } : pt)) } : s)));
  };
  const bougerPoint = (pointId: string, dir: -1 | 1) => {
    if (!seanceCourante) return;
    const pts = [...seanceCourante.points];
    const i = pts.findIndex((pt) => pt.id === pointId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pts.length) return;
    [pts[i], pts[j]] = [pts[j], pts[i]];
    majSeances(seances.map((s) => (s.id === seanceCourante.id ? { ...s, points: pts } : s)));
  };
  const supprimerPoint = (pointId: string) => {
    if (!seanceCourante) return;
    majSeances(seances.map((s) => (s.id === seanceCourante.id ? { ...s, points: s.points.filter((pt) => pt.id !== pointId) } : s)));
  };
  const cloturerSeance = () => {
    if (!seanceCourante || seanceCourante.points.length === 0) {
      toast.error("Aucun ordre du jour à clôturer"); return;
    }
    const traites = seanceCourante.points.filter((pt) => pt.statut === "traite");
    const titre = `Procès-verbal — réunion de ${moisLabel ?? "ce mois"}`;
    const contenu =
      `Réunion tenue le 2ᵉ dimanche de ${moisLabel ?? "ce mois"}.\n\n`
      + `Ordre du jour traité :\n${(traites.length ? traites : seanceCourante.points).map((pt) => `• ${pt.titre} — ${pt.detail} (${pt.responsable})`).join("\n")}\n\n`
      + "Appel : (voir l'onglet Présences).\n\nDécisions inscrites au journal — voir l'onglet Décisions.";
    const existant = pvs.find((x) => x.statut === "brouillon" && x.titre.includes(moisLabel ?? "…"));
    if (existant) {
      const next = pvs.map((x) => (x.id === existant.id ? { ...x, contenu } : x));
      setPvs(next); savePVs(next);
    } else {
      const next: PV[] = [{ id: nid(), titre, le: "—", statut: "brouillon", contenu }, ...pvs];
      setPvs(next); savePVs(next);
    }
    toast.success("PV de séance rédigé (brouillon)", { description: "L'ordre du jour est repris dans le brouillon — complétez les décisions puis finalisez dans l'onglet Procès-verbaux." });
    goTab("pv");
  };

  /* — décisions : journal d'actions réelles — */
  const majDecisions = (next: DecisionJ[]) => { setDecisions(next); saveDecisions(next); };
  const inscrireDecision = (d: Omit<DecisionJ, "id" | "le" | "statut" | "suivi">) => {
    const nd: DecisionJ = { ...d, id: nid(), le: `${dateCourte()} ${heure()}`, statut: "inscrite", suivi: [{ le: `${dateCourte()} ${heure()}`, action: "Décision inscrite au journal" }] };
    majDecisions([nd, ...decisions]);
    pushNotif({
      id: `decision:${nd.id}`, le: nd.le, destinataire: "president", destinataireNom: "Président", type: "decision",
      titre: `Nouvelle décision inscrite — ${d.point}`,
      message: `La secrétaire a inscrit « ${d.point} » (${d.type}) au journal des décisions — responsable : ${d.responsable}.`,
    });
    setNotifs(loadNotifs());
    toast.success("Décision inscrite au journal", { description: "Le président est notifié — la décision peut être démarrée, relancée, marquée réalisée puis archivée." });
  };
  const actionDecision = (id: string, action: "demarrer" | "realisee" | "archiver" | "relancer") => {
    const libelles: Record<typeof action, string> = {
      demarrer: "Démarrée — exécution en cours",
      realisee: "Marquée réalisée",
      archiver: "Archivée au secrétariat",
      relancer: "Relance envoyée au responsable",
    };
    majDecisions(decisions.map((d) => (d.id === id
      ? { ...d, statut: (action === "demarrer" ? "en_cours" : action === "realisee" ? "realisee" : action === "archiver" ? "archivee" : d.statut) as StatutDecision, suivi: [...d.suivi, { le: `${dateCourte()} ${heure()}`, action: libelles[action] }] }
      : d)));
    if (action === "relancer") {
      const d = decisions.find((x) => x.id === id);
      pushNotif({
        id: `decision-relance:${id}`, le: `${dateCourte()} ${heure()}`, destinataire: "president", destinataireNom: "Président", type: "decision",
        titre: `Relance d'une décision — ${d?.point ?? ""}`,
        message: `La secrétaire relance la décision « ${d?.point ?? ""} » — responsable : ${d?.responsable ?? "—"}. Statut : en cours.`,
      });
      setNotifs(loadNotifs());
    }
    toast.success(libelles[action]);
  };
  const supprimerDecision = (id: string) => {
    majDecisions(decisions.filter((d) => d.id !== id));
    toast("Décision supprimée du journal");
  };

  /* — convocations — */
  const majConvos = (next: ConvocationV2[]) => { setConvos(next); saveConvocations(next); };
  const upsertConvo = (c: ConvocationV2) => majConvos([c, ...convos.filter((x) => x.id !== c.id)]);
  const supprimerConvo = (id: string) => majConvos(convos.filter((x) => x.id !== id));

  /* — paramètres — */
  const majParams = (p: ParamsSecretaire) => {
    setParams(p);
    saveParamsSecretaire(p);
    /* Chaque changement de règle RESCANNE tous les membres : les amendes « due »
     * et les avertissements suivent la configuration à la seconde. */
    if (moisKey) {
      for (const m of roster) syncMembre(presHisto, m.id, m.name, moisKey, p.presences);
      setAmendes(loadAmendes());
      setNotifs(loadNotifs());
      toast.success("Règles appliquées", { description: "Le moteur a recalculé les compteurs de tous les membres avec la nouvelle configuration." });
    }
  };

  /* — notifications — */
  const rafraichirNotifs = () => setNotifs(loadNotifs());
  const toutLu = () => { saveNotifs(notifs.map((n) => ({ ...n, lu: true }))); rafraichirNotifs(); toast.success("Toutes les notifications marquées lues"); };
  const basculerLu = (id: string) => { saveNotifs(notifs.map((n) => (n.id === id ? { ...n, lu: !n.lu } : n))); rafraichirNotifs(); };
  const supprimerNotif = (id: string) => { saveNotifs(notifs.filter((n) => n.id !== id)); rafraichirNotifs(); };

  /* — amendes (gestion manuelle complémentaire) — */
  const marquerAmende = (id: string, statut: Amende["statut"]) => {
    saveAmendes(amendes.map((a) => (a.id === id ? { ...a, statut } : a)));
    setAmendes(loadAmendes());
    toast.success(statut === "payee" ? "Amende marquée payée" : "Amende marquée transmise au trésorier");
  };
  const supprimerAmende = (id: string) => {
    saveAmendes(amendes.filter((a) => a.id !== id));
    setAmendes(loadAmendes());
    toast("Amende retirée du registre");
  };

  /* — badges des onglets — */
  const badges: Partial<Record<TabKey, number>> = {
    pv: pvs.filter((x) => x.statut === "brouillon").length,
    seances: seanceCourante?.points.filter((pt) => pt.statut === "en_attente").length ?? 0,
    presences: nbAttente,
    decisions: decisions.filter((d) => d.statut === "inscrite").length,
    registre: epargnes.filter((e) => !visas[e.id]).length,
    convocations: convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut === "envoyee").length, 0),
    membres: amendes.filter((a) => a.statut === "due").length,
    notifications: notifs.filter((n) => !n.lu).length,
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

  const jourReunion = annee != null && moisIdx != null ? secondSunday(annee, moisIdx) : 0;
  const taux = regl ? regl.epargne.tauxMensuel || 3 : 3;
  const [tauxPropose, setTauxPropose] = useState<number | null>(null);
  const [proposition, setProposition] = useState<{ taux: number; le: string } | null>(null);
  const proposerTaux = () => {
    if (tauxPropose == null || tauxPropose === taux) { toast.error("Choisissez un taux DIFFÉRENT du taux en vigueur"); return; }
    setProposition({ taux: tauxPropose, le: `${dateCourte()} ${heure()}` });
    toast("Proposition transmise au président", { description: `Nouveau taux proposé : ${tauxPropose} %/mois — il ne devient officiel qu'après SA co-signature, puis publication aux membres.` });
  };

  const amendesMois = useMemo(() => amendes.filter((a) => a.moisKey === moisKey), [amendes, moisKey]);
  const notifsMois = useMemo(() => notifs.filter((n) => n.le.includes(dateCourte()) && n.destinataire !== "president"), [notifs]);

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-10 pt-3 sm:px-4">
      {/* ── en-tête ── */}
      <EnteteConsole
        accent="#5D3F60" accentClair="#6E4B71"
        surtitre="Mémoire & gestion de la tontine"
        titre="Console — Secrétaire"
        sousTitre={`${ROLE_META.secretariat.label} : Françoise Mbeutetsa (vous) · Cantine Mbeutetsa · ${TONTINE.jourLabel}`}
        icon={<PenLine className="h-6 w-6" />}
        badges={
          <>
            <P cls="border-white/25 bg-white/10 text-white"><Users className="h-3 w-3" /> {roster.length} membres</P>
            <P cls="border-white/25 bg-white/10 text-white"><UserCheck className="h-3 w-3" /> Appel : {nbPresent} présents · {nbAbsent} absent(s)</P>
            <P cls={amendesMois.length > 0 ? "border-[#C89F62] bg-[#C89F62]/25 text-[#FFEBD2]" : "border-white/25 bg-white/10 text-white"}>
              <Ban className="h-3 w-3" /> {amendesMois.filter((a) => a.statut === "due").length} amende(s) due(s)
            </P>
            <P cls="border-white/25 bg-white/10 text-white"><Bell className="h-3 w-3" /> {notifs.filter((n) => !n.lu).length} notif. non lues</P>
          </>
        }
      />

      {/* ── onglets ── */}
      <NavOnglets
        ariaLabel="Sections du secrétariat"
        etiquette={`Secrétariat — ${TABS.length} onglets, chacun avec son URL`}
        couleurPoint="#6E4B71"
        onglets={TABS.map((t) => ({ ...t, badge: badges[t.key] ?? 0 }))}
        actif={tab}
        goTab={goTab}
        render={renderTab}
      />

      {/* ── contenu ── */}
      <div className="mt-3 space-y-3.5">
        {tab === "pv" && (
          <PvSection pvs={pvs} onMajContenu={majContenuPV} onFinaliser={finaliserPV} onArchiver={archiverPV} typesArchives={params.decisions.typesArchives} />
        )}
        {tab === "seances" && (
          <SeancesSection seance={seanceCourante} moisLabel={moisLabel} jourReunion={jourReunion} onAjouter={ajouterPoint} onMajPoint={majPoint} onBouger={bougerPoint} onSupprimer={supprimerPoint} onCloturer={cloturerSeance} />
        )}
        {tab === "presences" && (
          <PresencesSection
            roster={roster} presences={presencesMois} onMarquer={marquer} onToutPresent={toutPresent} onTransmettre={transmettreAppel}
            nbPresent={nbPresent} nbExcuse={nbExcuse} nbAbsent={nbAbsent} nbAttente={nbAttente} mois={moisLabel ?? "…"}
            amendesMois={amendesMois} notifsMois={notifsMois} dernierEnregistrement={derniereSauvegarde}
            parMembre={parMembre} onMarquerAmende={marquerAmende} onSupprimerAmende={supprimerAmende}
            historique={presHisto} moisKey={moisKey} rachatAuto={params.presences.rachatAuto}
          />
        )}
        {tab === "decisions" && (
          <DecisionsSection decisions={decisions} types={params.decisions.types} onInscrire={inscrireDecision} onAction={actionDecision} onSupprimer={supprimerDecision} />
        )}
        {tab === "archives" && (
          <ArchivesSection pvs={pvs} decisions={decisions} typesArchives={params.decisions.typesArchives} />
        )}
        {tab === "taux" && (
          <TauxSection taux={taux} proposition={proposition} tauxPropose={tauxPropose} setTauxPropose={setTauxPropose} onProposer={proposerTaux} />
        )}
        {tab === "registre" && (
          <RegistreSection epargnes={epargnes} parMembre={parMembre} visas={visas} onViser={viser} onDeviser={deviser} onExport={() => void exporterExcel()} />
        )}
        {tab === "convocations" && (
          <ConvocationsSectionV2
            convos={convos} onUpsert={upsertConvo} onSupprimer={supprimerConvo} params={params.convocations}
            jourReunion={jourReunion} moisIdx={moisIdx ?? 0} annee={annee ?? new Date().getFullYear()} moisKey={moisKey ?? "—"}
            roster={roster} parMembre={parMembre} moisLabel={moisLabel ?? "…"}
          />
        )}
        {tab === "cotisations" && moisIdx != null && (
          <SecCotisationsCollations moisLabel={moisLabel} moisIdx={moisIdx} roster={roster} parMembre={parMembre} />
        )}
        {tab === "epargnes" && regl && (
          <SecEpargnes regl={regl} moisCourantIdx={moisIdx} roster={roster} parMembre={parMembre} />
        )}
        {tab === "prets" && regl && (
          <SecPrets regl={regl} moisCourantIdx={moisIdx} roster={roster} parMembre={parMembre} />
        )}
        {tab === "solidarite" && regl && (
          <SecSolidarite regl={regl} moisCourantIdx={moisIdx} roster={roster} parMembre={parMembre} />
        )}
        {tab === "membres" && (
          <MembresSection roster={roster} historique={presHisto} moisKey={moisKey} rachatAuto={params.presences.rachatAuto} amendes={amendes} notifs={notifs} parMembre={parMembre} onSupprimerAmende={supprimerAmende} />
        )}
        {tab === "notifications" && (
          <NotificationsSection notifs={notifs} parMembre={parMembre} onToutLu={toutLu} onBasculerLu={basculerLu} onSupprimer={supprimerNotif} />
        )}
        {tab === "statistiques" && (
          <StatistiquesSection roster={roster} historique={presHisto} moisKey={moisKey} rachatAuto={params.presences.rachatAuto} amendes={amendes} decisions={decisions} convos={convos} types={params.decisions.types} />
        )}
        {tab === "parametres" && (
          <ParametresSection params={params} onMaj={majParams} moisLabel={moisLabel ?? "…"} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ champs réglages (locaux) ══════════════════════════ */

function NumField(p: { label: string; note?: string; value: number; onChange: (v: number) => void; min?: number; unite?: string }) {
  return (
    <label className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C7A9CA] bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[12.5px] font-bold text-[#2B3530]">{p.label}</span>
        {p.note && <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{p.note}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="number" min={p.min ?? 0} value={p.value}
          onChange={(e) => p.onChange(Math.max(p.min ?? 0, Number(e.target.value) || 0))}
          aria-label={p.label}
          className="w-20 rounded-lg border border-[#C7A9CA] bg-[#FBF7EA] px-2 py-1.5 text-right text-[13px] font-black text-[#2B3530] focus:outline-none focus:ring-2 focus:ring-[#6E4B71]/30"
        />
        {p.unite && <span className="text-[11px] font-bold text-[#8A9288]">{p.unite}</span>}
      </span>
    </label>
  );
}

function ToggleRow(p: { label: string; note?: string; actif: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={p.onToggle} role="switch" aria-checked={p.actif}
      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C7A9CA] bg-white px-3 py-2 text-left">
      <span className="min-w-0">
        <span className="block text-[12.5px] font-bold text-[#2B3530]">{p.label}</span>
        {p.note && <span className="mt-0.5 block text-[10.5px] leading-snug text-[#8A9288]">{p.note}</span>}
      </span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${p.actif ? "bg-[#6E4B71]" : "bg-[#C7A9CA]"}`} aria-hidden="true">
        <span className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition ${p.actif ? "translate-x-6" : "translate-x-1"}`} style={{ height: 18, width: 18 }} />
      </span>
    </button>
  );
}

/* ══════════════════════════ sections ══════════════════════════ */

function PvSection(p: { pvs: PV[]; onMajContenu: (id: string, contenu: string) => void; onFinaliser: (id: string) => void; onArchiver: (id: string, type: string) => void; typesArchives: string[] }) {
  const [types, setTypes] = useState<Record<string, string>>({});
  const STATUT: Record<PV["statut"], { label: string; cls: string }> = {
    brouillon: { label: "Brouillon", cls: OR_CLS },
    finalise: { label: "Finalisé — à lire en réunion", cls: VI_CLS },
    archive: { label: "Archivé", cls: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" },
  };
  return (
    <Block
      title="Les procès-verbaux de la famille"
      icon={<BookOpen className="h-4 w-4" />}
      accent="#6E4B71"
      note="Le secrétaire écrit ce que la réunion DÉCIDE — pas ce qu'elle pense. Un PV brouillon se rédige ici, se FINALISE quand il est complet, puis s'ARCHIVE après avoir été lu et approuvé en réunion. Le type d'archive est réglable (Paramètres → types d'archives)."
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
                  <p className="text-[10.5px] font-semibold text-[#8A9288]">Écriture sauvegardée automatiquement au fil de la saisie.</p>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#E5DCC0] bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-[#2B3530]">{pv.contenu}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pv.statut === "finalise" && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {p.typesArchives.map((t) => (
                          <button key={t} type="button" onClick={() => setTypes((prev) => ({ ...prev, [pv.id]: t }))}
                            aria-pressed={(types[pv.id] ?? p.typesArchives[0]) === t}
                            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition ${(types[pv.id] ?? p.typesArchives[0]) === t ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <BtnConfirme tone="violet" onConfirmer={() => p.onArchiver(pv.id, types[pv.id] ?? p.typesArchives[0] ?? "Procès-verbal")} labelConfirmer="Confirmer l'archive ?">
                        <Archive className="h-4 w-4" /> Archiver ce procès-verbal
                      </BtnConfirme>
                    </>
                  )}
                  {pv.statut === "archive" && <p className="text-[10.5px] font-semibold text-[#8A9288]">Archivé le {pv.le} — type : {pv.archiveType ?? "Procès-verbal"} — consultable par toute la famille, à jamais.</p>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Block>
  );
}

function SeancesSection(p: {
  seance: Seance | null; moisLabel: string | null; jourReunion: number;
  onAjouter: (titre: string, detail: string, responsable: string) => void;
  onMajPoint: (id: string, patch: Partial<{ statut: "en_attente" | "traite" }>) => void;
  onBouger: (id: string, dir: -1 | 1) => void;
  onSupprimer: (id: string) => void;
  onCloturer: () => void;
}) {
  const [form, setForm] = useState<{ titre: string; detail: string; resp: string } | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Prochaine séance" value={p.jourReunion ? `${p.jourReunion} ${p.moisLabel?.split(" ")[0] ?? ""}` : "—"} sub={`2ᵉ dimanche · ${p.moisLabel ?? "…"}`} accent="#6E4B71" />
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label="Points à l'ordre du jour" value={String(p.seance?.points.length ?? 0)} sub="séance du mois courant" accent="#2F6B45" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Points traités" value={String(p.seance?.points.filter((pt) => pt.statut === "traite").length ?? 0)} sub="à reprendre au PV" accent="#8A6420" />
        <KpiCard icon={<FileEdit className="h-4 w-4" />} label="PV de séance" value="Brouillon auto" sub="clôture → onglet Procès-verbaux" accent="#3D6B72" />
      </div>
      <Block
        title={`Ordre du jour — séance de ${p.moisLabel ?? "…"}`}
        icon={<CalendarClock className="h-4 w-4" />}
        accent="#6E4B71"
        note="La secrétaire PRÉPARE la séance : elle fixe l'ordre du jour, coche les points traités au fil de l'eau, puis CLÔTURE la séance — le PV brouillon est rédigé automatiquement avec les points traités."
      >
        <div className="divide-y divide-[#E5DCC0]">
          {(p.seance?.points ?? []).map((pt, i) => (
            <div key={pt.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6E4B71] text-[11px] font-black text-white">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-bold ${pt.statut === "traite" ? "text-[#8A9288] line-through" : "text-[#2B3530]"}`}>{pt.titre}</span>
                <span className="block text-[11px] leading-snug text-[#8A9288]">{pt.detail} · {pt.responsable}</span>
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => p.onBouger(pt.id, -1)} aria-label={`Monter « ${pt.titre} »`} className="rounded-lg border border-[#E5DCC0] bg-white p-1.5 text-[#5A3E5D] hover:border-[#6E4B71]"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => p.onBouger(pt.id, 1)} aria-label={`Descendre « ${pt.titre} »`} className="rounded-lg border border-[#E5DCC0] bg-white p-1.5 text-[#5A3E5D] hover:border-[#6E4B71]"><ChevronDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => p.onMajPoint(pt.id, { statut: pt.statut === "traite" ? "en_attente" : "traite" })} aria-pressed={pt.statut === "traite"}
                  className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-bold transition ${pt.statut === "traite" ? OK_CLS + " ring-1 ring-current" : "border-[#E5DCC0] bg-white text-[#8A9288] hover:border-[#6E4B71]/40"}`}>
                  {pt.statut === "traite" ? "Traité" : "À traiter"}
                </button>
                <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimer(pt.id)} labelConfirmer="Retirer ?">
                  <Trash2 className="h-3.5 w-3.5" />
                </BtnConfirme>
              </div>
            </div>
          ))}
          {p.seance && p.seance.points.length === 0 && (
            <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Ordre du jour vide — ajoutez le premier point.</p>
          )}
        </div>
        {form ? (
          <div className="space-y-2 border-t border-[#E5DCC0] bg-[#F7F1F8] p-4">
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre du point (ex. : Remise au bénéficiaire du mois)" aria-label="Titre du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Détail (facultatif)" aria-label="Détail du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <input value={form.resp} onChange={(e) => setForm({ ...form, resp: e.target.value })} placeholder="Responsable (défaut : Bureau)" aria-label="Responsable du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <div className="flex gap-2">
              <Btn tone="violet" onClick={() => { if (!form.titre.trim()) { toast.error("Le titre du point est obligatoire"); return; } p.onAjouter(form.titre.trim(), form.detail.trim(), form.resp.trim()); setForm(null); toast.success("Point ajouté à l'ordre du jour"); }}><Plus className="h-4 w-4" /> Ajouter le point</Btn>
              <Btn tone="neutre" onClick={() => setForm(null)}>Annuler</Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row">
            <Btn tone="violet" onClick={() => setForm({ titre: "", detail: "", resp: "" })}><Plus className="h-4 w-4" /> Ajouter un point</Btn>
            <Btn tone="or" onClick={p.onCloturer}><FileEdit className="h-4 w-4" /> Clôturer la séance → rédiger le PV</Btn>
          </div>
        )}
      </Block>
    </>
  );
}

function PresencesSection(p: {
  roster: Member[]; presences: Record<string, PresenceEtat>;
  onMarquer: (id: string, etat: PresenceEtat) => void;
  onToutPresent: () => void; onTransmettre: () => void;
  nbPresent: number; nbExcuse: number; nbAbsent: number; nbAttente: number;
  mois: string; amendesMois: Amende[]; notifsMois: NotifBureau[];
  dernierEnregistrement: string | null;
  parMembre: Map<string, Member>;
  onMarquerAmende: (id: string, statut: "transmise" | "payee") => void;
  onSupprimerAmende: (id: string) => void;
  historique: HistoriquePresences; moisKey: string | null; rachatAuto: boolean;
}) {
  const ETATS: { cle: PresenceEtat; label: string; cls: string }[] = [
    { cle: "present", label: "Présent", cls: OK_CLS },
    { cle: "excuse", label: "Excusé", cls: OR_CLS },
    { cle: "absent", label: "Absent", cls: RJ_CLS },
    { cle: "attente", label: "Attente", cls: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" },
  ];
  const totalDues = p.amendesMois.filter((a) => a.statut === "due").reduce((s, a) => s + a.montant, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<UserCheck className="h-4 w-4" />} label="Présents" value={String(p.nbPresent)} sub={`sur ${p.roster.length} membres`} accent="#2F6B45" />
        <KpiCard icon={<Mail className="h-4 w-4" />} label="Excusés" value={String(p.nbExcuse)} sub="motif reçu à l'avance" accent="#8A6420" />
        <KpiCard icon={<Ban className="h-4 w-4" />} label="Absents" value={String(p.nbAbsent)} sub="moteur d'amendes actif" accent="#A5473D" />
        <KpiCard icon={<ClipboardList className="h-4 w-4" />} label="Attente" value={String(p.nbAttente)} sub="pas encore appelé(s)" accent="#6E4B71" />
      </div>
      <Block
        title={`Liste de présence — ${p.mois}`}
        icon={<ClipboardList className="h-4 w-4" />}
        accent="#6E4B71"
        note="Chaque clic est ENREGISTRÉ AUTOMATIQUEMENT (aucun bouton « sauver ») et déclenche les règles du bureau : avertissement dès N absences, amendes automatiques, rachat des absences du mois passé si présent ce mois. Le membre est notifié sur SA page, le président est informé."
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DCC0] bg-[#F7F1F8] px-4 py-2">
          <P cls={VI_CLS}><CheckCircle2 className="h-3 w-3" /> Sauvegarde automatique active</P>
          <p className="text-[10.5px] font-bold text-[#8A9288]">{p.dernierEnregistrement ? `Dernier enregistrement : ${p.dernierEnregistrement}` : "En attente d'un premier appel…"}</p>
        </div>
        <div className="divide-y divide-[#E5DCC0]">
          {p.roster.map((m) => {
            const etat = p.presences[m.id] ?? "attente";
            const stats = p.moisKey ? statsPresence(p.historique, m.id, p.moisKey, p.rachatAuto) : null;
            return (
              <div key={m.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#2B3530]">
                    {m.name}{m.id === "f06" ? " (vous)" : ""}
                    <span className="ml-1.5 text-[10.5px] font-semibold text-[#8A9288]">{m.city}</span>
                  </span>
                  <div className="flex gap-1">
                    {ETATS.map((e) => (
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
                {stats && (stats.absCons > 0 || stats.abs6 > 0 || stats.rachatApplique) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {stats.absCons > 0 && <P cls={RJ_CLS}>conséc. : {stats.absCons}</P>}
                    {stats.abs6 > 0 && <P cls={OR_CLS}>6 mois : {stats.abs6}</P>}
                    {stats.absAnnee > 0 && <P cls={TE_CLS}>année : {stats.absAnnee}</P>}
                    {stats.rachatApplique && <P cls={OK_CLS}>rachat : {stats.rachatNb} absence(s) annulée(s)</P>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row">
          <Btn tone="violet" onClick={p.onToutPresent}><UserCheck className="h-4 w-4" /> Tout le monde est présent</Btn>
          <Btn tone="neutre" onClick={p.onTransmettre}><Send className="h-4 w-4" /> Transmettre la liste au trésorier</Btn>
        </div>
      </Block>

      <Block
        title={`Amendes automatiques — ${p.mois}`}
        icon={<Ban className="h-4 w-4" />}
        accent="#6E4B71"
        note="Générées TOUTES SEULES par les règles configurées dans Paramètres (absences consécutives, 6 mois, année, excusés consécutifs, convocation confirmée puis absent). « Transmettre » passe les amendes dues au trésorier et notifie chaque membre."
      >
        {p.amendesMois.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune amende ce mois — les compteurs de tous les membres respectent les règles du bureau.</p>
        ) : (
          <div className="divide-y divide-[#E5DCC0]">
            {p.amendesMois.map((a) => {
              const m = p.parMembre.get(a.membreId);
              const cls = a.statut === "due" ? RJ_CLS : a.statut === "transmise" ? TE_CLS : OK_CLS;
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#2B3530]">{m?.name ?? a.membreId} — {fcfa(a.montant)}</span>
                    <span className="block text-[10.5px] text-[#8A9288]">{MOTIFS_LABELS[a.motif]} · {a.libelle}</span>
                  </span>
                  <P cls={cls}>{a.statut === "due" ? "Due" : a.statut === "transmise" ? "Transmise" : "Payée"}</P>
                  <div className="flex shrink-0 gap-1">
                    {a.statut === "due" && <Btn small tone="teal" onClick={() => p.onMarquerAmende(a.id, "transmise")}><Send className="h-3.5 w-3.5" /> Transmettre</Btn>}
                    {a.statut !== "payee" && <Btn small tone="vert" onClick={() => p.onMarquerAmende(a.id, "payee")}><CheckCircle2 className="h-3.5 w-3.5" /> Payée</Btn>}
                    <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimerAmende(a.id)} labelConfirmer="Retirer ?">
                      <Trash2 className="h-3.5 w-3.5" />
                    </BtnConfirme>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FBF7EA] px-4 py-2.5">
              <p className="text-[12.5px] font-black text-[#2B2416]">Total des amendes « dues »</p>
              <p className="text-[13px] font-black text-[#A5473D]">{fcfa(totalDues)}</p>
            </div>
          </div>
        )}
      </Block>

      {p.notifsMois.length > 0 && (
        <Block title="Notifications envoyées aujourd'hui" icon={<Bell className="h-4 w-4" />} accent="#6E4B71"
          note="Toutes les notifications du jour — les membres les voient sur LEUR page (tableau de bord), le président les voit dans sa console et dans l'onglet Notifications.">
          <div className="divide-y divide-[#E5DCC0]">
            {p.notifsMois.slice(0, 8).map((n) => (
              <div key={n.id} className="px-4 py-2">
                <p className="text-[12px] font-bold text-[#2B3530]">{n.titre}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#8A9288]">{n.message}</p>
              </div>
            ))}
          </div>
        </Block>
      )}
    </>
  );
}

function DecisionsSection(p: {
  decisions: DecisionJ[]; types: string[];
  onInscrire: (d: { type: string; point: string; texte: string; responsable: string; echeance: string | null }) => void;
  onAction: (id: string, action: "demarrer" | "realisee" | "archiver" | "relancer") => void;
  onSupprimer: (id: string) => void;
}) {
  const [form, setForm] = useState<{ type: string; point: string; texte: string; resp: string; echeance: string } | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const STATUT: Record<StatutDecision, { label: string; cls: string }> = {
    inscrite: { label: "Inscrite", cls: VI_CLS },
    en_cours: { label: "En cours", cls: OR_CLS },
    realisee: { label: "Réalisée", cls: OK_CLS },
    archivee: { label: "Archivée", cls: "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]" },
  };
  return (
    <Block
      title="Journal des décisions du bureau"
      icon={<ScrollText className="h-4 w-4" />}
      accent="#6E4B71"
      note="Chaque décision porte son TYPE (réglable dans Paramètres), son responsable et son échéance. ACTIONS réelles : Démarrer (exécution en cours), Relancer le responsable (notification), Marquer réalisée, Archiver — chaque action est TRACÉE dans le suivi de la décision."
    >
      {form && (
        <div className="space-y-2 border-b border-[#E5DCC0] bg-[#F7F1F8] p-4">
          <p className="text-[12px] font-black text-[#5A3E5D]">Nouvelle décision</p>
          <div className="flex flex-wrap gap-1.5">
            {p.types.map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} aria-pressed={form.type === t}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${form.type === t ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
                {t}
              </button>
            ))}
          </div>
          <input value={form.point} onChange={(e) => setForm({ ...form, point: e.target.value })} placeholder="Point concerné (ex. : Taux des épargnes & prêts)" aria-label="Point concerné" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
          <textarea value={form.texte} onChange={(e) => setForm({ ...form, texte: e.target.value })} rows={3} placeholder="La décision exacte, telle qu'approuvée par le bureau…" aria-label="Décision" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
          <div className="flex flex-wrap gap-2">
            <input value={form.resp} onChange={(e) => setForm({ ...form, resp: e.target.value })} placeholder="Responsable (défaut : Secrétaire)" aria-label="Responsable" className="min-w-0 flex-1 rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <label className="flex items-center gap-1.5 rounded-lg border border-[#C7A9CA] bg-white px-3 py-2">
              <span className="text-[11px] font-bold text-[#8A9288]">Échéance</span>
              <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} aria-label="Échéance de la décision" className="bg-transparent text-[12.5px] focus:outline-none" />
            </label>
          </div>
          <div className="flex gap-2">
            <Btn tone="violet" onClick={() => {
              if (!form.point.trim() || !form.texte.trim()) { toast.error("Le point et la décision sont obligatoires"); return; }
              p.onInscrire({ type: form.type, point: form.point.trim(), texte: form.texte.trim(), responsable: form.resp.trim() || "Secrétaire", echeance: form.echeance || null });
              setForm(null);
            }}><PenLine className="h-4 w-4" /> Inscrire au journal</Btn>
            <Btn tone="neutre" onClick={() => setForm(null)}>Annuler</Btn>
          </div>
        </div>
      )}
      <div className="divide-y divide-[#E5DCC0]">
        {p.decisions.map((d) => {
          const estOuvert = ouvert === d.id;
          return (
            <div key={d.id} className="px-4 py-3">
              <button type="button" onClick={() => setOuvert(estOuvert ? null : d.id)} aria-expanded={estOuvert} className="flex w-full flex-wrap items-center justify-between gap-1.5 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-[#2B3530]">{d.point}</span>
                  <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">{d.type} · {d.le}{d.echeance ? ` · échéance ${d.echeance}` : ""}</span>
                </span>
                <P cls={STATUT[d.statut].cls}>{STATUT[d.statut].label}</P>
              </button>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A554E]">{d.texte}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Responsable : {d.responsable}</p>
              {estOuvert && (
                <div className="mt-2 space-y-2">
                  <div className="rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] p-2.5">
                    <p className="text-[11px] font-black uppercase tracking-wide text-[#5A3E5D]">Suivi des actions ({d.suivi.length})</p>
                    <ul className="mt-1.5 space-y-1">
                      {d.suivi.map((s, i) => (
                        <li key={i} className="flex gap-2 text-[11.5px] text-[#4A554E]"><P cls={VI_CLS}>{s.le}</P><span>{s.action}</span></li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {d.statut === "inscrite" && <Btn small tone="violet" onClick={() => p.onAction(d.id, "demarrer")}><Play className="h-3.5 w-3.5" /> Démarrer</Btn>}
                    {d.statut !== "realisee" && d.statut !== "archivee" && <Btn small tone="vert" onClick={() => p.onAction(d.id, "realisee")}><CheckCircle2 className="h-3.5 w-3.5" /> Marquer réalisée</Btn>}
                    {d.statut !== "archivee" && <Btn small tone="or" onClick={() => p.onAction(d.id, "relancer")}><Send className="h-3.5 w-3.5" /> Relancer le responsable</Btn>}
                    {d.statut !== "archivee" && (
                      <BtnConfirme tone="neutre" onConfirmer={() => p.onAction(d.id, "archiver")} labelConfirmer="Archiver ?">
                        <Archive className="h-3.5 w-3.5" /> Archiver
                      </BtnConfirme>
                    )}
                    <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimer(d.id)} labelConfirmer="Supprimer ?">
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </BtnConfirme>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
        <Btn tone="violet" onClick={() => setForm({ type: p.types[0] ?? "Autre", point: "", texte: "", resp: "", echeance: "" })} disabled={!!form}>
          <PenLine className="h-4 w-4" /> Inscrire une décision
        </Btn>
      </div>
    </Block>
  );
}

function ArchivesSection(p: { pvs: PV[]; decisions: DecisionJ[]; typesArchives: string[] }) {
  const [filtre, setFiltre] = useState<string>("tous");
  const items: { id: string; titre: string; type: string; le: string; extrait: string }[] = [
    ...p.pvs.filter((x) => x.statut === "archive").map((x) => ({ id: x.id, titre: x.titre, type: x.archiveType ?? "Procès-verbal", le: x.le, extrait: x.contenu.slice(0, 140) + "…" })),
    ...p.decisions.filter((d) => d.statut === "archivee").map((d) => ({ id: d.id, titre: d.point, type: d.type, le: d.le, extrait: d.texte.slice(0, 140) + "…" })),
  ];
  const visibles = filtre === "tous" ? items : items.filter((x) => x.type === filtre);
  return (
    <Block
      title="Archives de la famille"
      icon={<Archive className="h-4 w-4" />}
      accent="#6E4B71"
      note="Tout ce qui est archivé au secrétariat : procès-verbaux lus et approuvés, décisions closes. Le filtre suit les TYPES d'archives configurés dans Paramètres — ajoutez vos propres types (Rapport, Courrier, Pièce comptable…)."
    >
      <div className="flex flex-wrap gap-1.5 border-b border-[#E5DCC0] bg-[#F7F1F8] px-4 py-3">
        <button type="button" onClick={() => setFiltre("tous")} aria-pressed={filtre === "tous"}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${filtre === "tous" ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
          Tout ({items.length})
        </button>
        {p.typesArchives.map((t) => {
          const n = items.filter((x) => x.type === t).length;
          return (
            <button key={t} type="button" onClick={() => setFiltre(t)} aria-pressed={filtre === t}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${filtre === t ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
              {t} ({n})
            </button>
          );
        })}
      </div>
      {visibles.length === 0 ? (
        <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune archive pour ce filtre.</p>
      ) : (
        <div className="divide-y divide-[#E5DCC0]">
          {visibles.map((x) => (
            <div key={x.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-[13px] font-bold text-[#2B3530]">{x.titre}</p>
                <P cls={VI_CLS}>{x.type}</P>
              </div>
              <p className="mt-1 text-[11.5px] leading-snug text-[#8A9288]">{x.extrait}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Archivé le {x.le}</p>
            </div>
          ))}
        </div>
      )}
    </Block>
  );
}

function TauxSection(p: {
  taux: number; proposition: { taux: number; le: string } | null; tauxPropose: number | null;
  setTauxPropose: (t: number | null) => void; onProposer: () => void;
}) {
  return (
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
  );
}

function RegistreSection(p: {
  epargnes: AttributionReunion[]; parMembre: Map<string, Member>;
  visas: VisasEpargnes; onViser: (id: string) => void; onDeviser: (id: string) => void;
  onExport: () => void;
}) {
  const totalEpargnes = p.epargnes.reduce((s, e) => s + e.montant, 0);
  const nbVisees = p.epargnes.filter((e) => p.visas[e.id]).length;
  return (
    <Block
      title="Registre des épargnes — à viser par la secrétaire"
      icon={<PiggyBank className="h-4 w-4" />}
      accent="#6E4B71"
      note="CE registre est celui du bureau — la MÊME source que la page « Épargnes » du président. VISA (double-clic de confirmation) : le montant est vérifié, la ligne VERROUILLÉE, le membre notifié sur SA page et le président informé. EXPORT EXCEL : le registre part en .xlsx (2 feuilles : détail + synthèse par membre)."
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DCC0] bg-[#F7F1F8] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <P cls={VI_CLS}><PiggyBank className="h-3 w-3" /> {p.epargnes.length} inscription(s)</P>
          <P cls={OK_CLS}><Stamp className="h-3 w-3" /> {nbVisees}/{p.epargnes.length} visée(s)</P>
          <P cls={OR_CLS}>{fcfa(totalEpargnes)}</P>
        </div>
        <Btn tone="vert" onClick={p.onExport}><Download className="h-4 w-4" /> Télécharger (Excel)</Btn>
      </div>
      {p.epargnes.length === 0 ? (
        <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Registre vide — les épargnes inscrites par la secrétaire ou le président apparaîtront ici.</p>
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
                const visa = p.visas[e.id];
                return (
                  <tr key={e.id} className="border-b border-[#E5DCC0] bg-[#FFFDF6]">
                    <td className="px-3 py-2 font-bold text-[#2B3530]">{m?.name ?? e.membreId}</td>
                    <td className="px-3 py-2">{MOIS_FR[mi]}</td>
                    <td className="px-3 py-2 text-right font-black text-[#1E4D2B]">{fcfa(e.montant)}</td>
                    <td className="px-3 py-2 text-center">
                      {visa ? (
                        <div className="flex flex-col items-center gap-1">
                          <P cls={OK_CLS}><Stamp className="h-3 w-3" /> Visé le {visa.le}</P>
                          <BtnConfirme tone="neutre" onConfirmer={() => p.onDeviser(e.id)} labelConfirmer="Retirer le visa ?">
                            <X className="h-3 w-3" /> <span className="text-[10px]">Annuler le visa</span>
                          </BtnConfirme>
                        </div>
                      ) : (
                        <BtnConfirme tone="violet" onConfirmer={() => p.onViser(e.id)} labelConfirmer="Confirmer le visa ?">
                          <Stamp className="h-3.5 w-3.5" /> Viser
                        </BtnConfirme>
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
      <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-2.5">
        <p className="text-[11px] leading-snug text-[#8A9288]">
          <strong className="text-[#5A3E5D]">Que se passe-t-il quand une ligne est visée ?</strong> 1) la ligne est verrouillée (montant confirmé conforme au registre du bureau) ; 2) le membre reçoit sur SA page : « Votre épargne de … a été visée par la secrétaire » ; 3) le président est informé dans sa console ; 4) le visa apparaît dans l'export Excel (colonne « Visa »).
        </p>
      </div>
    </Block>
  );
}

function MembresSection(p: {
  roster: Member[]; historique: HistoriquePresences; moisKey: string | null; rachatAuto: boolean;
  amendes: Amende[]; notifs: NotifBureau[]; parMembre: Map<string, Member>;
  onSupprimerAmende: (id: string) => void;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  return (
    <Block
      title="Membres & suivi disciplinaire"
      icon={<Users className="h-4 w-4" />}
      accent="#6E4B71"
      note="Le suivi de chaque membre : absences consécutives, fenêtres 6 mois / année (après rachat automatique), amendes enregistrées et notifications reçues. Dépliez une ligne pour voir le détail et gérer les amendes."
    >
      <div className="divide-y divide-[#E5DCC0]">
        {p.roster.map((m) => {
          const stats = p.moisKey ? statsPresence(p.historique, m.id, p.moisKey, p.rachatAuto) : null;
          const sesAmendes = p.amendes.filter((a) => a.membreId === m.id);
          const totalDues = sesAmendes.filter((a) => a.statut !== "payee").reduce((s, a) => s + a.montant, 0);
          const sesNotifs = p.notifs.filter((n) => n.destinataire === m.id);
          const estOuvert = ouvert === m.id;
          return (
            <div key={m.id} className="px-4 py-2.5">
              <button type="button" onClick={() => setOuvert(estOuvert ? null : m.id)} aria-expanded={estOuvert}
                className="flex w-full flex-wrap items-center gap-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#2B3530]">{m.name}{m.id === "f06" ? " (vous)" : ""}</span>
                  <span className="block text-[10.5px] font-semibold text-[#8A9288]">{ROLE_META[m.role]?.label ?? m.role} · {m.city}</span>
                </span>
                {stats && (
                  <span className="flex flex-wrap items-center gap-1">
                    <P cls={stats.absCons > 0 ? RJ_CLS : "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]"}>conséc. {stats.absCons}</P>
                    <P cls={stats.abs6 > 0 ? OR_CLS : "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]"}>6m {stats.abs6}</P>
                    <P cls={stats.absAnnee > 0 ? TE_CLS : "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]"}>an {stats.absAnnee}</P>
                  </span>
                )}
                {totalDues > 0 && <P cls={RJ_CLS}>{fcfa(totalDues)}</P>}
                {sesNotifs.length > 0 && <P cls={VI_CLS}><Bell className="h-3 w-3" /> {sesNotifs.length}</P>}
              </button>
              {estOuvert && (
                <div className="mt-2 space-y-2 rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
                  {stats && (
                    <p className="text-[11.5px] leading-snug text-[#4A554E]">
                      Absences du mois passé : {stats.absMoisPrecedent} · {stats.rachatApplique
                        ? `rachat appliqué : ${stats.rachatNb} absence(s) annulée(s) par la présence de ce mois`
                        : p.rachatAuto ? "rachat automatique : présent ce mois ⇒ absences du mois passé annulées" : "rachat automatique désactivé"}
                    </p>
                  )}
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#5A3E5D]">Amendes ({sesAmendes.length})</p>
                  {sesAmendes.length === 0 ? (
                    <p className="text-[11.5px] text-[#8A9288]">Aucune amende — compteurs dans les règles.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sesAmendes.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-white px-2.5 py-1.5">
                          <span className="min-w-0">
                            <span className="block text-[11.5px] font-bold text-[#2B3530]">{fcfa(a.montant)} — {MOTIFS_LABELS[a.motif]}</span>
                            <span className="block text-[10.5px] text-[#8A9288]">{a.moisLabel} · {a.statut === "due" ? "due" : a.statut === "transmise" ? "transmise au trésorier" : "payée"}</span>
                          </span>
                          <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimerAmende(a.id)} labelConfirmer="Retirer ?">
                            <Trash2 className="h-3.5 w-3.5" />
                          </BtnConfirme>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#5A3E5D]">Notifications reçues ({sesNotifs.length})</p>
                  {sesNotifs.length === 0 ? (
                    <p className="text-[11.5px] text-[#8A9288]">Aucune notification pour ce membre.</p>
                  ) : (
                    <div className="space-y-1">
                      {sesNotifs.slice(0, 5).map((n) => (
                        <p key={n.id} className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] leading-snug text-[#4A554E]"><strong>{n.titre}</strong> — {n.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Block>
  );
}

function NotificationsSection(p: {
  notifs: NotifBureau[]; parMembre: Map<string, Member>;
  onToutLu: () => void; onBasculerLu: (id: string) => void; onSupprimer: (id: string) => void;
}) {
  const [filtre, setFiltre] = useState<"tous" | "membres" | "bureau">("tous");
  const visibles = p.notifs.filter((n) =>
    filtre === "tous" ? true : filtre === "membres" ? n.destinataire !== "president" && n.destinataire !== "tous" : n.destinataire === "president" || n.destinataire === "tous");
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<Bell className="h-4 w-4" />} label="Notifications" value={String(p.notifs.length)} sub="journal complet" accent="#6E4B71" />
        <KpiCard icon={<Mail className="h-4 w-4" />} label="Non lues" value={String(p.notifs.filter((n) => !n.lu).length)} sub="badge des onglets" accent="#A5473D" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Aux membres" value={String(p.notifs.filter((n) => n.destinataire !== "president" && n.destinataire !== "tous").length)} sub="sur leur page" accent="#2F6B45" />
        <KpiCard icon={<ShieldCheck className="h-4 w-4" />} label="Au bureau" value={String(p.notifs.filter((n) => n.destinataire === "president" || n.destinataire === "tous").length)} sub="président + tous" accent="#3D6B72" />
      </div>
      <Block
        title="Notifications du secrétariat"
        icon={<Bell className="h-4 w-4" />}
        accent="#6E4B71"
        note="Tout ce que le moteur et la secrétaire ont notifié : avertissements d'absences, amendes automatiques, rachats, visas, convocations et décisions. Les membres voient les leurs SUR LEUR page (tableau de bord) ; le président est informé des actions du secrétariat."
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DCC0] bg-[#F7F1F8] px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {([["tous", "Tout"], ["membres", "Membres"], ["bureau", "Bureau"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFiltre(k)} aria-pressed={filtre === k}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${filtre === k ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
                {l}
              </button>
            ))}
          </div>
          <Btn small tone="violet" onClick={p.onToutLu}><CheckCircle2 className="h-3.5 w-3.5" /> Tout marquer lu</Btn>
        </div>
        {visibles.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune notification pour ce filtre.</p>
        ) : (
          <div className="divide-y divide-[#E5DCC0]">
            {visibles.map((n) => {
              const m = p.parMembre.get(n.destinataire);
              return (
                <div key={n.id} className={`px-4 py-2.5 ${n.lu ? "opacity-70" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-[12.5px] font-bold text-[#2B3530]">
                      {!n.lu && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#A5473D]" aria-hidden="true" />}
                      {n.titre}
                    </p>
                    <span className="flex items-center gap-1">
                      <P cls={n.destinataire === "president" ? TE_CLS : n.destinataire === "tous" ? OR_CLS : VI_CLS}>
                        {n.destinataire === "president" ? "Président" : n.destinataire === "tous" ? "Tous" : (m?.name ?? n.destinataireNom)}
                      </P>
                      <P cls={n.le ? OR_CLS : VI_CLS}>{n.le}</P>
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-snug text-[#4A554E]">{n.message}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Btn small tone="neutre" onClick={() => p.onBasculerLu(n.id)}>{n.lu ? "Marquer non lu" : "Marquer lu"}</Btn>
                    <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimer(n.id)} labelConfirmer="Supprimer ?">
                      <Trash2 className="h-3.5 w-3.5" />
                    </BtnConfirme>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Block>
    </>
  );
}

function StatistiquesSection(p: {
  roster: Member[]; historique: HistoriquePresences; moisKey: string | null; rachatAuto: boolean;
  amendes: Amende[]; decisions: DecisionJ[]; convos: ConvocationV2[]; types: string[];
}) {
  const mois12 = p.moisKey ? derniersMoisKeys(p.moisKey, 12) : [];
  const parMembre = p.roster.map((m) => {
    let pres = 0, exc = 0, abs = 0;
    for (const mk of mois12) {
      const st = p.historique[mk]?.[m.id];
      if (st === "present") pres++;
      else if (st === "excuse") exc++;
      else if (st === "absent") abs++;
    }
    const total = pres + exc + abs;
    const amendesTotal = p.amendes.filter((a) => a.membreId === m.id && a.statut !== "payee").reduce((s, a) => s + a.montant, 0);
    return { m, pres, exc, abs, tauxPct: total > 0 ? Math.round((pres / total) * 100) : 0, amendesTotal };
  });
  const absParMois = mois12.map((mk) => p.roster.filter((m) => p.historique[mk]?.[m.id] === "absent").length);
  const maxAbs = Math.max(1, ...absParMois);
  const amendesTot = {
    due: p.amendes.filter((a) => a.statut === "due").reduce((s, a) => s + a.montant, 0),
    transmise: p.amendes.filter((a) => a.statut === "transmise").reduce((s, a) => s + a.montant, 0),
    payee: p.amendes.filter((a) => a.statut === "payee").reduce((s, a) => s + a.montant, 0),
  };
  const destTotal = p.convos.reduce((s, c) => s + Object.keys(c.destinataires).length, 0);
  const destConfirm = p.convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut === "confirmee").length, 0);
  const destAbs = p.convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut === "absence").length, 0);
  return (
    <>
      <Block title="Taux de présence par membre (12 mois)" icon={<BarChart3 className="h-4 w-4" />} accent="#6E4B71"
        note="Présences / (présences + excusés + absents) sur les 12 derniers mois, rachat automatique inclus dans les compteurs du bureau.">
        <div className="space-y-1.5 p-4">
          {parMembre.map(({ m, pres, exc, abs, tauxPct, amendesTotal }) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-40 min-w-0 shrink-0 truncate text-[12px] font-bold text-[#2B3530]">{m.name}</span>
              <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E5DCC0]">
                <span className="block h-full rounded-full bg-[#2F6B45]" style={{ width: `${tauxPct}%` }} />
              </span>
              <span className="w-10 shrink-0 text-right text-[11.5px] font-black text-[#1E4D2B]">{tauxPct}%</span>
              <span className="hidden w-24 shrink-0 text-[10.5px] text-[#8A9288] sm:block">P{pres} E{exc} A{abs}</span>
              {amendesTotal > 0 && <P cls={RJ_CLS}>{fcfa(amendesTotal)}</P>}
            </div>
          ))}
        </div>
      </Block>
      <Block title="Absences mois par mois (12 mois)" icon={<Ban className="h-4 w-4" />} accent="#6E4B71">
        <div className="flex items-end justify-between gap-1.5 px-4 pb-3 pt-4">
          {absParMois.map((n, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10.5px] font-black text-[#A5473D]">{n}</span>
              <span className="w-full rounded-t bg-[#A5473D]/80" style={{ height: `${8 + (n / maxAbs) * 48}px` }} />
              <span className="text-[9.5px] font-bold text-[#8A9288]">{MOIS_FR[i]?.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </Block>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Block title="Amendes automatiques" icon={<Coins className="h-4 w-4" />} accent="#6E4B71">
          <div className="space-y-2 p-4 text-[12.5px]">
            <div className="flex justify-between"><span className="font-bold text-[#A5473D]">Dues</span><span className="font-black">{fcfa(amendesTot.due)}</span></div>
            <div className="flex justify-between"><span className="font-bold text-[#3D6B72]">Transmises au trésorier</span><span className="font-black">{fcfa(amendesTot.transmise)}</span></div>
            <div className="flex justify-between"><span className="font-bold text-[#2F6B45]">Payées</span><span className="font-black">{fcfa(amendesTot.payee)}</span></div>
          </div>
        </Block>
        <Block title="Décisions & convocations" icon={<ScrollText className="h-4 w-4" />} accent="#6E4B71">
          <div className="space-y-2 p-4 text-[12.5px]">
            {p.types.map((t) => {
              const n = p.decisions.filter((d) => d.type === t).length;
              return n > 0 ? (
                <div key={t} className="flex justify-between"><span className="font-bold text-[#2B3530]">Décisions — {t}</span><span className="font-black">{n}</span></div>
              ) : null;
            })}
            <div className="flex justify-between"><span className="font-bold text-[#2B3530]">Convocations — confirmations</span><span className="font-black">{destConfirm}/{destTotal}</span></div>
            <div className="flex justify-between"><span className="font-bold text-[#A5473D]">Convocations — absences notifiées</span><span className="font-black">{destAbs}</span></div>
          </div>
        </Block>
      </div>
    </>
  );
}

function CourriersSection(p: { moisLabel: string | null; jourReunion: number; amendes: Amende[]; parMembre: Map<string, Member>; decisions: DecisionJ[]; moisIdx: number | null; annee: number | null }) {
  const [destAmende, setDestAmende] = useState<string | null>(p.amendes[0]?.membreId ?? null);
  const copier = async (texte: string) => {
    try {
      await navigator.clipboard.writeText(texte);
      toast.success("Texte copié", { description: "Collez-le dans WhatsApp, un e-mail ou une lettre — le courrier partira avec le cachet du secrétariat." });
    } catch {
      toast.error("Copie impossible dans ce navigateur — sélectionnez le texte manuellement.");
    }
  };
  const moisIdxSafe = p.moisIdx ?? 0;
  const courrierConvocation = `FAMILLE MBEUTETSA — TONTINE\nSecrétariat\n\nObjet : Convocation à la réunion mensuelle\n\nChers membres,\n\nLa réunion mensuelle de la tontine se tiendra le ${p.jourReunion} ${MOIS_FR[moisIdxSafe]} ${p.annee ?? ""} à 14 h, au domicile de la famille Mbeutetsa (Douala).\n\nOrdre du jour : collecte des cotisations et collations, remise au bénéficiaire du mois, questions diverses.\n\nMerci de CONFIRMER votre réception depuis l'application, ou de notifier votre absence avec justification.\n\nLe Secrétaire,\nFrançoise Mbeutetsa`;
  const amendeM = p.amendes.find((a) => a.membreId === destAmende) ?? p.amendes[0];
  const courrierAmende = amendeM ? `FAMILLE MBEUTETSA — TONTINE\nSecrétariat\n\nObjet : Notification d'amende automatique\n\nCher(e) ${p.parMembre.get(amendeM.membreId)?.name ?? amendeM.membreId},\n\nConformément aux règles adoptées par le bureau, votre suivi de présence fait apparaître : ${amendeM.libelle}.\n\nUne amende de ${fcfa(amendeM.montant)} est enregistrée au titre de ${amendeM.moisLabel}.\n\nVous pouvez vous rapprocher de la secrétaire pour toute précision sur vos compteurs.\n\nLe Secrétaire,\nFrançoise Mbeutetsa` : "Aucune amende enregistrée — aucun courrier de notification à préparer.";
  const relance = p.decisions.find((d) => d.statut === "en_cours");
  const courrierRelance = relance ? `FAMILLE MBEUTETSA — TONTINE\nSecrétariat\n\nObjet : Relance — décision du bureau non soldée\n\n${relance.responsable},\n\nLa décision « ${relance.point} » inscrite au journal (${relance.le}) est EN COURS : « ${relance.texte} »\n\nMerci de faire le point avec le bureau à la prochaine réunion.\n\nLe Secrétaire,\nFrançoise Mbeutetsa` : "Aucune décision en cours — aucune relance à préparer.";
  const modele = (titre: string, texte: string, icone: ReactNode) => (
    <div className="rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-[#2B3530]">{titre}</p>
        <Btn small tone="violet" onClick={() => void copier(texte)}><Copy className="h-3.5 w-3.5" /> Copier le texte</Btn>
      </div>
      <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#E5DCC0] bg-white px-3 py-2.5 text-[11.5px] leading-relaxed text-[#4A554E]">{texte}</p>
      {icone}
    </div>
  );
  return (
    <Block
      title="Courriers & modèles du secrétariat"
      icon={<Mail className="h-4 w-4" />}
      accent="#6E4B71"
      note="Les courriers officiels du secrétariat, pré-remplis avec les données réelles du registre : convocation, notification d'amende, relance de décision. Copiez le texte — WhatsApp, e-mail ou papier."
    >
      <div className="space-y-3 p-4">
        {p.amendes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-[#8A9288]">Destinataire du courrier d'amende :</span>
            {[...new Set(p.amendes.map((a) => a.membreId))].map((id) => (
              <button key={id} type="button" onClick={() => setDestAmende(id)} aria-pressed={destAmende === id}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${destAmende === id ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-white text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
                {p.parMembre.get(id)?.name ?? id}
              </button>
            ))}
          </div>
        )}
        {modele("Convocation mensuelle", courrierConvocation, null)}
        {modele("Notification d'amende", courrierAmende, null)}
        {modele("Relance de décision", courrierRelance, null)}
      </div>
    </Block>
  );
}

function ParametresSection(p: { params: ParamsSecretaire; onMaj: (p: ParamsSecretaire) => void; moisLabel: string }) {
  const [nouveauType, setNouveauType] = useState("");
  const [nouveauTypeArchive, setNouveauTypeArchive] = useState("");
  const [nouveauTypeConvo, setNouveauTypeConvo] = useState("");
  const pr = p.params.presences;
  const majPresences = (patch: Partial<ParamsSecretaire["presences"]>) => p.onMaj({ ...p.params, presences: { ...pr, ...patch } });
  const majTypes = (types: string[]) => p.onMaj({ ...p.params, decisions: { ...p.params.decisions, types } });
  const majTypesArchives = (typesArchives: string[]) => p.onMaj({ ...p.params, decisions: { ...p.params.decisions, typesArchives } });
  const majConvocations = (patch: Partial<ParamsSecretaire["convocations"]>) => p.onMaj({ ...p.params, convocations: { ...p.params.convocations, ...patch } });
  return (
    <>
      <Block
        title="Paramètres — présences & amendes"
        icon={<ClipboardList className="h-4 w-4" />}
        accent="#6E4B71"
        note={`Les règles s'appliquent TOUTES SEULES à chaque appel (mois courant : ${p.moisLabel}). Le membre est prévenu dès le seuil de notification ; au-delà, l'amende est ENREGISTRÉE AUTOMATIQUEMENT et le membre notifié sur sa page.`}
      >
        <div className="space-y-2 p-4">
          <ToggleRow label="Moteur d'amendes actif" note="Si désactivé, aucun avertissement ni amende automatique — l'appel reste enregistré." actif={pr.activer} onToggle={() => majPresences({ activer: !pr.activer })} />
          <ToggleRow label="Rachat automatique des absences" note="Présent ce mois ⇒ les absences du mois passé sont annulées automatiquement (compteurs + notification au membre)." actif={pr.rachatAuto} onToggle={() => majPresences({ rachatAuto: !pr.rachatAuto })} />
          <NumField label="Avertir le membre dès N absences consécutives" note="Notification sur sa page : « vous avez N absences… à plus de X, pénalité de Y »." value={pr.notifierDes} onChange={(v) => majPresences({ notifierDes: v })} unite="abs." />
          <NumField label="Absences CONSÉCUTIVES → amende" value={pr.absConsSeuil} onChange={(v) => majPresences({ absConsSeuil: v })} unite="abs." />
          <NumField label="…montant de l'amende (consécutives)" value={pr.amendeAbsCons} onChange={(v) => majPresences({ amendeAbsCons: v })} unite="FCFA" />
          <NumField label="Absences sur 6 MOIS glissants → amende" value={pr.abs6Seuil} onChange={(v) => majPresences({ abs6Seuil: v })} unite="abs." />
          <NumField label="…montant de l'amende (6 mois)" value={pr.amendeAbs6} onChange={(v) => majPresences({ amendeAbs6: v })} unite="FCFA" />
          <NumField label="Excédent d'absences ANNUEL → amende" value={pr.absAnneeSeuil} onChange={(v) => majPresences({ absAnneeSeuil: v })} unite="abs." />
          <NumField label="…montant de l'amende (annuel)" value={pr.amendeAbsAnnee} onChange={(v) => majPresences({ amendeAbsAnnee: v })} unite="FCFA" />
          <NumField label="Excusés CONSÉCUTIFS → amende" value={pr.excuseConsSeuil} onChange={(v) => majPresences({ excuseConsSeuil: v })} unite="exc." />
          <NumField label="…montant de l'amende (excusés)" value={pr.amendeExcuseCons} onChange={(v) => majPresences({ amendeExcuseCons: v })} unite="FCFA" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Btn tone="violet" onClick={() => { const p2 = reinitialiserParams(); p.onMaj(p2); toast.success("Paramètres réinitialisés aux valeurs du bureau"); }}><RefreshCw className="h-4 w-4" /> Réinitialiser les règles</Btn>
          </div>
        </div>
      </Block>

      <Block title="Paramètres — types de décisions" icon={<ScrollText className="h-4 w-4" />} accent="#6E4B71"
        note="Les types proposés à l'inscription d'une décision au journal — ajoutez les vôtres (ex. : « Foncier », « Éducation »).">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-1.5">
            {p.params.decisions.types.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[#C7A9CA] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#5A3E5D]">
                {t}
                <button type="button" onClick={() => majTypes(p.params.decisions.types.filter((x) => x !== t))} aria-label={`Retirer le type ${t}`} className="text-[#A5473D] hover:text-[#8f3c33]"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={nouveauType} onChange={(e) => setNouveauType(e.target.value)} placeholder="Nouveau type de décision…" aria-label="Nouveau type de décision" className="min-w-0 flex-1 rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <Btn tone="violet" onClick={() => { const t = nouveauType.trim(); if (!t) return; if (p.params.decisions.types.includes(t)) { toast.error("Ce type existe déjà"); return; } majTypes([...p.params.decisions.types, t]); setNouveauType(""); toast.success(`Type « ${t} » ajouté`); }}><Plus className="h-4 w-4" /> Ajouter</Btn>
          </div>
        </div>
      </Block>

      <Block title="Paramètres — types d'archives" icon={<Archive className="h-4 w-4" />} accent="#6E4B71"
        note="Les types disponibles à l'archivage d'un PV ou d'un document — le filtre de l'onglet Archives suit cette liste.">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-1.5">
            {p.params.decisions.typesArchives.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[#C7A9CA] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#5A3E5D]">
                {t}
                <button type="button" onClick={() => majTypesArchives(p.params.decisions.typesArchives.filter((x) => x !== t))} aria-label={`Retirer le type d'archive ${t}`} className="text-[#A5473D] hover:text-[#8f3c33]"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={nouveauTypeArchive} onChange={(e) => setNouveauTypeArchive(e.target.value)} placeholder="Nouveau type d'archive…" aria-label="Nouveau type d'archive" className="min-w-0 flex-1 rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <Btn tone="violet" onClick={() => { const t = nouveauTypeArchive.trim(); if (!t) return; if (p.params.decisions.typesArchives.includes(t)) { toast.error("Ce type existe déjà"); return; } majTypesArchives([...p.params.decisions.typesArchives, t]); setNouveauTypeArchive(""); toast.success(`Type d'archive « ${t} » ajouté`); }}><Plus className="h-4 w-4" /> Ajouter</Btn>
          </div>
        </div>
      </Block>

      <Block title="Paramètres — convocations & sanctions" icon={<Mail className="h-4 w-4" />} accent="#6E4B71"
        note="Types de convocations, rappel automatique avant la réunion, et LA SANCTION : un membre qui a CONFIRMÉ la convocation et reste absent à la réunion est amendé automatiquement par le moteur.">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-1.5">
            {p.params.convocations.types.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full border border-[#C7A9CA] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#5A3E5D]">
                {t}
                <button type="button" onClick={() => majConvocations({ types: p.params.convocations.types.filter((x) => x !== t) })} aria-label={`Retirer le type de convocation ${t}`} className="text-[#A5473D] hover:text-[#8f3c33]"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={nouveauTypeConvo} onChange={(e) => setNouveauTypeConvo(e.target.value)} placeholder="Nouveau type de convocation…" aria-label="Nouveau type de convocation" className="min-w-0 flex-1 rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
            <Btn tone="violet" onClick={() => { const t = nouveauTypeConvo.trim(); if (!t) return; if (p.params.convocations.types.includes(t)) { toast.error("Ce type existe déjà"); return; } majConvocations({ types: [...p.params.convocations.types, t] }); setNouveauTypeConvo(""); toast.success(`Type de convocation « ${t} » ajouté`); }}><Plus className="h-4 w-4" /> Ajouter</Btn>
          </div>
          <NumField label="Rappel automatique avant la réunion" value={p.params.convocations.rappelJours} onChange={(v) => majConvocations({ rappelJours: v })} unite="jours" />
          <ToggleRow label="Sanction « confirmé puis absent »" note="Le moteur amende automatiquement le membre qui avait confirmé la convocation du mois et est marqué ABSENT à l'appel." actif={p.params.convocations.sanctionActif} onToggle={() => majConvocations({ sanctionActif: !p.params.convocations.sanctionActif })} />
          <NumField label="…montant de la sanction" value={p.params.convocations.amendeConfirmeAbsent} onChange={(v) => majConvocations({ amendeConfirmeAbsent: v })} unite="FCFA" />
        </div>
      </Block>

      <Block title="Zone de démonstration" icon={<RefreshCw className="h-4 w-4" />} accent="#6E4B71"
        note="Efface TOUTES les données du secrétariat (PV, présences, décisions, convocations, amendes, notifications, visas, paramètres) et restaure les données de démonstration — utile pour rejouer un scénario devant le bureau.">
        <div className="p-4">
          <BtnConfirme tone="rouge" onConfirmer={() => { reinitialiserDonneesSecretariat(); if (typeof window !== "undefined") window.location.reload(); }} labelConfirmer="Tout effacer et recharger ?">
            <RefreshCw className="h-4 w-4" /> Réinitialiser toutes les données du secrétariat
          </BtnConfirme>
        </div>
      </Block>
    </>
  );
}
