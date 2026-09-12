import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Vérifie le statut réel du compte : un bénévole non "actif" est renvoyé
// vers /compte-en-attente, vérification "secure" (contre la base) en plus du
// proxy qui reste volontairement optimiste (voir src/lib/supabase/dal.ts).
// Contenu réel encore limité : les fonctionnalités métier (maraudes, repas,
// météo...) arrivent aux itérations suivantes du backlog — ce dashboard sert
// pour l'instant de point d'entrée par rôle, sans données inventées.
export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  const isAdminOrManager = profile.role === "admin" || profile.role === "manager";

  let comptesEnAttenteCount = 0;
  if (profile.role === "admin") {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_attente");
    comptesEnAttenteCount = count ?? 0;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Bienvenue, {profile.full_name ?? "bénévole"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tableau de bord — d&apos;autres fonctionnalités arrivent
          prochainement.
        </p>
      </div>

      {profile.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Comptes en attente de validation</CardTitle>
            <CardDescription>
              {comptesEnAttenteCount === 0
                ? "Aucun compte en attente."
                : `${comptesEnAttenteCount} compte${comptesEnAttenteCount > 1 ? "s" : ""} à valider.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/comptes">Gérer les comptes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {isAdminOrManager ? "Gestion des maraudes" : "Mes maraudes"}
          </CardTitle>
          <CardDescription>
            {isAdminOrManager
              ? "Créer une maraude, suivre les inscriptions."
              : "S'inscrire à une maraude, voir la liste d'attente."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/maraudes">Voir les maraudes</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
