import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client Supabase pour les pages 100% publiques et anonymes du site vitrine
// (accueil, /dons) — PAS le client de src/lib/supabase/server.ts, qui lit
// les cookies via next/headers et force Next.js à rendre la page en
// dynamique à chaque requête (aucun cache possible, y compris ISR). Ces
// pages ne lisent QUE des vues publiques (impact_public, besoins_publics,
// lisibles par `anon`, voir leurs migrations) : aucune session, aucun
// cookie nécessaire — ce client neutre permet enfin le cache ISR
// (`export const revalidate`) sur ces routes.
//
// Ne JAMAIS utiliser ce client pour une donnée qui dépend de l'utilisateur
// connecté (RLS basée sur auth.uid()) — il n'a aucune session, il verrait
// exactement ce qu'un visiteur anonyme voit.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
