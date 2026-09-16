import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Vérification d'accès générique "Admin/Manager OU inscrit à cette
// maraude" — utilisée par les pages qui n'ont besoin de rien d'autre
// (ex. points de passage, formulaire d'écriture seule sans liste à
// afficher). Voir docs/Tasks.md, "Chantier lancé". La vraie barrière
// reste le trigger check_points_passage_user_participant à l'insertion —
// ceci n'est qu'une redirection propre côté UI, comme avant.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ maraudeId: string }> },
) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }

  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  if (!isAdminOrManager) {
    const supabase = await createClient();
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (inscription?.statut !== "inscrit") {
      return NextResponse.json({ error: "non_inscrit" }, { status: 403 });
    }
  }

  return NextResponse.json({ allowed: true });
}
