"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type ActionState = { error: string } | undefined;

// RLS (Étape 5) impose déjà cuisinier_id = auth.uid() (ou Admin/Manager) et
// un compte actif — cette action ne fait qu'insérer, aucune logique de
// sécurité ici. Le trigger check_repas_cuisinier_role impose en plus que
// cuisinier_id désigne un profil ayant réellement le rôle Cuisinier.
export async function ajouterRepas(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  const maraudeId = formData.get("maraudeId");
  const quoi = formData.get("quoi");
  const quantite = formData.get("quantite");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (typeof quoi !== "string" || !quoi.trim()) {
    return { error: "Décrivez ce qui a été préparé." };
  }
  const quantiteNum = Number(quantite);
  if (!Number.isInteger(quantiteNum) || quantiteNum <= 0) {
    return { error: "Quantité invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("repas").insert({
    maraude_id: maraudeId,
    cuisinier_id: caller.id,
    quoi: quoi.trim(),
    quantite: quantiteNum,
  });

  if (error) {
    return { error: "Impossible d'enregistrer le repas." };
  }

  revalidatePath(`/dashboard/maraudes/${maraudeId}/repas`);
  return undefined;
}
