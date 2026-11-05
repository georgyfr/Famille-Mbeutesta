# -*- coding: utf-8 -*-
"""Task 59 — Regroupement des épargnes par membre + capital seulement les mois de versement."""

F = "/home/z/my-project/src/components/fc/maquette-president.tsx"
G = "/home/z/my-project/src/components/fc/registres-bureau.ts"

with open(F, "r", encoding="utf-8") as fh:
    lines = fh.readlines()

AP = "\u2019"  # apostrophe typographique utilisée dans le nouveau code


def block(text: str):
    """Découpe un bloc multi-lignes en liste de lignes terminées par \\n."""
    txt = text.rstrip("\n")
    return [l + "\n" for l in txt.split("\n")]


# ─────────────────────────────────────────────────────────────────────────────
# 1) Lignes 2280-2347 : le map des lignes du registre → prêts (inchangé) /
#    épargnes REGROUPÉES PAR MEMBRE (v15)
# ─────────────────────────────────────────────────────────────────────────────
rows_new = block('''
                  {estPrets ? (
                    lignes.map(({ it, moisDepart, interetMois, realise, totalAnnee }) => {
                      const m = p.parMembre.get(it.membreId);
                      const detailOuvert = ouvert === it.id;
                      return (
                        <Fragment key={it.id}>
                          <tr className={`border-b border-[#E5DCC0] ${detailOuvert ? "bg-[#FBF7EA]" : "bg-[#FFFDF6]"}`}>
                            <td className="px-2.5 py-2 font-bold text-[#2B3530]">
                              {m?.name ?? it.membreId}
                              {m && estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’APPX</span>}
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#5C6B60]">{MOIS_FR[moisDepart]}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(it.montant)}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{interetMois > 0 ? `+${fmt(interetMois)}` : "0"}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{fmt(realise)}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(totalAnnee)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setOuvert((x) => (x === it.id ? null : it.id))}
                                aria-expanded={detailOuvert}
                                aria-label={`Voir l’évolution mois par mois du prêt de ${m?.name ?? it.membreId}`}
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 text-[#1F5B3F] transition hover:bg-[#1F5B3F]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => p.onRetirer(it.id)}
                                aria-label={`Retirer l’enregistrement de ${m?.name ?? it.membreId}`}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                          {detailOuvert && (
                            <tr className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                              <td colSpan={8} className="px-3 pb-3 pt-1">
                                <PanneauDetailPret
                                  it={it}
                                  nom={m?.name ?? it.membreId}
                                  taux={p.taux}
                                  duree={dureeEff}
                                  periode={periodeEff}
                                  moisCourantIdx={p.moisCourantIdx}
                                  clos={false}
                                  onAjouterAvance={p.onAjouterAvance}
                                  onRetirerAvance={p.onRetirerAvance}
                                  onConfirmerRemboursement={p.onConfirmerRemboursement}
                                  onFermer={() => setOuvert(null)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    /* — v15 : ÉPARGNES REGROUPÉES PAR MEMBRE — une seule ligne par
                     *    personne, toutes ses épargnes réunies ; le détail déplié
                     *    montre l’évolution de l’ensemble (capital versé seulement
                     *    les mois de versement, intérêts évolutifs chaque mois). — */
                    groupesEpargne.map((g) => {
                      const m = p.parMembre.get(g.membreId);
                      const detailOuvert = ouvert === `e:${g.membreId}`;
                      const plusieurs = g.items.length > 1;
                      return (
                        <Fragment key={`e-${g.membreId}`}>
                          <tr className={`border-b border-[#E5DCC0] ${detailOuvert ? "bg-[#FBF7EA]" : "bg-[#FFFDF6]"}`}>
                            <td className="px-2.5 py-2 font-bold text-[#2B3530]">
                              {m?.name ?? g.membreId}
                              {m && estMembreApp(m) && <span className="ml-1.5 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D6B72]">via l’app</span>}
                              {plusieurs && (
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8A6420]">
                                  {g.items.length} versements regroupés
                                </p>
                              )}
                            </td>
                            <td className="px-2.5 py-2 font-semibold text-[#5C6B60]">
                              {g.items.map((x) => MOIS_FR[Math.min(11, Math.max(0, x.moisIdx))]).join(" · ")}
                            </td>
                            <td className="px-2.5 py-2 text-right font-black text-[#2B3530]">{fmt(g.totalMontant)}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#8A6420]">{g.interetMois > 0 ? `+${fmt(g.interetMois)}` : "0"}</td>
                            <td className="px-2.5 py-2 text-right font-bold text-[#2F6B45]">{fmt(g.realise)}</td>
                            <td className="px-2.5 py-2 text-right font-black text-[#1E4D2B]">{fmt(g.totalAnnee)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => setOuvert((x) => (x === `e:${g.membreId}` ? null : `e:${g.membreId}`))}
                                aria-expanded={detailOuvert}
                                aria-label={`Voir l’évolution mois par mois des épargnes de ${m?.name ?? g.membreId}`}
                                className="mx-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1F5B3F]/30 bg-[#1F5B3F]/8 text-[#1F5B3F] transition hover:bg-[#1F5B3F]/18"
                              >
                                {detailOuvert ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-2 py-2 text-right">
                              {!plusieurs && (
                                <button
                                  type="button"
                                  onClick={() => p.onRetirer(g.items[0].id)}
                                  aria-label={`Retirer l’enregistrement de ${m?.name ?? g.membreId}`}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#A5473D]/30 bg-[#A5473D]/8 text-[#A5473D] transition hover:bg-[#A5473D]/18"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                          {detailOuvert && (
                            <tr className="border-b border-[#E5DCC0] bg-[#FBF7EA]">
                              <td colSpan={8} className="px-3 pb-3 pt-1">
                                <PanneauDetailEpargne
                                  items={g.items}
                                  nom={m?.name ?? g.membreId}
                                  taux={p.taux}
                                  moisCourantIdx={p.moisCourantIdx}
                                  onRetirer={p.onRetirer}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}''')

# correction du placeholder APPX (sécurité anti-collision) → « via l’app »
rows_new = [l.replace("via l’APPX", "via l’app") for l in rows_new]

assert "lignes.map(({ it, moisDepart" in lines[2279], "ancre 2280 introuvable"
assert lines[2346].strip() == "})}", "ancre 2347 inattendue : " + repr(lines[2346])
lines[2279:2347] = rows_new

# ─────────────────────────────────────────────────────────────────────────────
# 2) Insertion de groupesEpargne après la ligne 2195 (totalAnnee)
# ─────────────────────────────────────────────────────────────────────────────
grp_new = block('''
  /* — v15, ÉPARGNES : UNE SEULE LIGNE PAR MEMBRE — toutes ses épargnes
   *    regroupées (Bernadette ne doit plus apparaître deux fois). La ligne
   *    porte le total épargné, les mois réels des versements, les intérêts
   *    du mois (cumul de toutes ses épargnes), les réalisés et la projection ;
   *    le détail déplié montre l’évolution de l’ensemble — capital versé
   *    SEULEMENT les mois de versement, intérêts évolutifs chaque mois. — */
  const groupesEpargne = (() => {
    if (estPrets) return [];
    const parMembreId = new Map<string, AttributionReunion[]>();
    for (const it of itemsActifs) {
      const arr = parMembreId.get(it.membreId);
      if (arr) arr.push(it);
      else parMembreId.set(it.membreId, [it]);
    }
    return [...parMembreId.entries()]
      .map(([membreId, items]) => {
        const tries = [...items].sort((a, b) => a.moisIdx - b.moisIdx || a.montant - b.montant);
        let interetMois = 0;
        let realise = 0;
        let totalAnneeG = 0;
        let totalMontantG = 0;
        for (const it of tries) {
          const i = interetsAttribution(it.montant, p.taux, it.moisIdx, p.moisCourantIdx);
          interetMois += i.interetMois;
          realise += i.realise;
          totalAnneeG += i.totalAnnee;
          totalMontantG += it.montant;
        }
        return { membreId, items: tries, moisDepart: Math.min(11, Math.max(0, tries[0].moisIdx)), interetMois, realise, totalAnnee: totalAnneeG, totalMontant: totalMontantG };
      })
      .sort((a, b) => a.moisDepart - b.moisDepart || a.membreId.localeCompare(b.membreId));
  })();
''')

assert "const totalAnnee = lignes.reduce" in lines[2194], "ancre 2195 introuvable"
lines[2195:2195] = ["\n"] + grp_new

# ─────────────────────────────────────────────────────────────────────────────
# 3) Commentaire des lignes actives (2178-2180)
# ─────────────────────────────────────────────────────────────────────────────
cmt_new = block('''
  /* — lignes du registre ACTIF : chaque prêt + ses intérêts (le prêt
   *    REMBOURSÉ quitte cette liste — il vit dans la section « Prêts
   *    remboursés », plus bas). v15 : les ÉPARGNES ne passent plus par
   *    `lignes` pour le tableau — elles sont REGROUPÉES PAR MEMBRE
   *    (groupesEpargne, plus bas), une seule ligne par personne. — */''')

assert lines[2177].startswith("  /* — lignes du registre ACTIF"), "ancre 2178 introuvable"
lines[2177:2180] = cmt_new

# ─────────────────────────────────────────────────────────────────────────────
# 4) PanneauDetailEpargne : réécriture complète (2060-2133)
# ─────────────────────────────────────────────────────────────────────────────
pan_new = block(f'''
/* — DÉTAIL DES ÉPARGNES D’UN MEMBRE (v15, demande du président) : le panneau
 *    déplié sous la ligne (unique) du membre du registre — TOUTES ses épargnes
 *    sont regroupées ici. L’évolution court mois par mois, du mois du PREMIER
 *    versement jusqu’au DERNIER MOIS DE L’ANNÉE (décembre) :
 *      · « Épargne (capital) » n’apparaît QUE le mois où l’argent a été versé
 *        — les autres mois restent vides (« — ») : on voit les VRAIS
 *        versements, pas la même somme répétée chaque mois (fini l’effet
 *        « Bernadette a cotisé toute l’année ») ;
 *      · les intérêts, eux, évoluent CHAQUE mois (produits du mois, cumulés)
 *        au taux en vigueur, et « Épargne + intérêts » donne la somme totale
 *        atteinte à la fin de chaque mois.
 *    Le mois courant est marqué « réalisé », les suivants « à venir ». — */
function PanneauDetailEpargne(p: {{
  /** TOUTES les épargnes du membre (v15 : regroupées sur une seule ligne). */
  items: AttributionReunion[];
  nom: string;
  taux: number;
  moisCourantIdx: number | null;
  /** Retire UN versement précis du registre (poubelle sur chaque pastille). */
  onRetirer?: (id: string) => void;
}}) {{
  const moisDe = (v: AttributionReunion) => Math.min(11, Math.max(0, v.moisIdx));
  const versements = [...p.items].sort((a, b) => a.moisIdx - b.moisIdx || a.montant - b.montant);
  const depart = versements.length > 0 ? moisDe(versements[0]) : 0;
  const interetDe = (v: AttributionReunion) => Math.round(v.montant * (p.taux / 100));
  const capitalTotal = versements.reduce((s, v) => s + v.montant, 0);
  /* — versements regroupés par mois : « Épargne (capital) » ne s’allume que là — */
  const parMois = new Map<number, {{ total: number; nb: number }}>();
  for (const v of versements) {{
    const m = moisDe(v);
    const cur = parMois.get(m) ?? {{ total: 0, nb: 0 }};
    parMois.set(m, {{ total: cur.total + v.montant, nb: cur.nb + 1 }});
  }}
  const lignes: {{ moisIdx: number; versement: number; nbVersements: number; interet: number; cumul: number; capital: number; total: number }}[] = [];
  let cumul = 0;
  let capital = 0;
  for (let m = depart; m <= 11; m++) {{
    const dep = parMois.get(m);
    capital += dep?.total ?? 0;
    const interet = versements.filter((v) => moisDe(v) <= m).reduce((s, v) => s + interetDe(v), 0);
    cumul += interet;
    lignes.push({{ moisIdx: m, versement: dep?.total ?? 0, nbVersements: dep?.nb ?? 0, interet, cumul, capital, total: capital + cumul }});
  }}
  const realiseJusque = p.moisCourantIdx == null ? depart - 1 : Math.min(11, Math.max(-1, p.moisCourantIdx));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-black uppercase tracking-wide text-[#1E4D2B]">
          Évolution mois par mois — épargnes de {{p.nom}}
        </p>
        <span className="rounded-full border border-[#B8A87E] bg-white px-2 py-0.5 text-[11px] font-black text-[#4A554E]">{{p.taux}} %/mois</span>
      </div>
      <p className="text-[12px] font-semibold leading-relaxed text-[#4A554E]">
        {{versements.length}} versement{{versements.length > 1 ? "s" : ""}} au registre — {{fcfa(capitalTotal)}} épargné{{versements.length > 1 ? "s au total" : ""}}. L’évolution court du mois du premier versement ({{MOIS_FR[depart]}}) jusqu’au DERNIER MOIS DE L’ANNÉE (décembre) : le capital n’apparaît QUE les mois où l’argent a été versé — les autres mois restent vides — tandis que les intérêts, eux, évoluent chaque mois au taux de {{p.taux}} %.
      </p>
      {{/* — les versements RÉELS du membre : chaque pastille porte sa poubelle — */}}
      <div className="flex flex-wrap gap-1.5">
        {{versements.map((v) => {{
          const mi = moisDe(v);
          return (
            <span key={{v.id}} className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6B45]/40 bg-[#2F6B45]/8 py-1 pl-2.5 pr-1.5 text-[11.5px] font-black text-[#255C3A]">
              <PiggyBank className="h-3.5 w-3.5 shrink-0" />
              {{MOIS_FR[mi]}} — {{fcfa(v.montant)}}
              {{p.onRetirer && (
                <button
                  type="button"
                  onClick={{() => p.onRetirer?.(v.id)}}
                  aria-label={{`Retirer le versement de ${{MOIS_FR[mi]}} (${{fcfa(v.montant)}}) du registre`}}
                  title="Retirer ce versement du registre"
                  className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#A5473D]/35 bg-white text-[#A5473D] transition hover:bg-[#A5473D]/12"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}}
            </span>
          );
        }})}}
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-[#B8A87E] bg-white">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#3D6B72] text-white">
              <th className="px-3 py-2.5 text-left text-[12.5px] font-black uppercase tracking-wide">Date (mois)</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Épargne (capital)</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Intérêts du mois</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Intérêts cumulés</th>
              <th className="px-3 py-2.5 text-right text-[12.5px] font-black uppercase tracking-wide">Épargne + intérêts</th>
            </tr>
          </thead>
          <tbody>
            {{lignes.map((l, i) => {{
              const realise = l.moisIdx <= realiseJusque;
              return (
                <tr key={{i}} className={{`border-b-2 border-[#E5DCC0] ${{realise ? "bg-[#FFFDF6]" : "bg-white"}}`}}>
                  <td className="px-3 py-2.5 font-bold text-[#2B3530]">
                    {{MOIS_FR[l.moisIdx]}}
                    <span className={{`ml-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${{realise ? "border-[#2F6B45]/45 bg-[#2F6B45]/12 text-[#255C3A]" : "border-[#B8A87E] bg-white text-[#4A554E]"}}`}}>
                      {{realise ? "réalisé" : "à venir"}}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[#2B3530]">
                    {{l.versement > 0 ? (
                      <>
                        +{{fmt(l.versement)}}
                        {{l.nbVersements > 1 && <span className="ml-1 rounded-full bg-[#3D6B72]/12 px-1.5 py-0.5 text-[10px] font-black text-[#3D6B72]">×{{l.nbVersements}}</span>}}
                      </>
                    ) : (
                      <span className="text-[#B9C0B7]">—</span>
                    )}}
                  </td>
                  <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{{l.interet > 0 ? `+${{fmt(l.interet)}}` : "0"}}</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{{fmt(l.cumul)}}</td>
                  <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]">{{fmt(l.total)}}</td>
                </tr>
              );
            }})}}
            <tr className="bg-[#3D6B72]/14">
              <td className="px-3 py-2.5 font-black text-[#243B41]">Au 31 décembre</td>
              <td className="px-3 py-2.5 text-right font-black text-[#2B3530]">{{fmt(capitalTotal)}}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">+{{fmt(cumul)}}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#7A5210]">{{fmt(cumul)}}</td>
              <td className="px-3 py-2.5 text-right font-black text-[#1E4D2B]">{{fmt(capitalTotal + cumul)}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}}''')

assert lines[2059].startswith("/* — DÉTAIL D'UNE ÉPARGNE"), "ancre 2060 introuvable"
assert lines[2132].rstrip() == "}", "ancre 2133 inattendue"
lines[2059:2133] = pan_new

# ─────────────────────────────────────────────────────────────────────────────
# 5) noteRegistre des épargnes (ligne 1836 — apostrophes ASCII ici)
# ─────────────────────────────────────────────────────────────────────────────
note_new = '    noteRegistre: "Chaque ligne = UN membre, TOUTES ses épargnes regroupées (plusieurs versements ne créent jamais de doublon) : la somme totale épargnée, les mois réels des versements, les intérêts produits chaque mois au taux en vigueur et la projection au 31 décembre. Dépliez la ligne (chevron Détail) pour voir l\'ÉVOLUTION MOIS PAR MOIS de toutes ses épargnes : le capital n\'apparaît QUE les mois où l\'argent a été versé — les autres mois restent vides — tandis que les intérêts, eux, évoluent chaque mois jusqu\'au DERNIER MOIS DE L\'ANNÉE (décembre).",\n'

assert "noteRegistre: \"Chaque ligne = l" in lines[1835], "ancre 1836 introuvable"
lines[1835:1836] = [note_new]

with open(F, "w", encoding="utf-8") as fh:
    fh.writelines(lines)

# ─────────────────────────────────────────────────────────────────────────────
# 6) registres-bureau.ts : 2ᵉ épargne de démonstration pour Bernadette (f04)
# ─────────────────────────────────────────────────────────────────────────────
with open(G, "r", encoding="utf-8") as fh:
    gsrc = fh.read()

old_demo = '''const EPARGNES_REUNION_DEMO: AttributionReunion[] = [
  { id: "ar-e1", membreId: "f04", montant: 25_000, moisIdx: 1 }, // février
  { id: "ar-e2", membreId: "f06", montant: 15_000, moisIdx: 3 }, // avril
];'''
new_demo = '''const EPARGNES_REUNION_DEMO: AttributionReunion[] = [
  { id: "ar-e1", membreId: "f04", montant: 25_000, moisIdx: 1 }, // février
  { id: "ar-e2", membreId: "f06", montant: 15_000, moisIdx: 3 }, // avril
  { id: "ar-e3", membreId: "f04", montant: 15_000, moisIdx: 6 }, // juillet — 2e épargne de Bernadette (v15 : regroupées sur UNE ligne)
];'''
assert old_demo in gsrc, "démo épargnes introuvable"
gsrc = gsrc.replace(old_demo, new_demo)

with open(G, "w", encoding="utf-8") as fh:
    fh.write(gsrc)

print("OK — patch appliqué")
