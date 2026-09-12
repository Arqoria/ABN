import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_ME_COOKIE, sessionMaxAge } from "@/lib/supabase/remember-me";

// Client Supabase pour src/proxy.ts. Rafraîchit le cookie de session à
// chaque requête et fournit la NextResponse de base à retourner/adapter.
// Ne fait AUCUNE vérification d'autorisation ici — reste "optimiste" (lecture
// du cookie de session uniquement), conformément au guide Next.js sur l'auth :
// la vraie autorisation se fait au plus près des données (RLS + policies),
// pas dans le proxy.
export function createClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Même politique "Se souvenir de moi" que server.ts — voir son
          // commentaire, la logique doit être identique partout où un
          // cookie de session Supabase est écrit.
          const remember =
            request.cookies.get(REMEMBER_ME_COOKIE)?.value !== "0";
          const maxAge = sessionMaxAge(remember);

          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, { ...options, maxAge }),
          );
        },
      },
    },
  );

  return { supabase, response };
}
