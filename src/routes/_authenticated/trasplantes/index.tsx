import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { Pencil, Plus, Search } from "lucide-react";
import { PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { FiltroSelect } from "@/components/shared/FiltroSelect";
import { Paginacion } from "@/components/shared/Paginacion";
import { EstadoBadge } from "@/components/shared/EstadoBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { maestrosQueryOptions } from "@/lib/maestros.functions";
import { listarTrasplantes, type FiltrosTrasplantes } from "@/lib/trasplantes.functions";
import { formatearFecha, nombreCompleto } from "@/types/dominio";

const filtrosSearchSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  estado: z.string().uuid().optional().catch(undefined),
  tipo: z.string().uuid().optional().catch(undefined),
  centro: z.string().uuid().optional().catch(undefined),
  cobertura: z.string().uuid().optional().catch(undefined),
  via: z.string().uuid().optional().catch(undefined),
  medico: z.string().uuid().optional().catch(undefined),
  diagnostico: z.string().uuid().optional().catch(undefined),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  pagina: z.number().int().min(1).optional().catch(undefined),
});

const TAMANO_PAGINA = 20;

export const Route = createFileRoute("/_authenticated/trasplantes/")({
  validateSearch: (search) => filtrosSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Trasplantes · CUCAIER Gestión de Pacientes" },
      { name: "description", content: "Listado y filtros de procesos de trasplante del programa CUCAIER." },
      { property: "og:title", content: "Trasplantes · CUCAIER" },
      { property: "og:description", content: "Listado y filtros de procesos de trasplante del programa CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrasplantesListadoPage,
});

function TrasplantesListadoPage() {
  const filtros = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const maestrosQuery = useQuery(maestrosQueryOptions);
  const trasplantesQuery = useQuery({
    queryKey: ["trasplantes", filtros],
    queryFn: () => listarTrasplantes({ data: filtros }),
    placeholderData: keepPreviousData,
  });

  function actualizarFiltros(patch: Partial<FiltrosTrasplantes>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, pagina: undefined }) });
  }

  const filas = trasplantesQuery.data?.filas ?? [];
  const total = trasplantesQuery.data?.total ?? 0;
  const cargando = trasplantesQuery.isLoading;

  return (
    <RequierePermiso permiso={PERMISOS.trasplantesVer}>
      <PageHeader
        titulo="Procesos de trasplante"
        descripcion="Listado global de procesos de trasplante registrados, con filtros combinables."
        acciones={
          <RequierePermiso permiso={PERMISOS.trasplantesCrear} silencioso>
            <Button asChild>
              <Link to="/trasplantes/nuevo">
                <Plus /> Nuevo proceso
              </Link>
            </Button>
          </RequierePermiso>
        }
      />

      <div className="card-surface mb-4 grid grid-cols-1 gap-3 rounded-md p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente o DNI…"
            className="pl-8"
            defaultValue={filtros.q ?? ""}
            onChange={(e) => actualizarFiltros({ q: e.target.value || undefined })}
          />
        </div>
        <FiltroSelect
          placeholder="Estado"
          etiquetaTodos="Todos los estados"
          opciones={maestrosQuery.data?.estadosTx ?? []}
          value={filtros.estado}
          onChange={(v) => actualizarFiltros({ estado: v })}
        />
        <FiltroSelect
          placeholder="Tipo de trasplante"
          etiquetaTodos="Todos los tipos"
          opciones={maestrosQuery.data?.tiposTx ?? []}
          value={filtros.tipo}
          onChange={(v) => actualizarFiltros({ tipo: v })}
        />
        <FiltroSelect
          placeholder="Centro"
          etiquetaTodos="Todos los centros"
          opciones={maestrosQuery.data?.centrosTx ?? []}
          value={filtros.centro}
          onChange={(v) => actualizarFiltros({ centro: v })}
        />
        <FiltroSelect
          placeholder="Vía administrativa"
          etiquetaTodos="Todas las vías"
          opciones={maestrosQuery.data?.viasAdmin ?? []}
          value={filtros.via}
          onChange={(v) => actualizarFiltros({ via: v })}
        />
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="Desde"
            value={filtros.desde ?? ""}
            onChange={(e) => actualizarFiltros({ desde: e.target.value || undefined })}
          />
          <span className="text-sm text-muted-foreground">a</span>
          <Input
            type="date"
            aria-label="Hasta"
            value={filtros.hasta ?? ""}
            onChange={(e) => actualizarFiltros({ hasta: e.target.value || undefined })}
          />
        </div>
        <Button variant="outline" onClick={() => navigate({ search: {} })}>
          Limpiar filtros
        </Button>
      </div>

      <div className="card-surface overflow-x-auto rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Vía</TableHead>
              <TableHead>Fecha de trasplante</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No se encontraron procesos con los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              filas.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <a
                      href={`/pacientes/${tx.pacientes.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {nombreCompleto(tx.pacientes)}
                    </a>
                    {tx.pacientes.dni ? (
                      <span className="ml-1 font-mono text-xs text-muted-foreground">({tx.pacientes.dni})</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge codigo={tx.estados_tx?.codigo} nombre={tx.estados_tx?.estado_tx} />
                  </TableCell>
                  <TableCell>{tx.tipos_tx?.tipo_tx ?? "—"}</TableCell>
                  <TableCell>{tx.centros_tx?.nombre ?? "—"}</TableCell>
                  <TableCell>{tx.vias_admin?.descripcion ?? "—"}</TableCell>
                  <TableCell>{formatearFecha(tx.fecha_tx)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" title="Editar">
                      <Link to="/trasplantes/$trasplanteId/editar" params={{ trasplanteId: tx.id }}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Paginacion
          pagina={filtros.pagina ?? 1}
          total={total}
          tamanoPagina={TAMANO_PAGINA}
          onCambiarPagina={(p) => navigate({ search: (prev) => ({ ...prev, pagina: p }) })}
        />
      </div>
    </RequierePermiso>
  );
}
