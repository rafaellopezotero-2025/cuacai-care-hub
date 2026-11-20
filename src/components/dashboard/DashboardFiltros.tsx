import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Maestros } from "@/types/dominio";
import type { FiltrosDashboard } from "@/lib/dashboard.functions";
import {
  ANIOS_DASHBOARD,
  RANGO_PREDETERMINADO,
  RANGO_TODOS_LOS_ANIOS,
  anioSeleccionado,
  esMismoRango,
  rangoDeAnio,
} from "@/lib/dashboard.functions";

interface DashboardFiltrosProps {
  filtros: FiltrosDashboard;
  maestros: Maestros | undefined;
  onChange: (patch: Partial<FiltrosDashboard>) => void;
  onLimpiar: () => void;
}

const TODOS_LOS_ANIOS = "__todos__";
const RANGO_PERSONALIZADO = "__personalizado__";

function valorSelect(v?: string) {
  return v ?? "__todos__";
}

interface Chip {
  clave: string;
  etiqueta: string;
  quitar: () => void;
}

/** Barra de filtros del dashboard. Sin rango en la URL se muestra el año en curso. */
export function DashboardFiltros({ filtros, maestros, onChange, onLimpiar }: DashboardFiltrosProps) {
  const rangoEsPrederminado = esMismoRango(filtros, RANGO_PREDETERMINADO);
  const rangoEsTodos = esMismoRango(filtros, RANGO_TODOS_LOS_ANIOS);
  const anio = anioSeleccionado(filtros);
  const valorAnio = rangoEsTodos ? TODOS_LOS_ANIOS : anio !== null ? String(anio) : RANGO_PERSONALIZADO;

  const chips: Chip[] = [];
  if (!rangoEsPrederminado) {
    if (rangoEsTodos) {
      chips.push({
        clave: "rango",
        etiqueta: "Período: todos los años",
        quitar: () => onChange(RANGO_PREDETERMINADO),
      });
    } else {
      if (filtros.desde) {
        chips.push({ clave: "desde", etiqueta: `Desde: ${filtros.desde}`, quitar: () => onChange({ desde: undefined }) });
      }
      if (filtros.hasta) {
        chips.push({ clave: "hasta", etiqueta: `Hasta: ${filtros.hasta}`, quitar: () => onChange({ hasta: undefined }) });
      }
    }
  }
  if (filtros.estado) {
    const e = maestros?.estadosTx.find((x) => x.id === filtros.estado);
    chips.push({ clave: "estado", etiqueta: `Estado: ${e?.nombre ?? filtros.estado}`, quitar: () => onChange({ estado: undefined }) });
  }
  if (filtros.tipo) {
    const t = maestros?.tiposTx.find((x) => x.id === filtros.tipo);
    chips.push({ clave: "tipo", etiqueta: `Tipo: ${t?.nombre ?? filtros.tipo}`, quitar: () => onChange({ tipo: undefined }) });
  }
  if (filtros.cobertura) {
    const c = maestros?.coberturas.find((x) => x.id === filtros.cobertura);
    chips.push({ clave: "cobertura", etiqueta: `Cobertura: ${c?.nombre ?? filtros.cobertura}`, quitar: () => onChange({ cobertura: undefined }) });
  }
  if (filtros.centro) {
    const c = maestros?.centrosTx.find((x) => x.id === filtros.centro);
    chips.push({ clave: "centro", etiqueta: `Centro: ${c?.nombre ?? filtros.centro}`, quitar: () => onChange({ centro: undefined }) });
  }
  if (filtros.localidad) {
    chips.push({ clave: "localidad", etiqueta: `Localidad: ${filtros.localidad}`, quitar: () => onChange({ localidad: undefined }) });
  }

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
            value={valorAnio}
            onValueChange={(v) => {
              if (v === TODOS_LOS_ANIOS) onChange(RANGO_TODOS_LOS_ANIOS);
              else if (v !== RANGO_PERSONALIZADO) onChange(rangoDeAnio(Number(v)));
            }}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_LOS_ANIOS}>Todos los años</SelectItem>
              {ANIOS_DASHBOARD.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
              {valorAnio === RANGO_PERSONALIZADO ? (
                <SelectItem value={RANGO_PERSONALIZADO} disabled>Rango personalizado</SelectItem>
              ) : null}
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
            onClick={chip.quitar}
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
