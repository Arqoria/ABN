import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
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
import { getRapportsData } from "@/lib/rapports";
import HeatmapFiltree from "./heatmap-filtree-client";
import { ActiviteChart } from "./activite-chart";
import { DepensesChart } from "./depenses-chart";
import { OrientationsChart } from "./orientations-chart";
import { BesoinsChart } from "./besoins-chart";

// Réservée à Admin/Manager (docs/Specs.md : "compteurs détaillés réservés à
// Admin/Manager"). Un Manager voit désormais l'historique complet, toutes
// maraudes confondues (RLS élargie migration 20260912240000 — utile pour
// s'appuyer sur la heatmap globale en planifiant un circuit), aucune
// logique de scope à gérer côté page. Compteurs agrégés uniquement : aucune
// donnée individuelle sur les personnes aidées (docs/Specs.md : anonymat
// strict). Agrégation faite dans src/lib/rapports.ts, partagée avec l'export
// .xlsx (route /dashboard/rapports/export) pour ne jamais diverger.
//
// Ordre des sections volontaire (retour utilisateur, 12/09) : la carte est
// remontée juste après les KPI (elle sert activement à planifier les
// circuits, elle n'est pas une simple curiosité à faire défiler jusqu'en
// bas) ; le graphique de tendance est passé de barres empilées à des
// courbes, bien plus lisibles pour comparer 4 séries dans le temps.
export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }
  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && !profile.roles.includes("manager")) {
    redirect("/dashboard");
  }

  const { from, to } = await searchParams;

  const supabase = await createClient();
  const { totals, activiteData, heatmapPoints, depensesData, orientationsData, besoinsData } =
    await getRapportsData(supabase, { from, to, isAdmin });

  const exportParams = new URLSearchParams({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString();
  const exportHref = `/dashboard/rapports/export${exportParams ? `?${exportParams}` : ""}`;

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
          {/* Formulaire GET natif — pas de JS nécessaire, la période part
              simplement en paramètres d'URL. */}
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="from">Du</Label>
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={from}
                className="h-12"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">Au</Label>
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={to}
                className="h-12"
              />
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
              <CardTitle className="text-2xl sm:text-3xl">
                {totals[type] ?? 0}
              </CardTitle>
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
          <CardDescription>
            Vers qui les orientations sociales sont faites.
          </CardDescription>
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
