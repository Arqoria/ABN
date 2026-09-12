"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MeteoState =
  | { status: "error"; message: string }
  | { status: "success" }
  | undefined;

const VALEURS = ["vert", "jaune", "rouge"] as const;
type Valeur = (typeof VALEURS)[number];

// Une seule action pour tout le monde : self-service (bénévole qui transmet
// sa propre météo, une fois — contrainte unique en base) ET Admin/Manager qui
// corrige une saisie existante. La sécurité vient entièrement de RLS, pas de
// cette fonction : on tente d'abord un insert (self ou Admin/Manager peuvent
// tous les deux insérer une NOUVELLE ligne) ; en cas de conflit (déjà
// saisie), on tente une mise à jour — que seul Admin/Manager peut faire
// (policy meteo_admin_or_own_manager_update). Si cette mise à jour échoue
// (bénévole non autorisé), le message reste neutre : on ne confirme ni
// n'infirme qu'une météo existe déjà, cohérent avec le fait qu'un bénévole ne
// doit jamais pouvoir déduire sa propre valeur passée.
export async function saisirMeteo(
  _prevState: MeteoState,
  formData: FormData,
): Promise<MeteoState> {
  const maraudeId = formData.get("maraudeId");
  const userId = formData.get("userId");
  const valeur = formData.get("valeur");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { status: "error", message: "Maraude introuvable." };
  }
  if (typeof userId !== "string" || !userId) {
    return { status: "error", message: "Bénévole introuvable." };
  }
  if (typeof valeur !== "string" || !VALEURS.includes(valeur as Valeur)) {
    return { status: "error", message: "Valeur invalide." };
  }

  const supabase = await createClient();

  const { error: insertError } = await supabase
    .from("meteo_benevole_saisies")
    .insert({ maraude_id: maraudeId, user_id: userId, valeur });

  if (!insertError) {
    revalidatePath("/dashboard/maraudes");
    revalidatePath(`/dashboard/maraudes/${maraudeId}/meteo`);
    return { status: "success" };
  }

  if (insertError.code === "23505") {
    const { error: updateError } = await supabase
      .from("meteo_benevole_saisies")
      .update({ valeur })
      .eq("maraude_id", maraudeId)
      .eq("user_id", userId);

    if (updateError) {
      return {
        status: "error",
        message: "Une météo a déjà été transmise pour ce bénévole sur cette maraude.",
      };
    }

    revalidatePath(`/dashboard/maraudes/${maraudeId}/meteo`);
    return { status: "success" };
  }

  return { status: "error", message: "Impossible d'enregistrer la météo." };
}
