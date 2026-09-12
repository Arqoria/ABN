"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";

export type TicketState = { error: string } | undefined;

// Convention de chemin {user_id}/{fichier} : c'est ce que vérifient les
// policies Storage (Étape 5) pour la propriété, pas la colonne owner_id.
export async function creerTicket(
  _prevState: TicketState,
  formData: FormData,
): Promise<TicketState> {
  const caller = await getCurrentProfile();
  const maraudeId = formData.get("maraudeId");
  const montant = formData.get("montant");
  const photo = formData.get("photo");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }

  const montantNum = Number(montant);
  if (!Number.isFinite(montantNum) || montantNum <= 0) {
    return { error: "Montant invalide." };
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Une photo du ticket est requise." };
  }
  if (!photo.type.startsWith("image/")) {
    return { error: "Le fichier doit être une image." };
  }

  const supabase = await createClient();

  const extension = photo.name.split(".").pop() || "jpg";
  const path = `${caller.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("tickets-depense")
    .upload(path, photo, { contentType: photo.type });

  if (uploadError) {
    return { error: "Échec de l'envoi de la photo." };
  }

  const { error: insertError } = await supabase.from("tickets_depense").insert({
    maraude_id: maraudeId,
    user_id: caller.id,
    montant: montantNum,
    photo_path: path,
  });

  if (insertError) {
    // Nettoyage best-effort si l'insertion échoue après l'upload — évite un
    // fichier orphelin dans le bucket.
    await supabase.storage.from("tickets-depense").remove([path]);
    return { error: "Impossible d'enregistrer le ticket." };
  }

  revalidatePath(`/dashboard/maraudes/${maraudeId}/tickets`);
  return undefined;
}
