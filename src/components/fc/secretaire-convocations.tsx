"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CONVOCATIONS v2 (v22) — Famille.Mbeutetsa
//
// Demande du président :
//   · « La convocation de la réunion devra avoir la possibilité de sélectionner
//     les personnes à qui la convocation sera envoyée » → sélecteur de
//     destinataires membre par membre (tous sélectionnés par défaut) ;
//   · « un bouton de validation de réception… la personne devra cliquer sur la
//     confirmation de réception » → chaque destinataire répond : Confirmé /
//     Absence notifiée (panneau « réponse du membre ») ;
//   · « lorsqu'il décide de notifier son absence… un champ pour le texte où il
//     peut justifier… ou du moins faire un message vocal » → justification
//     TEXTE + MESSAGE VOCAL enregistré au micro (MediaRecorder, stocké
//     localement, court message) ;
//   · « des notifications pour les configurations des types de convocation,
//     mais aussi les sanctions appropriées si une personne a validé une
//     convocation et elle n'a pas été présente » → les types vivent dans
//     Paramètres, la sanction « confirmé puis absent » est déclenchée
//     AUTOMATIQUEMENT par le moteur quand l'appel marque absent un membre qui
//     avait confirmé (maquette-secretaire.tsx → marquer()).
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from "react";
import {
  CalendarClock, CheckCircle2, Mail, MessageCircle, Mic, Send, Square, Trash2, Users, X,
} from "lucide-react";
import {
  Block, Btn, BtnConfirme, P, KpiCard, fcfa, heure, nid, dateCourte,
  OK_CLS, OR_CLS, RJ_CLS, TE_CLS, VI_CLS, toast,
} from "./maquette-ui";
import { MOIS_FR, TONTINE } from "./tontine-data";
import type { Member } from "./tontine-data";
import type { ConvocationV2, ParamsConvocations } from "./secretaire-bureau";
import { pushNotif } from "./secretaire-bureau";

/* ═══════════════════ enregistreur vocal (court message) ═══════════════════ */

function RecorderVocal(p: { onResultat: (dataUrl: string | null) => void }) {
  const [etat, setEtat] = useState<"idle" | "recording" | "done">("idle");
  const [duree, setDuree] = useState(0);
  const [audio, setAudio] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const netoyerTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const demarrer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        netoyerTimer();
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 600_000) {
          toast.error("Message vocal trop long", { description: "Restez sous ~30 secondes — la maquette garde les messages courts en mémoire locale." });
          setEtat("idle");
          return;
        }
        const fr = new FileReader();
        fr.onload = () => {
          const url = String(fr.result || "");
          setAudio(url);
          setEtat("done");
          p.onResultat(url);
          toast.success("Message vocal enregistré", { description: "Il accompagne votre justification d'absence — la secrétaire pourra l'écouter." });
        };
        fr.readAsDataURL(blob);
      };
      rec.start();
      recRef.current = rec;
      setDuree(0);
      netoyerTimer();
      timerRef.current = setInterval(() => setDuree((d) => d + 1), 1000);
      setEtat("recording");
    } catch {
      toast.error("Micro indisponible", { description: "Autorisez le micro ou saisissez votre justification en TEXTE — les deux sont acceptés." });
    }
  };

  const arreter = () => { recRef.current?.stop(); };

  const effacer = () => {
    setAudio(null);
    setEtat("idle");
    p.onResultat(null);
  };

  if (etat === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-[#A5473D]/40 bg-[#A5473D]/8 px-3 py-2">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#A5473D]" aria-hidden="true" />
        <p className="text-[12px] font-bold text-[#A5473D]">Enregistrement… {duree}s</p>
        <Btn small tone="rouge" onClick={arreter}><Square className="h-3.5 w-3.5" /> Arrêter</Btn>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Btn small tone="violet" onClick={demarrer}><Mic className="h-3.5 w-3.5" /> Message vocal</Btn>
      {audio && (
        <>
          <audio controls src={audio} className="h-9 max-w-full" aria-label="Votre message vocal" />
          <button type="button" onClick={effacer} aria-label="Supprimer le message vocal" className="rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/10 px-2 py-1.5 text-[#A5473D] hover:bg-[#A5473D]/20">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

/* ═══════════════════ la section ═══════════════════ */

export function ConvocationsSectionV2(p: {
  convos: ConvocationV2[];
  onUpsert: (c: ConvocationV2) => void;
  onSupprimer: (id: string) => void;
  params: ParamsConvocations;
  jourReunion: number; moisIdx: number; annee: number; moisKey: string;
  roster: Member[]; parMembre: Map<string, Member>;
  moisLabel: string;
}) {
  const [form, setForm] = useState<{ type: string; objet: string; message: string }>({ type: p.params.types[0] ?? "Réunion ordinaire", objet: "", message: "" });
  const [choisis, setChoisis] = useState<Set<string>>(() => new Set(p.roster.map((m) => m.id)));
  const [ouvert, setOuvert] = useState<string | null>(p.convos[0]?.id ?? null);
  const [reponse, setReponse] = useState<{ convoId: string; membreId: string; texte: string; vocal: string | null } | null>(null);

  const basculer = (id: string) => {
    setChoisis((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toutOuPersonne = () => {
    setChoisis((prev) => (prev.size === p.roster.length ? new Set<string>() : new Set(p.roster.map((m) => m.id))));
  };

  const envoyer = () => {
    if (!form.objet.trim() || !form.message.trim()) { toast.error("L'objet et le message sont obligatoires"); return; }
    if (choisis.size === 0) { toast.error("Sélectionnez au moins un destinataire"); return; }
    const destinataires: ConvocationV2["destinataires"] = {};
    for (const m of p.roster) if (choisis.has(m.id)) destinataires[m.id] = { statut: "envoyee" };
    const c: ConvocationV2 = {
      id: nid(), type: form.type, objet: form.objet.trim(), message: form.message.trim(),
      le: `${dateCourte()} ${heure()}`, moisKey: p.moisKey, destinataires,
    };
    p.onUpsert(c);
    pushNotif({
      id: `convocation:${c.id}`, le: c.le, destinataire: "tous", destinataireNom: "Tous les membres",
      type: "convocation", titre: `Convocation — ${c.objet}`,
      message: `La secrétaire a convoqué ${choisis.size} membre(s) — type : ${c.type}. Prochaine réunion : ${p.jourReunion} ${MOIS_FR[p.moisIdx]} ${p.annee}. Chacun doit CONFIRMER sa réception ou notifier son absence (texte ou message vocal) depuis sa page.`,
    });
    setForm({ type: form.type, objet: "", message: "" });
    setOuvert(c.id);
    toast.success(`Convocation envoyée à ${choisis.size} membre(s)`, { description: `Type : ${c.type}. Accusés de réception au fil des réponses — les absences non justifiées après confirmation seront amendées (${fcfa(p.params.amendeConfirmeAbsent)}).` });
  };

  const majReponse = (convoId: string, membreId: string, patch: Partial<ConvocationV2["destinataires"][string]>) => {
    const c = p.convos.find((x) => x.id === convoId);
    if (!c) return;
    const dest = { ...c.destinataires, [membreId]: { ...c.destinataires[membreId], ...patch } };
    p.onUpsert({ ...c, destinataires: dest });
  };

  const confirmerReception = (c: ConvocationV2, m: Member) => {
    majReponse(c.id, m.id, { statut: "confirmee", confirmeeLe: `${dateCourte()} ${heure()}`, reponduLe: `${dateCourte()} ${heure()}` });
    pushNotif({
      id: `conv-confirmation:${c.id}:${m.id}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "convocation",
      titre: `Réception confirmée — ${m.name}`,
      message: `${m.name} a confirmé la réception de la convocation « ${c.objet} ». Sans présence à la réunion, la sanction « confirmé puis absent » (${fcfa(p.params.amendeConfirmeAbsent)}) s'appliquera automatiquement.`,
    });
    toast.success(`Réception confirmée — ${m.name}`);
  };

  const envoyerJustification = (c: ConvocationV2, m: Member) => {
    if (!reponse || reponse.convoId !== c.id || reponse.membreId !== m.id) return;
    if (!reponse.texte.trim() && !reponse.vocal) { toast.error("Justifiez votre absence — texte ou message vocal"); return; }
    majReponse(c.id, m.id, {
      statut: "absence",
      reponduLe: `${dateCourte()} ${heure()}`,
      justificationTexte: reponse.texte.trim() || undefined,
      justificationVocal: reponse.vocal,
    });
    pushNotif({
      id: `conv-absence:${c.id}:${m.id}`, le: `${dateCourte()} ${heure()}`,
      destinataire: "president", destinataireNom: "Président", type: "convocation",
      titre: `Absence notifiée — ${m.name}`,
      message: `${m.name} a notifié son absence pour « ${c.objet} ». Justification : ${reponse.vocal ? "message vocal" : "texte"}${reponse.texte.trim() ? ` — « ${reponse.texte.trim()} »` : ""}. Absence EXCUSÉE : pas d'amende, à reporter sur la liste de présence.`,
    });
    setReponse(null);
    toast.success(`Absence notifiée — ${m.name}`, { description: "Justification transmise à la secrétaire et au président — absence excusée." });
  };

  const nbReponses = p.convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut !== "envoyee").length, 0);
  const nbConfirm = p.convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut === "confirmee").length, 0);
  const nbAbs = p.convos.reduce((s, c) => s + Object.values(c.destinataires).filter((r) => r.statut === "absence").length, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <KpiCard icon={<CalendarClock className="h-4 w-4" />} label="Prochaine réunion" value={`${p.jourReunion} ${MOIS_FR[p.moisIdx]}`} sub={`${p.annee} · ${TONTINE.jourLabel}`} accent="#6E4B71" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Sélectionnés" value={String(choisis.size)} sub={`sur ${p.roster.length} membres`} accent="#2F6B45" />
        <KpiCard icon={<Mail className="h-4 w-4" />} label="Convocations" value={String(p.convos.length)} sub="historique complet" accent="#8A6420" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="Réponses reçues" value={String(nbReponses)} sub={`${nbConfirm} confirmées · ${nbAbs} absence(s)`} accent="#3D6B72" />
      </div>

      <Block
        title={`Convocation — réunion du ${p.jourReunion} ${MOIS_FR[p.moisIdx]} ${p.annee}`}
        icon={<Mail className="h-4 w-4" />}
        accent="#6E4B71"
        note="La secrétaire choisit le TYPE de convocation (Paramètres), rédige l'objet et le message, puis sélectionne les destinataires membre par membre. Chaque membre confirme sa réception — ou notifie son absence avec justification texte ou message vocal."
      >
        <div className="space-y-2.5 p-4">
          <div className="flex flex-wrap gap-1.5">
            {p.params.types.map((t) => (
              <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                aria-pressed={form.type === t}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition ${form.type === t ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#C7A9CA] bg-[#F7F1F8] text-[#5A3E5D] hover:border-[#6E4B71]"}`}>
                {t}
              </button>
            ))}
          </div>
          <input value={form.objet} onChange={(e) => setForm((f) => ({ ...f, objet: e.target.value }))}
            placeholder="Objet (ex. : Réunion de novembre — cotisation & remise du mois)" aria-label="Objet de la convocation"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none focus:ring-2 focus:ring-[#6E4B71]/25" />
          <textarea value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={3}
            placeholder="Message : lieu, heure, cotisation à amener, collation assurée par…" aria-label="Message de la convocation"
            className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[13px] placeholder:text-[#8A9288] focus:outline-none focus:ring-2 focus:ring-[#6E4B71]/25" />

          <div className="rounded-xl border border-[#C7A9CA] bg-[#FBF7EA] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-black text-[#5A3E5D]">Destinataires — {choisis.size}/{p.roster.length} sélectionné(s)</p>
              <button type="button" onClick={toutOuPersonne} className="rounded-lg border border-[#C7A9CA] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#5A3E5D] hover:border-[#6E4B71]">
                {choisis.size === p.roster.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.roster.map((m) => {
                const on = choisis.has(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => basculer(m.id)} aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${on ? "border-[#6E4B71] bg-[#6E4B71] text-white" : "border-[#E5DCC0] bg-white text-[#8A9288] hover:border-[#6E4B71]/50"}`}>
                    {on ? <CheckCircle2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {m.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <Btn tone="violet" onClick={envoyer}><Send className="h-4 w-4" /> Envoyer aux {choisis.size} membre(s) sélectionné(s)</Btn>
          <p className="text-[10.5px] font-semibold text-[#8A9288]">Rappel automatique {p.params.rappelJours} jour(s) avant la réunion · sanction si confirmé puis absent : {fcfa(p.params.amendeConfirmeAbsent)}{p.params.sanctionActif ? "" : " (désactivée)"}</p>
        </div>
      </Block>

      <Block title="Convocations envoyées — réponses des membres" icon={<Mail className="h-4 w-4" />} accent="#6E4B71"
        note="Chaque destinataire répond depuis sa page : CONFIRMATION de réception, ou ABSENCE notifiée avec justification texte et/ou message vocal. Un membre qui a CONFIRMÉ et reste absent à la réunion est amendé automatiquement.">
        {p.convos.length === 0 ? (
          <p className="px-4 py-3 text-[12px] font-semibold text-[#8A9288]">Aucune convocation envoyée pour l'instant.</p>
        ) : (
          <div className="divide-y divide-[#E5DCC0]">
            {p.convos.map((c) => {
              const dest = p.roster.filter((m) => c.destinataires[m.id]);
              const nbC = dest.filter((m) => c.destinataires[m.id].statut === "confirmee").length;
              const nbA = dest.filter((m) => c.destinataires[m.id].statut === "absence").length;
              const nbE = dest.length - nbC - nbA;
              const estOuvert = ouvert === c.id;
              return (
                <div key={c.id} className="px-4 py-3">
                  <button type="button" onClick={() => setOuvert(estOuvert ? null : c.id)} aria-expanded={estOuvert}
                    className="flex w-full flex-wrap items-center justify-between gap-1.5 text-left">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-[#2B3530]">{c.objet}</span>
                      <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">{c.type} · envoyée le {c.le} · {dest.length} destinataire(s)</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <P cls={OK_CLS}>{nbC} confirm.</P>
                      <P cls={RJ_CLS}>{nbA} absence(s)</P>
                      <P cls={VI_CLS}>{nbE} attente</P>
                    </span>
                  </button>
                  {estOuvert && (
                    <div className="mt-2 space-y-2">
                      <p className="whitespace-pre-wrap rounded-xl border border-[#E5DCC0] bg-white px-3 py-2 text-[12.5px] leading-relaxed text-[#4A554E]">{c.message}</p>
                      <div className="divide-y divide-[#E5DCC0] rounded-xl border border-[#E5DCC0] bg-[#FBF7EA]">
                        {dest.map((m) => {
                          const r = c.destinataires[m.id];
                          const cls = r.statut === "confirmee" ? OK_CLS : r.statut === "absence" ? RJ_CLS : VI_CLS;
                          const lbl = r.statut === "confirmee" ? `Confirmé le ${r.confirmeeLe ?? r.reponduLe ?? "—"}` : r.statut === "absence" ? `Absence notifiée le ${r.reponduLe ?? "—"}` : "En attente de réponse";
                          return (
                            <div key={m.id} className="px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <p className="text-[12.5px] font-bold text-[#2B3530]">{m.name}{m.id === "f06" ? " (vous)" : ""}</p>
                                <P cls={cls}>{r.statut === "confirmee" ? <CheckCircle2 className="h-3 w-3" /> : r.statut === "absence" ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />} {lbl}</P>
                              </div>
                              {r.justificationTexte && (
                                <p className="mt-1 rounded-lg bg-white px-2.5 py-1.5 text-[11.5px] italic leading-relaxed text-[#4A554E]">« {r.justificationTexte} »</p>
                              )}
                              {r.justificationVocal && (
                                <audio controls src={r.justificationVocal} className="mt-1 h-9 w-full max-w-xs" aria-label={`Message vocal de ${m.name}`} />
                              )}
                              {/* Panneau « réponse du membre » — la démo joue la réponse pour tester le flux complet */}
                              {reponse?.convoId === c.id && reponse.membreId === m.id ? (
                                <div className="mt-2 space-y-2 rounded-xl border-2 border-[#6E4B71]/30 bg-white p-2.5">
                                  <p className="text-[11px] font-black uppercase tracking-wide text-[#6E4B71]">Réponse du membre — notifier son absence</p>
                                  <textarea value={reponse.texte} onChange={(e) => setReponse({ ...reponse, texte: e.target.value })} rows={2}
                                    placeholder="Justifiez votre absence (ex. : déplacement, maladie, voyage…) — facultatif si message vocal"
                                    aria-label={`Justification texte de ${m.name}`}
                                    className="w-full rounded-lg border border-[#C7A9CA] bg-white px-3 py-2 text-[12.5px] placeholder:text-[#8A9288] focus:outline-none" />
                                  <RecorderVocal onResultat={(url) => setReponse({ ...reponse, vocal: url })} />
                                  <div className="flex flex-wrap gap-2">
                                    <Btn small tone="violet" onClick={() => envoyerJustification(c, m)}><Send className="h-3.5 w-3.5" /> Envoyer la justification</Btn>
                                    <Btn small tone="neutre" onClick={() => setReponse(null)}>Annuler</Btn>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {r.statut !== "confirmee" && (
                                    <Btn small tone="violet" onClick={() => confirmerReception(c, m)}><CheckCircle2 className="h-3.5 w-3.5" /> Confirmer la réception</Btn>
                                  )}
                                  {r.statut !== "absence" && (
                                    <Btn small tone="or" onClick={() => setReponse({ convoId: c.id, membreId: m.id, texte: r.justificationTexte ?? "", vocal: r.justificationVocal ?? null })}>
                                      <MessageCircle className="h-3.5 w-3.5" /> Notifier une absence
                                    </Btn>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <BtnConfirme tone="rouge" onConfirmer={() => p.onSupprimer(c.id)} labelConfirmer="Supprimer cette convocation ?">
                          <Trash2 className="h-4 w-4" /> Supprimer
                        </BtnConfirme>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Block>
    </>
  );
}
