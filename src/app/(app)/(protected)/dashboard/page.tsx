import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";

// Placeholder — le vrai tableau de bord par rôle (Admin/Manager vs
// Maraudeur/Cuisinier) reste à construire. Vérifie déjà le statut réel du
// compte : un bénévole non "actif" est renvoyé vers /compte-en-attente,
// vérification "secure" (contre la base) en plus du proxy qui reste
// volontairement optimiste (voir src/lib/supabase/dal.ts).
export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-foreground">
          Tableau de bord
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bienvenue, {profile.full_name ?? "bénévole"}.
        </p>
      </div>
    </div>
  );
}
