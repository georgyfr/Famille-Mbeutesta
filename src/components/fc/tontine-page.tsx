"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Page « Tontine familiale » — Famille.Mbeutetsa — révision professionnelle
//
// UNE SEULE tontine, présente par défaut : ni liste de tontines, ni assistant
// de création. La page est un tableau de bord d'association, entièrement en
// tableaux, dont CHAQUE page a sa propre URL :
//
//   #tontine                 → Réunions : calendrier de l'année (le 2ᵉ dimanche
//                              de chaque mois porte un point), bénéficiaires,
//                              règles — le nom du bénéficiaire apparaît le
//                              moment venu.
//   #tontine/membres         → Membres : bureau + membres simples (rôle
//                              affiché dès la sélection d'un membre).
//   #tontine/president       → Page du Président
//   #tontine/vice-president  → Page du Vice-président
//   #tontine/commissaire     → Page du Commissaire aux comptes
//   #tontine/tresorier       → Page du Trésorier (journal de caisse, caisses)
//   #tontine/censeur         → Page du Censeur
//   #tontine/cotisations     → Mes finances · Mes épargnes (dépôts mois par
//                              mois, taux paramétrable, intérêts simples
//                              jusqu'en décembre)
//   #tontine/dettes         → Mes finances · Mes prêts (argent emprunté à la
//                              réunion : 3 mois d'intérêts puis capitalisation)
//                              — l'univers FINANCES porte la couleur sarcelle
//                              (#3D6B72) pour se distinguer du reste (vert).
//   #tontine/stats           → Statistiques (chiffres clés, donut, barres,
//                              classement, projection)
//
// Anciens liens partagés redirigés : #tontine/receveur → réunions,
// #tontine/caisses → trésorier, #tontine/reglement → réunions,
// #tontine-cotisations → mes épargnes, #tontine-stats → statistiques.
//
// Les données (10 membres fictifs en attente d'activation + « Vous », 2ᵉ
// dimanches, montants, journal de caisse) viennent de `tontine-data.ts` :
// tous les calculs affichés en sont dérivés, jamais codés en dur.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, AudioLines, BarChart3, CalendarDays, Check, ChevronRight, Coins, Coffee, Crown, Eye,
  ClipboardList, FileSearch, FileText, Flag, Gift, HandCoins, Hourglass, Info, Lock, MapPin, MapPinned, MessageCircle, Mic, Navigation, PencilLine, Percent, Phone, PiggyBank, Plus,
  ScrollText, Share2, ShieldAlert, Square, Stamp, Trash2, TrendingUp, UserCheck, Users, Wallet, X,
} from "lucide-react";
import { api } from "@/lib/fc-client";
import { googleMapsDirectionsUrl, osmViewUrl, type LocationDraft } from "@/lib/fc-geo";
import { LocationWizard } from "./location-wizard";
import { FcButton, FcCard, FcSpinner } from "./ui";
import {
  DELAI_VALIDATION_JOURS, RAPPEL_SIGNALEMENT_JOURS,
  appliqueAutoValidations, appliqueAutoValidationsDecisions, bureauValide, collecterRappels,
  dateCourte, deposerSignalement, enAttenteMembre, enregistrerDecisionTaux, estBureau, joursDepuis,
  libelleMotif, loadDecisions, loadSignalements, loadVousRole, MOTIFS_SIGNALEMENT,
  membrePeutSupprimer, membreValide, peutGererDettes, peutGererTaux,
  peutTraiterSignalements, peutValiderEpargnes, saveDecisions, saveSignalements,
  signalementsOuverts, traiterSignalement,
  type DecisionTaux, type MotifSignalement, type Signalement,
} from "./tontine-bureau";
import {
  ANOMALIES, MOIS_FR_SHORT, MISSIONS, ROLE_META, SUPPLEANCES, TAUX_DEFAUT, TONTINE,
  buildAnnee, buildRoster, caissesDuMoment, classementCotisants, collationMensuelle,
  detteParPersonne, dettePretAuMois, etatReunion, interetEpargneMois, isoDate,
  journalDeCaisse, joursAvant, loadEpargnes, loadMontants, loadPayes, loadPrets, loadTaux, moisDuTour,
  moisCourantAnnee, moisEcoules, potMensuel, projectionAnnee, saveEpargnes, saveMontants, savePrets, saveTaux,
  soldeEpargneAuMois, statutMembreDuMois, uid,
  type Epargne, type Member, type Payes, type Pret, type ReglagesTontine, type RoleKey, type TourMois,
} from "./tontine-data";

/* ══════════════════════════ petits utilitaires ══════════════════════════ */

const fmtFcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const fmtN = (n: number) => n.toLocaleString("fr-FR");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const prenom = (m: Member) => m.name.split(" ")[0];
const fmtTaux = (t: number) => `${String(t).replace(".", ",")} %`;

function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtDateCourte(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return iso;
  }
}

function Chip({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-bold ${cls}`}>{children}</span>;
}

const CHIP_OK = "bg-[#2F6B45]/12 text-[#2F6B45] border-[#2F6B45]/30";
const CHIP_GOLD = "bg-[#C89F62]/18 text-[#8A6420] border-[#C89F62]/45";
const CHIP_NEUTRE = "bg-[#2A4A3A]/8 text-[#5C6B60] border-[#E5DCC0]";
const CHIP_ROUGE = "bg-[#A5473D]/10 text-[#A5473D] border-[#A5473D]/30";
const CHIP_TEAL = "bg-[#3D6B72]/10 text-[#3D6B72] border-[#3D6B72]/30";

const AVATAR_COLORS = ["#1E4D2B", "#2F6B45", "#3D6B72", "#8A6420", "#B85C33", "#5C6B60"];

function Avatar({ m, size = 32 }: { m: Member; size?: number }) {
  let h = 0;
  for (let i = 0; i < m.id.length; i++) h = (h * 31 + m.id.charCodeAt(i)) >>> 0;
  const bg = m.isVous ? "#C89F62" : AVATAR_COLORS[h % AVATAR_COLORS.length];
  const initials = m.name.split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, background: bg, fontSize: Math.max(11, size * 0.38), color: m.isVous ? "#2B2416" : "#fff" }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
    >
      {initials}
    </span>
  );
}

/* Styles de tableaux — en-tête vert, lignes zébrées crème */
const TH = "px-2.5 py-2 text-left text-[10.5px] font-bold uppercase tracking-wide";
const TD = "px-2.5 py-2 align-middle";
const TDC = "px-2 py-2 text-center align-middle";

function TableWrap({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={`mt-3 overflow-x-auto rounded-xl border ${className ?? "border-[#E5DCC0]"}`} role="region" aria-label={label}>
      <table className="w-full min-w-max border-collapse text-[12px]">{children}</table>
    </div>
  );
}

function Block({ title, icon, chip, note, children }: {
  title: string; icon: React.ReactNode; chip?: React.ReactNode; note?: string; children: React.ReactNode;
}) {
  return (
    <FcCard className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="fc-serif flex items-center gap-2 text-[16px] font-bold text-[#1E4D2B]">
          <span className="text-[#C89F62]">{icon}</span>
          {title}
        </h2>
        {chip}
      </div>
      {note && <p className="mt-1 text-[12px] leading-relaxed text-[#8A9288]">{note}</p>}
      {children}
    </FcCard>
  );
}

function MiniKpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">{label}</p>
      <p className={`text-[14.5px] font-bold leading-tight ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10.5px] leading-snug text-[#8A9288]">{sub}</p>}
    </div>
  );
}

const ROLE_ICON: Record<RoleKey, React.ComponentType<{ className?: string }>> = {
  president: Crown,
  vice_president: UserCheck,
  secretariat: FileText,
  commissaire: FileSearch,
  tresorier: Wallet,
  censeur: Eye,
  membre: Users,
};

/* ══════════════════════════ routeur — chaque page a son URL ══════════════════════════ */

type TPage =
  | "reunion" | "membres" | "cotisations" | "dettes" | "stats"
  | "president" | "vice_president" | "secretariat" | "commissaire" | "tresorier" | "censeur";

type BureauPage = Exclude<RoleKey, "membre">;

const PAGES_BUREAU: TPage[] = ["president", "vice_president", "secretariat", "commissaire", "tresorier", "censeur"];

const HASH_ALIASES: Record<string, TPage> = {
  reunion: "reunion", membres: "membres",
  cotisations: "cotisations", epargnes: "cotisations", epargne: "cotisations", historique: "cotisations",
  finances: "cotisations", finance: "cotisations",
  dettes: "dettes", prets: "dettes", pret: "dettes",
  stats: "stats", president: "president", "vice-president": "vice_president",
  secretaire: "secretariat", secretariat: "secretariat",
  commissaire: "commissaire", tresorier: "tresorier", censeur: "censeur",
  // Anciens liens partagés (avant la refonte) — redirigés vers la page la plus proche
  receveur: "reunion", caisses: "tresorier", reglement: "reunion",
};

function routeFromHash(): TPage {
  try {
    const h = (window.location.hash || "").toLowerCase();
    if (h === "#cotisation" || h === "#cotisations" || h === "#tontine-cotisations") return "cotisations";
    if (h === "#tontine-stats") return "stats";
    if (h === "#tontine" || h === "#tontine/") return "reunion";
    if (h.startsWith("#tontine/")) {
      const sub = h.slice("#tontine/".length).replace(/\/+$/, "");
      return HASH_ALIASES[sub] ?? "reunion";
    }
  } catch {
    /* ignore */
  }
  return "reunion";
}

function hashFor(p: TPage): string {
  if (p === "reunion") return "#tontine";
  if (p === "vice_president") return "#tontine/vice-president";
  return `#tontine/${p}`;
}

/* ══════════════════════════ composant principal ══════════════════════════ */

export function TontinePage({ onBack, vousName, vousPhone }: { onBack: () => void; vousName?: string | null; vousPhone?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState<TPage>("reunion");
  const [payes, setPayes] = useState<Payes>({});
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  // Rôle renseigné à l'inscription — détermine les droits (taux, validations,
  // dettes) et la page du bureau qui est « la vôtre ».
  const [vousRole, setVousRole] = useState<RoleKey | null>(null);
  // Signalements — version incrémentée à chaque mutation pour rafraîchir les
  // blocs qui y réagissent (bannières, badges, blocs du bureau).
  const [sigVersion, setSigVersion] = useState(0);
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [signaler, setSignaler] = useState<{ cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string } | null>(null);
  // Montants de la tontine — version incrémentée quand le bureau les règle :
  // tout le calendrier (sommes, collations, totaux) est recalculé aussitôt.
  const [montVersion, setMontVersion] = useState(0);

  useEffect(() => {
    const sync = () => setPage(routeFromHash());
    window.addEventListener("hashchange", sync);
    // Après peinture : synchronisation initiale + suivi personnel (localStorage)
    const t = setTimeout(() => {
      sync();
      setPayes(loadPayes());
      // Montants réglés par le bureau (cotisation, collation, frais, pénalités)
      // appliqués AVANT la construction du calendrier.
      loadMontants();
      const role = loadVousRole() ?? "membre";
      setVousRole(role);
      // Rappels de signalements — TOUS LES 3 JOURS la notification réapparaît
      // tant que le bureau n'a pas traité le problème signalé.
      const dus = collecterRappels(loadSignalements());
      setSignalements(loadSignalements());
      if (dus.length > 0) {
        const bureautif = estBureau(role);
        for (const s of dus) {
          toast.warning(`Rappel de signalement — ${s.cibleLabel}`, {
            description: bureautif
              ? `Signalé par ${s.auteur} le ${dateCourte(s.creeLe)} — « ${libelleMotif(s.motif)} ». À traiter dans la page de votre bureau.`
              : `Le bureau a été notifié à nouveau (rappel tous les ${RAPPEL_SIGNALEMENT_JOURS} jours).`,
            duration: 8000,
          });
        }
      }
      setMounted(true);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const roster = useMemo(() => buildRoster(vousName, vousRole), [vousName, vousRole]);
  // Le calendrier est reconstruit quand les montants du bureau changent : les
  // sommes du mois, les collations et les totaux reflètent le nouveau réglage.
  const annee = useMemo(
    () => (mounted ? (loadMontants(), buildAnnee(new Date().getFullYear(), roster)) : []),
    [mounted, roster, montVersion],
  );
  const roleActif: RoleKey = vousRole ?? "membre";
  const ouverts = signalementsOuverts(signalements);

  const goPage = (p: TPage) => {
    setPage(p);
    try {
      const h = hashFor(p);
      if (window.location.hash !== h) window.history.replaceState(null, "", h);
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Rafraîchit l'état des signalements après une mutation (dépôt, traitement). */
  const refreshSignalements = () => {
    setSignalements(loadSignalements());
    setSigVersion((v) => v + 1);
  };

  if (!mounted || annee.length === 0) {
    return (
      <div className="space-y-4">
        <EntetePage />
        <div className="flex justify-center py-10 text-[#2A4A3A]" role="status" aria-label="Chargement de la tontine">
          <FcSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <EntetePage vousRole={roleActif} onGo={goPage} nbOuverts={ouverts.length} sigVersion={sigVersion} />

      <OngletsPrincipaux page={page} onGo={goPage} />
      <OngletsBureau page={page} onGo={goPage} vousRole={roleActif} nbSignalementsOuverts={ouverts.length} />

      {/* Bannière de rappel — les signalements ouverts reviennent tous les 3 jours
          jusqu'à traitement par le bureau. */}
      {ouverts.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#B85C33]/40 bg-[#B85C33]/10 p-3 text-[12px] leading-relaxed text-[#B85C33]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>{ouverts.length} signalement{ouverts.length > 1 ? "s" : ""} en attente</strong> — tous les membres du bureau sont notifiés, et la
            notification réapparaît tous les {RAPPEL_SIGNALEMENT_JOURS} jours jusqu’au traitement.
            {estBureau(roleActif)
              ? " Traitez-les depuis la page de votre rôle ci-dessous."
              : " Le bureau vous tiendra informé(e) de la suite donnée."}
          </p>
        </div>
      )}

      {page === "reunion" && <ReunionPage annee={annee} roster={roster} vousPhone={vousPhone} />}
      {page === "membres" && (
        <MembresPage
          annee={annee} roster={roster} payes={payes}
          selected={selectedMember} onSelect={setSelectedMember} onGoRole={goPage}
        />
      )}
      {PAGES_BUREAU.includes(page) && (
        <RolePage
          role={page as BureauPage} annee={annee} roster={roster} payes={payes}
          vousRole={roleActif} vousName={vousName} sigVersion={sigVersion}
          onSignaler={(c) => setSignaler(c)}
          onMontantsChange={() => setMontVersion((v) => v + 1)}
        />
      )}
      {page === "cotisations" && (
        <EpargnesPage
          annee={annee} onSub={goPage} vousRole={roleActif} vousName={vousName}
          sigVersion={sigVersion} onSignaler={(c) => setSignaler(c)}
        />
      )}
      {page === "dettes" && (
        <PretsPage
          annee={annee} onSub={goPage} vousRole={roleActif} vousName={vousName}
          sigVersion={sigVersion} onSignaler={(c) => setSignaler(c)}
        />
      )}
      {page === "stats" && <StatsPage annee={annee} roster={roster} payes={payes} />}

      <FcButton variant="outline" onClick={onBack} className="w-full">
        <ArrowLeft className="h-4 w-4" /> Retour à l&apos;accueil
      </FcButton>

      {/* Pop-up de signalement — enregistré, notifié à tout le bureau, rappelé
          tous les 3 jours jusqu’à traitement. */}
      {signaler && (
        <SignalementModal
          cible={signaler.cible}
          cibleId={signaler.cibleId}
          cibleLabel={signaler.cibleLabel}
          auteur={vousName ?? ""}
          auteurRole={roleActif}
          onClose={() => setSignaler(null)}
          onDepose={() => {
            setSignaler(null);
            refreshSignalements();
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════ en-tête + onglets ══════════════════════════ */

function EntetePage({ vousRole = "membre", onGo, nbOuverts = 0, sigVersion = 0 }: {
  vousRole?: RoleKey; onGo?: (p: TPage) => void; nbOuverts?: number; sigVersion?: number;
}) {
  void sigVersion; // le badge se rafraîchit à chaque mutation de signalement
  const meta = ROLE_META[vousRole];
  const Icon = ROLE_ICON[vousRole];
  const laVotre = vousRole !== "membre";
  return (
    <FcCard className="overflow-hidden">
      <div className="flex items-center gap-3 bg-[#1E4D2B] px-5 py-4 text-white">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C89F62] text-[#2B2416]">
          <PiggyBank className="h-5.5 w-5.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="fc-serif text-[18px] font-bold leading-tight">Tontine familiale</p>
          <p className="text-[12px] opacity-85">Une seule tontine · réunion le 2ᵉ dimanche de chaque mois</p>
        </div>
        {nbOuverts > 0 && onGo && (
          <button
            onClick={() => onGo("president")}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 transition-colors hover:bg-white/20"
            aria-label={`${nbOuverts} signalement${nbOuverts > 1 ? "s" : ""} en attente — voir le bureau`}
            title={`${nbOuverts} signalement${nbOuverts > 1 ? "s" : ""} en attente`}
          >
            <ShieldAlert className="h-5 w-5 text-[#F5C8B8]" />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#A5473D] px-1 text-[9px] font-bold text-white">
              {nbOuverts > 9 ? "9+" : nbOuverts}
            </span>
          </button>
        )}
      </div>
      {/* Le rôle joué dans la cantine — renseigné à l'inscription, il ouvre la
          page du bureau correspondante (URL dédiée). */}
      <div className="flex items-center justify-between gap-2 border-t border-[#E5DCC0] bg-[#FFFDF6] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Chip cls={meta.badge}>
            <Icon className="h-3 w-3" /> {meta.label}
          </Chip>
          <span className="truncate text-[11px] text-[#8A9288]">
            {laVotre ? "votre page du bureau est ci-dessous" : "membre simple — vous validez les décisions du bureau"}
          </span>
        </div>
        {laVotre && onGo && (
          <button
            onClick={() => onGo(vousRole as BureauPage)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-[#1E4D2B] underline decoration-[#C89F62] decoration-2 underline-offset-2 hover:bg-[#C89F62]/15"
          >
            Ma page →
          </button>
        )}
      </div>
    </FcCard>
  );
}

const ONGLETS_PRINCIPAUX: { key: TPage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "reunion", label: "Réunions", icon: CalendarDays },
  { key: "membres", label: "Membres", icon: Users },
  { key: "cotisations", label: "Mes finances", icon: Wallet },
  { key: "stats", label: "Statistiques", icon: BarChart3 },
];

/** L'univers FINANCES porte sa propre couleur — sarcelle #3D6B72 — pour se
 *  différencier du vert de la tontine (réunions, membres, statistiques). */
const FINANCES_ACCENT = "#3D6B72";
const PRETS_ACCENT = "#B85C33";

function OngletsPrincipaux({ page, onGo }: { page: TPage; onGo: (p: TPage) => void }) {
  const actif = page === "dettes" ? "cotisations" : page;
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-1.5" role="tablist" aria-label="Pages de la tontine">
      {ONGLETS_PRINCIPAUX.map(({ key, label, icon: Icon }) => {
        const on = actif === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={on}
            onClick={() => onGo(key)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10.5px] font-bold leading-tight transition-all sm:text-[12px] ${
              on ? "text-white shadow-sm" : "text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
            }`}
            style={on ? { background: key === "cotisations" ? FINANCES_ACCENT : "#1E4D2B" } : undefined}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function OngletsBureau({ page, onGo, vousRole, nbSignalementsOuverts }: {
  page: TPage; onGo: (p: TPage) => void; vousRole: RoleKey; nbSignalementsOuverts: number;
}) {
  const boutons: { key: TPage; label: string; role: RoleKey }[] = [
    { key: "president", label: "Président", role: "president" },
    { key: "vice_president", label: "Vice-prés.", role: "vice_president" },
    { key: "secretariat", label: "Secrétaire", role: "secretariat" },
    { key: "commissaire", label: "Commissaire", role: "commissaire" },
    { key: "tresorier", label: "Trésorier", role: "tresorier" },
    { key: "censeur", label: "Censeur", role: "censeur" },
  ];
  return (
    <div>
      <p className="mb-1 flex flex-wrap items-center gap-x-2 px-1 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">
        <span>Le bureau de l&apos;association — chaque rôle a sa page</span>
        {nbSignalementsOuverts > 0 && (
          <span className="inline-flex items-center gap-1 normal-case text-[#B85C33]">
            <ShieldAlert className="h-3 w-3" /> {nbSignalementsOuverts} signalement{nbSignalementsOuverts > 1 ? "s" : ""}
          </span>
        )}
      </p>
      {/* 6 rôles en 2 rangées de 3 — l'app tient sur max-w-md, 6 colonnes
          serreraient trop les libellés, quelle que soit la largeur de l'écran. */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-1.5" role="tablist" aria-label="Pages des rôles du bureau">
        {boutons.map(({ key, label, role }) => {
          const Icon = ROLE_ICON[role];
          const on = page === key;
          const laVotre = vousRole === role;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={on}
              onClick={() => onGo(key)}
              className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold leading-tight transition-all sm:text-[11.5px] ${
                on ? "bg-[#1E4D2B] text-white shadow-sm" : "text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
              }`}
            >
              <Icon className={`h-4 w-4 ${on ? "text-[#C89F62]" : "text-[#8A6420]"}`} />
              <span className="truncate">{label}</span>
              {laVotre && (
                <span aria-hidden="true" className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#C89F62]" title="Votre rôle — vos outils sont ici" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════ page RÉUNIONS — calendrier de l'année ══════════════════════════ */

function ReunionPage({ annee, roster, vousPhone }: { annee: TourMois[]; roster: Member[]; vousPhone?: string | null }) {
  // Fiche réunion : s'ouvre quand on touche un mois du calendrier ou une ligne du tableau
  const [fiche, setFiche] = useState<TourMois | null>(null);
  // Informations du bénéficiaire du mois — pop-up « Voir ses informations » :
  // téléphone, quartier, géolocalisation, itinéraire GPS et partage.
  const [infos, setInfos] = useState(false);
  const vousId = roster.find((m) => m.isVous)?.id ?? "vous";
  const courant = annee.find((t) => t.etat === "courant") ?? annee[0];
  const er = etatReunion(courant);
  const jr = joursAvant(courant);
  const pot = potMensuel(roster.length);

  const regles: [string, string][] = [
    ["Cotisation mensuelle", `${fmtN(TONTINE.montantCotisation)} FCFA par membre et par réunion`],
    ["Collation", `${fmtN(TONTINE.montantCollation)} FCFA par personne et par réunion`],
    ["Jour de réunion", cap(TONTINE.jourLabel)],
    ["Lieu", "Chez le bénéficiaire du mois"],
    ["Somme du mois", `${fmtN(pot)} FCFA — ${roster.length - 1} cotisants × ${fmtN(TONTINE.montantCotisation)}`],
    ["Frais d'adhésion", `${fmtN(TONTINE.fraisAdhesion)} FCFA une seule fois — caisse sociale`],
    ["Tours de l'année", "11 tours (janvier → novembre) + assemblée générale en décembre"],
    ["Pénalités", `Retard ${fmtN(TONTINE.penaliteRetard)} · Absence non excusée ${fmtN(TONTINE.penaliteAbsence)} — versées à la caisse sociale`],
  ];

  return (
    <div className="space-y-3.5">
      {/* Bannière — réunion du mois. AFFICHAGE UNIQUEMENT (non cliquable) :
          les informations du bénéficiaire sont dans la section « Voir ses
          informations » juste en dessous. */}
      <FcCard className="overflow-hidden">
        <div>
          <div className="bg-[#1E4D2B] px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-wide opacity-80">
                  {courant.ag ? "Décembre — clôture de l'année" : `Réunion de ${courant.mois}`}
                </p>
                <p className="fc-serif mt-0.5 text-[17px] font-bold capitalize">{fmtDateLong(courant.iso)}</p>
                <p className="mt-0.5 text-[12.5px] opacity-90">
                  {courant.ag
                    ? "Bilan de l'année, rapport du commissaire aux comptes et fête de fin d'année"
                    : courant.beneficiary?.isVous
                      ? "Votre tour — vous recevez la réunion !"
                      : `Chez ${prenom(courant.beneficiary!)} — ${prenom(courant.beneficiary!)} reçoit la réunion`}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <Chip cls={er === "passee" ? "border-transparent bg-[#2F6B45] text-white" : er === "aujourdhui" ? "border-transparent bg-[#C89F62] text-[#2B2416]" : "border-white/25 bg-white/12 text-white"}>
                  {er === "passee" ? "Réunion tenue ✓" : er === "aujourdhui" ? "Aujourd'hui !" : `Dans ${jr} jour${jr > 1 ? "s" : ""}`}
                </Chip>
              </span>
            </div>
          </div>
          {!courant.ag && (
            <div className="grid grid-cols-3 divide-x divide-[#E5DCC0] bg-[#FFFDF6] text-center">
              <div className="px-2 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Somme du mois</p>
                <p className="text-[13.5px] font-bold text-[#1E4D2B]">{fmtN(courant.pot)}</p>
              </div>
              <div className="px-2 py-2.5">
                <p className="flex items-center justify-center gap-1 text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">
                  <Coffee className="h-3 w-3" /> Collation
                </p>
                <p className="text-[13.5px] font-bold text-[#B85C33]">{fmtN(courant.collation)}</p>
              </div>
              <div className="px-2 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Total à collecter</p>
                <p className="text-[13.5px] font-bold text-[#2F6B45]">{fmtN(courant.total)}</p>
              </div>
            </div>
          )}
          {/* Voir ses informations — le numéro de téléphone et la géolocalisation
              du bénéficiaire : appeler, se guider par GPS, partager l'adresse.
              Quand le bénéficiaire c'est vous : modification de vos coordonnées. */}
          {!courant.ag && courant.beneficiary && (
            <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
              <FcButton variant="outline" className="w-full" onClick={() => setInfos(true)}>
                <Info className="h-4 w-4" />
                {courant.beneficiary.isVous
                  ? "Voir mes informations — contact & géolocalisation"
                  : `Voir ses informations — contact de ${prenom(courant.beneficiary)}`}
              </FcButton>
              <p className="mt-1.5 text-center text-[10.5px] leading-relaxed text-[#8A9288]">
                Téléphone, quartier et géolocalisation — pour appeler, s&apos;orienter et arriver directement chez {courant.beneficiary.isVous ? "vous" : prenom(courant.beneficiary)}.
              </p>
            </div>
          )}
        </div>
      </FcCard>

      {/* Calendrier de l'année — un point marque le 2ᵉ dimanche ; un clic ouvre la fiche */}
      <Block
        title={`Calendrier de l'année ${annee[0].annee}`}
        icon={<CalendarDays className="h-4.5 w-4.5" />}
        note="La réunion a lieu le 2ᵉ dimanche de chaque mois. Touchez un calendrier ou son bouton « Voir » : le pop-up s'ouvre — qui reçoit la réunion, son numéro, son lieu, et ce que chacun verse."
      >
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {annee.map((t) => <MiniMois key={t.month0} t={t} onOpen={() => setFiche(t)} />)}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2 text-[10.5px] text-[#8A9288]">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C89F62]" /> jour de réunion (2ᵉ dimanche)</span>
          <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2F6B45]" /> réunion tenue</span>
          <span className="inline-flex items-center gap-1"><HandCoins className="h-3 w-3" /> bouton « Voir » sous chaque calendrier</span>
        </div>
      </Block>

      {/* Tableau des bénéficiaires */}
      <Block
        title="Qui reçoit la réunion, mois par mois"
        icon={<Gift className="h-4.5 w-4.5" />}
        note="Une personne par mois : elle reçoit la somme des 10 autres cotisants et accueille la réunion chez elle. Touchez une ligne pour ouvrir sa fiche — téléphone, lieu et cotisation de chacun."
      >
        <TableWrap label="Bénéficiaires de l'année">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Mois</th>
              <th className={TH}>Réunion</th>
              <th className={TH}>Lieu</th>
              <th className={TH}>Bénéficiaire</th>
              <th className={TH}>Somme</th>
              <th className={TH}>Collation</th>
              <th className={TH}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {annee.map((t, i) => {
              const e = etatReunion(t);
              const zebra = i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]";
              return (
                <tr
                  key={t.month0}
                  className={`${zebra} cursor-pointer transition-colors hover:bg-[#C89F62]/12`}
                  onClick={() => setFiche(t)}
                  title="Voir la fiche de cette réunion"
                >
                  <td className={`${TD} whitespace-nowrap font-bold capitalize ${t.etat === "courant" ? "text-[#8A6420]" : "text-[#2B3530]"}`}>
                    {t.mois}
                    {t.tour ? <span className="ml-1 text-[10px] font-medium text-[#8A9288]">n°{t.tour}</span> : null}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(t.iso)}</td>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>
                    {t.ag ? "Lieu de l'AG" : t.etat === "futur" ? "Chez le bénéficiaire" : `Chez ${prenom(t.beneficiary!)}`}
                  </td>
                  <td className={TD}>
                    {t.ag ? (
                      <span className="italic text-[#8A9288]">Assemblée générale</span>
                    ) : t.etat === "futur" ? (
                      <span className="flex items-center gap-1 text-[#8A9288]"><Lock className="h-3 w-3" /> Le moment venu</span>
                    ) : (
                      <span className="font-semibold text-[#2B3530]">{t.beneficiary!.name}{t.beneficiary!.isVous ? " (vous)" : ""}</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#1E4D2B]`}>{t.ag ? "—" : fmtN(t.pot)}</td>
                  <td className={`${TD} whitespace-nowrap text-[#B85C33]`}>{t.ag ? "—" : fmtN(t.collation)}</td>
                  <td className={TD}>
                    <Chip cls={e === "passee" ? CHIP_OK : e === "aujourdhui" ? CHIP_GOLD : CHIP_NEUTRE}>
                      {e === "passee" ? "Tenue ✓" : e === "aujourdhui" ? "Aujourd'hui" : `Dans ${joursAvant(t)} j`}
                    </Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Block>

      {/* Règles de la tontine */}
      <Block title="Règles de la tontine" icon={<ScrollText className="h-4.5 w-4.5" />}>
        <TableWrap label="Règles de la tontine">
          <tbody>
            {regles.map(([k, v], i) => (
              <tr key={k} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>{k}</td>
                <td className={`${TD} text-[#5C6B60]`}>{v}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Block>

      {/* Fiche réunion — modale ouverte au clic sur un mois du calendrier */}
      {fiche && <FicheReunion t={fiche} vousId={vousId} onFermer={() => setFiche(null)} />}

      {/* Informations du bénéficiaire du mois — téléphone + géolocalisation */}
      {infos && courant.beneficiary && (
        <FicheBeneficiaire t={courant} vousPhone={vousPhone} onFermer={() => setInfos(false)} />
      )}
    </div>
  );
}

/** Mini-calendrier d'un mois — le point (cercle coloré) marque le 2ᵉ dimanche.
 *  CHAQUE calendrier est un bouton : un clic n'importe où sur le calendrier,
 *  ou sur le petit bouton « Voir la fiche » en dessous, ouvre le pop-up avec
 *  toutes les informations (qui reçoit la réunion, téléphone, lieu, cotisation). */
function MiniMois({ t, onOpen }: { t: TourMois; onOpen: () => void }) {
  const aujourdhui = isoDate(new Date());
  const e = etatReunion(t);
  const premierJour = new Date(t.annee, t.month0, 1).getDay();
  const nbJours = new Date(t.annee, t.month0 + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(premierJour).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];
  const nomVisible = t.etat !== "futur";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Calendrier de ${t.mois} — ouvrir la fiche de la réunion : qui reçoit, son téléphone, son lieu et la cotisation de chacun`}
      title="Touchez pour voir la fiche de cette réunion"
      onClick={onOpen}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-pointer rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89F62] active:translate-y-0 ${
        t.etat === "courant"
          ? "border-[#C89F62]/60 bg-[#C89F62]/8 hover:ring-2 hover:ring-[#C89F62]/40"
          : "border-[#E5DCC0] bg-[#FFFDF6] hover:border-[#C89F62]/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-bold capitalize text-[#2B3530]">{t.mois}</p>
        <span className="flex items-center gap-1">
          {t.etat === "courant" && (
            <span className="rounded-full bg-[#C89F62] px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-[#2B2416]">Ce mois</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 text-[#8A9288]" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-0.5 text-center">
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <span key={`h${i}`} className="text-[8px] font-bold text-[#8A9288]">{d}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const iso = `${t.annee}-${String(t.month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const estReunion = d === t.jour;
          const estAujourdhui = iso === aujourdhui;
          return (
            <span
              key={`j${i}`}
              className={`flex h-[16px] items-center justify-center text-[8.5px] ${
                estReunion
                  ? `rounded-full font-bold ${e === "passee" ? "bg-[#2F6B45] text-white" : e === "aujourdhui" ? "bg-[#C89F62] text-[#2B2416] ring-2 ring-[#C89F62]/40" : "bg-[#C89F62]/15 text-[#8A6420]"}`
                  : estAujourdhui
                    ? "rounded-full font-bold text-[#1E4D2B] underline"
                    : "text-[#5C6B60]"
              }`}
            >
              {d}
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 border-t border-[#E5DCC0] pt-1.5">
        {t.ag ? (
          <p className="flex items-center gap-1 text-[10px] font-bold text-[#3D6B72]"><Users className="h-3 w-3" /> Assemblée générale</p>
        ) : nomVisible && t.beneficiary ? (
          e === "passee" ? (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-[#2F6B45]"><Check className="h-3 w-3" /> {prenom(t.beneficiary)} a reçu la réunion</p>
          ) : (
            <p className="flex items-center gap-1 text-[10px] font-bold text-[#8A6420]"><Gift className="h-3 w-3" /> {prenom(t.beneficiary)} reçoit la réunion</p>
          )
        ) : (
          <p className="flex items-center gap-1 text-[10px] text-[#8A9288]"><Lock className="h-3 w-3" /> Nom révélé le moment venu</p>
        )}
        {/* Petit bouton « Voir » sous chaque calendrier — ouvre le pop-up */}
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onOpen();
          }}
          aria-label={`Voir la fiche de la réunion de ${t.mois}`}
          className="mt-1.5 flex min-h-[30px] w-full items-center justify-center gap-1 rounded-lg bg-[#1E4D2B] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#2F6B45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89F62]"
        >
          Voir la fiche <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════ fiche réunion — modale du calendrier ══════════════════════════

   Ouverte quand on clique sur un mois du calendrier (ou une ligne du tableau des
   bénéficiaires). Elle montre : QUI reçoit la réunion, SON NUMÉRO DE TÉLÉPHONE, SON
   LIEU, et LA SOMME QUE CHACUN DOIT COTISER pour cette réunion. */

function FicheReunion({ t, vousId, onFermer }: { t: TourMois; vousId: string; onFermer: () => void }) {
  const e = etatReunion(t);
  const jr = joursAvant(t);
  const b = t.beneficiary;

  // Échap pour fermer + verrouille le défilement de la page derrière la fiche
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onFermer]);

  // La part de chacun : le bénéficiaire du mois ne cotise pas (il ne verse que la collation)
  const estBeneficiaire = !t.ag && b?.id === vousId;
  const partCotis = estBeneficiaire ? 0 : TONTINE.montantCotisation;
  const partColla = t.ag ? 0 : TONTINE.montantCollation;
  const partTotale = partCotis + partColla;

  const parts: [string, string, string][] = t.ag
    ? []
    : [
        ["Cotisation", estBeneficiaire ? "—" : fmtFcfa(TONTINE.montantCotisation), estBeneficiaire ? "Vous ne cotisez pas — vous recevez la réunion" : "Remise au trésorier pour la réunion"],
        ["Collation", fmtFcfa(TONTINE.montantCollation), "Payée par tout le monde, y compris le bénéficiaire"],
        ["Total par personne", fmtFcfa(partTotale), estBeneficiaire ? "Votre seule part ce mois-ci" : "À remettre au trésorier à la réunion"],
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B2416]/55 p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.ag ? `Fiche de l'assemblée générale de ${t.mois}` : `Fiche de la réunion de ${t.mois}`}
      onClick={onFermer}
    >
      <div
        className="fc-fade-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-[0_24px_70px_rgba(43,53,48,0.45)]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* En-tête — mois, date complète, statut */}
        <div className="sticky top-0 z-10 bg-[#1E4D2B] px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wide opacity-80">
                {t.ag ? "Assemblée générale — clôture de l'année" : `Réunion de ${t.mois}${t.tour ? ` — tour n°${t.tour}` : ""}`}
              </p>
              <p className="fc-serif mt-0.5 text-[16px] font-bold capitalize">{fmtDateLong(t.iso)}</p>
              <p className="mt-0.5 text-[11.5px] opacity-85">{cap(TONTINE.jourLabel)} — {t.ag ? "lieu décidé par le bureau" : `chez ${b ? prenom(b) : "le bénéficiaire"}`}</p>
            </div>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer la fiche"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5">
            <Chip
              cls={e === "passee" ? "border-transparent bg-[#2F6B45] text-white" : e === "aujourdhui" ? "border-transparent bg-[#C89F62] text-[#2B2416]" : "border-white/25 bg-white/12 text-white"}
            >
              {e === "passee" ? "Réunion tenue ✓" : e === "aujourdhui" ? "C'est aujourd'hui !" : `Dans ${jr} jour${jr > 1 ? "s" : ""}`}
            </Chip>
          </div>
        </div>

        {t.ag ? (
          /* Décembre — assemblée générale : pas de bénéficiaire, pas de somme */
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#3D6B72]/30 bg-[#3D6B72]/8 p-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-[#3D6B72]" />
              <p className="text-[12.5px] leading-relaxed text-[#3D6B72]">
                Décembre clôture l&apos;année : bilan général, rapport du commissaire aux comptes,
                calendrier de l&apos;année suivante et fête de fin d&apos;année. Aucune somme n&apos;est remise.
              </p>
            </div>
            <TableWrap label="Détails de l'assemblée générale">
              <tbody>
                {[
                  ["Moment", `${cap(TONTINE.jourLabel)} de décembre`],
                  ["Bénéficiaire", "Aucun — clôture de l'année"],
                  ["Ordre du jour", "Bilan de l'année · Rapport des comptes · Calendrier suivant"],
                  ["Cotisation", "Aucune — repas de fête"],
                ].map(([k, v], i) => (
                  <tr key={k} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                    <td className={`${TD} font-bold text-[#2B3530]`}>{k}</td>
                    <td className={`${TD} text-[#5C6B60]`}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        ) : (
          <div className="space-y-3.5 px-4 py-4">
            {/* Qui reçoit la réunion */}
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Qui reçoit la réunion ce mois-ci</p>
            <div className="flex items-center gap-3 rounded-2xl border border-[#C89F62]/45 bg-[#C89F62]/10 p-3">
              <Avatar m={b!} size={46} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-[#2B3530]">
                  {b!.name}{b!.isVous ? " (vous)" : ""}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#8A6420]">
                  <Gift className="h-3 w-3" />
                  {b!.isVous ? "Votre tour — vous recevez la réunion !" : "Bénéficiaire du mois"}
                </p>
              </div>
              <Chip cls={ROLE_META[b!.role].badge}>{ROLE_META[b!.role].short}</Chip>
            </div>

            {/* Ce qu'on lui cotise — la somme remise à cette personne */}
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#2F6B45]/30 bg-[#2F6B45]/8 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2F6B45]">
                <HandCoins className="h-4 w-4 shrink-0" />
                {b!.isVous ? "Vous recevez" : `${prenom(b!)} reçoit`}
              </p>
              <p className="whitespace-nowrap text-[15.5px] font-bold text-[#1E4D2B]">{fmtN(t.pot)} FCFA</p>
            </div>

            {/* Téléphone + lieu */}
            <TableWrap label="Coordonnées du bénéficiaire">
              <tbody>
                <tr className="bg-[#FFFDF6]">
                  <td className={`${TD} font-bold text-[#2B3530]`}>
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#1E4D2B]" /> Téléphone</span>
                  </td>
                  <td className={TD}>
                    {b!.phone ? (
                      <a
                        href={`tel:${b!.phone.replace(/\s/g, "")}`}
                        className="font-semibold text-[#1E4D2B] underline decoration-[#C89F62] decoration-2 underline-offset-2 hover:text-[#2F6B45]"
                      >
                        {b!.phone}
                      </a>
                    ) : (
                      <span className="italic text-[#8A9288]">Votre numéro</span>
                    )}
                  </td>
                </tr>
                <tr className="bg-[#FBF7EA]">
                  <td className={`${TD} font-bold text-[#2B3530]`}>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#B85C33]" /> Lieu</span>
                  </td>
                  <td className={`${TD} text-[#5C6B60]`}>Chez {prenom(b!)} — {b!.city}</td>
                </tr>
                <tr className="bg-[#FFFDF6]">
                  <td className={`${TD} font-bold text-[#2B3530]`}>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#3D6B72]" /> Membre depuis</span>
                  </td>
                  <td className={`${TD} text-[#5C6B60]`}>{b!.since} · son tour de réception : n°{b!.tour}</td>
                </tr>
              </tbody>
            </TableWrap>

            {/* La somme que chacun doit cotiser */}
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Ce que chacun verse à cette réunion</p>
            <TableWrap label="Cotisation de chaque membre pour cette réunion">
              <tbody>
                {parts.map(([k, v, sub], i) => {
                  const last = i === parts.length - 1;
                  return (
                    <tr key={k} className={last ? "bg-[#1E4D2B]/8" : i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                      <td className={`${TD} font-bold text-[#2B3530]`}>
                        {k}
                        <span className="block text-[10px] font-medium text-[#8A9288]">{sub}</span>
                      </td>
                      <td className={`${TD} whitespace-nowrap text-right text-[13.5px] font-bold ${last ? "text-[#1E4D2B]" : "text-[#5C6B60]"}`}>
                        {v}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>

            {/* L'argent du mois — dérivé des règles, jamais codé en dur */}
            <div className="grid grid-cols-3 divide-x divide-[#E5DCC0] rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] text-center">
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Somme du mois</p>
                <p className="text-[13px] font-bold text-[#1E4D2B]">{fmtN(t.pot)}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-[#8A9288]">{fmtN(t.pot / TONTINE.montantCotisation)} cotisants × {fmtN(TONTINE.montantCotisation)}</p>
              </div>
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Collation</p>
                <p className="text-[13px] font-bold text-[#B85C33]">{fmtN(t.collation)}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-[#8A9288]">{fmtN(t.collation / TONTINE.montantCollation)} × {fmtN(TONTINE.montantCollation)}</p>
              </div>
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Total collecté</p>
                <p className="text-[13px] font-bold text-[#2F6B45]">{fmtN(t.total)}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-[#8A9288]">remis à {prenom(b!)}</p>
              </div>
            </div>

            {e === "passee" && (
              <p className="flex items-start gap-1.5 rounded-xl bg-[#2F6B45]/8 p-2.5 text-[11px] leading-relaxed text-[#2F6B45]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Réunion tenue le {fmtDateCourte(t.iso)} chez {prenom(b!)} — les cotisations en retard entraînent une pénalité de {fmtN(TONTINE.penaliteRetard)} FCFA.
              </p>
            )}
          </div>
        )}

        {/* Pied — fermer */}
        <div className="sticky bottom-0 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
          <FcButton onClick={onFermer} className="w-full">
            Fermer la fiche
          </FcButton>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ informations du bénéficiaire ══════════════════════════

   Pop-up « Voir ses informations » — ouverte depuis la bannière de la réunion
   du mois. L'ESSENTIEL y est : le NUMÉRO DE TÉLÉPHONE et la GÉOLOCALISATION,
   pour appeler le bénéficiaire, s'orienter et arriver directement chez lui.

   • Bénéficiaire = un autre membre : ses coordonnées (téléphone cliquable,
     WhatsApp, itinéraire GPS Google Maps / OpenStreetMap si son GPS existe).
   • Bénéficiaire = vous : vous MODIFIEZ votre contact et votre géolocalisation,
     et vous PARTAGEZ votre position (partage natif du téléphone, sinon copie
     + WhatsApp) pour que chacun puisse se guider jusqu'à votre porte.
   Tout est gratuit : liens profonds Maps/OSM, partage natif — aucune API payante. */

function FicheBeneficiaire({ t, vousPhone, onFermer }: { t: TourMois; vousPhone?: string | null; onFermer: () => void }) {
  const b = t.beneficiary;
  const estVous = !!b?.isVous;

  // Géolocalisation réelle du bénéficiaire — pour vous-même, elle est chargée
  // depuis l'API (mode démo : répondeur local ; production : base famille).
  const [loc, setLoc] = useState<LocationDraft | null>(null);
  const [locChargee, setLocChargee] = useState(!estVous);
  const [editerLoc, setEditerLoc] = useState(false);
  // Téléphone affiché/éditable — pour vous il démarre du compte, sinon du membre.
  const [tel, setTel] = useState(estVous ? (vousPhone ?? "") : (b?.phone ?? ""));
  const [enregTel, setEnregTel] = useState(false);

  const chargeLocation = async () => {
    try {
      const res = await api<{ ok: boolean; location: Record<string, unknown> | null }>("/api/me/location");
      if (res.ok && res.location) {
        const L = res.location;
        setLoc({
          country: String(L.country ?? ""),
          region: String(L.region ?? ""),
          department: String(L.department ?? ""),
          city: String(L.city ?? ""),
          arrondissement: String(L.arrondissement ?? ""),
          quartier: String(L.quartier ?? ""),
          latitude: typeof L.latitude === "number" ? L.latitude : null,
          longitude: typeof L.longitude === "number" ? L.longitude : null,
          accuracy: typeof L.accuracy === "number" ? L.accuracy : null,
          source: "manual",
        });
      } else {
        setLoc(null);
      }
    } catch {
      /* hors connexion — on garde l'affichage local */
    } finally {
      setLocChargee(true);
    }
  };

  useEffect(() => {
    if (!estVous) return;
    void chargeLocation();
  }, [estVous]);

  // Échap pour fermer + verrouille le défilement de la page derrière la fiche
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onFermer]);

  if (!b) return null;

  const gps = loc && loc.latitude !== null && loc.longitude !== null ? { latitude: loc.latitude, longitude: loc.longitude } : null;
  const adresse = loc
    ? [loc.quartier, loc.arrondissement, loc.city, loc.region, loc.country].filter(Boolean).join(", ")
    : b.city
      ? `${b.city}${b.fictif ? "" : " — non précisé"}`
      : "";
  const telNet = tel.replace(/[^0-9+]/g, "");
  const waNum = tel.replace(/[^0-9]/g, "").replace(/^0+/, "");
  const mapsLien = gps ? `https://www.google.com/maps/search/?api=1&query=${gps.latitude},${gps.longitude}` : null;

  const partagerPosition = async () => {
    if (!mapsLien) return;
    const texte = `🏠 Réunion de la tontine chez ${b.name}${adresse ? ` — ${adresse}` : ""}. Itinéraire jusqu'à chez ${b.isVous ? "moi" : prenom(b)} : ${mapsLien}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `Réunion chez ${b.name}`, text: texte, url: mapsLien });
        return;
      }
      await navigator.clipboard.writeText(texte);
      toast.success("Position copiée — collez-la dans WhatsApp pour guider la famille 🧭");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // partage natif annulé — rien à dire
      // Presse-papiers refusé (réglage du navigateur) : le lien reste affiché
      // dans la fiche — le membre peut le copier à la main depuis « S'y rendre ».
      toast.info("Copie impossible — utilisez « S'y rendre » puis partagez depuis votre application de navigation.");
    }
  };

  const enregistrerTel = () => {
    const v = tel.trim();
    if (v.replace(/[^0-9]/g, "").length < 6) {
      toast.error("Numéro incomplet — entrez un numéro joignable (au moins 6 chiffres).");
      return;
    }
    try {
      localStorage.setItem("fc_phone", v);
    } catch {
      /* rien */
    }
    setEnregTel(true);
    setTimeout(() => setEnregTel(false), 2000);
    toast.success("Numéro enregistré — la famille peut maintenant vous joindre 📞");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B2416]/55 p-2 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={estVous ? "Vos informations — contact et géolocalisation" : `Informations de ${b.name} — contact et géolocalisation`}
      onClick={onFermer}
    >
      <div
        className="fc-fade-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-[0_24px_70px_rgba(43,53,48,0.45)]"
        onClick={(ev) => ev.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 bg-[#1E4D2B] px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wide opacity-80">
                {estVous ? "Vos informations" : "Ses informations"} — réunion de {t.mois}
              </p>
              <p className="fc-serif mt-0.5 text-[16px] font-bold">{estVous ? "Contact & géolocalisation" : b.name}</p>
              <p className="mt-0.5 text-[11.5px] opacity-85">
                {cap(fmtDateLong(t.iso))} — chez {estVous ? "vous" : prenom(b)}
              </p>
            </div>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer les informations"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editerLoc && estVous ? (
          /* Édition de la géolocalisation — le même assistant qu'à l'inscription */
          <div className="px-2 py-3">
            <p className="mb-2 flex items-center gap-1.5 px-2 text-[12px] font-semibold text-[#5C6B60]">
              <PencilLine className="h-4 w-4 text-[#8A6420]" /> Corrigez votre adresse — elle guide la famille jusqu&apos;à vous.
            </p>
            <LocationWizard
              initial={loc}
              firstRun={false}
              onSaved={async () => {
                setEditerLoc(false);
                await chargeLocation();
              }}
            />
            <div className="px-2 pb-2">
              <button
                onClick={() => setEditerLoc(false)}
                className="w-full text-center text-[12.5px] text-[#8A9288] hover:underline"
              >
                Annuler la modification
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 px-4 py-4">
            {/* Identité du bénéficiaire */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#C89F62]/45 bg-[#C89F62]/10 p-3">
              <Avatar m={b} size={46} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-[#2B3530]">
                  {b.name}{b.isVous ? " (vous)" : ""}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#8A6420]">
                  <Gift className="h-3 w-3" />
                  {b.isVous ? "Vous recevez la réunion ce mois-ci" : `Bénéficiaire du mois — reçoit ${fmtN(t.pot)} FCFA`}
                </p>
              </div>
              <Chip cls={ROLE_META[b.role].badge}>{ROLE_META[b.role].short}</Chip>
            </div>

            {/* ── Téléphone — L'ESSENTIEL : on peut l'appeler directement ── */}
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Numéro de téléphone</p>
            {estVous ? (
              <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E4D2B]/10 text-[#1E4D2B]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    value={tel}
                    onChange={(ev) => setTel(ev.target.value)}
                    inputMode="tel"
                    placeholder="Votre numéro — ex : +237 6 XX XX XX XX"
                    aria-label="Votre numéro de téléphone"
                    className="h-11 min-w-0 flex-1 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[15px] font-semibold text-[#2B3530] placeholder:font-normal placeholder:text-[#B7B0A0] focus:border-[#2A4A3A] focus:outline-none focus:ring-2 focus:ring-[#2A4A3A]/15"
                  />
                </div>
                <FcButton onClick={enregistrerTel} className="mt-2.5 h-11 w-full" variant={enregTel ? "outline" : "primary"}>
                  {enregTel ? <><Check className="h-4 w-4" /> Enregistré ✓</> : <><Check className="h-4 w-4" /> Enregistrer mon numéro</>}
                </FcButton>
                {telNet.replace(/[^0-9]/g, "").length >= 6 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${telNet}`}
                      className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#C9B98A] px-2 text-[12.5px] font-bold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    >
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                    <a
                      href={`https://wa.me/${waNum}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-[#C9B98A] px-2 text-[12.5px] font-bold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                )}
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#8A9288]">
                  Ce numéro s&apos;affiche pour les membres de la famille quand c&apos;est votre tour de recevoir la réunion.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
                {b.phone ? (
                  <>
                    <a
                      href={`tel:${b.phone.replace(/\s/g, "")}`}
                      className="flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1E4D2B] px-3 text-[13px] font-bold text-white transition-colors hover:bg-[#2F6B45]"
                    >
                      <Phone className="h-4 w-4" /> {b.phone}
                    </a>
                    <a
                      href={`https://wa.me/${b.phone.replace(/[^0-9]/g, "").replace(/^0+/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#C9B98A] px-3 text-[13px] font-bold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </>
                ) : (
                  <p className="text-[12px] italic text-[#8A9288]">Numéro non renseigné — passez voir le secrétaire de la cantine.</p>
                )}
              </div>
            )}

            {/* ── Géolocalisation — s'orienter, arriver directement chez lui ── */}
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Géolocalisation</p>
            <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
              {!locChargee && estVous ? (
                <div className="flex items-center justify-center gap-2 py-3 text-[12.5px] text-[#8A9288]" role="status">
                  <FcSpinner className="h-4 w-4 text-[#C89F62]" /> Chargement de votre position…
                </div>
              ) : gps ? (
                <>
                  <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[#2B3530]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B85C33]" />
                    <span>{adresse || "Position GPS enregistrée"}</span>
                  </p>
                  <p className="mt-1 text-[10.5px] text-[#8A9288]">
                    {loc?.quartier ? `Quartier ${loc.quartier} · ` : ""}GPS {gps.latitude.toFixed(5)}, {gps.longitude.toFixed(5)}{loc?.accuracy ? ` · précision ~${Math.round(loc.accuracy)} m` : ""}
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <a
                      href={googleMapsDirectionsUrl(gps)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#1E4D2B] px-2 text-center text-[12.5px] font-bold text-white transition-colors hover:bg-[#2F6B45]"
                    >
                      <Navigation className="h-4 w-4" /> S&apos;y rendre
                    </a>
                    <a
                      href={osmViewUrl(gps, 17)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-[#C9B98A] px-2 text-center text-[12.5px] font-bold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                    >
                      <MapPinned className="h-4 w-4" /> Voir sur la carte
                    </a>
                  </div>
                </>
              ) : estVous ? (
                <>
                  <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[#5C6B60]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A9288]" />
                    <span>{adresse || "Aucune adresse enregistrée"} — enregistrez votre géolocalisation pour que la famille puisse se guider jusqu&apos;à votre porte.</span>
                  </p>
                </>
              ) : (
                <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[#5C6B60]">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A9288]" />
                  <span>
                    {b.city ? `Quartier de référence : ${b.city}. ` : ""}
                    {prenom(b)} n&apos;a pas encore enregistré sa géolocalisation GPS — appelez-le pour le guidage.
                  </span>
                </p>
              )}

              {/* Actions du bénéficiaire — modifier + partager sa position */}
              {estVous && !editerLoc && (
                <div className="mt-2.5 space-y-2">
                  <FcButton variant="outline" className="h-11 w-full" onClick={() => setEditerLoc(true)}>
                    <PencilLine className="h-4 w-4" /> Modifier ma géolocalisation
                  </FcButton>
                  {mapsLien && (
                    <FcButton className="h-11 w-full" onClick={partagerPosition}>
                      <Share2 className="h-4 w-4" /> Partager ma position (WhatsApp…)
                    </FcButton>
                  )}
                </div>
              )}
              {!estVous && mapsLien && (
                <button
                  onClick={partagerPosition}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-bold text-[#2A4A3A] hover:bg-[#C89F62]/10"
                >
                  <Share2 className="h-4 w-4" /> Partager sa position
                </button>
              )}
              {estVous && (
                <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#8A9288]">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Visible uniquement par les membres de la tontine, uniquement pour les rencontres.
                </p>
              )}
            </div>

            {/* Rappel des sommes — dérivées du paramétrage du bureau */}
            <div className="grid grid-cols-3 divide-x divide-[#E5DCC0] rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] text-center">
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Somme reçue</p>
                <p className="text-[13px] font-bold text-[#1E4D2B]">{fmtN(t.pot)}</p>
              </div>
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Collation</p>
                <p className="text-[13px] font-bold text-[#B85C33]">{fmtN(t.collation)}</p>
              </div>
              <div className="px-1.5 py-2.5">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-[#8A9288]">Chacun verse</p>
                <p className="text-[13px] font-bold text-[#2F6B45]">{fmtN(detteParPersonne())}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pied — fermer */}
        <div className="sticky bottom-0 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-3">
          <FcButton onClick={onFermer} className="w-full">
            Fermer
          </FcButton>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ page MEMBRES ══════════════════════════ */

function MembresPage({ annee, roster, payes, selected, onSelect, onGoRole }: {
  annee: TourMois[]; roster: Member[]; payes: Payes;
  selected: string | null; onSelect: (id: string | null) => void; onGoRole: (p: TPage) => void;
}) {
  const bureau = roster.filter((m) => m.role !== "membre");
  const simples = roster.filter((m) => m.role === "membre");
  const sel = roster.find((m) => m.id === selected) ?? null;

  return (
    <div className="space-y-3.5">
      <Block
        title="Membres de la tontine"
        icon={<Users className="h-4.5 w-4.5" />}
        chip={<Chip cls="bg-[#1E4D2B]/8 text-[#1E4D2B] border-[#1E4D2B]/25">{roster.length} membres</Chip>}
        note="Touchez un membre : son rôle, son tour et sa cotisation apparaissent immédiatement."
      >
        <p className="mb-1.5 mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#1E4D2B]">
            <Crown className="h-3.5 w-3.5 text-[#8A6420]" aria-hidden="true" /> Le bureau de l&apos;association
          </span>
          <Chip cls={CHIP_OK}>{bureau.length} membres</Chip>
        </p>
        <TableMembres members={bureau} variante="bureau" annee={annee} payes={payes} selected={selected} onSelect={onSelect} />

        <p className="mb-1.5 mt-4 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#3D6B72]">
            <Users className="h-3.5 w-3.5 text-[#3D6B72]" aria-hidden="true" /> Les membres simples
          </span>
          <Chip cls={CHIP_TEAL}>{simples.length} membres</Chip>
        </p>
        <TableMembres members={simples} variante="simples" annee={annee} payes={payes} selected={selected} onSelect={onSelect} />
      </Block>

      {sel && <PanneauMembre m={sel} annee={annee} onGoRole={onGoRole} onFermer={() => onSelect(null)} />}
    </div>
  );
}

function TableMembres({ members, variante, annee, payes, selected, onSelect }: {
  members: Member[]; variante: "bureau" | "simples"; annee: TourMois[]; payes: Payes;
  selected: string | null; onSelect: (id: string | null) => void;
}) {
  const courant = annee.find((t) => t.etat === "courant");
  // Couleurs distinctes : le BUREAU en vert & or, les MEMBRES SIMPLES en sarcelle.
  const bureau = variante === "bureau";
  const head = bureau ? "bg-[#1E4D2B] text-white" : "bg-[#3D6B72] text-white";
  const wrap = bureau ? "border-[#C89F62]/50" : "border-[#3D6B72]/50";
  const hover = bureau ? "hover:bg-[#C89F62]/8" : "hover:bg-[#3D6B72]/8";
  const sel = bureau ? "bg-[#C89F62]/14" : "bg-[#3D6B72]/14";
  return (
    <TableWrap label={bureau ? "Tableau du bureau de l'association" : "Tableau des membres simples"} className={wrap}>
      <thead>
        <tr className={head}>
          <th className={TH}>Membre</th>
          <th className={TH}>Rôle</th>
          <th className={TH}>Ville</th>
          <th className={TH}>Son tour</th>
          <th className={TH}>Ce mois</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m, i) => {
          const on = selected === m.id;
          const st = statutMembreDuMois(m, courant, payes);
          return (
            <tr
              key={m.id}
              tabIndex={0}
              onClick={() => onSelect(on ? null : m.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(on ? null : m.id);
                }
              }}
              aria-selected={on}
              className={`cursor-pointer transition-colors ${on ? sel : `${hover} ${i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}`}`}
            >
              <td className={TD}>
                <span className="flex items-center gap-2">
                  <Avatar m={m} size={28} />
                  <span className="whitespace-nowrap font-semibold text-[#2B3530]">
                    {m.name}
                    {m.isVous && <span className="ml-1 text-[11px] font-bold text-[#8A6420]">(vous)</span>}
                  </span>
                </span>
              </td>
              <td className={TD}><Chip cls={ROLE_META[m.role].badge}>{ROLE_META[m.role].short}</Chip></td>
              <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{m.city}</td>
              <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{MOIS_FR_SHORT[m.tour - 1]} · n°{m.tour}</td>
              <td className={TD}><Chip cls={st.cls}>{st.label}</Chip></td>
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}

function PanneauMembre({ m, annee, onGoRole, onFermer }: {
  m: Member; annee: TourMois[]; onGoRole: (p: TPage) => void; onFermer: () => void;
}) {
  const meta = ROLE_META[m.role];
  const sonTour = annee[m.tour - 1];
  const courant = annee.find((t) => t.etat === "courant");
  const estBenef = !!courant && !courant.ag && courant.beneficiary?.id === m.id;

  return (
    <FcCard className="border-[#C89F62]/50 bg-[#C89F62]/8 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar m={m} size={48} />
          <div className="min-w-0">
            <p className="fc-serif truncate text-[16px] font-bold text-[#1E4D2B]">{m.name}{m.isVous ? " (vous)" : ""}</p>
            <p className="text-[12px] text-[#8A9288]">{m.city} · membre depuis {m.since}</p>
          </div>
        </div>
        <Chip cls={meta.badge}>Rôle : {meta.label}</Chip>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-[#5C6B60]">{meta.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#FFFDF6] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">Son tour — reçoit la réunion</p>
          <p className="text-[13.5px] font-bold text-[#1E4D2B]">{cap(moisDuTour(m.tour))} · n°{m.tour}</p>
          <p className="text-[10.5px] text-[#8A9288]">{fmtDateCourte(sonTour.iso)}</p>
        </div>
        <div className="rounded-xl bg-[#FFFDF6] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">À cotiser ce mois</p>
          <p className="text-[13.5px] font-bold text-[#1E4D2B]">
            {!courant || courant.ag ? "—" : estBenef ? fmtN(TONTINE.montantCollation) : fmtN(detteParPersonne())}
          </p>
          <p className="text-[10.5px] text-[#8A9288]">
            {!courant || courant.ag ? "Assemblée générale" : estBenef ? "collation seulement (son tour)" : "cotisation + collation"}
          </p>
        </div>
        <div className="rounded-xl bg-[#FFFDF6] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">Contact</p>
          <p className="flex items-center gap-1 text-[13px] font-semibold text-[#2B3530]"><Phone className="h-3.5 w-3.5 text-[#8A6420]" /> {m.phone || "—"}</p>
        </div>
        <div className="rounded-xl bg-[#FFFDF6] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A9288]">Ville</p>
          <p className="flex items-center gap-1 text-[13px] font-semibold text-[#2B3530]"><MapPin className="h-3.5 w-3.5 text-[#8A6420]" /> {m.city}</p>
        </div>
      </div>
      {m.role !== "membre" && (
        <FcButton variant="outline" className="mt-3" onClick={() => onGoRole(m.role as TPage)}>
          Voir la page de {ROLE_META[m.role].short.toLowerCase()} <ChevronRight className="h-4 w-4" />
        </FcButton>
      )}
      <button onClick={onFermer} className="mt-2 w-full text-center text-[12px] text-[#8A9288] hover:underline">
        Fermer la fiche
      </button>
    </FcCard>
  );
}

/* ══════════════════════════ pages du BUREAU (une page par rôle) ══════════════════════════ */

function RolePage({ role, annee, roster, payes, vousRole, vousName, sigVersion, onSignaler, onMontantsChange }: {
  role: BureauPage; annee: TourMois[]; roster: Member[]; payes: Payes;
  vousRole: RoleKey; vousName?: string | null; sigVersion: number;
  onSignaler: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
  onMontantsChange: () => void;
}) {
  const meta = ROLE_META[role];
  const Icon = ROLE_ICON[role];
  const holder = roster.find((m) => m.role === role)!;
  // Les outils actifs de la page ne s'ouvrent que si C'EST VOTRE rôle dans la
  // cantine (rôle renseigné à l'inscription) — sinon la page reste un poste
  // d'observation : on voit le travail du bureau, sans y toucher.
  const maPage = vousRole === role;
  void sigVersion; // les blocs se rechargent à chaque mutation de signalement

  return (
    <div className="space-y-3.5">
      <FcCard className="overflow-hidden">
        <div className="px-4 py-3.5 text-white" style={{ background: meta.accent }}>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="fc-serif text-[17px] font-bold">{meta.label}</p>
              <p className="text-[12px] opacity-90">{meta.summary}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Avatar m={holder} size={44} />
          <div className="min-w-0 flex-1">
            <p className="fc-serif truncate text-[15.5px] font-bold text-[#1E4D2B]">{holder.name}{holder.isVous ? " (vous)" : ""}</p>
            <p className="text-[12px] text-[#8A9288]">{holder.city} · au bureau depuis {holder.since}</p>
          </div>
          <Chip cls={meta.badge}>{meta.short}</Chip>
        </div>
        {!maPage && (
          <p className="flex items-start gap-2 border-t border-[#E5DCC0] bg-[#FBF7EA] px-4 py-2.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A9288]" />
            Page de {holder.name} — les actions ci-dessous sont réservées au titulaire du rôle
            {vousRole !== "membre" ? ` (vous êtes ${ROLE_META[vousRole].label})` : " (vous êtes membre simple)"}. Vous pouvez tout consulter et signaler un problème si besoin.
          </p>
        )}
        {maPage && (
          <p className="flex items-start gap-2 border-t border-[#E5DCC0] bg-[#2F6B45]/8 px-4 py-2.5 text-[11.5px] font-semibold leading-relaxed text-[#2F6B45]">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            C&apos;est votre page — vos outils de gestion de la cantine sont actifs ci-dessous (URL dédiée : {hashFor(role as TPage)}).
          </p>
        )}
      </FcCard>

      <Block title={`Missions — ${meta.label}`} icon={<ScrollText className="h-4.5 w-4.5" />}>
        <TableWrap label="Missions du rôle">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Mission</th>
              <th className={TH}>En détail</th>
              <th className={TH}>Rythme</th>
            </tr>
          </thead>
          <tbody>
            {MISSIONS[role].map((mi, i) => (
              <tr key={mi.titre} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>{mi.titre}</td>
                <td className={`${TD} text-[#5C6B60]`}>{mi.detail}</td>
                <td className={`${TD} whitespace-nowrap text-[#8A6420]`}>{mi.rythme}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Block>

      {role === "president" && <TablePresidence annee={annee} roster={roster} />}
      {role === "vice_president" && <TableSuppleances annee={annee} roster={roster} />}
      {role === "secretariat" && <TableSecretariat annee={annee} roster={roster} />}
      {role === "commissaire" && <TableControles annee={annee} roster={roster} />}
      {role === "tresorier" && <TableTresorerie annee={annee} roster={roster} />}
      {role === "censeur" && <TableObservations annee={annee} roster={roster} />}

      {/* ── Outils du rôle — actifs seulement pour le titulaire connecté ── */}

      {(role === "president" || role === "secretariat") && (
        <Block
          title="Taux mensuel — réglage réservé au bureau"
          icon={<Percent className="h-4.5 w-4.5" />}
          note={`Le pourcentage ne peut JAMAIS être modifié par un simple membre : seul le président ou la secrétaire le règle${peutGererTaux(vousRole) ? "" : " — vous êtes en consultation"}. Il s'applique aux épargnes et aux prêts dès la réunion suivante.`}
        >
          <TauxParametrable
            editable={peutGererTaux(vousRole)}
            taux={loadTaux()}
            vousRole={vousRole}
            onAppliquer={(t) => {
              const ancienne = loadTaux();
              const decisions = enregistrerDecisionTaux(ancienne, t, vousRole);
              appliqueAutoValidationsDecisions(decisions);
            }}
            onSignaler={onSignaler}
          />
        </Block>
      )}

      {(role === "president" || role === "secretariat") && (
        <Block
          title="Montants de la tontine — réglage réservé au bureau"
          icon={<Coins className="h-4.5 w-4.5" />}
          note={`Cotisation, collation, frais d'adhésion et pénalités : seul le président ou la secrétaire les règle${peutGererTaux(vousRole) ? "" : " — vous êtes en consultation"}. Toutes les sommes affichées dans l'application (calendrier, fiche de réunion, finances, statistiques) se mettent à jour aussitôt.`}
        >
          <MontantsParametrable
            editable={peutGererTaux(vousRole)}
            vousRole={vousRole}
            onAppliquer={onMontantsChange}
            onSignaler={onSignaler}
          />
        </Block>
      )}

      {(role === "president" || role === "secretariat") && (
        <BureauValidations
          annee={annee}
          vousRole={vousRole}
          champ="epargnes"
          actif={peutValiderEpargnes(vousRole)}
          onSignaler={onSignaler}
        />
      )}

      {peutGererDettes(vousRole) && (role === "president" || role === "secretariat") && (
        <>
          <BureauValidations
            annee={annee}
            vousRole={vousRole}
            champ="prets"
            actif={peutGererDettes(vousRole)}
            onSignaler={onSignaler}
          />
          <GestionDettes annee={annee} roster={roster} vousRole={vousRole} actif={peutGererDettes(vousRole)} onSignaler={onSignaler} />
        </>
      )}

      <BureauSignalements vousRole={vousRole} sigVersion={sigVersion} onSignaler={onSignaler} />
    </div>
  );
}

/** Président — les 12 réunions de l'année et qui les conduit. */
function TablePresidence({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const vp = roster.find((m) => m.role === "vice_president")!;
  return (
    <Block
      title="Les réunions de l'année"
      icon={<CalendarDays className="h-4.5 w-4.5" />}
      note="Le président conduit chaque réunion ; les mois de suppléance sont conduits par le vice-président."
    >
      <TableWrap label="Réunions présidées">
        <thead>
          <tr className="bg-[#1E4D2B] text-white">
            <th className={TH}>Mois</th>
            <th className={TH}>Réunion</th>
            <th className={TH}>Lieu</th>
            <th className={TH}>Bénéficiaire</th>
            <th className={TH}>Présidence</th>
            <th className={TH}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {annee.map((t, i) => {
            const e = etatReunion(t);
            const supplee = SUPPLEANCES.includes(t.month0);
            return (
              <tr key={t.month0} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} whitespace-nowrap font-bold capitalize ${t.etat === "courant" ? "text-[#8A6420]" : "text-[#2B3530]"}`}>{t.mois}</td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(t.iso)}</td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>
                  {t.ag ? "Lieu de l'AG" : t.etat === "futur" ? "Chez le bénéficiaire" : `Chez ${prenom(t.beneficiary!)}`}
                </td>
                <td className={TD}>
                  {t.ag ? (
                    <span className="italic text-[#8A9288]">Assemblée générale</span>
                  ) : t.etat === "futur" ? (
                    <span className="flex items-center gap-1 text-[#8A9288]"><Lock className="h-3 w-3" /> Le moment venu</span>
                  ) : (
                    <span className="font-semibold text-[#2B3530]">{t.beneficiary!.name}{t.beneficiary!.isVous ? " (vous)" : ""}</span>
                  )}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  {t.ag ? (
                    <span className="text-[#5C6B60]">Le bureau</span>
                  ) : supplee ? (
                    <span className="font-semibold text-[#2F6B45]">{vp.name} (suppléant)</span>
                  ) : (
                    <span className="text-[#5C6B60]">Titulaire</span>
                  )}
                </td>
                <td className={TD}>
                  <Chip cls={e === "passee" ? CHIP_OK : e === "aujourdhui" ? CHIP_GOLD : CHIP_NEUTRE}>
                    {e === "passee" ? "Présidée ✓" : e === "aujourdhui" ? "Aujourd'hui" : "À venir"}
                  </Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </Block>
  );
}

const MOTIFS_SUPPLEANCE: Record<number, string> = {
  3: "Président en mission à l'extérieur de la ville",
  8: "Président indisponible — repos prescrit",
};

/** Vice-président — les réunions qu'il conduit à la place du président. */
function TableSuppleances({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const president = roster.find((m) => m.role === "president")!;
  const rows = SUPPLEANCES.map((m0) => annee[m0]);
  return (
    <Block
      title="Réunions que je présiderai"
      icon={<UserCheck className="h-4.5 w-4.5" />}
      note={`Les ${11 - SUPPLEANCES.length} autres réunions de l'année sont présidées par ${president.name}.`}
    >
      <TableWrap label="Suppléances du vice-président">
        <thead>
          <tr className="bg-[#1E4D2B] text-white">
            <th className={TH}>Mois</th>
            <th className={TH}>Réunion</th>
            <th className={TH}>Lieu</th>
            <th className={TH}>Bénéficiaire</th>
            <th className={TH}>Motif</th>
            <th className={TH}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const e = etatReunion(t);
            return (
              <tr key={t.month0} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} whitespace-nowrap font-bold capitalize ${t.etat === "courant" ? "text-[#8A6420]" : "text-[#2B3530]"}`}>{t.mois}</td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(t.iso)}</td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{t.etat === "futur" ? "Chez le bénéficiaire" : `Chez ${prenom(t.beneficiary!)}`}</td>
                <td className={TD}>
                  {t.etat === "futur" ? (
                    <span className="flex items-center gap-1 text-[#8A9288]"><Lock className="h-3 w-3" /> Le moment venu</span>
                  ) : (
                    <span className="font-semibold text-[#2B3530]">{t.beneficiary!.name}{t.beneficiary!.isVous ? " (vous)" : ""}</span>
                  )}
                </td>
                <td className={`${TD} text-[#5C6B60]`}>{MOTIFS_SUPPLEANCE[t.month0]}</td>
                <td className={TD}>
                  <Chip cls={e === "passee" ? CHIP_OK : e === "aujourdhui" ? CHIP_GOLD : CHIP_NEUTRE}>
                    {e === "passee" ? "Présidée ✓" : e === "aujourdhui" ? "Aujourd'hui" : "À venir"}
                  </Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </Block>
  );
}

/** Commissaire aux comptes — contrôles trimestriels des caisses. */
function TableControles({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const journal = journalDeCaisse(annee, roster);
  const trimestres = [
    { label: "T1", month0: 2, focus: "Caisse sociale et journal de janvier à mars" },
    { label: "T2", month0: 5, focus: "Caisse sociale et journal d'avril à juin" },
    { label: "T3", month0: 8, focus: "Caisse sociale et journal de juillet à septembre" },
    { label: "T4", month0: 11, focus: "Contrôle annuel — rapport présenté à l'AG" },
  ];
  return (
    <Block
      title="Contrôles des caisses"
      icon={<FileSearch className="h-4.5 w-4.5" />}
      note="Chaque trimestre, le commissaire vérifie la caisse sociale et le journal de caisse du trésorier, reçus à l'appui."
    >
      <TableWrap label="Contrôles trimestriels">
        <thead>
          <tr className="bg-[#1E4D2B] text-white">
            <th className={TH}>Trimestre</th>
            <th className={TH}>Date</th>
            <th className={TH}>Portant sur</th>
            <th className={TH}>Caisse sociale vérifiée</th>
            <th className={TH}>Constat</th>
            <th className={TH}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {trimestres.map((tr, i) => {
            const t = annee[tr.month0];
            const e = etatReunion(t);
            const row = journal.find((j) => j.tour.month0 === tr.month0);
            const realise = e === "passee";
            return (
              <tr key={tr.label} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>{tr.label}</td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(t.iso)}</td>
                <td className={`${TD} text-[#5C6B60]`}>{tr.focus}</td>
                <td className={`${TD} whitespace-nowrap font-semibold text-[#1E4D2B]`}>{row ? fmtN(row.caisseSociale) : "—"}</td>
                <td className={`${TD} ${realise ? "font-semibold text-[#2F6B45]" : "italic text-[#8A9288]"}`}>
                  {realise ? "Conforme — caisses exactes, reçus en règle" : "Programmé"}
                </td>
                <td className={TD}>
                  <Chip cls={realise ? CHIP_OK : CHIP_NEUTRE}>{realise ? "Réalisé ✓" : "En attente"}</Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </Block>
  );
}

/** Trésorier — chiffres clés, journal de caisse et caisses. */
function TableTresorerie({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const journal = journalDeCaisse(annee, roster);
  const caisses = caissesDuMoment(annee, roster);
  const rows = journal.filter((j) => j.etat !== "avenir");
  const encaisse = rows.reduce((s, j) => s + j.encaisse, 0);
  const pots = rows.reduce((s, j) => s + j.pot, 0);
  const collas = rows.reduce((s, j) => s + j.collation, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniKpi label="Encaissé à ce jour" value={fmtN(encaisse)} sub="cotisations + collations" tone="text-[#2F6B45]" />
        <MiniKpi label="Sommes versées" value={fmtN(pots)} sub="remises aux bénéficiaires" tone="text-[#1E4D2B]" />
        <MiniKpi label="Collations" value={fmtN(collas)} sub="consommées aux réunions" tone="text-[#B85C33]" />
        <MiniKpi label="Caisse sociale" value={fmtN(caisses.caisseSociale)} sub="adhésions + pénalités" tone="text-[#3D6B72]" />
      </div>

      <Block
        title="Journal de caisse"
        icon={<Wallet className="h-4.5 w-4.5" />}
        note="Chaque réunion : encaissement des parts et collations, remise de la somme au bénéficiaire, consommation de la collation."
      >
        <TableWrap label="Journal de caisse de l'année">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Mois</th>
              <th className={TH}>Réunion</th>
              <th className={TH}>Encaissé</th>
              <th className={TH}>Somme versée</th>
              <th className={TH}>Collation</th>
              <th className={TH}>Pénalités</th>
              <th className={TH}>Caisse sociale</th>
              <th className={TH}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {journal.map((j, i) => {
              const zebra = i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]";
              return (
                <tr key={j.tour.month0} className={zebra}>
                  <td className={`${TD} whitespace-nowrap font-bold capitalize ${j.tour.etat === "courant" ? "text-[#8A6420]" : "text-[#2B3530]"}`}>{j.tour.mois}</td>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(j.tour.iso)}</td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#2F6B45]`}>{j.etat === "avenir" ? <span className="italic font-normal text-[#8A9288]">{fmtN(j.encaisse)}</span> : fmtN(j.encaisse)}</td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#1E4D2B]`}>{j.pot ? fmtN(j.pot) : "—"}</td>
                  <td className={`${TD} whitespace-nowrap text-[#B85C33]`}>{j.collation ? fmtN(j.collation) : "—"}</td>
                  <td className={`${TD} whitespace-nowrap ${j.penalites ? "font-semibold text-[#A5473D]" : "text-[#8A9288]"}`}>{j.penalites ? `+${fmtN(j.penalites)}` : "—"}</td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#3D6B72]`}>{fmtN(j.caisseSociale)}</td>
                  <td className={TD}>
                    <Chip cls={j.etat === "cloture" ? CHIP_OK : j.etat === "en_cours" ? CHIP_GOLD : CHIP_NEUTRE}>
                      {j.etat === "cloture" ? "Clôturé ✓" : j.etat === "en_cours" ? "En cours" : "Projection"}
                    </Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Block>

      <Block title="Les caisses de la tontine" icon={<Coins className="h-4.5 w-4.5" />}>
        <TableWrap label="État des caisses">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Caisse</th>
              <th className={TH}>Solde</th>
              <th className={TH}>Alimentée par</th>
              <th className={TH}>Utilisée pour</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Caisse sociale", fmtN(caisses.caisseSociale), "Frais d'adhésion et pénalités", "Coups durs des membres, sur décision du bureau"],
              ["Caisse cotisations", "0", "Cotisations du mois", "Remise intégralement au bénéficiaire (la somme du mois)"],
              ["Caisse collation", "0", "Collations du mois", "Consommée à chaque réunion"],
            ].map(([k, solde, alim, usage], i) => (
              <tr key={k} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>{k}</td>
                <td className={`${TD} whitespace-nowrap font-bold text-[#1E4D2B]`}>{solde} FCFA</td>
                <td className={`${TD} text-[#5C6B60]`}>{alim}</td>
                <td className={`${TD} text-[#5C6B60]`}>{usage}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Block>
    </>
  );
}

/** Censeur — observations et alertes de l'année. */
function TableObservations({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const todayIso = isoDate(new Date());
  const rows = ANOMALIES
    .filter((a) => annee.some((t) => t.month0 === a.month0 && t.iso <= todayIso))
    .map((a) => ({ a, t: annee[a.month0], m: roster.find((x) => x.id === a.memberId)! }));

  return (
    <Block
      title="Observations & alertes"
      icon={<Eye className="h-4.5 w-4.5" />}
      note="Les alertes confidentielles adressées au censeur n'apparaissent jamais dans les tableaux du groupe — seule la suite donnée est publiée."
    >
      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#2F6B45]/8 px-3.5 py-3 text-[12.5px] font-semibold text-[#2F6B45]">
          Aucune observation pour le moment — la tontine est sereine.
        </p>
      ) : (
        <TableWrap label="Observations du censeur">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Mois</th>
              <th className={TH}>Objet</th>
              <th className={TH}>Membre</th>
              <th className={TH}>Constat</th>
              <th className={TH}>Suite donnée</th>
              <th className={TH}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, t, m }, i) => (
              <tr key={`${a.memberId}-${a.month0}`} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold capitalize text-[#2B3530]`}>{t.mois}</td>
                <td className={`${TD} whitespace-nowrap font-semibold ${a.type === "absence" ? "text-[#A5473D]" : "text-[#8A6420]"}`}>
                  {a.type === "absence" ? "Absence non excusée" : "Retard de cotisation"}
                </td>
                <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{m.name}</td>
                <td className={`${TD} text-[#5C6B60]`}>{a.note}</td>
                <td className={`${TD} text-[#5C6B60]`}>Pénalité de {fmtN(a.montant)} FCFA versée à la caisse sociale</td>
                <td className={TD}><Chip cls={CHIP_OK}>Réglé ✓</Chip></td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </Block>
  );
}

/* ══════════════════════════ page MES FINANCES · ÉPARGNES & PRÊTS ══════════════════════════ */

/** Sous-onglets épargnes / prêts — chacun a son URL. L'univers FINANCES a sa
 *  propre identité visuelle : sarcelle pour l'épargne, terracotta pour les
 *  prêts — différencié du vert de la tontine. */
function SousOngletsFinances({ mode, onSub }: { mode: "cotisations" | "dettes"; onSub: (p: TPage) => void }) {
  const onglets: { key: TPage; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
    { key: "cotisations", label: "Mes épargnes", icon: PiggyBank, accent: FINANCES_ACCENT },
    { key: "dettes", label: "Mes prêts", icon: HandCoins, accent: PRETS_ACCENT },
  ];
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-1.5" role="tablist" aria-label="Mes finances — épargnes et prêts">
      {onglets.map(({ key, label, icon: Icon, accent }) => {
        const on = mode === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={on}
            onClick={() => onSub(key)}
            className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl px-2 text-[12.5px] font-bold transition-all ${
              on ? "text-white shadow-sm" : "text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
            }`}
            style={on ? { background: accent } : undefined}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        );
      })}
    </div>
  );
}

/** Taux mensuel partagé (épargnes + prêts) — réglage RÉSERVÉ au bureau :
 *  président et secrétaire. Un membre voit le taux en lecture seule, avec un
 *  bouton « Signaler un problème » s'il estime qu'il est incorrect. */
function TauxParametrable({ taux, onAppliquer, editable = false, vousRole, onSignaler }: {
  taux: number; onAppliquer: (t: number) => void;
  editable?: boolean; vousRole?: RoleKey;
  onSignaler?: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [val, setVal] = useState(String(taux));
  useEffect(() => {
    setVal(String(taux));
  }, [taux]);
  const appliquer = () => {
    const t = Math.round(Number(val.replace(",", ".")) * 10) / 10;
    if (!isFinite(t) || t < 0 || t > 20) {
      toast.error("Taux invalide — entrez un pourcentage entre 0 et 20 %.");
      setVal(String(taux)); // on restaure la valeur en vigueur
      return;
    }
    if (t === taux) return; // pas de changement — aucune décision enregistrée
    onAppliquer(t);
    toast.success(`Décision du bureau enregistrée — taux mensuel réglé à ${fmtTaux(t)} (épargnes et prêts mis à jour).`);
  };

  // MEMBRE : lecture seule verrouillée — le taux ne doit jamais être modifié
  // par un membre ; il ne peut que le constater, le valider, ou le signaler.
  if (!editable) {
    return (
      <div className="mt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3.5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C89F62]/18 text-[#8A6420]">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13.5px] font-bold text-[#1E4D2B]">Taux en vigueur : {fmtTaux(taux)} par mois</p>
              <p className="text-[11px] text-[#8A9288]">
                Réservé au président et à la secrétaire{vousRole && vousRole !== "membre" ? ` — vous êtes ${ROLE_META[vousRole].short}` : ""}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Chip cls={CHIP_GOLD}>Par défaut : {fmtTaux(TAUX_DEFAUT)}</Chip>
            {onSignaler && (
              <SignalerButton onClick={() => onSignaler({ cible: "taux", cibleId: null, cibleLabel: `Taux mensuel (${fmtTaux(taux)})` })} />
            )}
          </div>
        </div>
        <p className="mt-2 rounded-xl bg-[#2A4A3A]/5 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#5C6B60]">
          Le pourcentage est une <strong className="text-[#1E4D2B]">décision du bureau</strong> : un membre ne peut pas le modifier. Chaque changement
          rejoint le journal des décisions et vous est soumis pour validation — sans action de votre part, il est reconnu comme validé après 7 jours.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[#C89F62]/60 bg-[#FFFDF6] px-3 py-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.5}
            value={val}
            onChange={(ev) => setVal(ev.target.value)}
            onBlur={() => appliquer()}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                appliquer();
              }
            }}
            aria-label="Taux mensuel en pourcentage — la valeur s'applique en quittant le champ ou avec Entrée"
            className="w-16 bg-transparent text-right text-[15px] font-bold text-[#1E4D2B] outline-none"
          />
          <Percent className="h-4 w-4 text-[#8A6420]" aria-hidden="true" />
        </div>
        <Chip cls={CHIP_GOLD}>Par défaut : {fmtTaux(TAUX_DEFAUT)} par mois</Chip>
        {onSignaler && (
          <SignalerButton onClick={() => onSignaler({ cible: "taux", cibleId: null, cibleLabel: `Taux mensuel (${fmtTaux(taux)})` })} />
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[#8A9288]">
        Tapez la valeur puis <strong className="text-[#1E4D2B]">quittez le champ (ou appuyez sur Entrée)</strong> — le taux s&apos;applique aussitôt, sans bouton.
        Chaque réglage est signé de votre rôle et notifié au membre — qui dispose de 7 jours pour le valider, sinon il est reconnu validé par défaut.
      </p>
    </div>
  );
}

/** Montants de la tontine — réglage RÉSERVÉ au bureau (président & secrétaire),
 *  sur le même modèle que le taux mensuel : la valeur s'applique en quittant
 *  le champ (ou avec Entrée), sans bouton. Un membre voit les montants en
 *  lecture seule, avec un bouton « Signaler un problème » s'il estime qu'ils
 *  sont incorrects. Tous les affichages dérivent de ces montants. */
function MontantsParametrable({ editable = false, vousRole, onAppliquer, onSignaler }: {
  editable?: boolean; vousRole?: RoleKey;
  onAppliquer: () => void;
  onSignaler?: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  // Champs contrôlés localement, réinitialisés quand le réglage global change.
  const [champs, setChamps] = useState<{ k: Exclude<keyof ReglagesTontine, "jourLabel">; label: string; aide: string }[]>(() => [
    { k: "montantCotisation", label: "Cotisation mensuelle", aide: "par membre et par réunion" },
    { k: "montantCollation", label: "Collation", aide: "par personne et par réunion" },
    { k: "fraisAdhesion", label: "Frais d'adhésion", aide: "une seule fois — caisse sociale" },
    { k: "penaliteRetard", label: "Pénalité de retard", aide: "versée à la caisse sociale" },
    { k: "penaliteAbsence", label: "Absence non excusée", aide: "versée à la caisse sociale" },
  ]);
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(champs.map((c) => [c.k, String(TONTINE[c.k])])),
  );

  const appliquer = (k: Exclude<keyof ReglagesTontine, "jourLabel">) => {
    const brut = (vals[k] ?? "").replace(/[^\d]/g, "");
    const v = brut ? Math.round(Number(brut)) : NaN;
    const bornes: Record<string, [number, number]> = {
      montantCotisation: [500, 500_000],
      montantCollation: [0, 100_000],
      fraisAdhesion: [0, 500_000],
      penaliteRetard: [0, 50_000],
      penaliteAbsence: [0, 100_000],
    };
    const [min, max] = bornes[k];
    if (!isFinite(v) || v < min || v > max) {
      toast.error(`Montant invalide — entrez une valeur entre ${fmtN(min)} et ${fmtN(max)} FCFA.`);
      setVals((s) => ({ ...s, [k]: String(TONTINE[k]) }));
      return;
    }
    if (v === TONTINE[k]) return; // pas de changement
    const avant = TONTINE[k];
    saveMontants({ [k]: v } as Partial<ReglagesTontine>);
    setVals((s) => ({ ...s, [k]: String(TONTINE[k]) }));
    onAppliquer();
    const libelle = champs.find((c) => c.k === k)?.label ?? k;
    toast.success(`Décision du bureau enregistrée — ${libelle.toLowerCase()} réglé à ${fmtN(TONTINE[k])} FCFA (au lieu de ${fmtN(avant)}).`);
  };

  const signalerMontants = () =>
    onSignaler?.({
      cible: "autre",
      cibleId: null,
      cibleLabel: `Montants de la tontine (cotisation ${fmtN(TONTINE.montantCotisation)} · collation ${fmtN(TONTINE.montantCollation)})`,
    });

  // MEMBRE : lecture seule verrouillée — les montants ne doivent jamais être
  // modifiés par un membre ; il ne peut que les constater ou les signaler.
  if (!editable) {
    return (
      <div className="mt-2.5">
        <TableWrap label="Montants en vigueur">
          <tbody>
            {champs.map((c, i) => (
              <tr key={c.k} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>
                  {c.label}
                  <span className="block text-[10px] font-medium text-[#8A9288]">{c.aide}</span>
                </td>
                <td className={`${TD} whitespace-nowrap text-right text-[13.5px] font-bold text-[#1E4D2B]`}>{fmtN(TONTINE[c.k])} FCFA</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-[#8A9288]">
            <Lock className="h-3.5 w-3.5" />
            Réservé au président et à la secrétaire{vousRole && vousRole !== "membre" ? ` — vous êtes ${ROLE_META[vousRole].short}` : ""}.
          </p>
          {onSignaler && <SignalerButton onClick={signalerMontants} />}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5 space-y-2">
      {champs.map((c) => (
        <div key={c.k} className="flex items-center justify-between gap-2 rounded-xl border border-[#C89F62]/50 bg-[#FFFDF6] px-3 py-2">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#2B3530]">{c.label}</p>
            <p className="text-[10.5px] text-[#8A9288]">{c.aide}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#C89F62]/60 bg-[#FFFDF6] px-2.5 py-1.5">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={vals[c.k] ?? ""}
              onChange={(ev) => setVals((s) => ({ ...s, [c.k]: ev.target.value }))}
              onBlur={() => appliquer(c.k)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  appliquer(c.k);
                }
              }}
              aria-label={`${c.label} en FCFA — la valeur s'applique en quittant le champ ou avec Entrée`}
              className="w-20 bg-transparent text-right text-[14.5px] font-bold text-[#1E4D2B] outline-none"
            />
            <span className="text-[10px] font-bold uppercase text-[#8A6420]">FCFA</span>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] leading-relaxed text-[#8A9288]">
          Tapez le montant puis <strong className="text-[#1E4D2B]">quittez le champ (ou Entrée)</strong> — il s&apos;applique aussitôt, sans bouton,
          et toutes les sommes de l&apos;application se recalculent.
        </p>
        {onSignaler && <SignalerButton onClick={signalerMontants} />}
      </div>
    </div>
  );
}

/** Petit calendrier statique d'un mois — la réunion (2ᵉ dimanche) est marquée. */
function CalendrierMois({ t, accent, titre, note }: { t: TourMois; accent?: string; titre?: string; note?: string }) {
  const A = accent ?? "#1E4D2B";
  const aujourdhui = isoDate(new Date());
  const premierJour = new Date(t.annee, t.month0, 1).getDay();
  const nbJours = new Date(t.annee, t.month0 + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(premierJour).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];
  return (
    <div className="overflow-hidden rounded-xl border border-[#E5DCC0] bg-[#FFFDF6]">
      <div className="px-2.5 py-2 text-white" style={{ background: A }}>
        <p className="text-[11.5px] font-bold capitalize leading-tight">{titre ?? t.mois}</p>
        <p className="text-[9.5px] opacity-85">Réunion le {fmtDateCourte(t.iso)}</p>
      </div>
      <div className="grid grid-cols-7 gap-0.5 p-2 text-center">
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <span key={`h${i}`} className="text-[8px] font-bold text-[#8A9288]">{d}</span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const iso = `${t.annee}-${String(t.month0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const estReunion = d === t.jour;
          const estAujourdhui = iso === aujourdhui;
          return (
            <span
              key={`j${i}`}
              className={`flex h-[16px] items-center justify-center text-[8.5px] ${
                estReunion ? "rounded-full font-bold text-white" : estAujourdhui ? "rounded-full font-bold text-[#1E4D2B] underline" : "text-[#5C6B60]"
              }`}
              style={estReunion ? { background: A } : undefined}
            >
              {d}
            </span>
          );
        })}
      </div>
      {note && <p className="border-t border-[#E5DCC0] px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-[#5C6B60]">{note}</p>}
    </div>
  );
}

/* ── page MES ÉPARGNES — dépôts mois par mois, intérêts simples jusqu'en décembre ──

   WORKFLOW (règlement du bureau) : le membre ajoute une épargne → PROPOSITION
   (en attente de validation du président ou de la secrétaire) → le bureau
   valide → le membre ne peut que VALIDER la décision (7 jours, sinon validée
   par défaut). Une épargne validée n'est plus supprimable par le membre :
   seul le signalement reste possible. Le président / la secrétaire enregistrent
   leurs épargnes directement validées (registre du bureau). */

function EpargnesPage({ annee, onSub, vousRole, vousName, sigVersion, onSignaler }: {
  annee: TourMois[]; onSub: (p: TPage) => void; vousRole: RoleKey; vousName?: string | null;
  sigVersion: number; onSignaler: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [epargnes, setEpargnes] = useState<Epargne[]>([]);
  const [decisions, setDecisions] = useState<DecisionTaux[]>([]);
  const [taux, setTaux] = useState<number>(TAUX_DEFAUT);
  const [moisChoisi, setMoisChoisi] = useState<string>(String(new Date().getMonth()));
  const [montant, setMontant] = useState("10000");
  void sigVersion; // les blocs de signalements se rafraîchissent via leur propre version

  const recharge = () => {
    const ep = loadEpargnes();
    appliqueAutoValidations(ep, []); // 7 jours sans validation du membre → validée par défaut
    setEpargnes(ep);
    setTaux(loadTaux());
    setDecisions(appliqueAutoValidationsDecisions(loadDecisions()));
  };

  useEffect(() => {
    const t = setTimeout(recharge, 0);
    return () => clearTimeout(t);
  }, []);

  const bureauEpargne = peutValiderEpargnes(vousRole); // président / secrétaire

  const ajouter = () => {
    const m0 = Number(moisChoisi);
    const capital = Math.round(Number(montant));
    if (!isFinite(capital) || capital <= 0) {
      toast.error("Indiquez le montant de l'épargne (supérieur à 0).");
      return;
    }
    const now = new Date().toISOString();
    // Le bureau (président / secrétaire) inscrit d'office une épargne validée —
    // les membres ne peuvent pas ajouter d'épargne (règle du bureau, 2026-11).
    const e: Epargne =
      { id: uid(), month0: m0, capital, statut: "validée", origine: "bureau", valideLe: now, validePar: vousRole, membreConfirmeLe: null, autoValideLe: null };
    const next = [...epargnes, e].sort((a, b) => a.month0 - b.month0 || a.id.localeCompare(b.id));
    setEpargnes(next);
    saveEpargnes(next);
    toast.success(`Épargne de ${fmtFcfa(capital)} inscrite au registre pour ${cap(annee[m0].mois)} — le membre dispose de 7 jours pour la valider.`);
    setMontant("");
  };

  const supprimer = (id: string) => {
    const e = epargnes.find((x) => x.id === id);
    if (!e) return;
    // Un membre ne peut pas supprimer une épargne actée par le bureau — il la signale.
    if (!bureauEpargne && !membrePeutSupprimer(e)) {
      toast.error("Épargne validée par le bureau — non modifiable par un membre. Utilisez « Signaler un problème ».");
      return;
    }
    const next = epargnes.filter((x) => x.id !== id);
    setEpargnes(next);
    saveEpargnes(next);
    toast.info("Épargne supprimée.");
  };

  /** Le membre VALIDE la décision du bureau (il ne peut que valider). */
  const validerDecision = (id: string) => {
    const next = epargnes.map((x) => (x.id === id ? membreValide(x) : x));
    setEpargnes(next);
    saveEpargnes(next);
    toast.success("Merci — décision du bureau validée ✓");
  };

  const appliquerTaux = (t: number) => {
    const decisions2 = enregistrerDecisionTaux(taux, t, vousRole);
    setTaux(t);
    setDecisions(appliqueAutoValidationsDecisions(decisions2));
  };

  const validerDecisionTaux = (id: string) => {
    const next = decisions.map((d) => (d.id === id ? membreValide(d) : d));
    setDecisions(next);
    saveDecisions(next);
    toast.success("Merci — décision du bureau validée ✓");
  };

  const rows = epargnes.map((e) => {
    const n = moisEcoules(e.month0, annee);
    return {
      e,
      n,
      interets: interetEpargneMois(e.capital, taux) * n,
      valeur: soldeEpargneAuMois(e.capital, taux, n),
      decembre: soldeEpargneAuMois(e.capital, taux, 11 - e.month0),
    };
  });
  const totalCapital = rows.reduce((s, r) => s + r.e.capital, 0);
  const totalInterets = rows.reduce((s, r) => s + r.interets, 0);
  const totalDecembre = rows.reduce((s, r) => s + r.decembre, 0);
  const todayIso = isoDate(new Date());

  return (
    <div className="space-y-3.5">
      <SousOngletsFinances mode="cotisations" onSub={onSub} />

      <Block
        title="Mes épargnes — vue d'ensemble"
        icon={<PiggyBank className="h-4.5 w-4.5" />}
        note="L'argent mis de côté à la tontine — indépendant de la cotisation mensuelle. Chaque dépôt porte intérêt à partir du mois suivant, jusqu'en décembre de l'année du dépôt."
      >
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniKpi label="Total épargné" value={fmtFcfa(totalCapital)} sub={`${rows.length} dépôt(s)`} tone="text-[#1E4D2B]" />
          <MiniKpi label="Intérêts acquis" value={fmtFcfa(totalInterets)} sub={`à ${fmtTaux(taux)} par mois, non cumulatif`} tone="text-[#2F6B45]" />
          <MiniKpi label="Récupéré en décembre" value={fmtFcfa(totalDecembre)} sub="épargne + intérêts de l'année" tone="text-[#8A6420]" />
        </div>
      </Block>

      {/* Décisions du bureau en attente de validation — le membre ne peut que VALIDER :
          7 jours sans action → reconnu validé par défaut. */}
      {decisions.some((d) => enAttenteMembre(d)) && (
        <Block
          title="Décisions du bureau — à valider"
          icon={<Stamp className="h-4.5 w-4.5" />}
          note={`Le bureau a réglé le taux mensuel. Vous ne pouvez que VALIDER cette décision ; sans action de votre part, elle est reconnue validée après ${DELAI_VALIDATION_JOURS} jours.`}
        >
          <div className="mt-2 space-y-2">
            {decisions.filter((d) => enAttenteMembre(d)).map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C89F62]/45 bg-[#C89F62]/8 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#1E4D2B]">
                    Taux mensuel : {fmtTaux(d.ancienne)} → {fmtTaux(d.valeur)}
                  </p>
                  <p className="text-[11px] text-[#8A9288]">
                    Décision de {ROLE_META[d.role].label.toLowerCase()} du {dateCourte(d.le)} — appliquée aux épargnes et prêts.
                  </p>
                </div>
                <FcButton onClick={() => validerDecisionTaux(d.id)} className="w-auto">
                  <Check className="h-4 w-4" /> Valider
                </FcButton>
              </div>
            ))}
          </div>
        </Block>
      )}

      <Block title="Taux mensuel — décision du bureau" icon={<Percent className="h-4.5 w-4.5" />} note={`Le pourcentage est réglé par le bureau (actuellement ${fmtTaux(taux)} par mois) et partagé par les épargnes et les prêts. Un membre ne peut pas le modifier — il le valide ou le signale.`}>
        <TauxParametrable
          editable={peutGererTaux(vousRole)}
          taux={taux}
          vousRole={vousRole}
          onAppliquer={appliquerTaux}
          onSignaler={onSignaler}
        />
      </Block>

      {/* NOUVELLE ÉPARGNE — RÉSERVÉE AU BUREAU (président / secrétaire) :
          un membre ne peut PAS ajouter d'épargne (demande de l'administrateur,
          2026-11). Le membre consulte « Mes mois d'épargne », valide les
          décisions du bureau et signale un problème si besoin. */}
      {bureauEpargne ? (
        <Block
          title="Nouvelle épargne — registre du bureau"
          icon={<Plus className="h-4.5 w-4.5" />}
          note="En tant que président / secrétaire, l'épargne est inscrite d'office au registre, validée — le membre la valide ensuite (7 jours, sinon validée par défaut)."
        >
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={moisChoisi}
              onChange={(ev) => setMoisChoisi(ev.target.value)}
              aria-label="Mois de l'épargne"
              className="min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
            >
              {annee.map((t) => (
                <option key={t.month0} value={t.month0}>
                  {cap(t.mois)} — réunion le {fmtDateCourte(t.iso)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
              <input
                type="number"
                inputMode="numeric"
                min={500}
                step={500}
                value={montant}
                onChange={(ev) => setMontant(ev.target.value)}
                aria-label="Montant de l'épargne en FCFA"
                className="w-24 bg-transparent text-right text-[14px] font-bold text-[#1E4D2B] outline-none"
              />
              <span className="text-[11px] font-bold text-[#8A9288]">FCFA</span>
            </div>
            <FcButton onClick={ajouter} className="w-auto">
              Inscrire l&apos;épargne
            </FcButton>
          </div>
        </Block>
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C89F62]/18 text-[#8A6420]">
            <Lock className="h-4 w-4" />
          </span>
          <p className="text-[12px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Les épargnes sont inscrites par le bureau</strong> — seul le président ou la secrétaire ajoute un dépôt au registre.
            Vous consultez vos mois d&apos;épargne ci-dessous, vous validez les décisions du bureau, et vous utilisez «&nbsp;Signaler&nbsp;» en cas d&apos;erreur.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <Block title="Aucune épargne pour le moment" icon={<Info className="h-4.5 w-4.5" />}>
          <p className="mt-2 rounded-xl bg-[#FFFDF6] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#5C6B60]">
            Exemple : une épargne de <strong className="text-[#1E4D2B]">10 000 FCFA en mars</strong> à {fmtTaux(taux)} devient{" "}
            <strong className="text-[#2F6B45]">10 300 en avril</strong>, <strong className="text-[#2F6B45]">10 600 en mai</strong>,{" "}
            <strong className="text-[#2F6B45]">10 900 en juin</strong>… et est récupérée en décembre avec tous ses intérêts.
          </p>
        </Block>
      ) : (
        <>
          {/* Section « Mes mois d'épargne » — à la demande de l'administrateur (2026-10-31) :
              toutes les épargnes réunies au même endroit, chacune avec sa période, sa somme,
              sa production et la prévision de fin d'année. Remplace les cartes séparées. */}
          <Block
            title="Mes mois d'épargne"
            icon={<CalendarDays className="h-4.5 w-4.5" />}
            note={`Chaque épargne enregistrée apparaît ici avec sa période, la somme déposée, ce qu'elle a produit et la prévision de fin d'année — à ${fmtTaux(taux)} par mois.`}
          >
            <div className="mt-2 space-y-2.5">
              {rows.map((r) => (
                <LigneMoisEpargne
                  key={r.e.id}
                  e={r.e}
                  annee={annee}
                  taux={taux}
                  todayIso={todayIso}
                  bureauMode={bureauEpargne}
                  onValider={() => validerDecision(r.e.id)}
                  onSupprimer={() => supprimer(r.e.id)}
                  onSignaler={() =>
                    onSignaler({ cible: "epargne", cibleId: r.e.id, cibleLabel: `Épargne de ${annee[r.e.month0].mois} · ${fmtN(r.e.capital)} FCFA` })
                  }
                />
              ))}
            </div>
          </Block>

          {/* Calendrier global — la somme que je perçois chaque mois, TOUTES épargnes
              confondues (au lieu du seul « + » du mois) : 10 300 en mai, 10 600 en juin,
              10 900 en juillet… jusqu'à la récupération de décembre. */}
          <Block
            title="Calendrier de mes épargnes — mois par mois"
            icon={<Coins className="h-4.5 w-4.5" />}
            note={`Toutes mes épargnes réunies : chaque mois écoulé ajoute ${fmtTaux(taux)} du capital déposé — la somme perçue grandit d'un mois à l'autre jusqu'en décembre.`}
          >
            <CalendrierEpargnesGlobal epargnes={epargnes} annee={annee} taux={taux} todayIso={todayIso} />
          </Block>
        </>
      )}

      {/* Mes signalements — dépôt, suivi et suite donnée par le bureau. */}
      <MesSignalements cible="epargne" sigVersion={sigVersion} onSignaler={() => onSignaler({ cible: "epargne", cibleId: null, cibleLabel: "Mes épargnes (général)" })} />
    </div>
  );
}

/** Ligne « Mes mois d'épargne » — période, somme, production et prévision fin d'année ;
 *  dépliable : l'évolution mois par mois de CETTE épargne, avec la somme perçue
 *  qui grandit chaque mois (10 000 → 10 300 → 10 600 → 10 900…) au lieu du seul « + ».
 *  Bandeau de workflow : proposition en attente du bureau / décision à valider
 *  (7 jours) / validée — et actions Valider · Signaler · Supprimer (gated). */
function LigneMoisEpargne({
  e, annee, taux, todayIso, bureauMode, onValider, onSupprimer, onSignaler,
}: {
  e: Epargne; annee: TourMois[]; taux: number; todayIso: string; bureauMode: boolean;
  onValider: () => void; onSupprimer: () => void;
  onSignaler: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const t = annee[e.month0];
  const n = moisEcoules(e.month0, annee);
  const im = interetEpargneMois(e.capital, taux);
  const valeur = soldeEpargneAuMois(e.capital, taux, n);
  const decembre = soldeEpargneAuMois(e.capital, taux, 11 - e.month0);
  const supprimable = bureauMode || membrePeutSupprimer(e);
  const attenteMembre = enAttenteMembre(e);
  const joursRestants = attenteMembre && e.valideLe ? Math.max(DELAI_VALIDATION_JOURS - joursDepuis(e.valideLe), 0) : null;

  // Évolution de CETTE épargne, du mois du dépôt jusqu'à décembre
  const lignes: { m: number; percu: number; interet: number | null; statut: "depot" | "ecoule" | "avenir" | "decembre" | "recuperee" }[] = [];
  for (let m = e.month0; m <= 11; m++) {
    const k = m - e.month0;
    const tenue = annee[m].iso <= todayIso;
    if (k === 0) {
      lignes.push({ m, percu: e.capital, interet: null, statut: "depot" });
    } else {
      const dernier = m === 11;
      lignes.push({
        m,
        percu: soldeEpargneAuMois(e.capital, taux, k),
        interet: im,
        statut: dernier ? (annee[11].iso <= todayIso ? "recuperee" : "decembre") : tenue ? "ecoule" : "avenir",
      });
    }
  }
  const ST: Record<string, { label: string; cls: string }> = {
    depot: { label: "Dépôt", cls: CHIP_GOLD },
    ecoule: { label: "Écoulé ✓", cls: CHIP_OK },
    avenir: { label: "À venir", cls: CHIP_NEUTRE },
    decembre: { label: "Récupération", cls: CHIP_TEAL },
    recuperee: { label: "Récupérée ✓", cls: CHIP_OK },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C89F62]/45 bg-[#FFFDF6] shadow-sm">
      {/* Bandeau de workflow — proposition · décision à valider · validée */}
      {e.statut === "proposée" ? (
        <p className="flex items-start gap-1.5 bg-[#C89F62]/14 px-3.5 py-2 text-[11px] font-semibold leading-relaxed text-[#8A6420]">
          <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Proposition en attente — le bureau (président ou secrétaire) doit valider cette épargne. Vous pouvez encore la supprimer ou la signaler.
        </p>
      ) : attenteMembre ? (
        <p className="flex items-start gap-1.5 bg-[#2F6B45]/10 px-3.5 py-2 text-[11px] font-semibold leading-relaxed text-[#2F6B45]">
          <Stamp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Validée par le bureau{e.validePar ? ` (${ROLE_META[e.validePar].label.toLowerCase()})` : ""} le {e.valideLe ? dateCourte(e.valideLe) : "—"} — vous ne pouvez que la VALIDER
          {joursRestants !== null ? ` · ${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""} avant validation par défaut` : ""}.
        </p>
      ) : e.autoValideLe ? (
        <p className="flex items-start gap-1.5 bg-[#2A4A3A]/8 px-3.5 py-2 text-[11px] font-semibold leading-relaxed text-[#5C6B60]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Validée par défaut — {DELAI_VALIDATION_JOURS} jours écoulés sans action ({dateCourte(e.autoValideLe)}).
        </p>
      ) : (
        <p className="flex items-start gap-1.5 bg-[#2F6B45]/8 px-3.5 py-2 text-[11px] font-semibold leading-relaxed text-[#2F6B45]">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Validée ✓{e.validePar ? ` — par ${ROLE_META[e.validePar].label.toLowerCase()}` : ""}
          {e.membreConfirmeLe ? ` · confirmée par vous le ${dateCourte(e.membreConfirmeLe)}` : ""}
        </p>
      )}

      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5">
        <div className="min-w-0">
          <h4 className="fc-serif text-[15px] font-bold capitalize text-[#1E4D2B]">{t.mois}</h4>
          <p className="text-[11px] text-[#8A9288]">Déposée à la réunion du {fmtDateCourte(t.iso)}{e.origine === "bureau" ? " · inscrite par le bureau" : " · proposée par vous"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip cls={CHIP_GOLD}>{fmtFcfa(e.capital)}</Chip>
          {onSignaler && (
            <SignalerButton onClick={onSignaler} label={`Signaler un problème sur l'épargne de ${t.mois}`} />
          )}
          {supprimable ? (
            <button
              type="button"
              onClick={onSupprimer}
              aria-label={`Supprimer l'épargne de ${t.mois}`}
              title="Supprimer cette épargne"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DCC0] bg-[#FFFDF6] text-[#8A9288] transition-colors hover:border-[#A5473D]/40 hover:text-[#A5473D]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span
              aria-hidden="true"
              title="Épargne validée par le bureau — non supprimable par un membre (signalez un problème si besoin)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DCC0] bg-[#FBF7EA] text-[#B9B2A0]"
            >
              <Lock className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Le membre VALIDE la décision du bureau — le seul geste qui lui reste */}
      {attenteMembre && (
        <div className="mx-3.5 mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2F6B45]/30 bg-[#2F6B45]/8 px-3 py-2.5">
          <p className="text-[11.5px] font-semibold text-[#2F6B45]">
            Décision du bureau — validez cette épargne ({fmtFcfa(e.capital)} en {t.mois}).
          </p>
          <FcButton onClick={onValider} className="w-auto">
            <Check className="h-4 w-4" /> Valider
          </FcButton>
        </div>
      )}

      {/* Trois chiffres clés : ce que l'épargne a produit, sa valeur et la prévision de fin d'année */}
      <div className="mt-2.5 grid grid-cols-3 gap-2 px-3.5">
        <MiniKpi
          label="Produit à ce jour"
          value={n > 0 ? `+${fmtN(im * n)}` : "—"}
          sub={n > 0 ? `${n} mois × ${fmtN(im)}` : "dès le mois prochain"}
          tone="text-[#2F6B45]"
        />
        <MiniKpi label="Valeur aujourd'hui" value={fmtN(valeur)} sub="épargne + intérêts" tone="text-[#1E4D2B]" />
        <MiniKpi label="Prévu fin d'année" value={fmtN(decembre)} sub="récupérée en décembre" tone="text-[#8A6420]" />
      </div>

      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="mt-2.5 flex w-full items-center justify-between gap-2 border-t border-[#E5DCC0] px-3.5 py-2.5 text-left text-[12px] font-bold text-[#8A6420] transition-colors hover:bg-[#C89F62]/10"
      >
        Évolution mois par mois — ce que je perçois
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${ouvert ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>

      {ouvert && (
        <div className="border-t border-[#E5DCC0] bg-[#FBF7EA] p-3">
          <TableWrap label={`Ce que je perçois — épargne de ${t.mois}`} className="mt-0 border-[#C89F62]/40">
            <thead>
              <tr className="bg-[#8A6420] text-white">
                <th className={TH}>Mois</th>
                <th className={TH}>Je perçois</th>
                <th className={TH}>Intérêt du mois</th>
                <th className={TH}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const st = ST[l.statut];
                const dec = l.statut === "decembre" || l.statut === "recuperee";
                return (
                  <tr key={l.m} className={dec ? "bg-[#C89F62]/14" : i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                    <td className={`${TD} whitespace-nowrap font-bold capitalize text-[#2B3530]`}>{annee[l.m].mois}</td>
                    <td className={`${TD} whitespace-nowrap font-bold text-[#1E4D2B]`}>{fmtN(l.percu)}</td>
                    <td className={`${TD} whitespace-nowrap ${l.interet ? "text-[#2F6B45]" : "text-[#8A9288]"}`}>{l.interet ? `+${fmtN(l.interet)}` : "—"}</td>
                    <td className={TD}>
                      <Chip cls={st.cls}>{st.label}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          <p className="mt-2 px-1 text-[11px] leading-relaxed text-[#5C6B60]">
            Intérêts simples — chaque mois écoulé ajoute {fmtTaux(taux)} du capital de départ ({fmtN(im)} FCFA), jamais recalculés sur les intérêts.
          </p>
        </div>
      )}
    </div>
  );
}

/** Calendrier global — TOUTES les épargnes réunies, mois par mois : la somme perçue
 *  au total (dépôts + intérêts courus) au lieu du seul « + » du mois. Ex. 10 000 en
 *  avril → 10 300 en mai → 10 600 en juin → 10 900 en juillet… jusqu'à décembre. */
function CalendrierEpargnesGlobal({
  epargnes, annee, taux, todayIso,
}: { epargnes: Epargne[]; annee: TourMois[]; taux: number; todayIso: string }) {
  const tri = [...epargnes].sort((a, b) => a.month0 - b.month0);
  const premier = tri[0]?.month0 ?? 0;
  const im = (c: number) => interetEpargneMois(c, taux);

  const lignes: { m: number; depot: number; interet: number | null; percu: number; statut: "ecoule" | "avenir" | "decembre" | "recuperee" }[] = [];
  for (let m = premier; m <= 11; m++) {
    const depot = tri.filter((e) => e.month0 === m).reduce((s, e) => s + e.capital, 0);
    const activesAvant = tri.filter((e) => e.month0 < m);
    const interet = activesAvant.length > 0 ? activesAvant.reduce((s, e) => s + im(e.capital), 0) : null;
    const percu = tri.filter((e) => e.month0 <= m).reduce((s, e) => s + soldeEpargneAuMois(e.capital, taux, m - e.month0), 0);
    const tenue = annee[m].iso <= todayIso;
    lignes.push({
      m, depot, interet, percu,
      statut: m === 11 ? (annee[11].iso <= todayIso ? "recuperee" : "decembre") : tenue ? "ecoule" : "avenir",
    });
  }
  const ST: Record<string, { label: string; cls: string }> = {
    ecoule: { label: "Écoulé ✓", cls: CHIP_OK },
    avenir: { label: "À venir", cls: CHIP_NEUTRE },
    decembre: { label: "Récupération", cls: CHIP_TEAL },
    recuperee: { label: "Récupérée ✓", cls: CHIP_OK },
  };
  const totalCapital = tri.reduce((s, e) => s + e.capital, 0);
  const decembre = lignes[lignes.length - 1]?.percu ?? 0;

  return (
    <div className="min-w-0">
      <TableWrap label="Ce que je perçois chaque mois — toutes mes épargnes" className="mt-0 border-[#C89F62]/40">
        <thead>
          <tr className="bg-[#8A6420] text-white">
            <th className={TH}>Mois</th>
            <th className={TH}>Je perçois au total</th>
            <th className={TH}>Intérêts du mois</th>
            <th className={TH}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => {
            const st = ST[l.statut];
            const dec = l.statut === "decembre" || l.statut === "recuperee";
            return (
              <tr key={l.m} className={dec ? "bg-[#C89F62]/14" : i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} whitespace-nowrap capitalize text-[#2B3530]`}>
                  <span className="block font-bold">{annee[l.m].mois}</span>
                  {l.depot > 0 && <span className="block text-[10px] font-semibold text-[#8A6420]">+ {fmtN(l.depot)} déposés</span>}
                </td>
                <td className={`${TD} whitespace-nowrap text-[14px] font-bold text-[#1E4D2B]`}>{fmtN(l.percu)}</td>
                <td className={`${TD} whitespace-nowrap ${l.interet ? "text-[#2F6B45]" : "text-[#8A9288]"}`}>{l.interet ? `+${fmtN(l.interet)}` : "—"}</td>
                <td className={TD}>
                  <Chip cls={st.cls}>{st.label}</Chip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      <div className="mt-2.5 rounded-xl bg-[#C89F62]/12 px-3.5 py-3 text-[12.5px] leading-relaxed text-[#5C6B60]">
        En décembre, je récupère <strong className="text-[#8A6420]">{fmtFcfa(decembre)}</strong> — {fmtN(totalCapital)} FCFA d&apos;épargnes +{" "}
        {fmtN(Math.max(decembre - totalCapital, 0))} FCFA d&apos;intérêts ({fmtTaux(taux)} du capital par mois écoulé, jamais recalculés sur les intérêts).
      </div>
    </div>
  );
}

/* ── page MES PRÊTS — argent emprunté à la réunion, 3 mois puis capitalisation ── */

function PretsPage({ annee, onSub, vousRole, vousName, sigVersion, onSignaler }: {
  annee: TourMois[]; onSub: (p: TPage) => void; vousRole: RoleKey; vousName?: string | null;
  sigVersion: number; onSignaler: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [prets, setPrets] = useState<Pret[]>([]);
  const [taux, setTaux] = useState<number>(TAUX_DEFAUT);
  const [moisChoisi, setMoisChoisi] = useState<string>(String(new Date().getMonth()));
  const [montant, setMontant] = useState("10000");
  void sigVersion;

  const recharge = () => {
    const pr = loadPrets();
    appliqueAutoValidations([], pr); // 7 jours sans validation du membre → validée par défaut
    setPrets(pr);
    setTaux(loadTaux());
  };

  useEffect(() => {
    const t = setTimeout(recharge, 0);
    return () => clearTimeout(t);
  }, []);

  const bureauDettes = peutGererDettes(vousRole); // président / secrétaire — un membre ne peut pas allouer de dette

  const ajouter = () => {
    const m0 = Number(moisChoisi);
    const capital = Math.round(Number(montant));
    if (!isFinite(capital) || capital <= 0) {
      toast.error("Indiquez la somme demandée (supérieure à 0).");
      return;
    }
    const now = new Date().toISOString();
    // Le bureau (président / secrétaire) alloue la dette directement (registre
    // officiel) — les membres ne peuvent pas ajouter de dette (2026-11).
    const pret: Pret =
      { id: uid(), month0: m0, capital, rembourseMois: null, rembourseMontant: 0, statut: "validée", origine: "bureau", valideLe: now, validePar: vousRole, membreConfirmeLe: null, autoValideLe: null };
    const next = [...prets, pret].sort((a, b) => a.month0 - b.month0 || a.id.localeCompare(b.id));
    setPrets(next);
    savePrets(next);
    toast.success(`Dette de ${fmtFcfa(capital)} allouée pour ${cap(annee[m0].mois)} — le membre dispose de 7 jours pour la valider.`);
    setMontant("");
  };

  const supprimer = (id: string) => {
    const p = prets.find((x) => x.id === id);
    if (!p) return;
    // RÈGLE DU BUREAU : un membre ne peut NI supprimer NI modifier une dette
    // allouée par un acteur du bureau — il peut la rembourser ou la signaler.
    if (!bureauDettes && !membrePeutSupprimer(p)) {
      toast.error("Dette allouée par le bureau — non modifiable ni supprimable par un membre. Utilisez « Signaler un problème ».");
      return;
    }
    const next = prets.filter((x) => x.id !== id);
    setPrets(next);
    savePrets(next);
    toast.info("Prêt supprimé.");
  };

  const validerDecision = (id: string) => {
    const next = prets.map((x) => (x.id === id ? membreValide(x) : x));
    setPrets(next);
    savePrets(next);
    toast.success("Merci — décision du bureau validée ✓");
  };

  const rembourser = (id: string, moisR: number) => {
    const p = prets.find((x) => x.id === id);
    if (!p) return;
    // Rembourser au mois M solde la dette avec les intérêts du mois M (fin de mois) :
    // ex. prêt de janvier, remboursement en mars → 10 900 (10 000 + 3 × 300).
    const due = dettePretAuMois(p.capital, taux, p.month0, moisR + 1);
    const next = prets.map((x) => (x.id === id ? { ...x, rembourseMois: moisR, rembourseMontant: due } : x));
    setPrets(next);
    savePrets(next);
    toast.success(`Remboursement de ${fmtFcfa(due)} enregistré — dette soldée ✓`);
  };

  const appliquerTaux = (t: number) => {
    enregistrerDecisionTaux(taux, t, vousRole);
    setTaux(t);
  };

  const mc = moisCourantAnnee(annee); // mois de l'année contenant aujourd'hui (0..12)
  const rows = prets.map((p) => {
    const rembourse = p.rembourseMois !== null;
    const dette = rembourse ? 0 : dettePretAuMois(p.capital, taux, p.month0, mc);
    const avenir = !rembourse && mc < p.month0; // prêt futur (mois pas encore arrivé)
    const enRetard = !rembourse && mc >= p.month0 + 3; // échéance du 3ᵉ mois dépassée
    return { p, rembourse, dette, avenir, enRetard };
  });
  const totalEmprunte = rows.reduce((s, r) => s + r.p.capital, 0);
  const totalDette = rows.reduce((s, r) => s + r.dette, 0);
  const totalRetard = rows.filter((r) => r.enRetard).reduce((s, r) => s + r.dette, 0);

  return (
    <div className="space-y-3.5">
      <SousOngletsFinances mode="dettes" onSub={onSub} />

      <Block
        title="Mes prêts"
        icon={<HandCoins className="h-4.5 w-4.5" />}
        note="L'argent emprunté à la réunion. La dette gagne le taux chaque mois dès le mois du prêt — montant constant pendant chaque bloc de 3 mois ; à chaque échéance des 3 mois sans remboursement, la dette totale devient la nouvelle base pour 3 nouveaux mois. Les dettes sont allouées par le bureau : un membre ne peut ni les modifier ni les supprimer — il les rembourse ou les signale."
      >
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniKpi label="Somme empruntée" value={fmtFcfa(totalEmprunte)} sub={`${rows.length} prêt(s) sur l'année`} tone="text-[#1E4D2B]" />
          <MiniKpi label="Reste à rembourser" value={fmtFcfa(totalDette)} sub="dette à ce jour, intérêts compris" tone="text-[#A5473D]" />
          <MiniKpi label="Dont en retard" value={fmtFcfa(totalRetard)} sub="échéance des 3 mois dépassée" tone="text-[#B85C33]" />
        </div>
      </Block>

      <Block title="Taux mensuel — décision du bureau" icon={<Percent className="h-4.5 w-4.5" />} note={`Le pourcentage est réglé par le bureau (actuellement ${fmtTaux(taux)} par mois). Un membre ne peut pas le modifier — il le valide ou le signale.`}>
        <TauxParametrable
          editable={peutGererTaux(vousRole)}
          taux={taux}
          vousRole={vousRole}
          onAppliquer={appliquerTaux}
          onSignaler={onSignaler}
        />
      </Block>

      {/* NOUVELLE DETTE — RÉSERVÉE AU BUREAU (président / secrétaire) : un
          membre ne peut ni ajouter ni modifier une dette — il la rembourse
          ou la signale (demande de l'administrateur, 2026-11). */}
      {bureauDettes ? (
        <Block
          title="Nouvelle dette — registre du bureau"
          icon={<Plus className="h-4.5 w-4.5" />}
          note="En tant que président / secrétaire, la dette est allouée d'office au membre — il ne pourra ni la modifier ni la supprimer, seulement la rembourser ou la signaler."
        >
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={moisChoisi}
              onChange={(ev) => setMoisChoisi(ev.target.value)}
              aria-label="Mois du prêt"
              className="min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
            >
              {annee.map((t) => (
                <option key={t.month0} value={t.month0}>
                  {cap(t.mois)} — réunion le {fmtDateCourte(t.iso)}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
              <input
                type="number"
                inputMode="numeric"
                min={500}
                step={500}
                value={montant}
                onChange={(ev) => setMontant(ev.target.value)}
                aria-label="Somme demandée en FCFA"
                className="w-24 bg-transparent text-right text-[14px] font-bold text-[#1E4D2B] outline-none"
              />
              <span className="text-[11px] font-bold text-[#8A9288]">FCFA</span>
            </div>
            <FcButton onClick={ajouter} className="w-auto">
              Allouer la dette
            </FcButton>
          </div>
        </Block>
      ) : (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-3.5 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#B85C33]/14 text-[#B85C33]">
            <Lock className="h-4 w-4" />
          </span>
          <p className="text-[12px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Les dettes sont allouées par le bureau</strong> — seul le président ou la secrétaire inscrit un prêt au registre.
            Vous consultez vos dettes ci-dessous, vous les remboursez à l&apos;échéance, et vous utilisez «&nbsp;Signaler&nbsp;» en cas d&apos;erreur.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <Block title="Aucun prêt pour le moment" icon={<Info className="h-4.5 w-4.5" />}>
          <p className="mt-2 rounded-xl bg-[#FFFDF6] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#5C6B60]">
            Exemple : un prêt de <strong className="text-[#1E4D2B]">10 000 FCFA en janvier</strong> à {fmtTaux(taux)} donne{" "}
            <strong className="text-[#A5473D]">10 300 en février</strong> puis <strong className="text-[#A5473D]">10 600 en mars</strong> — échéance de mars :{" "}
            <strong className="text-[#A5473D]">10 900 FCFA</strong> à rembourser (10 000 + 3 × 300). Sans remboursement, 10 900 devient la nouvelle base :{" "}
            <strong className="text-[#A5473D]">+327 FCFA par mois</strong> d&apos;avril à juin — échéance de juin : 11 881. Et ainsi de suite, recalcul tous les 3 mois
            jusqu&apos;au remboursement.
          </p>
        </Block>
      ) : (
        <>
          {rows.map((r) => (
            <CartePret
              key={r.p.id}
              p={r.p}
              annee={annee}
              taux={taux}
              bureauMode={bureauDettes}
              onValider={() => validerDecision(r.p.id)}
              onSupprimer={() => supprimer(r.p.id)}
              onRembourser={rembourser}
              onSignaler={() => onSignaler({ cible: "pret", cibleId: r.p.id, cibleLabel: `Dette de ${annee[r.p.month0].mois} · ${fmtN(r.p.capital)} FCFA` })}
            />
          ))}
          <Block
            title="Total de mes dettes"
            icon={<Coins className="h-4.5 w-4.5" />}
            note="Les dettes de chaque prêt sont sommées : voici ce que vous devez à la réunion à ce jour. Chaque ligne porte son bouton de signalement."
          >
            <TableWrap label="Total de mes dettes">
              <thead>
                <tr className="bg-[#A5473D] text-white">
                  <th className={TH}>Prêt</th>
                  <th className={TH}>Somme prêtée</th>
                  <th className={TH}>Dette à ce jour</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Signaler</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.p.id} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                    <td className={`${TD} whitespace-nowrap font-bold capitalize text-[#2B3530]`}>
                      {annee[r.p.month0].mois}
                      {r.p.statut === "proposée" && <span className="block text-[10px] font-semibold text-[#8A6420]">demande en attente du bureau</span>}
                      {r.p.origine === "bureau" && r.p.statut !== "proposée" && <span className="block text-[10px] font-semibold text-[#8A9288]">allouée par le bureau</span>}
                    </td>
                    <td className={`${TD} whitespace-nowrap font-semibold text-[#1E4D2B]`}>{fmtN(r.p.capital)}</td>
                    <td className={`${TD} whitespace-nowrap font-bold ${r.rembourse ? "text-[#8A9288]" : "text-[#A5473D]"}`}>{r.rembourse ? "—" : fmtN(r.dette)}</td>
                    <td className={TD}>
                      <Chip cls={r.rembourse ? CHIP_OK : r.enRetard ? CHIP_ROUGE : r.avenir ? CHIP_NEUTRE : CHIP_GOLD}>
                        {r.rembourse ? `Remboursé ✓ ${fmtN(r.p.rembourseMontant)} versés` : r.enRetard ? "En retard — non remboursé" : r.avenir ? "À venir" : "En cours"}
                      </Chip>
                    </td>
                    <td className={TD}>
                      <SignalerButton
                        small
                        label={`Signaler la dette de ${annee[r.p.month0].mois}`}
                        onClick={() => onSignaler({ cible: "pret", cibleId: r.p.id, cibleLabel: `Dette de ${annee[r.p.month0].mois} · ${fmtN(r.p.capital)} FCFA` })}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#A5473D]/10">
                  <td className={`${TD} font-bold uppercase text-[#A5473D]`}>Total des dettes</td>
                  <td className={`${TD} whitespace-nowrap font-bold text-[#1E4D2B]`}>{fmtN(totalEmprunte)}</td>
                  <td className={`${TD} whitespace-nowrap font-bold text-[#A5473D]`}>{fmtN(totalDette)}</td>
                  <td className={TD}>—</td>
                  <td className={TD}>—</td>
                </tr>
              </tbody>
            </TableWrap>
          </Block>
        </>
      )}

      {/* Mes signalements de dettes — suivi et suite donnée par le bureau. */}
      <MesSignalements cible="pret" sigVersion={sigVersion} onSignaler={() => onSignaler({ cible: "pret", cibleId: null, cibleLabel: "Mes prêts / dettes (général)" })} />
    </div>
  );
}

type LignePret = { m: number; interet: number | null; dette: number | null; statut: string; detail: string };

/** Carte d'un prêt : calendrier du mois du prêt + évolution de la dette + remboursement.
 *  Une dette allouée par le bureau est VERROUILLÉE pour le membre : ni modification
 *  ni suppression — uniquement remboursement, validation de la décision, signalement. */
function CartePret({ p, annee, taux, bureauMode, onValider, onSupprimer, onRembourser, onSignaler }: {
  p: Pret; annee: TourMois[]; taux: number; bureauMode: boolean;
  onValider: () => void; onSupprimer: () => void; onRembourser: (id: string, moisR: number) => void;
  onSignaler: () => void;
}) {
  const todayIso = isoDate(new Date());
  const t = annee[p.month0];
  const mc = moisCourantAnnee(annee); // mois courant de l'année (0..12)
  const rembourse = p.rembourseMois !== null;
  const detteJour = rembourse ? 0 : dettePretAuMois(p.capital, taux, p.month0, mc);
  const enRetard = !rembourse && mc >= p.month0 + 3; // échéance du 3ᵉ mois dépassée
  // Première échéance = fin du 3ᵉ mois, mois du prêt compris (prêt de janvier → mars)
  const moisEcheance = Math.min(p.month0 + 2, 11);
  const detteEcheance = dettePretAuMois(p.capital, taux, p.month0, moisEcheance + 1);
  const interetBase = Math.round(detteEcheance * (taux / 100));
  const prochaineEcheance = moisEcheance + 3 <= 11 ? annee[moisEcheance + 3].mois : null;
  const supprimable = bureauMode || membrePeutSupprimer(p);
  const attenteMembre = !rembourse && enAttenteMembre(p);
  const joursRestants = attenteMembre && p.valideLe ? Math.max(DELAI_VALIDATION_JOURS - joursDepuis(p.valideLe), 0) : null;

  // Mois disponibles pour enregistrer un remboursement : du mois suivant le prêt au mois courant
  const moisRemboursement: number[] = [];
  for (let m = p.month0 + 1; m <= Math.min(mc, 11); m++) moisRemboursement.push(m);
  const [moisR, setMoisR] = useState<string>(moisRemboursement.length ? String(moisRemboursement[moisRemboursement.length - 1]) : "");
  // Rembourser au mois M solde la dette avec les intérêts du mois M (fin de mois)
  const dueChoisi = moisR === "" ? 0 : dettePretAuMois(p.capital, taux, p.month0, Number(moisR) + 1);

  // Lignes d'évolution — du mois du prêt à décembre (ou jusqu'au remboursement).
  // Dette affichée = dette PENDANT le mois (10 000 en janvier, 10 300 en février…,
  // 10 600 en mars) ; intérêt du mois = taux × base du bloc — la même constante
  // pendant les 3 mois du bloc ; la somme à rembourser à l'échéance = dette du
  // 3ᵉ mois + intérêt du 3ᵉ mois (= la nouvelle base du mois suivant).
  const lignes: LignePret[] = [];
  for (let m = p.month0; m <= 11; m++) {
    const k = m - p.month0;
    if (rembourse && p.rembourseMois !== null && m > p.rembourseMois) {
      lignes.push({ m, interet: null, dette: null, statut: "solde", detail: "" });
      continue;
    }
    if (rembourse && p.rembourseMois !== null && m === p.rembourseMois) {
      lignes.push({ m, interet: null, dette: p.rembourseMontant, statut: "rembourse", detail: fmtN(p.rembourseMontant) });
      continue;
    }
    const tenue = annee[m].iso <= todayIso;
    const baseBloc = dettePretAuMois(p.capital, taux, p.month0, p.month0 + 3 * Math.floor(k / 3));
    const interetMois = Math.round(baseBloc * (taux / 100));
    const dette = dettePretAuMois(p.capital, taux, p.month0, m);
    if (k === 0) {
      lignes.push({ m, interet: interetMois, dette, statut: tenue ? "pret" : "avenir", detail: "" });
      continue;
    }
    if (k % 3 === 2) {
      // 3ᵉ mois du bloc : échéance — dette + intérêt de ce mois = somme à rembourser
      lignes.push({ m, interet: interetMois, dette, statut: tenue ? "echeance" : "echeance_avenir", detail: fmtN(dette + interetMois) });
      continue;
    }
    if (k % 3 === 0) {
      // 1ᵉʳ mois d'un nouveau bloc : la dette affichée EST la nouvelle base
      lignes.push({ m, interet: interetMois, dette, statut: tenue ? "base" : "avenir", detail: fmtN(dette) });
      continue;
    }
    lignes.push({ m, interet: interetMois, dette, statut: tenue ? "encours" : "avenir", detail: fmtN(baseBloc) });
  }
  const statutPret: Record<string, { label: (l: LignePret) => string; cls: string }> = {
    pret: { label: () => `Prêt contracté — gagne ${fmtTaux(taux)} dès ce mois`, cls: CHIP_GOLD },
    encours: { label: (l) => `En cours — ${fmtTaux(taux)} de la base (${l.detail} FCFA)`, cls: CHIP_GOLD },
    echeance: { label: (l) => `Échéance des 3 mois — à rembourser : ${l.detail} FCFA`, cls: CHIP_ROUGE },
    echeance_avenir: { label: (l) => `Échéance prévue — à rembourser : ${l.detail} FCFA`, cls: CHIP_GOLD },
    base: { label: (l) => `Nouvelle base : ${l.detail} FCFA — non remboursé`, cls: CHIP_ROUGE },
    avenir: { label: () => "À venir", cls: CHIP_NEUTRE },
    rembourse: { label: (l) => `Remboursé ✓ — ${l.detail} versés`, cls: CHIP_OK },
    solde: { label: () => "Soldé", cls: CHIP_OK },
  };

  return (
    <FcCard className="p-4">
      {/* Bandeau de workflow — demande en attente · décision à valider · allouée par le bureau */}
      {p.statut === "proposée" ? (
        <p className="mb-2.5 flex items-start gap-1.5 rounded-xl bg-[#C89F62]/14 px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#8A6420]">
          <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Demande en attente — le bureau (président, secrétaire ou trésorier) doit allouer cette dette. Tant qu'elle n'est pas actée, vous pouvez la supprimer.
        </p>
      ) : attenteMembre ? (
        <p className="mb-2.5 flex items-start gap-1.5 rounded-xl bg-[#A5473D]/10 px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#A5473D]">
          <Stamp className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Dette allouée par le bureau{p.validePar ? ` (${ROLE_META[p.validePar].label.toLowerCase()})` : ""} le {p.valideLe ? dateCourte(p.valideLe) : "—"} — vous ne pouvez que la VALIDER ou la signaler
          {joursRestants !== null ? ` · ${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""} avant validation par défaut` : ""}.
        </p>
      ) : p.origine === "bureau" ? (
        <p className="mb-2.5 flex items-start gap-1.5 rounded-xl bg-[#2A4A3A]/8 px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#5C6B60]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Dette allouée par le bureau — non modifiable ni supprimable par un membre. Remboursez-la ou signalez tout problème.
        </p>
      ) : null}

      {/* Le membre VALIDE la décision du bureau d'allouer cette dette */}
      {attenteMembre && (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2F6B45]/30 bg-[#2F6B45]/8 px-3 py-2.5">
          <p className="text-[11.5px] font-semibold text-[#2F6B45]">
            Décision du bureau — validez cette dette de {fmtFcfa(p.capital)} ({t.mois}).
          </p>
          <FcButton onClick={onValider} className="w-auto">
            <Check className="h-4 w-4" /> Valider
          </FcButton>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="fc-serif text-[15.5px] font-bold capitalize text-[#1E4D2B]">{p.origine === "bureau" && p.statut !== "proposée" ? "Dette de" : "Prêt de"} {t.mois}</h3>
          <p className="text-[11px] text-[#8A9288]">{p.origine === "bureau" && p.statut !== "proposée" ? "Allouée par le bureau à la réunion du" : "Demandé à la réunion du"} {fmtDateCourte(t.iso)} — {fmtTaux(taux)} par mois pendant 3 mois, puis nouvelle base tous les 3 mois</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Chip cls={rembourse ? CHIP_OK : enRetard ? CHIP_ROUGE : CHIP_GOLD}>{rembourse ? "Remboursé ✓" : `Dette : ${fmtN(detteJour)}`}</Chip>
          {onSignaler && (
            <SignalerButton onClick={onSignaler} label={`Signaler un problème sur la dette de ${t.mois}`} />
          )}
          {supprimable ? (
            <button
              type="button"
              onClick={onSupprimer}
              aria-label={`Supprimer le prêt de ${t.mois}`}
              title="Supprimer ce prêt"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DCC0] bg-[#FFFDF6] text-[#8A9288] transition-colors hover:border-[#A5473D]/40 hover:text-[#A5473D]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span
              aria-hidden="true"
              title="Dette allouée par le bureau — non supprimable par un membre (remboursez-la ou signalez un problème)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DCC0] bg-[#FBF7EA] text-[#B9B2A0]"
            >
              <Lock className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>

      {enRetard && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-[#A5473D]/10 p-2.5 text-[11.5px] leading-relaxed text-[#A5473D]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Non remboursé à l&apos;échéance de {annee[moisEcheance].mois} — la dette de {fmtN(detteEcheance)} FCFA devient la nouvelle base : +{fmtN(interetBase)} FCFA ({fmtTaux(taux)}) par mois
          pendant 3 mois{prochaineEcheance ? `, jusqu'à l'échéance de ${prochaineEcheance}` : ""}.
        </p>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[210px_1fr]">
        <div className="space-y-2.5">
          <CalendrierMois
            t={t}
            accent="#A5473D"
            titre={`Prêt — ${t.mois}`}
            note={rembourse ? `Remboursé en ${cap(annee[p.rembourseMois!].mois)}` : enRetard ? "Échéance dépassée — nouvelle base appliquée" : "Somme prêtée par la réunion"}
          />
          {rembourse && (
            <CalendrierMois
              t={annee[p.rembourseMois!]}
              accent="#2F6B45"
              titre={`Remboursement — ${annee[p.rembourseMois!].mois}`}
              note={`Somme versée : ${fmtN(p.rembourseMontant)} FCFA`}
            />
          )}
        </div>

        <div className="min-w-0 space-y-3">
          {/* Tableau 1 — le prêt du mois */}
          <TableWrap label={`Prêt du mois de ${t.mois}`} className="mt-0 border-[#A5473D]/30">
            <tbody>
              <tr className="bg-[#FFFDF6]">
                <td className={`${TD} font-bold text-[#2B3530]`}>Date de la demande</td>
                <td className={`${TD} text-[#5C6B60]`}>{fmtDateLong(t.iso)}</td>
              </tr>
              <tr className="bg-[#FBF7EA]">
                <td className={`${TD} font-bold text-[#2B3530]`}>Somme prêtée</td>
                <td className={`${TD} font-bold text-[#1E4D2B]`}>{fmtFcfa(p.capital)}</td>
              </tr>
              <tr className="bg-[#FFFDF6]">
                <td className={`${TD} font-bold text-[#2B3530]`}>Taux d&apos;intérêt</td>
                <td className={`${TD} text-[#5C6B60]`}>{fmtTaux(taux)} par mois — montant constant pendant chaque bloc de 3 mois ; à chaque échéance non remboursée, la dette devient la nouvelle base (recalcul tous les 3 mois)</td>
              </tr>
            </tbody>
          </TableWrap>

          {/* Tableau 2 — évolution de la dette */}
          <TableWrap label={`Évolution de la dette — prêt de ${t.mois}`} className="mt-0 border-[#A5473D]/30">
            <thead>
              <tr className="bg-[#A5473D] text-white">
                <th className={TH}>Mois</th>
                <th className={TH}>Intérêt du mois</th>
                <th className={TH}>Dette</th>
                <th className={TH}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const st = statutPret[l.statut];
                return (
                  <tr key={l.m} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                    <td className={`${TD} whitespace-nowrap font-bold capitalize text-[#2B3530]`}>{annee[l.m].mois}</td>
                    <td className={`${TD} whitespace-nowrap ${l.interet ? "text-[#A5473D]" : "text-[#8A9288]"}`}>{l.interet ? `+${fmtN(l.interet)}` : "—"}</td>
                    <td className={`${TD} whitespace-nowrap font-bold ${l.dette === null ? "text-[#8A9288]" : "text-[#1E4D2B]"}`}>{l.dette === null ? "—" : fmtN(l.dette)}</td>
                    <td className={TD}>
                      <Chip cls={st.cls}>{st.label(l)}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>

          {/* Remboursement — calendrier du mois + somme versée */}
          {rembourse ? (
            <TableWrap label={`Somme versée — remboursement de ${annee[p.rembourseMois!].mois}`} className="mt-0 border-[#2F6B45]/40">
              <tbody>
                <tr className="bg-[#2F6B45]/8">
                  <td className={`${TD} font-bold text-[#2F6B45]`}>Somme versée</td>
                  <td className={`${TD} whitespace-nowrap font-bold text-[#2F6B45]`}>
                    {fmtFcfa(p.rembourseMontant)} — le {fmtDateLong(annee[p.rembourseMois!].iso)}
                  </td>
                </tr>
                <tr className="bg-[#FFFDF6]">
                  <td className={`${TD} font-bold text-[#2B3530]`}>Dette restante</td>
                  <td className={`${TD} font-bold text-[#2F6B45]`}>0 FCFA — soldé ✓</td>
                </tr>
              </tbody>
            </TableWrap>
          ) : moisRemboursement.length > 0 ? (
            <div className="rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Remboursement</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <select
                  value={moisR}
                  onChange={(ev) => setMoisR(ev.target.value)}
                  aria-label="Mois du remboursement"
                  className="min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
                >
                  {moisRemboursement.map((m) => (
                    <option key={m} value={m}>
                      {cap(annee[m].mois)} — rembourser {fmtN(dettePretAuMois(p.capital, taux, p.month0, m + 1))} FCFA
                    </option>
                  ))}
                </select>
                <FcButton onClick={() => onRembourser(p.id, Number(moisR))} disabled={!moisR} className="w-auto">
                  Rembourser {dueChoisi ? fmtFcfa(dueChoisi) : ""}
                </FcButton>
              </div>
              <p className="mt-1.5 text-[10.5px] leading-snug text-[#8A9288]">
                Le remboursement se fait à une réunion : la somme due ce mois-là est calculée automatiquement.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-[#2F6B45]/8 px-3.5 py-2.5 text-[11.5px] font-semibold text-[#2F6B45]">
              {p.month0 <= 9
                ? `Première échéance : ${fmtN(dettePretAuMois(p.capital, taux, p.month0, p.month0 + 3))} FCFA à rembourser en ${annee[p.month0 + 2].mois}.`
                : p.month0 === 10
                  ? "Prêt de novembre — la dette court en novembre et décembre ; solde à l'assemblée générale."
                  : "Prêt de décembre — la dette court dès ce mois ; solde à l'assemblée générale."}
            </p>
          )}
        </div>
      </div>
    </FcCard>
  );
}

/* ══════════════════════════ page STATISTIQUES ══════════════════════════ */

function StatsPage({ annee, roster, payes }: { annee: TourMois[]; roster: Member[]; payes: Payes }) {
  const caisses = caissesDuMoment(annee, roster);
  const proj = projectionAnnee(annee, roster);
  const classement = classementCotisants(annee, roster, payes, "vous");
  const tenus = annee.filter((t) => !t.ag && t.iso <= isoDate(new Date())).length;
  const potM = potMensuel(roster.length);
  const collaM = collationMensuelle(roster.length);
  const adhesions = roster.length * TONTINE.fraisAdhesion;

  const partsDonut = [
    { label: "Sommes remises aux bénéficiaires", value: proj.totalPots, color: "#2F6B45" },
    { label: "Collations consommées", value: proj.totalCollations, color: "#C89F62" },
    { label: "Caisse sociale", value: proj.caisseSociale, color: "#3D6B72" },
  ];
  const totalDonut = partsDonut.reduce((s, p) => s + p.value, 0);

  const appreciation = (p: number | null): { label: string; cls: string } | null => {
    if (p === null) return null;
    if (p >= 100) return { label: "Exemplaire", cls: CHIP_OK };
    if (p >= 80) return { label: "Fiable", cls: CHIP_GOLD };
    return { label: "À surveiller", cls: CHIP_ROUGE };
  };

  return (
    <div className="space-y-3.5">
      {/* Chiffres clés */}
      <div className="grid grid-cols-2 gap-2">
        <MiniKpi label="Membres actifs" value={`${roster.length}`} sub="1 tour chacun + AG en décembre" tone="text-[#1E4D2B]" />
        <MiniKpi label="Somme mensuelle" value={fmtFcfa(potM)} sub={`${roster.length - 1} cotisants × ${fmtN(TONTINE.montantCotisation)} FCFA`} tone="text-[#8A6420]" />
        <MiniKpi label={`Collecté en ${annee[0].annee}`} value={fmtFcfa(caisses.collecte)} sub={`${tenus} réunion(s) arrivée(s)`} tone="text-[#2F6B45]" />
        <MiniKpi label="Caisse sociale" value={fmtFcfa(caisses.caisseSociale)} sub="adhésions + pénalités" tone="text-[#3D6B72]" />
      </div>

      {/* Donut — où va chaque franc */}
      <Block
        title="Où va chaque franc de l'année"
        icon={<Coins className="h-4.5 w-4.5" />}
        note="Projection sur les 11 tours et l'assemblée générale — dérivé des règles de la tontine."
      >
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <Donut parts={partsDonut} />
          <div className="w-full min-w-0 flex-1 space-y-1.5">
            {partsDonut.map((p) => (
              <div key={p.label} className="flex items-center gap-2 rounded-xl bg-[#FFFDF6] px-3 py-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#2B3530]">{p.label}</span>
                <span className="whitespace-nowrap text-[12px] font-bold text-[#1E4D2B]">{fmtN(p.value)} F</span>
                <span className="w-11 whitespace-nowrap text-right text-[11px] text-[#8A9288]">{Math.round((p.value / totalDonut) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </Block>

      {/* Barres — encaissements mensuels */}
      <Block
        title="Encaissements mois par mois"
        icon={<BarChart3 className="h-4.5 w-4.5" />}
        note="Colonnes pleines = déjà encaissé · colonne or = mois en cours · hachuré = projection à venir."
      >
        <BarresEncaissements annee={annee} />
      </Block>

      {/* Classement des cotisants */}
      <Block
        title="Classement des cotisants"
        icon={<Users className="h-4.5 w-4.5" />}
        note="« Vous » suit vos déclarations personnelles ; les autres membres suivent le registre du trésorier."
      >
        <TableWrap label="Classement des cotisants">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>#</th>
              <th className={TH}>Membre</th>
              <th className={TH}>Parts versées</th>
              <th className={TH}>Retards</th>
              <th className={TH}>Pénalités</th>
              <th className={TH}>Ponctualité</th>
              <th className={TH}>Appréciation</th>
            </tr>
          </thead>
          <tbody>
            {classement.map((r, i) => {
              const app = appreciation(r.ponctualite);
              return (
                <tr key={r.member.id} className={`${i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"} ${r.member.isVous ? "!bg-[#C89F62]/12" : ""}`}>
                  <td className={`${TD} font-bold text-[#8A9288]`}>{i + 1}</td>
                  <td className={TD}>
                    <span className="flex items-center gap-2">
                      <Avatar m={r.member} size={26} />
                      <span className="whitespace-nowrap font-semibold text-[#2B3530]">
                        {r.member.name}
                        {r.member.isVous && <span className="ml-1 text-[11px] font-bold text-[#8A6420]">(vous)</span>}
                      </span>
                    </span>
                  </td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#1E4D2B]`}>{r.versees}/{r.parts}</td>
                  <td className={`${TDC} whitespace-nowrap ${r.retards ? "font-bold text-[#A5473D]" : "text-[#8A9288]"}`}>{r.retards || "—"}</td>
                  <td className={`${TD} whitespace-nowrap ${r.penalites ? "font-semibold text-[#A5473D]" : "text-[#8A9288]"}`}>{r.penalites ? fmtN(r.penalites) : "—"}</td>
                  <td className={`${TD} whitespace-nowrap font-bold ${r.ponctualite !== null && r.ponctualite < 80 ? "text-[#A5473D]" : "text-[#2F6B45]"}`}>
                    {r.ponctualite === null ? "—" : `${r.ponctualite}%`}
                  </td>
                  <td className={TD}>{app ? <Chip cls={app.cls}>{app.label}</Chip> : <span className="text-[#8A9288]">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Block>

      {/* Projection de fin d'année */}
      <Block
        title="Projection de fin d'année"
        icon={<TrendingUp className="h-4.5 w-4.5" />}
        note="Ce que l'année complète donnera si toutes les réunions sont tenues."
      >
        <TableWrap label="Projection de fin d'année">
          <tbody>
            {([
              ["Total collecté sur l'année", proj.totalCollecte, `${proj.nbTours} réunions × (somme ${fmtN(potM)} + collation ${fmtN(collaM)})`],
              ["Sommes remises aux bénéficiaires", proj.totalPots, `${proj.nbTours} bénéficiaires × ${fmtN(potM)}`],
              ["Collations consommées", proj.totalCollations, `${proj.nbTours} réunions × ${fmtN(collaM)}`],
              ["Caisse sociale à la clôture", proj.caisseSociale, `adhésions ${fmtN(adhesions)} + pénalités ${fmtN(proj.penalites)}`],
              ["Solde final en caisse", 0, "tout l'argent collecté est remis ou consommé — la tontine ne garde rien"],
            ] as [string, number, string][]).map(([k, v, detail], i) => (
              <tr key={k} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} font-bold text-[#2B3530]`}>{k}</td>
                <td className={`${TD} whitespace-nowrap text-right font-bold ${v === 0 ? "text-[#8A9288]" : "text-[#1E4D2B]"}`}>{fmtFcfa(v)}</td>
                <td className={`${TD} text-[#5C6B60]`}>{detail}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Block>
    </div>
  );
}

/** Donut CSS (conic-gradient) — répartition des fonds de l'année. */
function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const stops = parts
    .reduce<{ ranges: string[]; acc: number }>(
      (state, p) => {
        const start = (state.acc / total) * 100;
        const end = ((state.acc + p.value) / total) * 100;
        return { ranges: [...state.ranges, `${p.color} ${start}% ${end}%`], acc: state.acc + p.value };
      },
      { ranges: [], acc: 0 },
    )
    .ranges.join(", ");
  return (
    <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }} role="img" aria-label="Répartition des fonds de l'année">
      <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-[#FBF7EA] text-center">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[#8A9288]">Total année</p>
        <p className="text-[13px] font-bold text-[#1E4D2B]">{fmtN(total)}</p>
        <p className="text-[9px] text-[#8A9288]">FCFA</p>
      </div>
    </div>
  );
}

/** Barres des encaissements — hauteur dérivée des montants (échelle relative). */
function BarresEncaissements({ annee }: { annee: TourMois[] }) {
  const H = 92;
  const max = Math.max(...annee.map((t) => t.total), 1);
  return (
    <div className="mt-3 flex items-end gap-1.5" style={{ height: H + 30 }} role="img" aria-label="Encaissements de chaque mois de l'année">
      {annee.map((t) => {
        const h = Math.max(8, Math.round((t.total / max) * H));
        const style: React.CSSProperties =
          t.etat === "passe"
            ? { background: "#2F6B45" }
            : t.etat === "courant"
              ? { background: "#C89F62" }
              : { background: "repeating-linear-gradient(45deg, rgba(42,74,58,0.18) 0px, rgba(42,74,58,0.18) 3px, transparent 3px, transparent 7px)" };
        return (
          <div key={t.month0} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[8.5px] font-bold text-[#5C6B60]">{t.etat === "futur" || t.ag ? "" : `${fmtN(Math.round(t.total / 1000))}k`}</span>
            <div className="w-full rounded-t-md" style={{ height: h, ...style }} title={`${cap(t.mois)} : ${fmtFcfa(t.total)}`} />
            <span className={`text-[9px] font-bold ${t.etat === "courant" ? "text-[#8A6420]" : "text-[#8A9288]"}`}>{MOIS_FR_SHORT[t.month0]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════ SIGNALEMENTS — bouton, pop-up, bureau ══════════════════════════ */

/** Bouton « Signaler un problème » — présent sur chaque élément (épargne,\n *  dette, taux…). Ouvre le pop-up de signalement enregistré. */
function SignalerButton({ onClick, label, small }: { onClick: () => void; label?: string; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? "Signaler un problème"}
      title={label ?? "Signaler un problème — le bureau est notifié (rappel tous les 3 jours)"}
      className={`flex shrink-0 items-center justify-center gap-1 rounded-lg border border-[#B85C33]/40 bg-[#B85C33]/10 font-bold text-[#B85C33] transition-colors hover:bg-[#B85C33]/20 ${
        small ? "h-8 px-2 text-[10.5px]" : "h-8 w-8"
      }`}
    >
      <Flag className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {small && <span>Signaler</span>}
    </button>
  );
}

/** Pop-up de signalement — enregistré localement, notifié à TOUS les membres du\n *  bureau ; sans action, la notification réapparaît tous les 3 JOURS jusqu'au\n *  traitement. Message ÉCRIT et/ou message VOCAL (micro de l'appareil). */
const VOCAL_MAX_SECONDES = 60; // durée max du message vocal (limite le stockage local)

function SignalementModal({ cible, cibleId, cibleLabel, auteur, auteurRole, onClose, onDepose }: {
  cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string;
  auteur: string; auteurRole: RoleKey;
  onClose: () => void; onDepose: () => void;
}) {
  const [motif, setMotif] = useState<MotifSignalement>(cible === "pret" ? "dette_mal_inseree" : cible === "taux" ? "taux" : "montant");
  const [message, setMessage] = useState("");
  const [vocal, setVocal] = useState<string | null>(null); // data URL audio — enregistré avec le signalement
  const [enCours, setEnCours] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [micErreur, setMicErreur] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vocalPossible =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";

  const stopMicro = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setEnCours(false);
  };

  // Nettoyage du micro si la pop-up se ferme pendant l'enregistrement
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const demarrerVocal = async () => {
    setMicErreur(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) =>
        typeof MediaRecorder.isTypeSupported === "function" ? MediaRecorder.isTypeSupported(m) : m === "audio/webm",
      );
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24_000 } : { audioBitsPerSecond: 24_000 });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const fr = new FileReader();
        fr.onload = () => setVocal(typeof fr.result === "string" ? fr.result : null);
        fr.readAsDataURL(blob);
        stopMicro();
      };
      rec.start();
      recRef.current = rec;
      setSecondes(0);
      setEnCours(true);
      timerRef.current = setInterval(() => {
        setSecondes((s) => {
          if (s + 1 >= VOCAL_MAX_SECONDES) {
            if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
            return VOCAL_MAX_SECONDES;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setMicErreur("Micro indisponible — autorisez l'accès au microphone, ou décrivez le problème par écrit.");
    }
  };

  const arreterVocal = () => {
    if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
  };

  const envoyer = () => {
    if (message.trim().length < 5 && !vocal) {
      toast.error("Décrivez le problème (5 caractères au moins) OU envoyez un message vocal.");
      return;
    }
    deposerSignalement({ cible, cibleId, cibleLabel, motif, message, vocal, auteur, auteurRole });
    toast.success("Signalement enregistré — tous les membres du bureau sont notifiés 🔔", {
      description: `Sans action du bureau, un rappel réapparaîtra tous les ${RAPPEL_SIGNALEMENT_JOURS} jours jusqu'au traitement.`,
      duration: 7000,
    });
    onDepose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#2B2416]/55 p-3 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Signaler un problème"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] shadow-2xl">
        <div className="flex items-center justify-between gap-2 rounded-t-2xl bg-[#B85C33] px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Flag className="h-4.5 w-4.5" />
            <p className="fc-serif text-[15.5px] font-bold">Signaler un problème</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-white/15">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-xl bg-[#FBF7EA] px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">Élément visé</p>
            <p className="text-[13px] font-bold text-[#1E4D2B]">{cibleLabel}</p>
          </div>
          <div>
            <label htmlFor="fc-sig-motif" className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">
              Nature du problème
            </label>
            <select
              id="fc-sig-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifSignalement)}
              className="min-h-[46px] w-full rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13.5px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
            >
              {Object.entries(MOTIFS_SIGNALEMENT).map(([k, lbl]) => (
                <option key={k} value={k}>{lbl}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fc-sig-msg" className="mb-1 block px-1 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">
              Décrivez le problème — par écrit ou à la voix
            </label>
            <textarea
              id="fc-sig-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Ex : le trésorier a inséré une dette de 15 000 FCFA en mars alors que je n'ai rien emprunté ce mois-là…"
              className="w-full rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2.5 text-[13px] leading-relaxed text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
            />
            <p className="mt-1 px-1 text-right text-[10.5px] text-[#8A9288]">{message.length}/600</p>
          </div>
          {/* Message vocal — enregistré au micro, joint au signalement (facultatif) */}
          <div className="rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">
              <AudioLines className="h-3.5 w-3.5" /> Message vocal — {vocalPossible ? "facultatif" : "indisponible ici"}
            </p>
            {vocalPossible ? (
              <div className="flex flex-wrap items-center gap-2">
                {!enCours && !vocal && (
                  <FcButton onClick={() => void demarrerVocal()} className="w-auto" variant="outline">
                    <Mic className="h-4 w-4" /> Enregistrer un message vocal
                  </FcButton>
                )}
                {enCours && (
                  <>
                    <span className="flex items-center gap-1.5 rounded-full bg-[#B85C33]/12 px-3 py-1.5 text-[12px] font-bold text-[#B85C33]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#B85C33]" aria-hidden="true" />
                      Enregistrement… {secondes}s / {VOCAL_MAX_SECONDES}s
                    </span>
                    <FcButton onClick={arreterVocal} className="w-auto">
                      <Square className="h-3.5 w-3.5" /> Arrêter
                    </FcButton>
                  </>
                )}
                {vocal && !enCours && (
                  <>
                    <audio controls src={vocal} className="h-10 max-w-[230px] flex-1" aria-label="Votre message vocal" />
                    <button
                      type="button"
                      onClick={() => setVocal(null)}
                      aria-label="Supprimer le message vocal"
                      title="Supprimer le message vocal"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5DCC0] bg-[#FFFDF6] text-[#8A9288] transition-colors hover:border-[#A5473D]/40 hover:text-[#A5473D]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {micErreur && <p className="w-full text-[11px] font-semibold text-[#A5473D]">{micErreur}</p>}
                {!vocal && !enCours && !micErreur && (
                  <p className="w-full text-[10.5px] leading-relaxed text-[#8A9288]">
                    Jusqu&apos;à {VOCAL_MAX_SECONDES} secondes — le vocal est enregistré avec le signalement et écouté par le bureau.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-[#5C6B60]">
                Votre navigateur ne permet pas l&apos;enregistrement vocal — décrivez le problème par écrit ci-dessus.
              </p>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-[#C89F62]/40 bg-[#C89F62]/10 p-3 text-[11.5px] leading-relaxed text-[#7A5B2E]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Tous les membres du bureau (président, vice-président, secrétaire, trésorier, commissaire, censeur) sont notifiés —
              message écrit et vocal compris. <strong> Rappel automatique tous les {RAPPEL_SIGNALEMENT_JOURS} jours</strong> tant que le problème n&apos;est pas traité.
            </p>
          </div>
          <div className="flex gap-2">
            <FcButton variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </FcButton>
            <FcButton onClick={envoyer} className="flex-1">
              <Flag className="h-4 w-4" /> Enregistrer
            </FcButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bloc du bureau — les signalements reçus, avec traitement (résolu / rejeté).\n *  Visible sur CHAQUE page du bureau : tout le bureau est responsable du suivi. */
function BureauSignalements({ vousRole, sigVersion, onSignaler }: {
  vousRole: RoleKey; sigVersion: number; onSignaler?: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [list, setList] = useState<Signalement[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const peuxTraiter = peutTraiterSignalements(vousRole);

  useEffect(() => {
    const t = setTimeout(() => setList(loadSignalements()), 0);
    return () => clearTimeout(t);
  }, [sigVersion]);

  const traiter = (id: string, statut: "resolu" | "rejete") => {
    const next = traiterSignalement(id, statut, resolutions[id] ?? "", vousRole);
    setList(next);
    toast.success(statut === "resolu" ? "Signalement marqué résolu — le membre voit la suite donnée ✓" : "Signalement rejeté — motif enregistré.");
  };

  const ouverts = list.filter((s) => s.statut === "ouvert");
  const traites = list.filter((s) => s.statut !== "ouvert");

  return (
    <Block
      title="Signalements — les problèmes déclarés par les membres"
      icon={<ShieldAlert className="h-4.5 w-4.5" />}
      chip={ouverts.length > 0 ? <Chip cls={CHIP_ROUGE}>{ouverts.length} en attente</Chip> : <Chip cls={CHIP_OK}>Aucun ouvert</Chip>}
      note={`Chaque élément porte un bouton « Signaler un problème ». Tous les acteurs du bureau sont notifiés, et la notification RÉAPPARAÎT TOUS LES ${RAPPEL_SIGNALEMENT_JOURS} JOURS tant qu'aucune suite n'est donnée.${peuxTraiter ? "" : " (consultation — le traitement se fait depuis la page d'un acteur du bureau)"}`}
    >
      {list.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#2F6B45]/8 px-3.5 py-3 text-[12.5px] font-semibold text-[#2F6B45]">
          Aucun signalement — la cantine est sereine.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {[...ouverts, ...traites].map((s) => {
            const jours = joursDepuis(s.creeLe);
            const ouvert = s.statut === "ouvert";
            const rappelProche = ouvert && jours >= RAPPEL_SIGNALEMENT_JOURS;
            return (
              <div
                key={s.id}
                className={`rounded-2xl border p-3.5 ${ouvert ? "border-[#B85C33]/40 bg-[#FFFDF6]" : "border-[#E5DCC0] bg-[#FBF7EA] opacity-80"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#1E4D2B]">{s.cibleLabel}</p>
                  <Chip cls={s.statut === "resolu" ? CHIP_OK : s.statut === "rejete" ? CHIP_NEUTRE : rappelProche ? CHIP_ROUGE : CHIP_GOLD}>
                    {s.statut === "resolu" ? "Résolu ✓" : s.statut === "rejete" ? "Rejeté" : rappelProche ? `Rappel — ${jours} jours sans suite` : "En attente du bureau"}
                  </Chip>
                </div>
                <p className="mt-1 text-[11.5px] text-[#5C6B60]">
                  <strong>{libelleMotif(s.motif)}</strong> — signalé par {s.auteur}{s.auteurRole && s.auteurRole !== "membre" ? ` (${ROLE_META[s.auteurRole].short})` : ""} le {dateCourte(s.creeLe)}
                </p>
                <p className="mt-1.5 rounded-lg bg-[#FBF7EA] px-3 py-2 text-[12px] leading-relaxed text-[#2B3530]">{s.message}</p>
                {s.vocal && (
                  <div className="mt-2">
                    <p className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8A9288]">
                      <AudioLines className="h-3.5 w-3.5" /> Message vocal joint
                    </p>
                    <audio controls src={s.vocal} className="h-10 w-full max-w-sm" aria-label={`Message vocal du signalement — ${s.cibleLabel}`} />
                  </div>
                )}
                {!ouvert && s.resolution && (
                  <p className="mt-1.5 rounded-lg bg-[#2F6B45]/8 px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#2F6B45]">
                    Suite donnée{s.traitePar ? ` par ${ROLE_META[s.traitePar].label.toLowerCase()}` : ""} : {s.resolution}
                  </p>
                )}
                {ouvert && peuxTraiter && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={resolutions[s.id] ?? ""}
                      onChange={(e) => setResolutions((r) => ({ ...r, [s.id]: e.target.value }))}
                      placeholder="Suite donnée (ex : dette de 15 000 corrigée en 5 000 après vérification)"
                      aria-label={`Suite donnée au signalement de ${s.cibleLabel}`}
                      className="min-h-[42px] w-full rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[12.5px] text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <FcButton onClick={() => traiter(s.id, "resolu")} className="w-auto">
                        <Check className="h-4 w-4" /> Marquer résolu
                      </FcButton>
                      <FcButton variant="outline" onClick={() => traiter(s.id, "rejete")} className="w-auto">
                        <X className="h-4 w-4" /> Rejeter
                      </FcButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {onSignaler && (
        <div className="mt-3">
          <FcButton variant="outline" onClick={() => onSignaler({ cible: "autre", cibleId: null, cibleLabel: "Problème général de la cantine" })} className="w-auto">
            <Flag className="h-4 w-4" /> Signaler un autre problème
          </FcButton>
        </div>
      )}
    </Block>
  );
}

/** Bloc du bureau — les propositions des membres qui attendent validation\n *  (épargnes : président + secrétaire · dettes : acteurs du bureau). */
function BureauValidations({ annee, vousRole, champ, actif, onSignaler }: {
  annee: TourMois[]; vousRole: RoleKey; champ: "epargnes" | "prets"; actif: boolean;
  onSignaler: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [items, setItems] = useState<(Epargne | Pret)[]>([]);
  const estEpargnes = champ === "epargnes";

  useEffect(() => {
    const t = setTimeout(() => setItems((estEpargnes ? loadEpargnes() : loadPrets()) as (Epargne | Pret)[]), 0);
    return () => clearTimeout(t);
  }, [estEpargnes]);

  const enAttente = items.filter((x) => x.statut === "proposée");
  const aValiderMembre = items.filter((x) => enAttenteMembre(x));

  const agir = () => {
    const next = (estEpargnes ? loadEpargnes() : loadPrets()) as (Epargne | Pret)[];
    setItems(next);
  };

  const valider = (id: string) => {
    if (estEpargnes) {
      const ep = loadEpargnes();
      saveEpargnes(ep.map((x) => (x.id === id ? bureauValide(x, vousRole) : x)));
    } else {
      const pr = loadPrets();
      savePrets(pr.map((x) => (x.id === id ? bureauValide(x, vousRole) : x)));
    }
    agir();
    toast.success(`Validé — le membre dispose de ${DELAI_VALIDATION_JOURS} jours pour confirmer (sinon validé par défaut).`);
  };

  const rejeter = (id: string) => {
    if (estEpargnes) {
      saveEpargnes(loadEpargnes().filter((x) => x.id !== id));
    } else {
      savePrets(loadPrets().filter((x) => x.id !== id));
    }
    agir();
    toast.info("Proposition rejetée et retirée du registre.");
  };

  return (
    <Block
      title={estEpargnes ? "Épargnes proposées — à valider par le bureau" : "Demandes de prêt — à acter par le bureau"}
      icon={<ClipboardList className="h-4.5 w-4.5" />}
      chip={enAttente.length > 0 ? <Chip cls={CHIP_GOLD}>{enAttente.length} en attente</Chip> : <Chip cls={CHIP_OK}>Rien en attente</Chip>}
      note={
        estEpargnes
          ? "Seuls le PRÉSIDENT et la SECRÉTAIRE valident les nouvelles épargnes des membres — jamais un membre lui-même. Une fois validée, l'épargne est confirmée par le membre (7 jours, sinon validée par défaut)."
          : "Les acteurs du bureau (président, secrétaire, trésorier) actent les demandes de prêt : la dette allouée devient non modifiable par le membre (remboursement ou signalement uniquement)."
      }
    >
      {enAttente.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#2F6B45]/8 px-3.5 py-3 text-[12.5px] font-semibold text-[#2F6B45]">
          Aucune proposition en attente — le registre est à jour.
        </p>
      ) : (
        <TableWrap label={estEpargnes ? "Épargnes à valider" : "Demandes de prêt à acter"}>
          <thead>
            <tr className={estEpargnes ? "bg-[#8A6420] text-white" : "bg-[#A5473D] text-white"}>
              <th className={TH}>Membre</th>
              <th className={TH}>Mois</th>
              <th className={TH}>{estEpargnes ? "Somme déposée" : "Somme demandée"}</th>
              <th className={TH}>Déposée</th>
              <th className={TH}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enAttente.map((x, i) => (
              <tr key={x.id} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                <td className={`${TD} whitespace-nowrap font-semibold text-[#2B3530]`}>Vous (membre)</td>
                <td className={`${TD} whitespace-nowrap font-bold capitalize text-[#2B3530]`}>{annee[x.month0]?.mois ?? "—"}</td>
                <td className={`${TD} whitespace-nowrap font-bold ${estEpargnes ? "text-[#1E4D2B]" : "text-[#A5473D]"}`}>{fmtN(x.capital)}</td>
                <td className={`${TD} whitespace-nowrap text-[#8A9288]`}>{x.valideLe ? dateCourte(x.valideLe) : "aujourd'hui"}</td>
                <td className={TD}>
                  {actif ? (
                    <div className="flex gap-1.5">
                      <FcButton onClick={() => valider(x.id)} className="w-auto">
                        <Check className="h-4 w-4" /> Valider
                      </FcButton>
                      <FcButton variant="outline" onClick={() => rejeter(x.id)} className="w-auto">
                        <X className="h-4 w-4" /> Rejeter
                      </FcButton>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-[#8A9288]">
                      <Lock className="h-3 w-3" /> Réservé au{estEpargnes ? " président / à la secrétaire" : " bureau"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {aValiderMembre.length > 0 && (
        <p className="mt-2 rounded-xl bg-[#C89F62]/12 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#8A6420]">
          {aValiderMembre.length} décision{aValiderMembre.length > 1 ? "s" : ""} récente{aValiderMembre.length > 1 ? "s" : ""} attend encore la validation du membre — sans action de sa part sous {DELAI_VALIDATION_JOURS} jours, elle sera reconnue validée par défaut.
        </p>
      )}
      {onSignaler && enAttente.length > 0 && (
        <div className="mt-3">
          <SignalerButton
            small
            label="Signaler un problème sur une proposition en attente"
            onClick={() => onSignaler({ cible: estEpargnes ? "epargne" : "pret", cibleId: null, cibleLabel: estEpargnes ? "Proposition d'épargne en attente" : "Demande de prêt en attente" })}
          />
        </div>
      )}
    </Block>
  );
}

/** Bloc du bureau — allouer, corriger, retirer les DETTES des membres.\n *  Une dette passée ici est allouée par un acteur du bureau : le membre ne\n *  pourra ni la modifier ni la supprimer (remboursement ou signalement). */
function GestionDettes({ annee, roster, vousRole, actif, onSignaler }: {
  annee: TourMois[]; roster: Member[]; vousRole: RoleKey; actif: boolean;
  onSignaler: (c: { cible: Signalement["cible"]; cibleId: string | null; cibleLabel: string }) => void;
}) {
  const [prets, setPrets] = useState<Pret[]>([]);
  const [membreId, setMembreId] = useState<string>("vous");
  const [moisChoisi, setMoisChoisi] = useState<string>(String(new Date().getMonth()));
  const [montant, setMontant] = useState("10000");
  const [edition, setEdition] = useState<string | null>(null);
  const [editCapital, setEditCapital] = useState("");
  const [editMois, setEditMois] = useState("0");

  useEffect(() => {
    const t = setTimeout(() => setPrets(loadPrets()), 0);
    return () => clearTimeout(t);
  }, []);

  const allouer = () => {
    const capital = Math.round(Number(montant));
    if (!isFinite(capital) || capital <= 0) {
      toast.error("Indiquez le montant de la dette (supérieur à 0).");
      return;
    }
    const m0 = Number(moisChoisi);
    const m = roster.find((x) => x.id === membreId);
    const pret: Pret = {
      id: uid(), month0: m0, capital, rembourseMois: null, rembourseMontant: 0,
      statut: "validée", origine: "bureau", valideLe: new Date().toISOString(), validePar: vousRole,
      membreConfirmeLe: null, autoValideLe: null,
    };
    const next = [...prets, pret].sort((a, b) => a.month0 - b.month0 || a.id.localeCompare(b.id));
    setPrets(next);
    savePrets(next);
    toast.success(`Dette de ${fmtFcfa(capital)} allouée à ${m?.name ?? "membre"} pour ${cap(annee[m0].mois)} — le membre la validera (7 jours, sinon validée par défaut).`);
    setMontant("");
  };

  const retirer = (id: string) => {
    const next = prets.filter((p) => p.id !== id);
    setPrets(next);
    savePrets(next);
    toast.info("Dette retirée du registre du bureau.");
  };

  const ouvrirEdition = (p: Pret) => {
    setEdition(p.id);
    setEditCapital(String(p.capital));
    setEditMois(String(p.month0));
  };

  const enregistrerEdition = () => {
    if (!edition) return;
    const capital = Math.round(Number(editCapital));
    if (!isFinite(capital) || capital <= 0) {
      toast.error("Montant invalide.");
      return;
    }
    const next = prets.map((p) => (p.id === edition ? { ...p, capital, month0: Number(editMois) } : p));
    setPrets(next);
    savePrets(next);
    setEdition(null);
    toast.success("Dette corrigée dans le registre du bureau ✓");
  };

  return (
    <Block
      title="Dettes des membres — registre du bureau"
      icon={<HandCoins className="h-4.5 w-4.5" />}
      chip={<Chip cls={CHIP_ROUGE}>{prets.filter((p) => p.rembourseMois === null).length} dette(s) en cours</Chip>}
      note="Allouez ici les dettes aux membres. Une dette allouée par le bureau ne peut être ni modifiée ni supprimée par le membre — s'il y a une erreur, il la signale et vous la corrigez ici."
    >
      {actif ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={membreId}
            onChange={(e) => setMembreId(e.target.value)}
            aria-label="Membre concerné"
            className="min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
          >
            {roster.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.isVous ? " (vous)" : ` — ${ROLE_META[m.role].short}`}
              </option>
            ))}
          </select>
          <select
            value={moisChoisi}
            onChange={(e) => setMoisChoisi(e.target.value)}
            aria-label="Mois de la dette"
            className="min-h-[44px] rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 text-[13px] font-semibold text-[#2B3530] outline-none focus-visible:outline-2 focus-visible:outline-[#C89F62]"
          >
            {annee.map((t) => (
              <option key={t.month0} value={t.month0}>{cap(t.mois)} — {fmtDateCourte(t.iso)}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] px-3 py-2">
            <input
              type="number"
              inputMode="numeric"
              min={500}
              step={500}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              aria-label="Montant de la dette en FCFA"
              className="w-24 bg-transparent text-right text-[14px] font-bold text-[#1E4D2B] outline-none"
            />
            <span className="text-[11px] font-bold text-[#8A9288]">FCFA</span>
          </div>
          <FcButton onClick={allouer} className="w-auto">
            <Plus className="h-4 w-4" /> Allouer la dette
          </FcButton>
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#2A4A3A]/5 px-3.5 py-2.5 text-[12px] font-semibold text-[#5C6B60]">
          <Lock className="h-3.5 w-3.5" /> Consultation — l'allocation des dettes appartient au président, à la secrétaire et au trésorier.
        </p>
      )}

      {prets.length > 0 ? (
        <TableWrap label="Registre des dettes">
          <thead>
            <tr className="bg-[#A5473D] text-white">
              <th className={TH}>Membre</th>
              <th className={TH}>Mois</th>
              <th className={TH}>Somme</th>
              <th className={TH}>Statut</th>
              <th className={TH}>Actions du bureau</th>
            </tr>
          </thead>
          <tbody>
            {prets.map((p, i) => {
              const m = roster.find((x) => x.id === "vous");
              const enEdition = edition === p.id;
              return (
                <tr key={p.id} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#2B3530]`}>{m?.name ?? "Vous"}{p.origine === "bureau" ? "" : " (proposition)"}</td>
                  <td className={`${TD} whitespace-nowrap font-bold capitalize text-[#2B3530]`}>
                    {enEdition ? (
                      <select
                        value={editMois}
                        onChange={(e) => setEditMois(e.target.value)}
                        aria-label="Mois corrigé de la dette"
                        className="min-h-[36px] rounded-lg border border-[#E5DCC0] bg-[#FFFDF6] px-2 text-[12px] font-semibold text-[#2B3530] outline-none"
                      >
                        {annee.map((t) => (
                          <option key={t.month0} value={t.month0}>{cap(t.mois)}</option>
                        ))}
                      </select>
                    ) : (
                      annee[p.month0]?.mois ?? "—"
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap font-bold text-[#A5473D]`}>
                    {enEdition ? (
                      <input
                        type="number"
                        value={editCapital}
                        onChange={(e) => setEditCapital(e.target.value)}
                        aria-label="Montant corrigé de la dette"
                        className="w-20 rounded-lg border border-[#E5DCC0] bg-[#FFFDF6] px-2 py-1 text-right text-[12px] font-bold text-[#1E4D2B] outline-none"
                      />
                    ) : (
                      fmtN(p.capital)
                    )}
                  </td>
                  <td className={TD}>
                    <Chip cls={p.rembourseMois !== null ? CHIP_OK : p.statut === "proposée" ? CHIP_GOLD : enAttenteMembre(p) ? CHIP_TEAL : CHIP_ROUGE}>
                      {p.rembourseMois !== null ? "Remboursée ✓" : p.statut === "proposée" ? "Demande — à acter" : enAttenteMembre(p) ? "À valider par le membre" : "Allouée par le bureau"}
                    </Chip>
                  </td>
                  <td className={TD}>
                    {actif ? (
                      enEdition ? (
                        <div className="flex gap-1.5">
                          <FcButton onClick={enregistrerEdition} className="w-auto">
                            <Check className="h-4 w-4" /> Enregistrer
                          </FcButton>
                          <FcButton variant="outline" onClick={() => setEdition(null)} className="w-auto">
                            Annuler
                          </FcButton>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <FcButton variant="outline" onClick={() => ouvrirEdition(p)} className="w-auto">
                            Corriger
                          </FcButton>
                          <FcButton variant="outline" onClick={() => retirer(p.id)} className="w-auto">
                            <Trash2 className="h-4 w-4" /> Retirer
                          </FcButton>
                        </div>
                      )
                    ) : (
                      <span className="text-[11px] text-[#8A9288]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      ) : (
        <p className="mt-3 rounded-xl bg-[#2F6B45]/8 px-3.5 py-3 text-[12.5px] font-semibold text-[#2F6B45]">
          Aucune dette au registre — personne ne doit rien à la réunion.
        </p>
      )}
      <div className="mt-3">
        <SignalerButton
          small
          label="Signaler une erreur dans le registre des dettes"
          onClick={() => onSignaler({ cible: "pret", cibleId: null, cibleLabel: "Registre des dettes du bureau" })}
        />
      </div>
    </Block>
  );
}

/** Suivi des MES signalements — dépôt, statut, suite donnée par le bureau. */
function MesSignalements({ cible, sigVersion, onSignaler }: {
  cible: Signalement["cible"]; sigVersion: number; onSignaler: () => void;
}) {
  const [list, setList] = useState<Signalement[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      const all = loadSignalements();
      setList(all.filter((s) => s.cible === cible || s.cible === "autre"));
    }, 0);
    return () => clearTimeout(t);
  }, [sigVersion, cible]);

  if (list.length === 0) {
    return (
      <Block title="Mes signalements" icon={<Flag className="h-4.5 w-4.5" />} note="Un problème sur une épargne, une dette ou le taux ? Utilisez le bouton « Signaler un problème » — le bureau est notifié et rappelé tous les 3 jours.">
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="rounded-xl bg-[#2F6B45]/8 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#2F6B45]">
            Aucun signalement de votre part — tout est en ordre.
          </p>
          <FcButton variant="outline" onClick={onSignaler} className="w-auto">
            <Flag className="h-4 w-4" /> Signaler un problème
          </FcButton>
        </div>
      </Block>
    );
  }

  return (
    <Block
      title="Mes signalements"
      icon={<Flag className="h-4.5 w-4.5" />}
      chip={
        list.some((s) => s.statut === "ouvert")
          ? <Chip cls={CHIP_GOLD}>{list.filter((s) => s.statut === "ouvert").length} en traitement</Chip>
          : <Chip cls={CHIP_OK}>Tous traités</Chip>
      }
      note={`Vos signalements et la suite donnée par le bureau. Sans action, un rappel est renvoyé au bureau tous les ${RAPPEL_SIGNALEMENT_JOURS} jours.`}
    >
      <div className="mt-3 space-y-2">
        {list.map((s) => (
          <div key={s.id} className={`rounded-xl border p-3 ${s.statut === "ouvert" ? "border-[#B85C33]/40 bg-[#FFFDF6]" : "border-[#E5DCC0] bg-[#FBF7EA]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-bold text-[#1E4D2B]">{s.cibleLabel} — {libelleMotif(s.motif)}</p>
              <Chip cls={s.statut === "resolu" ? CHIP_OK : s.statut === "rejete" ? CHIP_NEUTRE : CHIP_GOLD}>
                {s.statut === "resolu" ? "Résolu ✓" : s.statut === "rejete" ? "Rejeté" : "En traitement"}
              </Chip>
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#5C6B60]">« {s.message} »</p>
            {s.vocal && (
              <audio controls src={s.vocal} className="mt-1.5 h-10 w-full max-w-[260px]" aria-label={`Votre message vocal — ${s.cibleLabel}`} />
            )}
            {s.resolution && (
              <p className="mt-1.5 rounded-lg bg-[#2F6B45]/8 px-3 py-2 text-[12px] font-semibold leading-relaxed text-[#2F6B45]">
                Suite donnée par le bureau : {s.resolution} ({dateCourte(s.traiteLe ?? s.creeLe)})
              </p>
            )}
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ══════════════════════════ page SECRÉTAIRE — PV & décisions du bureau ══════════════════════════ */

/** Secrétaire — procès-verbaux des réunions + journal des décisions du bureau\n *  (chaque réglage du taux y est archivé, avec la validation du membre). */
function TableSecretariat({ annee, roster }: { annee: TourMois[]; roster: Member[] }) {
  const secretaire = roster.find((m) => m.role === "secretariat");
  const decisions = appliqueAutoValidationsDecisions(loadDecisions());
  const todayIso = isoDate(new Date());

  return (
    <>
      <Block
        title="Procès-verbaux des réunions"
        icon={<FileText className="h-4.5 w-4.5" />}
        note={`La secrétaire${secretaire ? ` (${secretaire.name})` : ""} rédige le compte rendu de chaque réunion et le lit au mois suivant — les PV sont archivés dans le registre de la cantine.`}
      >
        <TableWrap label="Procès-verbaux de l'année">
          <thead>
            <tr className="bg-[#1E4D2B] text-white">
              <th className={TH}>Mois</th>
              <th className={TH}>Réunion</th>
              <th className={TH}>PV</th>
              <th className={TH}>Lecture au mois suivant</th>
              <th className={TH}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {annee.map((t, i) => {
              const passe = t.iso <= todayIso;
              return (
                <tr key={t.month0} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                  <td className={`${TD} whitespace-nowrap font-bold capitalize ${t.etat === "courant" ? "text-[#8A6420]" : "text-[#2B3530]"}`}>{t.mois}</td>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{fmtDateCourte(t.iso)}</td>
                  <td className={TD}>{passe ? `PV n° ${t.month0 + 1}/${t.annee} déposé` : <span className="italic text-[#8A9288]">À rédiger après la réunion</span>}</td>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{t.month0 < 11 ? cap(annee[t.month0 + 1].mois) : "Assemblée générale"}</td>
                  <td className={TD}>
                    <Chip cls={passe ? CHIP_OK : CHIP_NEUTRE}>{passe ? "Déposé ✓" : "À venir"}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      </Block>

      <Block
        title="Journal des décisions du bureau"
        icon={<ScrollText className="h-4.5 w-4.5" />}
        note="Chaque réglage du taux mensuel est signé du rôle qui l'a pris et soumis au membre pour validation — 7 jours sans action, il est reconnu validé par défaut."
      >
        {decisions.length === 0 ? (
          <p className="mt-3 rounded-xl bg-[#C89F62]/12 px-3.5 py-3 text-[12.5px] font-semibold text-[#8A6420]">
            Aucune décision de taux enregistrée pour le moment — le taux par défaut s&apos;applique.
          </p>
        ) : (
          <TableWrap label="Décisions du bureau">
            <thead>
              <tr className="bg-[#6E4B71] text-white">
                <th className={TH}>Date</th>
                <th className={TH}>Décision</th>
                <th className={TH}>Signée par</th>
                <th className={TH}>Validation du membre</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d, i) => (
                <tr key={d.id} className={i % 2 === 0 ? "bg-[#FFFDF6]" : "bg-[#FBF7EA]"}>
                  <td className={`${TD} whitespace-nowrap text-[#5C6B60]`}>{dateCourte(d.le)}</td>
                  <td className={`${TD} whitespace-nowrap font-bold text-[#1E4D2B]`}>
                    Taux mensuel : {fmtTaux(d.ancienne)} → {fmtTaux(d.valeur)}
                  </td>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#6E4B71]`}>{ROLE_META[d.role].label}</td>
                  <td className={TD}>
                    {d.membreConfirmeLe ? (
                      <Chip cls={CHIP_OK}>Validée par le membre ✓ ({dateCourte(d.membreConfirmeLe)})</Chip>
                    ) : d.autoValideLe ? (
                      <Chip cls={CHIP_NEUTRE}>Validée par défaut — 7 jours ({dateCourte(d.autoValideLe)})</Chip>
                    ) : (
                      <Chip cls={CHIP_GOLD}>
                        En attente — {Math.max(DELAI_VALIDATION_JOURS - joursDepuis(d.valideLe), 0)} jour(s) restant(s)
                      </Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Block>
    </>
  );
}
