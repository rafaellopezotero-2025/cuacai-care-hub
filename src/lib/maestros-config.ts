/**
 * Configuración de tablas maestras administrables desde /configuracion/$tabla.
 * Archivo apto para el cliente (sin dependencias de servidor).
 */

export type TablaMaestro =
  | "diagnosticos"
  | "tipos_tx"
  | "estados_tx"
  | "vias_admin"
  | "coberturas"
  | "medicos_ref"
  | "centros_tx"
  | "centros_derivacion";

export type MaestroSlug =
  | "diagnosticos"
  | "tipos-trasplante"
  | "estados"
  | "vias-administrativas"
  | "coberturas"
  | "medicos"
  | "centros"
  | "centros-derivacion";

export type TipoCampoMaestro = "text" | "email" | "boolean" | "number";

export interface CampoMaestro {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampoMaestro;
  requerido: boolean;
  /** Ancho relativo dentro del formulario (por defecto ocupa todo el ancho). */
  ancho?: "full" | "half";
}

export interface MaestroConfig {
  tabla: TablaMaestro;
  titulo: string;
  descripcion: string;
  campos: CampoMaestro[];
  /** Campo usado para búsqueda y orden alfabético del listado. */
  campoPrincipal: string;
}

export const MAESTROS_CONFIG: Record<MaestroSlug, MaestroConfig> = {
  diagnosticos: {
    tabla: "diagnosticos",
    titulo: "Diagnósticos",
    descripcion: "Diagnósticos disponibles para asociar a procesos de trasplante.",
    campoPrincipal: "diagnostico",
    campos: [{ nombre: "diagnostico", etiqueta: "Diagnóstico", tipo: "text", requerido: true }],
  },
  "tipos-trasplante": {
    tabla: "tipos_tx",
    titulo: "Tipos de trasplante",
    descripcion: "Tipos de trasplante disponibles para los procesos.",
    campoPrincipal: "tipo_tx",
    campos: [{ nombre: "tipo_tx", etiqueta: "Tipo de trasplante", tipo: "text", requerido: true }],
  },
  estados: {
    tabla: "estados_tx",
    titulo: "Estados del proceso",
    descripcion: "Estados posibles de un proceso de trasplante y su configuración.",
    campoPrincipal: "estado_tx",
    campos: [
      { nombre: "estado_tx", etiqueta: "Nombre del estado", tipo: "text", requerido: true },
      { nombre: "codigo", etiqueta: "Código (MAYÚSCULAS_GUION_BAJO)", tipo: "text", requerido: true, ancho: "half" },
      { nombre: "requiere_fecha_tx", etiqueta: "Requiere fecha de trasplante", tipo: "boolean", requerido: false, ancho: "half" },
      { nombre: "orden", etiqueta: "Orden de presentación", tipo: "number", requerido: false, ancho: "half" },
    ],
  },
  "vias-administrativas": {
    tabla: "vias_admin",
    titulo: "Vías administrativas",
    descripcion: "Vías administrativas para la gestión del proceso.",
    campoPrincipal: "descripcion",
    campos: [{ nombre: "descripcion", etiqueta: "Descripción", tipo: "text", requerido: true }],
  },
  coberturas: {
    tabla: "coberturas",
    titulo: "Coberturas",
    descripcion: "Coberturas de salud disponibles para los pacientes.",
    campoPrincipal: "descripcion",
    campos: [{ nombre: "descripcion", etiqueta: "Descripción", tipo: "text", requerido: true }],
  },
  medicos: {
    tabla: "medicos_ref",
    titulo: "Médicos de referencia",
    descripcion: "Médicos que pueden asociarse como referentes de un proceso de trasplante.",
    campoPrincipal: "apellidos",
    campos: [
      { nombre: "apellidos", etiqueta: "Apellidos", tipo: "text", requerido: true, ancho: "half" },
      { nombre: "nombres", etiqueta: "Nombres", tipo: "text", requerido: true, ancho: "half" },
      { nombre: "matricula", etiqueta: "Matrícula", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "telefono", etiqueta: "Teléfono", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "email", etiqueta: "Email", tipo: "email", requerido: false },
    ],
  },
  centros: {
    tabla: "centros_tx",
    titulo: "Centros de trasplante",
    descripcion: "Centros habilitados para la realización de trasplantes.",
    campoPrincipal: "nombre",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true },
      { nombre: "localidad", etiqueta: "Localidad", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "provincia", etiqueta: "Provincia", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "telefono", etiqueta: "Teléfono", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "email", etiqueta: "Email", tipo: "email", requerido: false, ancho: "half" },
      { nombre: "observaciones", etiqueta: "Observaciones", tipo: "text", requerido: false },
    ],
  },
  "centros-derivacion": {
    tabla: "centros_derivacion",
    titulo: "Centros de derivación",
    descripcion: "Establecimientos que derivan pacientes.",
    campoPrincipal: "nombre",
    campos: [
      { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true },
      { nombre: "direccion", etiqueta: "Dirección", tipo: "text", requerido: false },
      { nombre: "localidad", etiqueta: "Localidad", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "provincia", etiqueta: "Provincia", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "telefono", etiqueta: "Teléfono", tipo: "text", requerido: false, ancho: "half" },
      { nombre: "email", etiqueta: "Email", tipo: "email", requerido: false, ancho: "half" },
    ],
  },
};

export const MAESTROS_SLUGS = Object.keys(MAESTROS_CONFIG) as MaestroSlug[];

export function esMaestroSlug(valor: string): valor is MaestroSlug {
  return (MAESTROS_SLUGS as string[]).includes(valor);
}

/** Fila genérica de una tabla maestra (columnas comunes + campos propios del maestro). */
export interface FilaMaestro {
  id: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  [campo: string]: string | number | boolean | null | undefined;
}
