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

/** Año en curso: el panel abre mostrando solo este año. */
export const ANIO_ACTUAL = new Date().getFullYear();

/** Año más antiguo ofrecido en el selector; "Todos los años" arranca desde acá. */
export const ANIO_MIN_DISPONIBLE = 2015;

export const ANIOS_DASHBOARD = Array.from(
  { length: ANIO_ACTUAL - ANIO_MIN_DISPONIBLE + 1 },
  (_, i) => ANIO_ACTUAL - i,
);

export function rangoDeAnio(anio: number): Pick<FiltrosDashboard, "desde" | "hasta"> {
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
}

/** Rango que muestra toda la historia registrada. */
export const RANGO_TODOS_LOS_ANIOS: Pick<FiltrosDashboard, "desde" | "hasta"> = {
  desde: `${ANIO_MIN_DISPONIBLE}-01-01`,
  hasta: `${ANIO_ACTUAL}-12-31`,
};

/** Rango que se aplica cuando la URL no trae ninguno: el año en curso. */
export const RANGO_PREDETERMINADO = rangoDeAnio(ANIO_ACTUAL);

export function esMismoRango(
  filtros: FiltrosDashboard,
  rango: Pick<FiltrosDashboard, "desde" | "hasta">,
): boolean {
  return filtros.desde === rango.desde && filtros.hasta === rango.hasta;
}

/** Año seleccionado cuando el rango es exactamente un año calendario; null si es otro rango. */
export function anioSeleccionado(filtros: FiltrosDashboard): number | null {
  const { desde, hasta } = filtros;
  if (!desde || !hasta) return null;
  const anio = Number(desde.slice(0, 4));
  if (!Number.isInteger(anio)) return null;
  return desde === `${anio}-01-01` && hasta === `${anio}-12-31` ? anio : null;
}

// Los registros sin centro/cobertura/vía llegan con id null: se agrupan como "sin dato".
const itemSchema = z.object({
  id: z.string().nullable().transform((v) => v ?? "__sin_dato__"),
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
    const rpcArgs = {
      ...(data.desde ? { p_desde: data.desde } : {}),
      ...(data.hasta ? { p_hasta: data.hasta } : {}),
      ...(data.estado ? { p_estado_id: data.estado } : {}),
      ...(data.tipo ? { p_tipo_tx_id: data.tipo } : {}),
      ...(data.cobertura ? { p_cobertura_id: data.cobertura } : {}),
      ...(data.centro ? { p_centro_id: data.centro } : {}),
      ...(data.localidad ? { p_localidad: data.localidad } : {}),
    };

    const { data: resultado, error } = await context.supabase.rpc("dashboard_resumen", rpcArgs);
    if (error) throw aAppError(error);

    const parsed = dashboardResumenSchema.safeParse(resultado);
    if (!parsed.success) {
      console.error("dashboard_resumen: respuesta inválida", parsed.error.issues);
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
