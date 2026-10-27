"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthFlow } from "@/components/fc/auth-flow";
import { Dashboard, type SessionData } from "@/components/fc/dashboard";
import { FcSpinner } from "@/components/fc/ui";
import { api } from "@/lib/fc-client";
import { installDemoApi } from "@/lib/demo-api";

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    const res = await api<{ session: SessionData | null }>("/api/auth/session");
    setSession(res.ok ? res.session : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Mode démo (build statique Cloudflare) : simule les API côté navigateur
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") installDemoApi();
    const t = setTimeout(loadSession, 0);
    return () => clearTimeout(t);
  }, [loadSession]);

  const handleReady = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  const handleLoggedOut = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <div className="fc-bg-page flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        {loading ? (
          <div className="flex min-h-[70vh] items-center justify-center text-[#2A4A3A]" role="status" aria-label="Chargement">
            <FcSpinner className="h-8 w-8" />
          </div>
        ) : session ? (
          <Dashboard session={session} onLoggedOut={handleLoggedOut} />
        ) : (
          <AuthFlow onReady={handleReady} />
        )}
      </main>

      <footer
        className="mt-auto border-t border-[#E5DCC0] bg-[#1E4D2B] text-center text-[12px] text-[#FBF7EA]/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <p className="pt-3">
          Famille.Mbeutetsa © 2026 — Le registre vivant des grandes familles
        </p>
      </footer>
    </div>
  );
}
