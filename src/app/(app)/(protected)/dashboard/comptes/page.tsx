import { redirect } from "next/navigation";
import { getCurrentProfile, type RoleName } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValiderCompteForm } from "./valider-compte-form";

// Réservée aux Admins : liste les comptes 'en_attente' et permet d'assigner
// un ou plusieurs rôles pour les activer (voir src/lib/actions/comptes.ts).
// Voir docs/Specs.md : "Validation manuelle obligatoire de tout nouveau
// compte par un Admin avant accès aux fonctionnalités métier."
export default async function ComptesPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  if (!profile.roles.includes("admin")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: comptesEnAttente } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("status", "en_attente")
    .order("created_at", { ascending: true });

  const compteIds = (comptesEnAttente ?? []).map((c) => c.id as string);
  const { data: roleRows } = compteIds.length
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role")
        .in("profile_id", compteIds)
    : { data: [] as { profile_id: string; role: RoleName }[] };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Comptes en attente de validation
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignez un ou plusieurs rôles à chaque nouveau bénévole pour
          activer son compte.
        </p>
      </div>

      {!comptesEnAttente || comptesEnAttente.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun compte en attente.
          </CardContent>
        </Card>
      ) : (
        comptesEnAttente.map((compte) => {
          const defaultRoles = (roleRows ?? [])
            .filter((r) => r.profile_id === compte.id)
            .map((r) => r.role);

          return (
            <Card key={compte.id}>
              <CardHeader>
                <CardTitle>{compte.full_name ?? "(sans nom)"}</CardTitle>
                <CardDescription>
                  Inscrit le{" "}
                  {new Date(compte.created_at as string).toLocaleDateString(
                    "fr-FR",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ValiderCompteForm
                  userId={compte.id as string}
                  defaultRoles={defaultRoles}
                />
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
