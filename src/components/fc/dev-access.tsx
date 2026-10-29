"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Accès ADMINISTRATEUR (développeur du site) — Famille.Mbeutetsa
// • Visible UNIQUEMENT sur navigateur de bureau (jamais sur mobile) :
//   un bouton « Admin » discret en bas à droite, un lien « Administration »
//   dans le pied de page, le raccourci clavier Ctrl+Shift+D, et l'adresse
//   directe /#admin (idéal en favori navigateur).
//   (La sécurité réelle reste le code secret — la discrétion n'est qu'ergonomique.)
// • Protégé par un code secret connu du seul développeur ; le code n'est
//   jamais stocké en clair : on compare son SHA-256.
// • Permet de visualiser toutes les données (base de démo, appareils push,
//   événements) et d'envoyer de vraies notifications push de test.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import {
  Bell, Database, KeyRound, RefreshCw, Send, Server, ShieldCheck, Terminal, X,
} from "lucide-react";
import { toast } from "sonner";
import { enablePush, pushState, testPush, type PushState } from "@/lib/fc-push";

// SHA-256 du code développeur — la préimage n'est pas dans le code
const DEV_HASH = "ae46f1f7f5f314a96dd9283a5e92b4651ca98ecc87564e42f2bc0d52269aa696";
const AUTH_KEY = "fc_dev_auth";

async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  let out = "";
  for (const b of h) out += b.toString(16).padStart(2, "0");
  return out;
}

/** Navigateur de bureau uniquement : large fenêtre + UA non mobile. */
function isDesktopBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua)) return false;
  if (!window.matchMedia("(min-width: 1024px)").matches) return false;
  return true;
}

type DevSub = { phone?: string; device?: string; added?: string; endpoint?: string };
type DevSession = { user: { fullName: string; role: string } | null; device: { name: string } | null };

async function fetchDev<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<T & { ok: boolean }> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Dev-Token": DEV_HASH, ...(init?.headers || {}) },
    cache: "no-store",
  });
  return (await res.json()) as T & { ok: boolean };
}

export function DevAccess() {
  const [desktop, setDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"overview" | "data" | "push" | "system">("overview");

  useEffect(() => {
    const t = setTimeout(() => {
      const d = isDesktopBrowser();
      setDesktop(d);
      // Adresse directe : /#admin (ou #dev / #console) ouvre la console sur bureau.
      if (d && /^(#admin|#dev|#console)$/.test(window.location.hash)) setOpen(true);
      try {
        if (sessionStorage.getItem(AUTH_KEY) === DEV_HASH) setAuthed(true);
      } catch {
        /* rien */
      }
    }, 0);
    const onHash = () => {
      if (isDesktopBrowser() && /^(#admin|#dev|#console)$/.test(window.location.hash)) setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => setDesktop(isDesktopBrowser());
    const onOpenReq = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("fc-dev-open", onOpenReq as EventListener);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("fc-dev-open", onOpenReq as EventListener);
    };
  }, []);

  if (!desktop) return null;

  const login = async () => {
    const h = await sha256Hex(code);
    if (h === DEV_HASH) {
      try {
        sessionStorage.setItem(AUTH_KEY, DEV_HASH);
      } catch {
        /* rien */
      }
      setAuthed(true);
      setCode("");
      toast.success("Connexion administrateur réussie.");
    } else {
      toast.error("Code administrateur incorrect.");
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* rien */
    }
    setAuthed(false);
    setOpen(false);
  };

  return (
    <>
      {/* Bouton « Admin » discret — présent uniquement sur navigateur de bureau.
          Pastille blanche lisible : le développeur le repère immédiatement,
          les membres de la famille (sur téléphone/APK) ne le voient jamais. */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[70] flex h-9 items-center gap-1.5 rounded-full border border-[#1E4D2B]/15 bg-white/80 pl-3 pr-3.5 text-[#1E4D2B]/55 shadow-sm backdrop-blur-[2px] transition hover:scale-[1.03] hover:border-[#1E4D2B]/30 hover:bg-white hover:text-[#1E4D2B] focus:outline-none"
        title="Connexion administrateur (Ctrl+Shift+D ou adresse /#admin)"
        aria-label="Connexion administrateur"
      >
        <KeyRound className="h-3.5 w-3.5" />
        <span className="text-[12px] font-semibold">Admin</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Panneau développeur"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="mx-auto max-w-5xl rounded-3xl border border-[#E5DCC0] bg-[#F4F1E9] p-6 shadow-2xl">
            {/* En-tête */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-[#1E4D2B]" />
                <h2 className="fc-serif text-lg font-bold text-[#1E4D2B]">Console administrateur</h2>
                <span className="rounded-full bg-[#1E4D2B]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1E4D2B]">
                  PC uniquement
                </span>
              </div>
              <div className="flex items-center gap-2">
                {authed && (
                  <button
                    onClick={logout}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-[#8A9288] hover:bg-black/5 hover:text-[#2A4A3A]"
                  >
                    Fermer la session admin
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-[#8A9288] hover:bg-black/5 hover:text-[#2A4A3A]"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!authed ? (
              /* ── Connexion ── */
              <div className="mx-auto max-w-sm py-6">
                <div className="mb-4 flex items-center justify-center gap-2 text-[#5C6B60]">
                  <KeyRound className="h-5 w-5" />
                  <p className="text-[14px]">Espace réservé à l&apos;administrateur du site.</p>
                </div>
                <input
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void login();
                  }}
                  placeholder="Code administrateur"
                  autoComplete="off"
                  autoFocus
                  className="h-[48px] w-full rounded-xl border border-[#C9B98A] bg-[#FFFDF6] px-4 text-center text-[15px] tracking-widest focus:border-[#2A4A3A] focus:outline-none"
                  aria-label="Code administrateur"
                />
                <button
                  onClick={() => void login()}
                  className="mt-3 h-[48px] w-full rounded-xl bg-[#1E4D2B] text-[15px] font-semibold text-[#FBF7EA] transition hover:bg-[#2A5C3A]"
                >
                  Entrer dans la console
                </button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8A9288]">
                  Accès invisible sur mobile. Raccourci : Ctrl+Shift+D · Adresse directe : /#admin
                </p>
              </div>
            ) : (
              <>
                {/* ── Onglets ── */}
                <div className="mb-5 flex flex-wrap gap-2">
                  {(
                    [
                      { id: "overview", label: "Aperçu", icon: <Server className="h-3.5 w-3.5" /> },
                      { id: "data", label: "Données", icon: <Database className="h-3.5 w-3.5" /> },
                      { id: "push", label: "Notifications push", icon: <Bell className="h-3.5 w-3.5" /> },
                      { id: "system", label: "Système", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                        tab === t.id
                          ? "bg-[#1E4D2B] text-[#FBF7EA]"
                          : "bg-[#1E4D2B]/5 text-[#2A4A3A] hover:bg-[#1E4D2B]/10"
                      }`}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === "overview" && <OverviewTab />}
                {tab === "data" && <DataTab />}
                {tab === "push" && <PushTab />}
                {tab === "system" && <SystemTab />}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Lien « Administration » du pied de page — desktop uniquement (renvoie null sur
 * mobile). Ouvre la console via l'événement `fc-dev-open` écouté par <DevAccess/>.
 */
export function DevFooterLink() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const check = () => setDesktop(isDesktopBrowser());
    const t = setTimeout(check, 0);
    window.addEventListener("resize", check);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", check);
    };
  }, []);
  if (!desktop) return null;
  return (
    <>
      <span aria-hidden="true" className="mx-2 opacity-50">·</span>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("fc-dev-open"))}
        className="text-[11px] font-medium uppercase tracking-wider opacity-60 transition hover:opacity-100 hover:underline focus:outline-none"
        title="Connexion administrateur (Ctrl+Shift+D ou adresse /#admin)"
        aria-label="Connexion administrateur"
      >
        Administration
      </button>
    </>
  );
}

/* ── Onglet Aperçu : session, statistiques, état ── */

function OverviewTab() {
  const [session, setSession] = useState<DevSession | null>(null);
  const [stats, setStats] = useState<{ members?: number; treasury?: number; events?: number; branches?: number } | null>(null);
  const [state, setState] = useState<PushState>("default");

  useEffect(() => {
    const run = async () => {
      const s = await fetchDev<DevSession>("/api/auth/session");
      if (s.ok && s.session) setSession(s.session as unknown as DevSession);
      const st = await fetchDev<{ stats: { members?: number; treasury?: number; events?: number; branches?: number } }>("/api/stats");
      if (st.ok) setStats(st.stats);
      setState(await pushState());
    };
    void run();
  }, []);

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Application</p>
        <ul className="space-y-1.5 text-[13px] text-[#2B3530]">
          <li>Mode : <strong>{demoMode ? "Démo statique (Cloudflare Pages)" : "Serveur complet (Node)"}</strong></li>
          <li>Connecté : <strong>{session?.user?.fullName || "—"}</strong>{session?.device ? ` · ${session.device.name}` : ""}</li>
          <li>Rôle : {session?.user?.role || "—"}</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Chiffres affichés (API /api/stats)</p>
        <ul className="space-y-1.5 text-[13px] text-[#2B3530]">
          <li>Membres : <strong>{stats?.members ?? "…"}</strong></li>
          <li>Caisse familiale : <strong>{stats?.treasury != null ? `${stats.treasury.toLocaleString("fr-FR")} FCFA` : "…"}</strong></li>
          <li>Événements : <strong>{stats?.events ?? "…"}</strong> · Branches : <strong>{stats?.branches ?? "…"}</strong></li>
        </ul>
      </div>
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4 md:col-span-2">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Notifications sur CE navigateur</p>
        <p className="text-[13px] text-[#2B3530]">
          État push : <strong>{state}</strong> — activez-les depuis l&apos;onglet « Notifications push ».
        </p>
      </div>
    </div>
  );
}

/* ── Onglet Données : base de démo (localStorage) ── */

function DataTab() {
  const [raw, setRaw] = useState("");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  const load = useCallback(() => {
    try {
      const db = localStorage.getItem("fc_demo_db_v1");
      if (!db) {
        setRaw("(base de démo vide — mode serveur complet ou première visite)");
        setCounts(null);
        return;
      }
      const parsed = JSON.parse(db) as Record<string, unknown[]>;
      setRaw(JSON.stringify(parsed, null, 2));
      setCounts({
        users: (parsed.users || []).length,
        members: (parsed.members || []).length,
        devices: (parsed.devices || []).length,
        notifications: (parsed.notifications || []).length,
        logs: (parsed.logs || []).length,
      });
    } catch (e) {
      setRaw(`(lecture impossible : ${String(e)})`);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg bg-[#1E4D2B]/5 px-3 py-1.5 text-[12px] font-semibold text-[#2A4A3A] hover:bg-[#1E4D2B]/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(raw).catch(() => undefined);
            toast.success("JSON copié dans le presse-papiers.");
          }}
          className="rounded-lg bg-[#1E4D2B]/5 px-3 py-1.5 text-[12px] font-semibold text-[#2A4A3A] hover:bg-[#1E4D2B]/10"
        >
          Copier le JSON
        </button>
        {counts && (
          <p className="text-[12px] text-[#5C6B60]">
            utilisateurs {counts.users} · membres {counts.members} · appareils {counts.devices} · notifications {counts.notifications} · journal {counts.logs}
          </p>
        )}
      </div>
      <pre className="fc-scroll max-h-96 overflow-y-auto rounded-2xl border border-[#E5DCC0] bg-[#1B1F1C] p-4 text-[11px] leading-relaxed text-[#D7E4DA]">
        {raw}
      </pre>
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Clés locales</p>
        <ul className="space-y-1 text-[12px] text-[#2B3530]">
          {["fc_uid", "fc_name", "fc_phone", "fc_device_suffix", "fc_push_pkey"].map((k) => {
            let v = "";
            try {
              v = localStorage.getItem(k) || "—";
            } catch {
              v = "—";
            }
            return (
              <li key={k} className="truncate">
                <code className="rounded bg-black/5 px-1.5 py-0.5">{k}</code> : {v}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ── Onglet Notifications push ── */

function PushTab() {
  const [state, setState] = useState<PushState>("default");
  const [busy, setBusy] = useState(false);
  const [devices, setDevices] = useState<DevSub[] | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [title, setTitle] = useState("Annonce du conseil de famille");
  const [body, setBody] = useState("La réunion de dimanche est confirmée à 15 h chez le Patriarche.");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void pushState().then(setState);
  }, []);

  const activate = async () => {
    setBusy(true);
    const ok = await enablePush();
    if (ok) {
      setState(await pushState());
      const res = await testPush();
      if (res.ok) toast.success("Notification de vérification envoyée — regardez votre écran 🔔");
    }
    setBusy(false);
  };

  const sendTest = async () => {
    setBusy(true);
    const res = await testPush();
    if (res.ok) toast.success("Notification système envoyée — même écran verrouillé 🔔");
    else toast.error(res.error || "Envoi impossible.");
    setBusy(false);
  };

  const loadDevices = async () => {
    setDevLoading(true);
    const res = await fetchDev<{ devices: DevSub[] }>("/api/push/subscriptions");
    if (res.ok) setDevices(res.devices);
    else toast.error(res.error || "Lecture impossible.");
    setDevLoading(false);
  };

  const broadcast = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Titre et message requis.");
      return;
    }
    setSending(true);
    const res = await fetchDev<{ sent: number; failed: number }>("/api/push/broadcast", {
      method: "POST",
      body: JSON.stringify({ title, body }),
    });
    if (res.ok) toast.success(`Diffusé : ${res.sent} appareil(s) notifié(s), ${res.failed} échec(s).`);
    else toast.error(res.error || "Diffusion impossible.");
    setSending(false);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Ce navigateur */}
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Ce navigateur (PC)</p>
        <p className="mb-3 text-[13px] text-[#2B3530]">
          État : <strong>{state}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          {(state === "default" || state === "granted") && (
            <button
              onClick={activate}
              disabled={busy}
              className="rounded-xl bg-[#1E4D2B] px-4 py-2 text-[13px] font-semibold text-[#FBF7EA] hover:bg-[#2A5C3A] disabled:opacity-60"
            >
              {busy ? "…" : "Activer + vérifier"}
            </button>
          )}
          {state === "subscribed" && (
            <button
              onClick={sendTest}
              disabled={busy}
              className="rounded-xl border border-[#2A4A3A] px-4 py-2 text-[13px] font-semibold text-[#2A4A3A] hover:bg-[#2A4A3A]/5 disabled:opacity-60"
            >
              Envoyer un push de test
            </button>
          )}
        </div>
      </div>

      {/* Diffusion famille */}
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Diffuser à toute la famille</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-2 h-11 w-full rounded-xl border border-[#C9B98A] bg-[#FBF7EA] px-3 text-[13px] focus:border-[#2A4A3A] focus:outline-none"
          placeholder="Titre"
          aria-label="Titre de l'annonce"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="mb-2 w-full rounded-xl border border-[#C9B98A] bg-[#FBF7EA] px-3 py-2 text-[13px] focus:border-[#2A4A3A] focus:outline-none"
          placeholder="Message"
          aria-label="Message de l'annonce"
        />
        <button
          onClick={broadcast}
          disabled={sending}
          className="flex items-center gap-2 rounded-xl bg-[#C89F62] px-4 py-2 text-[13px] font-bold text-white hover:bg-[#B8905A] disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {sending ? "Diffusion…" : "Notifier tous les appareils"}
        </button>
      </div>

      {/* Appareils abonnés côté serveur */}
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4 md:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Appareils abonnés (serveur push)</p>
          <button
            onClick={loadDevices}
            disabled={devLoading}
            className="flex items-center gap-1.5 rounded-lg bg-[#1E4D2B]/5 px-3 py-1.5 text-[12px] font-semibold text-[#2A4A3A] hover:bg-[#1E4D2B]/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${devLoading ? "animate-spin" : ""}`} /> Charger
          </button>
        </div>
        {devices === null ? (
          <p className="text-[12px] text-[#8A9288]">Cliquez « Charger » pour lister les abonnements enregistrés dans le KV Cloudflare.</p>
        ) : devices.length === 0 ? (
          <p className="text-[12px] text-[#8A9288]">Aucun appareil abonné pour l&apos;instant.</p>
        ) : (
          <ul className="fc-scroll max-h-64 space-y-2 overflow-y-auto pr-1">
            {devices.map((d, i) => (
              <li key={i} className="rounded-xl border border-[#E5DCC0] bg-[#FBF7EA] p-3 text-[12px] text-[#2B3530]">
                <p className="font-semibold">{d.device || "Appareil"}{d.phone ? ` · ${d.phone}` : ""}</p>
                <p className="text-[#8A9288]">
                  enregistré {d.added ? new Date(d.added).toLocaleString("fr-FR") : "—"} · {d.endpoint}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Onglet Système ── */

function SystemTab() {
  const rows: [string, string][] = [
    ["Site", "https://famille-mbeutetsa.pages.dev"],
    ["Passerelle push", "same-origin /api/push/* (Pages _worker.js)"],
    ["Moteur d'envoi", "Worker fc-push (VAPID + aes128gcm, WebCrypto)"],
    ["Service Worker", "/sw.js — réception push + notificationclick"],
    ["Clés VAPID", "celles du worker fc-push — abonnements KV conservés"],
    ["KV partagé", "PUSH_SUBS · 9b41fcb0…243b"],
    ["FCM", "sous Android/Chrome la livraison passe déjà par fcm.googleapis.com"],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Architecture notifications</p>
        <ul className="space-y-1.5 text-[13px] text-[#2B3530]">
          {rows.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong> : {v}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-[#E5DCC0] bg-[#FFFDF6] p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#8A9288]">Téléchargements & diagnostics</p>
        <ul className="space-y-1.5 text-[13px]">
          <li>
            <a className="text-[#2A4A3A] underline" href="/famille-mbeutetsa.apk" target="_blank" rel="noreferrer">famille-mbeutetsa.apk</a>{" "}
            (dernière version)
          </li>
          <li>
            <a className="text-[#2A4A3A] underline" href="/api/push/public-key" target="_blank" rel="noreferrer">/api/push/public-key</a>{" "}
            — doit renvoyer la clé VAPID
          </li>
          <li>
            <a className="text-[#2A4A3A] underline" href="/sw.js" target="_blank" rel="noreferrer">/sw.js</a> — Service Worker
          </li>
        </ul>
      </div>
    </div>
  );
}
