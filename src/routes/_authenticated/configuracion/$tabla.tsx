import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Search } from "lucide-react";
import { useAuth, PERMISOS } from "@/auth";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { esMaestroSlug, MAESTROS_CONFIG, type CampoMaestro, type FilaMaestro, type MaestroSlug } from "@/lib/maestros-config";
import { cambiarActivoMaestro, guardarMaestro, listarMaestro } from "@/lib/maestros-admin.functions";
import { mensajeDeError } from "@/lib/errores";
import { formatearFechaHora } from "@/types/dominio";

export const Route = createFileRoute("/_authenticated/configuracion/$tabla")({
  beforeLoad: ({ params }) => {
    if (!esMaestroSlug(params.tabla)) throw notFound();
  },
  head: ({ params }) => {
    const cfg = esMaestroSlug(params.tabla) ? MAESTROS_CONFIG[params.tabla] : null;
    const titulo = cfg ? `${cfg.titulo} · CUCAIER` : "Tabla maestra · CUCAIER";
    const descripcion = cfg?.descripcion ?? "Administración de tablas maestras.";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descripcion },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descripcion },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ConfiguracionTablaPage,
});

function construirEsquemaCliente(campos: CampoMaestro[]) {
  const forma: Record<string, z.ZodTypeAny> = {};
  for (const campo of campos) {
    switch (campo.tipo) {
      case "text": {
        const base = z.string().trim().max(300);
        forma[campo.nombre] = campo.requerido ? base.min(1, `${campo.etiqueta} es obligatorio`) : base.optional();
        break;
      }
      case "email": {
        const base = z.string().trim().max(200);
        forma[campo.nombre] = campo.requerido
          ? base.email("Email inválido")
          : base.refine((v) => !v || z.string().email().safeParse(v).success, "Email inválido").optional();
        break;
      }
      case "number":
        forma[campo.nombre] = campo.requerido ? z.coerce.number() : z.coerce.number().optional();
        break;
      case "boolean":
        forma[campo.nombre] = z.boolean().optional();
        break;
    }
  }
  return z.object(forma);
}

function ConfiguracionTablaPage() {
  const { tabla } = Route.useParams();
  const slug = tabla as MaestroSlug;
  const cfg = MAESTROS_CONFIG[slug];
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [registroEditar, setRegistroEditar] = useState<FilaMaestro | null>(null);
  const [registroDesactivar, setRegistroDesactivar] = useState<FilaMaestro | null>(null);

  const puedeEditar = hasPermission(PERMISOS.maestrosEditar);

  const { data: filas, isLoading } = useQuery({
    queryKey: ["maestros-admin", slug, busqueda, incluirInactivos],
    queryFn: () => listarMaestro({ data: { slug, busqueda: busqueda || undefined, incluirInactivos } }),
  });

  const esquema = useMemo(() => construirEsquemaCliente(cfg.campos), [cfg]);
  type ValoresForm = Record<string, string | number | boolean | undefined>;
  const form = useForm<ValoresForm>({ resolver: zodResolver(esquema) });

  const guardarMutacion = useMutation({
    mutationFn: (valores: ValoresForm) =>
      guardarMaestro({ data: { slug, id: registroEditar?.id, valores } }),
    onSuccess: () => {
      toast.success(registroEditar ? "Registro actualizado" : "Registro creado");
      queryClient.invalidateQueries({ queryKey: ["maestros-admin", slug] });
      queryClient.invalidateQueries({ queryKey: ["maestros"] });
      setDialogoAbierto(false);
      setRegistroEditar(null);
      form.reset();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const cambiarActivoMutacion = useMutation({
    mutationFn: (vars: { id: string; activo: boolean }) => cambiarActivoMaestro({ data: { slug, ...vars } }),
    onSuccess: (_r, vars) => {
      toast.success(vars.activo ? "Registro reactivado" : "Registro desactivado");
      queryClient.invalidateQueries({ queryKey: ["maestros-admin", slug] });
      queryClient.invalidateQueries({ queryKey: ["maestros"] });
      setRegistroDesactivar(null);
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNuevo = () => {
    setRegistroEditar(null);
    form.reset(Object.fromEntries(cfg.campos.map((c) => [c.nombre, c.tipo === "boolean" ? false : ""])));
    setDialogoAbierto(true);
  };

  const abrirEditar = (fila: FilaMaestro) => {
    setRegistroEditar(fila);
    form.reset(Object.fromEntries(cfg.campos.map((c) => [c.nombre, fila[c.nombre] ?? (c.tipo === "boolean" ? false : "")])));
    setDialogoAbierto(true);
  };

  const onSubmit = form.handleSubmit((valores) => guardarMutacion.mutate(valores));

  return (
    <RequierePermiso permiso={PERMISOS.maestrosVer}>
      <div>
        <PageHeader
          titulo={cfg.titulo}
          descripcion={cfg.descripcion}
          acciones={
            puedeEditar ? (
              <Button onClick={abrirNuevo}>
                <Plus /> Nuevo
              </Button>
            ) : null
          }
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-8" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inactivos" checked={incluirInactivos} onCheckedChange={setIncluirInactivos} />
            <Label htmlFor="inactivos" className="cursor-pointer text-sm">
              Mostrar inactivos
            </Label>
          </div>
        </div>

        <div className="card-surface overflow-x-auto rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {cfg.campos.map((c) => (
                  <TableHead key={c.nombre}>{c.etiqueta}</TableHead>
                ))}
                <TableHead>Estado</TableHead>
                {puedeEditar ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={cfg.campos.length + 2} className="text-center text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : !filas || filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cfg.campos.length + 2} className="text-center text-muted-foreground">
                    Sin registros.
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((fila) => (
                  <TableRow key={fila.id}>
                    {cfg.campos.map((c) => (
                      <TableCell key={c.nombre}>
                        {c.tipo === "boolean" ? (fila[c.nombre] ? "Sí" : "No") : String(fila[c.nombre] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge variant={fila.activo ? "secondary" : "outline"}>{fila.activo ? "Activo" : "Inactivo"}</Badge>
                    </TableCell>
                    {puedeEditar ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(fila)} title="Editar">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRegistroDesactivar(fila)}
                          >
                            {fila.activo ? "Desactivar" : "Reactivar"}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog
          open={dialogoAbierto}
          onOpenChange={(open) => {
            setDialogoAbierto(open);
            if (!open) setRegistroEditar(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{registroEditar ? "Editar registro" : "Nuevo registro"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
              {cfg.campos.map((c) => (
                <div key={c.nombre} className={c.ancho === "half" ? "col-span-1 space-y-1.5" : "col-span-2 space-y-1.5"}>
                  {c.tipo === "boolean" ? (
                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        id={c.nombre}
                        checked={Boolean(form.watch(c.nombre))}
                        onCheckedChange={(v) => form.setValue(c.nombre, v)}
                      />
                      <Label htmlFor={c.nombre}>{c.etiqueta}</Label>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor={c.nombre}>
                        {c.etiqueta}
                        {c.requerido ? " *" : ""}
                      </Label>
                      <Input
                        id={c.nombre}
                        type={c.tipo === "number" ? "number" : c.tipo === "email" ? "email" : "text"}
                        {...form.register(c.nombre)}
                      />
                      {form.formState.errors[c.nombre] ? (
                        <p className="text-xs text-destructive">{String(form.formState.errors[c.nombre]?.message ?? "")}</p>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
              <DialogFooter className="col-span-2 mt-2">
                <Button type="submit" disabled={guardarMutacion.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!registroDesactivar} onOpenChange={(open) => !open && setRegistroDesactivar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{registroDesactivar?.activo ? "¿Desactivar registro?" : "¿Reactivar registro?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {registroDesactivar?.activo
                  ? "El registro dejará de estar disponible para nuevas selecciones, pero no se eliminará."
                  : "El registro volverá a estar disponible para nuevas selecciones."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  registroDesactivar &&
                  cambiarActivoMutacion.mutate({ id: registroDesactivar.id, activo: !registroDesactivar.activo })
                }
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="mt-2 text-xs text-muted-foreground">Última actualización visible según registros: {formatearFechaHora(filas?.[0]?.updated_at as string | undefined)}</p>
      </div>
    </RequierePermiso>
  );
}
