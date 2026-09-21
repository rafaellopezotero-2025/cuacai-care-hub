import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface PanelGraficoProps {
  titulo: string;
  descripcion?: string;
  /** Enlace opcional para ver el listado de pacientes con los filtros aplicados. */
  verPacientesTo?: { to: string; search?: Record<string, unknown> };
  className?: string;
  children: ReactNode;
}

/** Contenedor sobrio para los gráficos del dashboard (sin datos identificables). */
export function PanelGrafico({ titulo, descripcion, verPacientesTo, className, children }: PanelGraficoProps) {
  return (
    <section className={cn("card-surface flex flex-col gap-3 p-5", className)} aria-label={titulo}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {descripcion ? <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p> : null}
        </div>
        {verPacientesTo ? (
          <Link
            to={verPacientesTo.to}
            search={verPacientesTo.search as never}
            className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver pacientes
          </Link>
        ) : null}
      </header>
      <div className="min-h-[220px]">{children}</div>
    </section>
  );
}
