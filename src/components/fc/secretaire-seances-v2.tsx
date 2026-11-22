"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SÉANCES v2 (v39) — Famille.Mbeutetsa
//
// Demande de l'administrateur : « je souhaite que tu puisses ajouter comme
// nouvelle section la possibilité de créer une nouvelle séance avec bien
// évidemment les points à traiter. Crée quelque chose qui ressemble réellement
// à ce qui se passe dans les associations ou dans les cantines… un bouton pour
// confirmer, mais si elle souhaite ajouter un nouveau point, que cela puisse
// être fait. Si elle veut modifier un point, que cela puisse être fait. Si
// elle veut supprimer un point, que cela puisse être fait… ensuite le bouton
// Rédiger le PV de la séance qui oriente directement vers l'autre page.
// Lorsqu'elle a validé ou créé une séance, il faut qu'elle ait la possibilité
// d'envoyer ça aux différents membres du bureau… aux membres de l'association
// ou aux membres du bureau ou à des personnes réellement spécifiques. »
//
// La page suit la vie réelle d'une séance d'association/cantine :
//   1. PRÉPARER — la secrétaire compose l'ordre du jour (ajout, modification,
//      suppression, remontée/descente des points) ;
//   2. CONFIRMER — bouton « Confirmer la séance » (l'ordre du jour est arrêté) ;
//   3. PARTAGER — envoi à l'association, au bureau ou à des personnes
//      spécifiques : chaque destinataire reçoit une notification, ouvre une
//      belle présentation de la séance, la télécharge en PDF ou en Word,
//      commente et discute avec la secrétaire ;
//   4. RÉDACTION — « Rédiger le PV de la séance » oriente vers la page des
//      procès-verbaux.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Copy, Download, FileText,
  MessageCircle, MessageSquare, PenLine, Pencil, Plus, Send, Trash2, Users,
} from "lucide-react";
import { Block, Btn, BtnConfirme, KpiCard, P, OK_CLS, TE_CLS, dateCourte, heure, toast } from "./maquette-ui";
import { type Member } from "./tontine-data";
import type { Seance } from "./secretaire-bureau";
import { pushNotif } from "./secretaire-bureau";
import {
  chargerPartages, ecrireMessagePartage, partagerSeance,
  type CiblePartage, type PartageSeance,
} from "./partage-bureau";

/* — l'ordre du jour HABITUEL d'une réunion de cantine (aide au démarrage) — */
const ORDRE_HABITUEL: { titre: string; detail: string; responsable: string }[] = [
  { titre: "Appel des membres & lecture du PV précédent", detail: "L'appel ouvre la séance ; le PV de la dernière réunion est lu puis approuvé.", responsable: "Secrétaire" },
  { titre: "Collecte des cotisations & collations", detail: "Encaissement devant la réunion — reçus à l'appui, inscrits au registre.", responsable: "Trésorier" },
  { titre: "Remise au bénéficiaire du mois", detail: "Somme du pot remise au bénéficiaire du tour — accusé de remise signé.", responsable: "Président" },
  { titre: "Divers & question d'actualité", detail: "Point libre où chaque membre s'exprime.", responsable: "Bureau" },
];

const CIBLES: { cle: CiblePartage; label: string; note: string }[] = [
  { cle: "tous", label: "Toute l'association", note: "Tous les membres de la Tontine reçoivent la séance." },
  { cle: "bureau", label: "Membres du bureau", note: "Président, vice-président, trésorier, commissaire, censeur et secrétariat." },
  { cle: "specifiques", label: "Personnes spécifiques", note: "Choisissez une ou plusieurs personnes dans la liste." },
];

/* ═══════════════════════════ la page ═══════════════════════════ */

export function SeancesSectionV2(p: {
  seances: Seance[];
  majSeances: (next: Seance[]) => void;
  moisKey: string | null;
  moisLabel: string | null;
  jourReunion: number;
  annee: number;
  roster: Member[];
  moiNom: string;
  /** Rédige le PV (brouillon) puis ouvre la page Procès-verbaux. */
  onCloturer: () => void;
}): ReactNode {
  const { seances, majSeances, moisKey, moisLabel, jourReunion } = p;
  const seance = useMemo(() => seances.find((s) => s.moisKey === moisKey) ?? null, [seances, moisKey]);

  /* — partages : lus après montage (hydratation sûre) — */
  const [partages, setPartages] = useState<PartageSeance[]>([]);
  useEffect(() => {
    const t0 = setTimeout(() => setPartages(chargerPartages()), 0);
    const onSync = (e: StorageEvent) => {
      if (!e.key || e.key === "fc_seances_partagees_v1") setPartages(chargerPartages());
    };
    window.addEventListener("storage", onSync);
    return () => { clearTimeout(t0); window.removeEventListener("storage", onSync); };
  }, []);
  const partage = partages.find((x) => x.seanceId === seance?.id) ?? null;

  /* — formulaire « point » : création ou édition — */
  const [form, setForm] = useState<{ titre: string; detail: string; resp: string; editionId: string | null } | null>(null);

  /* — dialogue d'envoi — */
  const [envoi, setEnvoi] = useState<{ cible: CiblePartage; ids: string[]; recherche: string } | null>(null);

  /* — réponse (chat/commentaires) — */
  const [reponse, setReponse] = useState<{ ouvert: boolean; texte: string }>({ ouvert: false, texte: "" });

  const uid = () => `pt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  /* — 1. PRÉPARER : la séance du mois — */
  const creerSeance = (avecOrdreHabiciel: boolean) => {
    if (!moisKey) return;
    const points = avecOrdreHabiciel
      ? ORDRE_HABITUEL.map((pt) => ({ id: uid(), ...pt, statut: "en_attente" as const }))
      : [];
    majSeances([...seances, { id: `seance-${moisKey}-${Date.now().toString(36)}`, moisKey, points, confirmeeLe: null }]);
    toast.success(avecOrdreHabiciel ? "Séance créée avec l'ordre du jour habituel" : "Séance créée", {
      description: `Séance de ${moisLabel ?? "ce mois"} — le ${jourReunion} du mois (2ᵉ dimanche). Ajoutez, modifiez ou retirez vos points, puis confirmez.`,
    });
  };

  const ajouterPoint = (titre: string, detail: string, resp: string) => {
    if (!seance) return;
    majSeances(seances.map((s) => (s.id === seance.id
      ? { ...s, points: [...s.points, { id: uid(), titre, detail, responsable: resp || "Bureau", statut: "en_attente" as const }] }
      : s)));
  };

  const enregistrerPoint = () => {
    if (!form || !form.titre.trim() || !seance) return;
    if (form.editionId) {
      majSeances(seances.map((s) => (s.id === seance.id
        ? { ...s, points: s.points.map((pt) => (pt.id === form.editionId ? { ...pt, titre: form.titre.trim(), detail: form.detail.trim(), responsable: form.resp.trim() || "Bureau" } : pt)) }
        : s)));
      toast.success("Point modifié");
    } else {
      ajouterPoint(form.titre.trim(), form.detail.trim(), form.resp.trim());
      toast.success("Point ajouté à l'ordre du jour");
    }
    setForm(null);
  };

  const bougerPoint = (pointId: string, dir: -1 | 1) => {
    if (!seance) return;
    const pts = [...seance.points];
    const i = pts.findIndex((pt) => pt.id === pointId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pts.length) return;
    [pts[i], pts[j]] = [pts[j], pts[i]];
    majSeances(seances.map((s) => (s.id === seance.id ? { ...s, points: pts } : s)));
  };

  const supprimerPoint = (pointId: string) => {
    if (!seance) return;
    majSeances(seances.map((s) => (s.id === seance.id ? { ...s, points: s.points.filter((pt) => pt.id !== pointId) } : s)));
    toast("Point retiré de l'ordre du jour");
  };

  /* — 2. CONFIRMER — */
  const confirmerSeance = () => {
    if (!seance || seance.points.length === 0) { toast.error("Ajoutez au moins un point avant de confirmer la séance"); return; }
    majSeances(seances.map((s) => (s.id === seance.id ? { ...s, confirmeeLe: `${dateCourte()} ${heure()}` } : s)));
    toast.success("Séance confirmée", { description: `L'ordre du jour de ${moisLabel ?? "ce mois"} est arrêté — vous pouvez l'envoyer aux membres du bureau, à l'association ou à des personnes spécifiques.` });
  };

  /* — 3. PARTAGER — */
  const destinatairesDe = (cible: CiblePartage, ids: string[]): Member[] =>
    cible === "tous" ? p.roster
      : cible === "bureau" ? p.roster.filter((m) => m.role !== "membre")
      : p.roster.filter((m) => ids.includes(m.id));

  const envoyer = () => {
    if (!seance || !envoi || !moisKey) return;
    const dest = destinatairesDe(envoi.cible, envoi.ids);
    if (dest.length === 0) { toast.error("Choisissez au moins un destinataire"); return; }
    const le = `${dateCourte()} ${heure()}`;
    const part = partagerSeance({
      seanceId: seance.id,
      moisKey,
      titre: `Séance de ${moisLabel ?? "ce mois"} — le ${jourReunion} du mois`,
      jourReunion,
      points: seance.points.map((pt) => ({ id: pt.id, titre: pt.titre, detail: pt.detail, responsable: pt.responsable })),
      parNom: p.moiNom || "Secrétaire",
      cible: envoi.cible,
      cibleIds: envoi.cible === "specifiques" ? envoi.ids : [],
    }, le);
    for (const m of dest) {
      pushNotif({
        id: `seance-partagee:${seance.id}:${m.id}`, le,
        destinataire: m.id, destinataireNom: m.name, type: "convocation",
        titre: `Séance de ${moisLabel ?? "ce mois"} partagée par la secrétaire`,
        message: `L'ordre du jour de la séance de ${moisLabel ?? "ce mois"} (${part.points.length} point(s)) vous a été partagé${m.role === "membre" ? "" : " (bureau)"} — ouvrez « Réunions » pour le lire, le télécharger (PDF/Word), commenter ou discuter avec la secrétaire.`,
      });
    }
    setPartages(chargerPartages());
    setEnvoi(null);
    toast.success(`Séance envoyée à ${dest.length} destinataire(s)`, { description: "Chacun est notifié et peut ouvrir, lire, télécharger (PDF/Word), commenter et discuter avec vous." });
  };

  /* — réactions : commentaires + chat avec la secrétaire — */
  const repondre = () => {
    if (!partage || !reponse.texte.trim()) return;
    const le = `${dateCourte()} ${heure()}`;
    ecrireMessagePartage(partage.id, { auteurId: "secretariat", auteurNom: `${p.moiNom || "Secrétaire"} — Secrétaire`, texte: reponse.texte.trim(), le, deSecretariat: true });
    const dernierAuteur = [...partage.messages].reverse().find((m) => !m.deSecretariat);
    if (dernierAuteur) {
      const m = p.roster.find((x) => x.id === dernierAuteur.auteurId);
      pushNotif({
        id: `seance-reponse:${partage.id}:${dernierAuteur.auteurId}`, le,
        destinataire: dernierAuteur.auteurId, destinataireNom: m?.name ?? dernierAuteur.auteurNom, type: "courrier",
        titre: "La secrétaire vous a répondu",
        message: `À propos de la séance de ${moisLabel ?? "ce mois"} : « ${reponse.texte.trim().slice(0, 90)}${reponse.texte.trim().length > 90 ? "…" : ""} »`,
      });
    }
    setPartages(chargerPartages());
    setReponse({ ouvert: false, texte: "" });
    toast.success("Réponse envoyée");
  };

  /* — corbeille des destinataires déjà choisis — */
  const corpsOrdre = seance
    ? `<h2>Ordre du jour</h2><ol>${seance.points.map((pt) => `<li><strong>${pt.titre}</strong>${pt.detail ? ` — ${pt.detail}` : ""} <span class="meta">(responsable : ${pt.responsable})</span></li>`).join("")}</ol>`
    : "";

  return (
    <>
      {/* — KPI : la séance en un coup d'œil — */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Prochaine séance" value={p.jourReunion ? `${p.jourReunion} ${p.moisLabel?.split(" ")[0] ?? ""}` : "—"} sub={`2ᵉ dimanche · ${p.moisLabel ?? "…"}`} accent="#6E4B71" />
        <KpiCard icon={<PenLine className="h-4 w-4" />} label="Points à l'ordre du jour" value={String(seance?.points.length ?? 0)} sub={seance?.confirmeeLe ? `confirmée ${seance.confirmeeLe}` : "séance du mois courant"} accent="#2F6B45" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Points traités" value={String(seance?.points.filter((pt) => pt.statut === "traite").length ?? 0)} sub="à reprendre au PV" accent="#8A6420" />
        <KpiCard icon={<Send className="h-4 w-4" />} label="Séance partagée" value={partage ? `${partage.vues.length} vue(s)` : "—"} sub={partage ? `${partage.commentaires.length + partage.messages.length} réaction(s)` : "pas encore envoyée"} accent="#3D6B72" />
      </div>

      {/* — 1+2. PRÉPARER & CONFIRMER la séance — */}
      <Block
        title={`Créer & confirmer la séance de ${p.moisLabel ?? "…"}`}
        icon={<CalendarClock className="h-4 w-4" />}
        accent="#6E4B71"
        note={`Réunion le ${p.jourReunion} du mois (2ᵉ dimanche). Composez l'ordre du jour comme en réunion d'association : ajoutez, modifiez, déplacez ou retirez chaque point, puis confirmez la séance.`}
      >
        {!seance ? (
          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            <Btn tone="violet" onClick={() => creerSeance(true)}><Plus className="h-4 w-4" /> Créer la séance (ordre du jour habituel)</Btn>
            <Btn tone="neutre" onClick={() => creerSeance(false)}><FileText className="h-4 w-4" /> Créer une séance vide</Btn>
          </div>
        ) : (
          <>
            {seance.confirmeeLe && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DCC0] bg-[#F2FBF5] px-4 py-2">
                <P cls={OK_CLS}><CheckCircle2 className="h-3 w-3" /> Séance confirmée le {seance.confirmeeLe}</P>
                {partage && <P cls={TE_CLS}><Send className="h-3 w-3" /> Envoyée le {partage.envoyeLe}</P>}
              </div>
            )}
            <div className="divide-y divide-[#E5DCC0]">
              {seance.points.map((pt, i) => {
                const edition = form?.editionId === pt.id;
                return (
                  <div key={pt.id} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6E4B71] text-[11px] font-black text-white">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] font-bold ${pt.statut === "traite" ? "text-[#8A9288] line-through" : "text-[#2B3530]"}`}>{pt.titre}</span>
                        <span className="block text-[11px] leading-snug text-[#8A9288]">{pt.detail} · {pt.responsable}</span>
                      </span>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        <button type="button" onClick={() => bougerPoint(pt.id, -1)} aria-label={`Monter « ${pt.titre} »`} className="rounded-lg border border-[#E5DCC0] bg-white p-1.5 text-[#5A3E5D] hover:border-[#6E4B71]"><ChevronUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => bougerPoint(pt.id, 1)} aria-label={`Descendre « ${pt.titre} »`} className="rounded-lg border border-[#E5DCC0] bg-white p-1.5 text-[#5A3E5D] hover:border-[#6E4B71]"><ChevronDown className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setForm({ editionId: pt.id, titre: pt.titre, detail: pt.detail, resp: pt.responsable })} aria-label={`Modifier « ${pt.titre} »`} className="rounded-lg border border-[#E5DCC0] bg-white p-1.5 text-[#5A3E5D] hover:border-[#6E4B71]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => majSeances(seances.map((s) => (s.id === seance.id ? { ...s, points: s.points.map((x) => (x.id === pt.id ? { ...x, statut: x.statut === "traite" ? "en_attente" as const : "traite" as const } : x)) } : s)))} aria-pressed={pt.statut === "traite"}
                          className={`rounded-lg border px-2 py-1.5 text-[10.5px] font-bold transition ${pt.statut === "traite" ? OK_CLS + " ring-1 ring-current" : "border-[#E5DCC0] bg-white text-[#8A9288] hover:border-[#6E4B71]/40"}`}>
                          {pt.statut === "traite" ? "Traité" : "À traiter"}
                        </button>
                        <BtnConfirme tone="rouge" onConfirmer={() => supprimerPoint(pt.id)} labelConfirmer="Retirer ?">
                          <Trash2 className="h-3.5 w-3.5" />
                        </BtnConfirme>
                      </div>
                    </div>
                    {edition && (
                      <div className="mt-2 space-y-2 rounded-xl border border-[#6E4B71]/40 bg-[#F7F1F8] p-3">
                        <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} aria-label="Titre du point" placeholder="Titre du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] focus:outline-none" />
                        <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} aria-label="Détail du point" placeholder="Détail (facultatif)" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] focus:outline-none" />
                        <input value={form.resp} onChange={(e) => setForm({ ...form, resp: e.target.value })} aria-label="Responsable du point" placeholder="Responsable (défaut : Bureau)" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] focus:outline-none" />
                        <div className="flex gap-2">
                          <Btn small tone="violet" onClick={enregistrerPoint}><CheckCircle2 className="h-3.5 w-3.5" /> Enregistrer les modifications</Btn>
                          <Btn small tone="neutre" onClick={() => setForm(null)}>Annuler</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {seance.points.length === 0 && (
                <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Ordre du jour vide — ajoutez le premier point ci-dessous.</p>
              )}
            </div>

            {form && !form.editionId && (
              <div className="space-y-2 border-t border-[#E5DCC0] bg-[#F7F1F8] p-4">
                <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre du point (ex. : Remise au bénéficiaire du mois)" aria-label="Titre du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
                <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Détail (facultatif)" aria-label="Détail du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
                <input value={form.resp} onChange={(e) => setForm({ ...form, resp: e.target.value })} placeholder="Responsable (défaut : Bureau)" aria-label="Responsable du point" className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none" />
                <div className="flex gap-2">
                  <Btn tone="violet" onClick={enregistrerPoint}><Plus className="h-4 w-4" /> Ajouter le point</Btn>
                  <Btn tone="neutre" onClick={() => setForm(null)}>Annuler</Btn>
                </div>
              </div>
            )}

            {/* — actions de la séance : CONFIRMER → RÉDIGER LE PV → AJOUTER UN POINT
             *    (demande de l'administrateur : « le bouton Rédiger le PV de la
             *    séance… je pense que cela doit venir avant Rédiger le point ») — */}
            {!form && (
              <div className="flex flex-col gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] p-3.5 sm:flex-row sm:flex-wrap">
                <Btn tone="vert" onClick={confirmerSeance}><CheckCircle2 className="h-4 w-4" /> {seance.confirmeeLe ? "Reconfirmer la séance" : "Confirmer la séance"}</Btn>
                <Btn tone="or" onClick={p.onCloturer}><PenLine className="h-4 w-4" /> Rédiger le PV de la séance</Btn>
                <Btn tone="violet" onClick={() => setForm({ titre: "", detail: "", resp: "", editionId: null })}><Plus className="h-4 w-4" /> Ajouter un point</Btn>
              </div>
            )}
          </>
        )}
      </Block>

      {/* — 3. ENVOYER la séance aux destinataires — */}
      <Block
        title="Envoyer la séance aux membres"
        icon={<Send className="h-4 w-4" />}
        accent="#3D6B72"
        note={partage
          ? `Envoyée le ${partage.envoyeLe} — ${partage.vues.length} vue(s) · ${partage.commentaires.length} commentaire(s) · ${partage.messages.length} message(s) de discussion. Un renvoi met l'ordre du jour à jour chez les destinataires.`
          : "À qui envoyer l'ordre du jour ? Toute l'association, les membres du bureau, ou des personnes réellement spécifiques — chacun est notifié, peut ouvrir, télécharger en PDF ou Word, commenter et discuter avec vous."}
      >
        <div className="space-y-3 p-4">
          {!envoi ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Btn tone="teal" disabled={!seance} onClick={() => setEnvoi({ cible: "tous", ids: [], recherche: "" })}>
                <Send className="h-4 w-4" /> {partage ? "Renvoyer la séance" : "Envoyer la séance"}
              </Btn>
              <Btn small tone="neutre" disabled={!seance}
                onClick={() => navigator.clipboard?.writeText(`${seance ? `Séance de ${p.moisLabel ?? ""} — le ${p.jourReunion} du mois\n` : ""}${seance?.points.map((pt, i) => `${i + 1}. ${pt.titre} (${pt.responsable})`).join("\n") ?? ""}`)}
              ><Copy className="h-3.5 w-3.5" /> Copier le texte</Btn>
              <Btn small tone="neutre" disabled={!seance} onClick={() => {
                import("./partage-bureau").then(({ telechargerPDF, telechargerWord }) => {
                  telechargerPDF(`Séance de ${p.moisLabel ?? ""}`, corpsOrdre);
                  void telechargerWord;
                });
              }}><Download className="h-3.5 w-3.5" /> PDF</Btn>
              <Btn small tone="neutre" disabled={!seance} onClick={() => {
                import("./partage-bureau").then(({ telechargerWord }) => telechargerWord(`seance-${p.moisKey ?? "tontine"}`, `Séance de ${p.moisLabel ?? ""}`, corpsOrdre));
              }}><Download className="h-3.5 w-3.5" /> Word</Btn>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-2xl border-2 border-[#3D6B72]/40 bg-[#F0F6F7] p-3.5">
              <p className="text-[12.5px] font-black uppercase tracking-wide text-[#3D6B72]">Destinataires de la séance de {p.moisLabel ?? "…"}</p>
              <div className="space-y-1.5">
                {CIBLES.map((c) => (
                  <label key={c.cle} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${envoi.cible === c.cle ? "border-[#3D6B72] bg-white" : "border-[#E5DCC0] bg-white/70 hover:border-[#3D6B72]/50"}`}>
                    <input type="radio" name="fc-cible-seance" checked={envoi.cible === c.cle} onChange={() => setEnvoi({ ...envoi, cible: c.cle, ids: c.cle === "specifiques" ? envoi.ids : [] })} className="mt-1 accent-[#3D6B72]" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-[#2B3530]">{c.label}</span>
                      <span className="block text-[10.5px] leading-snug text-[#8A9288]">{c.note}</span>
                    </span>
                  </label>
                ))}
              </div>
              {envoi.cible === "specifiques" && (
                <div className="space-y-2">
                  <input value={envoi.recherche} onChange={(e) => setEnvoi({ ...envoi, recherche: e.target.value })} placeholder="Rechercher une personne…" aria-label="Rechercher un destinataire" className="w-full rounded-lg border-2 border-[#E5DCC0] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#3D6B72]" />
                  <div className="fc-scroll max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-[#E5DCC0] bg-white p-2">
                    {p.roster
                      .filter((m) => m.name.toLowerCase().includes(envoi.recherche.trim().toLowerCase()))
                      .map((m) => {
                        const on = envoi.ids.includes(m.id);
                        return (
                          <button key={m.id} type="button" onClick={() => setEnvoi({ ...envoi, ids: on ? envoi.ids.filter((x) => x !== m.id) : [...envoi.ids, m.id] })} aria-pressed={on}
                            className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12.5px] font-bold transition ${on ? "border-[#3D6B72] bg-[#3D6B72]/10 text-[#2B3530]" : "border-[#E5DCC0] bg-white text-[#2B3530] hover:border-[#3D6B72]/50"}`}>
                            <Users className={`h-3.5 w-3.5 shrink-0 ${on ? "text-[#3D6B72]" : "text-[#8A9288]"}`} />
                            <span className="min-w-0 flex-1 truncate">{m.name}{m.id === "secretariat" ? " (vous)" : ""}</span>
                            {on && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2F6B45]" />}
                          </button>
                        );
                      })}
                    {p.roster.filter((m) => m.name.toLowerCase().includes(envoi.recherche.trim().toLowerCase())).length === 0 && (
                      <p className="px-2 py-1.5 text-[11.5px] text-[#8A9288]">Aucune personne trouvée.</p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Btn tone="teal" onClick={envoyer}><Send className="h-4 w-4" /> Envoyer maintenant</Btn>
                <Btn tone="neutre" onClick={() => setEnvoi(null)}>Annuler</Btn>
              </div>
            </div>
          )}
        </div>
      </Block>

      {/* — 4. RÉACTIONS : commentaires & discussion avec la secrétaire — */}
      {partage && (
        <Block
          title="Commentaires & discussion des membres"
          icon={<MessageCircle className="h-4 w-4" />}
          accent="#6E4B71"
          note="Ce que les destinataires disent de la séance — répondez ici : chaque personne reçoit une notification."
        >
          <div className="space-y-2.5 p-4">
            {partage.commentaires.length === 0 && partage.messages.length === 0 && (
              <p className="text-[12px] font-semibold text-[#8A9288]">Aucune réaction pour l'instant.</p>
            )}
            {partage.commentaires.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] px-3 py-2.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#8A6420]">{c.auteurNom} · {c.le}</p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#2B3530]">{c.texte}</p>
              </div>
            ))}
            {partage.messages.map((m) => (
              <div key={m.id} className={`flex ${m.deSecretariat ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.deSecretariat ? "bg-[#6E4B71] text-white" : "border border-[#E5DCC0] bg-white text-[#2B3530]"}`}>
                  <p className="text-[10px] font-black uppercase tracking-wide opacity-80">{m.auteurNom} · {m.le}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed">{m.texte}</p>
                </div>
              </div>
            ))}
            {reponse.ouvert ? (
              <div className="space-y-2">
                <textarea value={reponse.texte} onChange={(e) => setReponse({ ...reponse, texte: e.target.value })} rows={3} aria-label="Votre réponse" placeholder="Votre réponse aux membres…" className="w-full rounded-xl border border-[#C7A9CA] bg-white px-3 py-2.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#6E4B71]/25" />
                <div className="flex gap-2">
                  <Btn tone="violet" onClick={repondre}><Send className="h-4 w-4" /> Envoyer la réponse</Btn>
                  <Btn tone="neutre" onClick={() => setReponse({ ouvert: false, texte: "" })}>Annuler</Btn>
                </div>
              </div>
            ) : (
              <Btn small tone="violet" onClick={() => setReponse({ ouvert: true, texte: "" })}><MessageSquare className="h-3.5 w-3.5" /> Répondre aux membres</Btn>
            )}
          </div>
        </Block>
      )}
    </>
  );
}
