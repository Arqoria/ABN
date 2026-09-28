"use server";

import { createClient } from "@/lib/supabase/server";

// RLS (inscriptions_update_admin_manager, déjà existante) fait la vraie
// vérification — Admin ou Manager (tout Manager, pas juste celui de cette
// maraude, comportement déjà en place avant ce chantier). L'écran
// (/dashboard/maraudes/[id]/depart) restreint déjà l'affichage du bouton au
// Manager de cette maraude + Admin. confirmee_par/confirmee_le forcés côté
// serveur par le trigger force_inscription_presence_meta.
//
// Renvoie une erreur (28/09) pour que l'affichage optimiste du client puisse
// être annulé — y compris un refus RLS, qui ne lève pas d'erreur mais
// modifie 0 ligne (d'où le .select()).
export async function confirmerPresence(
  inscriptionId: string,
  presenceConfirmee: boolean,
): Promise<{ error: string } | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inscriptions_maraude")
    .update({ presence_confirmee: presenceConfirmee })
    .eq("id", inscriptionId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Présence non enregistrée." };
  }
  return undefined;
}
