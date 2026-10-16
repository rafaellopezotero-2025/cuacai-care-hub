import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PacienteForm, type PacienteFormValues } from "@/components/pacientes/PacienteForm";
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
    </RequierePermiso>
  );
}
