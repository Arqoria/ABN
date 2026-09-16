import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupClient } from "./signup-client";

// Même correctif que /login (voir son commentaire) : un utilisateur déjà
// connecté ne doit pas revoir le formulaire d'inscription.
export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <SignupClient />;
}
