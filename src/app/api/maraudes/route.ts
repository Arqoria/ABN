import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Route Handler consommée par le Client Component maraudes-client.tsx (via
// React Query) plutôt que de charger ces données dans le Server Component
// de la page — objectif : que naviguer vers /dashboard/maraudes ne déclenche
// plus un rendu serveur complet à chaque clic (voir docs/Tasks.md, section
// Diagnostic perf webapp, "Chantier ciblé"). Toujours protégée par
// getCurrentProfile() ici — c'est la vraie vérification serveur pour CES
// données, pas une simplification de sécurité, juste déplacée d'un rendu de
// page complet vers un endpoint JSON léger. RLS inchangé, s'applique comme
// avant.
export async function GET() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }

  const supabase = await createClient();
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  async function chargerManagers() {
    if (!isAdminOrManager) return [] as { id: string; full_name: string | null }[];

    const { data } = await supabase
      .from("profile_roles")
      .select("profiles!profile_roles_profile_id_fkey!inner(id, full_name, status)")
      .eq("role", "manager")
      .eq("profiles.status", "actif");

    return (data ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return p as { id: string; full_name: string | null };
    });
  }

  async function chargerMaraudesAvecInscriptions() {
    const { data } = await supabase
      .from("maraudes")
      .select(
        "id, date_heure, statut, manager_id, manager:manager_id(full_name), inscriptions_maraude(id, maraude_id, user_id, statut)",
      )
      .order("date_heure", { ascending: true });
    return data ?? [];
  }

  const [managers, maraudes] = await Promise.all([
    chargerManagers(),
    chargerMaraudesAvecInscriptions(),
  ]);

  return NextResponse.json({ managers, maraudes });
}
