import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";

// Layout dédié à /dashboard/* (PAS /compte-en-attente, qui reste sous le
// layout parent (protected)/layout.tsx sans cette vérification — sinon
// boucle de redirection). Centralise ici la vérification de statut
// (redirect si pas "actif") pour toutes les pages du dashboard, au lieu de
// la dupliquer dans chaque page migrée vers le pattern client (voir
// docs/Tasks.md, section Diagnostic perf webapp, "Chantier lancé").
//
// getCurrentProfile() est déjà appelé par le layout parent — grâce à
// React cache(), ce second appel est mémoïsé pour la durée du rendu et ne
// déclenche PAS un second aller-retour Supabase. Comme ce layout ne se
// remonte pas entre deux pages du dashboard (comportement standard de
// l'App Router, déjà vérifié empiriquement sur la page pilote), cette
// vérification ne s'exécute qu'une fois par session, pas à chaque clic.
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  return <>{children}</>;
}
