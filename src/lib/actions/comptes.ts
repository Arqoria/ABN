"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = ["admin", "manager", "maraudeur", "cuisinier"] as const;
type Role = (typeof ROLES)[number];

export type ValiderCompteState = { error: string } | undefined;

// Server Action réservée aux Admins : assigne un rôle à un compte en
// attente et l'active (status -> 'actif'). Utilise le client service_role
// (contourne RLS) — c'est exactement le flow que prépare la migration
// 20260912140000_fix_protect_profile_role_status_service_role.sql.
//
// La vérification "caller.role === 'admin'" ci-dessous est la SEULE
// barrière d'autorisation : le client admin contourne complètement RLS et
// le trigger protect_profile_role_status (qui laisse passer service_role).
// Ne jamais retirer cette vérification, ni faire confiance à l'UI qui
// n'affiche ce formulaire qu'aux Admins — un appel direct à cette action
// doit être bloqué indépendamment de l'UI.
export async function validerCompte(
  _prevState: ValiderCompteState,
  formData: FormData,
): Promise<ValiderCompteState> {
  const caller = await getCurrentProfile();
  if (caller.role !== "admin" || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const userId = formData.get("userId");
  const role = formData.get("role");

  if (typeof userId !== "string" || !userId) {
    return { error: "Compte introuvable." };
  }

  if (typeof role !== "string" || !ROLES.includes(role as Role)) {
    return { error: "Rôle invalide." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, status: "actif" })
    .eq("id", userId);

  if (error) {
    return { error: "Échec de la validation. Réessayez." };
  }

  revalidatePath("/dashboard/comptes");
  return undefined;
}
