import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CUCAIER · Sistema de Gestión de Pacientes Trasplantados" },
      { name: "description", content: "Sistema institucional del CUCAIER (Ministerio de Salud de Entre Ríos) para la gestión de pacientes trasplantados y en proceso de trasplante." },
      { property: "og:title", content: "CUCAIER · Sistema de Gestión de Pacientes" },
      { property: "og:description", content: "Gestión centralizada de pacientes trasplantados y en lista de espera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

/** Punto de entrada: deriva al dashboard si hay sesión, o al login. */
function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/dashboard" : "/login", replace: true });
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 size-5 animate-spin" /> Cargando…
    </div>
  );
}
