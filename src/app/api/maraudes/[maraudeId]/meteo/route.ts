import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par meteo-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// Réservé à Admin + Manager DE CETTE maraude (RLS l'impose de toute
// façon), même logique que l'ancienne page 100% serveur. Météo bénévole
// jamais visible par les pairs — voir CLAUDE.md.
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

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  const isAdmin = profile.roles.includes("admin");
  const isOwnManager = maraude.manager_id === profile.id;
  if (!isAdmin && !isOwnManager) {
    return NextResponse.json({ error: "non_autorise" }, { status: 403 });
  }

  const [{ data: inscriptions }, { data: meteos }] = await Promise.all([
    supabase
      .from("inscriptions_maraude")
      .select("user_id, profil:user_id(full_name)")
      .eq("maraude_id", maraudeId)
      .eq("statut", "inscrit"),
    supabase.from("meteo_benevole_saisies").select("user_id, valeur").eq("maraude_id", maraudeId),
  ]);

  return NextResponse.json({
    inscriptions: inscriptions ?? [],
    meteos: meteos ?? [],
  });
}
