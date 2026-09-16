import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par dashboard-home-client.tsx (page d'accueil du dashboard) —
// voir docs/Tasks.md, "Chantier lancé". Ne renvoie le compte que pour un
// Admin (comme avant), toujours protégé par getCurrentProfile()/RLS.
export async function GET() {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }

  let comptesEnAttenteCount = 0;
  if (profile.roles.includes("admin")) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "en_attente");
    comptesEnAttenteCount = count ?? 0;
  }

  return NextResponse.json({ comptesEnAttenteCount });
}
