import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestMeta } from "@/lib/request-meta.server";
import { createPublicServerClient, emailSintetico } from "@/lib/supabase-public.server";
import { AppError } from "@/lib/errores";
import type { AppRole, AuthUser } from "./types";

const MENSAJE_LOGIN = "Usuario o contraseña incorrectos.";
const MAX_INTENTOS = 5;
const VENTANA_MIN = 15;

export const usuarioSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "Usuario inválido");

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(128)
  .regex(/[A-Za-z]/, "Debe incluir letras")
  .regex(/[0-9]/, "Debe incluir números");

const loginSchema = z.object({ usuario: usuarioSchema, password: z.string().min(1).max(128) });

/**
 * Login local: usuario + contraseña. Se ejecuta en servidor para poder
 * aplicar límite de intentos, verificar estado del usuario y auditar con IP.
 */
export const login = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; session?: { access_token: string; refresh_token: string } }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ip, userAgent } = getRequestMeta();
    const usuario = data.usuario;

    const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();
    const filtroOr = ip ? `usuario.eq.${usuario},ip_address.eq.${ip}` : `usuario.eq.${usuario}`;
    const { count } = await supabaseAdmin
      .from("login_intentos")
      .select("id", { count: "exact", head: true })
      .eq("exitoso", false)
      .gte("created_at", desde)
      .or(filtroOr);

    const registrarIntento = async (exitoso: boolean) => {
      await supabaseAdmin.from("login_intentos").insert({ usuario, ip_address: ip, exitoso });
    };

    if ((count ?? 0) >= MAX_INTENTOS) {
      await registrarIntento(false);
      return { ok: false, error: "Demasiados intentos. Intente nuevamente en unos minutos." };
    }

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id, activo")
      .eq("usuario", usuario)
      .maybeSingle();

    if (!perfil || !perfil.activo) {
      await registrarIntento(false);
      return { ok: false, error: MENSAJE_LOGIN };
    }

    const publicClient = createPublicServerClient();
    const { data: auth, error } = await publicClient.auth.signInWithPassword({
      email: emailSintetico(usuario),
      password: data.password,
    });

    if (error || !auth.session) {
      await registrarIntento(false);
      return { ok: false, error: MENSAJE_LOGIN };
    }

    await registrarIntento(true);
    await supabaseAdmin.from("audit_log").insert({
      user_id: perfil.id,
      usuario,
      action: "LOGIN",
      entity: "sesion",
      ip_address: ip,
      user_agent: userAgent,
    });
    await supabaseAdmin.from("profiles").update({ ultimo_acceso: new Date().toISOString() }).eq("id", perfil.id);

    return {
      ok: true,
      session: { access_token: auth.session.access_token, refresh_token: auth.session.refresh_token },
    };
  });

/** Registra el cierre de sesión en auditoría (la revocación del token la hace el cliente). */
export const logout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ip, userAgent } = getRequestMeta();
    await context.supabase.rpc("registrar_evento_auditoria", {
      p_action: "LOGOUT",
      p_entity: "sesion",
      ...(ip ? { p_ip: ip } : {}),
      ...(userAgent ? { p_user_agent: userAgent } : {}),
    });
    return { ok: true };
  });

/** Devuelve el usuario actual con roles y permisos efectivos, resueltos en backend. */
export const getSesionActual = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuthUser | null> => {
    const { supabase, userId } = context;
    const [{ data: perfil }, { data: roles }, { data: permisos }] = await Promise.all([
      supabase.from("profiles").select("id, usuario, nombre, apellido, activo, ultimo_acceso").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.rpc("mis_permisos"),
    ]);
    if (!perfil || !perfil.activo) return null;
    return {
      id: perfil.id,
      usuario: perfil.usuario,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      roles: (roles ?? []).map((r) => r.role as AppRole),
      permisos: (permisos ?? []) as string[],
      ultimoAcceso: perfil.ultimo_acceso,
    };
  });

/** Indica si el sistema ya tiene usuarios (para mostrar la configuración inicial). */
export const sistemaInicializado = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  return { inicializado: (count ?? 0) > 0 };
});

const setupSchema = z.object({
  usuario: usuarioSchema,
  password: passwordSchema,
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().min(1).max(80),
});

/**
 * Crea el primer administrador. Sólo funciona cuando no existe ningún usuario:
 * es el mecanismo de puesta en marcha (también válido para despliegues on-premise).
 */
export const crearAdminInicial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setupSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new AppError("El sistema ya fue inicializado.", "NO_AUTORIZADO");

    const { data: creado, error } = await supabaseAdmin.auth.admin.createUser({
      email: emailSintetico(data.usuario),
      password: data.password,
      email_confirm: true,
      user_metadata: { usuario: data.usuario },
    });
    if (error || !creado.user) throw new AppError("No se pudo crear el usuario administrador.");

    const { error: ePerfil } = await supabaseAdmin.from("profiles").insert({
      id: creado.user.id,
      usuario: data.usuario,
      nombre: data.nombre,
      apellido: data.apellido,
    });
    if (ePerfil) {
      await supabaseAdmin.auth.admin.deleteUser(creado.user.id);
      throw new AppError("No se pudo crear el perfil del administrador.");
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: creado.user.id, role: "administrador" });
    return { ok: true };
  });
