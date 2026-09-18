/**
 * Server functions de importación masiva (fase 8).
 * Flujo: el cliente parsea la planilla (`importar-parser.ts`), envía las
 * filas a `validarImportacion` para chequear contra las tablas maestras y
 * detectar duplicados, y finalmente (si el usuario confirma) llama a
 * `confirmarImportacion`, que ejecuta la RPC transaccional `importar_lote`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppError, aAppError } from "@/lib/errores";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MAX_FILAS = 5000;

const filaPacienteSchema = z.object({
  clave: z.string().min(1),
  fila: z.number(),
  nombres: z.string(),
  apellidos: z.string(),
  dni: z.string(),
  fechaNacimiento: z.string().nullable(),
  sexo: z.string().nullable(),
  localidad: z.string().nullable(),
  telefono: z.string().nullable(),
  telefonoAlternativo: z.string().nullable(),
  email: z.string().nullable(),
  domicilio: z.string().nullable(),
  observaciones: z.string().nullable(),
});

const filaTrasplanteSchema = z.object({
  fila: z.number(),
  pacienteClave: z.string(),
  diagnostico: z.string().nullable(),
  tipoTx: z.string().nullable(),
  estadoTx: z.string().nullable(),
  viaAdmin: z.string().nullable(),
  cobertura: z.string().nullable(),
  centroTx: z.string().nullable(),
  medico: z.string().nullable(),
  fechaTx: z.string().nullable(),
  observaciones: z.string().nullable(),
});

const inputSchema = z.object({
  pacientes: z.array(filaPacienteSchema).max(MAX_FILAS),
  trasplantes: z.array(filaTrasplanteSchema).max(MAX_FILAS),
});

export type FilaPacienteValidada = z.infer<typeof filaPacienteSchema> & {
  estado: "nuevo" | "existente" | "error";
  mensajes: string[];
};

export type FilaTrasplanteValidada = z.infer<typeof filaTrasplanteSchema> & {
  estado: "valido" | "error";
  mensajes: string[];
};

export interface ResultadoValidacion {
  pacientes: FilaPacienteValidada[];
  trasplantes: FilaTrasplanteValidada[];
  resumen: { validos: number; conErrores: number; duplicados: number };
}

function normalizar(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function enChunks<T>(arr: T[], tam: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += tam) out.push(arr.slice(i, i + tam));
  return out;
}

async function verificarPermiso(supabase: SupabaseClient<Database>, userId: string) {
  const { data: ok } = await supabase.rpc("has_permission", { _user_id: userId, _permiso: "importar.ejecutar" });
  if (!ok) throw new AppError("No tiene permisos para realizar esta acción.", "NO_AUTORIZADO");
}

/**
 * Valida un lote parseado de pacientes/trasplantes contra las tablas maestras
 * y los pacientes ya existentes (por DNI). No modifica datos.
 */
export const validarImportacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ context, data }): Promise<ResultadoValidacion> => {
    const supabase = context.supabase;
    await verificarPermiso(supabase, context.userId);

    const [diagnosticos, tiposTx, estadosTx, viasAdmin, coberturas, centrosTx, medicosRef] = await Promise.all([
      supabase.from("diagnosticos").select("id, diagnostico, activo"),
      supabase.from("tipos_tx").select("id, tipo_tx, activo"),
      supabase.from("estados_tx").select("id, estado_tx, codigo, activo"),
      supabase.from("vias_admin").select("id, descripcion, activo"),
      supabase.from("coberturas").select("id, descripcion, activo"),
      supabase.from("centros_tx").select("id, nombre, activo"),
      supabase.from("medicos_ref").select("id, nombres, apellidos, matricula, activo"),
    ]);

    const dnis = Array.from(new Set(data.pacientes.map((p) => p.dni).filter((d) => d.length > 0)));
    const existentesPorDni = new Map<string, string>();
    for (const grupo of enChunks(dnis, 200)) {
      if (grupo.length === 0) continue;
      const { data: filas } = await supabase.from("pacientes").select("id, dni").in("dni", grupo);
      for (const f of filas ?? []) {
        if (f.dni) existentesPorDni.set(f.dni, f.id);
      }
    }

    const diagPorNombre = new Map((diagnosticos.data ?? []).map((d) => [normalizar(d.diagnostico), d]));
    const tipoPorNombre = new Map((tiposTx.data ?? []).map((d) => [normalizar(d.tipo_tx), d]));
    const estadoPorNombre = new Map((estadosTx.data ?? []).map((d) => [normalizar(d.estado_tx), d]));
    const estadoPorCodigo = new Map((estadosTx.data ?? []).map((d) => [normalizar(d.codigo), d]));
    const viaPorNombre = new Map((viasAdmin.data ?? []).map((d) => [normalizar(d.descripcion), d]));
    const cobPorNombre = new Map((coberturas.data ?? []).map((d) => [normalizar(d.descripcion), d]));
    const centroPorNombre = new Map((centrosTx.data ?? []).map((d) => [normalizar(d.nombre), d]));
    const medicoPorMatricula = new Map((medicosRef.data ?? []).map((d) => [normalizar(d.matricula), d]));
    const medicoPorNombre = new Map(
      (medicosRef.data ?? []).flatMap((d) => [
        [normalizar(`${d.apellidos}, ${d.nombres}`), d] as const,
        [normalizar(`${d.nombres} ${d.apellidos}`), d] as const,
      ]),
    );

    const dnisVistos = new Map<string, number>();
    const clavesValidas = new Set<string>();
    let duplicados = 0;

    const pacientesValidados: FilaPacienteValidada[] = data.pacientes.map((p) => {
      const mensajes: string[] = [];
      let estado: FilaPacienteValidada["estado"] = "nuevo";
      if (!p.nombres || !p.apellidos) mensajes.push("Faltan nombres y/o apellidos.");
      if (!/^[0-9]{6,9}$/.test(p.dni)) {
        mensajes.push("El DNI debe tener entre 6 y 9 dígitos.");
      } else {
        const previa = dnisVistos.get(p.dni);
        if (previa) {
          mensajes.push(`DNI duplicado en el archivo (también en la fila ${previa}).`);
          duplicados++;
        } else {
          dnisVistos.set(p.dni, p.fila);
        }
        if (existentesPorDni.has(p.dni)) {
          estado = "existente";
          mensajes.push("DNI ya registrado: se reutilizará el paciente existente.");
        }
      }
      if (mensajes.some((m) => !m.startsWith("DNI ya registrado") && !m.startsWith("DNI duplicado"))) {
        estado = "error";
      } else if (mensajes.some((m) => m.startsWith("DNI duplicado"))) {
        estado = "error";
      }
      if (estado !== "error") clavesValidas.add(p.clave);
      return { ...p, estado, mensajes };
    });

    const trasplantesValidados: FilaTrasplanteValidada[] = data.trasplantes.map((t) => {
      const mensajes: string[] = [];
      if (!t.pacienteClave) {
        mensajes.push("Falta la referencia al paciente.");
      } else if (!clavesValidas.has(t.pacienteClave)) {
        mensajes.push(`El paciente referenciado (fila con clave '${t.pacienteClave}') tiene errores o no existe.`);
      }
      if (t.diagnostico) {
        const d = diagPorNombre.get(normalizar(t.diagnostico));
        if (!d) mensajes.push(`Diagnóstico '${t.diagnostico}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Diagnóstico '${t.diagnostico}' está inactivo.`);
      }
      if (t.tipoTx) {
        const d = tipoPorNombre.get(normalizar(t.tipoTx));
        if (!d) mensajes.push(`Tipo de trasplante '${t.tipoTx}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Tipo de trasplante '${t.tipoTx}' está inactivo.`);
      }
      if (!t.estadoTx) {
        mensajes.push("Falta el estado del trasplante.");
      } else {
        const d = estadoPorNombre.get(normalizar(t.estadoTx)) ?? estadoPorCodigo.get(normalizar(t.estadoTx));
        if (!d) mensajes.push(`Estado de trasplante '${t.estadoTx}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Estado de trasplante '${t.estadoTx}' está inactivo.`);
      }
      if (t.viaAdmin) {
        const d = viaPorNombre.get(normalizar(t.viaAdmin));
        if (!d) mensajes.push(`Vía administrativa '${t.viaAdmin}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Vía administrativa '${t.viaAdmin}' está inactiva.`);
      }
      if (t.cobertura) {
        const d = cobPorNombre.get(normalizar(t.cobertura));
        if (!d) mensajes.push(`Cobertura '${t.cobertura}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Cobertura '${t.cobertura}' está inactiva.`);
      }
      if (t.centroTx) {
        const d = centroPorNombre.get(normalizar(t.centroTx));
        if (!d) mensajes.push(`Centro de trasplante '${t.centroTx}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Centro de trasplante '${t.centroTx}' está inactivo.`);
      }
      if (t.medico) {
        const d = medicoPorMatricula.get(normalizar(t.medico)) ?? medicoPorNombre.get(normalizar(t.medico));
        if (!d) mensajes.push(`Médico de referencia '${t.medico}' no existe en tablas maestras.`);
        else if (!d.activo) mensajes.push(`Médico de referencia '${t.medico}' está inactivo.`);
      }
      const estado: FilaTrasplanteValidada["estado"] = mensajes.length > 0 ? "error" : "valido";
      return { ...t, estado, mensajes };
    });

    const conErroresPacientes = pacientesValidados.filter((p) => p.estado === "error").length;
    const conErroresTx = trasplantesValidados.filter((t) => t.estado === "error").length;

    return {
      pacientes: pacientesValidados,
      trasplantes: trasplantesValidados,
      resumen: {
        validos: pacientesValidados.filter((p) => p.estado !== "error").length + trasplantesValidados.filter((t) => t.estado === "valido").length,
        conErrores: conErroresPacientes + conErroresTx,
        duplicados,
      },
    };
  });

const confirmarSchema = z.object({
  pacientes: z.array(
    z.object({
      clave: z.string(),
      nombres: z.string(),
      apellidos: z.string(),
      dni: z.string(),
      fechaNacimiento: z.string().nullable(),
      sexo: z.string().nullable(),
      localidad: z.string().nullable(),
      telefono: z.string().nullable(),
      telefonoAlternativo: z.string().nullable(),
      email: z.string().nullable(),
      domicilio: z.string().nullable(),
      observaciones: z.string().nullable(),
    }),
  ).max(MAX_FILAS),
  trasplantes: z.array(
    z.object({
      pacienteClave: z.string(),
      diagnostico: z.string().nullable(),
      tipoTx: z.string().nullable(),
      estadoTx: z.string().nullable(),
      viaAdmin: z.string().nullable(),
      cobertura: z.string().nullable(),
      centroTx: z.string().nullable(),
      medico: z.string().nullable(),
      fechaTx: z.string().nullable(),
      observaciones: z.string().nullable(),
    }),
  ).max(MAX_FILAS),
});

export interface ResultadoImportacion {
  pacientesCreados: number;
  pacientesExistentes: number;
  trasplantesCreados: number;
}

/**
 * Ejecuta la RPC transaccional `importar_lote` (definida en
 * drizzle/migrations/0001_importacion_lote.sql). El tipo `Database` generado
 * todavía no conoce esta función porque la migración no fue aplicada aún;
 * por eso se castea puntualmente acá. Una vez aplicada la migración y
 * regenerados los tipos de Supabase, este helper puede tipar la llamada
 * directamente y eliminar los `as never`.
 */
async function invocarImportarLote(
  supabase: SupabaseClient<Database>,
  args: { p_pacientes: unknown; p_trasplantes: unknown },
): Promise<{ data: ResultadoImportacion | null; error: { code?: string; message?: string } | null }> {
  const { data, error } = await supabase.rpc("importar_lote" as never, args as never);
  if (error) return { data: null, error };
  const resultado = data as unknown as { pacientes_creados: number; pacientes_existentes: number; trasplantes_creados: number };
  return {
    data: {
      pacientesCreados: resultado.pacientes_creados,
      pacientesExistentes: resultado.pacientes_existentes,
      trasplantesCreados: resultado.trasplantes_creados,
    },
    error: null,
  };
}

/** Confirma la importación: inserta pacientes/trasplantes de forma transaccional vía RPC. */
export const confirmarImportacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => confirmarSchema.parse(input))
  .handler(async ({ context, data }): Promise<ResultadoImportacion> => {
    const supabase = context.supabase;
    await verificarPermiso(supabase, context.userId);

    if (data.pacientes.length === 0 && data.trasplantes.length === 0) {
      throw new AppError("No hay registros válidos para importar.", "VALIDACION");
    }

    const p_pacientes = data.pacientes.map((p) => ({
      clave: p.clave,
      nombres: p.nombres,
      apellidos: p.apellidos,
      dni: p.dni,
      fecha_nacimiento: p.fechaNacimiento,
      sexo: p.sexo,
      localidad: p.localidad,
      telefono: p.telefono,
      telefono_alternativo: p.telefonoAlternativo,
      email: p.email,
      domicilio: p.domicilio,
      observaciones: p.observaciones,
    }));
    const p_trasplantes = data.trasplantes.map((t) => ({
      paciente_clave: t.pacienteClave,
      diagnostico: t.diagnostico,
      tipo_tx: t.tipoTx,
      estado_tx: t.estadoTx,
      via_admin: t.viaAdmin,
      cobertura: t.cobertura,
      centro_tx: t.centroTx,
      medico: t.medico,
      fecha_tx: t.fechaTx,
      observaciones: t.observaciones,
    }));

    const { data: resultado, error } = await invocarImportarLote(supabase, { p_pacientes, p_trasplantes });
    if (error) throw aAppError(error, "No se pudo completar la importación. No se guardó ningún registro.");
    if (!resultado) throw new AppError("No se pudo completar la importación.", "INTERNO");
    return resultado;
  });
