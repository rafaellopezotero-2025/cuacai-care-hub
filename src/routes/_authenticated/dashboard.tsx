import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { Users, ListTree, HeartPulse, HeartCrack, Ban, AlertTriangle, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PERMISOS } from "@/auth";
import { PANTALLA_VACIA_CLASS } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { maestrosQueryOptions } from "@/lib/maestros.functions";
import { dashboardQueryOptions, type FiltrosDashboard } from "@/lib/dashboard.functions";
import { CODIGOS_ESTADO } from "@/types/dominio";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DashboardFiltros } from "@/components/dashboard/DashboardFiltros";
import { PanelGrafico } from "@/components/dashboard/PanelGrafico";
import { GraficoDonut, type ItemDonut } from "@/components/dashboard/GraficoDonut";
import { GraficoBarras, type ItemBarra } from "@/components/dashboard/GraficoBarras";
import { GraficoEvolucion, type PuntoEvolucion } from "@/components/dashboard/GraficoEvolucion";

const filtrosSearchSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  estado: z.string().uuid().optional().catch(undefined),
  tipo: z.string().uuid().optional().catch(undefined),
  cobertura: z.string().uuid().optional().catch(undefined),
  centro: z.string().uuid().optional().catch(undefined),
  localidad: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search) => filtrosSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Dashboard · CUCAIER Gestión de Pacientes" },
      { name: "description", content: "Resumen de pacientes y trasplantes del CUCAIER." },
      { property: "og:title", content: "Dashboard · CUCAIER" },
      { property: "og:description", content: "Resumen de pacientes y trasplantes del CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const COLOR_ESTADO: Record<string, string> = {
  [CODIGOS_ESTADO.LISTA_ESPERA]: "var(--chart-2)",
  [CODIGOS_ESTADO.TRASPLANTADO]: "var(--chart-4)",
  [CODIGOS_ESTADO.REVISAR]: "var(--chart-3)",
  [CODIGOS_ESTADO.EXCLUIDO]: "var(--chart-7)",
  [CODIGOS_ESTADO.FALLECIDO]: "var(--chart-6)",
};

const COLORES_CICLICOS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function etiquetaMes(mes: string): string {
  const [anio, m] = mes.split("-");
  const idx = Number(m) - 1;
  return `${MESES_CORTOS[idx] ?? m} ${anio.slice(2)}`;
}

function completarMeses(evolucion: { mes: string; valor: number }[]): PuntoEvolucion[] {
  if (evolucion.length === 0) return [];
  const ordenado = [...evolucion].sort((a, b) => a.mes.localeCompare(b.mes));
  const mapa = new Map(ordenado.map((e) => [e.mes, e.valor]));
  const [anioMin, mesMin] = ordenado[0].mes.split("-").map(Number);
  const [anioMax, mesMax] = ordenado[ordenado.length - 1].mes.split("-").map(Number);
  const resultado: PuntoEvolucion[] = [];
  let anio = anioMin;
  let mes = mesMin;
  while (anio < anioMax || (anio === anioMax && mes <= mesMax)) {
    const clave = `${anio}-${String(mes).padStart(2, "0")}`;
    resultado.push({ mes: clave, etiqueta: etiquetaMes(clave), valor: mapa.get(clave) ?? 0 });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return resultado;
}

function DashboardPage() {
  const filtros = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const maestrosQuery = useQuery(maestrosQueryOptions);
  const dashboardQuery = useQuery({ ...dashboardQueryOptions(filtros), placeholderData: keepPreviousData });

  function actualizarFiltros(patch: Partial<FiltrosDashboard>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function alternarFiltro(clave: keyof FiltrosDashboard, valor: string) {
    actualizarFiltros({ [clave]: filtros[clave] === valor ? undefined : valor } as Partial<FiltrosDashboard>);
  }

  function limpiarFiltros() {
    navigate({ search: {} });
  }

  function idEstadoPorCodigo(codigo: string): string | undefined {
    return maestrosQuery.data?.estadosTx.find((e) => e.codigo === codigo)?.id;
  }

  function verPacientesSearch(extra?: Record<string, unknown>) {
    return {
      estado: filtros.estado,
      tipo: filtros.tipo,
      cobertura: filtros.cobertura,
      centro: filtros.centro,
      localidad: filtros.localidad,
      desde: filtros.desde,
      hasta: filtros.hasta,
      ...extra,
    };
  }

  const datos = dashboardQuery.data;
  const cargando = dashboardQuery.isLoading;

  const porEstado: ItemDonut[] = (datos?.por_estado ?? []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    valor: e.valor,
    color: COLOR_ESTADO[e.codigo] ?? "var(--chart-1)",
  }));

  const porTipo: ItemBarra[] = (datos?.por_tipo ?? []).map((t, i) => ({
    id: t.id,
    nombre: t.nombre,
    valor: t.valor,
    color: COLORES_CICLICOS[i % COLORES_CICLICOS.length],
  }));

  const porCobertura: ItemDonut[] = (datos?.por_cobertura ?? []).map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    valor: c.valor,
    color: COLORES_CICLICOS[i % COLORES_CICLICOS.length],
  }));

  const porVia: ItemBarra[] = (datos?.por_via ?? []).map((v, i) => ({
    id: v.id,
    nombre: v.nombre,
    valor: v.valor,
    color: COLORES_CICLICOS[i % COLORES_CICLICOS.length],
  }));

  const porCentro: ItemBarra[] = (datos?.por_centro ?? []).map((c, i) => ({
    id: c.id,
    nombre: c.nombre,
    valor: c.valor,
    color: COLORES_CICLICOS[i % COLORES_CICLICOS.length],
  }));

  const localidadesOrdenadas = [...(datos?.por_localidad ?? [])].sort((a, b) => b.valor - a.valor);
  const top10 = localidadesOrdenadas.slice(0, 10);
  const otras = localidadesOrdenadas.slice(10).reduce((acc, l) => acc + l.valor, 0);
  const porLocalidad: ItemBarra[] = [
    ...top10.map((l, i) => ({ id: l.nombre, nombre: l.nombre, valor: l.valor, color: COLORES_CICLICOS[i % COLORES_CICLICOS.length] })),
    ...(otras > 0 ? [{ id: "__otras__", nombre: "Otras", valor: otras, color: "var(--muted-foreground)" }] : []),
  ];

  const evolucion = completarMeses(datos?.evolucion ?? []);

  const kpis = [
    {
      titulo: "Total de pacientes",
      valor: datos?.kpis.total_pacientes ?? 0,
      icono: <Users className="size-4" />,
      onClick: () => navigate({ to: "/pacientes", search: {} as never }),
    },
    {
      titulo: "Lista de espera",
      valor: datos?.kpis.por_estado[CODIGOS_ESTADO.LISTA_ESPERA] ?? 0,
      icono: <ListTree className="size-4" />,
      codigo: CODIGOS_ESTADO.LISTA_ESPERA,
    },
    {
      titulo: "Trasplantados",
      valor: datos?.kpis.por_estado[CODIGOS_ESTADO.TRASPLANTADO] ?? 0,
      icono: <HeartPulse className="size-4" />,
      codigo: CODIGOS_ESTADO.TRASPLANTADO,
    },
    {
      titulo: "Fallecidos",
      valor: datos?.kpis.por_estado[CODIGOS_ESTADO.FALLECIDO] ?? 0,
      icono: <HeartCrack className="size-4" />,
      codigo: CODIGOS_ESTADO.FALLECIDO,
    },
    {
      titulo: "Excluidos",
      valor: datos?.kpis.por_estado[CODIGOS_ESTADO.EXCLUIDO] ?? 0,
      icono: <Ban className="size-4" />,
      codigo: CODIGOS_ESTADO.EXCLUIDO,
    },
    {
      titulo: "A revisar",
      valor: datos?.kpis.por_estado[CODIGOS_ESTADO.REVISAR] ?? 0,
      icono: <AlertTriangle className="size-4" />,
      codigo: CODIGOS_ESTADO.REVISAR,
    },
    {
      titulo: "Trasplantes registrados",
      valor: datos?.kpis.total_trasplantes ?? 0,
      icono: <Stethoscope className="size-4" />,
      onClick: () => navigate({ to: "/trasplantes", search: {} as never }),
    },
  ];

  const sinDatos =
    !cargando &&
    datos &&
    porEstado.length === 0 &&
    porTipo.length === 0 &&
    porCobertura.length === 0 &&
    evolucion.length === 0;

  return (
    <RequierePermiso permiso={PERMISOS.dashboardVer}>
      <PageHeader
        titulo="Resumen de pacientes y trasplantes"
        descripcion="Indicadores agregados del programa. No se muestran datos identificatorios de pacientes."
      />

      <DashboardFiltros
        filtros={filtros}
        maestros={maestrosQuery.data}
        onChange={actualizarFiltros}
        onLimpiar={limpiarFiltros}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {cargando
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : kpis.map((kpi) => (
              <KpiCard
                key={kpi.titulo}
                titulo={kpi.titulo}
                valor={kpi.valor}
                icono={kpi.icono}
                activo={"codigo" in kpi ? filtros.estado === idEstadoPorCodigo(kpi.codigo as string) : false}
                onClick={
                  kpi.onClick
                    ? kpi.onClick
                    : "codigo" in kpi
                      ? () => {
                          const id = idEstadoPorCodigo(kpi.codigo as string);
                          if (id) alternarFiltro("estado", id);
                        }
                      : undefined
                }
              />
            ))}
      </div>

      {sinDatos ? (
        <div className="card-surface rounded-xl p-10 text-center text-sm text-muted-foreground">
          No hay datos para los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PanelGrafico
            titulo="Pacientes por estado"
            descripcion="Distribución del estado actual del proceso de trasplante."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="mx-auto aspect-square max-h-[260px]" />
            ) : porEstado.length ? (
              <GraficoDonut
                data={porEstado}
                activoId={filtros.estado}
                onSliceClick={(item) => alternarFiltro("estado", item.id)}
                ariaLabel="Pacientes por estado"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Trasplantes por tipo"
            descripcion="Cantidad de trasplantes según tipo."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="h-[220px]" />
            ) : porTipo.length ? (
              <GraficoBarras
                data={porTipo}
                activoId={filtros.tipo}
                onBarClick={(item) => alternarFiltro("tipo", item.id)}
                ariaLabel="Trasplantes por tipo"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Pacientes por cobertura"
            descripcion="Distribución por tipo de cobertura de salud."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="mx-auto aspect-square max-h-[260px]" />
            ) : porCobertura.length ? (
              <GraficoDonut
                data={porCobertura}
                activoId={filtros.cobertura}
                onSliceClick={(item) => alternarFiltro("cobertura", item.id)}
                ariaLabel="Pacientes por cobertura"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Pacientes por vía administrativa"
            descripcion="Distribución informativa; no filtra el dashboard."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="h-[220px]" />
            ) : porVia.length ? (
              <GraficoBarras
                data={porVia}
                onBarClick={(item) => navigate({ to: "/pacientes", search: verPacientesSearch({ via: item.id }) })}
                ariaLabel="Pacientes por vía administrativa"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Trasplantes por centro"
            descripcion="Cantidad de trasplantes por centro asistencial."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="h-[220px]" />
            ) : porCentro.length ? (
              <GraficoBarras
                data={porCentro}
                activoId={filtros.centro}
                onBarClick={(item) => alternarFiltro("centro", item.id)}
                ariaLabel="Trasplantes por centro"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Pacientes por localidad"
            descripcion="Top 10 localidades con más pacientes registrados."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
          >
            {cargando ? (
              <Skeleton className="h-[280px]" />
            ) : porLocalidad.length ? (
              <GraficoBarras
                data={porLocalidad}
                activoId={filtros.localidad}
                onBarClick={(item) => {
                  if (item.id === "__otras__") return;
                  alternarFiltro("localidad", item.nombre);
                }}
                ariaLabel="Pacientes por localidad"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>

          <PanelGrafico
            titulo="Evolución temporal de trasplantes"
            descripcion="Cantidad de trasplantes registrados por mes."
            verPacientesTo={{ to: "/pacientes", search: verPacientesSearch() }}
            className="lg:col-span-2"
          >
            {cargando ? (
              <Skeleton className="h-[260px]" />
            ) : evolucion.length ? (
              <GraficoEvolucion
                data={evolucion}
                onPointClick={(item) => {
                  const [anio, mes] = item.mes.split("-").map(Number);
                  const desde = `${item.mes}-01`;
                  const ultimoDia = new Date(anio, mes, 0).getDate();
                  const hasta = `${item.mes}-${String(ultimoDia).padStart(2, "0")}`;
                  navigate({ to: "/pacientes", search: verPacientesSearch({ desde, hasta }) });
                }}
                ariaLabel="Evolución temporal de trasplantes"
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin datos.</p>
            )}
          </PanelGrafico>
        </div>
      )}
    </RequierePermiso>
  );
}
