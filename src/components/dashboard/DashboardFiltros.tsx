import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Maestros } from "@/types/dominio";
import type { FiltrosDashboard } from "@/lib/dashboard.functions";

interface DashboardFiltrosProps {
  filtros: FiltrosDashboard;
  maestros: Maestros | undefined;
  onChange: (patch: Partial<FiltrosDashboard>) => void;
  onLimpiar: () => void;
}

const ANIO_ACTUAL = new Date().getFullYear();
const ANIOS = Array.from({ length: ANIO_ACTUAL - 2015 + 1 }, (_, i) => ANIO_ACTUAL - i);

function valorSelect(v?: string) {
  return v ?? "__todos__";
}

/** Barra de filtros del dashboard con chips de filtros activos. */
export function DashboardFiltros({ filtros, maestros, onChange, onLimpiar }: DashboardFiltrosProps) {
  const chips: { clave: keyof FiltrosDashboard; etiqueta: string }[] = [];
  if (filtros.desde) chips.push({ clave: "desde", etiqueta: `Desde: ${filtros.desde}` });
  if (filtros.hasta) chips.push({ clave: "hasta", etiqueta: `Hasta: ${filtros.hasta}` });
  if (filtros.estado) {
    const e = maestros?.estadosTx.find((x) => x.id === filtros.estado);
    chips.push({ clave: "estado", etiqueta: `Estado: ${e?.nombre ?? filtros.estado}` });
  }
  if (filtros.tipo) {
    const t = maestros?.tiposTx.find((x) => x.id === filtros.tipo);
    chips.push({ clave: "tipo", etiqueta: `Tipo: ${t?.nombre ?? filtros.tipo}` });
  }
  if (filtros.cobertura) {
    const c = maestros?.coberturas.find((x) => x.id === filtros.cobertura);
    chips.push({ clave: "cobertura", etiqueta: `Cobertura: ${c?.nombre ?? filtros.cobertura}` });
  }
  if (filtros.centro) {
    const c = maestros?.centrosTx.find((x) => x.id === filtros.centro);
    chips.push({ clave: "centro", etiqueta: `Centro: ${c?.nombre ?? filtros.centro}` });
  }
  if (filtros.localidad) chips.push({ clave: "localidad", etiqueta: `Localidad: ${filtros.localidad}` });

  const hayFiltros = chips.length > 0;

  return (
    <div className="card-surface mb-6 flex flex-col gap-4 rounded-xl p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-desde" className="text-xs">Desde</Label>
          <Input
            id="f-desde"
            type="date"
            value={filtros.desde ?? ""}
            onChange={(e) => onChange({ desde: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="f-hasta" className="text-xs">Hasta</Label>
          <Input
            id="f-hasta"
            type="date"
            value={filtros.hasta ?? ""}
            onChange={(e) => onChange({ hasta: e.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Año</Label>
          <Select
            value="__ninguno__"
            onValueChange={(v) => onChange({ desde: `${v}-01-01`, hasta: `${v}-12-31` })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {ANIOS.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Estado</Label>
          <Select value={valorSelect(filtros.estado)} onValueChange={(v) => onChange({ estado: v === "__todos__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              {maestros?.estadosTx.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Tipo de trasplante</Label>
          <Select value={valorSelect(filtros.tipo)} onValueChange={(v) => onChange({ tipo: v === "__todos__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              {maestros?.tiposTx.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Cobertura</Label>
          <Select value={valorSelect(filtros.cobertura)} onValueChange={(v) => onChange({ cobertura: v === "__todos__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todas</SelectItem>
              {maestros?.coberturas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Centro</Label>
          <Select value={valorSelect(filtros.centro)} onValueChange={(v) => onChange({ centro: v === "__todos__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todos</SelectItem>
              {maestros?.centrosTx.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Localidad</Label>
          <Select value={valorSelect(filtros.localidad)} onValueChange={(v) => onChange({ localidad: v === "__todos__" ? undefined : v })}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todos__">Todas</SelectItem>
              {maestros?.localidades.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <button
            key={chip.clave}
            type="button"
            onClick={() => onChange({ [chip.clave]: undefined })}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
          >
            {chip.etiqueta}
            <X className="size-3" />
          </button>
        ))}
        {hayFiltros ? (
          <Button type="button" variant="ghost" size="sm" onClick={onLimpiar}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
