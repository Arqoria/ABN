import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/lib/roles";

export type { RoleName } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  status: "en_attente" | "actif" | "suspendu";
  roles: RoleName[];
};

// Data Access Layer : vérifie la session ET charge le profil associé (avec
// ses rôles — plusieurs possibles par profil, voir profile_roles), en un
// seul point centralisé (voir guide Next.js sur l'auth — "Creating a Data
// Access Layer"). cache() mémoïse le résultat pour la durée du rendu, pour
// éviter des requêtes dupliquées si plusieurs composants l'appellent.
//
// Redirige vers /login si pas de session — c'est une vérification "secure"
// (contre la base, pas juste le cookie), à la différence du proxy qui reste
// volontairement optimiste.
export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, status")
    .eq("id", user.id)
    .single<Omit<Profile, "roles">>();

  if (!profile) {
    // Ne devrait jamais arriver : le trigger handle_new_user crée toujours
    // un profil à l'inscription. Filet de sécurité si jamais.
    redirect("/login");
  }

  const { data: roleRows } = await supabase
    .from("profile_roles")
    .select("role")
    .eq("profile_id", user.id);

  const roles = (roleRows ?? []).map((r) => r.role as RoleName);

  return { ...profile, roles };
});
