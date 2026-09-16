import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import type { TypeAction } from "@/lib/type-action";
import type { OrganismeOrientation } from "@/lib/organisme-orientation";

// Consommé par carte-client.tsx — voir docs/Tasks.md, "Chantier lancé".
// Page la plus lourde du dashboard (heatmap jusqu'à 5000 points) — celle
// qui profite le plus de sortir du rendu serveur bloquant à chaque
// navigation. Même logique/RLS que l'ancienne page 100% serveur.
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
  const canEdit = isAdmin || isOwnManager;

  if (!canEdit) {
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

  const [{ data: pointsReel }, { data: pointsHeat }, { data: circuitPlanifie }] =
    await Promise.all([
      supabase
        .from("points_passage_geo")
        .select("lat, lng, type_action, horodatage, orientation_vers, orientation_vers_autre")
        .eq("maraude_id", maraudeId)
        .order("horodatage", { ascending: true }),
      supabase.from("points_passage_geo").select("lat, lng").limit(5000),
      supabase
        .from("circuits_planifies")
        .select("points")
        .eq("maraude_id", maraudeId)
        .maybeSingle(),
    ]);

  const circuitReel = (pointsReel ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
    typeAction: p.type_action as TypeAction,
    horodatage: p.horodatage as string,
    orientationVers: p.orientation_vers as OrganismeOrientation | null,
    orientationVersAutre: p.orientation_vers_autre as string | null,
  }));

  const heatPoints = (pointsHeat ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
  }));

  const circuitPlanifieInitial =
    (circuitPlanifie?.points as { lat: number; lng: number }[] | null) ?? [];

  return NextResponse.json({
    circuitReel,
    heatPoints,
    circuitPlanifieInitial,
    canEdit,
  });
}
