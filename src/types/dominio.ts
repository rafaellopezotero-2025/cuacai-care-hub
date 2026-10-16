import type { Tables } from "@/integrations/supabase/types";

export type Paciente = Tables<"pacientes">;
export type Trasplante = Tables<"trasplantes">;
export type Diagnostico = Tables<"diagnosticos">;
export type TipoTx = Tables<"tipos_tx">;
export type EstadoTx = Tables<"estados_tx">;
export type ViaAdmin = Tables<"vias_admin">;
export type Cobertura = Tables<"coberturas">;
export type MedicoRef = Tables<"medicos_ref">;
export type CentroTx = Tables<"centros_tx">;
export type CentroDerivacion = Tables<"centros_derivacion">;
export type AuditLog = Tables<"audit_log">;
export type Profile = Tables<"profiles">;

/** Opción simple para selects y filtros. */
export interface Opcion {
  id: string;
  nombre: string;
}

/** Catálogo de tablas maestras activas, para formularios y filtros. */
export interface Maestros {
  diagnosticos: Opcion[];
  tiposTx: Opcion[];
  estadosTx: (Opcion & { codigo: string; requiereFechaTx: boolean })[];
  viasAdmin: Opcion[];
  coberturas: Opcion[];
  medicosRef: Opcion[];
  centrosTx: Opcion[];
  centrosDerivacion: Opcion[];
  localidades: string[];
}

export const CODIGOS_ESTADO = {
  LISTA_ESPERA: "LISTA_ESPERA",
  TRASPLANTADO: "TRASPLANTADO",
  REVISAR: "REVISAR",
  EXCLUIDO: "EXCLUIDO",
  FALLECIDO: "FALLECIDO",
} as const;

export type CodigoEstado = (typeof CODIGOS_ESTADO)[keyof typeof CODIGOS_ESTADO];

/** Calcula la edad a partir de la fecha de nacimiento (nunca se almacena). */
export function calcularEdad(fechaNacimiento: string | null | undefined, referencia = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento + "T00:00:00");
  if (Number.isNaN(nac.getTime())) return null;
  let edad = referencia.getFullYear() - nac.getFullYear();
  const m = referencia.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < nac.getDate())) edad--;
  return edad;
}

export function nombreCompleto(p: { nombres: string; apellidos: string }): string {
  return `${p.apellidos}, ${p.nombres}`;
}

export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const d = new Date(fecha.length === 10 ? fecha + "T00:00:00" : fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatearFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
