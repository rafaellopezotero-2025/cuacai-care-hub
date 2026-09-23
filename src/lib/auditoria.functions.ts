import { createServerFn } from "@tanstack/react-start";
import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, aAppError } from "@/lib/errores";

const TAMANO_PAGINA = 25;

const filtrosSchema = z.object({
  usuario: z.string().trim().max(200).optional(),
  accion: z.string().trim().max(100).optional(),
  entidad: z.string().trim().max(100).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pagina: z.number().int().min(1).optional(),
});

export type FiltrosAuditoria = z.infer<typeof filtrosSchema>;

export interface FilaAuditoria {
  id: number;
  timestamp: string;
  usuario: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  paciente_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  detalle: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
}

/** Lista eventos de auditoría (solo lectura) con filtros y paginación descendente. Requiere auditoria.ver. */
export const listarAuditoria = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosSchema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<{ filas: FilaAuditoria[]; total: number }> => {
    const { data: autorizado } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "auditoria.ver",
    });
    if (!autorizado) throw new AppError("No tiene permisos para ver la auditoría.", "NO_AUTORIZADO");

    const sb = context.supabase;
    const pagina = data.pagina ?? 1;
    let query = sb.from("audit_log").select("*", { count: "exact" });

    if (data.usuario) query = query.ilike("usuario", `%${data.usuario.trim()}%`);
    if (data.accion) query = query.eq("action", data.accion);
    if (data.entidad) query = query.eq("entity", data.entidad);
    if (data.desde) query = query.gte("timestamp", `${data.desde}T00:00:00`);
    if (data.hasta) query = query.lte("timestamp", `${data.hasta}T23:59:59`);

    const desde = (pagina - 1) * TAMANO_PAGINA;
    query = query.order("timestamp", { ascending: false }).range(desde, desde + TAMANO_PAGINA - 1);

    const { data: filas, error, count } = await query;
    if (error) throw aAppError(error);

    return { filas: (filas ?? []) as FilaAuditoria[], total: count ?? 0 };
  });

export const auditoriaQueryOptions = (filtros: FiltrosAuditoria) =>
  queryOptions({
    queryKey: ["auditoria", filtros],
    queryFn: () => listarAuditoria({ data: filtros }),
    placeholderData: keepPreviousData,
  });
