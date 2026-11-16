import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth";
import { formatearFecha } from "@/types/dominio";

function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Observaciones fechadas para el seguimiento del paciente. */
export function SeguimientoPaciente({ pacienteId, editable }: { pacienteId: string; editable: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(hoy());
  const [texto, setTexto] = useState("");
  const clave = ["pacientes", "seguimiento", pacienteId];

  const lista = useQuery({
    queryKey: clave,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paciente_seguimientos")
        .select("id,fecha,texto,usuario,created_at")
        .eq("paciente_id", pacienteId)
        .eq("activo", true)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const agregar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("paciente_seguimientos").insert({
        paciente_id: pacienteId,
        fecha,
        texto: texto.trim(),
        usuario: user ? `${user.apellido}, ${user.nombre}` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observación agregada.");
      setTexto("");
      setFecha(hoy());
      void qc.invalidateQueries({ queryKey: clave });
    },
    onError: () => toast.error("No se pudo guardar la observación."),
  });

  return (
    <div className="space-y-4">
      {editable ? (
        <form
          className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) agregar.mutate();
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="seg-fecha" className="text-xs">Fecha</Label>
            <Input id="seg-fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="seg-texto" className="text-xs">Observación</Label>
            <Textarea id="seg-texto" rows={2} maxLength={4000} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <Button type="submit" disabled={agregar.isPending || !texto.trim()}>
            {agregar.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Agregar
          </Button>
        </form>
      ) : null}
      {lista.isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (lista.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Sin observaciones de seguimiento.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {lista.data?.map((o) => (
            <li key={o.id} className="border-l-2 border-primary/40 pl-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-foreground">{formatearFecha(o.fecha)}</span>
                {o.usuario ? <span className="text-xs text-muted-foreground">{o.usuario}</span> : null}
              </div>
              <p className="whitespace-pre-wrap text-foreground">{o.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
