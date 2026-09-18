import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, aAppError } from "@/lib/errores";
import type { TrasplanteConJoins } from "@/lib/pacientes.functions";

const uuid = z.string().uuid();
const TAMANO_PAGINA = 20;

const filtrosTrasplantesSchema = z.object({
  q: z.string().trim().max(200).optional(),
  estado: uuid.optional(),
  tipo: uuid.optional(),
  centro: uuid.optional(),
  cobertura: uuid.optional(),
  via: uuid.optional(),
  medico: uuid.optional(),
  diagnostico: uuid.optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  pagina: z.number().int().min(1).optional(),
});

export type FiltrosTrasplantes = z.infer<typeof filtrosTrasplantesSchema>;

const SELECT_JOIN =
  "*, diagnosticos(diagnostico), tipos_tx(tipo_tx), estados_tx(estado_tx, codigo), vias_admin(descripcion), coberturas(descripcion), centros_tx(nombre), medicos_ref(nombres, apellidos), pacientes!inner(id, nombres, apellidos, dni, localidad)";

export type TrasplanteListado = TrasplanteConJoins & {
  pacientes: { id: string; nombres: string; apellidos: string; dni: string | null; localidad: string | null };
};

/** Listado global de procesos de trasplante, con filtros y paginación server-side. */
export const listarTrasplantes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosTrasplantesSchema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<{ filas: TrasplanteListado[]; total: number }> => {
    const pagina = data.pagina ?? 1;
    let query = context.supabase.from("trasplantes").select(SELECT_JOIN, { count: "exact" }).eq("activo", true);

    if (data.estado) query = query.eq("estado_tx_id", data.estado);
    if (data.tipo) query = query.eq("tipo_tx_id", data.tipo);
    if (data.centro) query = query.eq("centro_tx_id", data.centro);
    if (data.cobertura) query = query.eq("cobertura_id", data.cobertura);
    if (data.via) query = query.eq("via_admin_id", data.via);
    if (data.medico) query = query.eq("medico_ref_id", data.medico);
    if (data.diagnostico) query = query.eq("diagnostico_id", data.diagnostico);
    if (data.desde) query = query.gte("fecha_tx", data.desde);
    if (data.hasta) query = query.lte("fecha_tx", data.hasta);
    if (data.q) {
      const texto = data.q.replace(/[%,]/g, "");
      query = query.or(`apellidos.ilike.%${texto}%,nombres.ilike.%${texto}%,dni.ilike.%${texto}%`, { foreignTable: "pacientes" });
    }

    const desde = (pagina - 1) * TAMANO_PAGINA;
    query = query.order("fecha_tx", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(desde, desde + TAMANO_PAGINA - 1);

    const { data: filas, count, error } = await query;
    if (error) throw aAppError(error);
    return { filas: (filas ?? []) as unknown as TrasplanteListado[], total: count ?? 0 };
  });

/** Obtiene un proceso de trasplante con sus datos relacionados. */
export const obtenerTrasplante = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ context, data }): Promise<TrasplanteListado> => {
    const { data: fila, error } = await context.supabase.from("trasplantes").select(SELECT_JOIN).eq("id", data.id).maybeSingle();
    if (error) throw aAppError(error);
    if (!fila) throw new AppError("Proceso no encontrado.", "NO_ENCONTRADO");
    return fila as unknown as TrasplanteListado;
  });

const fechaNoFutura = (v: string) => !Number.isNaN(new Date(v).getTime()) && new Date(v) <= new Date();

const trasplanteBaseSchema = z.object({
  paciente_id: uuid,
  diagnostico_id: uuid.optional().nullable(),
  tipo_tx_id: uuid.optional().nullable(),
  estado_tx_id: uuid,
  via_admin_id: uuid.optional().nullable(),
  cobertura_id: uuid.optional().nullable(),
  centro_tx_id: uuid.optional().nullable(),
  medico_ref_id: uuid.optional().nullable(),
  fecha_tx: z
    .string()
    .trim()
    .refine((v) => v === "" || fechaNoFutura(v), "La fecha de trasplante no puede ser futura.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  observaciones: z.string().trim().max(2000).optional().nullable().transform((v) => (v ? v : null)),
});

async function validarRequiereFecha(
  supabase: { from: (t: "estados_tx") => { select: (s: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { requiere_fecha_tx: boolean } | null; error: unknown }> } } } },
  estadoTxId: string,
  fechaTx: string | null,
): Promise<void> {
  const { data: estado } = await supabase.from("estados_tx").select("requiere_fecha_tx").eq("id", estadoTxId).maybeSingle();
  if (estado?.requiere_fecha_tx && !fechaTx) {
    throw new AppError("El estado seleccionado requiere fecha de trasplante.", "VALIDACION");
  }
}

/** Registra un nuevo proceso de trasplante para un paciente. */
export const crearTrasplante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => trasplanteBaseSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await validarRequiereFecha(context.supabase, data.estado_tx_id, data.fecha_tx);
    const { data: creado, error } = await context.supabase.from("trasplantes").insert(data).select("id").single();
    if (error) throw aAppError(error);
    return { id: creado.id };
  });

/** Actualiza un proceso de trasplante existente. */
export const actualizarTrasplante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).and(trasplanteBaseSchema).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const { id, ...cambios } = data;
    await validarRequiereFecha(context.supabase, cambios.estado_tx_id, cambios.fecha_tx);
    const { error } = await context.supabase.from("trasplantes").update(cambios).eq("id", id);
    if (error) throw aAppError(error);
  });

/** Activa/desactiva un proceso de trasplante. */
export const cambiarActivoTrasplante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, activo: z.boolean() }).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const { error } = await context.supabase.from("trasplantes").update({ activo: data.activo }).eq("id", data.id);
    if (error) throw aAppError(error);
  });
