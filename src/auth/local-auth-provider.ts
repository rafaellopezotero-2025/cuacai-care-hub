import { supabase } from "@/integrations/supabase/client";
import { login as loginFn, logout as logoutFn, getSesionActual } from "./auth.functions";
import type { AuthProvider, AuthUser, LoginResult } from "./types";

/**
 * Proveedor de autenticación local (usuario/contraseña gestionados por el administrador).
 * Las credenciales se validan en el servidor; el navegador sólo recibe la sesión resultante.
 */
export class LocalAuthProvider implements AuthProvider {
  readonly nombre = "local";

  async login(usuario: string, password: string): Promise<LoginResult> {
    const resultado = await loginFn({ data: { usuario, password } });
    if (!resultado.ok || !resultado.session) {
      return { ok: false, error: resultado.error ?? "Usuario o contraseña incorrectos." };
    }
    const { error } = await supabase.auth.setSession(resultado.session);
    if (error) return { ok: false, error: "No se pudo iniciar la sesión." };
    return { ok: true };
  }

  async logout(): Promise<void> {
    try {
      await logoutFn();
    } catch {
      // El cierre de sesión debe completarse aunque falle la auditoría remota.
    }
    await supabase.auth.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    return getSesionActual();
  }

  async refreshSession(): Promise<void> {
    await supabase.auth.refreshSession();
  }

  async getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  onSessionChange(cb: (autenticado: boolean) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        cb(Boolean(session));
      }
    });
    return () => data.subscription.unsubscribe();
  }
}
