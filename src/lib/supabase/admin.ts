import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client Supabase "admin" — utilise la clé Secret (service_role) et
// CONTOURNE TOUTE RLS. Ne fait AUCUNE vérification d'autorisation par
// lui-même : confiance aveugle à qui l'appelle. Ne jamais l'exposer à un
// Client Component ; à n'utiliser que dans une Server Action qui a DÉJÀ
// vérifié que l'appelant est un Admin authentifié (voir
// src/lib/actions/comptes.ts). Voir CLAUDE.md sur la clé Secret.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
