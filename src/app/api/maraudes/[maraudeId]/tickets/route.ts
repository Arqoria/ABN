import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";

// Consommé par tickets-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// RLS (chacun ne voit que ses propres tickets, Admin voit tout) inchangé.
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
  const { data: tickets } = await supabase
    .from("tickets_depense")
    .select("id, montant, categorie, photo_path, statut_remboursement, created_at")
    .eq("maraude_id", maraudeId)
    .order("created_at", { ascending: false });

  const paths = (tickets ?? []).map((t) => t.photo_path as string);
  const { data: signedUrls } = paths.length
    ? await supabase.storage.from("tickets-depense").createSignedUrls(paths, 60 * 5)
    : { data: [] as { path: string | null; signedUrl: string }[] };

  const urlByPath = Object.fromEntries(
    (signedUrls ?? []).filter((s) => s.path).map((s) => [s.path as string, s.signedUrl]),
  );

  return NextResponse.json({ tickets: tickets ?? [], urlByPath });
}
