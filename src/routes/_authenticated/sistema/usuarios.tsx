import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth, PERMISOS, ROLES_LABEL } from "@/auth";
import type { AppRole } from "@/auth/types";
import { RequierePermiso } from "@/components/shared/RequierePermiso";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  usuariosQueryOptions,
  crearUsuario,
  actualizarUsuario,
  asignarRoles,
  restablecerContrasena,
  type FilaUsuario,
} from "@/lib/usuarios.functions";
import { mensajeDeError } from "@/lib/errores";
import { formatearFechaHora } from "@/types/dominio";
import { usuarioSchema, passwordSchema } from "@/auth/auth.functions";

export const Route = createFileRoute("/_authenticated/sistema/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios · CUCAIER" },
      { name: "description", content: "Administración de usuarios del sistema CUCAIER." },
      { property: "og:title", content: "Usuarios · CUCAIER" },
      { property: "og:description", content: "Administración de usuarios del sistema CUCAIER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsuariosPage,
});

const TODOS_ROLES: AppRole[] = ["administrador", "operador", "consulta"];

const crearSchema = z.object({
  usuario: usuarioSchema,
  password: passwordSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  roles: z.array(z.enum(["administrador", "operador", "consulta"])).min(1, "Debe seleccionar al menos un rol."),
});
type CrearForm = z.infer<typeof crearSchema>;

const editarSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  apellido: z.string().trim().min(1, "El apellido es obligatorio").max(80),
  activo: z.boolean(),
});
type EditarForm = z.infer<typeof editarSchema>;

const contrasenaSchema = z.object({ password: passwordSchema });
type ContrasenaForm = z.infer<typeof contrasenaSchema>;

function UsuariosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState<string>("todos");
  const [rol, setRol] = useState<string>("todos");

  const [dialogoCrear, setDialogoCrear] = useState(false);
  const [usuarioEditar, setUsuarioEditar] = useState<FilaUsuario | null>(null);
  const [usuarioRoles, setUsuarioRoles] = useState<FilaUsuario | null>(null);
  const [usuarioContrasena, setUsuarioContrasena] = useState<FilaUsuario | null>(null);
  const [rolesSeleccion, setRolesSeleccion] = useState<AppRole[]>([]);

  const filtros = useMemo(
    () => ({
      q: q || undefined,
      activo: activo === "todos" ? undefined : activo === "activos",
      rol: rol === "todos" ? undefined : (rol as AppRole),
    }),
    [q, activo, rol],
  );

  const { data, isLoading } = useQuery(usuariosQueryOptions(filtros));

  const crearForm = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
    defaultValues: { usuario: "", password: "", nombre: "", apellido: "", roles: [] },
  });

  const editarForm = useForm<EditarForm>({ resolver: zodResolver(editarSchema) });
  const contrasenaForm = useForm<ContrasenaForm>({ resolver: zodResolver(contrasenaSchema), defaultValues: { password: "" } });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["usuarios"] });

  const crearMutacion = useMutation({
    mutationFn: (valores: CrearForm) => crearUsuario({ data: valores }),
    onSuccess: () => {
      toast.success("Usuario creado");
      invalidar();
      setDialogoCrear(false);
      crearForm.reset({ usuario: "", password: "", nombre: "", apellido: "", roles: [] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const editarMutacion = useMutation({
    mutationFn: (valores: EditarForm) => actualizarUsuario({ data: { id: usuarioEditar!.id, ...valores } }),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      invalidar();
      setUsuarioEditar(null);
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const rolesMutacion = useMutation({
    mutationFn: (roles: AppRole[]) => asignarRoles({ data: { id: usuarioRoles!.id, roles } }),
    onSuccess: () => {
      toast.success("Roles actualizados");
      invalidar();
      setUsuarioRoles(null);
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const contrasenaMutacion = useMutation({
    mutationFn: (valores: ContrasenaForm) => restablecerContrasena({ data: { id: usuarioContrasena!.id, ...valores } }),
    onSuccess: () => {
      toast.success("Contraseña restablecida");
      setUsuarioContrasena(null);
      contrasenaForm.reset({ password: "" });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirEditar = (fila: FilaUsuario) => {
    setUsuarioEditar(fila);
    editarForm.reset({ nombre: fila.nombre, apellido: fila.apellido, activo: fila.activo });
  };

  const abrirRoles = (fila: FilaUsuario) => {
    setUsuarioRoles(fila);
    setRolesSeleccion(fila.roles);
  };

  const alternarRolSeleccion = (r: AppRole) => {
    setRolesSeleccion((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const alternarRolFormulario = (form: typeof crearForm, r: AppRole) => {
    const actuales = form.getValues("roles");
    form.setValue("roles", actuales.includes(r) ? actuales.filter((x) => x !== r) : [...actuales, r], {
      shouldValidate: true,
    });
  };

  return (
    <RequierePermiso permiso={PERMISOS.usuariosAdministrar}>
      <PageHeader
        titulo="Usuarios"
        descripcion="Administración de cuentas, roles y contraseñas del sistema."
        acciones={
          <Button onClick={() => setDialogoCrear(true)}>
            <Plus /> Nuevo usuario
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Buscar usuario, nombre o apellido..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={activo} onValueChange={setActivo}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activos">Activos</SelectItem>
              <SelectItem value="inactivos">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rol} onValueChange={setRol}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {TODOS_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLES_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="card-surface overflow-x-auto rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
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
                  Sin usuarios.
                </TableCell>
              </TableRow>
            ) : (
              data.filas.map((fila) => (
                <TableRow key={fila.id}>
                  <TableCell className="font-medium">{fila.usuario}</TableCell>
                  <TableCell>
                    {fila.nombre} {fila.apellido}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {fila.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Sin rol</span>
                      ) : (
                        fila.roles.map((r) => (
                          <Badge key={r} variant="secondary">
                            {ROLES_LABEL[r]}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={fila.activo ? "default" : "outline"}>{fila.activo ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatearFechaHora(fila.ultimoAcceso)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEditar(fila)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Roles" onClick={() => abrirRoles(fila)}>
                        <ShieldCheck className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Restablecer contraseña" onClick={() => setUsuarioContrasena(fila)}>
                        <KeyRound className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Crear usuario */}
      <Dialog
        open={dialogoCrear}
        onOpenChange={(open) => {
          setDialogoCrear(open);
          if (!open) crearForm.reset({ usuario: "", password: "", nombre: "", apellido: "", roles: [] });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>El usuario ingresará con nombre de usuario y contraseña (sin correo real).</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={crearForm.handleSubmit((v) => crearMutacion.mutate(v))}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" {...crearForm.register("nombre")} />
                {crearForm.formState.errors.nombre ? (
                  <p className="text-xs text-destructive">{crearForm.formState.errors.nombre.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" {...crearForm.register("apellido")} />
                {crearForm.formState.errors.apellido ? (
                  <p className="text-xs text-destructive">{crearForm.formState.errors.apellido.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" {...crearForm.register("usuario")} placeholder="jperez" />
              {crearForm.formState.errors.usuario ? (
                <p className="text-xs text-destructive">{crearForm.formState.errors.usuario.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" {...crearForm.register("password")} />
              {crearForm.formState.errors.password ? (
                <p className="text-xs text-destructive">{crearForm.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-4">
                {TODOS_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={crearForm.watch("roles").includes(r)}
                      onCheckedChange={() => alternarRolFormulario(crearForm, r)}
                    />
                    {ROLES_LABEL[r]}
                  </label>
                ))}
              </div>
              {crearForm.formState.errors.roles ? (
                <p className="text-xs text-destructive">{crearForm.formState.errors.roles.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={crearMutacion.isPending}>
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar usuario */}
      <Dialog open={Boolean(usuarioEditar)} onOpenChange={(open) => !open && setUsuarioEditar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editarForm.handleSubmit((v) => editarMutacion.mutate(v))}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="e-nombre">Nombre</Label>
                <Input id="e-nombre" {...editarForm.register("nombre")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="e-apellido">Apellido</Label>
                <Input id="e-apellido" {...editarForm.register("apellido")} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="e-activo"
                checked={editarForm.watch("activo")}
                disabled={usuarioEditar?.id === user?.id}
                onCheckedChange={(v) => editarForm.setValue("activo", v)}
              />
              <Label htmlFor="e-activo" className="cursor-pointer">
                Usuario activo
              </Label>
            </div>
            {usuarioEditar?.id === user?.id ? (
              <p className="text-xs text-muted-foreground">No puede desactivar su propio usuario.</p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={editarMutacion.isPending}>
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Asignar roles */}
      <Dialog open={Boolean(usuarioRoles)} onOpenChange={(open) => !open && setUsuarioRoles(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles de {usuarioRoles?.usuario}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {TODOS_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <Checkbox checked={rolesSeleccion.includes(r)} onCheckedChange={() => alternarRolSeleccion(r)} />
                {ROLES_LABEL[r]}
              </label>
            ))}
            {usuarioRoles?.id === user?.id && !rolesSeleccion.includes("administrador") ? (
              <p className="text-xs text-destructive">No puede quitarse a sí mismo el rol de administrador.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => rolesMutacion.mutate(rolesSeleccion)}
              disabled={rolesMutacion.isPending || rolesSeleccion.length === 0}
            >
              Guardar roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restablecer contraseña */}
      <Dialog
        open={Boolean(usuarioContrasena)}
        onOpenChange={(open) => {
          if (!open) {
            setUsuarioContrasena(null);
            contrasenaForm.reset({ password: "" });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña de {usuarioContrasena?.usuario}</DialogTitle>
            <DialogDescription>Se fijará una nueva contraseña para el usuario.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={contrasenaForm.handleSubmit((v) => contrasenaMutacion.mutate(v))}>
            <div className="space-y-1">
              <Label htmlFor="nueva-password">Nueva contraseña</Label>
              <Input id="nueva-password" type="password" {...contrasenaForm.register("password")} />
              {contrasenaForm.formState.errors.password ? (
                <p className="text-xs text-destructive">{contrasenaForm.formState.errors.password.message}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={contrasenaMutacion.isPending}>
                Restablecer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RequierePermiso>
  );
}
