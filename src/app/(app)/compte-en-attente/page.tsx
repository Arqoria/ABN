import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Écran affiché à tout bénévole dont le compte n'est pas encore (ou plus)
// actif. Voir docs/Specs.md : "Validation manuelle obligatoire de tout
// nouveau compte par un Admin avant accès aux fonctionnalités métier."
export default async function CompteEnAttentePage() {
  const profile = await getCurrentProfile();

  // Un compte actif n'a rien à faire ici — on ne le laisse pas bloqué sur
  // cet écran (ex. ancien lien, retour arrière du navigateur).
  if (profile.status === "actif") {
    redirect("/dashboard");
  }

  const isSuspended = profile.status === "suspendu";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {isSuspended ? "Compte suspendu" : "Compte en attente de validation"}
          </CardTitle>
          <CardDescription>
            {isSuspended
              ? "Votre compte a été suspendu. Contactez un administrateur de l'association pour plus d'informations."
              : "Votre compte a bien été créé. Un administrateur doit encore le valider avant que vous puissiez accéder aux fonctionnalités de l'association."}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
