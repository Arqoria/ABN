import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MaraudeCarte from "./maraude-carte-client";

// Centre par défaut si aucune donnée exploitable (Nice, place Masséna) —
// juste un point de départ visuel pour la carte, aucune signification métier.
const CENTRE_PAR_DEFAUT = { lat: 43.6961, lng: 7.2717 };

// Lecture (heatmap + circuit réel) : Admin, Manager de la maraude, ou tout
// participant inscrit (RLS circuits_planifies_select_... l'autorise déjà ;
// pour points_passage_geo la lecture reste réservée Admin/Manager par RLS,
// donc un simple participant verra une carte sans heatmap/circuit réel —
// comportement normal, pas une faille : docs/Specs.md réserve ces données
// détaillées à Admin/Manager). Écriture du circuit planifié : Admin ou
// Manager de CETTE maraude uniquement.
export default async function CarteMaraudePage({
  params,
}: {
  params: Promise<{ maraudeId: string }>;
}) {
  const { maraudeId } = await params;
  const profile = await getCurrentProfile();

  if (profile.status !== "actif") {
    redirect("/compte-en-attente");
  }

  const supabase = await createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    redirect("/dashboard/maraudes");
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
      redirect("/dashboard/maraudes");
    }
  }

  // Circuit réellement effectué pour CETTE maraude, chaîné chronologiquement.
  const { data: pointsReel } = await supabase
    .from("points_passage_geo")
    .select("lat, lng, type_action, horodatage")
    .eq("maraude_id", maraudeId)
    .order("horodatage", { ascending: true });

  // Heatmap : historique visible par l'appelant (RLS limite déjà un Manager
  // à ses propres maraudes, un Admin voit tout) — sert de fond de carte pour
  // aider à définir le circuit planifié.
  const { data: pointsHeat } = await supabase
    .from("points_passage_geo")
    .select("lat, lng")
    .limit(5000);

  const { data: circuitPlanifie } = await supabase
    .from("circuits_planifies")
    .select("points")
    .eq("maraude_id", maraudeId)
    .maybeSingle();

  const circuitReel = (pointsReel ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
    typeAction: p.type_action as
      | "repas_distribue"
      | "personne_aidee"
      | "personne_rencontree"
      | "orientation_sociale",
    horodatage: p.horodatage as string,
  }));

  const heatPoints = (pointsHeat ?? []).map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
  }));

  const circuitPlanifieInitial =
    (circuitPlanifie?.points as { lat: number; lng: number }[] | null) ?? [];

  const center =
    circuitReel[0] ?? heatPoints[0] ?? circuitPlanifieInitial[0] ?? CENTRE_PAR_DEFAUT;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Carte de la maraude
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Heatmap de l&apos;historique, circuit réellement effectué, et
          circuit planifié{canEdit ? " — cliquez pour le définir" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carte</CardTitle>
        </CardHeader>
        <CardContent>
          <MaraudeCarte
            maraudeId={maraudeId}
            center={center}
            heatPoints={heatPoints}
            circuitReel={circuitReel}
            circuitPlanifieInitial={circuitPlanifieInitial}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
