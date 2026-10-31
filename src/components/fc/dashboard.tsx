"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, deviceName, timeAgo, urlBase64ToUint8Array } from "@/lib/fc-client";
import { groupPhone, onlyDigits as stripDigits } from "@/lib/fc-countries";
import { PhoneCountrySelect, usePhoneCountry } from "./phone-country-select";
import { FcButton, FcCard, PriorityBadge } from "./ui";
import { roleLabel } from "./auth-flow";
import {
  Bell, BellOff, CalendarDays, Check, CheckCheck, Copy, Fingerprint, HeartHandshake, Home, KeyRound, LifeBuoy,
  LocateFixed, LogOut, MapPinned, Megaphone, Navigation, PiggyBank, RefreshCw, ScrollText, Send, ShieldCheck,
  Smartphone, Trash2, UserPlus, Users, Vote,
} from "lucide-react";
import { FamilyTab } from "./family-tab";
import { LocationWizard } from "./location-wizard";
import { TontinePage } from "./tontine-page";
import { formatPlace, type LocationDraft } from "@/lib/fc-geo";
import {
  enablePush, hasDeferredInstallPrompt, promptInstall, pushState as getPushState, startInAppNotificationPolling, testPush,
  type PushState, familyNotify,
} from "@/lib/fc-push";

export type SessionLocation = {
  country: string | null;
  region: string | null;
  department: string | null;
  city: string | null;
  arrondissement: string | null;
  quartier: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type SessionData = {
  user: {
    id: string; fullName: string; phone?: string | null; email?: string | null;
    role: string; hasPin: boolean; hasLocation: boolean;
  };
  member: { id: string; branch: string; role: string; status: string } | null;
  location: SessionLocation | null;
  device: { id: string; name: string; type: string } | null;
  unreadCount: number;
  hasPasskey: boolean;
};

function locationToDraft(loc: SessionLocation | null): LocationDraft | null {
  if (!loc) return null;
  return {
    country: loc.country ?? "",
    region: loc.region ?? "",
    department: loc.department ?? "",
    city: loc.city ?? "",
    arrondissement: loc.arrondissement ?? "",
    quartier: loc.quartier ?? "",
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: null,
    source: "manual",
  };
}

type NotificationItem = {
  id: string; univers: string; typeCode: string; priority: string;
  title: string; body: string; read: boolean; createdAt: string;
};

type DeviceItem = {
  id: string; name: string; type: string; simulated: boolean; hasPasskey: boolean;
  hasPush: boolean; lastSeen: string; revoked: boolean; current: boolean; createdAt: string;
};

type LogItem = { id: string; action: string; detail: string | null; createdAt: string };

type AdminMember = {
  id: string; fullName: string; phone?: string | null; email?: string | null; role: string;
  status: string; branch: string; branchId: string; activated: boolean;
  activeCode: string | null; codeExpiresAt: string | null;
};

const isAdminRole = (r: string) => ["SECRETAIRE", "PATRIARCHE", "CHEF_BRANCHE", "CONSEIL"].includes(r);

export function Dashboard({
  session, onLoggedOut, onRefresh,
}: { session: SessionData; onLoggedOut: () => void; onRefresh: () => Promise<void> }) {
  const [tab, setTab] = useState<"home" | "famille" | "notif" | "security" | "admin">("home");
  const [editLocation, setEditLocation] = useState(false);
  const [showTontine, setShowTontine] = useState(false);
  const isAdmin = isAdminRole(session.user.role);

  // Repli in-app : événements familiaux récents (60 s) — affichés même app ouverte,
  // et pour les navigateurs sans Web Push (iOS < 16.4, vieux WebView).
  useEffect(() => {
    const stop = startInAppNotificationPolling((n) => {
      toast.info(n.title, { description: n.body });
    });
    return stop;
  }, []);

  // Page TONTINE & COTISATIONS — URL directe /#tontine (ou /#cotisation),
  // partageable dans la famille ; la tuile « Tontine » pointe vers cette adresse.
  useEffect(() => {
    const sync = () => {
      const h = (window.location.hash || "").toLowerCase();
      setShowTontine(h === "#tontine" || h === "#cotisation" || h.startsWith("#tontine-") || h.startsWith("#tontine/"));
    };
    const t = setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  if (editLocation) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-16 pt-4">
        <LocationWizard
          initial={locationToDraft(session.location)}
          onSaved={async () => {
            setEditLocation(false);
            await onRefresh();
          }}
        />
        <div className="mx-auto max-w-md px-1">
          <button
            onClick={() => setEditLocation(false)}
            className="w-full text-center text-[13px] text-[#8A9288] hover:underline"
          >
            Retour à l&apos;application sans modifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-28 pt-4">
      {/* En-tête */}
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo-famille.png" alt="" className="h-9 w-9" />
          <div>
            <p className="fc-serif text-[17px] font-bold leading-tight text-[#1E4D2B]">Famille.Mbeutetsa</p>
            <p className="text-[11px] leading-tight text-[#8A9288]">Le registre vivant</p>
          </div>
        </div>
        <button
          onClick={() => setTab("notif")}
          className="relative rounded-full p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/5"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {session.unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">
              {session.unreadCount > 9 ? "9+" : session.unreadCount}
            </span>
          )}
        </button>
      </header>

      {showTontine ? (
        <TontinePage
          vousName={session.user.fullName}
          onBack={() => {
            try {
              history.replaceState(null, "", window.location.pathname);
            } catch {
              /* rien */
            }
            setShowTontine(false);
          }}
        />
      ) : (
        <>
          {tab === "home" && <HomeTab session={session} goFamille={() => setTab("famille")} openLocation={() => setEditLocation(true)} />}
          {tab === "famille" && <FamilyTab onEditLocation={() => setEditLocation(true)} />}
          {tab === "notif" && <NotifTab session={session} />}
          {tab === "security" && <SecurityTab session={session} onLoggedOut={onLoggedOut} />}
          {tab === "admin" && isAdmin && <AdminTab session={session} />}
        </>
      )}

      {/* Navigation basse — mobile native */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-[#E5DCC0] bg-[#FBF7EA]/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale"
      >
        <div className={isAdmin ? "grid grid-cols-5" : "grid grid-cols-4"}>
          <NavBtn active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-5 w-5" />} label="Accueil" />
          <NavBtn active={tab === "famille"} onClick={() => setTab("famille")} icon={<MapPinned className="h-5 w-5" />} label="Famille" />
          <NavBtn
            active={tab === "notif"}
            onClick={() => setTab("notif")}
            icon={<Bell className="h-5 w-5" />}
            label="Alertes"
            badge={session.unreadCount}
          />
          <NavBtn active={tab === "security"} onClick={() => setTab("security")} icon={<ShieldCheck className="h-5 w-5" />} label="Sécurité" />
          {isAdmin && <NavBtn active={tab === "admin"} onClick={() => setTab("admin")} icon={<UserPlus className="h-5 w-5" />} label="Secrét." />}
        </div>
      </nav>
    </div>
  );
}

function NavBtn({
  active, onClick, icon, label, badge,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
        active ? "text-[#1E4D2B]" : "text-[#8A9288] hover:text-[#2A4A3A]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[9px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      {label}
      {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#C89F62]" />}
    </button>
  );
}

type FamilyStats = {
  members: number; // membres réels
  localized: number; // membres réellement localisés
  branches: number; // branches réellement créées
  unread: number; // alertes non lues (réel)
  announcement: { title: string; body: string } | null;
};

const UNIVERS_COMING = (label: string) =>
  `L'univers « ${label} » arrive très bientôt — registre complet, trésor Mobile Money, événements et votes. Vous serez alerté par notification 🔔`;

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] px-2 py-3 shadow-sm">
      <p className="fc-serif text-xl font-bold leading-tight text-[#1E4D2B]">{value}</p>
      <p className="text-center text-[11px] leading-tight text-[#8A9288]">{label}</p>
    </div>
  );
}

function HomeTab({
  session, goFamille, openLocation,
}: { session: SessionData; goFamille: () => void; openLocation: () => void }) {
  const [stats, setStats] = useState<FamilyStats | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const s = await api<{ stats: FamilyStats }>("/api/stats");
      if (s.ok) setStats(s.stats);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const loc = session.location;

  return (
    <div className="space-y-4">
      {/* Bienvenue — infos 100 % réelles du compte */}
      <FcCard className="overflow-hidden">
        <div className="bg-[#1E4D2B] px-5 py-4 text-white">
          <p className="text-[13px] opacity-80">Bienvenue,</p>
          <p className="fc-serif text-xl font-bold">{session.user.fullName}</p>
          {loc ? (
            <p className="mt-0.5 text-[12.5px] opacity-85">
              📍 {formatPlace({ city: loc.city, region: loc.region, country: loc.country })}
            </p>
          ) : (
            <button
              onClick={openLocation}
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#C89F62] px-3 py-1 text-[12px] font-bold text-[#2B2416] hover:bg-[#b98f50]"
            >
              <LocateFixed className="h-3.5 w-3.5" /> Indiquer ma localisation
            </button>
          )}
        </div>
      </FcCard>

      {/* Tableau de bord — présente les pages de l'application.
          À la demande de l'administrateur (2026-10-31) : la page d'accueil par
          défaut est ce tableau de bord ; SEULE la page Finances (la cantine de
          la famille : tontine, épargnes, prêts) y apparaît pour le moment.
          Les autres univers restent masqués (`visible: false`) tant qu'ils ne
          sont pas travaillés — ils réapparaîtront d'un simple `visible: true`. */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">
          Tableau de bord — pages de l&apos;application
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: "Finances",
              description: "Tontine familiale — réunions du 2ᵉ dimanche, cotisations, épargnes et prêts.",
              icon: <PiggyBank className="h-5 w-5" />,
              tone: TONE_OR,
              visible: true,
              wide: true,
              onClick: () => { window.location.hash = "tontine"; },
            },
            { label: "Localisation", description: "Carte & rencontres", icon: <MapPinned className="h-5 w-5" />, tone: TONE_VERT, visible: false, onClick: goFamille },
            { label: "Trésor", description: "Caisse Mobile Money", icon: <PiggyBank className="h-5 w-5" />, tone: TONE_OR, visible: false, onClick: () => toast.info(UNIVERS_COMING("Trésor")) },
            { label: "Événements", description: "Réunions & fêtes", icon: <CalendarDays className="h-5 w-5" />, tone: TONE_TERRACOTTA, visible: false, onClick: () => toast.info(UNIVERS_COMING("Événements")) },
            { label: "Solidarité", description: "Entraide & coups durs", icon: <HeartHandshake className="h-5 w-5" />, tone: TONE_GRENAT, visible: false, onClick: () => toast.info(UNIVERS_COMING("Solidarité")) },
            { label: "Votes", description: "Décisions du bureau", icon: <Vote className="h-5 w-5" />, tone: TONE_PRUNE, visible: false, onClick: () => toast.info(UNIVERS_COMING("Votes")) },
            { label: "Mémoire", description: "Histoire de la famille", icon: <ScrollText className="h-5 w-5" />, tone: TONE_PETROLE, visible: false, onClick: () => toast.info(UNIVERS_COMING("Mémoire")) },
          ]
            .filter((t) => t.visible)
            .map((t) => (
              <PageCard key={t.label} icon={t.icon} label={t.label} description={t.description} onClick={t.onClick} tone={t.tone} wide={t.wide} />
            ))}
        </div>
        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-[#8A9288]">
          Les autres pages de la famille (registre, carte, solidarité, gouvernance, mémoire…) seront ajoutées
          ici au fur et à mesure.
        </p>
      </div>

      {/* Annonce du conseil — uniquement si une vraie annonce existe */}
      {stats?.announcement && (
        <FcCard className="p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-[#C89F62]" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">
              Annonce du conseil
            </p>
          </div>
          <p className="text-[14px] font-semibold text-[#1E4D2B]">{stats.announcement.title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#5C6B60]">{stats.announcement.body}</p>
        </FcCard>
      )}

    </div>
  );
}
/* ─── Palette des tuiles « La famille » — couleurs différentes mais harmonieuses,
       tirées de la même gamme terreuse que la marque (vert/or/crème) ─── */
type TileTone = { chipBg: string; icon: string; border: string; bar: string };
const TONE_VERT: TileTone = { chipBg: "bg-[#2F6B45]/12", icon: "text-[#2F6B45]", border: "border-[#2F6B45]/30", bar: "bg-[#2F6B45]" };
const TONE_OR: TileTone = { chipBg: "bg-[#C89F62]/18", icon: "text-[#8A6420]", border: "border-[#C89F62]/45", bar: "bg-[#C89F62]" };
const TONE_TERRACOTTA: TileTone = { chipBg: "bg-[#B85C33]/12", icon: "text-[#B85C33]", border: "border-[#B85C33]/30", bar: "bg-[#B85C33]" };
const TONE_GRENAT: TileTone = { chipBg: "bg-[#A5473D]/12", icon: "text-[#A5473D]", border: "border-[#A5473D]/30", bar: "bg-[#A5473D]" };
const TONE_PRUNE: TileTone = { chipBg: "bg-[#6D5480]/12", icon: "text-[#6D5480]", border: "border-[#6D5480]/30", bar: "bg-[#6D5480]" };
const TONE_PETROLE: TileTone = { chipBg: "bg-[#3D6B72]/12", icon: "text-[#3D6B72]", border: "border-[#3D6B72]/30", bar: "bg-[#3D6B72]" };

/* Carte « page » du tableau de bord : icône + nom + description —
   la page à ouvrir est cliquable en entier. */
function PageCard({ icon, label, description, onClick, tone, wide }: { icon: React.ReactNode; label: string; description: string; onClick: () => void; tone: TileTone; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group flex min-h-[104px] items-center gap-3.5 rounded-2xl border bg-[#FFFDF6] p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${tone.border} ${wide ? "col-span-2" : ""}`}
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone.chipBg} ${tone.icon}`} aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="fc-serif block text-[16.5px] font-bold text-[#1E4D2B]">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-[#5C6B60]">{description}</span>
        <span className={`mt-2 block h-1 w-9 rounded-full ${tone.bar} opacity-80`} aria-hidden="true" />
      </span>
    </button>
  );
}

function ShortcutCard({ icon, label, onClick, tone, wide }: { icon: React.ReactNode; label: string; onClick: () => void; tone: TileTone; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[86px] flex-col items-center justify-center gap-2 rounded-2xl border bg-[#FFFDF6] p-3 text-[13px] font-semibold text-[#2B3530] shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${tone.border} ${wide ? "col-span-2" : ""}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone.chipBg} ${tone.icon}`} aria-hidden="true">{icon}</span>
      {label}
      <span className={`h-1 w-9 rounded-full ${tone.bar} opacity-80`} aria-hidden="true" />
    </button>
  );
}

/* ─────────────────────────── Notifications ─────────────────────────── */

function NotifTab({ session }: { session: SessionData }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<{ digestEnabled: boolean; quietStart: number; quietEnd: number; pushEnabled: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ notifications: NotificationItem[]; prefs: typeof prefs }>("/api/notifications");
    if (res.ok) {
      setItems(res.notifications);
      setPrefs(res.prefs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const markRead = async (id: string) => {
    await api("/api/notifications", { body: { action: "read", id } });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAll = async () => {
    const res = await api<{ readAll: number }>("/api/notifications", { body: { action: "read-all" } });
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success(`${res.readAll} notification(s) marquée(s) comme lue(s)`);
    }
  };

  const toggleDigest = async () => {
    if (!prefs) return;
    const res = await api<{ prefs: typeof prefs }>("/api/notifications", {
      body: { action: "prefs", digestEnabled: !prefs.digestEnabled },
    });
    if (res.ok) {
      setPrefs(res.prefs);
      toast.success(res.prefs.digestEnabled ? "Résumé quotidien 19h activé" : "Résumé quotidien désactivé");
    }
  };

  return (
    <div className="space-y-4">
      <FcCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#C89F62]" />
            <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Centre d&apos;alertes</h3>
          </div>
          <button
            onClick={markAll}
            className="flex items-center gap-1 text-[12px] font-medium text-[#2A4A3A] hover:underline"
          >
            <CheckCheck className="h-4 w-4" /> Tout lire
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-[#8A9288]">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#8A9288]">
            Aucune notification pour le moment. Les événements de la famille apparaîtront ici.
          </p>
        ) : (
          <ul className="fc-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-2xl border p-3 transition-colors ${
                  n.read ? "border-[#E5DCC0] bg-[#FFFDF6]" : "border-[#C89F62]/50 bg-[#C89F62]/10"
                }`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-[14px] font-bold text-[#1E4D2B]">{n.title}</p>
                  <PriorityBadge priority={n.priority} />
                </div>
                <p className="text-[13px] leading-snug text-[#5C6B60]">{n.body}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-[#8A9288]">
                    {n.univers} · {timeAgo(n.createdAt)}
                  </span>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#2A4A3A] hover:underline"
                    >
                      <Check className="h-3 w-3" /> Marquer lue
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FcCard>

      {prefs && (
        <FcCard className="p-5">
          <h3 className="fc-serif mb-3 text-lg font-bold text-[#1E4D2B]">Préférences</h3>
          <label className="flex items-center justify-between gap-3 text-[14px] text-[#2B3530]">
            <span>
              Résumé quotidien à 19 h
              <span className="block text-[12px] text-[#8A9288]">Anti-saturation : 1 récapitulatif au lieu de multiples alertes</span>
            </span>
            <input
              type="checkbox"
              checked={prefs.digestEnabled}
              onChange={toggleDigest}
              className="h-5 w-5 accent-[#1F5B3F]"
            />
          </label>
          <p className="mt-3 rounded-xl bg-[#3D6B52]/5 p-3 text-[12px] leading-relaxed text-[#5C6B60]">
            🔴 Les alertes <strong>critiques</strong> (décès, caisse en déficit) contournent toujours le silence
            nocturne et le résumé — conformément au règlement de la famille.
          </p>
        </FcCard>
      )}
    </div>
  );
}

/* ─────────────────────────── Sécurité ─────────────────────────── */

/* Carte notifications système — dans Ma sécurité */

function PushCard() {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);
  const [isIOS] = useState(() =>
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
  );

  useEffect(() => {
    const t = setTimeout(async () => setState(await getPushState()), 0);
    return () => clearTimeout(t);
  }, []);

  const enable = async () => {
    setBusy(true);
    const ok = await enablePush();
    if (ok) setState(await getPushState());
    setBusy(false);
  };

  const verify = async () => {
    setBusy(true);
    const res = await testPush();
    if (res.ok) {
      toast.success("Notification envoyée — regardez votre écran, même vérrouillé 🔔");
    } else {
      toast.error(res.error || "Envoi impossible.");
    }
    setBusy(false);
  };

  return (
    <FcCard className="p-5">
      <div className="mb-2 flex items-center gap-2">
        <Bell className="h-5 w-5 text-[#C89F62]" />
        <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Notifications du téléphone</h3>
      </div>
      {state === "unsupported" && (
        <p className="text-[13px] leading-relaxed text-[#8A9288]">
          {isIOS
            ? "Sur iPhone : ajoutez d'abord l'app à l'écran d'accueil (Partager → Sur l'écran d'accueil), puis ouvrez-la depuis l'icône."
            : "Ce navigateur ne prend pas en charge les notifications push."}
        </p>
      )}
      {state === "denied" && (
        <p className="flex items-center gap-2 text-[13px] text-[#B91C1C]">
          <BellOff className="h-4 w-4" /> Notifications bloquées — réautorisez-les dans les réglages du site
          (icône cadenas dans la barre d'adresse).
        </p>
      )}
      {(state === "default" || state === "granted") && (
        <>
          <p className="mb-3 text-[13px] leading-relaxed text-[#5C6B60]">
            Recevez les événements de la famille même application fermée — avec le son et la vibration,
            comme WhatsApp. Gratuit et illimité.
          </p>
          <FcButton onClick={enable} disabled={busy}>
            {busy ? "Activation…" : "Activer les notifications"}
          </FcButton>
        </>
      )}
      {state === "subscribed" && (
        <>
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-[#16A34A]">
            <ShieldCheck className="h-4 w-4" /> Actives sur cet appareil — même app fermée.
          </p>
          <FcButton variant="outline" onClick={verify} disabled={busy}>
            {busy ? "Envoi…" : "Vérifier que ça sonne sur mon téléphone"}
          </FcButton>
        </>
      )}
    </FcCard>
  );
}

/* Carte installation PWA — dans Ma sécurité */

function InstallCard({ isIOS }: { isIOS: boolean }) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAvailable(hasDeferredInstallPrompt()), 0);
    return () => clearTimeout(t);
  }, []);

  if (isIOS) {
    return (
      <FcCard className="p-5">
        <h3 className="fc-serif mb-2 text-lg font-bold text-[#1E4D2B]">Installer l'application</h3>
        <p className="text-[13px] leading-relaxed text-[#5C6B60]">
          Sur iPhone : touchez <strong>Partager</strong> ⎋ en bas de Safari, puis
          <strong> « Sur l'écran d'accueil »</strong>. L'icône verte de la famille apparaîtra comme une vraie app.
        </p>
      </FcCard>
    );
  }
  return (
    <FcCard className="p-5">
      <h3 className="fc-serif mb-2 text-lg font-bold text-[#1E4D2B]">Installer l'application</h3>
      {available ? (
        <>
          <p className="mb-3 text-[13px] text-[#5C6B60]">
            Ajoutez l'icône verte à votre écran d'accueil — ouverture immédiate, comme WhatsApp.
          </p>
          <FcButton
            onClick={async () => {
              const res = await promptInstall();
              if (res === "accepted") toast.success("Famille.Mbeutetsa ajoutée à votre téléphone 📱");
            }}
          >
            Installer sur mon téléphone
          </FcButton>
        </>
      ) : (
        <p className="text-[13px] leading-relaxed text-[#8A9288]">
          Ou téléchargez l'application Android :{' '}
          <a
            href="/famille-mbeutetsa.apk"
            className="font-semibold text-[#2A4A3A] underline"
            target="_blank"
            rel="noreferrer"
          >
            famille-mbeutetsa.apk
          </a>
        </p>
      )}
    </FcCard>
  );
}

function SecurityTab({ session, onLoggedOut }: { session: SessionData; onLoggedOut: () => void }) {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, l] = await Promise.all([
      api<{ devices: DeviceItem[] }>("/api/devices"),
      api<{ logs: LogItem[] }>("/api/security-log"),
    ]);
    if (d.ok) setDevices(d.devices);
    if (l.ok) setLogs(l.logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const revoke = async (dev: DeviceItem) => {
    const res = await api("/api/devices", { body: { action: "revoke", id: dev.id } });
    if (res.ok) {
      toast.success(`« ${dev.name} » n'a plus accès à votre compte.`);
      load();
    } else {
      toast.error(res.error);
    }
  };

  const logoutWeb = async () => {
    const res = await api("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      toast.success("Session fermée sur cet appareil.");
      onLoggedOut();
    }
  };

  const [isIOS] = useState(() =>
    typeof navigator !== "undefined" &&
    (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
  );

  return (
    <div className="space-y-4">
      <PushCard />
      <InstallCard isIOS={isIOS} />
      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Mes appareils</h3>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-[#8A9288]">Chargement…</p>
        ) : (
          <ul className="fc-scroll max-h-80 space-y-2 overflow-y-auto pr-1">
            {devices.map((d) => (
              <li
                key={d.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${
                  d.revoked ? "border-[#E5DCC0] bg-[#FFFDF6] opacity-60" : "border-[#E5DCC0] bg-[#FFFDF6]"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#2B3530]">
                    {d.name}
                    {d.current && <span className="ml-2 rounded-full bg-[#3D6B52]/10 px-2 py-0.5 text-[10px] font-bold text-[#2A4A3A]">CET APPAREIL</span>}
                  </p>
                  <p className="text-[12px] text-[#8A9288]">
                    {d.hasPasskey && "🔐 biométrie · "}
                    {d.hasPush && "🔔 push · "}
                    vu {timeAgo(d.lastSeen)}
                    {d.revoked && " · révoqué"}
                  </p>
                </div>
                {!d.revoked && !d.current && (
                  <button
                    onClick={() => revoke(d)}
                    className="shrink-0 rounded-lg p-2 text-[#B91C1C] hover:bg-[#B91C1C]/10"
                    aria-label={`Révoquer ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-[#8A9288]">
          Téléphone perdu ? Utilisez votre code de récupération ou demandez un nouveau code d&apos;accès au
          secrétaire : tous les appareils seront déconnectés automatiquement.
        </p>
      </FcCard>

      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Journal de sécurité</h3>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-[#8A9288]">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#8A9288]">Aucune activité enregistrée.</p>
        ) : (
          <ul className="fc-scroll max-h-80 space-y-2 overflow-y-auto pr-1">
            {logs.map((l) => (
              <li key={l.id} className="rounded-xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-[#2B3530]">{logLabel(l.action)}</p>
                  <span className="shrink-0 text-[11px] text-[#8A9288]">{timeAgo(l.createdAt)}</span>
                </div>
                {l.detail && <p className="mt-0.5 text-[12px] text-[#5C6B60]">{l.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </FcCard>

      <FcCard className="p-5">
        <h3 className="fc-serif mb-2 text-lg font-bold text-[#1E4D2B]">Session sur cet appareil</h3>
        <p className="mb-3 text-[13px] text-[#5C6B60]">
          Sur mobile, votre session reste active comme WhatsApp — pas besoin de vous déconnecter.
          « Quitter » sert uniquement aux ordinateurs partagés.
        </p>
        <FcButton variant="outline" onClick={logoutWeb}>
          <LogOut className="h-4 w-4" /> Quitter la session (web)
        </FcButton>
      </FcCard>
    </div>
  );
}

export function logLabel(action: string): string {
  const map: Record<string, string> = {
    ACTIVATED: "Compte activé",
    REENROLLED: "Ré-enrôlement (nouvel appareil)",
    DEVICES_REVOKED: "Anciens appareils révoqués",
    PASSKEY_REGISTERED: "Biométrie enregistrée",
    PASSKEY_LOGIN: "Connexion biométrique",
    PASSKEY_SIMULATED_LOGIN: "Connexion biométrie simulée",
    PIN_SET: "PIN défini",
    PIN_FAIL: "Tentative PIN échouée",
    PIN_LOCKED: "PIN verrouillé (30 min)",
    PIN_LOGIN: "Connexion par PIN",
    DEVICE_REVOKED: "Appareil révoqué",
    RECOVERY_USED: "Code de récupération utilisé",
    RECOVERY_FAILED: "Code de récupération invalide",
    MEMBER_PREREGISTERED: "Membre pré-enregistré",
    CODE_REGENERATED: "Code d'accès régénéré",
    PUSH_TEST_SENT: "Push de test envoyé",
    LOGOUT: "Session fermée",
    CODE_VERIFIED: "Code d'accès vérifié",
    OTP_REQUESTED: "Code de vérification demandé",
    OTP_VERIFIED: "Code de vérification validé",
    OTP_FAILED: "Code de vérification invalide",
  };
  return map[action] ?? action;
}

/* ─────────────────────────── Secrétariat (admin) ─────────────────────────── */

function AdminTab({ session }: { session: SessionData }) {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const { country, setCountry } = usePhoneCountry();
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [role, setRole] = useState("ADULTE");
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState<{ code: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ members: AdminMember[]; branches: { id: string; name: string }[] }>("/api/admin/members");
    if (res.ok) {
      setMembers(res.members);
      setBranches(res.branches);
      setBranchId((prev) => prev || res.branches[0]?.id || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const preRegister = async () => {
    setBusy(true);
    try {
      const res = await api<{ member: { fullName: string }; accessCode: { code: string } }>("/api/admin/members", {
        body: {
          fullName,
          // Numéro stocké au format international E.164 (+237…, +33…) — diaspora
          phone: phoneDigits ? "+" + country.dial + phoneDigits : "",
          email, branchId, role,
        },
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(`${res.member.fullName} pré-enregistré ✓ Code remis à usage unique.`);
      setLastCode({ code: res.accessCode.code, name: res.member.fullName });
      // Événement familial → notification système sur tous les appareils abonnés
      void familyNotify({
        title: "Nouveau membre pré-enregistré",
        body: `${res.member.fullName} — un code d'accès unique lui a été remis par le secrétariat.`,
        tag: "fc-preregister",
      });
      setFullName("");
      setPhoneDigits("");
      setEmail("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pré-enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async (m: AdminMember) => {
    const res = await api<{ accessCode: { code: string } }>("/api/admin/members", {
      method: "PUT",
      body: { memberId: m.id },
    });
    if (res.ok) {
      toast.success(`Nouveau code généré pour ${m.fullName}`);
      setLastCode({ code: res.accessCode.code, name: m.fullName });
      load();
    } else {
      toast.error(res.error);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    toast.success("Code copié — transmettez-le à usage unique au membre.");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <FcCard className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Pré-enregistrer un membre</h3>
        </div>
        <p className="mb-4 text-[13px] text-[#5C6B60]">
          Remplissez ses informations : le membre n&apos;aura qu&apos;à coller son code pour un accès définitif.
        </p>
        <div className="space-y-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nom complet *"
            className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[15px] focus:border-[#2A4A3A] focus:outline-none"
            aria-label="Nom complet"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-stretch gap-2">
              <PhoneCountrySelect
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  setPhoneDigits("");
                }}
              />
              <input
                value={groupPhone(phoneDigits)}
                onChange={(e) => setPhoneDigits(stripDigits(e.target.value).slice(0, country.iso === "CM" ? 9 : 14))}
                placeholder={country.iso === "CM" ? "6 91 23 45 67" : "Numéro sans l'indicatif"}
                inputMode="tel"
                className="h-[48px] w-full min-w-0 rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[15px] focus:border-[#2A4A3A] focus:outline-none"
                aria-label="Téléphone (sans indicatif)"
              />
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (diaspora)"
              inputMode="email"
              className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[15px] focus:border-[#2A4A3A] focus:outline-none"
              aria-label="Email"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[14px] focus:border-[#2A4A3A] focus:outline-none"
              aria-label="Branche"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-3 text-[14px] focus:border-[#2A4A3A] focus:outline-none"
              aria-label="Rôle"
            >
              <option value="ADULTE">Adulte (18+)</option>
              <option value="JUNIOR">Junior (&lt;18)</option>
              <option value="CHEF_BRANCHE">Chef de branche</option>
              <option value="SECRETAIRE">Secrétaire</option>
              <option value="CONSEIL">Conseil</option>
              <option value="PATRIARCHE">Patriarche</option>
            </select>
          </div>
          <FcButton onClick={preRegister} disabled={busy || fullName.trim().length < 3}>
            {busy ? "Enregistrement…" : <><KeyRound className="h-5 w-5" /> Pré-enregistrer + générer le code</>}
          </FcButton>
        </div>

        {lastCode && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-[#1F5B3F] bg-[#1F5B3F]/5 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5C6B60]">
              Code d&apos;accès de {lastCode.name} (valable 7 jours)
            </p>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="fc-serif text-2xl font-bold tracking-wider text-[#1E4D2B]">{lastCode.code}</span>
              <button onClick={() => copyCode(lastCode.code)} className="rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10" aria-label="Copier le code">
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}
      </FcCard>

      <FcCard className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Membres ({members.length})</h3>
          <button onClick={load} className="ml-auto rounded-lg p-1.5 text-[#2A4A3A] hover:bg-[#2A4A3A]/5" aria-label="Rafraîchir">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <p className="py-4 text-center text-sm text-[#8A9288]">Chargement…</p>
        ) : (
          <ul className="fc-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
            {members.map((m) => (
              <li key={m.id} className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-[#1E4D2B]">{m.fullName}</p>
                    <p className="text-[12px] text-[#8A9288]">
                      {m.branch} · {roleLabel(m.role)} ·{" "}
                      {m.activated ? (
                        <span className="font-semibold text-[#16A34A]">actif</span>
                      ) : (
                        <span className="font-semibold text-[#D97706]">pré-enregistré</span>
                      )}
                    </p>
                    {m.activeCode && !m.activated && (
                      <p className="mt-1 inline-block rounded-lg bg-[#C89F62]/15 px-2 py-0.5 text-[12px] font-bold tracking-wider text-[#7A5B2E]">
                        {m.activeCode}
                      </p>
                    )}
                  </div>
                  {!m.activated && (
                    <button
                      onClick={() => regenerate(m)}
                      className="shrink-0 rounded-lg p-2 text-[#2A4A3A] hover:bg-[#2A4A3A]/10"
                      aria-label={`Régénérer le code de ${m.fullName}`}
                      title="Régénérer un code (téléphone perdu, code expiré)"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FcCard>

      <FcCard className="p-5">
        <div className="flex items-start gap-3">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]" />
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Téléphone perdu d&apos;un membre ?</strong> Régénérez simplement son
            code (bouton ↻) : dès qu&apos;il l&apos;utilisera sur son nouvel appareil, tous les anciens appareils
            seront déconnectés automatiquement.
          </p>
        </div>
      </FcCard>

      <p className="pb-2 text-center text-[11px] text-[#8A9288]">
        Connecté en tant que {roleLabel(session.user.role)} · {deviceName()}
      </p>
    </div>
  );
}
