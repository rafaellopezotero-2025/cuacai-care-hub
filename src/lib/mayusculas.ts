/** Tipos de campo que nunca se pasan a mayúsculas (claves, correos, fechas, números, archivos). */
const TIPOS_EXCLUIDOS = new Set(["password", "email", "date", "datetime-local", "time", "month", "number", "file", "url", "checkbox", "radio", "color", "range", "hidden"]);
const IDS_EXCLUIDOS = new Set(["usuario", "username", "email"]);

export function aplicaMayusculas(props: { type?: string | undefined; id?: string | undefined; name?: string | undefined; autoComplete?: string | undefined; "data-mayus"?: unknown }): boolean {
  if (props["data-mayus"] === false || props["data-mayus"] === "false") return false;
  if (props.type && TIPOS_EXCLUIDOS.has(props.type)) return false;
  if (props.id && IDS_EXCLUIDOS.has(props.id)) return false;
  if (props.name && IDS_EXCLUIDOS.has(props.name)) return false;
  if (props.autoComplete === "username" || props.autoComplete?.includes("password")) return false;
  return true;
}

/** Convierte el valor del campo a mayúsculas conservando la posición del cursor. */
export function convertirAMayusculas(el: HTMLInputElement | HTMLTextAreaElement) {
  const v = el.value;
  const up = v.toLocaleUpperCase("es-AR");
  if (v === up) return;
  let ini: number | null = null, fin: number | null = null;
  try { ini = el.selectionStart; fin = el.selectionEnd; } catch { /* algunos tipos no soportan selección */ }
  el.value = up;
  try { if (ini !== null && fin !== null) el.setSelectionRange(ini, fin); } catch { /* idem */ }
}
