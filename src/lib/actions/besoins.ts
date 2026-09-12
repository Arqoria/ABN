"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES_BESOIN, type CategorieBesoin } from "@/lib/categorie-besoin";

export type ActionState = { error: string } | undefined;

// RLS (besoins_signales_insert_self_or_admin_manager) impose déjà compte
// actif + (participant inscrit OU Admin OU Manager de la maraude) ; le
// trigger check_besoin_signale_user_participant vérifie en plus
// l'inscription réelle. user_id est forcé côté serveur par le trigger
// force_besoin_signale_user_id, jamais confié au client.
export async function signalerBesoin(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const maraudeId = formData.get("maraudeId");
  const categorie = formData.get("categorie");
  const commentaire = formData.get("commentaire");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (
    typeof categorie !== "string" ||
    !CATEGORIES_BESOIN.includes(categorie as CategorieBesoin)
  ) {
    return { error: "Choisissez une catégorie." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("besoins_signales").insert({
    maraude_id: maraudeId,
    categorie,
    commentaire: typeof commentaire === "string" && commentaire.trim() ? commentaire.trim() : null,
  });

  if (error) {
    return { error: "Impossible d'enregistrer le besoin." };
  }

  revalidatePath(`/dashboard/maraudes/${maraudeId}/besoins`);
  return undefined;
}
