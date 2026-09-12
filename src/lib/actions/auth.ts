"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REMEMBER_ME_COOKIE, sessionMaxAge } from "@/lib/supabase/remember-me";

const OAUTH_PROVIDERS = ["google", "azure", "facebook"] as const;
type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

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

  // Posé AVANT signInWithPassword() : le client Supabase (server.ts) lit ce
  // cookie pour décider du maxAge de la session qu'il s'apprête à écrire.
  const remember = formData.get("remember") === "on";
  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_ME_COOKIE, remember ? "1" : "0", {
    maxAge: sessionMaxAge(remember),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

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

// Google, Microsoft (provider "azure" côté Supabase) et Facebook — même
// mécanisme pour les trois, un seul callback (src/app/auth/callback/route.ts).
// Ne fonctionne qu'une fois le fournisseur activé et configuré dans le
// Dashboard Supabase (Authentication → Providers), avec une app OAuth créée
// côté Google/Microsoft/Facebook — ça ne dépend pas que de ce code.
export async function loginWithOAuth(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const provider = formData.get("provider");
  if (
    typeof provider !== "string" ||
    !OAUTH_PROVIDERS.includes(provider as OAuthProvider)
  ) {
    return { error: "Fournisseur invalide." };
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as OAuthProvider,
    options: { redirectTo: `${proto}://${host}/auth/callback` },
  });

  if (error || !data.url) {
    return { error: "Connexion impossible pour l'instant." };
  }

  redirect(data.url);
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
  (await cookies()).delete(REMEMBER_ME_COOKIE);
  redirect("/login");
}
