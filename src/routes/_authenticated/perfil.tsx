import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, ROLES_LABEL } from "@/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearFechaHora } from "@/types/dominio";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil · CUCAIER" },
      { name: "description", content: "Datos del usuario y cambio de contraseña." },
      { property: "og:title", content: "Mi perfil · CUCAIER" },
      { property: "og:description", content: "Datos del usuario y cambio de contraseña." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { user } = useAuth();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva !== confirmar) return toast.error("Las contraseñas nuevas no coinciden.");
    if (nueva.length < 10 || !/[A-Za-z]/.test(nueva) || !/[0-9]/.test(nueva)) {
      return toast.error("La contraseña debe tener al menos 10 caracteres e incluir letras y números.");
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: nueva, current_password: actual } as Parameters<typeof supabase.auth.updateUser>[0]);
    setEnviando(false);
    if (error) return toast.error("No se pudo actualizar la contraseña. Verifique la contraseña actual.");
    toast.success("Contraseña actualizada.");
    setActual("");
    setNueva("");
    setConfirmar("");
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader titulo="Mi perfil" descripcion="Datos de su cuenta institucional." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Dato etiqueta="Nombre" valor={`${user.nombre} ${user.apellido}`} />
            <Dato etiqueta="Usuario" valor={user.usuario} mono />
            <Dato etiqueta="Roles" valor={user.roles.map((r) => ROLES_LABEL[r]).join(", ") || "—"} />
            <Dato etiqueta="Último acceso" valor={formatearFechaHora(user.ultimoAcceso)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={cambiar} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="actual">Contraseña actual</Label>
                <Input id="actual" type="password" autoComplete="current-password" value={actual} onChange={(e) => setActual(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nueva">Nueva contraseña</Label>
                <Input id="nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar nueva contraseña</Label>
                <Input id="confirmar" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />
              </div>
              <Button type="submit" disabled={enviando}>
                {enviando ? <Loader2 className="animate-spin" /> : null}
                Actualizar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{valor}</span>
    </div>
  );
}
