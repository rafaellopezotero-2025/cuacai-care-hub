import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/auth";
import { Loader2 } from "lucide-react";

/**
 * Puerta de acceso del área privada. Sin sesión válida redirige a /login.
 * La autorización por permisos se aplica además en cada página y en el backend (RLS).
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Cargando sesión…
      </div>
    );
  }

  if (!user) {
    return <SesionInvalida />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function SesionInvalida() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm text-muted-foreground">Su usuario no está habilitado para acceder al sistema.</p>
      <button
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => logout().then(() => (window.location.href = "/login"))}
      >
        Volver al inicio de sesión
      </button>
    </div>
  );
}
