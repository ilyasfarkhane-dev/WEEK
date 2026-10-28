import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import type { AppRole, UserStatus } from "@prisma/client";

export type SessionData = {
  user: null | {
    id: string;
    name: string;
    roles: AppRole[];
    roleLabel: string;
    onboardingCompletedAt: string | null;
    isAdmin: boolean;
    institutionId: string | null;
    themeIds: string[];
    facilitatedThemeIds: string[];
    primaryThemeId: string | null;
    status: UserStatus;
  };
  phase: string;
  unread: number;
  locale: string;
  direction: "ltr" | "rtl";
  showAdmin?: boolean;
  adminLinks: Array<{ href: string; label: string }>;
  demonstration?: boolean;
};

const SessionContext = createContext<SessionData | null>(null);
const RefreshContext = createContext<() => Promise<SessionData>>(async () => {
  throw new Error("Session is not ready.");
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [session, setSession] = useState<SessionData | null>(null);
  const apply = useCallback((data: SessionData) => {
    setSession(data);
    document.documentElement.lang = data.locale || "en";
    document.documentElement.dir = data.direction || "ltr";
    return data;
  }, []);
  const refresh = useCallback(async () => {
    const data = (await fetch("/api/session", { credentials: "include" }).then((response) => response.json())) as SessionData;
    return apply(data);
  }, [apply]);

  useEffect(() => {
    let live = true;
    refresh()
      .catch(() => {
        if (live) apply({ user: null, phase: "Programme", unread: 0, locale: "en", direction: "ltr", adminLinks: [] });
      });
    return () => {
      live = false;
    };
  }, [location.pathname, refresh, apply]);

  if (!session) return <p className="p-8 text-sm text-muted" role="status">Loading the workspace…</p>;
  return (
    <RefreshContext.Provider value={refresh}>
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </RefreshContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Session is not ready.");
  return session;
}

export function useRefreshSession() {
  return useContext(RefreshContext);
}
