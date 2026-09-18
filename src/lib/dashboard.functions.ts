import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aAppError } from "@/lib/errores";

const filtrosDashboardSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estado: z.string().uuid().optional(),
  tipo: z.string().uuid().optional(),
  cobertura: z.string().uuid().optional(),
  centro: z.string().uuid().optional(),
  localidad: z.string().optional(),
});

export type FiltrosDashboard = z.infer<typeof filtrosDashboardSchema>;

const itemSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  valor: z.number(),
});

const itemEstadoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  codigo: z.string(),
  valor: z.number(),
});

const itemLocalidadSchema = z.object({
  nombre: z.string(),
  valor: z.number(),
});

const itemEvolucionSchema = z.object({
  mes: z.string(),
  valor: z.number(),
});

const dashboardResumenSchema = z.object({
  kpis: z.object({
    total_pacientes: z.number(),
    total_trasplantes: z.number(),
    por_estado: z.record(z.string(), z.number()),
  }),
  por_estado: z.array(itemEstadoSchema),
  por_tipo: z.array(itemSchema),
  por_cobertura: z.array(itemSchema),
  por_via: z.array(itemSchema),
  por_centro: z.array(itemSchema),
  por_localidad: z.array(itemLocalidadSchema),
  evolucion: z.array(itemEvolucionSchema),
});

export type DashboardResumen = z.infer<typeof dashboardResumenSchema>;

/** Resumen agregado de pacientes y trasplantes para el dashboard, según filtros. Nunca incluye datos identificatorios. */
export const obtenerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosDashboardSchema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<DashboardResumen> => {
    const rpcArgs: Record<string, string> = {};
    if (data.desde) rpcArgs.p_desde = data.desde;
    if (data.hasta) rpcArgs.p_hasta = data.hasta;
    if (data.estado) rpcArgs.p_estado_id = data.estado;
    if (data.tipo) rpcArgs.p_tipo_tx_id = data.tipo;
    if (data.cobertura) rpcArgs.p_cobertura_id = data.cobertura;
    if (data.centro) rpcArgs.p_centro_id = data.centro;
    if (data.localidad) rpcArgs.p_localidad = data.localidad;

    const { data: resultado, error } = await context.supabase.rpc("dashboard_resumen", rpcArgs);
    if (error) throw aAppError(error);

    const parsed = dashboardResumenSchema.safeParse(resultado);
    if (!parsed.success) {
      return {
        kpis: { total_pacientes: 0, total_trasplantes: 0, por_estado: {} },
        por_estado: [],
        por_tipo: [],
        por_cobertura: [],
        por_via: [],
        por_centro: [],
        por_localidad: [],
        evolucion: [],
      };
    }
    return parsed.data;
  });

export const dashboardQueryOptions = (filtros: FiltrosDashboard) =>
  queryOptions({
    queryKey: ["dashboard", filtros],
    queryFn: () => obtenerDashboard({ data: filtros }),
  });
