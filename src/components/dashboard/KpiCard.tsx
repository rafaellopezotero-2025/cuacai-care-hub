import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  titulo: string;
  valor: number;
  activo?: boolean | undefined;
  icono?: ReactNode | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
}

/** Tarjeta de indicador clave del dashboard, opcionalmente clicable para filtrar. */
export function KpiCard({ titulo, valor, activo, icono, onClick, className }: KpiCardProps) {
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{titulo}</span>
        {icono ? <span className="text-muted-foreground">{icono}</span> : null}
      </div>
      <span className="mt-2 block text-2xl font-semibold tabular-nums text-foreground">
        {valor.toLocaleString("es-AR")}
      </span>
    </>
  );

  const clases = cn(
    "card-surface flex flex-col rounded-xl p-4 text-left transition-colors",
    onClick && "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    activo && "border-primary bg-primary-soft",
    className,
  );

  if (!onClick) {
    return <div className={clases}>{contenido}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={clases} aria-pressed={activo}>
      {contenido}
    </button>
  );
}
