import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestMeta } from "@/lib/request-meta.server";
import { AppError, aAppError } from "@/lib/errores";
import { emailSintetico } from "@/lib/supabase-public.server";
import { usuarioSchema, passwordSchema } from "@/auth/auth.functions";
import type { AppRole } from "@/auth/types";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Sb = SupabaseClient<Database>;

const TAMANO_PAGINA = 20;

export interface FilaUsuario {
  id: string;
  usuario: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  ultimoAcceso: string | null;
  roles: AppRole[];
}

const filtrosSchema = z.object({
  q: z.string().trim().max(200).optional(),
  activo: z.boolean().optional(),
  rol: z.enum(["administrador", "operador", "consulta"]).optional(),
  pagina: z.number().int().min(1).optional(),
});

export type FiltrosUsuarios = z.infer<typeof filtrosSchema>;

async function verificarAdministrador(supabase: Sb, userId: string) {
  const { data: autorizado } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _permiso: "usuarios.administrar",
  });
  if (!autorizado) throw new AppError("No tiene permisos para administrar usuarios.", "NO_AUTORIZADO");
}

/** Lista usuarios (perfiles + roles) con filtros de texto, estado y rol, paginado. Requiere usuarios.administrar. */
export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => filtrosSchema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<{ filas: FilaUsuario[]; total: number }> => {
    await verificarAdministrador(context.supabase, context.userId);
    const sb = context.supabase;
    const pagina = data.pagina ?? 1;

    let idsFiltroRol: string[] | null = null;
    if (data.rol) {
      const { data: filas, error } = await sb.from("user_roles").select("user_id").eq("role", data.rol);
      if (error) throw aAppError(error);
      idsFiltroRol = (filas ?? []).map((f) => f.user_id);
      if (idsFiltroRol.length === 0) return { filas: [], total: 0 };
    }

    let query = sb.from("profiles").select("id, usuario, nombre, apellido, activo, ultimo_acceso", { count: "exact" });
    if (data.q) {
      const q = data.q.trim();
      query = query.or(`usuario.ilike.%${q}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%`);
    }
    if (data.activo !== undefined) query = query.eq("activo", data.activo);
    if (idsFiltroRol) query = query.in("id", idsFiltroRol);

    const desde = (pagina - 1) * TAMANO_PAGINA;
    query = query.order("apellido").order("nombre").range(desde, desde + TAMANO_PAGINA - 1);

    const { data: perfiles, error, count } = await query;
    if (error) throw aAppError(error);

    const ids = (perfiles ?? []).map((p) => p.id);
    const rolesPorUsuario = new Map<string, AppRole[]>();
    if (ids.length > 0) {
      const { data: roles, error: eRoles } = await sb.from("user_roles").select("user_id, role").in("user_id", ids);
      if (eRoles) throw aAppError(eRoles);
      for (const r of roles ?? []) {
        const lista = rolesPorUsuario.get(r.user_id) ?? [];
        lista.push(r.role as AppRole);
        rolesPorUsuario.set(r.user_id, lista);
      }
    }

    const filas: FilaUsuario[] = (perfiles ?? []).map((p) => ({
      id: p.id,
      usuario: p.usuario,
      nombre: p.nombre,
      apellido: p.apellido,
      activo: p.activo,
      ultimoAcceso: p.ultimo_acceso,
      roles: rolesPorUsuario.get(p.id) ?? [],
    }));

    return { filas, total: count ?? 0 };
  });

export const usuariosQueryOptions = (filtros: FiltrosUsuarios) =>
  queryOptions({
    queryKey: ["usuarios", filtros],
    queryFn: () => listarUsuarios({ data: filtros }),
  });

const crearUsuarioSchema = z.object({
  usuario: usuarioSchema,
  password: passwordSchema,
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().min(1).max(80),
  roles: z.array(z.enum(["administrador", "operador", "consulta"])).min(1, "Debe asignar al menos un rol."),
});

/** Crea un usuario nuevo (perfil + credenciales + roles). Sólo administradores. */
export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => crearUsuarioSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await verificarAdministrador(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = getRequestMeta();

    const { data: existente } = await supabaseAdmin.from("profiles").select("id").eq("usuario", data.usuario).maybeSingle();
    if (existente) throw new AppError("Ya existe un usuario con ese nombre de usuario.", "DUPLICADO");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailSintetico(data.usuario),
      password: data.password,
      email_confirm: true,
      user_metadata: { usuario: data.usuario },
    });
    if (error || !creado.user) throw new AppError("No se pudo crear el usuario.");

    const { error: ePerfil } = await supabaseAdmin.from("profiles").insert({
      id: creado.user.id,
      usuario: data.usuario,
      nombre: data.nombre,
      apellido: data.apellido,
    });
    if (ePerfil) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw aAppError(ePerfil);
    }

    await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: creado.user.id, role })));

    await supabaseAdmin.from("audit_log").insert({
      user_id: context.userId,
      action: "CREATE",
      entity: "usuario",
      entity_id: creado.user.id,
      new_values: { usuario: data.usuario, nombre: data.nombre, apellido: data.apellido, roles: data.roles },
      ip_address: ip,
      user_agent: userAgent,
    });

    return { id: creado.user.id };
  });

const actualizarUsuarioSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().min(1).max(80),
  activo: z.boolean(),
});

/** Actualiza nombre/apellido/activo de un usuario. No permite que un administrador se desactive a sí mismo. */
export const actualizarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actualizarUsuarioSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await verificarAdministrador(context.supabase, context.userId);
    if (data.id === context.userId && !data.activo) {
      throw new AppError("No puede desactivar su propio usuario.", "VALIDACION");
    }
    const sb = context.supabase;
    const { data: anterior } = await sb.from("profiles").select("nombre, apellido, activo").eq("id", data.id).maybeSingle();
    const { error } = await sb
      .from("profiles")
      .update({ nombre: data.nombre, apellido: data.apellido, activo: data.activo })
      .eq("id", data.id);
    if (error) throw aAppError(error);

    const { ip, userAgent } = getRequestMeta();
    await sb.rpc("registrar_evento_auditoria", {
      p_action: data.activo === anterior?.activo ? "UPDATE" : data.activo ? "REACTIVATE" : "DEACTIVATE",
      p_entity: "usuario",
      p_entity_id: data.id,
      p_detalle: { anterior, nuevo: { nombre: data.nombre, apellido: data.apellido, activo: data.activo } },
      ...(ip ? { p_ip: ip } : {}),
      ...(userAgent ? { p_user_agent: userAgent } : {}),
    });

    return { ok: true };
  });

const asignarRolesSchema = z.object({
  id: z.string().uuid(),
  roles: z.array(z.enum(["administrador", "operador", "consulta"])),
});

/** Reemplaza los roles de un usuario. Un administrador no puede quitarse a sí mismo el rol de administrador. */
export const asignarRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => asignarRolesSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await verificarAdministrador(context.supabase, context.userId);
    if (data.id === context.userId && !data.roles.includes("administrador")) {
      throw new AppError("No puede quitarse a sí mismo el rol de administrador.", "VALIDACION");
    }
    const sb = context.supabase;
    const { data: anteriores, error: eAnt } = await sb.from("user_roles").select("role").eq("user_id", data.id);
    if (eAnt) throw aAppError(eAnt);

    const { error: eDel } = await sb.from("user_roles").delete().eq("user_id", data.id);
    if (eDel) throw aAppError(eDel);

    if (data.roles.length > 0) {
      const { error: eIns } = await sb.from("user_roles").insert(data.roles.map((role) => ({ user_id: data.id, role })));
      if (eIns) throw aAppError(eIns);
    }

    const { ip, userAgent } = getRequestMeta();
    await sb.rpc("registrar_evento_auditoria", {
      p_action: "UPDATE",
      p_entity: "usuario_roles",
      p_entity_id: data.id,
      p_detalle: { anterior: (anteriores ?? []).map((r) => r.role), nuevo: data.roles },
      ...(ip ? { p_ip: ip } : {}),
      ...(userAgent ? { p_user_agent: userAgent } : {}),
    });

    return { ok: true };
  });

const restablecerContrasenaSchema = z.object({
  id: z.string().uuid(),
  password: passwordSchema,
});

/** Restablece la contraseña de un usuario (fijada por el administrador). */
export const restablecerContrasena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => restablecerContrasenaSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await verificarAdministrador(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new AppError("No se pudo restablecer la contraseña.");

    const { ip, userAgent } = getRequestMeta();
    await context.supabase.rpc("registrar_evento_auditoria", {
      p_action: "UPDATE",
      p_entity: "usuario_contrasena",
      p_entity_id: data.id,
      ...(ip ? { p_ip: ip } : {}),
      ...(userAgent ? { p_user_agent: userAgent } : {}),
    });

    return { ok: true };
  });
