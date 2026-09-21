import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { TrasplanteForm, type TrasplanteFormValues } from "@/components/trasplantes/TrasplanteForm";
import { obtenerTrasplante, actualizarTrasplante } from "@/lib/trasplantes.functions";
import { mensajeDeError } from "@/lib/errores";

export const Route = createFileRoute("/_authenticated/trasplantes/$trasplanteId/editar")({
  head: () => ({
    meta: [
      { title: "Editar proceso de trasplante · CUCAIER Gestión de Pacientes" },
      { name: "description", content: "Edición de los datos de un proceso de trasplante existente." },
      { property: "og:title", content: "Editar proceso de trasplante · CUCAIER" },
      { property: "og:description", content: "Edición de los datos de un proceso de trasplante existente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditarTrasplantePage,
});

const SIN_VALOR = "__ninguno__";

function EditarTrasplantePage() {
  const { trasplanteId } = Route.useParams();
  const queryClient = useQueryClient();

  const trasplanteQuery = useQuery({
    queryKey: ["trasplante", trasplanteId],
    queryFn: () => obtenerTrasplante({ data: { id: trasplanteId } }),
  });

  const actualizarMutacion = useMutation({
    mutationFn: (valores: TrasplanteFormValues) =>
      actualizarTrasplante({
        data: {
          id: trasplanteId,
          paciente_id: valores.paciente_id,
          diagnostico_id: valores.diagnostico_id === SIN_VALOR || valores.diagnostico_id === "" ? null : valores.diagnostico_id,
          tipo_tx_id: valores.tipo_tx_id === SIN_VALOR || valores.tipo_tx_id === "" ? null : valores.tipo_tx_id,
          estado_tx_id: valores.estado_tx_id,
          via_admin_id: valores.via_admin_id === SIN_VALOR || valores.via_admin_id === "" ? null : valores.via_admin_id,
          cobertura_id: valores.cobertura_id === SIN_VALOR || valores.cobertura_id === "" ? null : valores.cobertura_id,
          centro_tx_id: valores.centro_tx_id === SIN_VALOR || valores.centro_tx_id === "" ? null : valores.centro_tx_id,
          medico_ref_id: valores.medico_ref_id === SIN_VALOR || valores.medico_ref_id === "" ? null : valores.medico_ref_id,
          fecha_tx: valores.fecha_tx || null,
          observaciones: valores.observaciones || null,
        },
      }),
    onSuccess: () => {
      toast.success("Proceso de trasplante actualizado.");
      queryClient.invalidateQueries({ queryKey: ["trasplantes"] });
      queryClient.invalidateQueries({ queryKey: ["trasplante", trasplanteId] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const tx = trasplanteQuery.data;

  return (
    <RequierePermiso permiso={PERMISOS.trasplantesEditar}>
      <PageHeader
        titulo="Editar proceso de trasplante"
        descripcion="Actualice los datos del proceso registrado para este paciente."
      />
      <div className="card-surface max-w-3xl rounded-md p-6">
        {trasplanteQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : !tx ? (
          <p className="text-sm text-muted-foreground">No se encontró el proceso solicitado.</p>
        ) : (
          <TrasplanteForm
            valoresIniciales={{
              paciente_id: tx.paciente_id,
              diagnostico_id: tx.diagnostico_id ?? SIN_VALOR,
              tipo_tx_id: tx.tipo_tx_id ?? SIN_VALOR,
              estado_tx_id: tx.estado_tx_id,
              via_admin_id: tx.via_admin_id ?? SIN_VALOR,
              cobertura_id: tx.cobertura_id ?? SIN_VALOR,
              centro_tx_id: tx.centro_tx_id ?? SIN_VALOR,
              medico_ref_id: tx.medico_ref_id ?? SIN_VALOR,
              fecha_tx: tx.fecha_tx ?? "",
              observaciones: tx.observaciones ?? "",
            }}
            pacientePreseleccionado={{
              id: tx.pacientes.id,
              nombres: tx.pacientes.nombres,
              apellidos: tx.pacientes.apellidos,
              dni: tx.pacientes.dni,
            }}
            pacienteBloqueado
            enviando={actualizarMutacion.isPending}
            onSubmit={(valores) => actualizarMutacion.mutate(valores)}
            textoBoton="Guardar cambios"
          />
        )}
      </div>
    </RequierePermiso>
  );
}
