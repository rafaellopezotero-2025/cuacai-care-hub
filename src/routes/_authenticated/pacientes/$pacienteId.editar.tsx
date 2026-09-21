import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PacienteForm, type PacienteFormValues } from "@/components/pacientes/PacienteForm";
import { PERMISOS } from "@/auth";
import { mensajeDeError } from "@/lib/errores";
import { actualizarPaciente, obtenerPaciente } from "@/lib/pacientes.functions";
import type { Paciente } from "@/types/dominio";

export const Route = createFileRoute("/_authenticated/pacientes/$pacienteId/editar")({
  head: () => ({
    meta: [
      { title: "Editar paciente · CUCAIER" },
      { name: "description", content: "Edición de los datos de un paciente del programa CUCAIER." },
      { property: "og:title", content: "Editar paciente · CUCAIER" },
      { property: "og:description", content: "Edición de los datos de un paciente del programa CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditarPacientePage,
});

function pacienteAValoresFormulario(paciente: Paciente): PacienteFormValues {
  return {
    nombres: paciente.nombres,
    apellidos: paciente.apellidos,
    dni: paciente.dni ?? "",
    fecha_nacimiento: paciente.fecha_nacimiento ?? "",
    sexo: (paciente.sexo as "F" | "M" | "X" | null) ?? "",
    localidad: paciente.localidad ?? "",
    telefono: paciente.telefono ?? "",
    telefono_alternativo: paciente.telefono_alternativo ?? "",
    email: paciente.email ?? "",
    domicilio: paciente.domicilio ?? "",
    observaciones: paciente.observaciones ?? "",
  };
}

function EditarPacientePage() {
  const { pacienteId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const pacienteQuery = useQuery({
    queryKey: ["pacientes", "ficha", pacienteId],
    queryFn: () => obtenerPaciente({ data: { id: pacienteId } }),
  });

  const mutacion = useMutation({
    mutationFn: (valores: PacienteFormValues) =>
      actualizarPaciente({
        data: {
          id: pacienteId,
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
        },
      }),
    onSuccess: async () => {
      toast.success("Paciente actualizado correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      await navigate({ to: "/pacientes/$pacienteId", params: { pacienteId } });
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  return (
    <RequierePermiso permiso={PERMISOS.pacientesEditar}>
      <PageHeader
        titulo="Editar paciente"
        descripcion="Modifique los datos personales del paciente."
        migas={
          <Link
            to="/pacientes/$pacienteId"
            params={{ pacienteId }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ChevronLeft className="size-3" /> Volver a la ficha
          </Link>
        }
      />
      <div className="card-surface max-w-3xl p-6">
        {pacienteQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Cargando datos del paciente…
          </div>
        ) : pacienteQuery.data ? (
          <PacienteForm
            valoresIniciales={pacienteAValoresFormulario(pacienteQuery.data.paciente)}
            enviando={mutacion.isPending}
            onSubmit={(valores) => mutacion.mutate(valores)}
            textoBoton="Guardar cambios"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No se pudo cargar el paciente.</p>
        )}
      </div>
    </RequierePermiso>
  );
}
