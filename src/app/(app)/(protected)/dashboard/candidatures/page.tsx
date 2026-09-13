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
import { ToggleTraitee } from "./toggle-traitee";

// RLS (candidatures_benevolat_select_admin) réserve déjà la lecture à
// Admin — candidatures soumises depuis /recrutement (site vitrine public,
// Étape 10), invisibles autrement (aucune UI de lecture avant cette page).
export default async function CandidaturesPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }
  if (!profile.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: candidatures } = await supabase
    .from("candidatures_benevolat")
    .select("id, nom_complet, email, telephone, message, traitee, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Candidatures bénévoles
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soumises depuis le site vitrine public (/recrutement).
        </p>
      </div>

      {!candidatures || candidatures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune candidature pour l&apos;instant.
          </CardContent>
        </Card>
      ) : (
        candidatures.map((c) => (
          <Card key={c.id as string}>
            <CardHeader>
              <CardTitle>{c.nom_complet as string}</CardTitle>
              <CardDescription>
                {c.email as string}
                {c.telephone ? ` · ${c.telephone}` : ""} ·{" "}
                {new Date(c.created_at as string).toLocaleDateString("fr-FR")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {c.message && (
                <p className="text-sm text-foreground">{c.message as string}</p>
              )}
              <div>
                <ToggleTraitee id={c.id as string} traitee={c.traitee as boolean} />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
