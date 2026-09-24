"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIE_BESOIN_LABELS, type CategorieBesoin } from "@/lib/categorie-besoin";

export type ActionState = { error: string } | undefined;

// UUID déterministe (md5 hex → format uuid) : sert de clé stable pour les
// lignes "stock" de la checklist, qui n'ont pas de ligne unique en base à
// référencer (le stock actuel est une somme de mouvements) — voir le
// commentaire sur reference_id dans la migration
// 20260924100000_checklist_presence_parcours.sql.
function idDeterministe(cle: string): string {
  const hex = createHash("md5").update(cle).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Régénère la checklist depuis l'état actuel du stock et des dons ponctuels
// de cette maraude — idempotent (upsert sur l'index unique
// checklist_depart_items_auto_unique_idx), jamais de doublon, ne touche
// jamais aux lignes déjà cochées ni aux lignes "libre" du Manager. RLS
// (checklist_depart_items_insert/update_manager_ou_affecte) fait la vraie
// vérification de permission — si l'appelant n'a pas le droit d'écrire ici,
// l'upsert échoue silencieusement (retourne une erreur ignorée), la page
// affiche simplement ce qui existe déjà.
export async function genererChecklistDepart(maraudeId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: materiel }, { data: denrees }, { data: dons }] = await Promise.all([
    supabase.from("stock_materiel_mouvements").select("categorie, quantite"),
    supabase.from("stock_denrees_mouvements").select("nom, unite, quantite"),
    supabase
      .from("dons_ponctuels")
      .select("id, donateur, description, quantite")
      .eq("maraude_id", maraudeId),
  ]);

  const totauxMateriel = new Map<string, number>();
  for (const m of materiel ?? []) {
    const cle = m.categorie as string;
    totauxMateriel.set(cle, (totauxMateriel.get(cle) ?? 0) + (m.quantite as number));
  }

  const totauxDenrees = new Map<string, { unite: string | null; total: number }>();
  for (const d of denrees ?? []) {
    const cle = d.nom as string;
    const existant = totauxDenrees.get(cle);
    totauxDenrees.set(cle, {
      unite: (d.unite as string | null) ?? existant?.unite ?? null,
      total: (existant?.total ?? 0) + (d.quantite as number),
    });
  }

  const lignes: {
    maraude_id: string;
    libelle: string;
    source: "stock" | "don";
    reference_table: string;
    reference_id: string;
  }[] = [];

  for (const [categorie, total] of totauxMateriel) {
    if (total <= 0) continue;
    const label = CATEGORIE_BESOIN_LABELS[categorie as CategorieBesoin] ?? categorie;
    lignes.push({
      maraude_id: maraudeId,
      libelle: `${label} — stock actuel : ${total}`,
      source: "stock",
      reference_table: "stock_materiel_mouvements",
      reference_id: idDeterministe(`${maraudeId}:stock_materiel:${categorie}`),
    });
  }

  for (const [nom, { unite, total }] of totauxDenrees) {
    if (total <= 0) continue;
    lignes.push({
      maraude_id: maraudeId,
      libelle: `${nom}${unite ? ` (${unite})` : ""} — stock actuel : ${total}`,
      source: "stock",
      reference_table: "stock_denrees_mouvements",
      reference_id: idDeterministe(`${maraudeId}:stock_denrees:${nom}`),
    });
  }

  for (const don of dons ?? []) {
    const quantiteTxt = don.quantite ? ` (${don.quantite})` : "";
    lignes.push({
      maraude_id: maraudeId,
      libelle: `${don.donateur} — ${don.description}${quantiteTxt}`,
      source: "don",
      reference_table: "dons_ponctuels",
      reference_id: don.id as string,
    });
  }

  if (lignes.length === 0) return;

  // onConflict ne porte que sur les colonnes envoyées (maraude_id, libelle,
  // source, reference_table, reference_id) — coche/coche_par/coche_le/
  // cree_par restent intacts sur les lignes déjà existantes.
  await supabase
    .from("checklist_depart_items")
    .upsert(lignes, { onConflict: "maraude_id,source,reference_table,reference_id" });
}

// RLS (checklist_depart_items_update_manager_ou_affecte) fait toute la
// vérification de permission ; coche_par/coche_le forcés côté serveur par
// le trigger force_checklist_item_coche_meta.
export async function toggleChecklistItem(itemId: string, coche: boolean) {
  const supabase = await createClient();
  await supabase.from("checklist_depart_items").update({ coche }).eq("id", itemId);
  revalidatePath("/dashboard/maraudes");
}

export async function ajouterLigneChecklistLibre(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const maraudeId = formData.get("maraudeId");
  const libelleRaw = formData.get("libelle");

  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Maraude introuvable." };
  }
  if (typeof libelleRaw !== "string" || !libelleRaw.trim()) {
    return { error: "Le libellé est requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("checklist_depart_items").insert({
    maraude_id: maraudeId,
    libelle: libelleRaw.trim(),
    source: "libre",
  });

  if (error) {
    return { error: "Impossible d'ajouter cette ligne." };
  }

  revalidatePath("/dashboard/maraudes");
  return undefined;
}

export async function supprimerLigneChecklist(itemId: string) {
  const supabase = await createClient();
  await supabase.from("checklist_depart_items").delete().eq("id", itemId);
  revalidatePath("/dashboard/maraudes");
}
