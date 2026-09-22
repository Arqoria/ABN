"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { calculerTraceReel, type GeometrieLigne } from "@/lib/ors";

export type ActionState =
  | { error: string }
  | { success: true; geometrieReelle: GeometrieLigne | null }
  | undefined;

type Point = { lat: number; lng: number };

function parsePoints(raw: unknown): Point[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const points: Point[] = [];
  for (const p of parsed) {
    if (
      typeof p !== "object" ||
      p === null ||
      typeof (p as Point).lat !== "number" ||
      typeof (p as Point).lng !== "number" ||
      !Number.isFinite((p as Point).lat) ||
      !Number.isFinite((p as Point).lng)
    ) {
      return null;
    }
    points.push({ lat: (p as Point).lat, lng: (p as Point).lng });
  }
  return points;
}

// RLS (circuits_planifies_insert/update_admin_or_own_manager) impose déjà
// Admin ou Manager de CETTE maraude — cette action ne fait qu'un upsert sur
// maraude_id (un seul circuit planifié par maraude, le redéfinir écrase le
// précédent). updated_by/updated_at sont forcés côté serveur par le trigger
// force_circuit_planifie_meta, jamais confiés au client.
export async function enregistrerCircuitPlanifie(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await getCurrentProfile();
  const maraudeId = formData.get("maraudeId");
  const points = parsePoints(formData.get("points"));

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (!points) {
    return { error: "Tracé invalide." };
  }

  // Recalculé à chaque enregistrement, jamais réutilisé de la fois d'avant
  // — sinon un appel qui échoue après une modification des points laisserait
  // une géométrie qui ne correspond plus au tracé actuel, silencieusement
  // fausse. null explicite ici efface toute ancienne valeur en cas d'échec.
  const geometrieReelle = await calculerTraceReel(points);

  const supabase = await createClient();
  const { error } = await supabase.from("circuits_planifies").upsert(
    { maraude_id: maraudeId, points, geometrie_reelle: geometrieReelle },
    { onConflict: "maraude_id" },
  );

  if (error) {
    return { error: "Impossible d'enregistrer le circuit." };
  }

  revalidatePath(`/dashboard/maraudes/${maraudeId}/carte`);
  return { success: true, geometrieReelle };
}

// Vide le circuit planifié (repart de zéro) — même politique RLS que
// l'update (DELETE), pas besoin de re-vérifier ici.
export async function supprimerCircuitPlanifie(maraudeId: string) {
  const supabase = await createClient();
  await supabase.from("circuits_planifies").delete().eq("maraude_id", maraudeId);
  revalidatePath(`/dashboard/maraudes/${maraudeId}/carte`);
}
