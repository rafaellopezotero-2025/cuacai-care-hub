import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Cliente de servidor con clave publicable y sin sesión persistida.
 * Se usa únicamente para el flujo de login (intercambio de credenciales por sesión).
 */
export function createPublicServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuración de backend incompleta");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Dominio sintético: el sistema autentica por nombre de usuario, no por email. */
export const DOMINIO_USUARIOS = "usuarios.cucaier.local";

export function emailSintetico(usuario: string): string {
  return `${usuario.toLowerCase().trim()}@${DOMINIO_USUARIOS}`;
}
