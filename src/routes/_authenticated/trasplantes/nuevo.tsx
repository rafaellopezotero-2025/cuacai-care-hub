import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrasplanteForm, TRASPLANTE_FORM_DEFAULTS, type TrasplanteFormValues } from "@/components/trasplantes/TrasplanteForm";
import { crearTrasplante } from "@/lib/trasplantes.functions";
import { obtenerPaciente } from "@/lib/pacientes.functions";
import { mensajeDeError } from "@/lib/errores";

const searchSchema = z.object({
  pacienteId: z.string().uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/trasplantes/nuevo")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Nuevo proceso de trasplante · CUCAIER Gestión de Pacientes" },
      { name: "description", content: "Registro de un nuevo proceso de trasplante para un paciente." },
      { property: "og:title", content: "Nuevo proceso de trasplante · CUCAIER" },
      { property: "og:description", content: "Registro de un nuevo proceso de trasplante para un paciente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NuevoTrasplantePage,
});

function NuevoTrasplantePage() {
  const { pacienteId } = Route.useSearch();
  const queryClient = useQueryClient();

  const pacienteQuery = useQuery({
    queryKey: ["paciente-preseleccionado", pacienteId],
    queryFn: () => obtenerPaciente({ data: { id: pacienteId as string } }),
    enabled: !!pacienteId,
  });

  const crearMutacion = useMutation({
    mutationFn: (valores: TrasplanteFormValues) =>
      crearTrasplante({
        data: {
          paciente_id: valores.paciente_id,
          diagnostico_id: valores.diagnostico_id === "__ninguno__" || valores.diagnostico_id === "" ? null : valores.diagnostico_id,
          tipo_tx_id: valores.tipo_tx_id === "__ninguno__" || valores.tipo_tx_id === "" ? null : valores.tipo_tx_id,
          estado_tx_id: valores.estado_tx_id,
          via_admin_id: valores.via_admin_id === "__ninguno__" || valores.via_admin_id === "" ? null : valores.via_admin_id,
          cobertura_id: valores.cobertura_id === "__ninguno__" || valores.cobertura_id === "" ? null : valores.cobertura_id,
          centro_tx_id: valores.centro_tx_id === "__ninguno__" || valores.centro_tx_id === "" ? null : valores.centro_tx_id,
          medico_ref_id: valores.medico_ref_id === "__ninguno__" || valores.medico_ref_id === "" ? null : valores.medico_ref_id,
          fecha_tx: valores.fecha_tx || null,
          observaciones: valores.observaciones || null,
        },
      }),
    onSuccess: (_r, valores) => {
      toast.success("Proceso de trasplante registrado.");
      queryClient.invalidateQueries({ queryKey: ["trasplantes"] });
      window.location.href = `/pacientes/${valores.paciente_id}`;
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const paciente = pacienteQuery.data?.paciente;

  return (
    <RequierePermiso permiso={PERMISOS.trasplantesCrear}>
      <PageHeader
        titulo="Nuevo proceso de trasplante"
        descripcion="Complete los datos del nuevo proceso. Los campos no obligatorios pueden dejarse sin especificar."
      />
      <div className="card-surface max-w-3xl rounded-md p-6">
        <TrasplanteForm
          valoresIniciales={pacienteId ? { ...TRASPLANTE_FORM_DEFAULTS, paciente_id: pacienteId } : undefined}
          pacientePreseleccionado={
            paciente ? { id: paciente.id, nombres: paciente.nombres, apellidos: paciente.apellidos, dni: paciente.dni } : undefined
          }
          pacienteBloqueado={!!pacienteId}
          enviando={crearMutacion.isPending}
          onSubmit={(valores) => crearMutacion.mutate(valores)}
          textoBoton="Registrar proceso"
        />
      </div>
    </RequierePermiso>
  );
}
