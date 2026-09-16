"use client";

import { Cell, Pie, PieChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CATEGORIE_LABELS, type CategorieDepense } from "@/lib/categorie-depense";

type CategorieTotal = { categorie: CategorieDepense; total: number };

// Une couleur par catégorie (4 au total) — variables de thème déjà
// utilisées ailleurs dans les graphiques du projet (var(--chart-N)).
const COULEURS: Record<CategorieDepense, string> = {
  alimentaire: "var(--chart-1)",
  carburant: "var(--chart-2)",
  materiel: "var(--chart-3)",
  autre: "var(--chart-4)",
};

const chartConfig: ChartConfig = {
  alimentaire: { label: CATEGORIE_LABELS.alimentaire, color: COULEURS.alimentaire },
  carburant: { label: CATEGORIE_LABELS.carburant, color: COULEURS.carburant },
  materiel: { label: CATEGORIE_LABELS.materiel, color: COULEURS.materiel },
  autre: { label: CATEGORIE_LABELS.autre, color: COULEURS.autre },
};

// Réservé à l'Admin (Trésorier) — tickets_depense n'est lisible par un
// Manager que pour ses propres tickets (RLS tickets_depense_select_own_or_
// admin), donc un total "par catégorie" serait trompeur pour lui (il
// afficherait ses seuls tickets comme s'il s'agissait du total association).
//
// Camembert plutôt qu'un histogramme (demande client, 16/09 — varier le
// style entre les sections) : pertinent ici car on regarde une
// répartition d'un tout (100% des dépenses) entre 4 catégories, pas une
// évolution ou une comparaison de valeurs absolues.
export function DepensesChart({ data }: { data: CategorieTotal[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune dépense sur cette période.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    categorie: d.categorie,
    label: CATEGORIE_LABELS[d.categorie],
    total: Math.round(d.total * 100) / 100,
    fill: COULEURS[d.categorie],
  }));

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[280px]">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => `${value} €`} hideLabel />}
        />
        <Pie data={chartData} dataKey="total" nameKey="categorie" innerRadius={60}>
          {chartData.map((entry) => (
            <Cell key={entry.categorie} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="categorie" />} />
      </PieChart>
    </ChartContainer>
  );
}
