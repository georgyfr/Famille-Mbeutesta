"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, deviceName, timeAgo, urlBase64ToUint8Array } from "@/lib/fc-client";
import { FcButton, FcCard, PriorityBadge } from "./ui";
import { roleLabel } from "./auth-flow";
import {
  Bell, BellOff, BellRing, Check, CheckCheck, Copy, Fingerprint, Home, KeyRound, LifeBuoy,
  LogOut, RefreshCw, ScrollText, Send, ShieldCheck, Smartphone, Trash2, TreePine, UserPlus, Users,
} from "lucide-react";

export type SessionData = {
  user: { id: string; fullName: string; phone?: string | null; email?: string | null; role: string; hasPin: boolean };
  member: { id: string; branch: string; role: string; status: string } | null;
  device: { id: string; name: string; type: string } | null;
  unreadCount: number;
  hasPasskey: boolean;
};

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

export function Dashboard({ session, onLoggedOut }: { session: SessionData; onLoggedOut: () => void }) {
  const [tab, setTab] = useState<"home" | "notif" | "security" | "admin">("home");
  const isAdmin = isAdminRole(session.user.role);

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

      {tab === "home" && <HomeTab session={session} goTab={setTab} />}
      {tab === "notif" && <NotifTab session={session} />}
      {tab === "security" && <SecurityTab session={session} onLoggedOut={onLoggedOut} />}
      {tab === "admin" && isAdmin && <AdminTab session={session} />}

      {/* Navigation basse — mobile native */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-[#E5DCC0] bg-[#FBF7EA]/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation principale"
      >
        <div className="grid grid-cols-4">
          <NavBtn active={tab === "home"} onClick={() => setTab("home")} icon={<Home className="h-5 w-5" />} label="Accueil" />
          <NavBtn
            active={tab === "notif"}
            onClick={() => setTab("notif")}
            icon={<Bell className="h-5 w-5" />}
            label="Alertes"
            badge={session.unreadCount}
          />
          <NavBtn active={tab === "security"} onClick={() => setTab("security")} icon={<ShieldCheck className="h-5 w-5" />} label="Sécurité" />
          {isAdmin && <NavBtn active={tab === "admin"} onClick={() => setTab("admin")} icon={<UserPlus className="h-5 w-5" />} label="Secrétariat" />}
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

/* ─────────────────────────── Accueil ─────────────────────────── */

function HomeTab({ session, goTab }: { session: SessionData; goTab: (t: "notif" | "security") => void }) {
  const [pushState, setPushState] = useState<"unknown" | "unsupported" | "default" | "granted" | "denied" | "subscribed">("unknown");
  const [busyPush, setBusyPush] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      const t = setTimeout(() => setPushState("unsupported"), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPushState(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "default");
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const enablePush = useCallback(async () => {
    setBusyPush(true);
    try {
      const perm = await Notification.requestPermission();
      setPushState(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default");
      if (perm !== "granted") {
        toast.warning("Permission refusée — vous pouvez l'accorder plus tard dans les réglages du navigateur.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const vapid = await api<{ publicKey: string }>("/api/push");
      if (!vapid.ok) throw new Error(vapid.error);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const saved = await api("/api/push", { body: { action: "subscribe", subscription: sub.toJSON() } });
      if (!saved.ok) throw new Error(saved.error);
      setPushState("subscribed");
      toast.success("Notifications activées ✓ Vous recevrez les alertes de la famille même app fermée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Activation des notifications impossible.");
    } finally {
      setBusyPush(false);
    }
  }, []);

  const testPush = useCallback(async () => {
    setBusyPush(true);
    try {
      const res = await api("/api/push", { body: { action: "test" } });
      if (!res.ok) throw new Error(res.error);
      toast.success("Push envoyé ! Regardez votre écran — même vérrouillé.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusyPush(false);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Carte de bienvenue */}
      <FcCard className="overflow-hidden">
        <div className="bg-[#1E4D2B] px-5 py-4 text-white">
          <p className="text-[13px] opacity-80">Karibu,</p>
          <p className="fc-serif text-xl font-bold">{session.user.fullName}</p>
        </div>
        <div className="space-y-2 px-5 py-4 text-[14px] text-[#2B3530]">
          {session.member && (
            <>
              <div className="flex justify-between"><span className="text-[#8A9288]">Branche</span><span className="font-semibold">{session.member.branch}</span></div>
              <div className="flex justify-between"><span className="text-[#8A9288]">Rôle</span><span className="font-semibold">{roleLabel(session.member.role)}</span></div>
              <div className="flex justify-between"><span className="text-[#8A9288]">Statut</span><span className="font-semibold text-[#16A34A]">Compte actif</span></div>
            </>
          )}
          <div className="flex justify-between"><span className="text-[#8A9288]">Appareil</span><span className="font-semibold">{session.device?.name}</span></div>
        </div>
      </FcCard>

      {/* Carte notifications push */}
      <FcCard className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <BellRing className="h-5 w-5 text-[#C89F62]" />
          <h3 className="fc-serif text-lg font-bold text-[#1E4D2B]">Notifications push</h3>
        </div>
        {pushState === "unsupported" && (
          <p className="text-[13px] text-[#8A9288]">
            Votre navigateur actuel ne les prend pas en charge. Sur téléphone : installez l&apos;app via
            « Ajouter à l&apos;écran d&apos;accueil » puis rouvrez-la.
          </p>
        )}
        {pushState === "default" && (
          <>
            <p className="mb-3 text-[13px] text-[#5C6B60]">
              Recevez les événements de la famille même application fermée — comme WhatsApp. Gratuit, illimité.
            </p>
            <FcButton onClick={enablePush} disabled={busyPush}>
              {busyPush ? "Activation…" : <><BellRing className="h-5 w-5" /> Activer les notifications</>}
            </FcButton>
          </>
        )}
        {(pushState === "granted" || pushState === "subscribed") && (
          <>
            <p className="mb-3 text-[13px] text-[#16A34A]">
              ✓ {pushState === "subscribed" ? "Abonnement push actif sur cet appareil." : "Permission accordée."}
            </p>
            <FcButton variant="gold" onClick={testPush} disabled={busyPush}>
              {busyPush ? "Envoi…" : <><Send className="h-4 w-4" /> Tester la notification réelle</>}
            </FcButton>
          </>
        )}
        {pushState === "denied" && (
          <p className="flex items-center gap-2 text-[13px] text-[#B91C1C]">
            <BellOff className="h-4 w-4" /> Notifications bloquées — réautorisez-les dans les réglages du site.
          </p>
        )}
      </FcCard>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3">
        <ShortcutCard icon={<Bell className="h-5 w-5" />} label="Centre d'alertes" onClick={() => goTab("notif")} />
        <ShortcutCard icon={<ShieldCheck className="h-5 w-5" />} label="Ma sécurité" onClick={() => goTab("security")} />
      </div>

      <FcCard className="p-5">
        <div className="flex items-start gap-3">
          <TreePine className="mt-0.5 h-5 w-5 shrink-0 text-[#3D6B52]" />
          <p className="text-[13px] leading-relaxed text-[#5C6B60]">
            <strong className="text-[#1E4D2B]">Prochaines étapes du MVP :</strong> registre complet des membres (U1),
            caisse et cotisations Mobile Money (U4), moteur d&apos;événements (U2). Cette interface posera les bases
            de chacun des 7 univers.
          </p>
        </div>
      </FcCard>
    </div>
  );
}

function ShortcutCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#E5DCC0] bg-[#FBF7EA] p-3 text-[13px] font-semibold text-[#1E4D2B] shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <span className="text-[#C89F62]">{icon}</span>
      {label}
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

  return (
    <div className="space-y-4">
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
  const [phone, setPhone] = useState("");
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
        body: { fullName, phone, email, branchId, role },
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(`${res.member.fullName} pré-enregistré ✓ Code remis à usage unique.`);
      setLastCode({ code: res.accessCode.code, name: res.member.fullName });
      setFullName("");
      setPhone("");
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
          <div className="grid grid-cols-2 gap-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6…"
              inputMode="tel"
              className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-[15px] focus:border-[#2A4A3A] focus:outline-none"
              aria-label="Téléphone"
            />
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
