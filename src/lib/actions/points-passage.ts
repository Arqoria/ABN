"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { ORGANISMES_ORIENTATION, type OrganismeOrientation } from "@/lib/organisme-orientation";

export type ActionState = { error: string } | undefined;

const TYPES_ACTION = [
  "repas_distribue",
  "personne_aidee",
  "personne_rencontree",
  "orientation_sociale",
] as const;
type TypeAction = (typeof TYPES_ACTION)[number];

// geo_arrondi est TOUJOURS recalé sur une grille ~100m côté serveur (trigger
// force_geo_arrondi, Étape 6) quelle que soit la précision envoyée ici —
// jamais de position exacte stockée. Le trigger
// check_points_passage_user_participant impose que l'utilisateur soit
// réellement inscrit à la maraude.
//
// orientation_vers/orientation_vers_autre : uniquement pour type_action =
// "orientation_sociale" (contrainte points_passage_orientation_vers_coherent
// en base, défense en profondeur — jamais de confiance dans la seule
// validation cliente). "autre" impose un texte libre non vide.
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

  let orientationVers: OrganismeOrientation | null = null;
  let orientationVersAutre: string | null = null;

  if (typeAction === "orientation_sociale") {
    const raw = formData.get("orientationVers");
    if (
      typeof raw !== "string" ||
      !ORGANISMES_ORIENTATION.includes(raw as OrganismeOrientation)
    ) {
      return { error: "Précisez vers quel organisme." };
    }
    orientationVers = raw as OrganismeOrientation;

    if (orientationVers === "autre") {
      const autre = formData.get("orientationVersAutre");
      if (typeof autre !== "string" || !autre.trim()) {
        return { error: "Précisez le nom de l'organisme." };
      }
      orientationVersAutre = autre.trim();
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("points_passage").insert({
    maraude_id: maraudeId,
    user_id: caller.id,
    type_action: typeAction,
    orientation_vers: orientationVers,
    orientation_vers_autre: orientationVersAutre,
    // Format EWKT — Postgres/PostGIS l'interprète nativement pour une
    // colonne geography.
    geo_arrondi: `SRID=4326;POINT(${lng} ${lat})`,
  });

  if (error) {
    return { error: "Impossible d'enregistrer." };
  }

  return undefined;
}
