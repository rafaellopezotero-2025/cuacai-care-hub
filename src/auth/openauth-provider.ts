import type { AuthProvider, AuthUser, LoginResult } from "./types";

/**
 * Punto de integración futuro con OpenAuth (OAuth 2.0 Authorization Code + PKCE).
 *
 * Requisitos que debe cumplir la implementación antes de habilitarse en producción:
 * - Authorization Code Flow con PKCE (S256) y parámetro `state` aleatorio (nunca implicit flow).
 * - Validación estricta de `redirect_uri` contra una lista blanca.
 * - Validación de firma (JWKS), `iss`, `aud`, `exp` y `nbf` de los tokens en el backend.
 * - Refresh tokens rotativos, revocación en logout y expiración de sesión.
 * - Cookies HttpOnly/Secure/SameSite para la sesión; tokens fuera de localStorage.
 * - HTTPS obligatorio, rate limiting y protección contra fuerza bruta en el IdP.
 * - Mapeo de identidad OpenAuth -> `profiles.id` y asignación de roles en `user_roles`
 *   (la autorización RBAC sigue resolviéndose en base de datos).
 *
 * Mientras no se complete la revisión de seguridad, este proveedor permanece deshabilitado.
 */
export class OpenAuthProvider implements AuthProvider {
  readonly nombre = "openauth";

  private noDisponible(): never {
    throw new Error("OpenAuth no está habilitado en esta instalación.");
  }

  login(): Promise<LoginResult> {
    return this.noDisponible();
  }
  logout(): Promise<void> {
    return this.noDisponible();
  }
  getCurrentUser(): Promise<AuthUser | null> {
    return this.noDisponible();
  }
  refreshSession(): Promise<void> {
    return this.noDisponible();
  }
  getAccessToken(): Promise<string | null> {
    return this.noDisponible();
  }
  onSessionChange(): () => void {
    return () => undefined;
  }
}
