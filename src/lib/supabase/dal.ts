import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/lib/roles";
import type { FonctionBureau } from "@/lib/fonction-bureau";

export type { RoleName } from "@/lib/roles";

export type Profile = {
  id: string;
  full_name: string | null;
  status: "en_attente" | "actif" | "suspendu";
  fonction_bureau: FonctionBureau | null;
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

  // Perf (15/09, retour client "c'est lent partout dans l'appli") : profil
  // + rôles en UNE requête (embed PostgREST) au lieu de deux appels
  // séquentiels — cette fonction s'exécute sur CHAQUE page protégée, chaque
  // round-trip Supabase évité compte. Contrainte explicite obligatoire
  // (`!profile_roles_profile_id_fkey`) : profile_roles a DEUX FK vers
  // profiles (profile_id ET granted_by), PostgREST refuse d'embarquer sans
  // préciser laquelle (testé en direct avant de committer, PGRST201 sinon).
  // Le middleware (proxy.ts) fait sa propre vérification auth.getUser()
  // séparée — volontaire, pattern recommandé par Next.js (optimiste en
  // périphérie, autoritaire ici), pas touché.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, status, fonction_bureau, profile_roles!profile_roles_profile_id_fkey(role)",
    )
    .eq("id", user.id)
    .single<Omit<Profile, "roles"> & { profile_roles: { role: RoleName }[] }>();

  if (!profile) {
    // Ne devrait jamais arriver : le trigger handle_new_user crée toujours
    // un profil à l'inscription. Filet de sécurité si jamais.
    redirect("/login");
  }

  const { profile_roles, ...rest } = profile;
  const roles = (profile_roles ?? []).map((r) => r.role);

  return { ...rest, roles };
});
