import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import { PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ErrorFila,
  type ResultadoParseo,
  parsearPlanilla,
} from "@/lib/importar-parser";
import {
  confirmarImportacion,
  validarImportacion,
  type FilaPacienteValidada,
  type FilaTrasplanteValidada,
  type ResultadoImportacion,
  type ResultadoValidacion,
} from "@/lib/importar.functions";
import { mensajeDeError } from "@/lib/errores";

export const Route = createFileRoute("/_authenticated/sistema/importar")({
  head: () => {
    const titulo = "Importar planilla · CUCAIER";
    const descripcion = "Importación masiva de pacientes y trasplantes desde una planilla Excel/CSV, con validación previa y reporte de filas rechazadas.";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descripcion },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: ImportarPage,
});

type Paso = "seleccion" | "previsualizacion" | "resultado";

interface FilaRechazada {
  hoja: string;
  fila: number;
  motivo: string;
}

function filaRechazadaDesdeErrorParseo(e: ErrorFila): FilaRechazada {
  return { hoja: e.hoja, fila: e.fila, motivo: e.columna ? `[${e.columna}] ${e.mensaje}` : e.mensaje };
}

function csvEscapar(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function descargarCsvRechazos(filas: FilaRechazada[]) {
  const encabezado = ["hoja", "fila", "motivo"];
  const lineas = [
    encabezado.join(","),
    ...filas.map((f) => [f.hoja, String(f.fila), csvEscapar(f.motivo)].join(",")),
  ];
  const contenido = "\uFEFF" + lineas.join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `rechazos-importacion-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function ImportarPage() {
  const [paso, setPaso] = useState<Paso>("seleccion");
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [parseo, setParseo] = useState<ResultadoParseo | null>(null);
  const [validacion, setValidacion] = useState<ResultadoValidacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [parseando, setParseando] = useState(false);

  const mutacionValidar = useMutation({
    mutationFn: (input: { pacientes: ResultadoParseo["pacientes"]; trasplantes: ResultadoParseo["trasplantes"] }) =>
      validarImportacion({ data: input }),
    onSuccess: (data) => {
      setValidacion(data);
      setPaso("previsualizacion");
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  const mutacionConfirmar = useMutation({
    mutationFn: (input: {
      pacientes: { clave: string; nombres: string; apellidos: string; dni: string; fechaNacimiento: string | null; sexo: string | null; localidad: string | null; telefono: string | null; telefonoAlternativo: string | null; email: string | null; domicilio: string | null; observaciones: string | null }[];
      trasplantes: { pacienteClave: string; diagnostico: string | null; tipoTx: string | null; estadoTx: string | null; viaAdmin: string | null; cobertura: string | null; centroTx: string | null; medico: string | null; fechaTx: string | null; observaciones: string | null }[];
    }) => confirmarImportacion({ data: input }),
    onSuccess: (data) => {
      setResultado(data);
      setPaso("resultado");
      toast.success("Importación completada.");
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  async function manejarSeleccionArchivo(archivo: File) {
    setNombreArchivo(archivo.name);
    setParseando(true);
    try {
      const res = await parsearPlanilla(archivo);
      setParseo(res);
      if (res.pacientes.length === 0 && res.trasplantes.length === 0) {
        toast.error("No se encontraron filas para importar. Verifique el archivo.");
        return;
      }
      mutacionValidar.mutate({ pacientes: res.pacientes, trasplantes: res.trasplantes });
    } catch (err) {
      toast.error("No se pudo leer el archivo. Verifique que sea un Excel (.xlsx) o CSV válido.");
    } finally {
      setParseando(false);
    }
  }

  const filasRechazadas = useMemo<FilaRechazada[]>(() => {
    const rechazos: FilaRechazada[] = [];
    if (parseo) {
      for (const e of parseo.errores) rechazos.push(filaRechazadaDesdeErrorParseo(e));
    }
    if (validacion) {
      for (const p of validacion.pacientes) {
        if (p.estado === "error") {
          rechazos.push({ hoja: "Pacientes", fila: p.fila, motivo: p.mensajes.join(" ") });
        }
      }
      for (const t of validacion.trasplantes) {
        if (t.estado === "error") {
          rechazos.push({ hoja: "Trasplantes", fila: t.fila, motivo: t.mensajes.join(" ") });
        }
      }
    }
    return rechazos.sort((a, b) => a.fila - b.fila);
  }, [parseo, validacion]);

  const pacientesAceptados = useMemo(
    () => (validacion?.pacientes ?? []).filter((p) => p.estado !== "error"),
    [validacion],
  );
  const trasplantesAceptados = useMemo(
    () => (validacion?.trasplantes ?? []).filter((t) => t.estado === "valido"),
    [validacion],
  );

  function reiniciar() {
    setPaso("seleccion");
    setNombreArchivo(null);
    setParseo(null);
    setValidacion(null);
    setResultado(null);
  }

  function confirmar() {
    if (!validacion) return;
    mutacionConfirmar.mutate({
      pacientes: pacientesAceptados.map((p) => ({
        clave: p.clave,
        nombres: p.nombres,
        apellidos: p.apellidos,
        dni: p.dni,
        fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        localidad: p.localidad,
        telefono: p.telefono,
        telefonoAlternativo: p.telefonoAlternativo,
        email: p.email,
        domicilio: p.domicilio,
        observaciones: p.observaciones,
      })),
      trasplantes: trasplantesAceptados.map((t) => ({
        pacienteClave: t.pacienteClave,
        diagnostico: t.diagnostico,
        tipoTx: t.tipoTx,
        estadoTx: t.estadoTx,
        viaAdmin: t.viaAdmin,
        cobertura: t.cobertura,
        centroTx: t.centroTx,
        medico: t.medico,
        fechaTx: t.fechaTx,
        observaciones: t.observaciones,
      })),
    });
  }

  const validando = mutacionValidar.isPending || parseando;

  return (
    <RequierePermiso permiso={PERMISOS.importarEjecutar}>
      <PageHeader
        titulo="Importar planilla"
        descripcion="Cargue una planilla Excel (.xlsx) o CSV con hojas 'Pacientes' y/o 'Trasplantes' para importarlas de forma masiva."
      />

      {paso === "seleccion" && (
        <div className="card-surface flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-12 text-center">
          <UploadCloud className="size-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Seleccione un archivo Excel o CSV</p>
            <p className="mt-1 text-xs text-muted-foreground">
              El archivo debe contener una hoja llamada "Pacientes", una llamada "Trasplantes", o ambas.
            </p>
          </div>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={validando}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void manejarSeleccionArchivo(archivo);
                e.target.value = "";
              }}
            />
            <Button asChild disabled={validando}>
              <span>
                {validando ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 size-4" />
                )}
                {validando ? "Procesando..." : "Elegir archivo"}
              </span>
            </Button>
          </label>
          {nombreArchivo && !validando && <p className="text-xs text-muted-foreground">Último archivo: {nombreArchivo}</p>}
          {parseo && parseo.columnasFaltantes.length > 0 && (
            <Alert variant="destructive" className="mt-2 max-w-lg text-left">
              <AlertTriangle className="size-4" />
              <AlertTitle>No se encontraron hojas esperadas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {parseo.columnasFaltantes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {paso === "previsualizacion" && validacion && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Filas aceptadas</p>
              <p className="mt-1 text-2xl font-semibold text-success">
                {pacientesAceptados.length + trasplantesAceptados.length}
              </p>
            </div>
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Filas rechazadas</p>
              <p className="mt-1 text-2xl font-semibold text-destructive">{filasRechazadas.length}</p>
            </div>
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Duplicados en el archivo</p>
              <p className="mt-1 text-2xl font-semibold text-warm">{validacion.resumen.duplicados}</p>
            </div>
          </div>

          <Tabs defaultValue="aceptadas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="aceptadas">Aceptadas ({pacientesAceptados.length + trasplantesAceptados.length})</TabsTrigger>
                <TabsTrigger value="rechazadas">Rechazadas ({filasRechazadas.length})</TabsTrigger>
              </TabsList>
              {filasRechazadas.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => descargarCsvRechazos(filasRechazadas)}>
                  <Download className="mr-2 size-4" />
                  Descargar reporte de rechazos (CSV)
                </Button>
              )}
            </div>

            <TabsContent value="aceptadas" className="mt-4">
              <TablaAceptadas pacientes={pacientesAceptados} trasplantes={trasplantesAceptados} />
            </TabsContent>
            <TabsContent value="rechazadas" className="mt-4">
              <TablaRechazadas filas={filasRechazadas} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={reiniciar} disabled={mutacionConfirmar.isPending}>
              <RotateCcw className="mr-2 size-4" />
              Cancelar y elegir otro archivo
            </Button>
            <Button
              onClick={confirmar}
              disabled={mutacionConfirmar.isPending || pacientesAceptados.length + trasplantesAceptados.length === 0}
            >
              {mutacionConfirmar.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 size-4" />
              )}
              Confirmar importación
            </Button>
          </div>
        </div>
      )}

      {paso === "resultado" && resultado && (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="rounded-full bg-success/10 p-4 text-success">
            <CheckCircle2 className="size-10" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Importación completada</h2>
            <p className="mt-1 text-sm text-muted-foreground">Se procesó el archivo correctamente.</p>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-4">
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Pacientes insertados</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{resultado.pacientesCreados}</p>
            </div>
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Pacientes actualizados/reutilizados</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{resultado.pacientesExistentes}</p>
            </div>
            <div className="card-surface rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Trasplantes insertados</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{resultado.trasplantesCreados}</p>
            </div>
          </div>
          {filasRechazadas.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => descargarCsvRechazos(filasRechazadas)}>
              <Download className="mr-2 size-4" />
              Descargar reporte de filas omitidas ({filasRechazadas.length})
            </Button>
          )}
          <Button onClick={reiniciar}>
            <RotateCcw className="mr-2 size-4" />
            Importar otra planilla
          </Button>
        </div>
      )}
    </RequierePermiso>
  );
}

function TablaAceptadas({
  pacientes,
  trasplantes,
}: {
  pacientes: FilaPacienteValidada[];
  trasplantes: FilaTrasplanteValidada[];
}) {
  if (pacientes.length === 0 && trasplantes.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay filas aceptadas.</p>;
  }
  return (
    <div className="card-surface overflow-x-auto rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hoja</TableHead>
            <TableHead>Fila</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pacientes.map((p) => (
            <TableRow key={`p-${p.fila}`}>
              <TableCell>Pacientes</TableCell>
              <TableCell>{p.fila}</TableCell>
              <TableCell>
                {p.apellidos}, {p.nombres} — DNI {p.dni}
                {p.mensajes.length > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.mensajes.join(" ")}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={p.estado === "existente" ? "secondary" : "outline"}>
                  {p.estado === "existente" ? "Existente" : "Nuevo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {trasplantes.map((t) => (
            <TableRow key={`t-${t.fila}`}>
              <TableCell>Trasplantes</TableCell>
              <TableCell>{t.fila}</TableCell>
              <TableCell>
                Paciente {t.pacienteClave} — {t.estadoTx ?? "sin estado"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">Válido</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TablaRechazadas({ filas }: { filas: FilaRechazada[] }) {
  if (filas.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No hay filas rechazadas.</p>;
  }
  return (
    <div className="card-surface overflow-x-auto rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hoja</TableHead>
            <TableHead>Fila</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f, i) => (
            <TableRow key={`${f.hoja}-${f.fila}-${i}`}>
              <TableCell>{f.hoja}</TableCell>
              <TableCell>{f.fila}</TableCell>
              <TableCell className="text-destructive">{f.motivo}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
