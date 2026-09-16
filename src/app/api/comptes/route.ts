import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import type { RoleName } from "@/lib/roles";
import type { FonctionBureau } from "@/lib/fonction-bureau";
import { createClient } from "@/lib/supabase/server";

// Consommé par comptes-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// Réservé aux Admins, comme avant (403 sinon) — RLS inchangé.
export async function GET() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }
  if (!profile.roles.includes("admin")) {
    return NextResponse.json({ error: "reserve_admin" }, { status: 403 });
  }

  const supabase = await createClient();

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

    return { comptesEnAttente: comptesEnAttente ?? [], roleRows: roleRows ?? [] };
  }

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

  return NextResponse.json({ comptesEnAttente, roleRows, admins });
}
