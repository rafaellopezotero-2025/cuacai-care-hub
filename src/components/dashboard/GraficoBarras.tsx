import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface ItemBarra {
  id: string;
  nombre: string;
  valor: number;
  color: string;
}

interface GraficoBarrasProps {
  data: ItemBarra[];
  activoId?: string;
  onBarClick?: (item: ItemBarra) => void;
  ariaLabel?: string;
  alto?: number;
}

/** Gráfico de barras horizontales, con barras clicables para filtrar el dashboard. */
export function GraficoBarras({ data, activoId, onBarClick, ariaLabel, alto }: GraficoBarrasProps) {
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.id, { label: d.nombre, color: d.color }]));
  const altura = alto ?? Math.max(180, data.length * 34);

  return (
    <ChartContainer config={config} style={{ height: altura }} className="w-full" role="img" aria-label={ariaLabel}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="nombre"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="valor" radius={4} onClick={(entry: { payload?: ItemBarra } & ItemBarra) => onBarClick?.(entry.payload ?? entry)} cursor={onBarClick ? "pointer" : undefined}>
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.color} opacity={activoId && activoId !== entry.id ? 0.4 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
