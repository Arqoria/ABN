"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CATEGORIE_LABELS, type CategorieDepense } from "@/lib/categorie-depense";

type CategorieTotal = { categorie: CategorieDepense; total: number };

const chartConfig: ChartConfig = {
  total: { label: "Dépenses (€)", color: "var(--chart-1)" },
};

// Réservé à l'Admin (Trésorier) — tickets_depense n'est lisible par un
// Manager que pour ses propres tickets (RLS tickets_depense_select_own_or_
// admin), donc un total "par catégorie" serait trompeur pour lui (il
// afficherait ses seuls tickets comme s'il s'agissait du total association).
export function DepensesChart({ data }: { data: CategorieTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune dépense sur cette période.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    categorie: CATEGORIE_LABELS[d.categorie],
    total: Math.round(d.total * 100) / 100,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          dataKey="categorie"
          type="category"
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${value} €`}
            />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
