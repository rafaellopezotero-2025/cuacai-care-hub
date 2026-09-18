import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { crearAdminInicial, sistemaInicializado } from "@/auth/auth.functions";
import { mensajeDeError } from "@/lib/errores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Configuración inicial · CUCAIER" },
      { name: "description", content: "Creación del administrador inicial del Sistema de Gestión de Pacientes del CUCAIER." },
      { property: "og:title", content: "Configuración inicial · CUCAIER" },
      { property: "og:description", content: "Puesta en marcha del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ usuario: "", nombre: "", apellido: "", password: "", confirmar: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    sistemaInicializado().then((r) => {
      if (r.inicializado) navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 10 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("La contraseña debe tener al menos 10 caracteres e incluir letras y números.");
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(form.usuario.trim().toLowerCase())) {
      setError("El usuario debe tener entre 3 y 32 caracteres (letras minúsculas, números, punto, guion).");
      return;
    }
    setEnviando(true);
    try {
      await crearAdminInicial({
        data: { usuario: form.usuario.trim().toLowerCase(), nombre: form.nombre, apellido: form.apellido, password: form.password },
      });
      toast.success("Administrador creado. Ya puede iniciar sesión.");
      navigate({ to: "/login", replace: true });
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-lg font-bold tracking-wide text-primary">CUCAIER</div>
          <h1 className="text-xl font-semibold">Configuración inicial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cree el primer usuario administrador. Esta pantalla sólo está disponible mientras el sistema no tenga usuarios.
          </p>
        </div>
        <form onSubmit={onSubmit} className="card-surface space-y-4 p-6" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={form.nombre} onChange={set("nombre")} required maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido</Label>
              <Input id="apellido" value={form.apellido} onChange={set("apellido")} required maxLength={80} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario">Usuario</Label>
            <Input id="usuario" autoCapitalize="none" value={form.usuario} onChange={set("usuario")} required maxLength={32} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <Input id="confirmar" type="password" autoComplete="new-password" value={form.confirmar} onChange={set("confirmar")} required />
          </div>
          {error ? (
            <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? <Loader2 className="animate-spin" /> : null}
            Crear administrador
          </Button>
        </form>
      </div>
    </div>
  );
}
