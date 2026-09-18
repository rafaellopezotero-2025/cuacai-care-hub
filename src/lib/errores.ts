/**
 * Manejo centralizado de errores.
 * Los mensajes que llegan al usuario son genéricos: nunca se exponen detalles internos
 * ni datos de pacientes.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly codigo: "NO_AUTORIZADO" | "VALIDACION" | "DUPLICADO" | "NO_ENCONTRADO" | "INTERNO" = "INTERNO",
  ) {
    super(message);
    this.name = "AppError";
  }
}

const MENSAJE_GENERICO = "No se pudo completar la operación. Intente nuevamente.";

/** Convierte cualquier error (Postgres, red, servidor) en un mensaje apto para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  const msg = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/Unauthorized|No autorizado|42501|permission denied|row-level security/i.test(msg)) {
    return "No tiene permisos para realizar esta acción.";
  }
  if (/duplicate key|23505|ya existe/i.test(msg)) return "Ya existe un registro con esos datos.";
  if (/requiere fecha de trasplante/i.test(msg)) return "El estado seleccionado requiere fecha de trasplante.";
  if (/Fecha de trasplante inválida|Fecha de nacimiento inválida/i.test(msg)) return "La fecha ingresada no es válida.";
  if (/Paciente inexistente|23503|foreign key/i.test(msg)) return "El registro está relacionado con otros datos o no existe.";
  if (/23514|check constraint|violates/i.test(msg)) return "Los datos ingresados no cumplen las validaciones.";
  if (/Demasiados intentos/i.test(msg)) return msg;
  return MENSAJE_GENERICO;
}

/** Normaliza un error de PostgREST/Supabase a AppError para relanzar desde server functions. */
export function aAppError(error: { code?: string; message?: string } | null | undefined, fallback = MENSAJE_GENERICO): AppError {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return new AppError("No tiene permisos para realizar esta acción.", "NO_AUTORIZADO");
  }
  if (code === "23505") return new AppError("Ya existe un registro con esos datos.", "DUPLICADO");
  if (code === "23514" || code === "22023" || code === "23503") return new AppError(mensajeDeError(message), "VALIDACION");
  if (code === "PGRST116") return new AppError("Registro no encontrado.", "NO_ENCONTRADO");
  return new AppError(fallback, "INTERNO");
}
