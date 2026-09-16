import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/lib/roles";

// Consommé par equipe-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// Même logique/RLS que l'ancienne page 100% serveur.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ maraudeId: string }> },
) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }

  const supabase = await createClient();

  const [{ data: maraude }, { data: inscriptions }, { data: affectations }] =
    await Promise.all([
      supabase.from("maraudes").select("id, manager_id").eq("id", maraudeId).single(),
      supabase
        .from("inscriptions_maraude")
        .select("user_id, profil:user_id(full_name)")
        .eq("maraude_id", maraudeId)
        .eq("statut", "inscrit"),
      supabase.from("affectations_maraude").select("user_id, fonction").eq("maraude_id", maraudeId),
    ]);

  if (!maraude) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  const isAdmin = profile.roles.includes("admin");
  const isOwnManager = maraude.manager_id === profile.id;
  const canManageOthers = isAdmin || isOwnManager;

  const estInscrit = (inscriptions ?? []).some((i) => i.user_id === profile.id);
  if (!canManageOthers && !estInscrit) {
    return NextResponse.json({ error: "non_inscrit" }, { status: 403 });
  }

  const participantIds = (inscriptions ?? []).map((i) => i.user_id as string);
  const { data: roleRows } = participantIds.length
    ? await supabase
        .from("profile_roles")
        .select("profile_id, role")
        .in("profile_id", participantIds)
    : { data: [] as { profile_id: string; role: RoleName }[] };

  return NextResponse.json({
    inscriptions: inscriptions ?? [],
    affectations: affectations ?? [],
    roleRows: roleRows ?? [],
    managerId: maraude.manager_id,
  });
}
