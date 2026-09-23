import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { PERMISOS, ROLES_LABEL } from "@/auth";
import type { AppRole } from "@/auth/types";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rolesPermisosQueryOptions, actualizarPermisosRol } from "@/lib/roles.functions";
import { mensajeDeError } from "@/lib/errores";

export const Route = createFileRoute("/_authenticated/sistema/roles")({
  head: () => ({
    meta: [
      { title: "Roles y permisos · CUCAIER" },
      { name: "description", content: "Matriz de asignación de permisos por rol." },
      { property: "og:title", content: "Roles y permisos · CUCAIER" },
      { property: "og:description", content: "Matriz de asignación de permisos por rol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(rolesPermisosQueryOptions);
  const [pendiente, setPendiente] = useState<{ role: AppRole; permiso: string } | null>(null);

  const mutacion = useMutation({
    mutationFn: (vars: { role: AppRole; permisos: string[] }) => actualizarPermisosRol({ data: vars }),
    onSuccess: () => {
      toast.success("Permisos actualizados");
      queryClient.invalidateQueries({ queryKey: ["roles-permisos"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
    onSettled: () => setPendiente(null),
  });

  function alternar(role: AppRole, permiso: string, activo: boolean) {
    if (!data) return;
    const actuales = data.rolPermisos[role] ?? [];
    const nuevos = activo ? [...actuales, permiso] : actuales.filter((p) => p !== permiso);
    setPendiente({ role, permiso });
    mutacion.mutate({ role, permisos: nuevos });
  }

  const gruposPermisos = new Map<string, { permiso: string; descripcion: string }[]>();
  for (const p of data?.permisos ?? []) {
    const lista = gruposPermisos.get(p.grupo) ?? [];
    lista.push(p);
    gruposPermisos.set(p.grupo, lista);
  }

  return (
    <RequierePermiso permiso={PERMISOS.usuariosAdministrar}>
      <PageHeader
        titulo="Roles y permisos"
        descripcion="Matriz de permisos asignados a cada rol del sistema."
      />

      <div className="card-surface overflow-x-auto rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permiso</TableHead>
              {(data?.roles ?? []).map((r) => (
                <TableHead key={r} className="text-center">
                  {ROLES_LABEL[r]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (
              [...gruposPermisos.entries()].map(([grupo, permisos]) => (
                <React.Fragment key={`g-${grupo}`}>
                  <TableRow key={`grupo-${grupo}`} className="bg-muted/40">
                    <TableCell colSpan={(data?.roles.length ?? 0) + 1} className="text-xs font-semibold uppercase text-muted-foreground">
                      {grupo}
                    </TableCell>
                  </TableRow>
                  {permisos.map((p) => (
                    <TableRow key={p.permiso}>
                      <TableCell>
                        <div className="text-sm font-medium">{p.permiso}</div>
                        <div className="text-xs text-muted-foreground">{p.descripcion}</div>
                      </TableCell>
                      {(data?.roles ?? []).map((r) => (
                        <TableCell key={r} className="text-center">
                          <Switch
                            checked={data?.rolPermisos[r]?.includes(p.permiso) ?? false}
                            disabled={mutacion.isPending && pendiente?.role === r && pendiente?.permiso === p.permiso}
                            onCheckedChange={(v) => alternar(r, p.permiso, v)}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </RequierePermiso>
  );
}
