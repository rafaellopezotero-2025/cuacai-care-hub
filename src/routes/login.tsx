import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { sistemaInicializado } from "@/auth/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingresar · CUCAIER Sistema de Gestión de Pacientes" },
      { name: "description", content: "Acceso al Sistema de Gestión de Pacientes Trasplantados del CUCAIER, Ministerio de Salud de Entre Ríos." },
      { property: "og:title", content: "CUCAIER · Sistema de Gestión de Pacientes" },
      { property: "og:description", content: "Acceso institucional al sistema de gestión de pacientes trasplantados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    sistemaInicializado().then((r) => {
      if (!r.inicializado) navigate({ to: "/setup", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const r = await login(usuario, password);
      if (!r.ok) {
        setError(r.error ?? "Usuario o contraseña incorrectos.");
        return;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="institutional-band hidden flex-col justify-between p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-md bg-sidebar-primary text-xl font-bold text-sidebar-primary-foreground">C</div>
            <div>
              <div className="text-lg font-bold tracking-wide">CUCAIER</div>
              <div className="text-xs text-sidebar-foreground/70">Centro Único Coordinador de Ablación e Implante de Entre Ríos</div>
            </div>
          </div>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Sistema de Gestión de Pacientes</h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/75">
            Registro centralizado de pacientes en lista de espera, en proceso de trasplante y trasplantados.
            Información sanitaria sensible: acceso restringido a personal autorizado.
          </p>
        </div>
        <div className="max-w-2xl space-y-2 text-xs leading-relaxed text-sidebar-foreground/70">
          <p className="font-semibold text-sidebar-foreground">Aviso de Responsabilidad e Independencia:</p>
          <p>
            Esta plataforma es una herramienta de desarrollo independiente y de carácter no oficial. No cuenta con la
            vinculación, patrocinio, aval ni representación formal del Ministerio de Salud de Entre Ríos ni del Centro
            Único Coordinador de Ablación e Implantes de Entre Ríos (CUCAIER).
          </p>
          <p>
            <span className="font-semibold text-sidebar-foreground">Uso exclusivo e interno:</span> Diseñada como soporte
            operativo para la gestión y registro técnico de información por parte de personal autorizado.
          </p>
          <p>
            <span className="font-semibold text-sidebar-foreground">Propiedad Intelectual:</span> Los nombres, siglas y
            referencias a organismos públicos se utilizan únicamente con fines contextuales e identificatorios de la
            función interna, sin atribuirse la titularidad ni la condición de sistema gubernamental oficial.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="text-lg font-bold tracking-wide text-primary">CUCAIER</div>
            <div className="text-sm text-muted-foreground">Sistema de Gestión de Pacientes</div>
          </div>
          <div className="card-surface p-8">
            <div className="mb-6 flex items-center gap-2 text-primary">
              <LockKeyhole className="size-5" />
              <h1 className="text-lg font-semibold text-foreground">Ingresar</h1>
            </div>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="usuario">Usuario</Label>
                <Input
                  id="usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  maxLength={32}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={128}
                />
              </div>
              {error ? (
                <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={enviando || !usuario || !password}>
                {enviando ? <Loader2 className="animate-spin" /> : null}
                Ingresar
              </Button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            El acceso queda registrado. Uso exclusivo para personal autorizado
          </p>
        </div>
      </main>
    </div>
  );
}
