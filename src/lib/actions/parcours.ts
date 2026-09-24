"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string } | undefined;

// RLS (parcours_reels_insert_admin_ou_manager) réserve ceci à l'Admin ou au
// Manager de cette maraude. L'index unique partiel
// parcours_reels_un_seul_en_cours_idx empêche deux chronos "en_cours"
// simultanés pour la même maraude — remonté ici comme message clair plutôt
// que l'erreur Postgres brute.
export async function demarrerParcours(
  maraudeId: string,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parcours_reels")
    .insert({ maraude_id: maraudeId })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Un parcours est déjà en cours pour cette maraude, ou action non autorisée." };
  }

  revalidatePath("/dashboard/maraudes");
  return { id: data.id as string };
}

// RLS (parcours_reels_points_insert_admin_ou_manager) impose en plus que le
// parcours visé soit encore 'en_cours' — jamais de point ajouté après
// "Terminer". geo_arrondi recalé sur la grille ~100m côté serveur par le
// trigger force_geo_arrondi (même mécanisme que points_passage).
export async function ajouterPointParcours(
  parcoursReelId: string,
  lat: number,
  lng: number,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("parcours_reels_points").insert({
    parcours_reel_id: parcoursReelId,
    geo_arrondi: `SRID=4326;POINT(${lng} ${lat})`,
  });

  if (error) {
    return { error: "Point non enregistré." };
  }
  return undefined;
}

export async function terminerParcours(parcoursReelId: string) {
  const supabase = await createClient();
  await supabase
    .from("parcours_reels")
    .update({ statut: "termine", termine_le: new Date().toISOString() })
    .eq("id", parcoursReelId);

  revalidatePath("/dashboard/maraudes");
}
