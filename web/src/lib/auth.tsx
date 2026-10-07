import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, Outlet } from "react-router";
import type { UserProfile } from "@/domain/types";
import { api, setToken, setUnauthorizedHandler } from "./api";

type AuthValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    let active = true;
    api<{ user: UserProfile }>("/api/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    async login(email, password) {
      const result = await api<{ user: UserProfile; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      setUser(result.user);
    },
    async register(email, password) {
      const result = await api<{ user: UserProfile; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      setUser(result.user);
    },
    async logout() {
      await api("/api/auth/logout", { method: "POST" });
      setToken(null);
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <StatusScreen>Loading…</StatusScreen>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <StatusScreen>Loading…</StatusScreen>;
  if (user) return <Navigate to="/tactics" replace />;
  return <Outlet />;
}

export function StatusScreen({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center text-sm text-ink/70">
      {children}
    </div>
  );
}
