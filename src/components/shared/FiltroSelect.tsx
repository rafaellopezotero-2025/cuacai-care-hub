import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Opcion } from "@/types/dominio";

export const SENTINEL_TODOS = "__todos__";

interface FiltroSelectProps {
  placeholder: string;
  opciones: Opcion[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  etiquetaTodos?: string;
  /** Nombre visible del filtro, mostrado arriba del selector. */
  etiqueta?: string;
  className?: string;
}

/** Select de filtro con opción "Todos" (shadcn Select no admite value=""; se usa un sentinel). */
export function FiltroSelect({
  placeholder,
  opciones,
  value,
  onChange,
  etiquetaTodos = "Todos",
  etiqueta,
  className,
}: FiltroSelectProps) {
  const id = useId();

  const selector = (
    <Select
      value={value ?? SENTINEL_TODOS}
      onValueChange={(v) => onChange(v === SENTINEL_TODOS ? undefined : v)}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SENTINEL_TODOS}>{etiquetaTodos}</SelectItem>
        {opciones.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!etiqueta) return selector;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {etiqueta}
      </Label>
      {selector}
    </div>
  );
}
