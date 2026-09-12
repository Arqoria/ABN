"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type ActionState = { error: string } | undefined;

const TYPES_ACTION = [
  "repas_distribue",
  "personne_aidee",
  "orientation_sociale",
] as const;
type TypeAction = (typeof TYPES_ACTION)[number];

// geo_arrondi est TOUJOURS recalé sur une grille ~100m côté serveur (trigger
// force_geo_arrondi, Étape 6) quelle que soit la précision envoyée ici —
// jamais de position exacte stockée. Le trigger
// check_points_passage_user_participant impose que l'utilisateur soit
// réellement inscrit à la maraude.
export async function capturerPointPassage(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  const maraudeId = formData.get("maraudeId");
  const typeAction = formData.get("typeAction");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (
    typeof typeAction !== "string" ||
    !TYPES_ACTION.includes(typeAction as TypeAction)
  ) {
    return { error: "Type d'action invalide." };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Position introuvable." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("points_passage").insert({
    maraude_id: maraudeId,
    user_id: caller.id,
    type_action: typeAction,
    // Format EWKT — Postgres/PostGIS l'interprète nativement pour une
    // colonne geography.
    geo_arrondi: `SRID=4326;POINT(${lng} ${lat})`,
  });

  if (error) {
    return { error: "Impossible d'enregistrer." };
  }

  return undefined;
}
