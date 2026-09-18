import type { ReactNode } from "react";

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  migas?: ReactNode;
}

export function PageHeader({ titulo, descripcion, acciones, migas }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {migas ? <div className="mb-1 text-xs text-muted-foreground">{migas}</div> : null}
        <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
        {descripcion ? <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
