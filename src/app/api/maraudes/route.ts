import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// EXPÉRIMENTAL (15/09) — preuve de concept cache local, voir
// src/lib/offline/db.ts et docs/Tasks.md. Même logique de chargement que
// l'ancienne version 100% serveur de /dashboard/maraudes (RLS/garde-fous
// identiques, rien n'est assoupli pour cette route) — juste exposée en JSON
// pour être appelée depuis le client plutôt que bloquer le rendu de la page.
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
