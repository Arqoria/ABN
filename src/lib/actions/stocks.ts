"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES_BESOIN, type CategorieBesoin } from "@/lib/categorie-besoin";

export type ActionState = { error: string } | undefined;

const TYPES_MOUVEMENT = ["entree", "sortie"] as const;
type TypeMouvement = (typeof TYPES_MOUVEMENT)[number];

function lireQuantiteSignee(formData: FormData): number | null {
  const type = formData.get("type");
  const quantiteRaw = formData.get("quantite");
  if (typeof type !== "string" || !TYPES_MOUVEMENT.includes(type as TypeMouvement)) {
    return null;
  }
  const quantite = Number(quantiteRaw);
  if (!Number.isInteger(quantite) || quantite <= 0) {
    return null;
  }
  return type === "entree" ? quantite : -quantite;
}

// RLS (stock_materiel_insert_admin_manager_maraudeur) impose déjà compte
// actif + (Admin, Manager ou Maraudeur) ; created_by est forcé côté serveur
// par le trigger force_stock_materiel_created_by, jamais confié au client.
// Voir docs/Tasks.md pour la note sur la réversibilité du rôle Maraudeur ici.
export async function ajouterMouvementMateriel(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const categorie = formData.get("categorie");
  if (typeof categorie !== "string" || !CATEGORIES_BESOIN.includes(categorie as CategorieBesoin)) {
    return { error: "Choisissez une catégorie." };
  }

  const quantite = lireQuantiteSignee(formData);
  if (quantite === null) {
    return { error: "Quantité invalide." };
  }

  const maraudeIdRaw = formData.get("maraudeId");
  const maraudeId = typeof maraudeIdRaw === "string" && maraudeIdRaw ? maraudeIdRaw : null;

  const motifRaw = formData.get("motif");
  const motif = typeof motifRaw === "string" && motifRaw.trim() ? motifRaw.trim() : null;

  const supabase = await createClient();
  const { error } = await supabase.from("stock_materiel_mouvements").insert({
    categorie,
    quantite,
    motif,
    maraude_id: maraudeId,
  });

  if (error) {
    return { error: "Impossible d'enregistrer ce mouvement." };
  }

  revalidatePath("/dashboard/stocks");
  return undefined;
}

export async function supprimerMouvementMateriel(id: string) {
  const supabase = await createClient();
  await supabase.from("stock_materiel_mouvements").delete().eq("id", id);
  revalidatePath("/dashboard/stocks");
}

// Même principe que ajouterMouvementMateriel, mais RLS
// (stock_denrees_insert_admin_manager_cuisinier) autorise Cuisinier au lieu
// de Maraudeur — cohérent avec qui prépare les repas.
export async function ajouterMouvementDenree(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nomRaw = formData.get("nom");
  if (typeof nomRaw !== "string" || !nomRaw.trim()) {
    return { error: "Le nom de la denrée est requis." };
  }
  const nom = nomRaw.trim();

  const quantite = lireQuantiteSignee(formData);
  if (quantite === null) {
    return { error: "Quantité invalide." };
  }

  const uniteRaw = formData.get("unite");
  const unite = typeof uniteRaw === "string" && uniteRaw.trim() ? uniteRaw.trim() : null;

  const maraudeIdRaw = formData.get("maraudeId");
  const maraudeId = typeof maraudeIdRaw === "string" && maraudeIdRaw ? maraudeIdRaw : null;

  const motifRaw = formData.get("motif");
  const motif = typeof motifRaw === "string" && motifRaw.trim() ? motifRaw.trim() : null;

  const supabase = await createClient();
  const { error } = await supabase.from("stock_denrees_mouvements").insert({
    nom,
    unite,
    quantite,
    motif,
    maraude_id: maraudeId,
  });

  if (error) {
    return { error: "Impossible d'enregistrer ce mouvement." };
  }

  revalidatePath("/dashboard/cuisine");
  return undefined;
}

export async function supprimerMouvementDenree(id: string) {
  const supabase = await createClient();
  await supabase.from("stock_denrees_mouvements").delete().eq("id", id);
  revalidatePath("/dashboard/cuisine");
}

// RLS (dons_ponctuels_insert_admin_manager_cuisinier) — maraudeId
// obligatoire ici (contrairement aux mouvements de stock) : tout l'intérêt
// est qu'un Cuisinier voie qu'un don a déjà été fait pour SA maraude avant
// de préparer un repas en double de son côté.
export async function ajouterDonPonctuel(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const maraudeId = formData.get("maraudeId");
  if (typeof maraudeId !== "string" || !maraudeId) {
    return { error: "Choisissez une maraude." };
  }

  // "Autre" (pas de commerçant répertorié) : donateurLibre en texte libre,
  // conservé tel quel. Commerçant répertorié : le nom vient de la base
  // (jamais celui envoyé par le client, même principe que partout ailleurs
  // dans ce projet), donateur reste toujours renseigné en texte pour ne
  // pas casser l'affichage existant qui lit dons_ponctuels.donateur.
  const supabase = await createClient();
  const commercantIdRaw = formData.get("commercantId");
  const commercantId =
    typeof commercantIdRaw === "string" && commercantIdRaw && commercantIdRaw !== "autre"
      ? commercantIdRaw
      : null;

  let donateur: string;
  if (commercantId) {
    const { data: commercant } = await supabase
      .from("commercants_partenaires")
      .select("nom")
      .eq("id", commercantId)
      .single();
    if (!commercant) {
      return { error: "Commerçant introuvable." };
    }
    donateur = commercant.nom;
  } else {
    const donateurLibre = formData.get("donateurLibre");
    if (typeof donateurLibre !== "string" || !donateurLibre.trim()) {
      return { error: "Le nom du donateur est requis." };
    }
    donateur = donateurLibre.trim();
  }

  const descriptionRaw = formData.get("description");
  if (typeof descriptionRaw !== "string" || !descriptionRaw.trim()) {
    return { error: "La description est requise." };
  }

  const quantiteRaw = formData.get("quantite");
  const quantite =
    typeof quantiteRaw === "string" && quantiteRaw.trim() ? Number(quantiteRaw) : null;
  if (quantite !== null && (!Number.isInteger(quantite) || quantite <= 0)) {
    return { error: "Quantité invalide." };
  }

  const { error } = await supabase.from("dons_ponctuels").insert({
    maraude_id: maraudeId,
    commercant_id: commercantId,
    donateur,
    description: descriptionRaw.trim(),
    quantite,
  });

  if (error) {
    return { error: "Impossible d'enregistrer ce don." };
  }

  revalidatePath("/dashboard/cuisine");
  return undefined;
}

export async function supprimerDonPonctuel(id: string) {
  const supabase = await createClient();
  await supabase.from("dons_ponctuels").delete().eq("id", id);
  revalidatePath("/dashboard/cuisine");
}
