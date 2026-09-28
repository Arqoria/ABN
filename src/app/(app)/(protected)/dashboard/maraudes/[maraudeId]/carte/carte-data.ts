import { createClient } from "@/lib/supabase/client";
import type { TypeAction } from "@/lib/type-action";
import type { OrganismeOrientation } from "@/lib/organisme-orientation";
import type { GeometrieLigne } from "@/lib/ors";

// Extrait de carte-client.tsx (refonte 28/09) : partagé entre la page
// dédiée /carte et la carte intégrée à l'onglet "Parcours & Terrain" du
// panneau de détail — même clé react-query ["carte", maraudeId], donc même
// forme de données garantie des deux côtés.

// Centre par défaut si aucune donnée exploitable (Nice, place Masséna) —
// juste un point de départ visuel, aucune signification métier.
export const CENTRE_PAR_DEFAUT = { lat: 43.6961, lng: 7.2717 };

export type CircuitPoint = {
  lat: number;
  lng: number;
  typeAction: TypeAction;
  horodatage: string;
  orientationVers: OrganismeOrientation | null;
  orientationVersAutre: string | null;
};
export type CartePayload = {
  circuitReel: CircuitPoint[];
  heatPoints: { lat: number; lng: number }[];
  circuitPlanifieInitial: { lat: number; lng: number }[];
  circuitPlanifieGeometrieInitial: GeometrieLigne | null;
  canEdit: boolean;
  refuse: boolean;
};

const REFUS: CartePayload = {
  circuitReel: [],
  heatPoints: [],
  circuitPlanifieInitial: [],
  circuitPlanifieGeometrieInitial: null,
  canEdit: false,
  refuse: true,
};

// Lecture directe Supabase depuis le navigateur — page la plus lourde du
// dashboard (heatmap jusqu'à 5000 points), celle qui profite le plus de
// sortir du rendu serveur bloquant. Voir docs/Tasks.md, "Chantier lancé,
// suite (16/09)".
export async function fetchCarte(
  maraudeId: string,
  profileId: string,
  isAdmin: boolean,
): Promise<CartePayload> {
  const supabase = createClient();

  const { data: maraude } = await supabase
    .from("maraudes")
    .select("id, date_heure, manager_id")
    .eq("id", maraudeId)
    .single();

  if (!maraude) {
    return REFUS;
  }

  const isOwnManager = maraude.manager_id === profileId;
  const canEdit = isAdmin || isOwnManager;

  if (!canEdit) {
    const { data: inscription } = await supabase
      .from("inscriptions_maraude")
      .select("statut")
      .eq("maraude_id", maraudeId)
      .eq("user_id", profileId)
      .maybeSingle();

    if (inscription?.statut !== "inscrit") {
      return REFUS;
    }
  }

  const [{ data: pointsReel }, { data: pointsHeat }, { data: pointsParcours }, { data: circuitPlanifie }] =
    await Promise.all([
      supabase
        .from("points_passage_geo")
        .select("lat, lng, type_action, horodatage, orientation_vers, orientation_vers_autre")
        .eq("maraude_id", maraudeId)
        .order("horodatage", { ascending: true }),
      supabase.from("points_passage_geo").select("lat, lng").limit(5000),
      // Parcours réel (chrono, 24/09) : agrégé dans la MÊME heatmap de
      // densité que points_passage — simple couche de fond, pas de type
      // d'action associé (contrairement à circuitReel ci-dessus, qui reste
      // uniquement basé sur points_passage). Voir docs/Specs.md.
      supabase.from("parcours_reels_points_geo").select("lat, lng").limit(5000),
      supabase
        .from("circuits_planifies")
        .select("points, geometrie_reelle")
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

  const heatPoints = [...(pointsHeat ?? []), ...(pointsParcours ?? [])].map((p) => ({
    lat: p.lat as number,
    lng: p.lng as number,
  }));

  const circuitPlanifieInitial =
    (circuitPlanifie?.points as { lat: number; lng: number }[] | null) ?? [];
  const circuitPlanifieGeometrieInitial =
    (circuitPlanifie?.geometrie_reelle as GeometrieLigne | null) ?? null;

  return {
    circuitReel,
    heatPoints,
    circuitPlanifieInitial,
    circuitPlanifieGeometrieInitial,
    canEdit,
    refuse: false,
  };
}
