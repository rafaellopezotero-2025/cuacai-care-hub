import { Area, AreaChart, CartesianGrid, Dot, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface PuntoEvolucion {
  mes: string;
  etiqueta: string;
  valor: number;
}

interface GraficoEvolucionProps {
  data: PuntoEvolucion[];
  onPointClick?: (item: PuntoEvolucion) => void;
  ariaLabel?: string;
}

const config: ChartConfig = { valor: { label: "Trasplantes", color: "var(--chart-1)" } };

/** Evolución mensual de trasplantes registrados, con puntos clicables. */
export function GraficoEvolucion({ data, onPointClick, ariaLabel }: GraficoEvolucionProps) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full" role="img" aria-label={ariaLabel}>
      <AreaChart data={data} margin={{ left: 4, right: 12 }}>
        <defs>
          <linearGradient id="rellenoEvolucion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="valor"
          stroke="var(--chart-1)"
          fill="url(#rellenoEvolucion)"
          strokeWidth={2}
          activeDot={{
            r: 5,
            className: onPointClick ? "cursor-pointer" : undefined,
            onClick: (_e, payload) => {
              const item = (payload as unknown as { payload: PuntoEvolucion }).payload;
              onPointClick?.(item);
            },
          }}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
