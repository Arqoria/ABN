import { redirect } from "next/navigation";
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
import { TYPE_ACTIONS, TYPE_COLORS, TYPE_LABELS, type TypeAction } from "@/lib/type-action";
import { CATEGORIE_LABELS, type CategorieDepense } from "@/lib/categorie-depense";
import HeatmapFiltree from "./heatmap-filtree-client";
import { ActiviteChart } from "./activite-chart";
import { DepensesChart } from "./depenses-chart";

// Réservée à Admin/Manager (docs/Specs.md : "compteurs détaillés réservés à
// Admin/Manager"). Un Manager ne voit que les points de passage des
// maraudes qu'il gère — c'est déjà imposé par RLS (Étape 6), cette page
// n'a aucune logique de scope à gérer elle-même. Compteurs agrégés
// uniquement : aucune donnée individuelle sur les personnes aidées
// (docs/Specs.md : anonymat strict).
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

  // Plafonné à 5000 lignes, comme la heatmap de la carte par maraude — largement
  // suffisant pour le volume d'une petite association, évite une requête non
  // bornée si l'historique grossit beaucoup.
  let pointsQuery = supabase
    .from("points_passage_geo")
    .select("type_action, compteur, horodatage, lat, lng")
    .limit(5000);

  if (from) {
    pointsQuery = pointsQuery.gte("horodatage", from);
  }
  if (to) {
    pointsQuery = pointsQuery.lte("horodatage", `${to}T23:59:59`);
  }

  const { data: points } = await pointsQuery;

  const totals: Record<TypeAction, number> = {
    repas_distribue: 0,
    personne_rencontree: 0,
    personne_aidee: 0,
    orientation_sociale: 0,
  };

  // date ISO (tri chronologique) -> libellé court affiché -> totaux par type
  const dailyMap = new Map<string, { label: string; totaux: Record<TypeAction, number> }>();

  for (const p of points ?? []) {
    const type = p.type_action as TypeAction;
    const compteur = p.compteur as number;
    totals[type] = (totals[type] ?? 0) + compteur;

    const d = new Date(p.horodatage as string);
    const iso = d.toISOString().slice(0, 10);
    if (!dailyMap.has(iso)) {
      dailyMap.set(iso, {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        totaux: {
          repas_distribue: 0,
          personne_rencontree: 0,
          personne_aidee: 0,
          orientation_sociale: 0,
        },
      });
    }
    dailyMap.get(iso)!.totaux[type] += compteur;
  }

  const activiteData = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { label, totaux }]) => ({ date: label, ...totaux }));

  const heatmapPoints = (points ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
    typeAction: p.type_action as TypeAction,
  }));

  // Dépenses : réservé Admin — voir commentaire dans depenses-chart.tsx (RLS
  // ne donne à un Manager que ses propres tickets, un total par catégorie
  // serait trompeur pour lui).
  let depensesData: { categorie: CategorieDepense; total: number }[] = [];
  if (isAdmin) {
    let ticketsQuery = supabase
      .from("tickets_depense")
      .select("categorie, montant, created_at");

    if (from) {
      ticketsQuery = ticketsQuery.gte("created_at", from);
    }
    if (to) {
      ticketsQuery = ticketsQuery.lte("created_at", `${to}T23:59:59`);
    }

    const { data: tickets } = await ticketsQuery;
    const parCategorie = new Map<CategorieDepense, number>();
    for (const t of tickets ?? []) {
      const cat = t.categorie as CategorieDepense;
      parCategorie.set(cat, (parCategorie.get(cat) ?? 0) + (t.montant as number));
    }
    depensesData = [...parCategorie.entries()].map(([categorie, total]) => ({
      categorie,
      total,
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Rapports &amp; KPIs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compteurs agrégés — jamais de données individuelles sur les
          personnes aidées.
        </p>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TYPE_ACTIONS.map((type) => (
          <Card key={type} className="overflow-hidden">
            <div className="h-1" style={{ backgroundColor: TYPE_COLORS[type] }} />
            <CardHeader>
              <CardDescription>{TYPE_LABELS[type]}</CardDescription>
              <CardTitle className="text-3xl">{totals[type] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activité par jour</CardTitle>
          <CardDescription>
            Volume et répartition par type d&apos;action sur la période.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActiviteChart data={activiteData} />
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

      <Card>
        <CardHeader>
          <CardTitle>Zones d&apos;activité</CardTitle>
          <CardDescription>
            Heatmap de l&apos;historique, filtrable par type — utile pour
            repérer les zones à couvrir et planifier les prochains circuits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapFiltree points={heatmapPoints} />
        </CardContent>
      </Card>
    </div>
  );
}
