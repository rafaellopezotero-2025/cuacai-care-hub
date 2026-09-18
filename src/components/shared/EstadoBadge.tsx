import { cn } from "@/lib/utils";

const ESTILOS: Record<string, string> = {
  LISTA_ESPERA: "bg-info/15 text-info border-info/30",
  TRASPLANTADO: "bg-success/15 text-success border-success/30",
  REVISAR: "bg-warm/20 text-warm-foreground border-warm/40",
  EXCLUIDO: "bg-muted text-muted-foreground border-border",
  FALLECIDO: "bg-foreground/10 text-foreground border-foreground/20",
};

interface EstadoBadgeProps {
  codigo?: string | null;
  nombre?: string | null;
  className?: string;
}

/** Etiqueta de estado del proceso de trasplante, coloreada según código configurable. */
export function EstadoBadge({ codigo, nombre, className }: EstadoBadgeProps) {
  if (!nombre) return <span className="text-xs text-muted-foreground">Sin proceso</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
        ESTILOS[codigo ?? ""] ?? "bg-secondary text-secondary-foreground border-border",
        className,
      )}
    >
      {nombre}
    </span>
  );
}
