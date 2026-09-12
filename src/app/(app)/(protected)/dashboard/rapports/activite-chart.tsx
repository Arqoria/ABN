"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS } from "@/lib/type-action";

type DailyPoint = { date: string } & Record<string, number | string>;

const chartConfig: ChartConfig = Object.fromEntries(
  TYPE_ACTIONS.map((type) => [
    type,
    { label: TYPE_LABELS[type], color: TYPE_COLORS[type] },
  ]),
);

// Une courbe par type plutôt qu'un empilement (version précédente) : un
// empilement rend impossible de suivre l'évolution d'un seul type (sa
// bande "flotte" au-dessus des autres et change de hauteur de base à
// chaque jour) — quatre lignes se comparent et se suivent dans le temps
// bien plus facilement, l'objectif premier d'un suivi d'activité.
export function ActiviteChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée sur cette période.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          fontSize={12}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          width={28}
          fontSize={12}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {TYPE_ACTIONS.map((type) => (
          <Line
            key={type}
            type="monotone"
            dataKey={type}
            stroke={`var(--color-${type})`}
            strokeWidth={2.5}
            dot={{ r: 3.5, strokeWidth: 0, fill: `var(--color-${type})` }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
