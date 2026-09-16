import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par besoins-client.tsx — voir docs/Tasks.md, "Chantier lancé".
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
  const isAdminOrManager =
    profile.roles.includes("admin") || profile.roles.includes("manager");

  if (!isAdminOrManager) {
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

  const { data: besoins } = await supabase
    .from("besoins_signales")
    .select("id, categorie, commentaire, created_at, profil:user_id(full_name)")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ besoins: besoins ?? [] });
}
