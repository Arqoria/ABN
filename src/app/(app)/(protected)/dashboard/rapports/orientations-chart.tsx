"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ORGANISME_ORIENTATION_LABELS,
  type OrganismeOrientation,
} from "@/lib/organisme-orientation";

type OrganismeTotal = { organisme: OrganismeOrientation; total: number };

const chartConfig: ChartConfig = {
  total: { label: "Orientations", color: "var(--chart-4)" },
};

// Répond au besoin exprimé (12/09) : une orientation sociale ne dit rien en
// soi, savoir VERS QUI oriente vraiment révèle l'usage réel du réseau
// partenaire. Barres horizontales, triées du plus fréquent au moins
// fréquent (déjà fait dans src/lib/rapports.ts) — se lit mieux qu'un
// camembert dès qu'il y a plus de 3-4 catégories (jusqu'à 18 organismes ici).
export function OrientationsChart({ data }: { data: OrganismeTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune orientation sur cette période.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    organisme: ORGANISME_ORIENTATION_LABELS[d.organisme],
    total: d.total,
  }));

  // Hauteur proportionnelle au nombre d'organismes distincts, pour que
  // chaque barre reste lisible même avec beaucoup de catégories.
  const height = Math.max(180, chartData.length * 34);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart data={chartData} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          dataKey="organisme"
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
