import { Button } from "@/components/ui/button";

interface PaginacionProps {
  pagina: number;
  total: number;
  tamanoPagina: number;
  onCambiarPagina: (pagina: number) => void;
}

/** Paginación simple (Anterior/Siguiente) con indicador "Mostrando x–y de N". */
export function Paginacion({ pagina, total, tamanoPagina, onCambiarPagina }: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1;
  const hasta = Math.min(pagina * tamanoPagina, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Mostrando {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => onCambiarPagina(pagina - 1)}>
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {pagina} de {totalPaginas}
        </span>
        <Button variant="outline" size="sm" disabled={pagina >= totalPaginas} onClick={() => onCambiarPagina(pagina + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
