"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import type { getRapportsData } from "@/lib/rapports";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS } from "@/lib/type-action";
import HeatmapFiltree from "./heatmap-filtree-client";
import { ActiviteChart } from "./activite-chart";
import { DepensesChart } from "./depenses-chart";
import { OrientationsChart } from "./orientations-chart";
import { BesoinsChart } from "./besoins-chart";

type Payload = Awaited<ReturnType<typeof getRapportsData>> & { isAdmin: boolean };

async function fetchRapports(from?: string, to?: string): Promise<Payload> {
  const params = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const res = await fetch(`/api/rapports${params.toString() ? `?${params}` : ""}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// Voir docs/Tasks.md, "Chantier lancé". Filtre de période conservé en
// paramètres d'URL (useSearchParams) — même logique qu'avant, mais via
// le router client plutôt qu'un vrai GET/rechargement de page.
export function RapportsClient() {
  const profile = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  useEffect(() => {
    if (!isAdminOrManager) {
      router.replace("/dashboard");
    }
  }, [isAdminOrManager, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["rapports", from, to],
    queryFn: () => fetchRapports(from, to),
    enabled: isAdminOrManager,
  });

  if (!isAdminOrManager) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-16">
        <p className="text-sm text-muted-foreground">
          Impossible de charger les rapports pour l&apos;instant.
        </p>
      </div>
    );
  }

  const { totals, activiteData, heatmapPoints, depensesData, orientationsData, besoinsData, isAdmin } =
    data;

  const exportParams = new URLSearchParams({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  const exportHref = `/dashboard/rapports/export${exportParams ? `?${exportParams}` : ""}`;

  function handleFilter(formData: FormData) {
    const params = new URLSearchParams();
    const newFrom = formData.get("from");
    const newTo = formData.get("to");
    if (typeof newFrom === "string" && newFrom) params.set("from", newFrom);
    if (typeof newTo === "string" && newTo) params.set("to", newTo);
    router.push(`/dashboard/rapports${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Rapports &amp; KPIs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compteurs agrégés — jamais de données individuelles sur les
            personnes aidées.
          </p>
        </div>
        <Button asChild variant="outline" className="h-12">
          <Link href={exportHref}>Exporter (.xlsx)</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Période</CardTitle>
          <CardDescription>Laisser vide pour tout l&apos;historique.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={handleFilter}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="from">Du</Label>
              <Input id="from" name="from" type="date" defaultValue={from} className="h-12" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">Au</Label>
              <Input id="to" name="to" type="date" defaultValue={to} className="h-12" />
            </div>
            <Button type="submit" className="h-12">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TYPE_ACTIONS.map((type) => (
          <Card key={type} className="overflow-hidden py-0">
            <div className="h-1.5" style={{ backgroundColor: TYPE_COLORS[type] }} />
            <CardHeader className="gap-1 py-4">
              <CardDescription className="text-xs leading-tight">
                {TYPE_LABELS[type]}
              </CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{totals[type] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zones d&apos;activité</CardTitle>
          <CardDescription>
            Heatmap de l&apos;historique, filtrable par type — cliquez un
            point pour le détail, utile pour repérer les zones à couvrir et
            planifier les prochains circuits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapFiltree points={heatmapPoints} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activité par jour</CardTitle>
          <CardDescription>
            Une courbe par type d&apos;action, pour suivre la tendance sur la
            période.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiviteChart data={activiteData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orientations par organisme</CardTitle>
          <CardDescription>Vers qui les orientations sociales sont faites.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrientationsChart data={orientationsData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Besoins signalés</CardTitle>
          <CardDescription>
            Manques matériels remontés par les bénévoles — aide à ajuster les
            prochains achats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BesoinsChart data={besoinsData} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
            <CardDescription>Tickets de dépense, toutes maraudes.</CardDescription>
          </CardHeader>
          <CardContent>
            <DepensesChart data={depensesData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
