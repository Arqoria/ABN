import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginClient } from "./login-client";

// Bug remonté par le client (16/09) : ouvrir /login dans un nouvel onglet
// pendant qu'on est déjà connecté ré-affichait quand même le formulaire —
// donnant l'impression d'être déconnecté ("je dois retaper mon mot de
// passe") alors que la session (cookie "Se souvenir de moi", vérifiée
// valide 400 jours) était en réalité toujours active. Cette page ne
// vérifiait jamais si une session existait déjà.
//
// Vérification "secure" (contre la base, comme getCurrentProfile) plutôt
// que juste lire le cookie — cohérent avec le reste du projet.
export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}
