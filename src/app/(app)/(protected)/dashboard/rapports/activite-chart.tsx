"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

// Tendance sur la période filtrée — un empilement par jour permet de voir à
// la fois le volume total et sa répartition par type d'action, l'info la
// plus utile pour un suivi d'activité (pas de camembert : moins lisible
// pour comparer plusieurs jours entre eux).
export function ActiviteChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune donnée sur cette période.
      </p>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {TYPE_ACTIONS.map((type) => (
          <Bar
            key={type}
            dataKey={type}
            stackId="total"
            fill={`var(--color-${type})`}
            radius={0}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
