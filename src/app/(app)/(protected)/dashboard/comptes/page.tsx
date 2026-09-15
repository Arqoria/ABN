import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import type { RoleName } from "@/lib/roles";
import type { FonctionBureau } from "@/lib/fonction-bureau";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValiderCompteForm } from "./valider-compte-form";
import { BureauForm } from "./bureau-form";

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

  // Perf (15/09, retour client "c'est lent partout") : les comptes en
  // attente et la liste des Admins (section "Bureau") sont deux chaînes de
  // requêtes totalement indépendantes — en parallèle plutôt que l'une après
  // l'autre.
  async function chargerComptesEnAttente() {
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

    return { comptesEnAttente, roleRows };
  }

  // Liste des Admins actifs, pour la section "Bureau" ci-dessous (fonction
  // purement informative — voir bureau-form.tsx).
  async function chargerAdmins() {
    const { data: adminRoleRows } = await supabase
      .from("profile_roles")
      .select("profile_id")
      .eq("role", "admin");
    const adminIds = (adminRoleRows ?? []).map((r) => r.profile_id as string);
    if (!adminIds.length) {
      return [] as { id: string; full_name: string | null; fonction_bureau: FonctionBureau | null }[];
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, fonction_bureau")
      .in("id", adminIds)
      .eq("status", "actif")
      .order("full_name", { ascending: true });
    return data ?? [];
  }

  const [{ comptesEnAttente, roleRows }, admins] = await Promise.all([
    chargerComptesEnAttente(),
    chargerAdmins(),
  ]);

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

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground">Bureau</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fonction purement informative (affichage) — n&apos;importe quel
          Admin garde un accès complet, quelle que soit sa fonction.
        </p>
      </div>

      {!admins || admins.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun Admin actif.
          </CardContent>
        </Card>
      ) : (
        admins.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle>{a.full_name ?? "(sans nom)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <BureauForm userId={a.id} fonctionActuelle={a.fonction_bureau} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
