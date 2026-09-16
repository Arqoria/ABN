import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par repas-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// Lecture large (RLS repas_select_authenticated) — pas de restriction
// supplémentaire ici, comme avant.
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
  const { data: repas } = await supabase
    .from("repas")
    .select("id, quoi, quantite, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ repas: repas ?? [] });
}
