import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestMeta } from "@/lib/request-meta.server";
import { AppError, aAppError } from "@/lib/errores";
import type { AppRole } from "@/auth/types";

const ROLES: AppRole[] = ["administrador", "operador", "consulta"];

export interface Permiso {
  permiso: string;
  descripcion: string;
  grupo: string;
}

export interface RolesPermisosResult {
  roles: AppRole[];
  permisos: Permiso[];
  /** Matriz rol -> lista de permisos asignados */
  rolPermisos: Record<AppRole, string[]>;
}

/** Lista roles, permisos disponibles y la matriz de asignación rol x permiso. Requiere usuarios.administrar. */
export const listarRolesPermisos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RolesPermisosResult> => {
    const { data: autorizado } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "usuarios.administrar",
    });
    if (!autorizado) throw new AppError("No tiene permisos para ver roles y permisos.", "NO_AUTORIZADO");

    const sb = context.supabase;
    const [{ data: permisos, error: ePermisos }, { data: rolPermisos, error: eRolPermisos }] = await Promise.all([
      sb.from("permisos").select("permiso, descripcion, grupo").order("grupo").order("permiso"),
      sb.from("rol_permisos").select("role, permiso"),
    ]);
    if (ePermisos) throw aAppError(ePermisos);
    if (eRolPermisos) throw aAppError(eRolPermisos);

    const matriz = Object.fromEntries(ROLES.map((r) => [r, [] as string[]])) as Record<AppRole, string[]>;
    for (const rp of rolPermisos ?? []) {
      matriz[rp.role as AppRole]?.push(rp.permiso);
    }

    return {
      roles: ROLES,
      permisos: (permisos ?? []) as Permiso[],
      rolPermisos: matriz,
    };
  });

export const rolesPermisosQueryOptions = queryOptions({
  queryKey: ["roles-permisos"],
  queryFn: () => listarRolesPermisos(),
});

const actualizarPermisosRolSchema = z.object({
  role: z.enum(["administrador", "operador", "consulta"]),
  permisos: z.array(z.string().trim().min(1)),
});

/** Reemplaza los permisos asignados a un rol. Sólo administrador. */
export const actualizarPermisosRol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actualizarPermisosRolSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { data: autorizado } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "usuarios.administrar",
    });
    if (!autorizado) throw new AppError("No tiene permisos para editar roles.", "NO_AUTORIZADO");

    const sb = context.supabase;
    const { data: anteriores, error: eAnt } = await sb.from("rol_permisos").select("permiso").eq("role", data.role);
    if (eAnt) throw aAppError(eAnt);

    const { error: eDel } = await sb.from("rol_permisos").delete().eq("role", data.role);
    if (eDel) throw aAppError(eDel);

    if (data.permisos.length > 0) {
      const { error: eIns } = await sb.from("rol_permisos").insert(data.permisos.map((permiso) => ({ role: data.role, permiso })));
      if (eIns) throw aAppError(eIns);
    }

    const { ip, userAgent } = getRequestMeta();
    await sb.rpc("registrar_evento_auditoria", {
      p_action: "UPDATE",
      p_entity: "rol_permisos",
      p_entity_id: data.role,
      p_detalle: { anterior: (anteriores ?? []).map((a) => a.permiso), nuevo: data.permisos },
      ...(ip ? { p_ip: ip } : {}),
      ...(userAgent ? { p_user_agent: userAgent } : {}),
    });

    return { ok: true };
  });
