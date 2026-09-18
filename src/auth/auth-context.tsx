import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authProvider } from "./provider";
import type { AppRole, AuthUser, LoginResult } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  cargando: boolean;
  login: (usuario: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (rol: AppRole) => boolean;
  hasPermission: (permiso: string) => boolean;
  hasAnyPermission: (permisos: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const SESION_QUERY_KEY = ["sesion-actual"] as const;

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: SESION_QUERY_KEY,
    queryFn: () => authProvider.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    return authProvider.onSessionChange(() => {
      queryClient.invalidateQueries({ queryKey: SESION_QUERY_KEY });
    });
  }, [queryClient]);

  const login = useCallback(
    async (usuario: string, password: string) => {
      const r = await authProvider.login(usuario, password);
      if (r.ok) await queryClient.invalidateQueries({ queryKey: SESION_QUERY_KEY });
      return r;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await queryClient.cancelQueries();
    await authProvider.logout();
    queryClient.clear();
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESION_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const user = data ?? null;
    const permisos = new Set(user?.permisos ?? []);
    return {
      user,
      cargando: isLoading,
      login,
      logout,
      refresh,
      hasRole: (rol) => Boolean(user?.roles.includes(rol)),
      hasPermission: (p) => permisos.has(p),
      hasAnyPermission: (ps) => ps.some((p) => permisos.has(p)),
    };
  }, [data, isLoading, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthContextProvider");
  return ctx;
}
