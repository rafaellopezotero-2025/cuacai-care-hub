import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { auditoriaQueryOptions, type FilaAuditoria } from "@/lib/auditoria.functions";
import { formatearFechaHora } from "@/types/dominio";

export const Route = createFileRoute("/_authenticated/sistema/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría · CUCAIER" },
      { name: "description", content: "Registro de auditoría de acciones del sistema." },
      { property: "og:title", content: "Auditoría · CUCAIER" },
      { property: "og:description", content: "Registro de auditoría de acciones del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuditoriaPage,
});

const ACCIONES = ["CREATE", "UPDATE", "DEACTIVATE", "REACTIVATE", "DELETE", "LOGIN", "LOGOUT", "VIEW", "EXPORT", "IMPORT"];

function AuditoriaPage() {
  const [usuario, setUsuario] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [expandido, setExpandido] = useState<number | null>(null);

  const filtros = useMemo(
    () => ({
      usuario: usuario || undefined,
      accion: accion || undefined,
      entidad: entidad || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      pagina,
    }),
    [usuario, accion, entidad, desde, hasta, pagina],
  );

  const { data, isLoading } = useQuery(auditoriaQueryOptions(filtros));
  const totalPaginas = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  function actualizarYReiniciar<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPagina(1);
    };
  }

  return (
    <RequierePermiso permiso={PERMISOS.auditoriaVer}>
      <PageHeader titulo="Auditoría" descripcion="Registro de solo lectura de acciones realizadas en el sistema." />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Usuario..."
            className="pl-8"
            value={usuario}
            onChange={(e) => actualizarYReiniciar(setUsuario)(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={accion}
          onChange={(e) => actualizarYReiniciar(setAccion)(e.target.value)}
        >
          <option value="">Todas las acciones</option>
          {ACCIONES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <Input placeholder="Entidad..." value={entidad} onChange={(e) => actualizarYReiniciar(setEntidad)(e.target.value)} />
        <Input type="date" value={desde} onChange={(e) => actualizarYReiniciar(setDesde)(e.target.value)} />
        <Input type="date" value={hasta} onChange={(e) => actualizarYReiniciar(setHasta)(e.target.value)} />
      </div>

      <div className="card-surface overflow-x-auto rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : !data || data.filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Sin eventos registrados.
                </TableCell>
              </TableRow>
            ) : (
              data.filas.map((fila: FilaAuditoria) => (
                <React.Fragment key={fila.id}>
                  <TableRow
                    key={fila.id}
                    className="cursor-pointer"
                    onClick={() => setExpandido(expandido === fila.id ? null : fila.id)}
                  >
                    <TableCell>
                      {expandido === fila.id ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </TableCell>
                    <TableCell className="text-sm">{formatearFechaHora(fila.timestamp)}</TableCell>
                    <TableCell>{fila.usuario ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{fila.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fila.entity}
                      {fila.entity_id ? <span className="text-muted-foreground"> · {fila.entity_id}</span> : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fila.ip_address ?? "—"}</TableCell>
                  </TableRow>
                  {expandido === fila.id ? (
                    <TableRow key={`${fila.id}-detalle`}>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="grid grid-cols-1 gap-3 p-2 text-xs sm:grid-cols-3">
                          <div>
                            <div className="mb-1 font-semibold text-muted-foreground">Agente</div>
                            <pre className="whitespace-pre-wrap break-all">{fila.user_agent ?? "—"}</pre>
                          </div>
                          <div>
                            <div className="mb-1 font-semibold text-muted-foreground">Valores anteriores</div>
                            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(fila.old_values ?? fila.detalle ?? {}, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="mb-1 font-semibold text-muted-foreground">Valores nuevos</div>
                            <pre className="whitespace-pre-wrap break-all">{JSON.stringify(fila.new_values ?? {}, null, 2)}</pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Página {pagina} de {totalPaginas} · {data?.total ?? 0} eventos
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </RequierePermiso>
  );
}
