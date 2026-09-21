import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { EstadoBadge } from "@/components/shared/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, PERMISOS } from "@/auth";
import { PANTALLA_VACIA_CLASS } from "@/lib/utils";
import { mensajeDeError } from "@/lib/errores";
import { cambiarActivoPaciente, historialPaciente, obtenerPaciente } from "@/lib/pacientes.functions";
import { calcularEdad, formatearFecha, formatearFechaHora, nombreCompleto } from "@/types/dominio";

const SEXO_LABEL: Record<string, string> = { F: "Femenino", M: "Masculino", X: "Otro / no informado" };

export const Route = createFileRoute("/_authenticated/pacientes/$pacienteId")({
  head: () => ({
    meta: [
      { title: "Ficha de paciente · CUCAIER" },
      { name: "description", content: "Ficha, procesos e historial de un paciente del programa CUCAIER." },
      { property: "og:title", content: "Ficha de paciente · CUCAIER" },
      { property: "og:description", content: "Ficha, procesos e historial de un paciente del programa CUCAIER." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FichaPacientePage,
});

function FichaPacientePage() {
  const { pacienteId } = Route.useParams();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const pacienteQuery = useQuery({
    queryKey: ["pacientes", "ficha", pacienteId],
    queryFn: () => obtenerPaciente({ data: { id: pacienteId } }),
  });

  const historialQuery = useQuery({
    queryKey: ["pacientes", "historial", pacienteId],
    queryFn: () => historialPaciente({ data: { id: pacienteId } }),
  });

  const cambiarActivoMutacion = useMutation({
    mutationFn: (activo: boolean) => cambiarActivoPaciente({ data: { id: pacienteId, activo } }),
    onSuccess: async (_res, activo) => {
      toast.success(activo ? "Paciente reactivado correctamente." : "Paciente dado de baja correctamente.");
      await queryClient.invalidateQueries({ queryKey: ["pacientes"] });
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  if (pacienteQuery.isLoading) {
    return (
      <RequierePermiso permiso={PERMISOS.pacientesVer}>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Cargando ficha del paciente…
        </div>
      </RequierePermiso>
    );
  }

  if (!pacienteQuery.data) {
    return (
      <RequierePermiso permiso={PERMISOS.pacientesVer}>
        <p className={PANTALLA_VACIA_CLASS}>No se pudo cargar la ficha del paciente.</p>
      </RequierePermiso>
    );
  }

  const { paciente, trasplantes } = pacienteQuery.data;
  const edad = calcularEdad(paciente.fecha_nacimiento);
  const procesoActual = trasplantes[0];

  return (
    <RequierePermiso permiso={PERMISOS.pacientesVer}>
      <PageHeader
        titulo={nombreCompleto(paciente)}
        descripcion="Ficha del paciente, procesos de trasplante e historial de auditoría."
        migas={
          <Link to="/pacientes" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3" /> Volver al listado
          </Link>
        }
        acciones={
          <>
            {paciente.activo ? (
              <Badge variant="outline" className="border-success/30 bg-success/15 text-success">
                Activo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                Inactivo
              </Badge>
            )}
            {hasPermission(PERMISOS.pacientesEditar) ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/pacientes/$pacienteId/editar" params={{ pacienteId }}>
                  <Pencil className="size-4" /> Editar
                </Link>
              </Button>
            ) : null}
            {hasPermission(PERMISOS.pacientesDesactivar) ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={cambiarActivoMutacion.isPending}>
                    {paciente.activo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                    {paciente.activo ? "Dar de baja" : "Reactivar"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{paciente.activo ? "¿Dar de baja al paciente?" : "¿Reactivar al paciente?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {paciente.activo
                        ? "El paciente dejará de aparecer en las búsquedas activas. Podrá reactivarlo más adelante."
                        : "El paciente volverá a aparecer en las búsquedas activas."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cambiarActivoMutacion.mutate(!paciente.activo)}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Datos personales</h2>
          <dl className="space-y-2 text-sm">
            <CampoFicha etiqueta="DNI" valor={paciente.dni ?? "—"} mono />
            <CampoFicha
              etiqueta="Fecha de nacimiento"
              valor={paciente.fecha_nacimiento ? `${formatearFecha(paciente.fecha_nacimiento)} (${edad} años)` : "—"}
            />
            <CampoFicha etiqueta="Sexo" valor={paciente.sexo ? SEXO_LABEL[paciente.sexo] ?? paciente.sexo : "—"} />
            <CampoFicha etiqueta="Localidad" valor={paciente.localidad ?? "—"} />
            <CampoFicha etiqueta="Domicilio" valor={paciente.domicilio ?? "—"} />
            <CampoFicha etiqueta="Teléfono" valor={paciente.telefono ?? "—"} />
            <CampoFicha etiqueta="Teléfono alternativo" valor={paciente.telefono_alternativo ?? "—"} />
            <CampoFicha etiqueta="Email" valor={paciente.email ?? "—"} />
            {paciente.observaciones ? <CampoFicha etiqueta="Observaciones" valor={paciente.observaciones} /> : null}
          </dl>
        </div>

        <div className="card-surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Estado actual</h2>
          <EstadoBadge codigo={procesoActual?.estados_tx?.codigo} nombre={procesoActual?.estados_tx?.estado_tx} />

          <h3 className="mb-2 mt-6 text-sm font-semibold text-foreground">Procesos de trasplante</h3>
          {trasplantes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este paciente no tiene procesos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Fecha Tx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trasplantes.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <EstadoBadge codigo={tx.estados_tx?.codigo} nombre={tx.estados_tx?.estado_tx} />
                    </TableCell>
                    <TableCell>{tx.tipos_tx?.tipo_tx ?? "—"}</TableCell>
                    <TableCell>{tx.diagnosticos?.diagnostico ?? "—"}</TableCell>
                    <TableCell>{tx.centros_tx?.nombre ?? "—"}</TableCell>
                    <TableCell>{tx.coberturas?.descripcion ?? "—"}</TableCell>
                    <TableCell>{formatearFecha(tx.fecha_tx)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="card-surface mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Historial de auditoría</h2>
        {historialQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando historial…
          </div>
        ) : (historialQuery.data?.length ?? 0) === 0 ? (
          <p className={PANTALLA_VACIA_CLASS}>Sin eventos registrados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {historialQuery.data?.map((evento) => (
              <li key={evento.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{evento.descripcion}</span>
                  <span className="text-xs text-muted-foreground">{formatearFechaHora(evento.timestamp)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{evento.usuario ?? "Sistema"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </RequierePermiso>
  );
}

function CampoFicha({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className={mono ? "font-mono text-foreground" : "text-right text-foreground"}>{valor}</dd>
    </div>
  );
}
