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
