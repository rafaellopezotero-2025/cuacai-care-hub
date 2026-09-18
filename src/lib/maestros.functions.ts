import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Maestros } from "@/types/dominio";

/** Catálogo de tablas maestras activas (para selects/filtros). RLS aplica como el usuario. */
export const listarMaestros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Maestros> => {
    const sb = context.supabase;
    const [diag, tipos, estados, vias, cob, med, cen, loc] = await Promise.all([
      sb.from("diagnosticos").select("id, diagnostico").eq("activo", true).order("diagnostico"),
      sb.from("tipos_tx").select("id, tipo_tx").eq("activo", true).order("tipo_tx"),
      sb.from("estados_tx").select("id, estado_tx, codigo, requiere_fecha_tx").eq("activo", true).order("orden"),
      sb.from("vias_admin").select("id, descripcion").eq("activo", true).order("descripcion"),
      sb.from("coberturas").select("id, descripcion").eq("activo", true).order("descripcion"),
      sb.from("medicos_ref").select("id, nombres, apellidos").eq("activo", true).order("apellidos"),
      sb.from("centros_tx").select("id, nombre").eq("activo", true).order("nombre"),
      sb.rpc("localidades_pacientes"),
    ]);
    return {
      diagnosticos: (diag.data ?? []).map((d) => ({ id: d.id, nombre: d.diagnostico })),
      tiposTx: (tipos.data ?? []).map((d) => ({ id: d.id, nombre: d.tipo_tx })),
      estadosTx: (estados.data ?? []).map((d) => ({ id: d.id, nombre: d.estado_tx, codigo: d.codigo, requiereFechaTx: d.requiere_fecha_tx })),
      viasAdmin: (vias.data ?? []).map((d) => ({ id: d.id, nombre: d.descripcion })),
      coberturas: (cob.data ?? []).map((d) => ({ id: d.id, nombre: d.descripcion })),
      medicosRef: (med.data ?? []).map((d) => ({ id: d.id, nombre: `${d.apellidos}, ${d.nombres}` })),
      centrosTx: (cen.data ?? []).map((d) => ({ id: d.id, nombre: d.nombre })),
      localidades: (loc.data ?? []) as string[],
    };
  });

export const maestrosQueryOptions = queryOptions({
  queryKey: ["maestros"],
  queryFn: () => listarMaestros(),
  staleTime: 5 * 60 * 1000,
});
