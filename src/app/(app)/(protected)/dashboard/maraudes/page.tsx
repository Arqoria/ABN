import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { MaraudesClient } from "./maraudes-client";

// EXPÉRIMENTAL (15/09) — preuve de concept cache local en lecture, voir
// maraudes-client.tsx et docs/Tasks.md. Ce Server Component ne fait plus
// QUE la vérification de sécurité (statut du compte) — les données
// maraudes/inscriptions/managers sont chargées côté client (cache local
// d'abord, réseau ensuite) via /api/maraudes plutôt que de bloquer le
// rendu de la page. La vérification de session elle-même reste dans
// getCurrentProfile(), appelée ici comme partout ailleurs.
export default async function MaraudesPage() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  return <MaraudesClient profileId={profile.id} roles={profile.roles} />;
}
