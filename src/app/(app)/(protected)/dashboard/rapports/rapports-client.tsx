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
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, MapPin, Package, Wallet } from "lucide-react";
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS } from "@/lib/type-action";
import HeatmapFiltree from "./heatmap-filtree-client";
import { ActiviteChart } from "./activite-chart";
import { DepensesChart } from "./depenses-chart";
import { OrientationsChart } from "./orientations-chart";
import { BesoinsChart } from "./besoins-chart";
import { CollapsibleSection } from "@/components/collapsible-section";

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
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-12 w-36" />
        </div>
        {/* Carte Période */}
        <Skeleton className="h-[150px] w-full" />
        {/* 4 sections repliées par défaut — même hauteur qu'une
            CollapsibleSection fermée (icône + titre + description sur une
            ligne), pas les gros blocs de contenu ouvert d'avant. */}
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pt-8 pb-16">
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
          {/* prefetch={false} : ce lien déclenche un téléchargement de
              fichier, pas une navigation — le précharger n'a aucun sens et
              ne fait que déclencher le middleware inutilement. */}
          <Link href={exportHref} prefetch={false}>Exporter (.xlsx)</Link>
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

      <CollapsibleSection
        title="Vue d'ensemble"
        description="Les chiffres clés de la période."
        icon={Gauge}
      >
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
      </CollapsibleSection>

      {/* De loin la section la plus lourde (heatmap jusqu'à 5000 points) —
          ne paye son coût de rendu (Leaflet, graphiques) qu'à l'ouverture,
          pas au premier affichage. Voir docs/Tasks.md, Étape 10bis.
          Heatmap ET activité par jour ont chacune leur propre filtre par
          type (deux Set indépendants, purement client) — les orientations
          restent, elles, sur toute la période sans filtre par type. */}
      <CollapsibleSection
        title="Terrain"
        description="Carte, activité par jour et orientations sociales."
        icon={MapPin}
      >
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Zones d&apos;activité
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Heatmap de l&apos;historique, filtrable par type (ci-dessous)
              — cliquez un point pour le détail, utile pour repérer les
              zones à couvrir et planifier les prochains circuits.
            </p>
            <HeatmapFiltree points={heatmapPoints} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Activité par jour
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Une courbe par type d&apos;action, pour suivre la tendance sur
              la période — décochez un type pour l&apos;isoler si les
              courbes se superposent trop.
            </p>
            <ActiviteChart data={activiteData} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">
              Orientations par organisme
            </h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Vers qui les orientations sociales sont faites.
            </p>
            <OrientationsChart data={orientationsData} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Besoins matériels"
        description="Manques remontés par les bénévoles — aide à ajuster les prochains achats."
        icon={Package}
      >
        <BesoinsChart data={besoinsData} />
      </CollapsibleSection>

      {isAdmin && (
        <CollapsibleSection
          title="Finances"
          description="Tickets de dépense, toutes maraudes."
          icon={Wallet}
        >
          <DepensesChart data={depensesData} />
        </CollapsibleSection>
      )}
    </div>
  );
}
