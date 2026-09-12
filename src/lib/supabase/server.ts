import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_ME_COOKIE, sessionMaxAge } from "@/lib/supabase/remember-me";

// Client Supabase pour les Server Components, Server Actions et Route
// Handlers. Lit/écrit les cookies de session via l'API cookies() de Next.js
// — à appeler à chaque requête (jamais gardé en singleton global), cookies()
// est lié à la requête courante.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // "Se souvenir de moi" (src/lib/actions/auth.ts) : applique la
            // même politique de durée à CHAQUE écriture de cookie de
            // session, pas seulement à la connexion initiale — sinon un
            // simple rafraîchissement de token réinstaurerait le maxAge
            // persistant par défaut de la librairie.
            const remember =
              cookieStore.get(REMEMBER_ME_COOKIE)?.value !== "0";
            const maxAge = sessionMaxAge(remember);
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, maxAge }),
            );
          } catch {
            // setAll() appelé depuis un Server Component (rendu, pas une
            // Server Action ni un Route Handler) : impossible d'écrire un
            // cookie à ce moment-là. Sans incidence tant que le proxy
            // (src/proxy.ts) rafraîchit déjà la session sur chaque requête.
          }
        },
      },
    },
  );
}
