"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// RLS (inscriptions_update_admin_manager, déjà existante) fait la vraie
// vérification — Admin ou Manager (tout Manager, pas juste celui de cette
// maraude, comportement déjà en place avant ce chantier). L'écran
// (/dashboard/maraudes/[id]/depart) restreint déjà l'affichage du bouton au
// Manager de cette maraude + Admin. confirmee_par/confirmee_le forcés côté
// serveur par le trigger force_inscription_presence_meta.
export async function confirmerPresence(inscriptionId: string, presenceConfirmee: boolean) {
  const supabase = await createClient();
  await supabase
    .from("inscriptions_maraude")
    .update({ presence_confirmee: presenceConfirmee })
    .eq("id", inscriptionId);

  revalidatePath("/dashboard/maraudes");
}
