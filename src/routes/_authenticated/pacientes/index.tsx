import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Download, X, ArrowUpDown, Eye, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { EstadoBadge } from "@/components/shared/EstadoBadge";
import { Paginacion } from "@/components/shared/Paginacion";
import { FiltroSelect } from "@/components/shared/FiltroSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, PERMISOS } from "@/auth";
import { PANTALLA_VACIA_CLASS } from "@/lib/utils";
import { mensajeDeError } from "@/lib/errores";
import { maestrosQueryOptions } from "@/lib/maestros.functions";
import { buscarPacientes, type FilaBusquedaPaciente } from "@/lib/pacientes.functions";
import { exportarPacientes } from "@/lib/exportar.functions";
import { calcularEdad, formatearFecha, nombreCompleto } from "@/types/dominio";

const TAMANO_PAGINA = 20;

const busquedaSearchSchema = z.object({
  q: z.string().trim().max(200).optional().catch(undefined),
  estado: z.string().uuid().optional().catch(undefined),
  tipo: z.string().uuid().optional().catch(undefined),
  cobertura: z.string().uuid().optional().catch(undefined),
  centro: z.string().uuid().optional().catch(undefined),
  localidad: z.string().trim().max(200).optional().catch(undefined),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  pagina: z.number().int().min(1).optional().catch(undefined),
  orden: z.enum(["apellidos", "dni", "localidad", "estado", "fecha_tx"]).optional().catch(undefined),
  dir: z.enum(["asc", "desc"]).optional().catch(undefined),
  activo: z.boolean().optional().catch(undefined),
});

type BusquedaSearch = z.infer<typeof busquedaSearchSchema>;

export const Route = createFileRoute("/_authenticated/pacientes/")({
  validateSearch: (search) => busquedaSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Pacientes · CUCAIER" },
      { name: "description", content: "Listado y búsqueda de pacientes del programa CUCAIER." },
      { property: "og:title", content: "Pacientes · CUCAIER" },
      { property: "og:description", content: "Listado y búsqueda de pacientes del programa CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PacientesPage,
});

function construirFiltrosRpc(search: BusquedaSearch) {
  return {
    q: search.q,
    estado: search.estado,
    tipo: search.tipo,
    cobertura: search.cobertura,
    centro: search.centro,
    localidad: search.localidad,
    desde: search.desde,
    hasta: search.hasta,
    orden: search.orden,
    dir: search.dir,
    pagina: search.pagina ?? 1,
    incluirInactivos: search.activo === undefined || search.activo === false,
  };
}

function PacientesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { hasPermission } = useAuth();
  const [textoQ, setTextoQ] = useState(search.q ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maestrosQuery = useQuery(maestrosQueryOptions);
  const filtrosRpc = construirFiltrosRpc(search);
  const pacientesQuery = useQuery({
    queryKey: ["pacientes", "buscar", filtrosRpc],
    queryFn: () => buscarPacientes({ data: filtrosRpc }),
    placeholderData: keepPreviousData,
  });

  const exportarMutation = useMutation({
    mutationFn: (formato: "csv" | "xlsx") =>
      exportarPacientes({
        data: {
          q: search.q,
          estado: search.estado,
          tipo: search.tipo,
          cobertura: search.cobertura,
          centro: search.centro,
          localidad: search.localidad,
          desde: search.desde,
          hasta: search.hasta,
          incluirInactivos: search.activo === undefined || search.activo === false,
          formato,
        },
      }),
    onSuccess: async (filas, formato) => {
      await descargarExportacion(filas, formato);
      toast.success(`Exportación generada (${filas.length} registros).`);
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  function actualizarBusqueda(patch: Partial<BusquedaSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch, pagina: patch.pagina ?? 1 }) });
  }

  function onCambiarTexto(valor: string) {
    setTextoQ(valor);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      actualizarBusqueda({ q: valor.trim() ? valor : undefined });
    }, 400);
  }

  function alternarOrden(campo: NonNullable<BusquedaSearch["orden"]>) {
    if (search.orden === campo) {
      actualizarBusqueda({ dir: search.dir === "asc" ? "desc" : "asc" });
    } else {
      actualizarBusqueda({ orden: campo, dir: "asc" });
    }
  }

  function limpiarFiltros() {
    setTextoQ("");
    navigate({ search: {} });
  }

  const hayFiltros =
    !!search.q ||
    !!search.estado ||
    !!search.tipo ||
    !!search.cobertura ||
    !!search.centro ||
    !!search.localidad ||
    !!search.desde ||
    !!search.hasta ||
    search.activo !== undefined;

  const maestros = maestrosQuery.data;
  const datos = pacientesQuery.data;
  const cargando = pacientesQuery.isLoading;

  return (
    <RequierePermiso permiso={PERMISOS.pacientesVer}>
      <PageHeader
        titulo="Pacientes"
        descripcion="Búsqueda y administración de pacientes del programa."
        acciones={
          <>
            {hasPermission(PERMISOS.exportarEjecutar) ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportarMutation.isPending}
                  onClick={() => exportarMutation.mutate("csv")}
                >
                  <Download className="size-4" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportarMutation.isPending}
                  onClick={() => exportarMutation.mutate("xlsx")}
                >
                  <Download className="size-4" /> Excel
                </Button>
              </>
            ) : null}
            {hasPermission(PERMISOS.pacientesCrear) ? (
              <Button asChild size="sm">
                <Link to="/pacientes/nuevo">
                  <Plus className="size-4" /> Nuevo paciente
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="card-surface mb-4 space-y-3 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={textoQ}
            onChange={(e) => onCambiarTexto(e.target.value)}
            placeholder="Buscar por apellido, nombre o DNI…"
            className="pl-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <FiltroSelect
            placeholder="Estado"
            opciones={(maestros?.estadosTx ?? []).map((e) => ({ id: e.id, nombre: e.nombre }))}
            value={search.estado}
            onChange={(v) => actualizarBusqueda({ estado: v })}
          />
          <FiltroSelect
            placeholder="Tipo"
            opciones={maestros?.tiposTx ?? []}
            value={search.tipo}
            onChange={(v) => actualizarBusqueda({ tipo: v })}
          />
          <FiltroSelect
            placeholder="Cobertura"
            opciones={maestros?.coberturas ?? []}
            value={search.cobertura}
            onChange={(v) => actualizarBusqueda({ cobertura: v })}
          />
          <FiltroSelect
            placeholder="Centro"
            opciones={maestros?.centrosTx ?? []}
            value={search.centro}
            onChange={(v) => actualizarBusqueda({ centro: v })}
          />
          <div>
            <Input
              value={search.localidad ?? ""}
              onChange={(e) => actualizarBusqueda({ localidad: e.target.value || undefined })}
              placeholder="Localidad"
              list="localidades-filtro"
            />
            <datalist id="localidades-filtro">
              {(maestros?.localidades ?? []).map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </div>
          <Select
            value={search.activo === undefined ? "todos" : search.activo ? "activos" : "inactivos"}
            onValueChange={(v) =>
              actualizarBusqueda({ activo: v === "todos" ? undefined : v === "activos" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado del registro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input
            type="date"
            className="w-auto"
            value={search.desde ?? ""}
            onChange={(e) => actualizarBusqueda({ desde: e.target.value || undefined })}
          />
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input
            type="date"
            className="w-auto"
            value={search.hasta ?? ""}
            onChange={(e) => actualizarBusqueda({ hasta: e.target.value || undefined })}
          />
          {hayFiltros ? (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
              <X className="size-4" /> Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <div className="card-surface overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TablaEncabezadoOrdenable campo="apellidos" actual={search.orden} dir={search.dir} onClick={alternarOrden}>
                Paciente
              </TablaEncabezadoOrdenable>
              <TablaEncabezadoOrdenable campo="dni" actual={search.orden} dir={search.dir} onClick={alternarOrden}>
                DNI
              </TablaEncabezadoOrdenable>
              <TablaEncabezadoOrdenable campo="localidad" actual={search.orden} dir={search.dir} onClick={alternarOrden}>
                Localidad
              </TablaEncabezadoOrdenable>
              <TableHead>Edad</TableHead>
              <TablaEncabezadoOrdenable campo="estado" actual={search.orden} dir={search.dir} onClick={alternarOrden}>
                Estado
              </TablaEncabezadoOrdenable>
              <TableHead>Tipo</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (datos?.filas.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={PANTALLA_VACIA_CLASS}>
                  No se encontraron pacientes con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              datos?.filas.map((fila) => <FilaPaciente key={fila.id} fila={fila} />)
            )}
          </TableBody>
        </Table>
        <div className="p-3">
          <Paginacion
            pagina={search.pagina ?? 1}
            total={datos?.total ?? 0}
            tamanoPagina={TAMANO_PAGINA}
            onCambiarPagina={(pagina) => actualizarBusqueda({ pagina })}
          />
        </div>
      </div>
    </RequierePermiso>
  );
}

function TablaEncabezadoOrdenable({
  campo,
  actual,
  dir,
  onClick,
  children,
}: {
  campo: "apellidos" | "dni" | "localidad" | "estado" | "fecha_tx";
  actual?: string | undefined;
  dir?: string | undefined;
  onClick: (campo: "apellidos" | "dni" | "localidad" | "estado" | "fecha_tx") => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => onClick(campo)}
      >
        {children}
        {actual === campo ? (
          <ArrowUpDown className={dir === "desc" ? "size-3 rotate-180" : "size-3"} />
        ) : null}
      </button>
    </TableHead>
  );
}

function FilaPaciente({ fila }: { fila: FilaBusquedaPaciente }) {
  const edad = calcularEdad(fila.fecha_nacimiento);
  return (
    <TableRow>
      <TableCell className="font-medium">{nombreCompleto(fila)}</TableCell>
      <TableCell className="font-mono text-sm">{fila.dni ?? "—"}</TableCell>
      <TableCell>{fila.localidad ?? "—"}</TableCell>
      <TableCell>{edad !== null ? `${edad} años` : "—"}</TableCell>
      <TableCell>
        <EstadoBadge codigo={fila.estado_codigo} nombre={fila.estado_tx} />
      </TableCell>
      <TableCell>{fila.tipo_tx ?? "—"}</TableCell>
      <TableCell>{fila.centro_tx ?? "—"}</TableCell>
      <TableCell>
        {fila.activo ? (
          <Badge variant="outline" className="border-success/30 bg-success/15 text-success">
            Activo
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
            Inactivo
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link to="/pacientes/$pacienteId" params={{ pacienteId: fila.id }} aria-label="Ver ficha">
              <Eye className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link to="/pacientes/$pacienteId/editar" params={{ pacienteId: fila.id }} aria-label="Editar">
              <Pencil className="size-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

async function descargarExportacion(
  filas: Awaited<ReturnType<typeof exportarPacientes>>,
  formato: "csv" | "xlsx",
) {
  const XLSX = await import("xlsx");
  const datos = filas.map((f) => ({
    Apellidos: f.apellidos,
    Nombres: f.nombres,
    DNI: f.dni ?? "",
    Localidad: f.localidad ?? "",
    Teléfono: f.telefono ?? "",
    "Fecha de nacimiento": formatearFecha(f.fecha_nacimiento),
    Activo: f.activo ? "Sí" : "No",
    Estado: f.estado_tx ?? "",
    Tipo: f.tipo_tx ?? "",
    Centro: f.centro_tx ?? "",
    "Fecha de trasplante": formatearFecha(f.fecha_tx),
  }));
  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pacientes");
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  if (formato === "csv") {
    XLSX.writeFile(libro, `pacientes-${fechaArchivo}.csv`, { bookType: "csv" });
  } else {
    XLSX.writeFile(libro, `pacientes-${fechaArchivo}.xlsx`, { bookType: "xlsx" });
  }
}
