"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string } | { success: true } | undefined;

// Formulaire public (site vitrine, sans authentification) — RLS
// (candidatures_benevolat_insert_public) autorise anon en insert uniquement,
// jamais en lecture. "site" est un champ honeypot invisible en CSS : un
// visiteur humain ne le remplit jamais, un bot générique qui remplit tous
// les champs si — s'il est rempli, on fait semblant d'accepter (pas
// d'indice donné au bot) mais on n'enregistre rien.
export async function soumettreCandidature(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const honeypot = formData.get("site");
  if (typeof honeypot === "string" && honeypot.trim()) {
    return { success: true };
  }

  const nomComplet = formData.get("nomComplet");
  const email = formData.get("email");
  const telephone = formData.get("telephone");
  const message = formData.get("message");

  if (typeof nomComplet !== "string" || !nomComplet.trim()) {
    return { error: "Votre nom est requis." };
  }
  if (typeof email !== "string" || !email.trim() || !email.includes("@")) {
    return { error: "Une adresse email valide est requise." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("candidatures_benevolat").insert({
    nom_complet: nomComplet.trim(),
    email: email.trim(),
    telephone: typeof telephone === "string" && telephone.trim() ? telephone.trim() : null,
    message: typeof message === "string" && message.trim() ? message.trim() : null,
  });

  if (error) {
    return { error: "Impossible d'envoyer votre candidature pour l'instant. Réessayez plus tard." };
  }

  return { success: true };
}

// RLS (candidatures_benevolat_update_admin) impose déjà Admin — cette
// action ne fait que basculer le statut "traitée".
export async function marquerCandidatureTraitee(id: string, traitee: boolean) {
  const supabase = await createClient();
  await supabase.from("candidatures_benevolat").update({ traitee }).eq("id", id);
  revalidatePath("/dashboard/adherents");
}
