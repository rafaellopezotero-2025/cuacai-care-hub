import { supabase } from "@/integrations/supabase/client";

export const BUCKET_DOCUMENTOS = "documentos-pacientes";
/** Formatos aceptados. Para habilitar más, agregar extensiones/MIME aquí. */
export const FORMATOS_DOCUMENTO = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", "image/*", "application/pdf"];
export const ACCEPT_DOCUMENTOS = FORMATOS_DOCUMENTO.join(",");
export const TAMANO_MAX_DOCUMENTO = 20 * 1024 * 1024;

export async function subirDocumentosPaciente(pacienteId: string, archivos: File[]) {
  for (const archivo of archivos) {
    if (archivo.size > TAMANO_MAX_DOCUMENTO) throw new Error(`"${archivo.name}" supera los 20 MB.`);
    const limpio = archivo.name.replace(/[^\w.\-]+/g, "_");
    const ruta = `${pacienteId}/${crypto.randomUUID()}-${limpio}`;
    const { error: e1 } = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(ruta, archivo, {
      contentType: archivo.type || "application/octet-stream",
    });
    if (e1) throw new Error(`No se pudo subir "${archivo.name}".`);
    const { error: e2 } = await supabase.from("paciente_documentos").insert({
      paciente_id: pacienteId,
      nombre: archivo.name,
      ruta,
      tipo_mime: archivo.type || null,
      tamano: archivo.size,
    });
    if (e2) throw new Error(`No se pudo registrar "${archivo.name}".`);
  }
}
