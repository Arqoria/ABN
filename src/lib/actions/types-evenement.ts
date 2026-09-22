"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type ActionState = { error: string } | undefined;

const NATURES = ["maraude", "evenement_fixe"] as const;
type Nature = (typeof NATURES)[number];

// RLS (types_evenement_insert_admin) impose déjà Admin + compte actif ;
// cette action ne fait qu'insérer. nature est fixe (2 valeurs, non
// éditable au-delà du choix initial), le nom est ce que l'Admin configure
// réellement.
export async function creerTypeEvenement(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const nom = formData.get("nom");
  const nature = formData.get("nature");
  const description = formData.get("description");

  if (typeof nom !== "string" || !nom.trim()) {
    return { error: "Le nom est requis." };
  }
  if (typeof nature !== "string" || !NATURES.includes(nature as Nature)) {
    return { error: "Choisissez une nature." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("types_evenement").insert({
    nom: nom.trim(),
    nature,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
  });

  if (error) {
    return { error: error.message.includes("unique") ? "Ce nom existe déjà." : "Impossible de créer le type." };
  }

  revalidatePath("/dashboard/types-evenement");
  return undefined;
}

// Jamais de suppression physique (voir migration) — seulement basculer
// actif. Utilisée aussi bien pour désactiver que réactiver un type.
export async function basculerActifTypeEvenement(id: string, actif: boolean) {
  const supabase = await createClient();
  await supabase.from("types_evenement").update({ actif }).eq("id", id);
  revalidatePath("/dashboard/types-evenement");
}
