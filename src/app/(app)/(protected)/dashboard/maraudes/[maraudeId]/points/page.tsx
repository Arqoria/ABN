import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CapturePointForm } from "./capture-point-form";

// Réservée aux bénévoles réellement inscrits à CETTE maraude (le trigger
// check_points_passage_user_participant l'imposerait de toute façon à
// l'insertion) + Admin/Manager. Écriture seule : la lecture (compteurs,
// heatmap) est réservée à Admin/Manager de la maraude par RLS (Étape 6),
// prévue à l'Étape 9 (Reporting & KPIs) — pas de liste/compteur ici.
export default async function PointsPassagePage({
  params,
}: {
  params: Promise<{ maraudeId: string }>;
}) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
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
      redirect("/dashboard/maraudes");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Points de passage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un tap = une action. La position est arrondie automatiquement
          (~100m), jamais stockée précisément.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CapturePointForm maraudeId={maraudeId} userId={profile.id} />
        </CardContent>
      </Card>
    </div>
  );
}
