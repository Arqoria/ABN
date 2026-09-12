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

const TYPE_LABELS: Record<string, string> = {
  repas_distribue: "Repas distribués",
  personne_rencontree: "Personnes rencontrées",
  personne_aidee: "Personnes aidées",
  orientation_sociale: "Orientations sociales",
};

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
  if (!profile.roles.includes("admin") && !profile.roles.includes("manager")) {
    redirect("/dashboard");
  }

  const { from, to } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("points_passage")
    .select("type_action, compteur, horodatage");

  if (from) {
    query = query.gte("horodatage", from);
  }
  if (to) {
    query = query.lte("horodatage", `${to}T23:59:59`);
  }

  const { data: points } = await query;

  const totals: Record<string, number> = {
    repas_distribue: 0,
    personne_rencontree: 0,
    personne_aidee: 0,
    orientation_sociale: 0,
  };
  for (const p of points ?? []) {
    const type = p.type_action as string;
    totals[type] = (totals[type] ?? 0) + (p.compteur as number);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
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
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{totals[key] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
