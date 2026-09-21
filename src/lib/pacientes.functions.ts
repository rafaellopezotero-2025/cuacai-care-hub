import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestMeta } from "@/lib/request-meta.server";
import { AppError, aAppError } from "@/lib/errores";
import type { Paciente, Trasplante } from "@/types/dominio";

const uuid = z.string().uuid();

/** Filtros de búsqueda de pacientes, alineados con la RPC buscar_pacientes. */
const filtrosBusquedaSchema = z.object({
  q: z.string().trim().max(200).optional(),
  localidad: z.string().trim().max(200).optional(),
  diagnostico: uuid.optional(),
  tipo: uuid.optional(),
  estado: uuid.optional(),
  cobertura: uuid.optional(),
  via: uuid.optional(),
  medico: uuid.optional(),
  centro: uuid.optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  incluirInactivos: z.boolean().optional(),
  orden: z.enum(["apellidos", "dni", "localidad", "estado", "fecha_tx"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  pagina: z.number().int().min(1).optional(),
});

export type FiltrosBusquedaPacientes = z.infer<typeof filtrosBusquedaSchema>;

const TAMANO_PAGINA = 20;

export interface FilaBusquedaPaciente {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string | null;
  localidad: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  activo: boolean;
  estado_tx: string | null;
  estado_codigo: string | null;
  tipo_tx: string | null;
  centro_tx: string | null;
  fecha_tx: string | null;
}

/** Búsqueda paginada y filtrada de pacientes (RPC buscar_pacientes). */
export const buscarPacientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosBusquedaSchema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<{ filas: FilaBusquedaPaciente[]; total: number }> => {
    const pagina = data.pagina ?? 1;
    const { data: filas, error } = await context.supabase.rpc("buscar_pacientes", {
      ...(data.q ? { p_busqueda: data.q } : {}),
      ...(data.localidad ? { p_localidad: data.localidad } : {}),
      ...(data.diagnostico ? { p_diagnostico_id: data.diagnostico } : {}),
      ...(data.tipo ? { p_tipo_tx_id: data.tipo } : {}),
      ...(data.estado ? { p_estado_id: data.estado } : {}),
      ...(data.cobertura ? { p_cobertura_id: data.cobertura } : {}),
      ...(data.via ? { p_via_id: data.via } : {}),
      ...(data.medico ? { p_medico_id: data.medico } : {}),
      ...(data.centro ? { p_centro_id: data.centro } : {}),
      ...(data.desde ? { p_desde: data.desde } : {}),
      ...(data.hasta ? { p_hasta: data.hasta } : {}),
      p_incluir_inactivos: data.incluirInactivos ?? false,
      p_orden: data.orden ?? "apellidos",
      p_dir: data.dir ?? "asc",
      p_limit: TAMANO_PAGINA,
      p_offset: (pagina - 1) * TAMANO_PAGINA,
    });
    if (error) throw aAppError(error);
    const filasTipadas = (filas ?? []) as (FilaBusquedaPaciente & { total_count: number })[];
    const total = filasTipadas[0]?.total_count ?? 0;
    return { filas: filasTipadas.map(({ total_count: _total_count, ...resto }) => resto), total };
  });

const SELECT_TRASPLANTE_JOIN =
  "*, diagnosticos(diagnostico), tipos_tx(tipo_tx), estados_tx(estado_tx, codigo), vias_admin(descripcion), coberturas(descripcion), centros_tx(nombre), medicos_ref(nombres, apellidos)";

export type TrasplanteConJoins = Trasplante & {
  diagnosticos: { diagnostico: string } | null;
  tipos_tx: { tipo_tx: string } | null;
  estados_tx: { estado_tx: string; codigo: string } | null;
  vias_admin: { descripcion: string } | null;
  coberturas: { descripcion: string } | null;
  centros_tx: { nombre: string } | null;
  medicos_ref: { nombres: string; apellidos: string } | null;
};

/** Ficha de un paciente con sus procesos de trasplante. Registra evento de auditoría VIEW. */
export const obtenerPaciente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }): Promise<{ paciente: Paciente; trasplantes: TrasplanteConJoins[] }> => {
    const { data: paciente, error } = await context.supabase.from("pacientes").select("*").eq("id", data.id).maybeSingle();
    if (error) throw aAppError(error);
    if (!paciente) throw new AppError("Paciente no encontrado.", "NO_ENCONTRADO");

    const { data: trasplantes, error: errorTx } = await context.supabase
      .from("trasplantes")
      .select(SELECT_TRASPLANTE_JOIN)
      .eq("paciente_id", data.id)
      .order("fecha_tx", { ascending: false, nullsFirst: true })
      .order("created_at", { ascending: false });
    if (errorTx) throw aAppError(errorTx);

    const meta = getRequestMeta();
    await context.supabase.rpc("registrar_evento_auditoria", {
      p_action: "VIEW",
      p_entity: "pacientes",
      p_entity_id: data.id,
      p_paciente_id: data.id,
      ...(meta.ip ? { p_ip: meta.ip } : {}),
      ...(meta.userAgent ? { p_user_agent: meta.userAgent } : {}),
    });

    return { paciente, trasplantes: (trasplantes ?? []) as unknown as TrasplanteConJoins[] };
  });

const soloDigitos = /^[0-9]+$/;

const pacienteSchema = z.object({
  nombres: z.string().trim().min(1, "El nombre es obligatorio.").max(150),
  apellidos: z.string().trim().min(1, "El apellido es obligatorio.").max(150),
  dni: z
    .string()
    .trim()
    .refine((v) => v === "" || (soloDigitos.test(v) && v.length >= 6 && v.length <= 9), "El DNI debe tener entre 6 y 9 dígitos.")
    .optional()
    .transform((v) => (v ? v : null)),
  fecha_nacimiento: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(new Date(v).getTime()) && new Date(v) <= new Date()), "La fecha de nacimiento no es válida.")
    .optional()
    .transform((v) => (v ? v : null)),
  sexo: z.enum(["F", "M", "X"]).optional().nullable(),
  localidad: z.string().trim().max(200).optional().transform((v) => (v ? v : null)),
  telefono: z.string().trim().max(30).optional().transform((v) => (v ? v : null)),
  telefono_alternativo: z.string().trim().max(30).optional().transform((v) => (v ? v : null)),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "El email no es válido.")
    .optional()
    .transform((v) => (v ? v : null)),
  domicilio: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
  observaciones: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
});

/** Crea un paciente nuevo. */
export const crearPaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pacienteSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const { data: creado, error } = await context.supabase
      .from("pacientes")
      .insert({ ...data, sexo: data.sexo ?? null })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new AppError("Ya existe un paciente con ese DNI.", "DUPLICADO");
      throw aAppError(error);
    }
    return { id: creado.id };
  });

/** Actualiza los datos de un paciente existente. */
export const actualizarPaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).and(pacienteSchema).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const { id, ...cambios } = data;
    const { error } = await context.supabase.from("pacientes").update(cambios).eq("id", id);
    if (error) {
      if (error.code === "23505") throw new AppError("Ya existe un paciente con ese DNI.", "DUPLICADO");
      throw aAppError(error);
    }
  });

/** Activa/desactiva (baja lógica) un paciente. Requiere permiso pacientes.desactivar. */
export const cambiarActivoPaciente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, activo: z.boolean() }).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const { data: autorizado, error: errorPermiso } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "pacientes.desactivar",
    });
    if (errorPermiso) throw aAppError(errorPermiso);
    if (!autorizado) throw new AppError("No tiene permisos para realizar esta acción.", "NO_AUTORIZADO");

    const { error } = await context.supabase.from("pacientes").update({ activo: data.activo }).eq("id", data.id);
    if (error) throw aAppError(error);
  });

interface FilaAuditLog {
  id: number;
  timestamp: string;
  action: string;
  entity: string;
  usuario: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
}

export interface EventoHistorial {
  id: number;
  timestamp: string;
  action: string;
  entity: string;
  usuario: string | null;
  descripcion: string;
  campos: string[];
}

const CAMPOS_EXCLUIDOS = new Set(["updated_at", "updated_by", "created_at", "created_by"]);

function calcularCamposModificados(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): string[] {
  if (!oldValues || !newValues) return [];
  const claves = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
  const cambiados: string[] = [];
  for (const clave of claves) {
    if (CAMPOS_EXCLUIDOS.has(clave)) continue;
    if (JSON.stringify(oldValues[clave]) !== JSON.stringify(newValues[clave])) cambiados.push(clave);
  }
  return cambiados;
}

function describirEvento(fila: FilaAuditLog, campos: string[]): string {
  const esTrasplante = fila.entity === "trasplantes";
  switch (fila.action) {
    case "CREATE":
      return esTrasplante ? "Proceso de trasplante registrado" : "Paciente creado";
    case "UPDATE": {
      if (esTrasplante && campos.includes("estado_tx_id")) return "Estado del proceso modificado";
      const base = esTrasplante ? "Proceso de trasplante modificado" : "Paciente modificado";
      return campos.length ? `${base}: ${campos.join(", ")}` : base;
    }
    case "DEACTIVATE":
      return esTrasplante ? "Proceso de trasplante dado de baja" : "Paciente dado de baja";
    case "REACTIVATE":
      return esTrasplante ? "Proceso de trasplante reactivado" : "Paciente reactivado";
    case "VIEW":
      return "Ficha consultada";
    case "EXPORT":
      return "Datos exportados";
    default:
      return fila.action;
  }
}

/** Historial de auditoría de un paciente (y sus procesos), con descripciones legibles. */
export const historialPaciente = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }): Promise<EventoHistorial[]> => {
    const { data: filas, error } = await context.supabase
      .from("audit_log")
      .select("id, timestamp, action, entity, usuario, old_values, new_values")
      .eq("paciente_id", data.id)
      .order("timestamp", { ascending: false })
      .limit(200);
    if (error) throw aAppError(error);

    return ((filas ?? []) as FilaAuditLog[]).map((fila) => {
      const campos = calcularCamposModificados(fila.old_values, fila.new_values);
      return {
        id: fila.id,
        timestamp: fila.timestamp,
        action: fila.action,
        entity: fila.entity,
        usuario: fila.usuario,
        descripcion: describirEvento(fila, campos),
        campos,
      };
    });
  });
