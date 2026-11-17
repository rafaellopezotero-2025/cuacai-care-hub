import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CampoFiltroProps {
  /** Nombre visible del filtro, mostrado arriba del control. */
  etiqueta: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/** Campo de filtro con su nombre visible arriba, para que se entienda qué filtra. */
export function CampoFiltro({ etiqueta, htmlFor, className, children }: CampoFiltroProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-normal text-muted-foreground">
        {etiqueta}
      </Label>
      {children}
    </div>
  );
}
