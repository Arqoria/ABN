"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CATEGORIE_BESOIN_LABELS,
  type CategorieBesoin,
} from "@/lib/categorie-besoin";

type CategorieTotal = { categorie: CategorieBesoin; total: number };

const chartConfig: ChartConfig = {
  total: { label: "Signalements", color: "var(--chart-3)" },
};

// Répond au besoin d'anticiper les achats (retour utilisateur, 12/09) :
// quels manques matériels reviennent le plus souvent, pour ajuster les
// prochains achats du Trésorier plutôt que de deviner.
export function BesoinsChart({ data }: { data: CategorieTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun besoin signalé sur cette période.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    categorie: CATEGORIE_BESOIN_LABELS[d.categorie],
    total: d.total,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          dataKey="categorie"
          type="category"
          tickLine={false}
          axisLine={false}
          width={130}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
