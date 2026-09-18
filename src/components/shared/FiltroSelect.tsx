import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Opcion } from "@/types/dominio";

export const SENTINEL_TODOS = "__todos__";

interface FiltroSelectProps {
  placeholder: string;
  opciones: Opcion[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  etiquetaTodos?: string;
  className?: string;
}

/** Select de filtro con opción "Todos" (shadcn Select no admite value=""; se usa un sentinel). */
export function FiltroSelect({ placeholder, opciones, value, onChange, etiquetaTodos = "Todos", className }: FiltroSelectProps) {
  return (
    <Select
      value={value ?? SENTINEL_TODOS}
      onValueChange={(v) => onChange(v === SENTINEL_TODOS ? undefined : v)}
    >
      <SelectTrigger className={className}>
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
}
