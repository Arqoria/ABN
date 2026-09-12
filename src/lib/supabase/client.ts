import { createBrowserClient } from "@supabase/ssr";

// Client Supabase pour les Client Components (navigateur). Utilise la clé
// Publishable (NEXT_PUBLIC_*, exposée au navigateur) — jamais la clé Secret
// ici, voir CLAUDE.md.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
