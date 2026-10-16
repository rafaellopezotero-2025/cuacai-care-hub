import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, aAppError } from "@/lib/errores";
import {
  MAESTROS_CONFIG,
  MAESTROS_SLUGS,
  type CampoMaestro,
  type FilaMaestro,
  type MaestroSlug,
} from "@/lib/maestros-config";

const slugSchema = z.enum(MAESTROS_SLUGS as [MaestroSlug, ...MaestroSlug[]]);

/** Construye el esquema zod de validación a partir de la definición de campos del maestro. */
function construirEsquema(campos: CampoMaestro[]) {
  const forma: Record<string, z.ZodTypeAny> = {};
  for (const campo of campos) {
    let tipo: z.ZodTypeAny;
    switch (campo.tipo) {
      case "text": {
        let cadena = z.string().trim().max(300);
        if (campo.nombre === "codigo") {
          cadena = cadena.regex(/^[A-Z_]+$/, "Debe usar solo mayúsculas y guiones bajos");
        }
        tipo = campo.requerido
          ? cadena.min(1, `${campo.etiqueta} es obligatorio`)
          : cadena
              .optional()
              .or(z.literal(""))
              .transform((v) => (v ? v : null));
        break;
      }
      case "email": {
        const cadena = z.string().trim().max(200);
        tipo = campo.requerido
          ? cadena.email("Email inválido")
          : cadena
              .refine((v) => v === "" || z.string().email().safeParse(v).success, "Email inválido")
              .transform((v) => (v ? v : null));
        break;
      }
      case "number": {
        tipo = campo.requerido ? z.coerce.number() : z.coerce.number().optional().nullable();
        break;
      }
      case "boolean": {
        tipo = z.coerce.boolean();
        break;
      }
    }
    forma[campo.nombre] = tipo;
  }
  return z.object(forma);
}

/** Lista los registros de una tabla maestra, aplicando búsqueda y filtro de activos. */
export const listarMaestro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: slugSchema,
        busqueda: z.string().trim().max(200).optional(),
        incluirInactivos: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }): Promise<FilaMaestro[]> => {
    const cfg = MAESTROS_CONFIG[data.slug];
    const sb = context.supabase;
    const incluirInactivos = data.incluirInactivos ?? false;
    const busqueda = data.busqueda?.trim();

    try {
      switch (cfg.tabla) {
        case "diagnosticos": {
          let q = sb.from("diagnosticos").select("*").order("diagnostico").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("diagnostico", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "tipos_tx": {
          let q = sb.from("tipos_tx").select("*").order("tipo_tx").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("tipo_tx", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "estados_tx": {
          let q = sb.from("estados_tx").select("*").order("orden").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("estado_tx", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "vias_admin": {
          let q = sb.from("vias_admin").select("*").order("descripcion").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("descripcion", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "coberturas": {
          let q = sb.from("coberturas").select("*").order("descripcion").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("descripcion", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "medicos_ref": {
          let q = sb.from("medicos_ref").select("*").order("apellidos").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.or(`apellidos.ilike.%${busqueda}%,nombres.ilike.%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "centros_tx": {
          let q = sb.from("centros_tx").select("*").order("nombre").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("nombre", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
        case "centros_derivacion": {
          let q = sb.from("centros_derivacion").select("*").order("nombre").limit(500);
          if (!incluirInactivos) q = q.eq("activo", true);
          if (busqueda) q = q.ilike("nombre", `%${busqueda}%`);
          const { data: filas, error } = await q;
          if (error) throw aAppError(error);
          return (filas ?? []).map((f) => f as FilaMaestro);
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw aAppError(error as { code?: string; message?: string });
    }
  });

const guardarSchema = z.object({
  slug: slugSchema,
  id: z.string().uuid().optional(),
  valores: z.record(z.string(), z.unknown()),
});

/** Crea o actualiza un registro de una tabla maestra. Requiere permiso maestros.editar. */
export const guardarMaestro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => guardarSchema.parse(input))
  .handler(async ({ context, data }): Promise<FilaMaestro> => {
    const { data: autorizado } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "maestros.editar",
    });
    if (!autorizado) throw new AppError("No tiene permisos para editar tablas maestras.", "NO_AUTORIZADO");

    const cfg = MAESTROS_CONFIG[data.slug];
    const esquema = construirEsquema(cfg.campos);
    const parseo = esquema.safeParse(data.valores);
    if (!parseo.success) {
      throw new AppError(parseo.error.issues[0]?.message ?? "Datos inválidos.", "VALIDACION");
    }
    const v = parseo.data as Record<string, unknown>;
    const sb = context.supabase;

    try {
      switch (cfg.tabla) {
        case "diagnosticos": {
          const payload = { diagnostico: v["diagnostico"] as string };
          const { data: fila, error } = data.id
            ? await sb.from("diagnosticos").update(payload).eq("id", data.id).select().single()
            : await sb.from("diagnosticos").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "tipos_tx": {
          const payload = { tipo_tx: v["tipo_tx"] as string };
          const { data: fila, error } = data.id
            ? await sb.from("tipos_tx").update(payload).eq("id", data.id).select().single()
            : await sb.from("tipos_tx").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "estados_tx": {
          const payload = {
            estado_tx: v["estado_tx"] as string,
            codigo: v["codigo"] as string,
            requiere_fecha_tx: Boolean(v["requiere_fecha_tx"]),
            ...(v["orden"] !== null && v["orden"] !== undefined ? { orden: v["orden"] as number } : {}),
          };
          const { data: fila, error } = data.id
            ? await sb.from("estados_tx").update(payload).eq("id", data.id).select().single()
            : await sb.from("estados_tx").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "vias_admin": {
          const payload = { descripcion: v["descripcion"] as string };
          const { data: fila, error } = data.id
            ? await sb.from("vias_admin").update(payload).eq("id", data.id).select().single()
            : await sb.from("vias_admin").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "coberturas": {
          const payload = { descripcion: v["descripcion"] as string };
          const { data: fila, error } = data.id
            ? await sb.from("coberturas").update(payload).eq("id", data.id).select().single()
            : await sb.from("coberturas").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "medicos_ref": {
          const payload = {
            nombres: v["nombres"] as string,
            apellidos: v["apellidos"] as string,
            matricula: (v["matricula"] as string | null) ?? null,
            telefono: (v["telefono"] as string | null) ?? null,
            email: (v["email"] as string | null) ?? null,
          };
          const { data: fila, error } = data.id
            ? await sb.from("medicos_ref").update(payload).eq("id", data.id).select().single()
            : await sb.from("medicos_ref").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "centros_tx": {
          const payload = {
            nombre: v["nombre"] as string,
            localidad: (v["localidad"] as string | null) ?? null,
            provincia: (v["provincia"] as string | null) ?? null,
            telefono: (v["telefono"] as string | null) ?? null,
            email: (v["email"] as string | null) ?? null,
            observaciones: (v["observaciones"] as string | null) ?? null,
          };
          const { data: fila, error } = data.id
            ? await sb.from("centros_tx").update(payload).eq("id", data.id).select().single()
            : await sb.from("centros_tx").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
        case "centros_derivacion": {
          const payload = {
            nombre: v["nombre"] as string,
            direccion: (v["direccion"] as string | null) ?? null,
            localidad: (v["localidad"] as string | null) ?? null,
            provincia: (v["provincia"] as string | null) ?? null,
            telefono: (v["telefono"] as string | null) ?? null,
            email: (v["email"] as string | null) ?? null,
          };
          const { data: fila, error } = data.id
            ? await sb.from("centros_derivacion").update(payload).eq("id", data.id).select().single()
            : await sb.from("centros_derivacion").insert(payload).select().single();
          if (error) throw aAppError(error);
          return fila as FilaMaestro;
        }
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw aAppError(error as { code?: string; message?: string });
    }
  });

const cambiarActivoSchema = z.object({
  slug: slugSchema,
  id: z.string().uuid(),
  activo: z.boolean(),
});

/** Activa/desactiva (baja lógica) un registro de una tabla maestra. Requiere permiso maestros.editar. */
export const cambiarActivoMaestro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cambiarActivoSchema.parse(input))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { data: autorizado } = await context.supabase.rpc("has_permission", {
      _user_id: context.userId,
      _permiso: "maestros.editar",
    });
    if (!autorizado) throw new AppError("No tiene permisos para editar tablas maestras.", "NO_AUTORIZADO");

    const cfg = MAESTROS_CONFIG[data.slug];
    const sb = context.supabase;
    let error: { code?: string; message?: string } | null = null;
    switch (cfg.tabla) {
      case "diagnosticos":
        ({ error } = await sb.from("diagnosticos").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "tipos_tx":
        ({ error } = await sb.from("tipos_tx").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "estados_tx":
        ({ error } = await sb.from("estados_tx").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "vias_admin":
        ({ error } = await sb.from("vias_admin").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "coberturas":
        ({ error } = await sb.from("coberturas").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "medicos_ref":
        ({ error } = await sb.from("medicos_ref").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "centros_tx":
        ({ error } = await sb.from("centros_tx").update({ activo: data.activo }).eq("id", data.id));
        break;
      case "centros_derivacion":
        ({ error } = await sb.from("centros_derivacion").update({ activo: data.activo }).eq("id", data.id));
        break;
    }
    if (error) throw aAppError(error);
    return { ok: true };
  });
