import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ACCEPT_DOCUMENTOS, BUCKET_DOCUMENTOS, subirDocumentosPaciente } from "@/lib/documentos";
import { formatearFechaHora } from "@/types/dominio";

/** Lista de documentos del paciente; con `editable` permite subir y quitar. */
export function DocumentosPaciente({ pacienteId, editable }: { pacienteId: string; editable: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const clave = ["pacientes", "documentos", pacienteId];

  const docs = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paciente_documentos")
        .select("id,nombre,ruta,tipo_mime,tamano,created_at")
        .eq("paciente_id", pacienteId)
        .eq("activo", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const subir = useMutation({
    mutationFn: (archivos: File[]) => subirDocumentosPaciente(pacienteId, archivos),
    onSuccess: () => {
      toast.success("Documentación agregada.");
      void qc.invalidateQueries({ queryKey: clave });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Error al subir."),
  });

  const quitar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("paciente_documentos").update({ activo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: clave }),
    onError: () => toast.error("No se pudo quitar el documento."),
  });

  async function abrir(ruta: string) {
    setAbriendo(ruta);
    const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(ruta, 300);
    setAbriendo(null);
    if (error || !data) {
      toast.error("No se pudo abrir el documento.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-3">
      {editable ? (
        <>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT_DOCUMENTOS}
            className="hidden"
            onChange={(e) => {
              const f = Array.from(e.target.files ?? []);
              if (f.length) subir.mutate(f);
              e.target.value = "";
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={subir.isPending} onClick={() => input.current?.click()}>
            {subir.isPending ? <Loader2 className="animate-spin" /> : <Upload />} Agregar documentación
          </Button>
          <p className="text-xs text-muted-foreground">Imágenes o PDF, hasta 20 MB por archivo.</p>
        </>
      ) : null}
      {docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (docs.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Sin documentación cargada.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {docs.data?.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              {d.tipo_mime?.startsWith("image/") ? <ImageIcon className="size-4 shrink-0 text-muted-foreground" /> : <FileText className="size-4 shrink-0 text-muted-foreground" />}
              <button type="button" className="min-w-0 flex-1 truncate text-left text-primary hover:underline" onClick={() => abrir(d.ruta)}>
                {abriendo === d.ruta ? "Abriendo…" : d.nombre}
              </button>
              <span className="hidden text-xs text-muted-foreground sm:inline">{formatearFechaHora(d.created_at)}</span>
              {editable ? (
                <Button type="button" variant="ghost" size="icon" title="Quitar" onClick={() => quitar.mutate(d.id)}>
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
