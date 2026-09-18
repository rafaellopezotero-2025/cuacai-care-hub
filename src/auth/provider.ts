import { LocalAuthProvider } from "./local-auth-provider";
import { OpenAuthProvider } from "./openauth-provider";
import type { AuthProvider } from "./types";

/**
 * Selección del proveedor de autenticación.
 * Configurable por variable de entorno pública (no contiene secretos):
 *   VITE_AUTH_PROVIDER=local | openauth
 */
function crearAuthProvider(): AuthProvider {
  const tipo = import.meta.env["VITE_AUTH_PROVIDER"] ?? "local";
  if (tipo === "openauth") return new OpenAuthProvider();
  return new LocalAuthProvider();
}

export const authProvider: AuthProvider = crearAuthProvider();
