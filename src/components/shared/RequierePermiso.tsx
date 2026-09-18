import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";

interface RequierePermisoProps {
  permiso: string | string[];
  children: ReactNode;
  /** Si es true, no renderiza nada en lugar del aviso de acceso denegado. */
  silencioso?: boolean;
}

/**
 * Protección de UI por permiso. Complementa (no reemplaza) la autorización del backend:
 * las server functions y las políticas RLS vuelven a verificar cada operación.
 */
export function RequierePermiso({ permiso, children, silencioso }: RequierePermisoProps) {
  const { hasAnyPermission, cargando } = useAuth();
  const permisos = Array.isArray(permiso) ? permiso : [permiso];
  if (cargando) return null;
  if (hasAnyPermission(permisos)) return <>{children}</>;
  if (silencioso) return null;
  return <AccesoDenegado />;
}

export function AccesoDenegado() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-destructive/10 p-4 text-destructive">
        <ShieldAlert className="size-8" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Acceso no autorizado</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Su rol no tiene permisos para acceder a esta sección. Si considera que es un error, comuníquese con el administrador del sistema.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/dashboard">Volver al dashboard</Link>
      </Button>
    </div>
  );
}
