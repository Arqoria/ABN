"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type ActionState = { error: string } | undefined;

// Toute la logique de capacité (max 6, liste d'attente) est déjà gérée en
// base par le trigger set_inscription_statut (Étape 3) — cette Server
// Action se contente d'insérer, jamais de calculer/forcer un statut ici.

export async function creerMaraude(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  if (caller.role !== "admin" && caller.role !== "manager") {
    return { error: "Action réservée aux Admins/Managers." };
  }

  const dateHeure = formData.get("dateHeure");
  const managerId = formData.get("managerId");

  if (typeof dateHeure !== "string" || !dateHeure) {
    return { error: "Date et heure requises." };
  }
  if (typeof managerId !== "string" || !managerId) {
    return { error: "Manager requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("maraudes").insert({
    date_heure: new Date(dateHeure).toISOString(),
    manager_id: managerId,
  });

  if (error) {
    return { error: "Impossible de créer la maraude." };
  }

  revalidatePath("/dashboard/maraudes");
  return undefined;
}

export async function inscrireMaraude(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  const maraudeId = formData.get("maraudeId");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inscriptions_maraude").insert({
    maraude_id: maraudeId,
    user_id: caller.id,
  });

  if (error) {
    return { error: "Impossible de s'inscrire." };
  }

  revalidatePath("/dashboard/maraudes");
  return undefined;
}

// Un désistement passe toujours par une mise à jour de statut, jamais une
// suppression (historique conservé, voir migration Étape 3). Le bénévole ne
// peut désister QUE sa propre inscription — c'est la policy RLS
// inscriptions_update_own_desist qui l'impose, pas cette action.
export async function seDesisterMaraude(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const inscriptionId = formData.get("inscriptionId");

  if (typeof inscriptionId !== "string" || !inscriptionId) {
    return { error: "Inscription introuvable." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inscriptions_maraude")
    .update({ statut: "desiste" })
    .eq("id", inscriptionId);

  if (error) {
    return { error: "Impossible de se désister." };
  }

  revalidatePath("/dashboard/maraudes");
  return undefined;
}
