"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS, type TypeAction } from "@/lib/type-action";

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
//
// Filtre par type ajouté (retour client, 16/09) : les 4 courbes
// s'entremêlent et deviennent illisibles ensemble — même pattern que le
// filtre de la heatmap (heatmap-filtree.tsx) pour la cohérence visuelle,
// purement client (pas de round-trip serveur).
export function ActiviteChart({ data }: { data: DailyPoint[] }) {
  const [selected, setSelected] = useState<Set<TypeAction>>(
    () => new Set(TYPE_ACTIONS),
  );

  const totauxParType = useMemo(() => {
    const map = new Map<TypeAction, number>();
    for (const type of TYPE_ACTIONS) {
      let total = 0;
      for (const jour of data) {
        total += (jour[type] as number) ?? 0;
      }
      map.set(type, total);
    }
    return map;
  }, [data]);

  function toggle(type: TypeAction, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  }

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Aucune donnée sur cette période.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {TYPE_ACTIONS.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox
              id={`activite-filtre-${type}`}
              checked={selected.has(type)}
              onCheckedChange={(checked) => toggle(type, checked === true)}
            />
            <Label
              htmlFor={`activite-filtre-${type}`}
              className="flex items-center gap-1.5 text-sm font-normal"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              {TYPE_LABELS[type]}
              <span className="text-muted-foreground">
                ({totauxParType.get(type) ?? 0})
              </span>
            </Label>
          </div>
        ))}
      </div>

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
          {TYPE_ACTIONS.filter((type) => selected.has(type)).map((type) => (
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
    </div>
  );
}
