import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { getRapportsData } from "@/lib/rapports";

// Consommé par rapports-client.tsx — voir docs/Tasks.md, "Chantier
// lancé". Réservé à Admin/Manager, RLS inchangé. Partage getRapportsData
// avec l'export .xlsx (/dashboard/rapports/export) pour ne jamais diverger.
export async function GET(req: Request) {
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    return NextResponse.json({ error: "compte_en_attente" }, { status: 403 });
  }
  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && !profile.roles.includes("manager")) {
    return NextResponse.json({ error: "reserve_admin_manager" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const supabase = await createClient();
  const data = await getRapportsData(supabase, { from, to, isAdmin });

  return NextResponse.json({ ...data, isAdmin });
}
