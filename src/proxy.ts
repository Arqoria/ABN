import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/proxy";

// Cible les routes protégées du groupe (app). Étendre le matcher au fur
// et à mesure que de nouvelles routes (app) apparaissent.
export const config = {
  matcher: ["/dashboard/:path*", "/compte-en-attente/:path*"],
};

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // IMPORTANT : ne pas retirer cet appel — getUser() rafraîchit le token de
  // session dans les cookies à chaque requête (voir src/lib/supabase/proxy.ts
  // et le guide Next.js sur l'auth). C'est une vérification "optimiste"
  // (lecture du cookie) : la vraie autorisation (rôle, statut de compte) se
  // fait au plus près des données via RLS, pas ici.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
