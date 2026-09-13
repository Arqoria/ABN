"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FONCTIONS_MARAUDE, type FonctionMaraude } from "@/lib/fonction-maraude";

export type ActionState = { error: string } | undefined;

// RLS (affectations_maraude_insert_self_or_admin_manager) + le trigger
// check_affectation_maraude_qualification font toute la vérification :
// soi-même (si qualifié et inscrit), Admin, ou Manager de cette maraude —
// cette action ne fait qu'insérer. assigned_by est forcé côté serveur par
// trigger, jamais confié au client.
export async function affecterFonction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const maraudeId = formData.get("maraudeId");
  const userId = formData.get("userId");
  const fonction = formData.get("fonction");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (typeof userId !== "string" || !userId) {
    return { error: "Profil introuvable." };
  }
  if (
    typeof fonction !== "string" ||
    !FONCTIONS_MARAUDE.includes(fonction as FonctionMaraude)
  ) {
    return { error: "Fonction invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("affectations_maraude").insert({
    maraude_id: maraudeId,
    user_id: userId,
    fonction,
  });

  if (error) {
    // Message générique : l'erreur réelle (pas qualifié, pas inscrit, déjà
    // affecté) vient du trigger/de la contrainte unique, pas toujours
    // adaptée à afficher telle quelle.
    return { error: "Impossible d'affecter cette fonction (rôle requis ou déjà affecté)." };
  }

  revalidatePath("/dashboard/maraudes");
  return undefined;
}

export async function retirerAffectation(
  maraudeId: string,
  userId: string,
  fonction: FonctionMaraude,
) {
  const supabase = await createClient();
  await supabase
    .from("affectations_maraude")
    .delete()
    .eq("maraude_id", maraudeId)
    .eq("user_id", userId)
    .eq("fonction", fonction);

  revalidatePath("/dashboard/maraudes");
}
