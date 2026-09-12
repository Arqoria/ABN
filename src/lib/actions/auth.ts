"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | undefined;

// Server Action de connexion — s'exécute toujours côté serveur (jamais dans
// le navigateur), voir le guide Next.js sur l'auth. Ne vérifie PAS encore le
// statut du profil (en_attente/actif/suspendu) : ça arrive dans une itération
// suivante (écran "compte en attente de validation"), une fois le
// Server Component /dashboard capable de lire le profil.
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Message générique volontaire : ne jamais indiquer si c'est l'email ou
    // le mot de passe qui est incorrect (évite l'énumération de comptes).
    return { error: "Email ou mot de passe incorrect." };
  }

  redirect("/dashboard");
}

export type SignupState =
  | { status: "error"; message: string }
  | { status: "success" }
  | undefined;

// Server Action d'inscription. Crée le compte Auth ; le trigger
// handle_new_user (migration Étape 2) crée automatiquement le profil associé
// avec status='en_attente' — aucun accès aux fonctionnalités métier tant
// qu'un Admin ne l'a pas validé (Étape 4/7, à venir).
//
// full_name est transmis dans les métadonnées utilisateur Supabase Auth
// (options.data) : c'est de là que handle_new_user le lit
// (new.raw_user_meta_data ->> 'full_name'), jamais une colonne créée ici.
export async function signup(
  _prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const password = formData.get("password");
  const passwordConfirm = formData.get("passwordConfirm");

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    return { status: "error", message: "Tous les champs sont obligatoires." };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  if (password !== passwordConfirm) {
    return {
      status: "error",
      message: "Les mots de passe ne correspondent pas.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName.trim() } },
  });

  if (error) {
    // Message générique volontaire : ne jamais confirmer/infirmer qu'un
    // email est déjà utilisé (évite l'énumération de comptes).
    return {
      status: "error",
      message: "Impossible de créer le compte. Réessayez plus tard.",
    };
  }

  // Si la confirmation par email est activée sur le projet Supabase (réglage
  // du dashboard, pas vérifiable depuis ce code), aucune session n'est créée
  // immédiatement : on affiche un message au lieu de rediriger.
  if (data.session) {
    redirect("/dashboard");
  }

  return { status: "success" };
}

// Server Action de déconnexion — invalide la session côté Supabase (pas
// juste un oubli du cookie côté client).
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
