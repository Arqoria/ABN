import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par candidatures-client.tsx — voir docs/Tasks.md,
// "Chantier lancé". Réservé aux Admins, RLS inchangé.
export async function GET() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }
  if (!profile.roles.includes("admin")) {
    return NextResponse.json({ error: "reserve_admin" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: candidatures } = await supabase
    .from("candidatures_benevolat")
    .select("id, nom_complet, email, telephone, message, traitee, created_at")
    .order("created_at", { ascending: false });

  return NextResponse.json({ candidatures: candidatures ?? [] });
}
