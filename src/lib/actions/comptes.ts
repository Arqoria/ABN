"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const ROLES = [
  "admin",
  "manager",
  "maraudeur",
  "cuisinier",
  "adherent",
  "donateur",
] as const;
type Role = (typeof ROLES)[number];

const FONCTIONS_BUREAU = ["president", "tresorier", "secretaire"] as const;
type FonctionBureau = (typeof FONCTIONS_BUREAU)[number];

export type ValiderCompteState = { error: string } | undefined;

// Server Action réservée aux Admins : attribue un ou plusieurs rôles
// (profile_roles) à un compte en attente et l'active (status -> 'actif').
// Utilise le client service_role (contourne RLS et le trigger
// protect_profile_role_status, qui laisse passer service_role).
//
// La vérification "caller a le rôle admin" ci-dessous est la SEULE barrière
// d'autorisation : le client admin contourne complètement RLS. Ne jamais la
// retirer, ni faire confiance à l'UI qui n'affiche ce formulaire qu'aux
// Admins — un appel direct à cette action doit être bloqué indépendamment
// de l'UI.
export async function validerCompte(
  _prevState: ValiderCompteState,
  formData: FormData,
): Promise<ValiderCompteState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { error: "Compte introuvable." };
  }

  const roles = formData
    .getAll("roles")
    .filter((r): r is Role => typeof r === "string" && ROLES.includes(r as Role));

  if (roles.length === 0) {
    return { error: "Sélectionnez au moins un rôle." };
  }

  const fonctionBureauRaw = formData.get("fonctionBureau");
  const fonctionBureau: FonctionBureau | null =
    typeof fonctionBureauRaw === "string" &&
    FONCTIONS_BUREAU.includes(fonctionBureauRaw as FonctionBureau)
      ? (fonctionBureauRaw as FonctionBureau)
      : null;

  const admin = createAdminClient();

  const { error: rolesError } = await admin.from("profile_roles").upsert(
    roles.map((role) => ({
      profile_id: userId,
      role,
      granted_by: caller.id,
    })),
    { onConflict: "profile_id,role", ignoreDuplicates: true },
  );

  if (rolesError) {
    return { error: "Échec de l'attribution des rôles." };
  }

  const { error: statusError } = await admin
    .from("profiles")
    .update({ status: "actif", fonction_bureau: fonctionBureau })
    .eq("id", userId);

  if (statusError) {
    return { error: "Échec de l'activation du compte." };
  }

  revalidatePath("/dashboard/comptes");
  return undefined;
}

// Modifie la fonction bureau d'un profil déjà actif (contrairement à
// validerCompte ci-dessus, qui ne s'applique qu'aux comptes en attente).
// Purement informatif — voir supabase/migrations/20260912230000_fonction_bureau.sql.
export async function definirFonctionBureau(
  _prevState: ValiderCompteState,
  formData: FormData,
): Promise<ValiderCompteState> {
  const caller = await getCurrentProfile();
  if (!caller.roles.includes("admin") || caller.status !== "actif") {
    return { error: "Action réservée aux administrateurs." };
  }

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return { error: "Compte introuvable." };
  }

  const fonctionBureauRaw = formData.get("fonctionBureau");
  const fonctionBureau: FonctionBureau | null =
    typeof fonctionBureauRaw === "string" &&
    FONCTIONS_BUREAU.includes(fonctionBureauRaw as FonctionBureau)
      ? (fonctionBureauRaw as FonctionBureau)
      : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ fonction_bureau: fonctionBureau })
    .eq("id", userId);

  if (error) {
    return { error: "Échec de la mise à jour." };
  }

  revalidatePath("/dashboard/comptes");
  return undefined;
}
