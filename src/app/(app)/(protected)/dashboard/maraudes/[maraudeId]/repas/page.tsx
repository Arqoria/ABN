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
import { RepasForm } from "./repas-form";

// Lecture large (RLS Étape 5 : repas_select_authenticated) — tout le monde
// voit les repas d'une maraude. Seul un Cuisinier peut en ajouter (le
// formulaire n'est même pas rendu pour les autres rôles, et RLS + le trigger
// check_repas_cuisinier_role bloqueraient de toute façon une tentative
// directe).
export default async function RepasMaraudePage({
  params,
}: {
  params: Promise<{ maraudeId: string }>;
}) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  const supabase = await createClient();

  const { data: repas } = await supabase
    .from("repas")
    .select("id, quoi, quantite, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Repas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Traçabilité des repas préparés pour cette maraude.
        </p>
      </div>

      {profile.roles.includes("cuisinier") && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un repas</CardTitle>
          </CardHeader>
          <CardContent>
            <RepasForm maraudeId={maraudeId} />
          </CardContent>
        </Card>
      )}

      {!repas || repas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun repas enregistré pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border py-0">
            {repas.map((r) => (
              <div key={r.id as string} className="flex items-center justify-between py-3">
                <span className="text-sm text-foreground">{r.quoi as string}</span>
                <CardDescription>x{r.quantite as number}</CardDescription>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
