import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestMeta } from "@/lib/request-meta.server";
import { AppError, aAppError } from "@/lib/errores";

const uuid = z.string().uuid();

const filtrosExportSchema = z.object({
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
  formato: z.enum(["csv", "xlsx"]),
});

export interface FilaExportPaciente {
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

const LIMITE_PAGINA = 100;
const MAXIMO_FILAS = 5000;

/** Exporta pacientes según filtros aplicados (hasta 5000 filas), sin domicilio ni email. Requiere permiso exportar.ejecutar. */
export const exportarPacientes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosExportSchema.parse(input))
  .handler(async ({ context, data }): Promise<FilaExportPaciente[]> => {
    const { data: autorizado, error: errorPermiso } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "exportar.ejecutar",
    });
    if (errorPermiso) throw aAppError(errorPermiso);
    if (!autorizado) throw new AppError("No tiene permisos para realizar esta acción.", "NO_AUTORIZADO");

    const { formato, ...filtros } = data;
    const filas: FilaExportPaciente[] = [];
    let offset = 0;
    while (filas.length < MAXIMO_FILAS) {
      const { data: pagina, error } = await context.supabase.rpc("buscar_pacientes", {
        p_busqueda: filtros.q || undefined,
        p_localidad: filtros.localidad || undefined,
        p_diagnostico_id: filtros.diagnostico,
        p_tipo_tx_id: filtros.tipo,
        p_estado_id: filtros.estado,
        p_cobertura_id: filtros.cobertura,
        p_via_id: filtros.via,
        p_medico_id: filtros.medico,
        p_centro_id: filtros.centro,
        p_desde: filtros.desde || undefined,
        p_hasta: filtros.hasta || undefined,
        p_incluir_inactivos: filtros.incluirInactivos ?? false,
        p_orden: "apellidos",
        p_dir: "asc",
        p_limit: LIMITE_PAGINA,
        p_offset: offset,
      });
      if (error) throw aAppError(error);
      const lote = (pagina ?? []) as (FilaExportPaciente & { total_count: number })[];
      if (lote.length === 0) break;
      for (const fila of lote) {
        const { total_count: _total_count, ...resto } = fila;
        filas.push(resto);
        if (filas.length >= MAXIMO_FILAS) break;
      }
      if (lote.length < LIMITE_PAGINA) break;
      offset += LIMITE_PAGINA;
    }

    const meta = getRequestMeta();
    await context.supabase.rpc("registrar_evento_auditoria", {
      p_action: "EXPORT",
      p_entity: "pacientes",
      p_detalle: { filtros, cantidad: filas.length, formato },
      p_ip: meta.ip ?? undefined,
      p_user_agent: meta.userAgent ?? undefined,
    });

    return filas;
  });
