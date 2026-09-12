import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route Handler (pas une page) : point de retour après le consentement
// OAuth (Google/Microsoft/Facebook — voir src/lib/actions/auth.ts). Échange
// le code contre une session, puis redirige vers /dashboard (qui redirigera
// lui-même vers /compte-en-attente si le compte n'est pas encore actif — un
// compte créé via OAuth reçoit 'adherent' et status='en_attente' exactement
// comme un compte email/mot de passe, via le même trigger handle_new_user).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
