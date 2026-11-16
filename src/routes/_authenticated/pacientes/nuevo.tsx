import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PacienteForm, type PacienteFormValues } from "@/components/pacientes/PacienteForm";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT_DOCUMENTOS, subirDocumentosPaciente } from "@/lib/documentos";
import { PERMISOS } from "@/auth";
import { mensajeDeError } from "@/lib/errores";
import { crearPaciente } from "@/lib/pacientes.functions";

export const Route = createFileRoute("/_authenticated/pacientes/nuevo")({
  head: () => ({
    meta: [
      { title: "Nuevo paciente · CUCAIER" },
      { name: "description", content: "Alta de un nuevo paciente en el programa CUCAIER." },
      { property: "og:title", content: "Nuevo paciente · CUCAIER" },
      { property: "og:description", content: "Alta de un nuevo paciente en el programa CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NuevoPacientePage,
});

function NuevoPacientePage() {
  const navigate = useNavigate();
  const [archivos, setArchivos] = useState<File[]>([]);

  const mutacion = useMutation({
    mutationFn: (valores: PacienteFormValues) =>
      crearPaciente({
        data: {
          nombres: valores.nombres,
          apellidos: valores.apellidos,
          dni: valores.dni,
          fecha_nacimiento: valores.fecha_nacimiento,
          sexo: valores.sexo === "" ? undefined : valores.sexo,
          localidad: valores.localidad,
          telefono: valores.telefono,
          telefono_alternativo: valores.telefono_alternativo,
          email: valores.email,
          domicilio: valores.domicilio,
          observaciones: valores.observaciones,
          centro_derivacion_id: valores.centro_derivacion_id,
        },
      }),
    onSuccess: async ({ id }) => {
      toast.success("Paciente creado correctamente.");
      if (archivos.length) {
        try {
          await subirDocumentosPaciente(id, archivos);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Error al subir la documentación.");
        }
      }
      await navigate({ to: "/pacientes/$pacienteId", params: { pacienteId: id } });
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  return (
    <RequierePermiso permiso={PERMISOS.pacientesCrear}>
      <PageHeader
        titulo="Nuevo paciente"
        descripcion="Complete los datos personales del paciente."
        migas={
          <Link to="/pacientes" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Volver al listado
          </Link>
        }
      />
      <div className="card-surface max-w-3xl p-6">
        <PacienteForm
          enviando={mutacion.isPending}
          onSubmit={(valores) => mutacion.mutate(valores)}
          textoBoton="Crear paciente"
        />
      </div>
      <div className="card-surface mt-4 max-w-3xl space-y-3 p-6">
        <h2 className="text-sm font-semibold text-foreground">Documentación</h2>
        <p className="text-xs text-muted-foreground">Imágenes o PDF, hasta 20 MB por archivo. Se guardan al crear el paciente.</p>
        <Button asChild variant="outline" size="sm">
          <label className="cursor-pointer">
            <Upload /> Agregar documentación
            <input
              type="file"
              multiple
              accept={ACCEPT_DOCUMENTOS}
              className="hidden"
              onChange={(e) => {
                const f = Array.from(e.target.files ?? []);
                setArchivos((prev) => [...prev, ...f]);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {archivos.length ? (
          <ul className="space-y-1 text-sm">
            {archivos.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-2">
                <span className="truncate">{f.name}</span>
                <Button type="button" variant="ghost" size="icon" title="Quitar" onClick={() => setArchivos((p) => p.filter((_, j) => j !== i))}>
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </RequierePermiso>
  );
}
