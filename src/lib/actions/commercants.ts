"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type ActionState = { error: string } | undefined;

// RLS (commercants_partenaires_insert_admin) impose déjà Admin + compte
// actif ; cette action ne fait qu'insérer.
export async function creerCommercant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const nom = formData.get("nom");
  const notes = formData.get("notes");

  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Le nom est requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("commercants_partenaires").insert({
    nom: nom.trim(),
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  });

  if (error) {
    return { error: error.message.includes("unique") ? "Ce commerçant existe déjà." : "Impossible de créer le commerçant." };
  }

  revalidatePath("/dashboard/cuisine/commercants");
  return undefined;
}

// Édite nom/notes d'un commerçant existant — RLS
// (commercants_partenaires_update_admin) impose déjà Admin.
export async function modifierCommercant(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id");
  const nom = formData.get("nom");
  const notes = formData.get("notes");

  if (typeof id !== "string" || !id) {
    return { error: "Commerçant introuvable." };
  }
  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Le nom est requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("commercants_partenaires")
    .update({ nom: nom.trim(), notes: typeof notes === "string" && notes.trim() ? notes.trim() : null })
    .eq("id", id);

  if (error) {
    return { error: error.message.includes("unique") ? "Ce nom existe déjà." : "Impossible de modifier le commerçant." };
  }

  revalidatePath("/dashboard/cuisine/commercants");
  return undefined;
}

// Jamais de suppression physique (voir migration) — seulement basculer
// actif. Un commerçant désactivé disparaît du menu déroulant du formulaire
// de don, mais reste lisible sur l'historique des dons déjà enregistrés à
// son nom.
export async function basculerActifCommercant(id: string, actif: boolean) {
  const supabase = await createClient();
  await supabase.from("commercants_partenaires").update({ actif }).eq("id", id);
  revalidatePath("/dashboard/cuisine/commercants");
}
