import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface ItemDonut {
  id: string;
  nombre: string;
  valor: number;
  color: string;
}

interface GraficoDonutProps {
  data: ItemDonut[];
  activoId?: string;
  onSliceClick?: (item: ItemDonut) => void;
  totalLabel?: string;
  ariaLabel?: string;
}

/** Gráfico de anillo (donut) con etiqueta de total en el centro y segmentos clicables. */
export function GraficoDonut({ data, activoId, onSliceClick, totalLabel = "Total", ariaLabel }: GraficoDonutProps) {
  const total = data.reduce((acc, d) => acc + d.valor, 0);
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.id, { label: d.nombre, color: d.color }]));

  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[260px]" role="img" aria-label={ariaLabel}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="valor"
          nameKey="id"
          innerRadius="60%"
          outerRadius="90%"
          strokeWidth={2}
          onClick={(entry) => onSliceClick?.(entry as unknown as ItemDonut)}
        >
          {data.map((entry) => (
            <Cell
              key={entry.id}
              fill={entry.color}
              className={cn("cursor-pointer transition-opacity", activoId && activoId !== entry.id && "opacity-40")}
            />
          ))}
        </Pie>
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-semibold">
          {total.toLocaleString("es-AR")}
        </text>
        <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
          {totalLabel}
        </text>
      </PieChart>
    </ChartContainer>
  );
}
