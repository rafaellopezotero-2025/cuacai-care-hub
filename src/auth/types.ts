import type { Enums } from "@/integrations/supabase/types";

export type AppRole = Enums<"app_role">;

/** Usuario autenticado con sus roles y permisos efectivos (resueltos en backend). */
export interface AuthUser {
  id: string;
  usuario: string;
  nombre: string;
  apellido: string;
  roles: AppRole[];
  permisos: string[];
  ultimoAcceso: string | null;
}

export interface LoginResult {
  ok: boolean;
  /** Mensaje genérico apto para mostrar al usuario. Nunca revela si el usuario existe. */
  error?: string;
}

/**
 * Capa de abstracción de autenticación.
 * La aplicación sólo depende de esta interfaz; el proveedor concreto
 * (local, OpenAuth, otro IdP institucional) se selecciona en `src/auth/index.ts`.
 */
export interface AuthProvider {
  readonly nombre: string;
  login(usuario: string, password: string): Promise<LoginResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  refreshSession(): Promise<void>;
  /** Devuelve el access token actual (para adjuntar a llamadas al backend). */
  getAccessToken(): Promise<string | null>;
  /** Suscribe cambios de sesión; devuelve función para cancelar. */
  onSessionChange(cb: (autenticado: boolean) => void): () => void;
}

export const PERMISOS = {
  dashboardVer: "dashboard.ver",
  pacientesVer: "pacientes.ver",
  pacientesCrear: "pacientes.crear",
  pacientesEditar: "pacientes.editar",
  pacientesDesactivar: "pacientes.desactivar",
  trasplantesVer: "trasplantes.ver",
  trasplantesCrear: "trasplantes.crear",
  trasplantesEditar: "trasplantes.editar",
  historialVer: "historial.ver",
  maestrosVer: "maestros.ver",
  maestrosEditar: "maestros.editar",
  usuariosAdministrar: "usuarios.administrar",
  auditoriaVer: "auditoria.ver",
  importarEjecutar: "importar.ejecutar",
  exportarEjecutar: "exportar.ejecutar",
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

export const ROLES_LABEL: Record<AppRole, string> = {
  administrador: "Administrador",
  operador: "Operador",
  consulta: "Consulta",
};
